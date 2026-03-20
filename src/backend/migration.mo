import Map "mo:core/Map";
import Nat "mo:core/Nat";

module {
  type Priority = { #low; #medium; #high };
  type TaskStatus = { #todo; #inProgress; #done };
  type FrequencyType = { #none; #daily; #weekly; #monthly };

  type TaskLegacy = {
    id : Nat;
    title : Text;
    description : Text;
    assignee : Principal;
    targetDate : Text;
    priority : Priority;
    status : TaskStatus;
    createdAt : Int;
  };

  type TaskV2 = {
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

  type TaskV3 = {
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

  type OldActor = {
    tasks : Map.Map<Nat, TaskLegacy>;
    tasksV2 : Map.Map<Nat, TaskV2>;
  };

  type NewActor = {
    tasksV3 : Map.Map<Nat, TaskV3>;
  };

  public func run(old : OldActor) : NewActor {
    let tasksV3 : Map.Map<Nat, TaskV3> = Map.empty<Nat, TaskV3>();
    for ((id, t) in old.tasks.entries()) {
      tasksV3.add(id, {
        id = t.id;
        title = t.title;
        description = t.description;
        assignee = t.assignee;
        targetDate = t.targetDate;
        priority = t.priority;
        status = t.status;
        createdAt = t.createdAt;
        frequency = #none : FrequencyType;
        frequencyDays = "";
        department = "";
      });
    };

    for ((id, t) in old.tasksV2.entries()) {
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

    { tasksV3 };
  };
};
