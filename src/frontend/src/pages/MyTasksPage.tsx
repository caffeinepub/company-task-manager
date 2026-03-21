import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { CheckCircle2, Circle, ListTodo } from "lucide-react";
import { toast } from "sonner";
import { FrequencyType, Priority, TaskStatus } from "../backend.d";
import {
  useMarkTaskInstanceDone,
  useMyTasks,
  useTaskInstanceCompletions,
  useUnmarkTaskInstanceDone,
  useUpdateTaskStatus,
} from "../hooks/useQueries";
import type { TaskInstance } from "../utils/taskInstances";
import { expandAllTaskInstances } from "../utils/taskInstances";

function todayStr(): string {
  return new Date().toISOString().slice(0, 10);
}

function formatDate(dateStr: string): string {
  const [y, m, d] = dateStr.split("-");
  return `${d}-${m}-${y}`;
}

function FrequencyBadge({ freq, days }: { freq: FrequencyType; days: string }) {
  if (freq === FrequencyType.none) return null;
  const label =
    freq === FrequencyType.daily
      ? "Daily"
      : freq === FrequencyType.weekly
        ? `Weekly: ${days}`
        : `Monthly: day ${days}`;
  return (
    <Badge variant="outline" className="text-xs">
      {label}
    </Badge>
  );
}

function PriorityBadge({ priority }: { priority: Priority }) {
  const map: Record<Priority, { label: string; className: string }> = {
    [Priority.high]: {
      label: "High",
      className: "bg-red-100 text-red-700 border-0",
    },
    [Priority.medium]: {
      label: "Medium",
      className: "bg-amber-100 text-amber-700 border-0",
    },
    [Priority.low]: {
      label: "Low",
      className: "bg-green-100 text-green-700 border-0",
    },
  };
  const { label, className } = map[priority];
  return <Badge className={`${className} text-xs font-medium`}>{label}</Badge>;
}

