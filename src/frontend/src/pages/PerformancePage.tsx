import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  BarChart2,
  Building2,
  CheckCircle2,
  Clock,
  Loader2,
  Search,
  TrendingDown,
  TrendingUp,
  X,
} from "lucide-react";
import { useMemo, useState } from "react";
import { FrequencyType } from "../backend.d";
import type { Task, TaskPauseState, UserProfileEntry } from "../backend.d";
import {
  useAllTasks,
  useAllUserProfiles,
  useIsAdmin,
  useTaskInstanceCompletions,
  useTaskPauseStates,
  useTasksByEmployee,
} from "../hooks/useQueries";
import { isInPausedPeriod, isOffDay } from "../utils/taskInstances";

// Format a Date as "YYYY-MM-DD"
function dateToStr(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function today0(): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

interface TaskInstance {
  taskId: bigint;
  taskName: string;
  department: string;
  instanceDate: string; // YYYY-MM-DD
  status: "onTime" | "delayed" | "pending";
}

function generateInstances(
  tasks: Task[],
  completions: Map<string, bigint>,
  fromDate: string,
  toDate: string,
  pauseStates?: Map<string, TaskPauseState>,
): TaskInstance[] {
  const instances: TaskInstance[] = [];

  const from = fromDate ? new Date(`${fromDate}T00:00:00`) : null;
  const to = toDate ? new Date(`${toDate}T23:59:59`) : null;

  for (const task of tasks) {
    const isDaily =
      task.frequency === FrequencyType.daily ||
      String(task.frequency) === "daily" ||
      (task.frequency as any)?.daily !== undefined;

    const baseDate = task.targetDate; // YYYY-MM-DD string
    const taskIdStr = task.id.toString();

    const datesToProcess: string[] = [];

    if (isDaily) {
      // Generate one instance per day from baseDate up to today
      const start = new Date(`${baseDate}T00:00:00`);
      const end = today0();
      const cur = new Date(start);
      while (cur <= end) {
        const ds = dateToStr(cur);
        // Skip office off days
        if (!isOffDay(ds)) {
          datesToProcess.push(ds);
        }
        cur.setDate(cur.getDate() + 1);
      }
    } else {
      // For non-daily tasks, only include if the target date is not an off day
      if (!isOffDay(baseDate)) {
        datesToProcess.push(baseDate);
      }
    }

    for (const dateStr of datesToProcess) {
      // Apply date range filter
      if (from || to) {
        const d = new Date(`${dateStr}T00:00:00`);
        if (from && d < from) continue;
        if (to && d > to) continue;
      }

      // Skip instances that fall within a paused period
      if (pauseStates && isInPausedPeriod(taskIdStr, dateStr, pauseStates)) {
        continue;
      }

      const key = `${task.id}_${dateStr}`;
      const completionTs = completions.get(key);

      let status: "onTime" | "delayed" | "pending";
      if (completionTs !== undefined) {
        const completedDate = new Date(Number(completionTs / 1_000_000n));
        completedDate.setHours(0, 0, 0, 0);
        const instanceDay = new Date(`${dateStr}T00:00:00`);
        status = completedDate <= instanceDay ? "onTime" : "delayed";
      } else {
        status = "pending";
      }

      instances.push({
        taskId: task.id,
        taskName: task.title,
        department: task.department?.trim() || "No Department",
        instanceDate: dateStr,
        status,
      });
    }
  }

  // Sort by date desc
  instances.sort((a, b) => b.instanceDate.localeCompare(a.instanceDate));
  return instances;
}

function pct(count: number, total: number) {
  if (total === 0) return 0;
  return Math.round((count / total) * 100);
}

interface BarRowProps {
  label: string;
  count: number;
  total: number;
  color: string;
  bgColor: string;
  icon: React.ReactNode;
}

function BarRow({ label, count, total, color, bgColor, icon }: BarRowProps) {
  const percentage = pct(count, total);
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between text-sm">
        <div className="flex items-center gap-2 font-medium" style={{ color }}>
          {icon}
          {label}
        </div>
        <span className="font-semibold" style={{ color }}>
          {count} ({percentage}%)
        </span>
      </div>
      <div className="h-5 rounded-full overflow-hidden bg-muted">
        <div
          className="h-full rounded-full transition-all duration-700"
          style={{ width: `${percentage}%`, background: bgColor }}
        />
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: "onTime" | "delayed" | "pending" }) {
  if (status === "onTime")
    return (
      <Badge className="bg-green-100 text-green-800 border-green-200 dark:bg-green-900/30 dark:text-green-300">
        <CheckCircle2 size={11} className="mr-1" /> On Time
      </Badge>
    );
  if (status === "delayed")
    return (
      <Badge className="bg-red-100 text-red-800 border-red-200 dark:bg-red-900/30 dark:text-red-300">
        <TrendingDown size={11} className="mr-1" /> Delayed
      </Badge>
    );
  return (
    <Badge className="bg-yellow-100 text-yellow-800 border-yellow-200 dark:bg-yellow-900/30 dark:text-yellow-300">
      <Clock size={11} className="mr-1" /> Pending
    </Badge>
  );
}

