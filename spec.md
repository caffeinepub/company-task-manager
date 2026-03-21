# Company Task Manager

## Current State
The app has a full task management system with daily rollover logic, instance-based completion tracking, and CSV exports. The Employee Panel exports tasks in a detailed format (Task ID, Title, Description, Employee, Target Date, Priority, Status, Created At, Frequency, Department, Completed Date).

The `expandAllTaskInstances` utility generates per-day instances for daily tasks, tracking each by `taskId_YYYY-MM-DD` key. Instance completions are stored via `markTaskInstanceDone` / `unmarkTaskInstanceDone`.

## Requested Changes (Diff)

### Add
- A dedicated "Export by Date & Assignee (CSV)" button in the Employee Panel (both global and per-employee views) that outputs tasks in this exact format:
  `Date,Assignee,Task_Name,Status,Completion_Date,Target_Date`
  - Date = target date of the instance (DD-MM-YYYY format)
  - Assignee = employee name
  - Task_Name = task title
  - Status = "Pending" or "Completed" (never todo/inProgress/done)
  - Completion_Date = date completed in DD-MM-YYYY format (blank if pending)
  - Target_Date = same as Date column (DD-MM-YYYY)
  - Rows sorted by Date then Assignee
  - Includes ALL task instances (daily rollover instances + non-daily tasks)
  - For non-daily tasks: status is "Completed" if task.status === done, else "Pending"
  - For daily tasks: status is "Completed" if instanceCompletions has the key, else "Pending"

### Modify
- The existing "Export All Assignees Pending & Complete (CSV)" button should remain but also add the new simplified export above it labeled "Export Tracking Report (CSV)"
- In the per-employee EmployeeTaskView, add a similar "Export Tracking Report (CSV)" button alongside the existing buttons

### Remove
Nothing removed.

## Implementation Plan
1. In `EmployeePanelPage.tsx`:
   - Add a helper `toDisplayDate(dateStr: string)` that converts YYYY-MM-DD to DD-MM-YYYY
   - Add `buildTrackingReportRows()` function that iterates all employees, expands task instances, and produces rows in the required format sorted by date + assignee
   - Add "Export Tracking Report (CSV)" button in `ExportAllEmployeesCompletedButton` component
   - Add per-employee "Export Tracking Report (CSV)" button in `EmployeeTaskView`
   - Status mapping: isDone → "Completed", else → "Pending"
   - Completion_Date: if isDone, format completedAt timestamp as DD-MM-YYYY, else blank
