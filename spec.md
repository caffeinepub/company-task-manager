# Company Task Manager

## Current State
- React + Motoko task management app with role-based access (Admin, Employee, Guest)
- All Tasks page: filter by task name and date range, delete tasks
- Dashboard: Pending/Completed stat cards, Assignee Task List, recent pending task list
- Performance Dashboard: per-employee OnTime/Delayed/Pending analytics with date range filter
- Tasks have: title, description, assignee, targetDate, priority, status, frequency, frequencyDays, department
- Daily tasks use rollover logic (expandAllTaskInstances) to generate one instance per day
- taskInstanceCompletions map tracks which daily instances are done

## Requested Changes (Diff)

### Add
- **Pause functionality** (frontend/localStorage): Pause button on each row in All Tasks. When paused, task is hidden from Dashboard pending list and My Tasks active list from tomorrow for 5 days. Paused state stored in localStorage as `{taskId: string, pausedUntil: string (YYYY-MM-DD, +5 days from pause date)}`. Paused tasks still appear in Performance Dashboard and Tracking Report (not filtered out there).
- **usePausedTasks hook**: manages localStorage read/write for paused tasks; exposes `pauseTask(taskId)`, `unpauseTask(taskId)`, `isPaused(taskId)`, `pausedUntil(taskId)` helpers.
- **Assignee search** in All Tasks: add a second search input "Search by Assignee" next to existing task-name search. Requires fetching userProfiles to map principal -> name, then filtering tasks whose assignee name matches the query. Real-time with 300ms debounce.
- **Total Tasks section** in Dashboard (admin only): stat cards showing Active (pending not paused), Paused, Completed total counts, and Total (sum of all).
- **Department section** in Dashboard (admin only): card showing per-department breakdown - how many tasks are pending vs completed per department. Departments come from unique department values in allTasks.
- **Department section** in Performance Dashboard (admin only): card showing per-department performance aggregated across all employees - OnTime/Delayed/Pending counts per department.

### Modify
- **AllTasksPage**: add Pause/Resume button column, add assignee name search input with debounce, show Paused badge in Status column if task is paused.
- **DashboardPage**: add Total Tasks section above existing stat cards, add Department section below Assignee Task List. Filter paused tasks out of pending instances for the main list and pending count.
- **PerformancePage**: add Department Performance section at the bottom when no employee is selected (or always visible for admin).
- **expandAllTaskInstances** (or consumer): accept optional set of paused task IDs and filter them from pendingInstances.

### Remove
- Nothing removed.

## Implementation Plan
1. Create `src/frontend/src/hooks/usePausedTasks.ts` - localStorage hook for pause state
2. Update `src/frontend/src/utils/taskInstances.ts` - accept pausedTaskIds param, filter paused tasks from pending
3. Update `AllTasksPage.tsx` - add Pause/Resume button, assignee name filter with debounce, Paused status badge
4. Update `DashboardPage.tsx` - add Total Tasks stat section, add Department breakdown section, pass paused IDs to instance expansion
5. Update `PerformancePage.tsx` - add Department Performance section
