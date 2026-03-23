import { FrequencyType, TaskStatus } from "../backend.d";
import type { Task, TaskPauseState } from "../backend.d";

export interface TaskInstance {
  task: Task;
  targetDate: string; // YYYY-MM-DD
  instanceKey: string; // "taskId_YYYY-MM-DD"
  isDone: boolean;
  completedAt?: bigint;
}

/** Format a Date as YYYY-MM-DD using LOCAL time (avoids UTC-offset day shift). */
function toDateStr(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function addDays(d: Date, n: number): Date {
  const r = new Date(d);
  r.setDate(r.getDate() + n);
  return r;
}

function parseDate(s: string): Date {
  const [y, m, d] = s.split("-").map(Number);
  return new Date(y, m - 1, d);
}

function nanoTsToDateStr(nanoTs: string): string {
  const ms = Number(BigInt(nanoTs) / 1_000_000n);
  const d = new Date(ms);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export function isInPausedPeriod(
  taskIdStr: string,
  instanceDate: string,
  pauseStateMap: Map<string, { pausedAt: string; unpausedAt: string }>,
): boolean {
  const state = pauseStateMap.get(taskIdStr);
  if (!state || !state.pausedAt) return false;
  const pausedAtDate = nanoTsToDateStr(state.pausedAt);
  if (instanceDate < pausedAtDate) return false;
  if (state.unpausedAt === "") return true;
  const unpausedAtDate = nanoTsToDateStr(state.unpausedAt);
  return instanceDate < unpausedAtDate;
}

/**
 * For a daily task, generate all instances from the task's creation date (targetDate)
 * up through today. Each day that is not marked done appears as a pending instance.
 * Days that are done appear as done instances.
 */
export function expandDailyTaskInstances(
  task: Task,
  instanceCompletions: Map<string, bigint>,
  today: Date,
): TaskInstance[] {
  if ((task.frequency as FrequencyType) !== FrequencyType.daily) return [];

  const startDate = parseDate(task.targetDate);
  const instances: TaskInstance[] = [];

  const todayCopy = new Date(today);
  todayCopy.setHours(0, 0, 0, 0);

  let current = new Date(startDate);
  current.setHours(0, 0, 0, 0);

  while (current <= todayCopy) {
    const dateStr = toDateStr(current);
    const key = `${task.id.toString()}_${dateStr}`;
    const completedAt = instanceCompletions.get(key);
    instances.push({
      task,
      targetDate: dateStr,
      instanceKey: key,
      isDone: completedAt !== undefined,
      completedAt,
    });
    current = addDays(current, 1);
  }

  return instances;
}

/**
 * Expand all tasks into instances.
 * - Daily tasks: one instance per day from targetDate to today
 * - Weekly/Monthly/None tasks: one instance using existing status logic
 * - pausedTaskIds: if provided, skip pending instances for those tasks
 * - pauseStateMap: if provided, instances in paused periods go to pausedInstances
 */
export function expandAllTaskInstances(
  tasks: Task[],
  instanceCompletions: Map<string, bigint>,
  pausedTaskIds?: Set<string>,
  pauseStateMap?: Map<string, TaskPauseState>,
): {
  pendingInstances: TaskInstance[];
  doneInstances: TaskInstance[];
  pausedInstances: TaskInstance[];
} {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const pendingInstances: TaskInstance[] = [];
  const doneInstances: TaskInstance[] = [];
  const pausedInstances: TaskInstance[] = [];

  for (const task of tasks) {
    const freq = task.frequency as FrequencyType;
    const taskIdStr = task.id.toString();
    const currentlyPaused = pausedTaskIds?.has(taskIdStr) ?? false;

    if (freq === FrequencyType.daily) {
      const instances = expandDailyTaskInstances(
        task,
        instanceCompletions,
        new Date(today),
      );
      for (const inst of instances) {
        if (inst.isDone) {
          doneInstances.push(inst);
        } else {
          const inPause = pauseStateMap
            ? isInPausedPeriod(taskIdStr, inst.targetDate, pauseStateMap)
            : currentlyPaused;
          if (inPause) {
            pausedInstances.push(inst);
          } else {
            pendingInstances.push(inst);
          }
        }
      }
    } else {
      const key = `${taskIdStr}_${task.targetDate}`;
      const isDone = task.status === TaskStatus.done;
      const inst: TaskInstance = {
        task,
        targetDate: task.targetDate,
        instanceKey: key,
        isDone,
        completedAt: isDone ? instanceCompletions.get(key) : undefined,
      };
      if (isDone) {
        doneInstances.push(inst);
      } else {
        const inPause = pauseStateMap
          ? isInPausedPeriod(taskIdStr, inst.targetDate, pauseStateMap)
          : currentlyPaused;
        if (inPause) {
          pausedInstances.push(inst);
        } else {
          pendingInstances.push(inst);
        }
      }
    }
  }

  pendingInstances.sort((a, b) => {
    const dateCmp = a.targetDate.localeCompare(b.targetDate);
    if (dateCmp !== 0) return dateCmp;
    return a.task.title.localeCompare(b.task.title);
  });

  return { pendingInstances, doneInstances, pausedInstances };
}
