import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  ClipboardCheck,
  Loader2,
  Pencil,
  Search,
  ShieldOff,
} from "lucide-react";
import { useCallback, useMemo, useState } from "react";
import { toast } from "sonner";
import PaginationControls from "../components/PaginationControls";
import { usePagination } from "../hooks/usePagination";
import {
  useAllTasks,
  useAllUserProfiles,
  useIsAdmin,
  useIsSuperUser,
  useSetTaskInstanceRemarks,
  useSetTaskInstanceTimingStatus,
  useTaskInstanceCompletions,
  useTaskInstanceRemarks,
  useTaskInstanceTimingStatuses,
  useTaskPauseStates,
  useUpdateTaskDetails,
} from "../hooks/useQueries";
import type { TaskInstance } from "../utils/taskInstances";
import { expandAllTaskInstances } from "../utils/taskInstances";

function formatDateDisplay(dateStr: string): string {
  if (!dateStr) return "—";
  const [y, m, d] = dateStr.split("-");
  return `${d}-${m}-${y}`;
}

function nanoToDateStr(nanoTs: bigint | undefined): string {
  if (!nanoTs) return "—";
  const ms = Number(nanoTs / 1_000_000n);
  const d = new Date(ms);
  const day = String(d.getDate()).padStart(2, "0");
  const mon = String(d.getMonth() + 1).padStart(2, "0");
  return `${day}-${mon}-${d.getFullYear()}`;
}

