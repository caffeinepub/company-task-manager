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
import { FrequencyType, Priority, TaskStatus } from "../backend.d";
import type { Task, TaskPauseState, UserProfileEntry } from "../backend.d";
import PaginationControls from "../components/PaginationControls";
import { usePagination } from "../hooks/usePagination";
import {
  useAllTasks,
  useAllUserProfiles,
  useCompletionDates,
  useIsAdmin,
  useTaskInstanceCompletions,
  useTaskInstanceTimingStatuses,
  useTaskPauseStates,
  useTasksByEmployee,
} from "../hooks/useQueries";
import type { TaskInstance } from "../utils/taskInstances";
import { expandAllTaskInstances } from "../utils/taskInstances";

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
      return "One-time";
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

function toDisplayDate(dateStr: string): string {
  const [y, m, d] = dateStr.split("-");
  return `${d}-${m}-${y}`;
}

function buildTrackingRows(
  profiles: UserProfileEntry[],
  allTasks: Task[],
  instanceCompletions: Map<string, bigint>,
  filterPrincipal?: string,
  pauseStateMap?: Map<string, TaskPauseState>,
  timingOverrides?: Map<string, string>,
): string[][] {
  const rows: string[][] = [];

  const targetProfiles = filterPrincipal
    ? profiles.filter((e) => e.principal.toText() === filterPrincipal)
    : profiles;

  for (const entry of targetProfiles) {
    const principalText = entry.principal.toText();
    const employeeName = entry.profile.name || principalText;
    const employeeTasks = allTasks.filter(
      (t) => t.assignee.toText() === principalText,
    );
    if (employeeTasks.length === 0) continue;

    const { pendingInstances, doneInstances } = expandAllTaskInstances(
      employeeTasks,
      instanceCompletions,
      undefined,
      pauseStateMap,
    );
    const allInsts = [...pendingInstances, ...doneInstances];

    for (const inst of allInsts) {
      const completionDate =
        inst.isDone && inst.completedAt
          ? toDisplayDate(
              new Date(Number(inst.completedAt / 1_000_000n))
                .toISOString()
                .slice(0, 10),
            )
          : "";
      rows.push([
        toDisplayDate(inst.targetDate),
        employeeName,
        inst.task.title,
        (() => {
          const instKey = `${inst.task.id}_${inst.targetDate}`;
          const override = timingOverrides?.get(instKey);
          if (override === "onTime") return "On Time";
          if (override === "delayed") return "Delayed";
          return inst.isDone ? "Completed" : "Pending";
        })(),
        completionDate,
        toDisplayDate(inst.targetDate),
      ]);
    }
  }

  rows.sort((a, b) => {
    const toSortable = (dd: string) => {
      const [d, m, y] = dd.split("-");
      return `${y}-${m}-${d}`;
    };
    const dateCmp = toSortable(a[0]).localeCompare(toSortable(b[0]));
    if (dateCmp !== 0) return dateCmp;
    return a[1].localeCompare(b[1]);
  });

  return rows;
}

const TRACKING_CSV_HEADERS = [
  "Date",
  "Assignee",
  "Task_Name",
  "Status",
  "Completion_Date",
  "Target_Date",
];

function tasksToRows(tasks: Task[], employeeName: string): string[][] {
  return tasks.map((t) => [
    String(t.id),
    t.title,
    t.description,
    employeeName,
    t.targetDate,
    priorityLabel(t.priority),
    statusLabel(t.status),
    new Date(Number(t.createdAt) / 1_000_000).toLocaleString(),
    frequencyLabel(t),
    t.department || "-",
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
      ts !== undefined
        ? new Date(Number(ts / 1_000_000n)).toLocaleString()
        : "";
    return [
      String(t.id),
      t.title,
      t.description,
      employeeName,
      t.targetDate,
      priorityLabel(t.priority),
      statusLabel(t.status),
      new Date(Number(t.createdAt) / 1_000_000).toLocaleString(),
      frequencyLabel(t),
      t.department || "-",
      completedDateStr,
    ];
  });
}

const CSV_HEADERS = [
  "Task ID",
  "Title",
  "Description",
  "Employee",
  "Target Date",
  "Priority",
  "Status",
  "Created At",
  "Frequency",
  "Department",
];

const COMPLETED_CSV_HEADERS = [...CSV_HEADERS, "Completed Date"];

