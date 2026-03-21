import { FrequencyType, TaskStatus } from "../backend.d";
import type { Task } from "../backend.d";

export interface TaskInstance {
  task: Task;
  targetDate: string; // YYYY-MM-DD
  instanceKey: string; // "taskId_YYYY-MM-DD"
  isDone: boolean;
  completedAt?: bigint;
}

function toDateStr(d: Date): string {
  return d.toISOString().slice(0, 10);
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
 */
export function expandAllTaskInstances(
  tasks: Task[],
  instanceCompletions: Map<string, bigint>,
): { pendingInstances: TaskInstance[]; doneInstances: TaskInstance[] } {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const pendingInstances: TaskInstance[] = [];
  const doneInstances: TaskInstance[] = [];

  for (const task of tasks) {
    const freq = task.frequency as FrequencyType;

    if (freq === FrequencyType.daily) {
      const instances = expandDailyTaskInstances(
        task,
        instanceCompletions,
        new Date(today),
      );
      for (const inst of instances) {
        if (inst.isDone) doneInstances.push(inst);
        else pendingInstances.push(inst);
      }
    } else {
      const key = `${task.id.toString()}_${task.targetDate}`;
      const isDone = task.status === TaskStatus.done;
      const inst: TaskInstance = {
        task,
        targetDate: task.targetDate,
        instanceKey: key,
        isDone,
        completedAt: isDone ? instanceCompletions.get(key) : undefined,
      };
      if (isDone) doneInstances.push(inst);
      else pendingInstances.push(inst);
    }
  }

  pendingInstances.sort((a, b) => {
    const dateCmp = a.targetDate.localeCompare(b.targetDate);
    if (dateCmp !== 0) return dateCmp;
    return a.task.title.localeCompare(b.task.title);
  });

  return { pendingInstances, doneInstances };
}
