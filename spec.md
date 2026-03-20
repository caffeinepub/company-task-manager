# Company Task Manager

## Current State
- Task frequency (daily/weekly/monthly) is stored in backend
- Daily tasks set targetDate to today at creation, but never update it
- My Tasks splits into Active Today / Not Scheduled Today
- Employee Panel has CSV exports for assigned/completed tasks
- Create Task has title, description, assignee, frequency, target date, priority
- No department field on tasks
- CSV exports don't include frequency column

## Requested Changes (Diff)

### Add
- Department field to Task type in backend
- Department input in Create Task page
- Frequency column in all CSV downloads (beside Completed column)
- Dynamic effective target date: daily tasks always show today's date, weekly shows next scheduled weekday, monthly shows next scheduled day of month
- Daily task repeat behavior: if a daily task was completed before today, it shows as active/todo again today (frontend computed using completion timestamps)

### Modify
- Backend Task type: add `department: Text` field (with migration from V2)
- createTask backend function: add department parameter
- MyTasksPage: use effective target date and effective status for display
- DashboardPage: show effective target date for repeating tasks
- EmployeePanelPage: add Frequency and Department columns to tables and CSV headers/rows
- CreateTaskPage: add Department input field

### Remove
- Nothing removed

## Implementation Plan
1. Generate new Motoko backend with department field and V3 migration
2. Update CreateTaskPage to add department input and pass to createTask
3. Update MyTasksPage to use effective target date and effective status (reset daily if completed before today)
4. Update DashboardPage AssigneeTaskList to show effective target date
5. Update EmployeePanelPage tables and CSV exports with Frequency and Department columns
6. Update useQueries createTask mutation to include department
