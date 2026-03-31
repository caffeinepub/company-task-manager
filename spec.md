# Company Task Manager

## Current State
The app supports Admin/User/Guest roles. Admin-gated pages: All Tasks, Create Task, Employee Panel, Employee Tasks, Performance. There is no "Employees Tasks Done" panel, no Super User role, no per-instance remarks or timing-status fields.

## Requested Changes (Diff)

### Add
- Super User role (tracked in a new `superUserPrincipals` stable map in main.mo)
- `isCallerSuperUser()` backend query
- `assignSuperUserRole(user, assign)` — admin only
- `taskInstanceRemarks` and `taskInstanceTimingStatus` stable maps (keyed by `taskId_targetDate`)
- `setTaskInstanceRemarks(instanceKey, remarks)` — admin only
- `setTaskInstanceTimingStatus(instanceKey, status)` — admin only (values: "onTime" | "delayed" | "")
- `updateTaskDetails(taskId, title, description, targetDate)` — admin only
- `getTaskInstanceRemarks()` and `getTaskInstanceTimingStatuses()` — admin + superUser
- New page: `EmployeeTasksDonePage` at `/employees-tasks-done`
- New hooks: `useIsSuperUser`, `useTaskInstanceRemarks`, `useTaskInstanceTimingStatuses`, `useSetTaskInstanceRemarks`, `useSetTaskInstanceTimingStatus`, `useUpdateTaskDetails`

### Modify
- `getAllTasks`, `getTasksByEmployee`, `getAllUserProfiles`, `getTaskPauseStates`, `getCompletionDates` — allow superUser access in addition to admin
- `createTask` — allow superUser access
- AppLayout nav: role-based visibility with 3 tiers (User, Super User, Admin)
- App.tsx: add `/employees-tasks-done` route
- AdminPanelPage: add Super User role assignment UI

### Remove
Nothing

## Implementation Plan
1. Modify `main.mo`: add superUser infrastructure, new maps, new query/mutation functions, update existing function access checks
2. Update `backend.d.ts` with new signatures
3. Update `useQueries.ts` with new hooks
4. Create `EmployeeTasksDonePage.tsx`
5. Update `AppLayout.tsx` for 3-tier nav visibility
6. Update `App.tsx` for new route
7. Update `AdminPanelPage.tsx` for Super User assignment
