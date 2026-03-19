import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import { Priority, TaskStatus } from "../backend.d";
import type { Task } from "../backend.d";
import { useMyTasks, useUpdateTaskStatus } from "../hooks/useQueries";

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

function TaskCard({ task, index }: { task: Task; index: number }) {
  const updateStatus = useUpdateTaskStatus();

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
              <StatusBadge status={task.status} />
              <span className="text-xs text-muted-foreground">
                Due: {task.dueDate}
              </span>
            </div>
          </div>
          <div className="sm:w-40 flex-shrink-0">
            <Select
              value={task.status}
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
        <div className="space-y-3">
          {tasks.map((task, i) => (
            <TaskCard key={task.id.toString()} task={task} index={i} />
          ))}
        </div>
      )}
    </div>
  );
}
