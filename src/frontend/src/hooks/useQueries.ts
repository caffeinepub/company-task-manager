import { Principal } from "@icp-sdk/core/principal";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { FrequencyType, Priority, TaskStatus, UserRole } from "../backend.d";
import type {
  CompletionDate,
  Task,
  TaskPauseState,
  UserProfile,
  UserProfileEntry,
} from "../backend.d";
import { useActor } from "./useActor";

export type { Task, TaskPauseState, UserProfile, UserProfileEntry };
export { FrequencyType, Priority, TaskStatus, UserRole };

export interface DashboardStats {
  todo: bigint;
  inProgress: bigint;
  done: bigint;
}

export function useIsAdmin() {
  const { actor, isFetching } = useActor();
  return useQuery<boolean>({
    queryKey: ["isAdmin"],
    queryFn: async () => {
      if (!actor) return false;
      return actor.isCallerAdmin();
    },
    enabled: !!actor && !isFetching,
  });
}

export function useIsSuperUser() {
  const { actor, isFetching } = useActor();
  return useQuery<boolean>({
    queryKey: ["isSuperUser"],
    queryFn: async () => {
      if (!actor) return false;
      return actor.isCallerSuperUser();
    },
    enabled: !!actor && !isFetching,
  });
}

export function useHasAnyAdmin() {
  const { actor, isFetching } = useActor();
  return useQuery<boolean>({
    queryKey: ["hasAnyAdmin"],
    queryFn: async () => {
      if (!actor) return true;
      return actor.hasAnyAdmin();
    },
    enabled: !!actor && !isFetching,
  });
}

export function useCallerRole() {
  const { actor, isFetching } = useActor();
  return useQuery<UserRole>({
    queryKey: ["callerRole"],
    queryFn: async () => {
      if (!actor) return UserRole.guest;
      return actor.getCallerUserRole();
    },
    enabled: !!actor && !isFetching,
  });
}

export function useCallerProfile() {
  const { actor, isFetching } = useActor();
  return useQuery<UserProfile | null>({
    queryKey: ["callerProfile"],
    queryFn: async () => {
      if (!actor) return null;
      return actor.getCallerUserProfile();
    },
    enabled: !!actor && !isFetching,
  });
}

export function useDashboardStats(isAdmin: boolean) {
  const { actor, isFetching } = useActor();
  return useQuery<DashboardStats>({
    queryKey: ["dashboardStats", isAdmin],
    queryFn: async () => {
      if (!actor) return { todo: 0n, inProgress: 0n, done: 0n };
      const result = await (actor as any).countTasksByStatus();
      if (Array.isArray(result)) {
        return {
          todo: result[0] as bigint,
          inProgress: result[1] as bigint,
          done: result[2] as bigint,
        };
      }
      return {
        todo: (result.todo ?? 0n) as bigint,
        inProgress: (result.inProgress ?? 0n) as bigint,
        done: (result.done ?? 0n) as bigint,
      };
    },
    enabled: !!actor && !isFetching,
  });
}

export function useMyTasks() {
  const { actor, isFetching } = useActor();
  return useQuery<Task[]>({
    queryKey: ["myTasks"],
    queryFn: async () => {
      if (!actor) return [];
      return actor.getMyTasks();
    },
    enabled: !!actor && !isFetching,
  });
}

export function useAllTasks() {
  const { actor, isFetching } = useActor();
  return useQuery<Task[]>({
    queryKey: ["allTasks"],
    queryFn: async () => {
      if (!actor) return [];
      return actor.getAllTasks();
    },
    enabled: !!actor && !isFetching,
  });
}

export function useAllUserProfiles() {
  const { actor, isFetching } = useActor();
  return useQuery<UserProfileEntry[]>({
    queryKey: ["allUserProfiles"],
    queryFn: async () => {
      if (!actor) return [];
      return actor.getAllUserProfiles();
    },
    enabled: !!actor && !isFetching,
  });
}

export function useTasksByEmployee(employee: string | null) {
  const { actor, isFetching } = useActor();
  return useQuery<Task[]>({
    queryKey: ["tasksByEmployee", employee],
    queryFn: async () => {
      if (!actor || !employee) return [];
      const principal = Principal.fromText(employee);
      return actor.getTasksByEmployee(principal);
    },
    enabled: !!actor && !isFetching && !!employee,
  });
}

