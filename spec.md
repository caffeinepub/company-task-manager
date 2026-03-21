# Company Task Manager

## Current State
The app has daily/weekly/monthly recurring tasks. Daily tasks show today's date as target date and reset to "todo" if completed on a prior day. However, missed daily tasks do NOT generate multiple instances - each daily task is a single record, so there's no way to show "Task A (target: yesterday)" AND "Task A (target: today)" as separate pending items. Backend tracks completions per taskId only (one completion timestamp per task).

Employee Panel has Export All Employees Completed CSV but no combined pending+complete CSV.

## Requested Changes (Diff)

### Add
- Backend: `taskInstanceCompletions` stable map keyed by `"taskId_YYYY-MM-DD"` storing completion timestamp (Int)
- Backend: `markTaskInstanceDone(taskId, targetDate)` - marks specific (task, date) instance as done
- Backend: `unmarkTaskInstanceDone(taskId, targetDate)` - un-marks a specific instance
- Backend: `getTaskInstanceCompletions()` - returns all completed instance keys and timestamps
- Frontend: Daily task rollover logic - generate one virtual instance per calendar day from task creation date to today for each daily task
- Frontend: Each instance shown separately with Task Name + Target Date + Status in My Tasks and Dashboard
- Frontend: Pending count = count of all undone daily instances + other pending tasks
- Frontend: Mark instance done marks that specific (taskId, targetDate) pair
- Frontend: New "Export All Assignees Pending & Complete (CSV)" button in Employee Panel

### Modify
- My Tasks page: daily tasks now render as multiple date-specific instances
- Dashboard: pending count and task list reflect daily task instances
- Employee Panel: assignee task view shows instances; new CSV export button

### Remove
- Nothing removed; backward compatible

## Implementation Plan
1. Update backend main.mo to add taskInstanceCompletions map and related query/update functions
2. Regenerate backend.d.ts bindings
3. Update frontend hooks (useQueries) to call new instance completion endpoints
4. Rewrite daily task expansion logic in MyTasksPage and DashboardPage
5. Add new combined CSV export to EmployeePanelPage
