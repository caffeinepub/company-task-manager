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

  // --- Permanent admin store: survives all deployments independently ---
  stable let adminPrincipals = Map.empty<Principal, Bool>();

  // Checks both permanent store and MixinAuthorization state
  private func isAdminPrincipal(p : Principal) : Bool {
    switch (adminPrincipals.get(p)) {
      case (?true) {
        // Also ensure MixinAuthorization state is in sync
        accessControlState.userRoles.add(p, #admin);
        accessControlState.adminAssigned := true;
        true;
      };
      case (_) { AccessControl.isAdmin(accessControlState, p) };
    };
  };

  // Task pause state type and map
  public type TaskPauseState = {
    pausedAt : Text;
    unpausedAt : Text;
  };
  stable let taskPauseState = Map.empty<Nat, TaskPauseState>(); // Changed to stable

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

  // Migrate legacy data on upgrade; also re-sync permanent admins into MixinAuthorization
  system func postupgrade() {
    // Re-sync permanent admins into MixinAuthorization state so isCallerAdmin() works
    for ((p, isAdmin) in adminPrincipals.entries()) {
      if (isAdmin) {
        accessControlState.userRoles.add(p, #admin);
        accessControlState.adminAssigned := true;
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
    // fallback to MixinAuthorization count
    for ((_, role) in accessControlState.userRoles.entries()) {
      switch (role) {
        case (#admin) { count += 1 };
        case (_) {};
      };
    };
    count;
  };

  // bootstrapAdmin: works if permanent admin store is empty
  public shared ({ caller }) func bootstrapAdmin() : async Bool {
    if (caller.isAnonymous()) {
      Runtime.trap("Unauthorized: Anonymous principals cannot claim admin");
    };
    var count = 0;
    for ((_, v) in adminPrincipals.entries()) {
      if (v) { count += 1 };
    };
    if (count > 0) {
      if (isAdminPrincipal(caller)) { return true };
      return false;
    };
    // No permanent admins: allow claiming
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
      };
      case (_) {
        adminPrincipals.remove(user);
      };
    };
    AccessControl.assignRole(accessControlState, caller, user, role);
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
    if (not isAdminPrincipal(caller)) {
      Runtime.trap("Unauthorized: Only admins can view all user profiles");
    };
    userProfiles.entries().map(func((p, profile)) { { principal = p; profile } }).toArray();
  };

  public query ({ caller }) func getTasksByEmployee(employee : Principal) : async [Task] {
    if (not isAdminPrincipal(caller)) {
      Runtime.trap("Unauthorized: Only admins can view employee tasks");
    };
    tasksV3.values().filter(func(task) { task.assignee == employee }).toArray();
  };

  public query ({ caller }) func getCompletionDates() : async [CompletionDate] {
    if (not isAdminPrincipal(caller)) {
      Runtime.trap("Unauthorized: Only admins can view completion dates");
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
    if (not isAdminPrincipal(caller)) {
      Runtime.trap("Unauthorized: Only admins can create tasks");
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
        if (task.assignee == caller or isAdminPrincipal(caller)) {
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
    if (not isAdminPrincipal(caller)) {
      Runtime.trap("Unauthorized: Only admins can view all tasks");
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

  // New feature: Task instance completions for recurring tasks
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
    if (not isAdminPrincipal(caller)) {
      Runtime.trap("Unauthorized: Only admins can view task pause states");
    };
    taskPauseState.entries().toArray();
  };
};