export function useCompletionDates() {
  const { actor, isFetching } = useActor();
  return useQuery<Map<number, bigint>>({
    queryKey: ["completionDates"],
    queryFn: async () => {
      if (!actor) return new Map<number, bigint>();
      const records: CompletionDate[] = await actor.getCompletionDates();
      const map = new Map<number, bigint>();
      for (const r of records) {
        map.set(Number(r.taskId), r.completionTimestamp);
      }
      return map;
    },
    enabled: !!actor && !isFetching,
  });
}

export function useAdminCount() {
  const { actor, isFetching } = useActor();
  return useQuery<number>({
    queryKey: ["adminCount"],
    queryFn: async () => {
      if (!actor) return 0;
      const count = await actor.getAdminCount();
      return Number(count);
    },
    enabled: !!actor && !isFetching,
  });
}

export function useTaskInstanceCompletions() {
  const { actor, isFetching } = useActor();
  return useQuery<Map<string, bigint>>({
    queryKey: ["taskInstanceCompletions"],
    queryFn: async () => {
      if (!actor) return new Map<string, bigint>();
      const entries = await actor.getTaskInstanceCompletions();
      return new Map(entries.map(([k, v]) => [k, v]));
    },
    enabled: !!actor && !isFetching,
  });
}

export function useTaskPauseStates() {
  const { actor, isFetching } = useActor();
  return useQuery<Map<string, TaskPauseState>>({
    queryKey: ["taskPauseStates"],
    queryFn: async () => {
      if (!actor) return new Map<string, TaskPauseState>();
      const entries = await actor.getTaskPauseStates();
      return new Map(entries.map(([k, v]) => [k.toString(), v]));
    },
    enabled: !!actor && !isFetching,
  });
}

export function usePauseTask() {
  const { actor } = useActor();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (taskId: bigint) => {
      if (!actor) throw new Error("No actor");
      return actor.pauseTask(taskId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["taskPauseStates"] });
    },
  });
}

export function useUnpauseTask() {
  const { actor } = useActor();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (taskId: bigint) => {
      if (!actor) throw new Error("No actor");
      return actor.unpauseTask(taskId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["taskPauseStates"] });
    },
  });
}

export function useMarkTaskInstanceDone() {
  const { actor } = useActor();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      taskId,
      targetDate,
    }: { taskId: bigint; targetDate: string }) => {
      if (!actor) throw new Error("No actor");
      return actor.markTaskInstanceDone(taskId, targetDate);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["taskInstanceCompletions"] });
      queryClient.invalidateQueries({ queryKey: ["myTasks"] });
      queryClient.invalidateQueries({ queryKey: ["allTasks"] });
    },
  });
}

export function useMarkTaskInstanceDoneAdmin() {
  const { actor } = useActor();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      taskId,
      targetDate,
    }: { taskId: bigint; targetDate: string }) => {
      if (!actor) throw new Error("No actor");
      return actor.markTaskInstanceDone(taskId, targetDate);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["taskInstanceCompletions"] });
      queryClient.invalidateQueries({ queryKey: ["allTasks"] });
      queryClient.invalidateQueries({ queryKey: ["myTasks"] });
    },
  });
}

export function useUnmarkTaskInstanceDone() {
  const { actor } = useActor();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      taskId,
      targetDate,
    }: { taskId: bigint; targetDate: string }) => {
      if (!actor) throw new Error("No actor");
      return actor.unmarkTaskInstanceDone(taskId, targetDate);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["taskInstanceCompletions"] });
      queryClient.invalidateQueries({ queryKey: ["myTasks"] });
      queryClient.invalidateQueries({ queryKey: ["allTasks"] });
    },
  });
}

export function useUpdateTaskStatus() {
  const { actor } = useActor();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      taskId,
      status,
    }: { taskId: bigint; status: TaskStatus }) => {
      if (!actor) throw new Error("No actor");
      return actor.updateTaskStatus(taskId, status);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["myTasks"] });
      queryClient.invalidateQueries({ queryKey: ["allTasks"] });
      queryClient.invalidateQueries({ queryKey: ["dashboardStats"] });
      queryClient.invalidateQueries({ queryKey: ["tasksByEmployee"] });
      queryClient.invalidateQueries({ queryKey: ["completionDates"] });
    },
  });
}

