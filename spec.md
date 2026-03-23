# Company Task Manager - Phase 2 Updates

## Current State
- Pause functionality exists but uses localStorage (not persistent across sessions/devices) and is limited to 5-day period
- No "Employee Tasks" section
- Tracking report does not exclude paused periods
- Pause UI shows "Paused until [date]" badge

## Requested Changes (Diff)

### Add
- Backend stable map `taskPauseState` mapping taskId -> {pausedAt: Text, unpausedAt: ?Text}
- Backend `pauseTask(taskId)` and `unpauseTask(taskId)` functions (admin only)
- Backend `getTaskPauseStates()` query function
- New frontend page: "Employee Tasks" (admin-only)
  - Shows ALL pending task instances across all employees
  - Assignee search bar with debounce (300ms)
  - Admin can mark any instance as Done
  - Role-based: hidden from sidebar and inaccessible for non-admins
- Route `/employee-tasks` and sidebar nav item (admin-only)

### Modify
- `usePausedTasks.ts`: Replace localStorage with backend-stored pause state
  - `pauseTask`: records pausedAt=today, unpausedAt=null
  - `unpauseTask`: records unpausedAt=today (task resumes from unpause date)
  - Pause is indefinite until manually unpaused
- `AllTasksPage.tsx`: Update pause button tooltip/label to "Paused indefinitely until resumed"
- `taskInstances.ts`: In `expandAllTaskInstances`, skip instances whose targetDate falls within a pause period (pausedAt <= targetDate < unpausedAt, or pausedAt <= targetDate if no unpausedAt)
- `EmployeePanelPage.tsx` (tracking CSV export): exclude paused periods from tracking rows
- Sidebar: Add "Employee Tasks" nav item (admin-only)

### Remove
- localStorage-based pause storage (replace with backend)

## Implementation Plan
1. Update `main.mo`: add taskPauseState map, pauseTask/unpauseTask/getTaskPauseStates functions
2. Regenerate `backend.d.ts` via Motoko codegen
3. Rewrite `usePausedTasks.ts` to use backend API
4. Update `taskInstances.ts` to accept pauseState map and exclude paused periods
5. Create `EmployeeTasksPage.tsx`: admin-only pending tasks across all employees, assignee search, mark done
6. Update `App.tsx` route tree and `AppLayout.tsx` sidebar nav
7. Update `AllTasksPage.tsx` pause button UX
8. Update tracking CSV logic to exclude paused instance dates
