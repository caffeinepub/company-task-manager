import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  BarChart2,
  Clock,
  Loader2,
  Search,
  TrendingDown,
  TrendingUp,
  X,
} from "lucide-react";
import { useMemo, useState } from "react";
import { TaskStatus } from "../backend.d";
import type { Task, UserProfileEntry } from "../backend.d";
import {
  useAllUserProfiles,
  useCompletionDates,
  useIsAdmin,
  useTasksByEmployee,
} from "../hooks/useQueries";

function classifyTask(
  task: Task,
  completionDates: Map<number, bigint>,
): "onTime" | "delayed" | "pending" {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const due = new Date(task.targetDate);
  due.setHours(23, 59, 59, 999);

  if (task.status === TaskStatus.done) {
    const ts = completionDates.get(Number(task.id));
    if (ts !== undefined) {
      const completedDate = new Date(Number(ts / 1_000_000n));
      return completedDate <= due ? "onTime" : "delayed";
    }
    return "onTime";
  }

  const dueDay = new Date(task.targetDate);
  dueDay.setHours(0, 0, 0, 0);
  if (dueDay < today) return "delayed";
  return "pending";
}

interface EmployeeStats {
  total: number;
  onTime: number;
  delayed: number;
  pending: number;
}

function computeStats(
  tasks: Task[],
  completionDates: Map<number, bigint>,
): EmployeeStats {
  let onTime = 0;
  let delayed = 0;
  let pending = 0;
  for (const task of tasks) {
    const cat = classifyTask(task, completionDates);
    if (cat === "onTime") onTime++;
    else if (cat === "delayed") delayed++;
    else pending++;
  }
  return { total: tasks.length, onTime, delayed, pending };
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
        <span className="text-muted-foreground">
          {count} task{count !== 1 ? "s" : ""} — {percentage}%
        </span>
      </div>
      <div
        className="h-4 rounded-full overflow-hidden"
        style={{ background: "oklch(var(--muted))" }}
      >
        <div
          className="h-full rounded-full transition-all duration-700"
          style={{ width: `${percentage}%`, background: bgColor }}
        />
      </div>
    </div>
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
    data: completionDates = new Map<number, bigint>(),
    isLoading: loadingDates,
  } = useCompletionDates();

  const isLoading = loadingTasks || loadingDates;

  const filteredTasks = useMemo(() => {
    let result = tasks;
    if (fromDate) {
      const from = new Date(fromDate);
      from.setHours(0, 0, 0, 0);
      result = result.filter((t) => new Date(t.targetDate) >= from);
    }
    if (toDate) {
      const to = new Date(toDate);
      to.setHours(23, 59, 59, 999);
      result = result.filter((t) => new Date(t.targetDate) <= to);
    }
    return result;
  }, [tasks, fromDate, toDate]);

  const stats = useMemo(
    () => computeStats(filteredTasks, completionDates),
    [filteredTasks, completionDates],
  );

  const isFiltered = fromDate || toDate;

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

  if (filteredTasks.length === 0) {
    return (
      <div
        className="flex flex-col items-center justify-center py-12 text-center"
        data-ocid="performance.empty_state"
      >
        <BarChart2 className="h-10 w-10 text-muted-foreground mb-3" />
        <p className="text-muted-foreground">
          {isFiltered
            ? "No tasks found for the selected date range."
            : "No tasks assigned to this employee yet."}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {isFiltered && (
        <p className="text-xs text-muted-foreground">
          Showing {filteredTasks.length} of {tasks.length} task
          {tasks.length !== 1 ? "s" : ""} in selected date range
        </p>
      )}

      {/* Stat cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <Card data-ocid="performance.total.card">
          <CardContent className="pt-5 pb-4">
            <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">
              Total
            </p>
            <p className="text-3xl font-bold text-foreground">{stats.total}</p>
          </CardContent>
        </Card>
        <Card data-ocid="performance.ontime.card">
          <CardContent className="pt-5 pb-4">
            <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">
              On Time
            </p>
            <p
              className="text-3xl font-bold"
              style={{ color: "oklch(0.65 0.18 142)" }}
            >
              {stats.onTime}
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
              style={{ color: "oklch(0.62 0.21 27)" }}
            >
              {stats.delayed}
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
              style={{ color: "oklch(0.72 0.17 60)" }}
            >
              {stats.pending}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Bar chart */}
      <Card data-ocid="performance.chart.card">
        <CardHeader>
          <CardTitle className="text-base">Performance Breakdown</CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          <BarRow
            label="On Time"
            count={stats.onTime}
            total={stats.total}
            color="oklch(0.55 0.18 142)"
            bgColor="oklch(0.65 0.18 142)"
            icon={<TrendingUp size={15} />}
          />
          <BarRow
            label="Delayed"
            count={stats.delayed}
            total={stats.total}
            color="oklch(0.55 0.21 27)"
            bgColor="oklch(0.62 0.21 27)"
            icon={<TrendingDown size={15} />}
          />
          <BarRow
            label="Pending"
            count={stats.pending}
            total={stats.total}
            color="oklch(0.58 0.17 60)"
            bgColor="oklch(0.72 0.17 60)"
            icon={<Clock size={15} />}
          />
        </CardContent>
      </Card>
    </div>
  );
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
          Search by employee name and filter by date range to view performance
          metrics.
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

            {/* Dropdown */}
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
        <div
          className="flex flex-col items-center justify-center py-16 text-center"
          data-ocid="performance.empty_state"
        >
          <BarChart2 className="h-12 w-12 text-muted-foreground mb-3" />
          <p className="text-base font-medium text-foreground">
            No employee selected
          </p>
          <p className="text-sm text-muted-foreground mt-1">
            Search for an employee to view their performance
          </p>
        </div>
      )}
    </div>
  );
}
