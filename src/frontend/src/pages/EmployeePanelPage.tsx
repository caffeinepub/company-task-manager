import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Download, Loader2, Users } from "lucide-react";
import { useState } from "react";
import { Priority, TaskStatus } from "../backend.d";
import type { Task, UserProfileEntry } from "../backend.d";
import {
  useAllUserProfiles,
  useCompletionDates,
  useIsAdmin,
  useTasksByEmployee,
} from "../hooks/useQueries";

function getTodayString(): string {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

function priorityLabel(p: Priority): string {
  switch (p) {
    case Priority.high:
      return "High";
    case Priority.medium:
      return "Medium";
    case Priority.low:
      return "Low";
  }
}

function statusLabel(s: TaskStatus): string {
  switch (s) {
    case TaskStatus.done:
      return "Done";
    case TaskStatus.inProgress:
      return "In Progress";
    case TaskStatus.todo:
      return "To Do";
  }
}

function statusVariant(s: TaskStatus): "default" | "secondary" | "outline" {
  switch (s) {
    case TaskStatus.done:
      return "default";
    case TaskStatus.inProgress:
      return "secondary";
    case TaskStatus.todo:
      return "outline";
  }
}

function downloadCSV(filename: string, rows: string[][], headers: string[]) {
  const escapeCSV = (v: string) => `"${v.replace(/"/g, '""')}"`;
  const lines = [
    headers.map(escapeCSV).join(","),
    ...rows.map((row) => row.map(escapeCSV).join(",")),
  ];
  const blob = new Blob([lines.join("\n")], {
    type: "text/csv;charset=utf-8;",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function tasksToRows(tasks: Task[], employeeName: string): string[][] {
  return tasks.map((t) => [
    String(t.id),
    t.title,
    t.description,
    employeeName,
    t.dueDate,
    priorityLabel(t.priority),
    statusLabel(t.status),
    new Date(Number(t.createdAt) / 1_000_000).toLocaleString(),
  ]);
}

function completedTasksToRows(
  tasks: Task[],
  employeeName: string,
  completionDates: Map<number, bigint>,
): string[][] {
  return tasks.map((t) => {
    const ts = completionDates.get(Number(t.id));
    const completedDateStr =
      ts !== undefined ? new Date(Number(ts) / 1_000_000).toLocaleString() : "";
    return [
      String(t.id),
      t.title,
      t.description,
      employeeName,
      t.dueDate,
      priorityLabel(t.priority),
      statusLabel(t.status),
      new Date(Number(t.createdAt) / 1_000_000).toLocaleString(),
      completedDateStr,
    ];
  });
}

const CSV_HEADERS = [
  "Task ID",
  "Title",
  "Description",
  "Employee",
  "Due Date",
  "Priority",
  "Status",
  "Created At",
];

const COMPLETED_CSV_HEADERS = [...CSV_HEADERS, "Completed Date"];

function EmployeeTaskView({
  entry,
  onBack,
}: {
  entry: UserProfileEntry;
  onBack: () => void;
}) {
  const principalText = entry.principal.toText();
  const { data: tasks = [], isLoading } = useTasksByEmployee(principalText);
  const { data: completionDates = new Map<number, bigint>() } =
    useCompletionDates();
  const today = getTodayString();
  const todayTasks = tasks.filter((t) => t.dueDate === today);
  const employeeName = entry.profile.name || principalText;

  function handleExportAll() {
    downloadCSV(
      `assigned_tasks_${employeeName}.csv`,
      tasksToRows(tasks, employeeName),
      CSV_HEADERS,
    );
  }

  function handleExportCompleted() {
    const done = tasks.filter((t) => t.status === TaskStatus.done);
    downloadCSV(
      `completed_tasks_${employeeName}.csv`,
      completedTasksToRows(done, employeeName, completionDates),
      COMPLETED_CSV_HEADERS,
    );
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 size={24} className="animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-up">
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={onBack}
          className="text-sm text-muted-foreground hover:text-foreground underline"
        >
          &larr; Back to employees
        </button>
      </div>

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold">{employeeName}</h2>
          <p className="text-xs text-muted-foreground font-mono mt-0.5">
            {principalText}
          </p>
          {entry.profile.email && (
            <p className="text-sm text-muted-foreground">
              {entry.profile.email}
            </p>
          )}
        </div>
        <div className="flex gap-2 flex-wrap">
          <Button
            variant="outline"
            size="sm"
            onClick={handleExportAll}
            className="gap-1.5"
            data-ocid="employee_panel.export_all.button"
          >
            <Download size={14} />
            Export Assigned (CSV)
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleExportCompleted}
            className="gap-1.5"
            data-ocid="employee_panel.export_completed.button"
          >
            <Download size={14} />
            Export Completed (CSV)
          </Button>
        </div>
      </div>

      {/* Today's Tasks */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">
            Today's Tasks
            <Badge variant="secondary" className="ml-2">
              {todayTasks.length}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {todayTasks.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4 text-center">
              No tasks due today.
            </p>
          ) : (
            <TaskTable tasks={todayTasks} />
          )}
        </CardContent>
      </Card>

      {/* All Tasks */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">
            All Assigned Tasks
            <Badge variant="secondary" className="ml-2">
              {tasks.length}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {tasks.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4 text-center">
              No tasks assigned.
            </p>
          ) : (
            <TaskTable tasks={tasks} />
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function TaskTable({ tasks }: { tasks: Task[] }) {
  return (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Title</TableHead>
            <TableHead>Due Date</TableHead>
            <TableHead>Priority</TableHead>
            <TableHead>Status</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {tasks.map((task) => (
            <TableRow key={String(task.id)}>
              <TableCell className="font-medium">{task.title}</TableCell>
              <TableCell>{task.dueDate}</TableCell>
              <TableCell>
                <Badge
                  variant={
                    task.priority === Priority.high
                      ? "destructive"
                      : task.priority === Priority.medium
                        ? "secondary"
                        : "outline"
                  }
                >
                  {priorityLabel(task.priority)}
                </Badge>
              </TableCell>
              <TableCell>
                <Badge variant={statusVariant(task.status)}>
                  {statusLabel(task.status)}
                </Badge>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

export default function EmployeePanelPage() {
  const { data: isAdmin, isLoading: isAdminLoading } = useIsAdmin();
  const { data: profiles = [], isLoading: profilesLoading } =
    useAllUserProfiles();
  const [selected, setSelected] = useState<UserProfileEntry | null>(null);

  if (isAdminLoading || profilesLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 size={24} className="animate-spin text-primary" />
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="max-w-xl mx-auto py-12 text-center">
        <p className="text-muted-foreground">
          Only admins can access the Employee Panel.
        </p>
      </div>
    );
  }

  if (selected) {
    return (
      <EmployeeTaskView entry={selected} onBack={() => setSelected(null)} />
    );
  }

  return (
    <div className="max-w-2xl mx-auto animate-fade-up">
      <div className="mb-6">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Users size={22} className="text-primary" />
          Employee Panel
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Click an employee to view their tasks and download CSV reports.
        </p>
      </div>

      {profiles.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground">
              No employees have registered yet. Employees need to log in and
              save their profile.
            </p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-0">
            <div className="divide-y">
              {profiles.map((entry) => (
                <button
                  key={entry.principal.toText()}
                  type="button"
                  onClick={() => setSelected(entry)}
                  className="w-full flex items-center justify-between px-5 py-4 hover:bg-muted/50 transition-colors text-left"
                  data-ocid="employee_panel.employee.button"
                >
                  <div>
                    <p className="font-medium text-sm">
                      {entry.profile.name || "(No name)"}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {entry.profile.email || "No email"}
                    </p>
                  </div>
                  <span className="text-xs text-muted-foreground">
                    View tasks &rarr;
                  </span>
                </button>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
