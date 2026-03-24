import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { CheckSquare, Loader2, Search, Users } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { FrequencyType, Priority } from "../backend.d";
import type { Task } from "../backend.d";
import PaginationControls from "../components/PaginationControls";
import { usePagination } from "../hooks/usePagination";
import {
  useAllTasks,
  useAllUserProfiles,
  useIsAdmin,
  useMarkTaskInstanceDoneAdmin,
  useTaskInstanceCompletions,
  useTaskPauseStates,
} from "../hooks/useQueries";
import { expandAllTaskInstances } from "../utils/taskInstances";

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

export default function EmployeeTasksPage() {
  const { data: isAdmin, isLoading: isAdminLoading } = useIsAdmin();
  const { data: allTasks = [], isLoading: tasksLoading } = useAllTasks();
  const { data: profileEntries = [], isLoading: profilesLoading } =
    useAllUserProfiles();
  const {
    data: instanceCompletions = new Map(),
    isLoading: completionsLoading,
  } = useTaskInstanceCompletions();
  const { data: pauseStates = new Map(), isLoading: pauseLoading } =
    useTaskPauseStates();
  const markDone = useMarkTaskInstanceDoneAdmin();

  const [assigneeSearch, setAssigneeSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setDebouncedSearch(assigneeSearch);
    }, 300);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [assigneeSearch]);

  const profileMap = new Map<string, string>();
  for (const entry of profileEntries) {
    profileMap.set(entry.principal.toString(), entry.profile.name);
  }

  const isDataLoading =
    tasksLoading || profilesLoading || completionsLoading || pauseLoading;

  const { pendingInstances } = expandAllTaskInstances(
    allTasks,
    instanceCompletions,
    undefined,
    pauseStates,
  );

  const filteredInstances = useMemo(() => {
    if (!debouncedSearch.trim()) return pendingInstances;
    const pMap = new Map<string, string>();
    for (const entry of profileEntries) {
      pMap.set(entry.principal.toString(), entry.profile.name);
    }
    return pendingInstances.filter((inst) => {
      const name = pMap.get(inst.task.assignee.toString()) ?? "";
      return name.toLowerCase().includes(debouncedSearch.trim().toLowerCase());
    });
  }, [pendingInstances, debouncedSearch, profileEntries]);

  const pagination = usePagination(filteredInstances, 20);

  const handleMarkDone = (
    taskId: bigint,
    targetDate: string,
    title: string,
  ) => {
    markDone.mutate(
      { taskId, targetDate },
      {
        onSuccess: () => toast.success(`"${title}" marked as done`),
        onError: () => toast.error("Failed to mark task done"),
      },
    );
  };

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
        <Card>
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
          <Users size={22} className="text-primary" />
          Employee Tasks
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          All pending employee tasks
        </p>
      </div>

      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-3 items-center justify-between">
            <div className="relative w-full sm:max-w-xs">
              <Search
                size={14}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
              />
              <Input
                className="pl-8 h-9"
                placeholder="Search by assignee name..."
                value={assigneeSearch}
                onChange={(e) => setAssigneeSearch(e.target.value)}
                data-ocid="employee_tasks.search_input"
              />
            </div>
            <p className="text-sm text-muted-foreground whitespace-nowrap">
              <span className="font-semibold text-foreground">
                {filteredInstances.length}
              </span>
              {debouncedSearch.trim() && <> of {pendingInstances.length}</>}{" "}
              pending task{filteredInstances.length !== 1 ? "s" : ""}
            </p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0">
          {isDataLoading ? (
            <div
              className="p-6 space-y-3"
              data-ocid="employee_tasks.loading_state"
            >
              {[1, 2, 3, 4, 5].map((i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : filteredInstances.length === 0 ? (
            <div
              className="py-16 text-center"
              data-ocid="employee_tasks.empty_state"
            >
              <CheckSquare
                size={40}
                className="mx-auto mb-3 text-muted-foreground opacity-40"
              />
              <p className="text-sm text-muted-foreground">
                {debouncedSearch.trim()
                  ? `No pending tasks found for "${debouncedSearch}".`
                  : "No pending employee tasks."}
              </p>
            </div>
          ) : (
            <>
              <Table data-ocid="employee_tasks.table">
                <TableHeader>
                  <TableRow>
                    <TableHead>Task Name</TableHead>
                    <TableHead>Assignee</TableHead>
                    <TableHead>Target Date</TableHead>
                    <TableHead>Priority</TableHead>
                    <TableHead className="hidden md:table-cell">
                      Frequency
                    </TableHead>
                    <TableHead className="hidden lg:table-cell">
                      Department
                    </TableHead>
                    <TableHead className="w-28">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pagination.pageItems.map((inst, i) => {
                    const assigneeName =
                      profileMap.get(inst.task.assignee.toString()) ?? null;
                    const [y, m, d] = inst.targetDate.split("-");
                    const displayDate = `${d}-${m}-${y}`;
                    const globalIndex = pagination.startIndex + i;
                    return (
                      <TableRow
                        key={inst.instanceKey}
                        data-ocid={`employee_tasks.row.${globalIndex + 1}`}
                      >
                        <TableCell>
                          <div>
                            <p className="font-medium text-sm">
                              {inst.task.title}
                            </p>
                            {inst.task.description && (
                              <p className="text-xs text-muted-foreground line-clamp-1">
                                {inst.task.description}
                              </p>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          {assigneeName ? (
                            <span className="text-xs font-medium text-foreground">
                              {assigneeName}
                            </span>
                          ) : (
                            <span className="text-xs font-mono text-muted-foreground">
                              {inst.task.assignee.toString().slice(0, 12)}
                              &hellip;
                            </span>
                          )}
                        </TableCell>
                        <TableCell className="text-sm">{displayDate}</TableCell>
                        <TableCell>
                          <PriorityBadge priority={inst.task.priority} />
                        </TableCell>
                        <TableCell className="hidden md:table-cell text-xs text-muted-foreground">
                          {frequencyLabel(inst.task)}
                        </TableCell>
                        <TableCell className="hidden lg:table-cell text-xs text-muted-foreground">
                          {inst.task.department || "-"}
                        </TableCell>
                        <TableCell>
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-7 text-xs gap-1 text-green-700 border-green-200 hover:bg-green-50"
                            disabled={markDone.isPending}
                            onClick={() =>
                              handleMarkDone(
                                inst.task.id,
                                inst.targetDate,
                                inst.task.title,
                              )
                            }
                            data-ocid={`employee_tasks.primary_button.${globalIndex + 1}`}
                          >
                            <CheckSquare size={12} />
                            Mark Done
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
              <PaginationControls {...pagination} label="tasks" />
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
