import Map "mo:core/Map";
import List "mo:core/List";
import Principal "mo:core/Principal";
import Time "mo:core/Time";
import Runtime "mo:core/Runtime";
import Text "mo:core/Text";

import MixinAuthorization "authorization/MixinAuthorization";
import AccessControl "authorization/access-control";


actor {
  let accessControlState = AccessControl.initState();
  include MixinAuthorization(accessControlState);

  public type Task = {
    id : Nat;
    title : Text;
    description : Text;
    assignee : Principal;
    dueDate : Text;
    priority : Priority;
    status : TaskStatus;
    createdAt : Int;
  };

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

  public type UserProfile = {
    name : Text;
    email : Text;
  };

  public type UserProfileEntry = {
    principal : Principal;
    profile : UserProfile;
  };

  let tasks = Map.empty<Nat, Task>();
  var nextTaskId = 0;
  let userProfiles = Map.empty<Principal, UserProfile>();

  // Bootstrap: allows the very first user to claim admin if no admin exists yet
  public shared ({ caller }) func bootstrapAdmin() : async Bool {
    if (caller.isAnonymous()) {
      return false;
    };
    if (accessControlState.adminAssigned) {
      if (AccessControl.isAdmin(accessControlState, caller)) {
        return true;
      };
      return false;
    };
    accessControlState.userRoles.add(caller, #admin);
    accessControlState.adminAssigned := true;
    return true;
  };

  public query func hasAnyAdmin() : async Bool {
    accessControlState.adminAssigned;
  };

  public query ({ caller }) func getCallerUserProfile() : async ?UserProfile {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can access profiles");
    };
    userProfiles.get(caller);
  };

  public query ({ caller }) func getUserProfile(user : Principal) : async ?UserProfile {
    if (caller != user and not AccessControl.isAdmin(accessControlState, caller)) {
      Runtime.trap("Unauthorized: Can only view your own profile");
    };
    userProfiles.get(user);
  };

  public shared ({ caller }) func saveCallerUserProfile(profile : UserProfile) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can save profiles");
    };
    userProfiles.add(caller, profile);
  };

  // Get all user profiles (admin only) - for Employee Panel
  public query ({ caller }) func getAllUserProfiles() : async [UserProfileEntry] {
    if (not (AccessControl.isAdmin(accessControlState, caller))) {
      Runtime.trap("Unauthorized: Only admins can view all user profiles");
    };
    let entries = List.empty<UserProfileEntry>();
    for ((p, profile) in userProfiles.entries()) {
      entries.add({ principal = p; profile });
    };
    entries.toArray();
  };

  // Get tasks for a specific employee (admin only)
  public query ({ caller }) func getTasksByEmployee(employee : Principal) : async [Task] {
    if (not (AccessControl.isAdmin(accessControlState, caller))) {
      Runtime.trap("Unauthorized: Only admins can view employee tasks");
    };
    let result = List.empty<Task>();
    for (task in tasks.values()) {
      if (task.assignee == employee) {
        result.add(task);
      };
    };
    result.toArray();
  };

  public shared ({ caller }) func createTask(title : Text, description : Text, assignee : Principal, dueDate : Text, priority : Priority) : async Nat {
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
      dueDate;
      priority;
      status = #todo;
      createdAt = Time.now();
    };

    tasks.add(id, newTask);
    id;
  };

  public query ({ caller }) func getTask(taskId : Nat) : async ?Task {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can view tasks");
    };

    switch (tasks.get(taskId)) {
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

    let myTasks = List.empty<Task>();
    for (task in tasks.values()) {
      if (task.assignee == caller) {
        myTasks.add(task);
      };
    };
    myTasks.toArray();
  };

  public query ({ caller }) func getAllTasks() : async [Task] {
    if (not (AccessControl.isAdmin(accessControlState, caller))) {
      Runtime.trap("Unauthorized: Only admins can view all tasks");
    };
    tasks.values().toArray();
  };

  public shared ({ caller }) func updateTaskStatus(taskId : Nat, newStatus : TaskStatus) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can update task status");
    };

    switch (tasks.get(taskId)) {
      case (null) { Runtime.trap("Task not found") };
      case (?task) {
        if (task.assignee != caller and not AccessControl.isAdmin(accessControlState, caller)) {
          Runtime.trap("Unauthorized: Only assignee or admin can update status");
        };
        let updatedTask : Task = { task with status = newStatus };
        tasks.add(taskId, updatedTask);
      };
    };
  };

  public shared ({ caller }) func deleteTask(taskId : Nat) : async () {
    if (not (AccessControl.isAdmin(accessControlState, caller))) {
      Runtime.trap("Unauthorized: Only admins can delete tasks");
    };

    switch (tasks.get(taskId)) {
      case (null) { Runtime.trap("Task not found") };
      case (?_) {
        tasks.remove(taskId);
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

    for (task in tasks.values()) {
      if (task.assignee == caller) {
        switch (task.status) {
          case (#todo) { todoCount += 1 };
          case (#inProgress) { inProgressCount += 1 };
          case (#done) { doneCount += 1 };
        };
      };
    };

    (todoCount, inProgressCount, doneCount);
  };

  public query ({ caller }) func countAllTasksByStatus() : async (Nat, Nat, Nat) {
    if (not (AccessControl.isAdmin(accessControlState, caller))) {
      Runtime.trap("Unauthorized: Only admins can access all task counts");
    };

    var todoCount = 0;
    var inProgressCount = 0;
    var doneCount = 0;

    for (task in tasks.values()) {
      switch (task.status) {
        case (#todo) { todoCount += 1 };
        case (#inProgress) { inProgressCount += 1 };
        case (#done) { doneCount += 1 };
      };
    };

    (todoCount, inProgressCount, doneCount);
  };
};
