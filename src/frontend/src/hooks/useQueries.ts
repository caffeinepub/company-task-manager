import { Principal } from "@icp-sdk/core/principal";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Priority, TaskStatus, UserRole } from "../backend.d";
import type { Task, UserProfile, UserProfileEntry } from "../backend.d";
import { useActor } from "./useActor";

export type { Task, UserProfile, UserProfileEntry };
export { Priority, TaskStatus, UserRole };

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
  return useQuery<[bigint, bigint, bigint]>({
    queryKey: ["dashboardStats", isAdmin],
    queryFn: async () => {
      if (!actor) return [0n, 0n, 0n] as [bigint, bigint, bigint];
      return isAdmin
        ? actor.countAllTasksByStatus()
        : actor.countTasksByStatus();
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
      const actorAny = actor as any;
      if (typeof actorAny.getCompletionDates !== "function") {
        return new Map<number, bigint>();
      }
      const tuples: [bigint, bigint][] = await actorAny.getCompletionDates();
      const map = new Map<number, bigint>();
      for (const [id, ts] of tuples) {
        map.set(Number(id), ts);
      }
      return map;
    },
    enabled: !!actor && !isFetching,
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
      dueDate,
      priority,
    }: {
      title: string;
      description: string;
      assignee: string;
      dueDate: string;
      priority: Priority;
    }) => {
      if (!actor) throw new Error("No actor");
      const principal = Principal.fromText(assignee);
      return actor.createTask(title, description, principal, dueDate, priority);
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
    },
  });
}
