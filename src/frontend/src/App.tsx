import { Toaster } from "@/components/ui/sonner";
import {
  Outlet,
  RouterProvider,
  createRootRoute,
  createRoute,
  createRouter,
} from "@tanstack/react-router";
import AppLayout from "./components/AppLayout";
import { useInternetIdentity } from "./hooks/useInternetIdentity";
import AdminPanelPage from "./pages/AdminPanelPage";
import AllTasksPage from "./pages/AllTasksPage";
import CreateTaskPage from "./pages/CreateTaskPage";
import DashboardPage from "./pages/DashboardPage";
import EmployeePanelPage from "./pages/EmployeePanelPage";
import EmployeeTasksPage from "./pages/EmployeeTasksPage";
import LoginPage from "./pages/LoginPage";
import MyTasksPage from "./pages/MyTasksPage";
import PerformancePage from "./pages/PerformancePage";
import ProfilePage from "./pages/ProfilePage";

function RootLayout() {
  const { identity, isInitializing } = useInternetIdentity();

  if (isInitializing) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          <p className="text-sm text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  if (!identity) {
    return (
      <>
        <LoginPage />
        <Toaster richColors position="top-right" />
      </>
    );
  }

  return (
    <AppLayout>
      <Outlet />
      <Toaster richColors position="top-right" />
    </AppLayout>
  );
}

const rootRoute = createRootRoute({
  component: RootLayout,
});

const indexRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/",
  component: DashboardPage,
});

const myTasksRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/my-tasks",
  component: MyTasksPage,
});

const allTasksRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/all-tasks",
  component: AllTasksPage,
});

const createTaskRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/create-task",
  component: CreateTaskPage,
});

const profileRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/profile",
  component: ProfilePage,
});

const adminPanelRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/admin-panel",
  component: AdminPanelPage,
});

const employeePanelRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/employee-panel",
  component: EmployeePanelPage,
});

const employeeTasksRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/employee-tasks",
  component: EmployeeTasksPage,
});

const performanceRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/performance",
  component: PerformancePage,
});

const routeTree = rootRoute.addChildren([
  indexRoute,
  myTasksRoute,
  allTasksRoute,
  createTaskRoute,
  profileRoute,
  adminPanelRoute,
  employeePanelRoute,
  employeeTasksRoute,
  performanceRoute,
]);

const router = createRouter({ routeTree });

declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router;
  }
}

export default function App() {
  return <RouterProvider router={router} />;
}
