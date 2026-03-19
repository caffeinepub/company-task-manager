import { Button } from "@/components/ui/button";
import {
  BarChart3,
  Building2,
  CheckCircle2,
  Loader2,
  LogIn,
  Shield,
} from "lucide-react";
import { motion } from "motion/react";
import { useInternetIdentity } from "../hooks/useInternetIdentity";

const features = [
  { icon: <BarChart3 size={16} />, text: "Real-time task progress dashboards" },
  { icon: <CheckCircle2 size={16} />, text: "Priority-based task assignment" },
  { icon: <Shield size={16} />, text: "Role-based access for admins & staff" },
];

export default function LoginPage() {
  const { login, isLoggingIn } = useInternetIdentity();

  return (
    <div className="min-h-screen flex bg-background">
      {/* Left Panel */}
      <div
        className="hidden lg:flex flex-col justify-between w-2/5 p-12"
        style={{ background: "oklch(var(--sidebar))" }}
      >
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-lg bg-primary flex items-center justify-center">
            <Building2 size={18} className="text-white" />
          </div>
          <span
            className="text-lg font-bold"
            style={{ color: "oklch(var(--sidebar-accent-foreground))" }}
          >
            TaskFlow
          </span>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="space-y-8"
        >
          <div>
            <h1
              className="text-3xl font-bold mb-3"
              style={{ color: "oklch(var(--sidebar-accent-foreground))" }}
            >
              Company Task Manager
            </h1>
            <p
              className="text-sm leading-relaxed"
              style={{ color: "oklch(var(--sidebar-foreground) / 0.7)" }}
            >
              Organize, track, and deliver work efficiently across your entire
              team.
            </p>
          </div>

          <div className="space-y-4">
            {features.map((item) => (
              <div key={item.text} className="flex items-center gap-3">
                <div
                  className="w-7 h-7 rounded-md flex items-center justify-center"
                  style={{
                    background: "oklch(var(--primary) / 0.2)",
                    color: "oklch(0.75 0.12 240)",
                  }}
                >
                  {item.icon}
                </div>
                <span
                  className="text-sm"
                  style={{ color: "oklch(var(--sidebar-foreground) / 0.85)" }}
                >
                  {item.text}
                </span>
              </div>
            ))}
          </div>
        </motion.div>

        <p
          className="text-xs"
          style={{ color: "oklch(var(--sidebar-foreground) / 0.4)" }}
        >
          © {new Date().getFullYear()} TaskFlow. All rights reserved.
        </p>
      </div>

      {/* Right Panel */}
      <div className="flex-1 flex items-center justify-center p-8">
        <motion.div
          initial={{ opacity: 0, scale: 0.97 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.4 }}
          className="w-full max-w-sm"
        >
          {/* Mobile Logo */}
          <div className="flex items-center gap-2.5 mb-8 lg:hidden">
            <div className="w-9 h-9 rounded-lg bg-sidebar flex items-center justify-center">
              <Building2 size={18} className="text-white" />
            </div>
            <span className="text-lg font-bold">TaskFlow</span>
          </div>

          <div className="mb-8">
            <h2 className="text-2xl font-bold mb-2">Welcome back</h2>
            <p className="text-sm text-muted-foreground">
              Sign in to access your workspace
            </p>
          </div>

          <div className="space-y-4">
            <Button
              className="w-full gap-2"
              size="lg"
              onClick={() => login()}
              disabled={isLoggingIn}
              data-ocid="login.primary_button"
            >
              {isLoggingIn ? (
                <Loader2 size={16} className="animate-spin" />
              ) : (
                <LogIn size={16} />
              )}
              {isLoggingIn ? "Connecting..." : "Sign in with Internet Identity"}
            </Button>

            <p className="text-xs text-center text-muted-foreground">
              Secured by Internet Identity — no passwords needed.
            </p>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