export function useCreateTask() {
  const { actor } = useActor();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      title,
      description,
      assignee,
      targetDate,
      priority,
      frequency,
      frequencyDays,
      department,
    }: {
      title: string;
      description: string;
      assignee: string;
      targetDate: string;
      priority: Priority;
      frequency: FrequencyType;
      frequencyDays: string;
      department: string;
    }) => {
      if (!actor) throw new Error("No actor");
      const principal = Principal.fromText(assignee);
      return actor.createTask(
        title,
        description,
        principal,
        targetDate,
        priority,
        frequency,
        frequencyDays,
        department,
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["allTasks"] });
      queryClient.invalidateQueries({ queryKey: ["dashboardStats"] });
    },
  });
}

export function useDeleteTask() {
  const { actor } = useActor();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (taskId: bigint) => {
      if (!actor) throw new Error("No actor");
      return actor.deleteTask(taskId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["allTasks"] });
      queryClient.invalidateQueries({ queryKey: ["dashboardStats"] });
    },
  });
}

export function useSaveProfile() {
  const { actor } = useActor();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (profile: UserProfile) => {
      if (!actor) throw new Error("No actor");
      return actor.saveCallerUserProfile(profile);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["callerProfile"] });
    },
  });
}

export function useAssignRole() {
  const { actor } = useActor();
  return useMutation({
    mutationFn: async ({ user, role }: { user: string; role: UserRole }) => {
      if (!actor) throw new Error("No actor");
      const principal = Principal.fromText(user);
      return actor.assignCallerUserRole(principal, role);
    },
  });
}

export function useAssignUserRoleAsAdmin() {
  const { actor } = useActor();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ user, role }: { user: string; role: UserRole }) => {
      if (!actor) throw new Error("No actor");
      const principal = Principal.fromText(user);
      return actor.assignUserRoleAsAdmin(principal, role);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["adminCount"] });
    },
  });
}

export function useBootstrapAdmin() {
  const { actor } = useActor();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      if (!actor) throw new Error("No actor");
      return actor.bootstrapAdmin();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["isAdmin"] });
      queryClient.invalidateQueries({ queryKey: ["callerRole"] });
      queryClient.invalidateQueries({ queryKey: ["hasAnyAdmin"] });
      queryClient.invalidateQueries({ queryKey: ["adminCount"] });
    },
  });
}

export function useTaskInstanceRemarks() {
  const { actor, isFetching } = useActor();
  return useQuery<Map<string, string>>({
    queryKey: ["taskInstanceRemarks"],
    queryFn: async () => {
      if (!actor) return new Map<string, string>();
      const entries = await actor.getTaskInstanceRemarks();
      return new Map(entries as Array<[string, string]>);
    },
    enabled: !!actor && !isFetching,
  });
}

export function useTaskInstanceTimingStatuses() {
  const { actor, isFetching } = useActor();
  return useQuery<Map<string, string>>({
    queryKey: ["taskInstanceTimingStatuses"],
    queryFn: async () => {
      if (!actor) return new Map<string, string>();
      const entries = await actor.getTaskInstanceTimingStatuses();
      return new Map(entries as Array<[string, string]>);
    },
    enabled: !!actor && !isFetching,
  });
}

export function useSetTaskInstanceRemarks() {
  const { actor } = useActor();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      instanceKey,
      remarks,
    }: { instanceKey: string; remarks: string }) => {
      if (!actor) throw new Error("No actor");
      return actor.setTaskInstanceRemarks(instanceKey, remarks);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["taskInstanceRemarks"] });
    },
  });
}

export function useSetTaskInstanceTimingStatus() {
  const { actor } = useActor();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      instanceKey,
      status,
    }: { instanceKey: string; status: string }) => {
      if (!actor) throw new Error("No actor");
      return actor.setTaskInstanceTimingStatus(instanceKey, status);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["taskInstanceTimingStatuses"],
      });
    },
  });
}

export function useUpdateTaskDetails() {
  const { actor } = useActor();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      taskId,
      title,
      description,
      targetDate,
    }: {
      taskId: bigint;
      title: string;
      description: string;
      targetDate: string;
    }) => {
      if (!actor) throw new Error("No actor");
      return actor.updateTaskDetails(taskId, title, description, targetDate);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["allTasks"] });
    },
  });
}

export function useAssignSuperUserRole() {
  const { actor } = useActor();
  return useMutation({
    mutationFn: async ({ user, assign }: { user: string; assign: boolean }) => {
      if (!actor) throw new Error("No actor");
      const principal = Principal.fromText(user);
      return actor.assignSuperUserRole(principal, assign);
    },
  });
}
