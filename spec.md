# Company Task Manager

## Current State
- Dashboard shows 3 stat cards: Todo, In Progress, Done
- My Tasks hides pending frequency tasks on days they're not scheduled
- Daily tasks always show today's date regardless of overdue status
- Pending tasks can disappear from view if not scheduled for today

## Requested Changes (Diff)

### Add
- Overdue indicator on pending frequency tasks showing original missed date
- Pending tasks always appear in Active Today regardless of scheduled day

### Modify
- Dashboard: Replace 3 stats (Todo, In Progress, Done) with 2 stats (Pending = todo+inProgress, Completed = done)
- Dashboard: Recent Tasks section shows only pending tasks (todo + inProgress)
- My Tasks: All pending (todo/inProgress) frequency tasks are always shown in Active Today section, never hidden in Not Scheduled Today
- My Tasks: Pending daily tasks that were not completed show today as target date (they carry forward)
- My Tasks / Dashboard: getEffectiveTargetDate returns today for daily pending tasks so they always appear due

### Remove
- Nothing removed from backend

## Implementation Plan
1. Update DashboardPage: Replace 3 stat cards with 2 (Pending, Completed)
2. Update DashboardPage: Filter recentTasks to show only pending tasks
3. Update MyTasksPage: isTaskActiveToday returns true for any pending (todo/inProgress) frequency task
4. Update MyTasksPage: getEffectiveTargetDate for daily tasks - show today always (carry forward); add overdue badge if task was created before today
5. Update DashboardPage stats computation to use todo+inProgress as Pending count
