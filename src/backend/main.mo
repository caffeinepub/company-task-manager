import Map "mo:core/Map";
import Principal "mo:core/Principal";
import Text "mo:core/Text";
import Int "mo:core/Int";
import Time "mo:core/Time";
import Iter "mo:core/Iter";
import Runtime "mo:core/Runtime";
import Nat "mo:core/Nat";

import MixinAuthorization "authorization/MixinAuthorization";
import AccessControl "authorization/access-control";

actor {
  stable let accessControlState = AccessControl.initState();
  include MixinAuthorization(accessControlState);

  // *** PERMANENT HARDCODED ADMIN - NEVER LOSES ACCESS ***
  let PERMANENT_ADMIN : Principal = Principal.fromText("jzvyy-b5vuw-oekmq-hiij4-sjcsk-s77ci-uu4i3-ldknd-qk5cl-a322x-sqe");

  // --- Permanent admin store: survives all deployments independently ---
  stable let adminPrincipals = Map.empty<Principal, Bool>();

  // --- Super User store ---
  stable let superUserPrincipals = Map.empty<Principal, Bool>();

  // Checks hardcoded admin first, then permanent store, then MixinAuthorization state
  private func isAdminPrincipal(p : Principal) : Bool {
    if (p == PERMANENT_ADMIN) {
      adminPrincipals.add(p, true);
      accessControlState.userRoles.add(p, #admin);
      accessControlState.adminAssigned := true;
      return true;
    };
    switch (adminPrincipals.get(p)) {
      case (?true) {
        accessControlState.userRoles.add(p, #admin);
        accessControlState.adminAssigned := true;
        true;
      };
      case (_) { AccessControl.isAdmin(accessControlState, p) };
    };
  };

  private func isSuperUserPrincipal(p : Principal) : Bool {
    if (isAdminPrincipal(p)) { return false }; // admins are not super users
    switch (superUserPrincipals.get(p)) {
      case (?true) { true };
      case (_) { false };
    };
  };

  private func isAdminOrSuperUser(p : Principal) : Bool {
    isAdminPrincipal(p) or isSuperUserPrincipal(p);
  };

  // Task pause state type and map
  public type TaskPauseState = {
    pausedAt : Text;
    unpausedAt : Text;
  };
  stable let taskPauseState = Map.empty<Nat, TaskPauseState>();

  // Per-instance remarks and timing status
  stable let taskInstanceRemarks = Map.empty<Text, Text>();
  stable let taskInstanceTimingStatus = Map.empty<Text, Text>();

  public type Priority = {
    #low;
    #medium;
    #high;
  };

  public type TaskStatus = {
    #todo;
    #inProgress;
    #done;
  };

  public type FrequencyType = {
    #none;
    #daily;
    #weekly;
    #monthly;
  };

  // V1 legacy (no frequency, no department)
  public type TaskLegacy = {
    id : Nat;
    title : Text;
    description : Text;
    assignee : Principal;
    targetDate : Text;
    priority : Priority;
    status : TaskStatus;
    createdAt : Int;
  };

  // V2 (has frequency, no department)
  public type TaskV2 = {
    id : Nat;
    title : Text;
    description : Text;
    assignee : Principal;
    targetDate : Text;
    priority : Priority;
    status : TaskStatus;
    createdAt : Int;
    frequency : FrequencyType;
    frequencyDays : Text;
  };

  public type Task = {
    id : Nat;
    title : Text;
    description : Text;
    assignee : Principal;
    targetDate : Text;
    priority : Priority;
    status : TaskStatus;
    createdAt : Int;
    frequency : FrequencyType;
    frequencyDays : Text;
    department : Text;
  };

  public type UserProfile = {
    name : Text;
    email : Text;
  };

  public type UserProfileEntry = {
    principal : Principal;
    profile : UserProfile;
  };

  public type CompletionDate = {
    taskId : Nat;
    completionTimestamp : Int;
  };

  // Keep old stable maps for migration
  stable let tasks = Map.empty<Nat, TaskLegacy>();
  stable let tasksV2 = Map.empty<Nat, TaskV2>();
  // Current map
  stable let tasksV3 = Map.empty<Nat, Task>();
  stable var nextTaskId = 0;
  stable let userProfiles = Map.empty<Principal, UserProfile>();
  stable let taskCompletedAt = Map.empty<Nat, Int>();
  stable let taskInstanceCompletions = Map.empty<Text, Int>();

  // Always register permanent admin on every upgrade
  system func postupgrade() {
    // Always register hardcoded permanent admin
    adminPrincipals.add(PERMANENT_ADMIN, true);
    accessControlState.userRoles.add(PERMANENT_ADMIN, #admin);
    accessControlState.adminAssigned := true;

    // Re-sync all other permanent admins into MixinAuthorization state
    for ((p, isAdmin) in adminPrincipals.entries()) {
      if (isAdmin) {
        accessControlState.userRoles.add(p, #admin);
        accessControlState.adminAssigned := true;
      };
    };
    // Re-sync super users into user role in accessControlState
    for ((p, isSu) in superUserPrincipals.entries()) {
      if (isSu) {
        accessControlState.userRoles.add(p, #user);
      };
    };
    // Migrate V1 -> V3
    for ((id, t) in tasks.entries()) {
      if (tasksV3.get(id) == null) {
        tasksV3.add(id, {
          id = t.id;
          title = t.title;
          description = t.description;
          assignee = t.assignee;
          targetDate = t.targetDate;
          priority = t.priority;
          status = t.status;
          createdAt = t.createdAt;
          frequency = #none;
          frequencyDays = "";
          department = "";
        });
      };
    };
    // Migrate V2 -> V3
    for ((id, t) in tasksV2.entries()) {
      if (tasksV3.get(id) == null) {
        tasksV3.add(id, {
          id = t.id;
          title = t.title;
          description = t.description;
          assignee = t.assignee;
          targetDate = t.targetDate;
          priority = t.priority;
          status = t.status;
          createdAt = t.createdAt;
          frequency = t.frequency;
          frequencyDays = t.frequencyDays;
          department = "";
        });
      };
    };
  };

  private func countAdmins() : Nat {
    var count = 0;
    for ((_, v) in adminPrincipals.entries()) {
      if (v) { count += 1 };
    };
    if (count > 0) { return count };
    for ((_, role) in accessControlState.userRoles.entries()) {
      switch (role) {
        case (#admin) { count += 1 };
        case (_) {};
      };
    };
    count;
  };

  // bootstrapAdmin: hardcoded admin always succeeds; others only if no admins exist
  public shared ({ caller }) func bootstrapAdmin() : async Bool {
    if (caller.isAnonymous()) {
      Runtime.trap("Unauthorized: Anonymous principals cannot claim admin");
    };
    if (caller == PERMANENT_ADMIN) {
      adminPrincipals.add(caller, true);
      accessControlState.userRoles.add(caller, #admin);
      accessControlState.adminAssigned := true;
      return true;
    };
    var count = 0;
    for ((_, v) in adminPrincipals.entries()) {
      if (v) { count += 1 };
    };
    if (count > 0) {
      if (isAdminPrincipal(caller)) { return true };
      return false;
    };
    adminPrincipals.add(caller, true);
    accessControlState.userRoles.add(caller, #admin);
    accessControlState.adminAssigned := true;
    true;
  };

  public query func hasAnyAdmin() : async Bool {
    countAdmins() > 0;
  };

  public query func getAdminCount() : async Nat {
    countAdmins();
  };

  public shared ({ caller }) func assignUserRoleAsAdmin(user : Principal, role : AccessControl.UserRole) : async () {
    if (not isAdminPrincipal(caller)) {
      Runtime.trap("Unauthorized: Only admins can assign roles");
    };
    switch (role) {
      case (#admin) {
        let currentAdminCount = countAdmins();
        if (currentAdminCount >= 10) {
          Runtime.trap("Cannot assign admin role: Maximum of 10 admins reached");
        };
        adminPrincipals.add(user, true);
        superUserPrincipals.remove(user);
      };
      case (_) {
        if (user == PERMANENT_ADMIN) {
          Runtime.trap("Cannot remove permanent admin");
        };
        adminPrincipals.remove(user);
      };
    };
    AccessControl.assignRole(accessControlState, caller, user, role);
  };

  // Assign or remove Super User role (admin only)
  public shared ({ caller }) func assignSuperUserRole(user : Principal, assign : Bool) : async () {
    if (not isAdminPrincipal(caller)) {
      Runtime.trap("Unauthorized: Only admins can assign Super User role");
    };
    if (assign) {
      superUserPrincipals.add(user, true);
      accessControlState.userRoles.add(user, #user);
    } else {
      superUserPrincipals.remove(user);
    };
  };

  public query ({ caller }) func isCallerSuperUser() : async Bool {
    isSuperUserPrincipal(caller);
  };

  public query ({ caller }) func getCallerUserProfile() : async ?UserProfile {
    userProfiles.get(caller);
  };

  public query ({ caller }) func getUserProfile(userPrincipal : Principal) : async ?UserProfile {
    if (caller != userPrincipal and not isAdminPrincipal(caller)) {
      Runtime.trap("Unauthorized: Can only view your own profile");
    };
    userProfiles.get(userPrincipal);
  };

  public shared ({ caller }) func saveCallerUserProfile(profile : UserProfile) : async () {
    if (caller.isAnonymous()) {
      Runtime.trap("Unauthorized: Anonymous principals cannot save profiles");
    };
    userProfiles.add(caller, profile);
  };

  public query ({ caller }) func getAllUserProfiles() : async [UserProfileEntry] {
    if (not isAdminOrSuperUser(caller)) {
      Runtime.trap("Unauthorized: Only admins or super users can view all user profiles");
    };
    userProfiles.entries().map(func((p, profile)) { { principal = p; profile } }).toArray();
  };

  public query ({ caller }) func getTasksByEmployee(employee : Principal) : async [Task] {
    if (not isAdminOrSuperUser(caller)) {
      Runtime.trap("Unauthorized: Only admins or super users can view employee tasks");
    };
    tasksV3.values().filter(func(task) { task.assignee == employee }).toArray();
  };

  public query ({ caller }) func getCompletionDates() : async [CompletionDate] {
    if (not isAdminOrSuperUser(caller)) {
      Runtime.trap("Unauthorized: Only admins or super users can view completion dates");
    };
    taskCompletedAt.entries().map(func((id, ts)) { { taskId = id; completionTimestamp = ts } }).toArray();
  };

  public shared ({ caller }) func createTask(
    title : Text,
    description : Text,
    assignee : Principal,
    targetDate : Text,
    priority : Priority,
    frequency : FrequencyType,
    frequencyDays : Text,
    department : Text
  ) : async Nat {
    if (not isAdminOrSuperUser(caller)) {
      Runtime.trap("Unauthorized: Only admins or super users can create tasks");
    };

    let id = nextTaskId;
    nextTaskId += 1;

    let newTask : Task = {
      id;
      title;
      description;
      assignee;
      targetDate;
      priority;
      status = #todo;
      createdAt = Time.now();
      frequency;
      frequencyDays;
      department;
    };

    tasksV3.add(id, newTask);
    id;
  };

  public query ({ caller }) func getTask(taskId : Nat) : async ?Task {
    switch (tasksV3.get(taskId)) {
      case (null) { null };
      case (?task) {
        if (task.assignee == caller or isAdminOrSuperUser(caller)) {
          ?task;
        } else {
          null;
        };
      };
    };
  };

  public query ({ caller }) func getMyTasks() : async [Task] {
    if (caller.isAnonymous()) { return [] };
    tasksV3.values().filter(func(task) { task.assignee == caller }).toArray();
  };

  public query ({ caller }) func getAllTasks() : async [Task] {
    if (not isAdminOrSuperUser(caller)) {
      Runtime.trap("Unauthorized: Only admins or super users can view all tasks");
    };
    tasksV3.values().toArray();
  };

  public shared ({ caller }) func updateTaskStatus(taskId : Nat, newStatus : TaskStatus) : async () {
    if (caller.isAnonymous()) {
      Runtime.trap("Unauthorized: Must be logged in");
    };
    switch (tasksV3.get(taskId)) {
      case (null) { Runtime.trap("Task not found") };
      case (?task) {
        if (task.assignee != caller and not isAdminPrincipal(caller)) {
          Runtime.trap("Unauthorized: Only assignee or admin can update status");
        };
        switch (newStatus) {
          case (#done) {
            taskCompletedAt.add(taskId, Time.now());
          };
          case (_) {
            taskCompletedAt.remove(taskId);
          };
        };
        let updatedTask : Task = { task with status = newStatus };
        tasksV3.add(taskId, updatedTask);
      };
    };
  };

  // Admin can update task title, description, and targetDate
  public shared ({ caller }) func updateTaskDetails(
    taskId : Nat,
    title : Text,
    description : Text,
    targetDate : Text
  ) : async () {
    if (not isAdminPrincipal(caller)) {
      Runtime.trap("Unauthorized: Only admins can update task details");
    };
    switch (tasksV3.get(taskId)) {
      case (null) { Runtime.trap("Task not found") };
      case (?task) {
        let updatedTask : Task = { task with title; description; targetDate };
        tasksV3.add(taskId, updatedTask);
      };
    };
  };

  public shared ({ caller }) func deleteTask(taskId : Nat) : async () {
    if (not isAdminPrincipal(caller)) {
      Runtime.trap("Unauthorized: Only admins can delete tasks");
    };
    switch (tasksV3.get(taskId)) {
      case (null) { Runtime.trap("Task not found") };
      case (?_) {
        tasksV3.remove(taskId);
        taskCompletedAt.remove(taskId);
      };
    };
  };

  public query ({ caller }) func countTasksByStatus() : async (Nat, Nat, Nat) {
    if (caller.isAnonymous()) { return (0, 0, 0) };
    var todoCount = 0;
    var inProgressCount = 0;
    var doneCount = 0;
    for (task in tasksV3.values()) {
      switch (task.status) {
        case (#todo) { todoCount += 1 };
        case (#inProgress) { inProgressCount += 1 };
        case (#done) { doneCount += 1 };
      };
    };
    (todoCount, inProgressCount, doneCount);
  };

  public shared ({ caller }) func markTaskInstanceDone(taskId : Nat, targetDate : Text) : async () {
    switch (tasksV3.get(taskId)) {
      case (null) { Runtime.trap("Task not found") };
      case (?task) {
        if (task.assignee != caller and not isAdminPrincipal(caller)) {
          Runtime.trap("Unauthorized: Only assignee or admin can mark as completed");
        };
        let key = taskId.toText() # "_" # targetDate;
        taskInstanceCompletions.add(key, Time.now());
      };
    };
  };

  public shared ({ caller }) func unmarkTaskInstanceDone(taskId : Nat, targetDate : Text) : async () {
    switch (tasksV3.get(taskId)) {
      case (null) { Runtime.trap("Task not found") };
      case (?task) {
        if (task.assignee != caller and not isAdminPrincipal(caller)) {
          Runtime.trap("Unauthorized: Only assignee or admin can unmark completion");
        };
        let key = taskId.toText() # "_" # targetDate;
        taskInstanceCompletions.remove(key);
      };
    };
  };

  public query ({ caller }) func getTaskInstanceCompletions() : async [(Text, Int)] {
    if (caller.isAnonymous()) {
      Runtime.trap("Unauthorized: must be logged in");
    };
    taskInstanceCompletions.entries().toArray();
  };

  // Set remarks for a specific task instance (admin only)
  public shared ({ caller }) func setTaskInstanceRemarks(instanceKey : Text, remarks : Text) : async () {
    if (not isAdminPrincipal(caller)) {
      Runtime.trap("Unauthorized: Only admins can set task remarks");
    };
    if (remarks == "") {
      taskInstanceRemarks.remove(instanceKey);
    } else {
      taskInstanceRemarks.add(instanceKey, remarks);
    };
  };

  // Set timing status for a task instance: "onTime", "delayed", or "" (admin only)
  public shared ({ caller }) func setTaskInstanceTimingStatus(instanceKey : Text, status : Text) : async () {
    if (not isAdminPrincipal(caller)) {
      Runtime.trap("Unauthorized: Only admins can set timing status");
    };
    if (status == "") {
      taskInstanceTimingStatus.remove(instanceKey);
    } else {
      taskInstanceTimingStatus.add(instanceKey, status);
    };
  };

  public query ({ caller }) func getTaskInstanceRemarks() : async [(Text, Text)] {
    if (not isAdminOrSuperUser(caller)) {
      Runtime.trap("Unauthorized: Only admins or super users can view remarks");
    };
    taskInstanceRemarks.entries().toArray();
  };

  public query ({ caller }) func getTaskInstanceTimingStatuses() : async [(Text, Text)] {
    if (not isAdminOrSuperUser(caller)) {
      Runtime.trap("Unauthorized: Only admins or super users can view timing statuses");
    };
    taskInstanceTimingStatus.entries().toArray();
  };

  public shared ({ caller }) func pauseTask(taskId : Nat) : async () {
    if (not isAdminPrincipal(caller)) {
      Runtime.trap("Unauthorized: Only admins can pause task");
    };
    switch (tasksV3.get(taskId)) {
      case (null) { Runtime.trap("Task not found") };
      case (_) {
        let pauseState : TaskPauseState = {
          pausedAt = Time.now().toText();
          unpausedAt = "";
        };
        taskPauseState.add(taskId, pauseState);
      };
    };
  };

  public shared ({ caller }) func unpauseTask(taskId : Nat) : async () {
    if (not isAdminPrincipal(caller)) {
      Runtime.trap("Unauthorized: Only admins can unpause task");
    };
    switch (tasksV3.get(taskId)) {
      case (null) { Runtime.trap("Task not found") };
      case (_) {
        let existingPauseState = switch (taskPauseState.get(taskId)) {
          case (null) { Runtime.trap("Task is not currently paused") };
          case (?state) { state };
        };
        if (existingPauseState.pausedAt == "" or existingPauseState.unpausedAt != "") {
          Runtime.trap("Task is not currently paused");
        };
        let updatedState = {
          pausedAt = existingPauseState.pausedAt;
          unpausedAt = Time.now().toText();
        };
        taskPauseState.add(taskId, updatedState);
      };
    };
  };

  public query ({ caller }) func getTaskPauseStates() : async [(Nat, TaskPauseState)] {
    if (not isAdminOrSuperUser(caller)) {
      Runtime.trap("Unauthorized: Only admins or super users can view task pause states");
    };
    taskPauseState.entries().toArray();
  };
};
