import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { ListTodo } from "lucide-react";
import { toast } from "sonner";
import { FrequencyType, Priority, TaskStatus } from "../backend.d";
import type { Task } from "../backend.d";
import {
  useCompletionDates,
  useMyTasks,
  useUpdateTaskStatus,
} from "../hooks/useQueries";

function todayStr(): string {
  return new Date().toISOString().slice(0, 10);
}

function getNextWeeklyDate(frequencyDays: string): string {
  const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const days = frequencyDays.split(",").map((d) => d.trim());
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

export function getEffectiveTargetDate(task: Task): string {
  const freq = task.frequency as FrequencyType;
  if (freq === FrequencyType.daily) return todayStr();
  if (freq === FrequencyType.weekly && task.frequencyDays) {
    return getNextWeeklyDate(task.frequencyDays);
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

export function getEffectiveStatus(
  task: Task,
  completionDates: Map<number, bigint>,
): TaskStatus {
  const freq = task.frequency as FrequencyType;
  if (freq === FrequencyType.none) return task.status;
  if (task.status !== TaskStatus.done) return task.status;
  const ts = completionDates.get(Number(task.id));
  if (!ts) return task.status;
  const completedDate = new Date(Number(ts / 1_000_000n))
    .toISOString()
    .slice(0, 10);
  const effectiveDate = getEffectiveTargetDate(task);
  if (completedDate < effectiveDate) return TaskStatus.todo;
  return task.status;
}

function isTaskActiveToday(
  task: Task,
  completionDates: Map<number, bigint>,
): boolean {
  const effectiveStatus = getEffectiveStatus(task, completionDates);
  // If pending, always show as active today (carry-forward)
  if (
    effectiveStatus === TaskStatus.todo ||
    effectiveStatus === TaskStatus.inProgress
  ) {
    return true;
  }
  // If done, only show as active if it's scheduled today
  const freq = task.frequency as FrequencyType;
  if (freq === FrequencyType.none) return true;
  if (freq === FrequencyType.daily) return true;
  const now = new Date();
  if (freq === FrequencyType.weekly) {
    const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    const todayName = dayNames[now.getDay()];
    const days = task.frequencyDays.split(",").map((d) => d.trim());
    return days.includes(todayName);
  }
  if (freq === FrequencyType.monthly) {
    return String(now.getDate()) === task.frequencyDays.trim();
  }
  return true;
}

function frequencyLabel(task: Task): string {
  const freq = task.frequency as FrequencyType;
  switch (freq) {
    case FrequencyType.daily:
      return "Daily";
    case FrequencyType.weekly:
      return `Weekly: ${task.frequencyDays}`;
    case FrequencyType.monthly:
      return `Monthly: day ${task.frequencyDays}`;
    default:
      return "";
  }
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

function StatusBadge({ status }: { status: TaskStatus }) {
  const map: Record<TaskStatus, { label: string; className: string }> = {
    [TaskStatus.todo]: {
      label: "Todo",
      className: "bg-muted text-muted-foreground border-0",
    },
    [TaskStatus.inProgress]: {
      label: "In Progress",
      className: "bg-blue-100 text-blue-700 border-0",
    },
    [TaskStatus.done]: {
      label: "Done",
      className: "bg-green-100 text-green-700 border-0",
    },
  };
  const { label, className } = map[status];
  return <Badge className={`${className} text-xs font-medium`}>{label}</Badge>;
}

function TaskCard({
  task,
  index,
  completionDates,
}: {
  task: Task;
  index: number;
  completionDates: Map<number, bigint>;
}) {
  const updateStatus = useUpdateTaskStatus();
  const freqLabel = frequencyLabel(task);
  const effectiveDate = getEffectiveTargetDate(task);
  const effectiveStatus = getEffectiveStatus(task, completionDates);

  const isOverdue =
    (effectiveStatus === TaskStatus.todo ||
      effectiveStatus === TaskStatus.inProgress) &&
    task.targetDate < todayStr();

  function handleStatusChange(val: string) {
    updateStatus.mutate(
      { taskId: task.id, status: val as TaskStatus },
      {
        onSuccess: () => toast.success("Task status updated"),
        onError: () => toast.error("Failed to update status"),
      },
    );
  }

  return (
    <Card
      className="shadow-card hover:shadow-card-hover transition-shadow"
      data-ocid={`tasks.item.${index + 1}`}
    >
      <CardContent className="p-5">
        <div className="flex flex-col sm:flex-row sm:items-start gap-3">
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-sm mb-1">{task.title}</h3>
            <p className="text-xs text-muted-foreground line-clamp-2 mb-3">
              {task.description}
            </p>
            <div className="flex items-center gap-2 flex-wrap">
              <PriorityBadge priority={task.priority} />
              <StatusBadge status={effectiveStatus} />
              <span className="text-xs text-muted-foreground">
                Target: {effectiveDate}
              </span>
              {isOverdue && (
                <Badge className="bg-red-100 text-red-700 border-0 text-xs">
                  Overdue
                </Badge>
              )}
              {freqLabel && (
                <Badge variant="outline" className="text-xs">
                  {freqLabel}
                </Badge>
              )}
              {task.department && (
                <Badge
                  variant="outline"
                  className="text-xs bg-purple-50 text-purple-700 border-purple-200"
                >
                  {task.department}
                </Badge>
              )}
            </div>
          </div>
          <div className="sm:w-40 flex-shrink-0">
            <Select
              value={effectiveStatus}
              onValueChange={handleStatusChange}
              disabled={updateStatus.isPending}
            >
              <SelectTrigger
                className="h-8 text-xs"
                data-ocid={`tasks.status.select.${index + 1}`}
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={TaskStatus.todo}>Todo</SelectItem>
                <SelectItem value={TaskStatus.inProgress}>
                  In Progress
                </SelectItem>
                <SelectItem value={TaskStatus.done}>Done</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default function MyTasksPage() {
  const { data: tasks, isLoading } = useMyTasks();
  const { data: completionDates = new Map<number, bigint>() } =
    useCompletionDates();

  const activeTasks = (tasks ?? []).filter((t) =>
    isTaskActiveToday(t, completionDates),
  );
  const inactiveTasks = (tasks ?? []).filter(
    (t) => !isTaskActiveToday(t, completionDates),
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
            <Skeleton key={i} className="h-32 w-full rounded-lg" />
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
              Pending Tasks ({activeTasks.length})
            </h2>
            {activeTasks.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No pending tasks. Great work!
              </p>
            ) : (
              activeTasks.map((task, i) => (
                <TaskCard
                  key={task.id.toString()}
                  task={task}
                  index={i}
                  completionDates={completionDates}
                />
              ))
            )}
          </div>

          {inactiveTasks.length > 0 && (
            <div className="space-y-3">
              <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                Completed / Not Due Today ({inactiveTasks.length})
              </h2>
              {inactiveTasks.map((task, i) => (
                <TaskCard
                  key={task.id.toString()}
                  task={task}
                  index={activeTasks.length + i}
                  completionDates={completionDates}
                />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