function nanoToYMD(nanoTs: bigint): string {
  const ms = Number(nanoTs / 1_000_000n);
  const d = new Date(ms);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

interface EditState {
  instance: TaskInstance;
  description: string;
  remarks: string;
  timingStatus: string;
}

export default function EmployeeTasksDonePage() {
  const { data: isAdmin, isLoading: adminLoading } = useIsAdmin();
  const { data: isSuperUser, isLoading: superUserLoading } = useIsSuperUser();
  const { data: allTasks = [], isLoading: tasksLoading } = useAllTasks();
  const { data: profiles = [], isLoading: profilesLoading } =
    useAllUserProfiles();
  const {
    data: instanceCompletions = new Map(),
    isLoading: completionsLoading,
  } = useTaskInstanceCompletions();
  const { data: pauseStates = new Map(), isLoading: pauseLoading } =
    useTaskPauseStates();
  const { data: remarksMap = new Map(), isLoading: remarksLoading } =
    useTaskInstanceRemarks();
  const { data: timingMap = new Map(), isLoading: timingLoading } =
    useTaskInstanceTimingStatuses();

  const updateTaskDetails = useUpdateTaskDetails();
  const setRemarks = useSetTaskInstanceRemarks();
  const setTimingStatus = useSetTaskInstanceTimingStatus();

  const [editState, setEditState] = useState<EditState | null>(null);
  const [employeeFilter, setEmployeeFilter] = useState("");
  const [deptFilter, setDeptFilter] = useState("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  const isLoading =
    adminLoading ||
    superUserLoading ||
    tasksLoading ||
    profilesLoading ||
    completionsLoading ||
    pauseLoading ||
    remarksLoading ||
    timingLoading;

  const profileMap = useMemo(() => {
    const m = new Map<string, string>();
    for (const entry of profiles) {
      m.set(entry.principal.toString(), entry.profile.name || "Unknown");
    }
    return m;
  }, [profiles]);

  const departments = useMemo(() => {
    const depts = new Set<string>();
    for (const t of allTasks) {
      if (t.department) depts.add(t.department);
    }
    return Array.from(depts).sort();
  }, [allTasks]);

  const { doneInstances } = useMemo(() => {
    return expandAllTaskInstances(
      allTasks,
      instanceCompletions,
      undefined,
      pauseStates,
    );
  }, [allTasks, instanceCompletions, pauseStates]);

  const filteredInstances = useMemo(() => {
    let result = [...doneInstances];

    // Sort descending by targetDate
    result.sort((a, b) => b.targetDate.localeCompare(a.targetDate));

    if (employeeFilter.trim()) {
      const q = employeeFilter.toLowerCase();
      result = result.filter((inst) => {
        const name = profileMap.get(inst.task.assignee.toString()) ?? "";
        return name.toLowerCase().includes(q);
      });
    }

    if (deptFilter !== "all") {
      result = result.filter((inst) => inst.task.department === deptFilter);
    }

    if (dateFrom) {
      result = result.filter((inst) => inst.targetDate >= dateFrom);
    }
    if (dateTo) {
      result = result.filter((inst) => inst.targetDate <= dateTo);
    }

    return result;
  }, [doneInstances, employeeFilter, deptFilter, dateFrom, dateTo, profileMap]);

  const pagination = usePagination(filteredInstances, 20);
  const {
    pageItems,
    startIndex,
    endIndex,
    totalPages,
    hasNext,
    hasPrev,
    goNext,
    goPrev,
    page,
  } = pagination;

  function resetPage() {
    pagination.reset();
  }

  const openEdit = useCallback(
    (inst: TaskInstance) => {
      setEditState({
        instance: inst,
        description: inst.task.description,
        remarks: remarksMap.get(inst.instanceKey) ?? "",
        timingStatus: timingMap.get(inst.instanceKey) || "notSet",
      });
    },
    [remarksMap, timingMap],
  );

  async function handleSaveEdit() {
    if (!editState) return;
    const { instance, description, remarks, timingStatus } = editState;
    try {
      await Promise.all([
        // Always pass the task's stored base targetDate — never the instance date.
        // Passing the instance date would overwrite task.targetDate and corrupt
        // daily rollover generation (all instances before that date disappear).
        updateTaskDetails.mutateAsync({
          taskId: instance.task.id,
          title: instance.task.title,
          description,
          targetDate: instance.task.targetDate,
        }),
        setRemarks.mutateAsync({
          instanceKey: instance.instanceKey,
          remarks,
        }),
        setTimingStatus.mutateAsync({
          instanceKey: instance.instanceKey,
          status: timingStatus === "notSet" ? "" : timingStatus,
        }),
      ]);
      toast.success("Task updated successfully");
      setEditState(null);
    } catch {
      toast.error("Failed to save changes");
    }
  }

  if (isLoading) {
    return (
      <div
        className="flex items-center justify-center py-24"
        data-ocid="tasks_done.loading_state"
      >
        <Loader2 size={28} className="animate-spin text-primary" />
      </div>
    );
  }

  if (!isAdmin && !isSuperUser) {
    return (
      <div
        className="flex flex-col items-center justify-center py-24 gap-4"
        data-ocid="tasks_done.error_state"
      >
        <ShieldOff size={40} className="text-muted-foreground" />
        <h2 className="text-xl font-semibold">Access Denied</h2>
        <p className="text-sm text-muted-foreground">
          You do not have permission to view this panel.
        </p>
      </div>
    );
  }

  const isSaving =
    updateTaskDetails.isPending ||
    setRemarks.isPending ||
    setTimingStatus.isPending;

  return (
    <div className="space-y-6 animate-fade-up">
      {/* Header */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <ClipboardCheck size={22} className="text-primary" />
            Employees Tasks Done
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            {filteredInstances.length} completed task
            {filteredInstances.length !== 1 ? "s" : ""}
            {isSuperUser && !isAdmin && (
              <span className="ml-2 text-amber-600 dark:text-amber-400">
                (View only)
              </span>
            )}
          </p>
        </div>
      </div>

      {/* Filters */}
      <Card className="shadow-card">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
            Filters
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="relative">
              <Search
                size={14}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
              />
              <Input
                placeholder="Search by employee..."
                value={employeeFilter}
                onChange={(e) => {
                  setEmployeeFilter(e.target.value);
                  resetPage();
                }}
                className="pl-8"
                data-ocid="tasks_done.search_input"
              />
            </div>
            <Select
              value={deptFilter}
              onValueChange={(v) => {
                setDeptFilter(v);
                resetPage();
              }}
            >
              <SelectTrigger data-ocid="tasks_done.dept.select">
                <SelectValue placeholder="All Departments" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Departments</SelectItem>
                {departments.map((d) => (
                  <SelectItem key={d} value={d}>
                    {d}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Input
              type="date"
              placeholder="From date"
              value={dateFrom}
              onChange={(e) => {
                setDateFrom(e.target.value);
                resetPage();
              }}
              data-ocid="tasks_done.date_from.input"
            />
            <Input
              type="date"
              placeholder="To date"
              value={dateTo}
              onChange={(e) => {
                setDateTo(e.target.value);
                resetPage();
              }}
              data-ocid="tasks_done.date_to.input"
            />
          </div>
          {(employeeFilter || deptFilter !== "all" || dateFrom || dateTo) && (
            <Button
              variant="ghost"
              size="sm"
              className="mt-3 text-xs"
              onClick={() => {
                setEmployeeFilter("");
                setDeptFilter("all");
                setDateFrom("");
                setDateTo("");
                resetPage();
              }}
              data-ocid="tasks_done.clear_filters.button"
            >
              Clear Filters
            </Button>
          )}
        </CardContent>
      </Card>

      {/* Table */}
      {filteredInstances.length === 0 ? (
        <div
          className="flex flex-col items-center justify-center py-16 text-center"
          data-ocid="tasks_done.empty_state"
        >
          <ClipboardCheck size={36} className="text-muted-foreground mb-3" />
          <p className="text-muted-foreground">No completed tasks found.</p>
          <p className="text-xs text-muted-foreground mt-1">
            Try adjusting the filters above.
          </p>
        </div>
      ) : (
        <div className="rounded-xl border shadow-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm" data-ocid="tasks_done.table">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="text-left px-4 py-3 font-semibold text-muted-foreground">
                    #
                  </th>
                  <th className="text-left px-4 py-3 font-semibold text-muted-foreground">
                    Task Title
                  </th>
                  <th className="text-left px-4 py-3 font-semibold text-muted-foreground">
                    Employee
                  </th>
                  <th className="text-left px-4 py-3 font-semibold text-muted-foreground">
                    Assigned Date
                  </th>
                  <th className="text-left px-4 py-3 font-semibold text-muted-foreground">
                    Target Date
                  </th>
                  <th className="text-left px-4 py-3 font-semibold text-muted-foreground">
                    Completion Date
                  </th>
                  <th className="text-left px-4 py-3 font-semibold text-muted-foreground">
                    Status
                  </th>
                  <th className="text-left px-4 py-3 font-semibold text-muted-foreground">
                    Timing
                  </th>
                  <th className="text-left px-4 py-3 font-semibold text-muted-foreground">
                    Remarks
                  </th>
                  {isAdmin && (
                    <th className="text-left px-4 py-3 font-semibold text-muted-foreground">
                      Actions
                    </th>
                  )}
                </tr>
              </thead>
              <tbody>
                {pageItems.map((inst, idx) => {
                  const rowNum = startIndex + idx + 1;
                  const assigneeName =
                    profileMap.get(inst.task.assignee.toString()) ?? "Unknown";
                  const assignedDateDisplay = formatDateDisplay(
                    nanoToYMD(inst.task.createdAt),
                  );
                  const targetDateDisplay = formatDateDisplay(inst.targetDate);
                  const completionDateDisplay = nanoToDateStr(inst.completedAt);
                  const timing = timingMap.get(inst.instanceKey) ?? "";
                  const remark = remarksMap.get(inst.instanceKey) ?? "";

                  return (
                    <tr
                      key={inst.instanceKey}
                      className="border-b last:border-0 hover:bg-muted/30 transition-colors"
                      data-ocid={`tasks_done.item.${rowNum}`}
                    >
                      <td className="px-4 py-3 text-muted-foreground text-xs">
                        {rowNum}
                      </td>
                      <td className="px-4 py-3">
                        <div className="font-medium">{inst.task.title}</div>
                        {inst.task.description && (
                          <div className="text-xs text-muted-foreground mt-0.5 line-clamp-1">
                            {inst.task.description}
                          </div>
                        )}
                        {inst.task.department && (
                          <span className="inline-block mt-1 text-xs px-1.5 py-0.5 rounded bg-muted text-muted-foreground">
                            {inst.task.department}
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 font-medium">{assigneeName}</td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {assignedDateDisplay}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {targetDateDisplay}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {completionDateDisplay}
                      </td>
                      <td className="px-4 py-3">
                        <Badge className="bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/30 text-xs">
                          Done
                        </Badge>
                      </td>
                      <td className="px-4 py-3">
                        {timing === "onTime" ? (
                          <Badge className="bg-blue-500/15 text-blue-700 dark:text-blue-400 border-blue-500/30 text-xs">
                            On Time
                          </Badge>
                        ) : timing === "delayed" ? (
                          <Badge className="bg-red-500/15 text-red-700 dark:text-red-400 border-red-500/30 text-xs">
                            Delayed
                          </Badge>
                        ) : (
                          <Badge
                            variant="outline"
                            className="text-xs text-muted-foreground"
                          >
                            Not Set
                          </Badge>
                        )}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground max-w-[160px]">
                        <span className="line-clamp-2 text-xs">
                          {remark || "—"}
                        </span>
                      </td>
                      {isAdmin && (
                        <td className="px-4 py-3">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => openEdit(inst)}
                            className="gap-1.5 text-xs"
                            data-ocid={`tasks_done.edit_button.${rowNum}`}
                          >
                            <Pencil size={13} />
                            Edit
                          </Button>
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <PaginationControls
            page={page}
            totalPages={totalPages}
            totalItems={filteredInstances.length}
            startIndex={startIndex}
            endIndex={endIndex}
            hasNext={hasNext}
            hasPrev={hasPrev}
            goNext={goNext}
            goPrev={goPrev}
            label="tasks"
          />
        </div>
      )}

      {/* Edit Dialog */}
      <Dialog
        open={!!editState}
        onOpenChange={(open) => {
          if (!open) setEditState(null);
        }}
      >
        <DialogContent className="max-w-lg" data-ocid="tasks_done.dialog">
          <DialogHeader>
            <DialogTitle>Edit Task</DialogTitle>
          </DialogHeader>
          {editState && (
            <div className="space-y-4 py-2">
              {/* Read-only instance date — for context only */}
              <div className="space-y-1.5">
                <Label>Instance Date</Label>
                <Input
                  value={formatDateDisplay(editState.instance.targetDate)}
                  disabled
                  className="bg-muted/50 cursor-not-allowed"
                />
              </div>
              <div className="space-y-1.5">
                <Label>Description</Label>
                <Textarea
                  value={editState.description}
                  onChange={(e) =>
                    setEditState((prev) =>
                      prev ? { ...prev, description: e.target.value } : prev,
                    )
                  }
                  rows={3}
                  data-ocid="tasks_done.description.textarea"
                />
              </div>
              <div className="space-y-1.5">
                <Label>Remarks</Label>
                <Textarea
                  value={editState.remarks}
                  onChange={(e) =>
                    setEditState((prev) =>
                      prev ? { ...prev, remarks: e.target.value } : prev,
                    )
                  }
                  rows={2}
                  placeholder="Add remarks..."
                  data-ocid="tasks_done.remarks.textarea"
                />
              </div>
              <div className="space-y-1.5">
                <Label>Timing Status</Label>
                <Select
                  value={editState.timingStatus}
                  onValueChange={(v) =>
                    setEditState((prev) =>
                      prev ? { ...prev, timingStatus: v } : prev,
                    )
                  }
                >
                  <SelectTrigger data-ocid="tasks_done.timing.select">
                    <SelectValue placeholder="Select timing status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="notSet">Not Set</SelectItem>
                    <SelectItem value="onTime">On Time</SelectItem>
                    <SelectItem value="delayed">Delayed</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setEditState(null)}
              data-ocid="tasks_done.cancel_button"
            >
              Cancel
            </Button>
            <Button
              onClick={handleSaveEdit}
              disabled={isSaving}
              data-ocid="tasks_done.save_button"
            >
              {isSaving ? (
                <>
                  <Loader2 size={14} className="mr-2 animate-spin" /> Saving...
                </>
              ) : (
                "Save Changes"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
