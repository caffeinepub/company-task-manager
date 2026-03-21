import Map "mo:core/Map";
import Principal "mo:core/Principal";
import Text "mo:core/Text";
import Int "mo:core/Int";
import Time "mo:core/Time";
import Iter "mo:core/Iter";
import Runtime "mo:core/Runtime";


import MixinAuthorization "authorization/MixinAuthorization";
import AccessControl "authorization/access-control";


actor {
  stable let accessControlState = AccessControl.initState();
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

  // V3 (has frequency + department)
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

  // Migrate legacy data on upgrade
  system func postupgrade() {
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
    for ((_, role) in accessControlState.userRoles.entries()) {
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
    countAdmins() > 0;
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
    userProfiles.get(caller);
  };

  public query ({ caller }) func getUserProfile(userPrincipal : Principal) : async ?UserProfile {
    if (caller != userPrincipal and not AccessControl.isAdmin(accessControlState, caller)) {
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
    if (not (AccessControl.isAdmin(accessControlState, caller))) {
      Runtime.trap("Unauthorized: Only admins can view all user profiles");
    };
    userProfiles.entries().map(func((p, profile)) { { principal = p; profile } }).toArray();
  };

  public query ({ caller }) func getTasksByEmployee(employee : Principal) : async [Task] {
    if (not (AccessControl.isAdmin(accessControlState, caller))) {
      Runtime.trap("Unauthorized: Only admins can view employee tasks");
    };
    tasksV3.values().filter(func(task) { task.assignee == employee }).toArray();
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
    frequencyDays : Text,
    department : Text
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
      department;
    };

    tasksV3.add(id, newTask);
    id;
  };

  public query ({ caller }) func getTask(taskId : Nat) : async ?Task {
    switch (tasksV3.get(taskId)) {
      case (null) { null };
      case (?task) {
        if (task.assignee == caller or AccessControl.isAdmin(accessControlState, caller)) {
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
    if (not (AccessControl.isAdmin(accessControlState, caller))) {
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
        tasksV3.add(taskId, updatedTask);
      };
    };
  };

  public shared ({ caller }) func deleteTask(taskId : Nat) : async () {
    if (not (AccessControl.isAdmin(accessControlState, caller))) {
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
    let isAdminCaller = AccessControl.isAdmin(accessControlState, caller);
    for (task in tasksV3.values()) {
      if (isAdminCaller or task.assignee == caller) {
        switch (task.status) {
          case (#todo) { todoCount += 1 };
          case (#inProgress) { inProgressCount += 1 };
          case (#done) { doneCount += 1 };
        };
      };
    };
    (todoCount, inProgressCount, doneCount);
  };

  // New feature: Task instance completions for recurring tasks
  public shared ({ caller }) func markTaskInstanceDone(taskId : Nat, targetDate : Text) : async () {
    switch (tasksV3.get(taskId)) {
      case (null) { Runtime.trap("Task not found") };
      case (?task) {
        if (task.assignee != caller and not AccessControl.isAdmin(accessControlState, caller)) {
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
        if (task.assignee != caller and not AccessControl.isAdmin(accessControlState, caller)) {
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
    
    let isAdminCaller = AccessControl.isAdmin(accessControlState, caller);
    
    // Admins see all completions
    if (isAdminCaller) {
      return taskInstanceCompletions.entries().toArray();
    };
    
    // Regular users see only completions for their assigned tasks
    taskInstanceCompletions.entries().filter(func((key, timestamp)) {
      // Parse taskId from key format "taskId_YYYY-MM-DD"
      let parts = key.split(#char '_');
      switch (parts.next()) {
        case (?taskIdText) {
          switch (Nat.fromText(taskIdText)) {
            case (?taskId) {
              switch (tasksV3.get(taskId)) {
                case (?task) { task.assignee == caller };
                case (null) { false };
              };
            };
            case (null) { false };
          };
        };
        case (null) { false };
      };
    }).toArray();
  };
};
