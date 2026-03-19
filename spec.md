# Company Task Manager

## Current State
- Dashboard with task stat cards (Todo, In Progress, Done)
- Employee Panel (admin-only) showing per-employee tasks and CSV export (assigned + completed with date)
- Completion timestamps stored in `taskCompletedAt` map; exposed via `getCompletionDates`
- Employee Panel sidebar link is adminOnly=true; page also blocks non-admins

## Requested Changes (Diff)

### Add
- **Performance Dashboard page** (admin-only, `/performance`):
  - Search input to find an employee by name (filter from all profiles)
  - Once an employee is selected/typed, show a bar/donut chart with:
    - On-time tasks: completed on or before due date (status=done AND completedAt <= dueDate end-of-day)
    - Delayed tasks: completed after due date OR still not done and due date is past
    - Pending tasks: not done and due date is in the future
    - Display count + percentage labels
  - Navigation link in sidebar (adminOnly)

### Modify
- Confirm completed CSV already includes Completed Date column (already done in EmployeePanelPage)
- Sidebar nav: add Performance link (adminOnly)
- App.tsx: add performanceRoute

### Remove
- Nothing

## Implementation Plan
1. Create `src/frontend/src/pages/PerformancePage.tsx` with search + chart
2. Add route `/performance` in `App.tsx`
3. Add nav item `Performance` (adminOnly) in `AppLayout.tsx`
4. Use existing hooks: `useAllUserProfiles`, `useTasksByEmployee`, `useCompletionDates`
5. Performance logic: compare task dueDate vs completionDate (or today) to classify tasks
