import Map "mo:core/Map";
import Principal "mo:core/Principal";
import Time "mo:core/Time";
import Runtime "mo:core/Runtime";
import Iter "mo:core/Iter";


import MixinAuthorization "authorization/MixinAuthorization";
import AccessControl "authorization/access-control";

actor {
  let accessControlState = AccessControl.initState();
  include MixinAuthorization(accessControlState);

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

  // Legacy task type (without frequency fields) -- kept for stable migration
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

  // Legacy stable map absorbs old task data on upgrade (compatible with old Task type)
  let tasks = Map.empty<Nat, TaskLegacy>();
  // New stable map stores tasks with frequency fields
  let tasksV2 = Map.empty<Nat, Task>();
  var nextTaskId = 0;
  let userProfiles = Map.empty<Principal, UserProfile>();
  let taskCompletedAt = Map.empty<Nat, Int>();

  // On upgrade: migrate any legacy tasks into tasksV2 with default frequency values
  system func postupgrade() {
    for ((id, t) in tasks.entries()) {
      if (tasksV2.get(id) == null) {
        tasksV2.add(id, {
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
        });
      };
    };
  };

  private func countAdmins() : Nat {
    var count = 0;
    for ((principal, role) in accessControlState.userRoles.entries()) {
      switch (role) {
        case (#admin) { count += 1 };
        case (_) {};
      };
    };
    count;
  };

  public shared ({ caller }) func bootstrapAdmin() : async Bool {
    if (caller.isAnonymous()) {
      Runtime.trap("Unauthorized: Anonymous principals cannot claim admin");
    };
    let adminCount = countAdmins();
    if (adminCount > 0) {
      if (AccessControl.isAdmin(accessControlState, caller)) {
        return true;
      };
      return false;
    };
    accessControlState.userRoles.add(caller, #admin);
    accessControlState.adminAssigned := true;
    true;
  };

  public query func hasAnyAdmin() : async Bool {
    accessControlState.adminAssigned;
  };

  public query func getAdminCount() : async Nat {
    countAdmins();
  };

  public shared ({ caller }) func assignUserRoleAsAdmin(user : Principal, role : AccessControl.UserRole) : async () {
    if (not (AccessControl.isAdmin(accessControlState, caller))) {
      Runtime.trap("Unauthorized: Only admins can assign roles");
    };
    switch (role) {
      case (#admin) {
        let currentAdminCount = countAdmins();
        if (currentAdminCount >= 10) {
          Runtime.trap("Cannot assign admin role: Maximum of 10 admins reached");
        };
      };
      case (_) {};
    };
    AccessControl.assignRole(accessControlState, caller, user, role);
  };

  public query ({ caller }) func getCallerUserProfile() : async ?UserProfile {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can access profiles");
    };
    userProfiles.get(caller);
  };

  public query ({ caller }) func getUserProfile(userPrincipal : Principal) : async ?UserProfile {
    if (caller != userPrincipal and not AccessControl.isAdmin(accessControlState, caller)) {
      Runtime.trap("Unauthorized: Can only view your own profile");
    };
    userProfiles.get(userPrincipal);
  };

  public shared ({ caller }) func saveCallerUserProfile(profile : UserProfile) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can save profiles");
    };
    userProfiles.add(caller, profile);
  };

  public query ({ caller }) func getAllUserProfiles() : async [UserProfileEntry] {
    if (not (AccessControl.isAdmin(accessControlState, caller))) {
      Runtime.trap("Unauthorized: Only admins can view all user profiles");
    };
    userProfiles.entries().map(func((p, profile)) { { principal = p; profile } }).toArray();
  };

  public query ({ caller }) func getTasksByEmployee(employee : Principal) : async [Task] {
    if (not (AccessControl.isAdmin(accessControlState, caller))) {
      Runtime.trap("Unauthorized: Only admins can view employee tasks");
    };
    tasksV2.values().filter(func(task) { task.assignee == employee }).toArray();
  };

  public query ({ caller }) func getCompletionDates() : async [CompletionDate] {
    if (not (AccessControl.isAdmin(accessControlState, caller))) {
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
    frequencyDays : Text
  ) : async Nat {
    if (not (AccessControl.isAdmin(accessControlState, caller))) {
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
    };

    tasksV2.add(id, newTask);
    id;
  };

  public query ({ caller }) func getTask(taskId : Nat) : async ?Task {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can view tasks");
    };
    switch (tasksV2.get(taskId)) {
      case (null) { null };
      case (?task) {
        if (task.assignee == caller or AccessControl.isAdmin(accessControlState, caller)) {
          ?task;
        } else {
          Runtime.trap("Unauthorized: Can only view tasks assigned to you");
        };
      };
    };
  };

  public query ({ caller }) func getMyTasks() : async [Task] {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can view tasks");
    };
    tasksV2.values().filter(func(task) { task.assignee == caller }).toArray();
  };

  public query ({ caller }) func getAllTasks() : async [Task] {
    if (not (AccessControl.isAdmin(accessControlState, caller))) {
      Runtime.trap("Unauthorized: Only admins can view all tasks");
    };
    tasksV2.values().toArray();
  };

  public shared ({ caller }) func updateTaskStatus(taskId : Nat, newStatus : TaskStatus) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can update task status");
    };
    switch (tasksV2.get(taskId)) {
      case (null) { Runtime.trap("Task not found") };
      case (?task) {
        if (task.assignee != caller and not AccessControl.isAdmin(accessControlState, caller)) {
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
        tasksV2.add(taskId, updatedTask);
      };
    };
  };

  public shared ({ caller }) func deleteTask(taskId : Nat) : async () {
    if (not (AccessControl.isAdmin(accessControlState, caller))) {
      Runtime.trap("Unauthorized: Only admins can delete tasks");
    };
    switch (tasksV2.get(taskId)) {
      case (null) { Runtime.trap("Task not found") };
      case (?_) {
        tasksV2.remove(taskId);
        taskCompletedAt.remove(taskId);
      };
    };
  };

  public query ({ caller }) func countTasksByStatus() : async (Nat, Nat, Nat) {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can view task statistics");
    };
    var todoCount = 0;
    var inProgressCount = 0;
    var doneCount = 0;
    let isAdmin = AccessControl.isAdmin(accessControlState, caller);
    for (task in tasksV2.values()) {
      if (isAdmin or task.assignee == caller) {
        switch (task.status) {
          case (#todo) { todoCount += 1 };
          case (#inProgress) { inProgressCount += 1 };
          case (#done) { doneCount += 1 };
        };
      };
    };
    (todoCount, inProgressCount, doneCount);
  };
};
