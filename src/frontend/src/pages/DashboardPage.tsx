import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Link } from "@tanstack/react-router";
import {
  AlertCircle,
  Building2,
  CheckSquare,
  Layers,
  PauseCircle,
  TrendingUp,
  Users,
} from "lucide-react";
import { motion } from "motion/react";
import { Priority } from "../backend.d";
import type { Task } from "../backend.d";
import { usePausedTasks } from "../hooks/usePausedTasks";
import {
  useAllTasks,
  useAllUserProfiles,
  useIsAdmin,
  useMyTasks,
  useTaskInstanceCompletions,
} from "../hooks/useQueries";
import type { TaskInstance } from "../utils/taskInstances";
import { expandAllTaskInstances } from "../utils/taskInstances";

function PriorityBadge({ priority }: { priority: Priority }) {
  const map = {
    [Priority.high]: { label: "High", className: "bg-red-100 text-red-700" },
    [Priority.medium]: {
      label: "Medium",
      className: "bg-amber-100 text-amber-700",
    },
    [Priority.low]: { label: "Low", className: "bg-green-100 text-green-700" },
  };
  const { label, className } = map[priority] ?? map[Priority.low];
  return (
    <Badge className={`${className} border-0 text-xs font-medium`}>
      {label}
    </Badge>
  );
}

