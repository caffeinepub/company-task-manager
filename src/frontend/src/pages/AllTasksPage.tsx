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
import { Calendar } from "@/components/ui/calendar";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { format, isWithinInterval, parseISO } from "date-fns";
import {
  CalendarIcon,
  ClipboardList,
  Loader2,
  Search,
  Trash2,
  X,
} from "lucide-react";
import { useState } from "react";
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
  const { data: isAdmin, isLoading: isAdminLoading } = useIsAdmin();
  const { data: tasks, isLoading } = useAllTasks();

  const [nameFilter, setNameFilter] = useState("");
  const [startDate, setStartDate] = useState<Date | undefined>(undefined);
  const [endDate, setEndDate] = useState<Date | undefined>(undefined);
  const [startOpen, setStartOpen] = useState(false);
  const [endOpen, setEndOpen] = useState(false);

  if (isAdminLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 size={24} className="animate-spin text-primary" />
      </div>
    );
  }

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

  const filteredTasks = (tasks ?? []).filter((task) => {
    if (nameFilter.trim()) {
      const q = nameFilter.trim().toLowerCase();
      if (!task.title.toLowerCase().includes(q)) return false;
    }
    if (startDate || endDate) {
      if (!task.targetDate) return false;
      try {
        const taskDate = parseISO(task.targetDate);
        if (startDate && endDate) {
          if (!isWithinInterval(taskDate, { start: startDate, end: endDate }))
            return false;
        } else if (startDate) {
          if (taskDate < startDate) return false;
        } else if (endDate) {
          if (taskDate > endDate) return false;
        }
      } catch {
        return false;
      }
    }
    return true;
  });

  const clearFilters = () => {
    setNameFilter("");
    setStartDate(undefined);
    setEndDate(undefined);
  };

  const hasFilters = nameFilter.trim() || startDate || endDate;

  return (
    <div className="max-w-6xl mx-auto space-y-5 animate-fade-up">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <ClipboardList size={22} className="text-primary" />
          All Tasks
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          {filteredTasks.length} of {tasks?.length ?? 0} tasks
        </p>
      </div>

      {/* Filters */}
      <Card className="shadow-card">
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-3 items-end">
            <div className="flex-1 space-y-1">
              <Label className="text-xs text-muted-foreground">
                Search by Name
              </Label>
              <div className="relative">
                <Search
                  size={14}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                />
                <Input
                  className="pl-8 h-9"
                  placeholder="Task name..."
                  value={nameFilter}
                  onChange={(e) => setNameFilter(e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">From Date</Label>
              <Popover open={startOpen} onOpenChange={setStartOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className="h-9 w-36 justify-start text-left text-sm font-normal"
                  >
                    <CalendarIcon
                      size={14}
                      className="mr-2 text-muted-foreground"
                    />
                    {startDate ? (
                      format(startDate, "dd MMM yyyy")
                    ) : (
                      <span className="text-muted-foreground">Pick date</span>
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={startDate}
                    onSelect={(d) => {
                      setStartDate(d);
                      setStartOpen(false);
                    }}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>

            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">To Date</Label>
              <Popover open={endOpen} onOpenChange={setEndOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className="h-9 w-36 justify-start text-left text-sm font-normal"
                  >
                    <CalendarIcon
                      size={14}
                      className="mr-2 text-muted-foreground"
                    />
                    {endDate ? (
                      format(endDate, "dd MMM yyyy")
                    ) : (
                      <span className="text-muted-foreground">Pick date</span>
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={endDate}
                    onSelect={(d) => {
                      setEndDate(d);
                      setEndOpen(false);
                    }}
                    disabled={startDate ? { before: startDate } : undefined}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>

            {hasFilters && (
              <Button
                variant="ghost"
                size="sm"
                onClick={clearFilters}
                className="h-9 gap-1 text-muted-foreground hover:text-foreground"
              >
                <X size={14} /> Clear
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      <Card className="shadow-card">
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-6 space-y-3" data-ocid="all_tasks.loading_state">
              {[1, 2, 3, 4].map((i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : filteredTasks.length === 0 ? (
            <div
              className="py-16 text-center"
              data-ocid="all_tasks.empty_state"
            >
              <ClipboardList
                size={40}
                className="mx-auto mb-3 text-muted-foreground opacity-40"
              />
              <p className="text-sm text-muted-foreground">
                {hasFilters
                  ? "No tasks match your filters."
                  : "No tasks created yet."}
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
                    Target Date
                  </TableHead>
                  <TableHead className="w-12" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredTasks.map((task, i) => (
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
                        {task.assignee.toString().slice(0, 12)}&hellip;
                      </span>
                    </TableCell>
                    <TableCell>
                      <PriorityBadge priority={task.priority} />
                    </TableCell>
                    <TableCell>
                      <StatusBadge status={task.status} />
                    </TableCell>
                    <TableCell className="hidden sm:table-cell text-sm">
                      {task.targetDate}
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
