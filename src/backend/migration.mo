import Map "mo:core/Map";
import Nat "mo:core/Nat";
import Principal "mo:core/Principal";

module {
  type Priority = {
    #low;
    #medium;
    #high;
  };

  type TaskStatus = {
    #todo;
    #inProgress;
    #done;
  };

  type FrequencyType = {
    #none;
    #daily;
    #weekly;
    #monthly;
  };

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

  type ActorOld = {
    tasks : Map.Map<Nat, TaskLegacy>;
    tasksV2 : Map.Map<Nat, TaskV2>;
    tasksV3 : Map.Map<Nat, TaskV3>;
    nextTaskId : Nat;
    userProfiles : Map.Map<Principal, { name : Text; email : Text }>;
    taskCompletedAt : Map.Map<Nat, Int>;
  };

  type ActorNew = {
    tasks : Map.Map<Nat, TaskLegacy>;
    tasksV2 : Map.Map<Nat, TaskV2>;
    tasksV3 : Map.Map<Nat, TaskV3>;
    nextTaskId : Nat;
    userProfiles : Map.Map<Principal, { name : Text; email : Text }>;
    taskCompletedAt : Map.Map<Nat, Int>;
    taskInstanceCompletions : Map.Map<Text, Int>;
  };

  public func run(old : ActorOld) : ActorNew {
    let v3 = old.tasksV3;
    let v1 = old.tasks;
    let v2 = old.tasksV2;

    // Migrate V1 -> V3
    let mergedWithV1 = v1.foldLeft(v3, func(accMap, id, t) { if (v3.get(id) == null) { accMap.add(id, { t with frequency = #none; frequencyDays = ""; department = "" }) }; accMap });

    // Migrate V2 -> V3
    let mergedWithV2 = v2.foldLeft(mergedWithV1, func(accMap, id, t) { if (mergedWithV1.get(id) == null) { accMap.add(id, { t with department = "" }) }; accMap });

    { old with tasksV3 = mergedWithV2; taskInstanceCompletions = Map.empty<Text, Int>() };
  };
};