function StatCard({
  title,
  value,
  icon,
  color,
  loading,
}: {
  title: string;
  value: number;
  icon: React.ReactNode;
  color: string;
  loading: boolean;
}) {
  return (
    <Card className="shadow-card">
      <CardContent className="p-5">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-sm text-muted-foreground mb-1">{title}</p>
            {loading ? (
              <Skeleton className="h-8 w-16" />
            ) : (
              <p className="text-3xl font-bold">{value}</p>
            )}
          </div>
          <div
            className={`w-10 h-10 rounded-lg flex items-center justify-center ${color}`}
          >
            {icon}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function TotalTasksSection({
  pendingCount,
  pausedCount,
  doneCount,
  loading,
}: {
  pendingCount: number;
  pausedCount: number;
  doneCount: number;
  loading: boolean;
}) {
  const total = pendingCount + pausedCount + doneCount;
  const items = [
    {
      label: "Active",
      value: pendingCount,
      color: "text-amber-600",
      bg: "bg-amber-50",
    },
    {
      label: "Paused",
      value: pausedCount,
      color: "text-purple-600",
      bg: "bg-purple-50",
    },
    {
      label: "Completed",
      value: doneCount,
      color: "text-green-600",
      bg: "bg-green-50",
    },
    {
      label: "Total",
      value: total,
      color: "text-primary",
      bg: "bg-primary/5",
    },
  ];

  return (
    <Card className="shadow-card">
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Layers size={16} className="text-primary" />
          Total Tasks
        </CardTitle>
        <p className="text-xs text-muted-foreground">
          Company-wide task summary
        </p>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {items.map((item) => (
            <div
              key={item.label}
              className={`rounded-lg p-3 ${item.bg} text-center`}
            >
              <p className="text-xs text-muted-foreground mb-1">{item.label}</p>
              {loading ? (
                <Skeleton className="h-7 w-10 mx-auto" />
              ) : (
                <p className={`text-2xl font-bold ${item.color}`}>
                  {item.value}
                </p>
              )}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

function DepartmentSection({
  pendingInstances,
  doneInstances,
  loading,
}: {
  pendingInstances: TaskInstance[];
  doneInstances: TaskInstance[];
  loading: boolean;
}) {
  // Group by department
  const deptMap = new Map<string, { pending: number; completed: number }>();

  const getDept = (inst: TaskInstance) =>
    inst.task.department?.trim() || "No Department";

  for (const inst of pendingInstances) {
    const dept = getDept(inst);
    const entry = deptMap.get(dept) ?? { pending: 0, completed: 0 };
    entry.pending += 1;
    deptMap.set(dept, entry);
  }
  for (const inst of doneInstances) {
    const dept = getDept(inst);
    const entry = deptMap.get(dept) ?? { pending: 0, completed: 0 };
    entry.completed += 1;
    deptMap.set(dept, entry);
  }

  const rows = Array.from(deptMap.entries())
    .map(([dept, counts]) => ({
      dept,
      pending: counts.pending,
      completed: counts.completed,
      total: counts.pending + counts.completed,
    }))
    .sort((a, b) => b.total - a.total);

  return (
    <Card className="shadow-card">
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Building2 size={16} className="text-primary" />
          Department Overview
        </CardTitle>
        <p className="text-xs text-muted-foreground">
          Task distribution across departments
        </p>
      </CardHeader>
      <CardContent className="p-0">
        {loading ? (
          <div
            className="p-4 space-y-2"
            data-ocid="dashboard.dept.loading_state"
          >
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-10 w-full" />
            ))}
          </div>
        ) : rows.length === 0 ? (
          <div
            className="py-8 text-center text-sm text-muted-foreground"
            data-ocid="dashboard.dept.empty_state"
          >
            No department data available.
          </div>
        ) : (
          <Table data-ocid="dashboard.dept.table">
            <TableHeader>
              <TableRow>
                <TableHead>Department</TableHead>
                <TableHead className="text-right">Pending</TableHead>
                <TableHead className="text-right">Completed</TableHead>
                <TableHead className="text-right">Total</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((row, idx) => (
                <TableRow
                  key={row.dept}
                  data-ocid={`dashboard.dept.row.${idx + 1}`}
                >
                  <TableCell className="font-medium text-sm">
                    {row.dept}
                  </TableCell>
                  <TableCell className="text-right">
                    <Badge className="bg-amber-100 text-amber-700 border-0 text-xs">
                      {row.pending}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <Badge className="bg-green-100 text-green-700 border-0 text-xs">
                      {row.completed}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right text-sm font-medium">
                    {row.total}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}

function InstanceRow({
  instance,
  index,
}: { instance: TaskInstance; index: number }) {
  const [y, m, d] = instance.targetDate.split("-");
  const formattedDate = `${d}-${m}-${y}`;
  return (
    <div
      className="flex items-center gap-4 py-3 border-b last:border-0"
      data-ocid={`dashboard.task.item.${index + 1}`}
    >
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate">{instance.task.title}</p>
        <p className="text-xs text-muted-foreground mt-0.5">
          Target: {formattedDate}
        </p>
      </div>
      <PriorityBadge priority={instance.task.priority} />
    </div>
  );
}

function AssigneeTaskList({
  pendingInstances,
  loading,
}: {
  pendingInstances: TaskInstance[];
  loading: boolean;
}) {
  const { data: userProfiles, isLoading: profilesLoading } =
    useAllUserProfiles();

  const profileMap = new Map<string, string>();
  for (const entry of userProfiles ?? []) {
    profileMap.set(entry.principal.toString(), entry.profile.name);
  }

  const grouped = new Map<string, TaskInstance[]>();
  for (const inst of pendingInstances) {
    const key = inst.task.assignee.toString();
    if (!grouped.has(key)) grouped.set(key, []);
    grouped.get(key)!.push(inst);
  }

  const entries = Array.from(grouped.entries()).sort((a, b) => {
    const nameA = profileMap.get(a[0]) ?? a[0];
    const nameB = profileMap.get(b[0]) ?? b[0];
    return nameA.localeCompare(nameB);
  });

  const isLoading = loading || profilesLoading;

  return (
    <Card className="shadow-card">
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center gap-2">
          <Users size={16} className="text-primary" />
          Assignee Task List
        </CardTitle>
        <p className="text-xs text-muted-foreground">
          Pending task instances grouped by assignee
        </p>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-16 w-full" />
            ))}
          </div>
        ) : entries.length === 0 ? (
          <div className="py-8 text-center text-sm text-muted-foreground">
            No pending tasks for any assignee.
          </div>
        ) : (
          <div className="space-y-4">
            {entries.map(([principal, insts], idx) => {
              const name = profileMap.get(principal) ?? "Unknown Employee";
              return (
                <motion.div
                  key={principal}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.05 }}
                  className="rounded-lg border bg-muted/30 p-3"
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-sm font-semibold text-primary">
                        {name.charAt(0).toUpperCase()}
                      </div>
                      <span className="font-medium text-sm">{name}</span>
                    </div>
                    <Badge className="bg-amber-100 text-amber-700 border-0 text-xs">
                      {insts.length} Pending
                    </Badge>
                  </div>
                  <div className="space-y-1 pl-10">
                    {insts.slice(0, 4).map((inst) => {
                      const [y, m, d] = inst.targetDate.split("-");
                      return (
                        <div
                          key={inst.instanceKey}
                          className="flex items-center justify-between text-xs"
                        >
                          <span className="truncate text-foreground/80 flex-1 mr-2">
                            {inst.task.title}
                          </span>
                          <span className="text-muted-foreground shrink-0">
                            {d}-{m}-{y}
                          </span>
                        </div>
                      );
                    })}
                    {insts.length > 4 && (
                      <p className="text-xs text-muted-foreground">
                        +{insts.length - 4} more
                      </p>
                    )}
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default function DashboardPage() {
  const { data: isAdmin, isLoading: adminLoading } = useIsAdmin();
  const { data: myTasks, isLoading: myTasksLoading } = useMyTasks();
  const { data: allTasks, isLoading: allTasksLoading } = useAllTasks();
  const {
    data: instanceCompletions = new Map<string, bigint>(),
    isLoading: completionsLoading,
  } = useTaskInstanceCompletions();
  const { pausedTaskIds } = usePausedTasks();

  const sourceTaskList: Task[] = isAdmin ? (allTasks ?? []) : (myTasks ?? []);
  const tasksLoading = isAdmin ? allTasksLoading : myTasksLoading;

  const { pendingInstances, doneInstances } = expandAllTaskInstances(
    sourceTaskList,
    instanceCompletions,
    pausedTaskIds,
  );

  // Count paused tasks that actually exist in allTasks
  const pausedCount = isAdmin
    ? (allTasks ?? []).filter((t) => pausedTaskIds.has(t.id.toString())).length
    : 0;

  const pendingCount = pendingInstances.length;
  const doneCount = doneInstances.length;
  const recentPending = pendingInstances.slice(0, 8);

  const statsLoading = tasksLoading || adminLoading || completionsLoading;

  return (
    <div className="max-w-5xl mx-auto space-y-6 animate-fade-up">
      <div>
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <p className="text-sm text-muted-foreground mt-1">
          {isAdmin
            ? "Overview of all company tasks"
            : "Your personal task overview"}
        </p>
      </div>

      {/* Total Tasks section - admin only */}
      {isAdmin && (
        <TotalTasksSection
          pendingCount={pendingCount}
          pausedCount={pausedCount}
          doneCount={doneCount}
          loading={statsLoading}
        />
      )}

      <div
        className="grid grid-cols-1 sm:grid-cols-2 gap-4"
        data-ocid="dashboard.stats.section"
      >
        <StatCard
          title="Pending Tasks"
          value={pendingCount}
          icon={<AlertCircle size={18} className="text-amber-500" />}
          color="bg-amber-100"
          loading={statsLoading}
        />
        <StatCard
          title="Completed Tasks"
          value={doneCount}
          icon={<CheckSquare size={18} className="text-green-500" />}
          color="bg-green-100"
          loading={statsLoading}
        />
        {isAdmin && pausedCount > 0 && (
          <StatCard
            title="Paused Tasks"
            value={pausedCount}
            icon={<PauseCircle size={18} className="text-purple-500" />}
            color="bg-purple-100"
            loading={statsLoading}
          />
        )}
      </div>

      {isAdmin && (
        <AssigneeTaskList
          pendingInstances={pendingInstances}
          loading={allTasksLoading || adminLoading || completionsLoading}
        />
      )}

      {/* Department section - admin only */}
      {isAdmin && (
        <DepartmentSection
          pendingInstances={pendingInstances}
          doneInstances={doneInstances}
          loading={statsLoading}
        />
      )}

      <Card className="shadow-card">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <TrendingUp size={16} className="text-primary" />
              Pending Tasks
            </CardTitle>
            <Link
              to={isAdmin ? "/all-tasks" : "/my-tasks"}
              className="text-xs text-primary hover:underline"
              data-ocid="dashboard.view_all.link"
            >
              View all
            </Link>
          </div>
        </CardHeader>
        <CardContent>
          {statsLoading ? (
            <div className="space-y-3" data-ocid="dashboard.loading_state">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : recentPending.length === 0 ? (
            <div
              className="py-8 text-center text-sm text-muted-foreground"
              data-ocid="dashboard.empty_state"
            >
              No pending tasks.{" "}
              {isAdmin && (
                <Link
                  to="/create-task"
                  className="text-primary hover:underline"
                >
                  Create one
                </Link>
              )}
            </div>
          ) : (
            <div>
              {recentPending.map((inst, i) => (
                <motion.div
                  key={inst.instanceKey}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05 }}
                >
                  <InstanceRow instance={inst} index={i} />
                </motion.div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
