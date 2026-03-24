# Company Task Manager

## Current State
The app loads all tasks at once from the backend and renders them without pagination. With 200 employees and 5000+ tasks (including daily rollover instances), this causes slow page loads, sluggish rendering, and potential CSV export timeouts.

## Requested Changes (Diff)

### Add
- Frontend pagination (20 rows per page) to AllTasksPage, EmployeePanelPage instance tables, and EmployeeTasksPage
- Default date range filter in AllTasksPage (last 30 days by default, clearable)
- Pagination to Dashboard AssigneeTaskList (show 8 employees per page with next/prev)
- Pagination to PerformancePage detail table
- Page size selector (20 / 50 / 100) on All Tasks and Employee Panel instance tables

### Modify
- AllTasksPage: default start date = 30 days ago, allow clearing
- DashboardPage AssigneeTaskList: paginate employee cards (8 per page)
- EmployeePanelPage InstanceTable: paginate with 20 rows per page
- PerformancePage detail table: paginate with 20 rows per page

### Remove
- Nothing removed

## Implementation Plan
1. Create reusable `usePagination` hook for offset-based pagination logic
2. Update AllTasksPage: set default start date to 30 days ago; add pagination controls below the table
3. Update DashboardPage AssigneeTaskList: paginate employee entries with prev/next buttons
4. Update EmployeePanelPage InstanceTable: add pagination controls
5. Update PerformancePage: paginate the detail table rows
6. Update EmployeeTasksPage: add pagination to the tasks list
