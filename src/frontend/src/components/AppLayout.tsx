import { Button } from "@/components/ui/button";
import { Link, useLocation } from "@tanstack/react-router";
import {
  Building2,
  ClipboardList,
  LayoutDashboard,
  ListTodo,
  LogOut,
  Menu,
  PlusCircle,
  ShieldCheck,
  User,
  Users,
  X,
} from "lucide-react";
import { useState } from "react";
import { UserRole } from "../backend.d";
import { useInternetIdentity } from "../hooks/useInternetIdentity";
import {
  useCallerProfile,
  useCallerRole,
  useIsAdmin,
} from "../hooks/useQueries";

interface NavItem {
  label: string;
  to: string;
  icon: React.ReactNode;
  adminOnly?: boolean;
}

const navItems: NavItem[] = [
  { label: "Dashboard", to: "/", icon: <LayoutDashboard size={18} /> },
  { label: "My Tasks", to: "/my-tasks", icon: <ListTodo size={18} /> },
  {
    label: "All Tasks",
    to: "/all-tasks",
    icon: <ClipboardList size={18} />,
    adminOnly: true,
  },
  {
    label: "Create Task",
    to: "/create-task",
    icon: <PlusCircle size={18} />,
    adminOnly: true,
  },
  {
    label: "Employee Panel",
    to: "/employee-panel",
    icon: <Users size={18} />,
    adminOnly: true,
  },
  { label: "Profile", to: "/profile", icon: <User size={18} /> },
  {
    label: "Admin Panel",
    to: "/admin-panel",
    icon: <ShieldCheck size={18} />,
  },
];

function SidebarContent({ onClose }: { onClose?: () => void }) {
  const location = useLocation();
  const { clear } = useInternetIdentity();
  const { data: isAdmin } = useIsAdmin();
  const { data: profile } = useCallerProfile();
  const { data: role } = useCallerRole();

  const visibleItems = navItems.filter((item) => !item.adminOnly || isAdmin);
  const roleLabel =
    role === UserRole.admin
      ? "Admin"
      : role === UserRole.user
        ? "User"
        : "Guest";

  return (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div
        className="flex items-center gap-2.5 px-4 py-5 border-b"
        style={{ borderColor: "oklch(var(--sidebar-border))" }}
      >
        <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center flex-shrink-0">
          <Building2 size={16} className="text-white" />
        </div>
        <div>
          <p
            className="text-sm font-bold"
            style={{ color: "oklch(var(--sidebar-accent-foreground))" }}
          >
            TaskFlow
          </p>
          <p
            className="text-xs"
            style={{ color: "oklch(var(--sidebar-foreground) / 0.6)" }}
          >
            Company Tasks
          </p>
        </div>
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            className="ml-auto"
            style={{ color: "oklch(var(--sidebar-foreground))" }}
          >
            <X size={18} />
          </button>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-1">
        {visibleItems.map((item) => {
          const isActive = location.pathname === item.to;
          return (
            <Link
              key={item.to}
              to={item.to}
              onClick={onClose}
              data-ocid={`nav.${item.label.toLowerCase().replace(/ /g, "_")}.link`}
              className={`sidebar-nav-link ${isActive ? "active" : ""}`}
            >
              {item.icon}
              {item.label}
            </Link>
          );
        })}
      </nav>

      {/* User Info */}
      <div
        className="px-3 py-4 border-t"
        style={{ borderColor: "oklch(var(--sidebar-border))" }}
      >
        <div className="flex items-center gap-3 px-3 py-2 mb-2">
          <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0">
            <User size={14} style={{ color: "oklch(0.75 0.12 240)" }} />
          </div>
          <div className="min-w-0">
            <p
              className="text-xs font-semibold truncate"
              style={{ color: "oklch(var(--sidebar-accent-foreground))" }}
            >
              {profile?.name || "Anonymous"}
            </p>
            <p
              className="text-xs"
              style={{ color: "oklch(var(--sidebar-foreground) / 0.6)" }}
            >
              {roleLabel}
            </p>
          </div>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => clear()}
          data-ocid="nav.logout.button"
          className="w-full justify-start gap-2 text-xs"
          style={{ color: "oklch(var(--sidebar-foreground) / 0.7)" }}
        >
          <LogOut size={14} />
          Sign Out
        </Button>
      </div>
    </div>
  );
}

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="min-h-screen flex bg-background">
      {/* Desktop Sidebar */}
      <aside
        className="hidden lg:flex flex-col w-60 flex-shrink-0 fixed left-0 top-0 bottom-0 z-30"
        style={{ background: "oklch(var(--sidebar))" }}
      >
        <SidebarContent />
      </aside>

      {/* Mobile Overlay */}
      {mobileOpen && (
        <div
          role="button"
          tabIndex={0}
          aria-label="Close menu"
          className="fixed inset-0 z-40 lg:hidden"
          style={{ background: "oklch(0 0 0 / 0.5)" }}
          onClick={() => setMobileOpen(false)}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") setMobileOpen(false);
          }}
        />
      )}

      {/* Mobile Sidebar */}
      <aside
        className={`fixed left-0 top-0 bottom-0 z-50 w-60 lg:hidden transition-transform duration-200 ${
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        }`}
        style={{ background: "oklch(var(--sidebar))" }}
      >
        <SidebarContent onClose={() => setMobileOpen(false)} />
      </aside>

      {/* Main Content */}
      <main className="flex-1 lg:ml-60 min-h-screen flex flex-col">
        {/* Mobile Header */}
        <header className="lg:hidden flex items-center gap-3 px-4 py-3 border-b bg-card">
          <button
            type="button"
            onClick={() => setMobileOpen(true)}
            data-ocid="nav.mobile_menu.button"
            className="p-1 rounded-md hover:bg-muted"
          >
            <Menu size={20} />
          </button>
          <span className="font-semibold text-sm">TaskFlow</span>
        </header>

        <div className="flex-1 p-6">{children}</div>

        <footer className="px-6 py-4 border-t text-center text-xs text-muted-foreground">
          © {new Date().getFullYear()}. Built with love using{" "}
          <a
            href={`https://caffeine.ai?utm_source=caffeine-footer&utm_medium=referral&utm_content=${encodeURIComponent(window.location.hostname)}`}
            target="_blank"
            rel="noopener noreferrer"
            className="underline hover:text-foreground"
          >
            caffeine.ai
          </a>
        </footer>
      </main>
    </div>
  );
}
