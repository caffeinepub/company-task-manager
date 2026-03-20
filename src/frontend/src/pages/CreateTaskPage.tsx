import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
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
import { Loader2, PlusCircle } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { FrequencyType, Priority } from "../backend.d";
import { useCreateTask, useIsAdmin } from "../hooks/useQueries";

const WEEKDAYS = [
  { label: "Monday", value: "Mon", jsDay: 1 },
  { label: "Tuesday", value: "Tue", jsDay: 2 },
  { label: "Wednesday", value: "Wed", jsDay: 3 },
  { label: "Thursday", value: "Thu", jsDay: 4 },
  { label: "Friday", value: "Fri", jsDay: 5 },
  { label: "Saturday", value: "Sat", jsDay: 6 },
  { label: "Sunday", value: "Sun", jsDay: 0 },
];

function todayStr(): string {
  const d = new Date();
  return d.toISOString().slice(0, 10);
}

function dateForWeekday(jsDay: number): string {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayDay = today.getDay();
  const diff = jsDay - todayDay;
  const target = new Date(today);
  target.setDate(today.getDate() + diff);
  return target.toISOString().slice(0, 10);
}

function dateForMonthDay(d: number): string {
  const now = new Date();
  const target = new Date(now.getFullYear(), now.getMonth(), d);
  return target.toISOString().slice(0, 10);
}