const ALL_ASSIGNEES_CSV_HEADERS = [
  "Employee",
  "Task ID",
  "Title",
  "Description",
  "Target Date",
  "Priority",
  "Status",
  "Frequency",
  "Department",
  "Completed Date",
];

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
  const { data: instanceCompletions = new Map<string, bigint>() } =
    useTaskInstanceCompletions();
  const { data: allProfiles = [] } = useAllUserProfiles();
  const { data: pauseStates = new Map<string, TaskPauseState>() } =
    useTaskPauseStates();
  const { data: timingOverrides = new Map<string, string>() } =
    useTaskInstanceTimingStatuses();
  const today = getTodayString();
  const todayTasks = tasks.filter((t) => t.targetDate === today);
  const employeeName = entry.profile.name || principalText;

  const { pendingInstances, doneInstances } = expandAllTaskInstances(
    tasks,
    instanceCompletions,
    undefined,
    pauseStates,
  );
  const allInstances = [...pendingInstances, ...doneInstances];

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

  function handleExportTracking() {
    const rows = buildTrackingRows(
      allProfiles,
      tasks,
      instanceCompletions,
      principalText,
      pauseStates,
      timingOverrides,
    );
    downloadCSV(
      `task_tracking_${employeeName}.csv`,
      rows,
      TRACKING_CSV_HEADERS,
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
            variant="default"
            size="sm"
            onClick={handleExportTracking}
            className="gap-1.5"
            data-ocid="employee_panel.export_tracking.button"
          >
            <Download size={14} />
            Export Tracking Report (CSV)
          </Button>
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
            Today&apos;s Tasks
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
            <TaskTable tasks={todayTasks} completionDates={completionDates} />
          )}
        </CardContent>
      </Card>

      {/* All Tasks (instance-expanded) with pagination */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">
            All Task Instances
            <Badge variant="secondary" className="ml-2">
              {allInstances.length}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {allInstances.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4 text-center px-5">
              No tasks assigned.
            </p>
          ) : (
            <InstanceTable instances={allInstances} />
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function TaskTable({
  tasks,
  completionDates,
}: { tasks: Task[]; completionDates: Map<number, bigint> }) {
  return (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Title</TableHead>
            <TableHead>Target Date</TableHead>
            <TableHead>Priority</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Frequency</TableHead>
            <TableHead>Department</TableHead>
            <TableHead>Completed At</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {tasks.map((task) => {
            const ts = completionDates.get(Number(task.id));
            const completedAt =
              ts !== undefined
                ? new Date(Number(ts / 1_000_000n)).toLocaleString()
                : "-";
            return (
              <TableRow key={String(task.id)}>
                <TableCell className="font-medium">{task.title}</TableCell>
                <TableCell>{task.targetDate}</TableCell>
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
                <TableCell className="text-xs text-muted-foreground">
                  {frequencyLabel(task)}
                </TableCell>
                <TableCell className="text-xs text-muted-foreground">
                  {task.department || "-"}
                </TableCell>
                <TableCell className="text-xs text-muted-foreground">
                  {task.status === TaskStatus.done ? completedAt : "-"}
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}

function InstanceTable({ instances }: { instances: TaskInstance[] }) {
  const pagination = usePagination(instances, 20);

  return (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Title</TableHead>
            <TableHead>Target Date</TableHead>
            <TableHead>Priority</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Frequency</TableHead>
            <TableHead>Department</TableHead>
            <TableHead>Completed At</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {pagination.pageItems.map((inst) => {
            const completedAt =
              inst.completedAt !== undefined
                ? new Date(
                    Number(inst.completedAt / 1_000_000n),
                  ).toLocaleString()
                : "-";
            const [y, m, d] = inst.targetDate.split("-");
            return (
              <TableRow key={inst.instanceKey}>
                <TableCell className="font-medium">{inst.task.title}</TableCell>
                <TableCell>
                  {d}-{m}-{y}
                </TableCell>
                <TableCell>
                  <Badge
                    variant={
                      inst.task.priority === Priority.high
                        ? "destructive"
                        : inst.task.priority === Priority.medium
                          ? "secondary"
                          : "outline"
                    }
                  >
                    {priorityLabel(inst.task.priority)}
                  </Badge>
                </TableCell>
                <TableCell>
                  <Badge variant={inst.isDone ? "default" : "outline"}>
                    {inst.isDone ? "Done" : "Pending"}
                  </Badge>
                </TableCell>
                <TableCell className="text-xs text-muted-foreground">
                  {frequencyLabel(inst.task)}
                </TableCell>
                <TableCell className="text-xs text-muted-foreground">
                  {inst.task.department || "-"}
                </TableCell>
                <TableCell className="text-xs text-muted-foreground">
                  {completedAt}
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
      <PaginationControls {...pagination} label="instances" />
    </div>
  );
}

function ExportAllEmployeesCompletedButton({
  profiles,
}: {
  profiles: UserProfileEntry[];
}) {
  const { data: allTasks = [] } = useAllTasks();
  const { data: completionDates = new Map<number, bigint>() } =
    useCompletionDates();
  const { data: instanceCompletions = new Map<string, bigint>() } =
    useTaskInstanceCompletions();
  const { data: pauseStates = new Map<string, TaskPauseState>() } =
    useTaskPauseStates();
  const { data: timingOverrides = new Map<string, string>() } =
    useTaskInstanceTimingStatuses();

  function handleExportAllCompleted() {
    const nameMap = new Map<string, string>();
    for (const entry of profiles) {
      nameMap.set(
        entry.principal.toText(),
        entry.profile.name || entry.principal.toText(),
      );
    }

    const rows: string[][] = [];
    for (const entry of profiles) {
      const principalText = entry.principal.toText();
      const employeeName = nameMap.get(principalText) ?? principalText;
      const employeeTasks = allTasks.filter(
        (t) => t.assignee.toText() === principalText,
      );
      const employeeDoneTasks = employeeTasks.filter(
        (t) => t.status === TaskStatus.done,
      );
      if (employeeDoneTasks.length === 0) continue;
      rows.push([
        `--- ${employeeName} ---`,
        "",
        "",
        "",
        "",
        "",
        "",
        "",
        "",
        "",
        "",
      ]);
      for (const row of completedTasksToRows(
        employeeDoneTasks,
        employeeName,
        completionDates,
      )) {
        rows.push(row);
      }
    }

    if (rows.length === 0) return;

    downloadCSV(
      "all_employees_completed_tasks.csv",
      rows,
      COMPLETED_CSV_HEADERS,
    );
  }

  function handleExportAllAssignees() {
    const nameMap = new Map<string, string>();
    for (const entry of profiles) {
      nameMap.set(
        entry.principal.toText(),
        entry.profile.name || entry.principal.toText(),
      );
    }

    const rows: string[][] = [];

    for (const entry of profiles) {
      const principalText = entry.principal.toText();
      const employeeName = nameMap.get(principalText) ?? principalText;
      const employeeTasks = allTasks.filter(
        (t) => t.assignee.toText() === principalText,
      );
      if (employeeTasks.length === 0) continue;

      const { pendingInstances, doneInstances } = expandAllTaskInstances(
        employeeTasks,
        instanceCompletions,
        undefined,
        pauseStates,
      );
      const allInsts = [...pendingInstances, ...doneInstances];
      if (allInsts.length === 0) continue;

      rows.push([
        `--- ${employeeName} ---`,
        "",
        "",
        "",
        "",
        "",
        "",
        "",
        "",
        "",
      ]);

      for (const inst of allInsts) {
        const completedDateStr =
          inst.completedAt !== undefined
            ? new Date(Number(inst.completedAt / 1_000_000n)).toLocaleString()
            : "";
        rows.push([
          employeeName,
          String(inst.task.id),
          inst.task.title,
          inst.task.description,
          inst.targetDate,
          priorityLabel(inst.task.priority),
          inst.isDone ? "Done" : "Pending",
          frequencyLabel(inst.task),
          inst.task.department || "-",
          completedDateStr,
        ]);
      }
    }

    if (rows.length === 0) return;

    downloadCSV("all_assignees_all_tasks.csv", rows, ALL_ASSIGNEES_CSV_HEADERS);
  }

  function handleExportTrackingReport() {
    const rows = buildTrackingRows(
      profiles,
      allTasks,
      instanceCompletions,
      undefined,
      pauseStates,
      timingOverrides,
    );
    if (rows.length === 0) return;
    downloadCSV("task_tracking_report.csv", rows, TRACKING_CSV_HEADERS);
  }

  return (
    <div className="flex gap-2 flex-wrap">
      <Button
        variant="default"
        size="sm"
        onClick={handleExportTrackingReport}
        className="gap-1.5"
        data-ocid="employee_panel.export_tracking_report.button"
      >
        <Download size={14} />
        Export Tracking Report (CSV)
      </Button>
      <Button
        variant="outline"
        size="sm"
        onClick={handleExportAllCompleted}
        className="gap-1.5"
        data-ocid="employee_panel.export_all_completed.button"
      >
        <Download size={14} />
        Export All Completed (CSV)
      </Button>
      <Button
        variant="outline"
        size="sm"
        onClick={handleExportAllAssignees}
        className="gap-1.5"
        data-ocid="employee_panel.export_all_assignees.button"
      >
        <Download size={14} />
        Export All Assignees Pending &amp; Complete (CSV)
      </Button>
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
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Users size={22} className="text-primary" />
              Employee Panel
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Click an employee to view their tasks and download CSV reports.
            </p>
          </div>
          {profiles.length > 0 && (
            <ExportAllEmployeesCompletedButton profiles={profiles} />
          )}
        </div>
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
