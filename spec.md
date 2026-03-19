# Company Task Manager

## Current State
- Role-based access: Admin, Employee (User), Guest
- Dashboard, My Tasks, All Tasks (admin), Create Task (admin), Profile, Admin Panel
- Tasks have: id, title, description, assignee (Principal), dueDate, priority, status, createdAt
- UserProfile stores name and email per Principal
- No way to view tasks grouped by individual employee
- No CSV export functionality

## Requested Changes (Diff)

### Add
- **Employee Panel** (admin-only page): shows list of all registered employees with their names
- Clicking an employee name shows:
  - Their tasks **due today** (filtered by dueDate == today)
  - **All tasks** assigned to them
- **Export CSV: Assigned Tasks** button -- downloads all tasks currently assigned to that employee as a CSV file
- **Export CSV: Completed Tasks** button -- downloads all tasks with status=done for that employee as a CSV file
- Backend: `getAllUserProfiles()` query -- returns all (Principal, UserProfile) pairs (admin only)
- Backend: `getTasksByEmployee(employee: Principal)` query -- returns all tasks for a given employee (admin only)

### Modify
- Navigation sidebar: add "Employee Panel" link (admin-only)
- App.tsx: add route for `/employee-panel`

### Remove
- Nothing removed

## Implementation Plan
1. Add `getAllUserProfiles` and `getTasksByEmployee` to Motoko backend
2. Regenerate backend bindings
3. Create `EmployeePanelPage.tsx` with employee list, task view, and CSV download buttons
4. Add route `/employee-panel` in App.tsx
5. Add nav item in AppLayout.tsx (admin-only)
