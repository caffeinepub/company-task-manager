import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Link } from "@tanstack/react-router";
import { CheckSquare, Circle, Clock, TrendingUp } from "lucide-react";
import { motion } from "motion/react";
import { Priority, TaskStatus } from "../backend.d";
import type { Task } from "../backend.d";
import {
  useAllTasks,
  useDashboardStats,
  useIsAdmin,
  useMyTasks,
} from "../hooks/useQueries";

function StatusBadge({ status }: { status: TaskStatus }) {
  const map = {
    [TaskStatus.todo]: {
      label: "Todo",
      className: "bg-muted text-muted-foreground",
    },
    [TaskStatus.inProgress]: {
      label: "In Progress",
      className: "bg-blue-100 text-blue-700",
    },
    [TaskStatus.done]: {
      label: "Done",
      className: "bg-green-100 text-green-700",
    },
  };
  const { label, className } = map[status] ?? map[TaskStatus.todo];
  return (
    <Badge className={`${className} border-0 text-xs font-medium`}>
      {label}
    </Badge>
  );
}

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
  value: bigint | undefined;
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
              <p className="text-3xl font-bold">{value?.toString() ?? "0"}</p>
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

function TaskRow({ task, index }: { task: Task; index: number }) {
  return (
    <div
      className="flex items-center gap-4 py-3 border-b last:border-0"
      data-ocid={`dashboard.task.item.${index + 1}`}
    >
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate">{task.title}</p>
        <p className="text-xs text-muted-foreground mt-0.5">
          Target Date: {task.targetDate}
        </p>
      </div>
      <PriorityBadge priority={task.priority} />
      <StatusBadge status={task.status} />
    </div>
  );
}

export default function DashboardPage() {
  const { data: isAdmin, isLoading: adminLoading } = useIsAdmin();
  const { data: stats, isLoading: statsLoading } = useDashboardStats(!!isAdmin);
  const { data: myTasks, isLoading: myTasksLoading } = useMyTasks();
  const { data: allTasks, isLoading: allTasksLoading } = useAllTasks();

  const recentTasks: Task[] = isAdmin
    ? (allTasks ?? []).slice(0, 8)
    : (myTasks ?? []).slice(0, 8);

  const tasksLoading = isAdmin ? allTasksLoading : myTasksLoading;

  // stats order: [todo, inProgress, done]
  const [todoCount, inProgressCount, doneCount] = stats ?? [0n, 0n, 0n];

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

      {/* Stats */}
      <div
        className="grid grid-cols-1 sm:grid-cols-3 gap-4"
        data-ocid="dashboard.stats.section"
      >
        <StatCard
          title="To Do"
          value={todoCount}
          icon={<Circle size={18} className="text-gray-500" />}
          color="bg-gray-100"
          loading={statsLoading || adminLoading}
        />
        <StatCard
          title="In Progress"
          value={inProgressCount}
          icon={<Clock size={18} className="text-blue-500" />}
          color="bg-blue-100"
          loading={statsLoading || adminLoading}
        />
        <StatCard
          title="Done"
          value={doneCount}
          icon={<CheckSquare size={18} className="text-green-500" />}
          color="bg-green-100"
          loading={statsLoading || adminLoading}
        />
      </div>

      {/* Recent Tasks */}
      <Card className="shadow-card">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <TrendingUp size={16} className="text-primary" />
              Recent Tasks
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
          {tasksLoading ? (
            <div className="space-y-3" data-ocid="dashboard.loading_state">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : recentTasks.length === 0 ? (
            <div
              className="py-8 text-center text-sm text-muted-foreground"
              data-ocid="dashboard.empty_state"
            >
              No tasks yet.{" "}
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
              {recentTasks.map((task, i) => (
                <motion.div
                  key={task.id.toString()}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05 }}
                >
                  <TaskRow task={task} index={i} />
                </motion.div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