function TaskInstanceCard({
  instance,
  index,
}: {
  instance: TaskInstance;
  index: number;
}) {
  const { task, targetDate, isDone, completedAt } = instance;
  const freq = task.frequency as FrequencyType;
  const isDaily = freq === FrequencyType.daily;
  const isOverdue = !isDone && targetDate < todayStr();

  const markDone = useMarkTaskInstanceDone();
  const unmarkDone = useUnmarkTaskInstanceDone();
  const updateStatus = useUpdateTaskStatus();

  const isPending =
    markDone.isPending || unmarkDone.isPending || updateStatus.isPending;

  function handleToggle() {
    if (isDaily) {
      if (isDone) {
        unmarkDone.mutate(
          { taskId: task.id, targetDate },
          {
            onSuccess: () => toast.success("Marked as pending"),
            onError: () => toast.error("Failed to update"),
          },
        );
      } else {
        markDone.mutate(
          { taskId: task.id, targetDate },
          {
            onSuccess: () => toast.success("Marked as done"),
            onError: () => toast.error("Failed to update"),
          },
        );
      }
    } else {
      const newStatus = isDone ? TaskStatus.todo : TaskStatus.done;
      updateStatus.mutate(
        { taskId: task.id, status: newStatus },
        {
          onSuccess: () =>
            toast.success(isDone ? "Marked as pending" : "Marked as done"),
          onError: () => toast.error("Failed to update"),
        },
      );
    }
  }

  return (
    <Card
      className={`shadow-card hover:shadow-card-hover transition-shadow ${
        isDone ? "opacity-70" : ""
      }`}
      data-ocid={`tasks.item.${index + 1}`}
    >
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          <Button
            variant="ghost"
            size="icon"
            className="mt-0.5 h-7 w-7 shrink-0"
            onClick={handleToggle}
            disabled={isPending}
            data-ocid={`tasks.toggle.${index + 1}`}
          >
            {isDone ? (
              <CheckCircle2 size={18} className="text-green-500" />
            ) : (
              <Circle size={18} className="text-muted-foreground" />
            )}
          </Button>

          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <h3
                className={`font-semibold text-sm ${
                  isDone ? "line-through text-muted-foreground" : ""
                }`}
              >
                {task.title}
              </h3>
              <span className="text-xs text-muted-foreground shrink-0 tabular-nums">
                {formatDate(targetDate)}
              </span>
            </div>

            {task.description && (
              <p className="text-xs text-muted-foreground line-clamp-1 mt-0.5">
                {task.description}
              </p>
            )}

            <div className="flex items-center gap-1.5 flex-wrap mt-2">
              <PriorityBadge priority={task.priority} />

              {isDone ? (
                <Badge className="bg-green-100 text-green-700 border-0 text-xs">
                  Done
                </Badge>
              ) : (
                <Badge className="bg-muted text-muted-foreground border-0 text-xs">
                  Pending
                </Badge>
              )}

              {isOverdue && (
                <Badge className="bg-red-100 text-red-700 border-0 text-xs">
                  Overdue
                </Badge>
              )}

              <FrequencyBadge freq={freq} days={task.frequencyDays} />

              {task.department && (
                <Badge
                  variant="outline"
                  className="text-xs bg-purple-50 text-purple-700 border-purple-200"
                >
                  {task.department}
                </Badge>
              )}

              {isDone && completedAt && (
                <span className="text-xs text-muted-foreground">
                  Completed:{" "}
                  {new Date(Number(completedAt / 1_000_000n)).toLocaleString()}
                </span>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export function getEffectiveTargetDate(task: {
  frequency: FrequencyType;
  targetDate: string;
  frequencyDays: string;
}): string {
  const freq = task.frequency as FrequencyType;
  if (freq === FrequencyType.daily) return todayStr();
  if (freq === FrequencyType.weekly && task.frequencyDays) {
    const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    const days = task.frequencyDays.split(",").map((d) => d.trim());
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayIdx = today.getDay();
    let minDiff = 7;
    for (const day of days) {
      const idx = dayNames.indexOf(day);
      if (idx === -1) continue;
      let diff = idx - todayIdx;
      if (diff < 0) diff += 7;
      if (diff < minDiff) minDiff = diff;
    }
    const result = new Date(today);
    result.setDate(today.getDate() + minDiff);
    return result.toISOString().slice(0, 10);
  }
  if (freq === FrequencyType.monthly && task.frequencyDays) {
    const dayOfMonth = Number(task.frequencyDays.trim());
    const now = new Date();
    const target = new Date(now.getFullYear(), now.getMonth(), dayOfMonth);
    if (target < now) target.setMonth(target.getMonth() + 1);
    return target.toISOString().slice(0, 10);
  }
  return task.targetDate;
}

export default function MyTasksPage() {
  const { data: tasks, isLoading: tasksLoading } = useMyTasks();
  const {
    data: instanceCompletions = new Map<string, bigint>(),
    isLoading: completionsLoading,
  } = useTaskInstanceCompletions();

  const isLoading = tasksLoading || completionsLoading;

  const { pendingInstances, doneInstances } = expandAllTaskInstances(
    tasks ?? [],
    instanceCompletions,
  );

  return (
    <div className="max-w-4xl mx-auto space-y-5 animate-fade-up">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <ListTodo size={22} className="text-primary" />
          My Tasks
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Tasks assigned to you
        </p>
      </div>

      {isLoading ? (
        <div className="space-y-3" data-ocid="tasks.loading_state">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-20 w-full rounded-lg" />
          ))}
        </div>
      ) : !tasks || tasks.length === 0 ? (
        <Card className="shadow-card">
          <CardContent
            className="py-16 text-center"
            data-ocid="tasks.empty_state"
          >
            <ListTodo
              size={40}
              className="mx-auto mb-3 text-muted-foreground opacity-40"
            />
            <p className="text-sm text-muted-foreground">
              No tasks assigned to you yet.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          <div className="space-y-3">
            <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
              Pending Tasks ({pendingInstances.length})
            </h2>
            {pendingInstances.length === 0 ? (
              <Card className="shadow-card">
                <CardContent className="py-8 text-center">
                  <p className="text-sm text-muted-foreground">
                    All caught up! No pending tasks.
                  </p>
                </CardContent>
              </Card>
            ) : (
              pendingInstances.map((inst, i) => (
                <TaskInstanceCard
                  key={inst.instanceKey}
                  instance={inst}
                  index={i}
                />
              ))
            )}
          </div>

          {doneInstances.length > 0 && (
            <div className="space-y-3">
              <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                Completed ({doneInstances.length})
              </h2>
              {doneInstances.map((inst, i) => (
                <TaskInstanceCard
                  key={inst.instanceKey}
                  instance={inst}
                  index={pendingInstances.length + i}
                />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
