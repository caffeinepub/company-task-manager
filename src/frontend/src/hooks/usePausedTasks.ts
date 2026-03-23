import type { TaskPauseState } from "../backend.d";
import { usePauseTask, useTaskPauseStates, useUnpauseTask } from "./useQueries";

function nanoTsToDateStr(nanoTs: string): string {
  const ms = Number(BigInt(nanoTs) / 1_000_000n);
  const d = new Date(ms);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export function isInPausedPeriodFromState(
  state: TaskPauseState,
  instanceDate: string,
): boolean {
  if (!state.pausedAt) return false;
  const pausedAtDate = nanoTsToDateStr(state.pausedAt);
  if (instanceDate < pausedAtDate) return false;
  if (state.unpausedAt === "") return true;
  const unpausedAtDate = nanoTsToDateStr(state.unpausedAt);
  return instanceDate < unpausedAtDate;
}

export function usePausedTasks() {
  const { data: pauseStates = new Map(), isLoading } = useTaskPauseStates();
  const pauseMutation = usePauseTask();
  const unpauseMutation = useUnpauseTask();

  const pauseTask = (taskIdStr: string) => {
    pauseMutation.mutate(BigInt(taskIdStr));
  };

  const unpauseTask = (taskIdStr: string) => {
    unpauseMutation.mutate(BigInt(taskIdStr));
  };

  const isPaused = (taskIdStr: string): boolean => {
    const state = pauseStates.get(taskIdStr);
    if (!state) return false;
    return state.pausedAt !== "" && state.unpausedAt === "";
  };

  const isInstanceInPausedPeriod = (
    taskIdStr: string,
    instanceDateStr: string,
  ): boolean => {
    const state = pauseStates.get(taskIdStr);
    if (!state) return false;
    return isInPausedPeriodFromState(state, instanceDateStr);
  };

  const pausedTaskIds = new Set(
    Array.from(pauseStates.entries())
      .filter(([, state]) => state.pausedAt !== "" && state.unpausedAt === "")
      .map(([id]) => id),
  );

  return {
    pauseTask,
    unpauseTask,
    isPaused,
    isInstanceInPausedPeriod,
    pausedTaskIds,
    isLoading,
    pauseStates,
  };
}