export default function CreateTaskPage() {
  const { data: isAdmin, isLoading: isAdminLoading } = useIsAdmin();
  const createTask = useCreateTask();

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [department, setDepartment] = useState("");
  const [assignee, setAssignee] = useState("");
  const [targetDate, setTargetDate] = useState("");
  const [priority, setPriority] = useState<Priority>(Priority.medium);
  const [frequency, setFrequency] = useState<FrequencyType>(FrequencyType.none);
  const [selectedWeekdays, setSelectedWeekdays] = useState<string[]>([]);
  const [monthDay, setMonthDay] = useState("1");
  const [error, setError] = useState("");

  function handleFrequencyChange(v: FrequencyType) {
    setFrequency(v);
    setSelectedWeekdays([]);

    if (v === FrequencyType.daily) {
      setTargetDate(todayStr());
    } else if (v === FrequencyType.monthly) {
      setTargetDate(dateForMonthDay(Number(monthDay)));
    } else {
      setTargetDate("");
    }
  }

  function toggleWeekday(dayValue: string) {
    setSelectedWeekdays((prev) => {
      const next = prev.includes(dayValue)
        ? prev.filter((d) => d !== dayValue)
        : [...prev, dayValue];

      if (next.length > 0) {
        const sorted = [...next].sort((a, b) => {
          const da = WEEKDAYS.find((w) => w.value === a)!.jsDay;
          const db = WEEKDAYS.find((w) => w.value === b)!.jsDay;
          return da - db;
        });
        const firstDay = WEEKDAYS.find((w) => w.value === sorted[0])!;
        setTargetDate(dateForWeekday(firstDay.jsDay));
      } else {
        setTargetDate("");
      }

      return next;
    });
  }

  function handleMonthDayChange(v: string) {
    setMonthDay(v);
    if (frequency === FrequencyType.monthly) {
      setTargetDate(dateForMonthDay(Number(v)));
    }
  }

  function buildFrequencyDays(): string {
    if (frequency === FrequencyType.weekly) {
      return selectedWeekdays.join(",");
    }
    if (frequency === FrequencyType.monthly) {
      return monthDay;
    }
    return "";
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (!title.trim() || !assignee.trim() || !targetDate) {
      setError("Please fill in all required fields.");
      return;
    }

    if (frequency === FrequencyType.weekly && selectedWeekdays.length === 0) {
      setError("Please select at least one day for weekly frequency.");
      return;
    }

    createTask.mutate(
      {
        title: title.trim(),
        description: description.trim(),
        assignee: assignee.trim(),
        targetDate,
        priority,
        frequency,
        frequencyDays: buildFrequencyDays(),
        department: department.trim(),
      },
      {
        onSuccess: () => {
          toast.success("Task created successfully!");
          setTitle("");
          setDescription("");
          setDepartment("");
          setAssignee("");
          setTargetDate("");
          setPriority(Priority.medium);
          setFrequency(FrequencyType.none);
          setSelectedWeekdays([]);
          setMonthDay("1");
        },
        onError: (err) => {
          setError(
            err instanceof Error ? err.message : "Failed to create task.",
          );
          toast.error("Failed to create task");
        },
      },
    );
  }

  if (isAdminLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 size={24} className="animate-spin text-primary" />
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="max-w-xl mx-auto">
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
    <div className="max-w-xl mx-auto animate-fade-up">
      <div className="mb-6">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <PlusCircle size={22} className="text-primary" />
          Create Task
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Assign a new task to a team member
        </p>
      </div>

      <Card className="shadow-card">
        <CardHeader className="pb-4">
          <CardTitle className="text-base">Task Details</CardTitle>
          <CardDescription>
            Fill in all required fields to create the task.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="title">
                Title <span className="text-destructive">*</span>
              </Label>
              <Input
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Prepare Q3 financial report"
                data-ocid="create_task.title.input"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Describe the task in detail..."
                rows={3}
                data-ocid="create_task.description.textarea"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="department">Department</Label>
              <Input
                id="department"
                value={department}
                onChange={(e) => setDepartment(e.target.value)}
                placeholder="e.g. Finance, HR, Engineering"
                data-ocid="create_task.department.input"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="assignee">
                Assignee Principal <span className="text-destructive">*</span>
              </Label>
              <Input
                id="assignee"
                value={assignee}
                onChange={(e) => setAssignee(e.target.value)}
                placeholder="aaaaa-bbbbb-ccccc-ddddd-eee"
                className="font-mono text-xs"
                data-ocid="create_task.assignee.input"
              />
              <p className="text-xs text-muted-foreground">
                Enter the Internet Identity principal of the assignee.
              </p>
            </div>

            {/* Frequency */}
            <div className="space-y-1.5">
              <Label>Task Frequency</Label>
              <Select
                value={frequency}
                onValueChange={(v) => handleFrequencyChange(v as FrequencyType)}
              >
                <SelectTrigger data-ocid="create_task.frequency.select">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={FrequencyType.none}>
                    No Repeat (One-time)
                  </SelectItem>
                  <SelectItem value={FrequencyType.daily}>Daily</SelectItem>
                  <SelectItem value={FrequencyType.weekly}>Weekly</SelectItem>
                  <SelectItem value={FrequencyType.monthly}>Monthly</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Choose how often this task should appear for the assignee.
              </p>
            </div>

            {/* Weekly day picker */}
            {frequency === FrequencyType.weekly && (
              <div className="space-y-2">
                <Label>
                  Select Days <span className="text-destructive">*</span>
                </Label>
                <p className="text-xs text-muted-foreground">
                  Target date will auto-update to the selected day in the
                  current week.
                </p>
                <div className="grid grid-cols-2 gap-2">
                  {WEEKDAYS.map((day) => (
                    <div
                      key={day.value}
                      className="flex items-center gap-2 cursor-pointer"
                    >
                      <Checkbox
                        id={`weekday-${day.value}`}
                        checked={selectedWeekdays.includes(day.value)}
                        onCheckedChange={() => toggleWeekday(day.value)}
                      />
                      <Label
                        htmlFor={`weekday-${day.value}`}
                        className="text-sm font-normal cursor-pointer"
                      >
                        {day.label}
                      </Label>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Monthly day picker */}
            {frequency === FrequencyType.monthly && (
              <div className="space-y-1.5">
                <Label htmlFor="monthDay">
                  Day of Month <span className="text-destructive">*</span>
                </Label>
                <Select value={monthDay} onValueChange={handleMonthDayChange}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Array.from({ length: 31 }, (_, i) => String(i + 1)).map(
                      (d) => (
                        <SelectItem key={d} value={d}>
                          {d}
                        </SelectItem>
                      ),
                    )}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  Task will appear on this day every month.
                </p>
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="targetDate">
                  Target Date <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="targetDate"
                  type="date"
                  value={targetDate}
                  onChange={(e) => setTargetDate(e.target.value)}
                  data-ocid="create_task.target_date.input"
                />
                {frequency === FrequencyType.daily && (
                  <p className="text-xs text-muted-foreground">
                    Auto-set to today.
                  </p>
                )}
                {frequency === FrequencyType.weekly &&
                  selectedWeekdays.length > 0 && (
                    <p className="text-xs text-muted-foreground">
                      Auto-set to selected day this week.
                    </p>
                  )}
              </div>

              <div className="space-y-1.5">
                <Label>Priority</Label>
                <Select
                  value={priority}
                  onValueChange={(v) => setPriority(v as Priority)}
                >
                  <SelectTrigger data-ocid="create_task.priority.select">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={Priority.low}>Low</SelectItem>
                    <SelectItem value={Priority.medium}>Medium</SelectItem>
                    <SelectItem value={Priority.high}>High</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {error && (
              <p
                className="text-sm text-destructive"
                data-ocid="create_task.error_state"
              >
                {error}
              </p>
            )}

            <Button
              type="submit"
              className="w-full"
              disabled={createTask.isPending}
              data-ocid="create_task.submit_button"
            >
              {createTask.isPending ? (
                <>
                  <Loader2 size={14} className="mr-2 animate-spin" />{" "}
                  Creating...
                </>
              ) : (
                <>
                  <PlusCircle size={14} className="mr-2" /> Create Task
                </>
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