function DepartmentPerformance({ instances }: { instances: TaskInstance[] }) {
  const deptMap = new Map<
    string,
    { onTime: number; delayed: number; pending: number }
  >();

  for (const inst of instances) {
    const entry = deptMap.get(inst.department) ?? {
      onTime: 0,
      delayed: 0,
      pending: 0,
    };
    entry[inst.status] += 1;
    deptMap.set(inst.department, entry);
  }

  const rows = Array.from(deptMap.entries())
    .map(([dept, counts]) => ({
      dept,
      onTime: counts.onTime,
      delayed: counts.delayed,
      pending: counts.pending,
      total: counts.onTime + counts.delayed + counts.pending,
    }))
    .sort((a, b) => b.total - a.total);

  if (rows.length === 0) return null;

  return (
    <Card data-ocid="performance.dept.card">
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <Building2 size={16} className="text-primary" />
          Department Performance
        </CardTitle>
        <p className="text-xs text-muted-foreground">
          Performance breakdown by department
        </p>
      </CardHeader>
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <Table data-ocid="performance.dept.table">
            <TableHeader>
              <TableRow>
                <TableHead>Department</TableHead>
                <TableHead className="text-right">Total</TableHead>
                <TableHead className="text-right">On Time</TableHead>
                <TableHead className="text-right">Delayed</TableHead>
                <TableHead className="text-right">Pending</TableHead>
                <TableHead>On Time %</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((row, idx) => {
                const onTimePct = pct(row.onTime, row.total);
                return (
                  <TableRow
                    key={row.dept}
                    data-ocid={`performance.dept.row.${idx + 1}`}
                  >
                    <TableCell className="font-medium text-sm">
                      {row.dept}
                    </TableCell>
                    <TableCell className="text-right text-sm">
                      {row.total}
                    </TableCell>
                    <TableCell className="text-right">
                      <Badge className="bg-green-100 text-green-700 border-0 text-xs">
                        {row.onTime}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <Badge className="bg-red-100 text-red-700 border-0 text-xs">
                        {row.delayed}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <Badge className="bg-amber-100 text-amber-700 border-0 text-xs">
                        {row.pending}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <div className="flex-1 h-2 rounded-full bg-muted overflow-hidden min-w-[60px]">
                          <div
                            className="h-full rounded-full bg-green-500 transition-all duration-700"
                            style={{ width: `${onTimePct}%` }}
                          />
                        </div>
                        <span className="text-xs text-muted-foreground w-9 text-right">
                          {onTimePct}%
                        </span>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}

interface EmployeePerformanceProps {
  principalText: string;
  fromDate: string;
  toDate: string;
}

function EmployeePerformance({
  principalText,
  fromDate,
  toDate,
}: EmployeePerformanceProps) {
  const { data: tasks = [], isLoading: loadingTasks } =
    useTasksByEmployee(principalText);
  const {
    data: completions = new Map<string, bigint>(),
    isLoading: loadingCompletions,
  } = useTaskInstanceCompletions();
  const {
    data: pauseStates = new Map<string, TaskPauseState>(),
    isLoading: loadingPauseStates,
  } = useTaskPauseStates();

  const isLoading = loadingTasks || loadingCompletions || loadingPauseStates;

  const instances = useMemo(
    () => generateInstances(tasks, completions, fromDate, toDate, pauseStates),
    [tasks, completions, fromDate, toDate, pauseStates],
  );

  const stats = useMemo(() => {
    const onTime = instances.filter((i) => i.status === "onTime").length;
    const delayed = instances.filter((i) => i.status === "delayed").length;
    const pending = instances.filter((i) => i.status === "pending").length;
    return { total: instances.length, onTime, delayed, pending };
  }, [instances]);

  if (isLoading) {
    return (
      <div
        className="flex items-center justify-center py-12"
        data-ocid="performance.loading_state"
      >
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
        <span className="ml-2 text-sm text-muted-foreground">
          Loading performance data...
        </span>
      </div>
    );
  }

  if (instances.length === 0) {
    return (
      <div
        className="flex flex-col items-center justify-center py-12 text-center"
        data-ocid="performance.empty_state"
      >
        <BarChart2 className="h-10 w-10 text-muted-foreground mb-3" />
        <p className="text-muted-foreground">
          {fromDate || toDate
            ? "No task instances found for the selected date range."
            : "No tasks assigned to this employee yet."}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header summary */}
      <Card className="border-primary/30 bg-primary/5">
        <CardContent className="pt-5 pb-4">
          <p className="text-sm font-bold uppercase tracking-wider text-primary mb-1">
            PERFORMANCE SCORES
          </p>
          <p className="text-lg font-semibold text-foreground">
            Total: <span className="text-primary">{stats.total} Tasks</span>
            <span className="text-sm font-normal text-muted-foreground ml-2">
              (excluding off days & paused periods)
            </span>
          </p>
        </CardContent>
      </Card>

      {/* Stat cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <Card data-ocid="performance.total.card">
          <CardContent className="pt-5 pb-4">
            <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">
              Total
            </p>
            <p className="text-3xl font-bold text-foreground">{stats.total}</p>
            <p className="text-xs text-muted-foreground mt-1">100%</p>
          </CardContent>
        </Card>
        <Card data-ocid="performance.ontime.card">
          <CardContent className="pt-5 pb-4">
            <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">
              On Time
            </p>
            <p
              className="text-3xl font-bold"
              style={{ color: "oklch(0.55 0.18 142)" }}
            >
              {stats.onTime}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              {pct(stats.onTime, stats.total)}%
            </p>
          </CardContent>
        </Card>
        <Card data-ocid="performance.delayed.card">
          <CardContent className="pt-5 pb-4">
            <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">
              Delayed
            </p>
            <p
              className="text-3xl font-bold"
              style={{ color: "oklch(0.55 0.21 27)" }}
            >
              {stats.delayed}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              {pct(stats.delayed, stats.total)}%
            </p>
          </CardContent>
        </Card>
        <Card data-ocid="performance.pending.card">
          <CardContent className="pt-5 pb-4">
            <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">
              Pending
            </p>
            <p
              className="text-3xl font-bold"
              style={{ color: "oklch(0.62 0.17 60)" }}
            >
              {stats.pending}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              {pct(stats.pending, stats.total)}%
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Visual bar chart */}
      <Card data-ocid="performance.chart.card">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <BarChart2 size={16} className="text-primary" />
            Performance Breakdown
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          <BarRow
            label="On Time"
            count={stats.onTime}
            total={stats.total}
            color="oklch(0.45 0.18 142)"
            bgColor="oklch(0.65 0.18 142)"
            icon={<TrendingUp size={15} />}
          />
          <BarRow
            label="Delayed"
            count={stats.delayed}
            total={stats.total}
            color="oklch(0.48 0.21 27)"
            bgColor="oklch(0.62 0.21 27)"
            icon={<TrendingDown size={15} />}
          />
          <BarRow
            label="Pending"
            count={stats.pending}
            total={stats.total}
            color="oklch(0.50 0.17 60)"
            bgColor="oklch(0.72 0.17 60)"
            icon={<Clock size={15} />}
          />
          {/* Combined bar */}
          <div className="pt-2 border-t">
            <p className="text-xs text-muted-foreground mb-2">Combined View</p>
            <div className="h-6 rounded-full overflow-hidden flex">
              <div
                className="h-full transition-all duration-700"
                style={{
                  width: `${pct(stats.onTime, stats.total)}%`,
                  background: "oklch(0.65 0.18 142)",
                }}
                title={`On Time: ${stats.onTime}`}
              />
              <div
                className="h-full transition-all duration-700"
                style={{
                  width: `${pct(stats.delayed, stats.total)}%`,
                  background: "oklch(0.62 0.21 27)",
                }}
                title={`Delayed: ${stats.delayed}`}
              />
              <div
                className="h-full transition-all duration-700"
                style={{
                  width: `${pct(stats.pending, stats.total)}%`,
                  background: "oklch(0.72 0.17 60)",
                }}
                title={`Pending: ${stats.pending}`}
              />
            </div>
            <div className="flex gap-4 mt-2">
              <span className="flex items-center gap-1 text-xs">
                <span
                  className="inline-block w-3 h-3 rounded-full"
                  style={{ background: "oklch(0.65 0.18 142)" }}
                />
                On Time
              </span>
              <span className="flex items-center gap-1 text-xs">
                <span
                  className="inline-block w-3 h-3 rounded-full"
                  style={{ background: "oklch(0.62 0.21 27)" }}
                />
                Delayed
              </span>
              <span className="flex items-center gap-1 text-xs">
                <span
                  className="inline-block w-3 h-3 rounded-full"
                  style={{ background: "oklch(0.72 0.17 60)" }}
                />
                Pending
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Department Performance */}
      <DepartmentPerformance instances={instances} />

      {/* Detail table */}
      <Card data-ocid="performance.table">
        <CardHeader>
          <CardTitle className="text-base">Task Instance Details</CardTitle>
          <p className="text-xs text-muted-foreground">
            Off days (Sunday, 2nd &amp; 4th Saturday) and paused periods are
            excluded.
          </p>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/40">
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">
                    #
                  </th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">
                    Task Name
                  </th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">
                    Target Date
                  </th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">
                    Status
                  </th>
                </tr>
              </thead>
              <tbody>
                {instances.map((inst, idx) => (
                  <tr
                    key={`${inst.taskId}_${inst.instanceDate}`}
                    className="border-b last:border-0 hover:bg-muted/20 transition-colors"
                    data-ocid={`performance.row.item.${idx + 1}`}
                  >
                    <td className="px-4 py-3 text-muted-foreground">
                      {idx + 1}
                    </td>
                    <td className="px-4 py-3 font-medium">{inst.taskName}</td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {inst.instanceDate}
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge status={inst.status} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function AllCompanyDepartmentPerformance({
  fromDate,
  toDate,
}: { fromDate: string; toDate: string }) {
  const { data: allTasks = [], isLoading: loadingTasks } = useAllTasks();
  const {
    data: completions = new Map<string, bigint>(),
    isLoading: loadingCompletions,
  } = useTaskInstanceCompletions();
  const {
    data: pauseStates = new Map<string, TaskPauseState>(),
    isLoading: loadingPauseStates,
  } = useTaskPauseStates();

  const instances = useMemo(
    () =>
      generateInstances(allTasks, completions, fromDate, toDate, pauseStates),
    [allTasks, completions, fromDate, toDate, pauseStates],
  );

  if (loadingTasks || loadingCompletions || loadingPauseStates) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-5 w-5 animate-spin text-primary" />
        <span className="ml-2 text-sm text-muted-foreground">Loading...</span>
      </div>
    );
  }

  return <DepartmentPerformance instances={instances} />;
}

export default function PerformancePage() {
  const { data: isAdmin, isLoading: loadingAdmin } = useIsAdmin();
  const { data: profiles = [], isLoading: loadingProfiles } =
    useAllUserProfiles();
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<UserProfileEntry | null>(null);
  const [showDropdown, setShowDropdown] = useState(false);
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return [];
    return profiles.filter((p) => p.profile.name.toLowerCase().includes(q));
  }, [search, profiles]);

  const hasDateFilter = fromDate || toDate;

  const clearDates = () => {
    setFromDate("");
    setToDate("");
  };

  if (loadingAdmin) {
    return (
      <div
        className="flex items-center justify-center min-h-64"
        data-ocid="performance.loading_state"
      >
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div
        className="flex flex-col items-center justify-center min-h-64 gap-3"
        data-ocid="performance.error_state"
      >
        <BarChart2 className="h-12 w-12 text-muted-foreground" />
        <p className="text-lg font-semibold text-foreground">Access Denied</p>
        <p className="text-sm text-muted-foreground">
          Only admins can access the Performance Dashboard.
        </p>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
          <BarChart2 size={24} className="text-primary" />
          Performance Dashboard
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Scores across all task instances. Off days (Sunday, 2nd &amp; 4th
          Saturday) and paused task periods are automatically excluded.
        </p>
      </div>

      {/* Search + Date Range */}
      <Card>
        <CardContent className="pt-5 space-y-4">
          {/* Employee Search */}
          <div className="relative">
            <Search
              size={16}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
            />
            <Input
              data-ocid="performance.search_input"
              className="pl-9"
              placeholder="Type employee name to search..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setSelected(null);
                setShowDropdown(true);
              }}
              onFocus={() => setShowDropdown(true)}
            />

            {showDropdown && filtered.length > 0 && (
              <div
                className="absolute z-10 mt-1 w-full rounded-md border bg-card shadow-lg"
                data-ocid="performance.dropdown_menu"
              >
                {filtered.map((entry) => (
                  <button
                    key={entry.principal.toString()}
                    type="button"
                    className="w-full text-left px-4 py-2.5 text-sm hover:bg-muted transition-colors flex items-center justify-between"
                    onMouseDown={() => {
                      setSelected(entry);
                      setSearch(entry.profile.name);
                      setShowDropdown(false);
                    }}
                  >
                    <span className="font-medium">{entry.profile.name}</span>
                    <span className="text-xs text-muted-foreground">
                      {entry.profile.email}
                    </span>
                  </button>
                ))}
              </div>
            )}

            {showDropdown &&
              search.trim() &&
              filtered.length === 0 &&
              !loadingProfiles && (
                <div className="absolute z-10 mt-1 w-full rounded-md border bg-card shadow-lg px-4 py-3 text-sm text-muted-foreground">
                  No employees found matching &ldquo;{search}&rdquo;
                </div>
              )}
          </div>

          {selected && (
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">Viewing:</span>
              <Badge variant="secondary">{selected.profile.name}</Badge>
              <span className="text-xs text-muted-foreground">
                {selected.profile.email}
              </span>
            </div>
          )}

          {/* Date Range */}
          <div className="border-t pt-4">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-3">
              Filter by Target Date Range
            </p>
            <div className="flex flex-col sm:flex-row gap-3 items-end">
              <div className="flex-1 space-y-1">
                <Label htmlFor="perf-from" className="text-xs">
                  From Date
                </Label>
                <Input
                  id="perf-from"
                  type="date"
                  value={fromDate}
                  onChange={(e) => setFromDate(e.target.value)}
                  data-ocid="performance.from_date"
                />
              </div>
              <div className="flex-1 space-y-1">
                <Label htmlFor="perf-to" className="text-xs">
                  To Date
                </Label>
                <Input
                  id="perf-to"
                  type="date"
                  value={toDate}
                  onChange={(e) => setToDate(e.target.value)}
                  data-ocid="performance.to_date"
                />
              </div>
              {hasDateFilter && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={clearDates}
                  className="flex items-center gap-1 shrink-0"
                  data-ocid="performance.clear_dates"
                >
                  <X size={14} />
                  Clear
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Performance View */}
      {selected ? (
        <EmployeePerformance
          principalText={selected.principal.toString()}
          fromDate={fromDate}
          toDate={toDate}
        />
      ) : (
        <>
          <div
            className="flex flex-col items-center justify-center py-10 text-center"
            data-ocid="performance.empty_state"
          >
            <BarChart2 className="h-12 w-12 text-muted-foreground mb-3" />
            <p className="text-base font-medium text-foreground">
              No employee selected
            </p>
            <p className="text-sm text-muted-foreground mt-1">
              Search for an employee above to view their performance scores
            </p>
          </div>
          {/* All-company department stats */}
          <AllCompanyDepartmentPerformance
            fromDate={fromDate}
            toDate={toDate}
          />
        </>
      )}
    </div>
  );
}
