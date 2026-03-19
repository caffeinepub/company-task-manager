import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ClipboardList, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Priority, TaskStatus } from "../backend.d";
import type { Task } from "../backend.d";
import { useAllTasks, useDeleteTask, useIsAdmin } from "../hooks/useQueries";

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

function DeleteButton({ task, index }: { task: Task; index: number }) {
  const deleteTask = useDeleteTask();

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 text-destructive hover:bg-destructive/10"
          data-ocid={`all_tasks.delete_button.${index + 1}`}
        >
          <Trash2 size={14} />
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent data-ocid="all_tasks.dialog">
        <AlertDialogHeader>
          <AlertDialogTitle>Delete Task</AlertDialogTitle>
          <AlertDialogDescription>
            Are you sure you want to delete &ldquo;{task.title}&rdquo;? This
            action cannot be undone.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel data-ocid="all_tasks.cancel_button">
            Cancel
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={() =>
              deleteTask.mutate(task.id, {
                onSuccess: () => toast.success("Task deleted"),
                onError: () => toast.error("Failed to delete task"),
              })
            }
            data-ocid="all_tasks.confirm_button"
          >
            Delete
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

export default function AllTasksPage() {
  const { data: isAdmin } = useIsAdmin();
  const { data: tasks, isLoading } = useAllTasks();

  if (!isAdmin) {
    return (
      <div className="max-w-4xl mx-auto">
        <Card className="shadow-card">
          <CardContent className="py-16 text-center">
            <p className="text-sm text-muted-foreground">
              Admin access required.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-5 animate-fade-up">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <ClipboardList size={22} className="text-primary" />
          All Tasks
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          {tasks?.length ?? 0} total tasks
        </p>
      </div>

      <Card className="shadow-card">
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-6 space-y-3" data-ocid="all_tasks.loading_state">
              {[1, 2, 3, 4].map((i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : !tasks || tasks.length === 0 ? (
            <div
              className="py-16 text-center"
              data-ocid="all_tasks.empty_state"
            >
              <ClipboardList
                size={40}
                className="mx-auto mb-3 text-muted-foreground opacity-40"
              />
              <p className="text-sm text-muted-foreground">
                No tasks created yet.
              </p>
            </div>
          ) : (
            <Table data-ocid="all_tasks.table">
              <TableHeader>
                <TableRow>
                  <TableHead>Title</TableHead>
                  <TableHead className="hidden md:table-cell">
                    Assignee
                  </TableHead>
                  <TableHead>Priority</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="hidden sm:table-cell">
                    Due Date
                  </TableHead>
                  <TableHead className="w-12" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {tasks.map((task, i) => (
                  <TableRow
                    key={task.id.toString()}
                    data-ocid={`all_tasks.row.${i + 1}`}
                  >
                    <TableCell>
                      <div>
                        <p className="font-medium text-sm">{task.title}</p>
                        <p className="text-xs text-muted-foreground line-clamp-1">
                          {task.description}
                        </p>
                      </div>
                    </TableCell>
                    <TableCell className="hidden md:table-cell">
                      <span className="text-xs font-mono text-muted-foreground">
                        {task.assignee.toString().slice(0, 12)}…
                      </span>
                    </TableCell>
                    <TableCell>
                      <PriorityBadge priority={task.priority} />
                    </TableCell>
                    <TableCell>
                      <StatusBadge status={task.status} />
                    </TableCell>
                    <TableCell className="hidden sm:table-cell text-sm">
                      {task.dueDate}
                    </TableCell>
                    <TableCell>
                      <DeleteButton task={task} index={i} />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
