import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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
import { Priority } from "../backend.d";
import { useCreateTask, useIsAdmin } from "../hooks/useQueries";

export default function CreateTaskPage() {
  const { data: isAdmin } = useIsAdmin();
  const createTask = useCreateTask();

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [assignee, setAssignee] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [priority, setPriority] = useState<Priority>(Priority.medium);
  const [error, setError] = useState("");

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (!title.trim() || !assignee.trim() || !dueDate) {
      setError("Please fill in all required fields.");
      return;
    }

    createTask.mutate(
      {
        title: title.trim(),
        description: description.trim(),
        assignee: assignee.trim(),
        dueDate,
        priority,
      },
      {
        onSuccess: () => {
          toast.success("Task created successfully!");
          setTitle("");
          setDescription("");
          setAssignee("");
          setDueDate("");
          setPriority(Priority.medium);
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

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="dueDate">
                  Due Date <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="dueDate"
                  type="date"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  data-ocid="create_task.due_date.input"
                />
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
