import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertTriangle,
  Loader2,
  ShieldCheck,
  UserCog,
  Users,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { UserRole } from "../backend.d";
import { useInternetIdentity } from "../hooks/useInternetIdentity";
import {
  useAdminCount,
  useAssignUserRoleAsAdmin,
  useBootstrapAdmin,
  useIsAdmin,
} from "../hooks/useQueries";

export default function AdminPanelPage() {
  const {
    data: isAdmin,
    isLoading: isAdminLoading,
    refetch: refetchIsAdmin,
  } = useIsAdmin();
  const { data: adminCount = 0, isLoading: isAdminCountLoading } =
    useAdminCount();
  const assignRole = useAssignUserRoleAsAdmin();
  const bootstrapAdmin = useBootstrapAdmin();
  const { identity } = useInternetIdentity();

  const [principal, setPrincipal] = useState("");
  const [role, setRole] = useState<UserRole>(UserRole.user);
  const [error, setError] = useState("");

  const myPrincipal = identity?.getPrincipal().toText() ?? "";
  const maxAdmins = 10;
  const adminLimitReached = adminCount >= maxAdmins;
  const adminRoleSelected = role === UserRole.admin;
  const submitDisabled =
    assignRole.isPending || (adminRoleSelected && adminLimitReached);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (!principal.trim()) {
      setError("Please enter a principal ID.");
      return;
    }
    if (adminRoleSelected && adminLimitReached) {
      setError(
        `Maximum of ${maxAdmins} admins reached. Remove an admin before adding a new one.`,
      );
      return;
    }
    assignRole.mutate(
      { user: principal.trim(), role },
      {
        onSuccess: () => {
          toast.success("Role assigned successfully!");
          setPrincipal("");
        },
        onError: (err) => {
          const msg =
            err instanceof Error ? err.message : "Failed to assign role";
          setError(msg);
          toast.error("Failed to assign role");
        },
      },
    );
  }

  function handleBootstrap() {
    bootstrapAdmin.mutate(undefined, {
      onSuccess: (result) => {
        if (result) {
          toast.success("You are now an Admin!");
          refetchIsAdmin();
        } else {
          toast.error(
            "An admin already exists. Contact your admin to get access.",
          );
        }
      },
      onError: () => {
        toast.error("Failed to claim admin. Try again.");
      },
    });
  }

  if (isAdminLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 size={24} className="animate-spin text-primary" />
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="max-w-xl mx-auto space-y-4 animate-fade-up">
        <div className="mb-6">
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <ShieldCheck size={22} className="text-primary" />
            Admin Panel
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            You need Admin access to manage tasks and users.
          </p>
        </div>
        <Card className="shadow-card border-primary/20">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Claim Admin Access</CardTitle>
            <CardDescription>
              Click below to become Admin (only works if no admin exists yet).
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="p-3 rounded-md bg-muted">
              <p className="text-xs text-muted-foreground mb-1">
                Your Principal ID
              </p>
              <p className="text-xs font-mono break-all select-all">
                {myPrincipal}
              </p>
            </div>
            <Button
              onClick={handleBootstrap}
              disabled={bootstrapAdmin.isPending}
              className="w-full"
              data-ocid="admin_panel.bootstrap.button"
            >
              {bootstrapAdmin.isPending ? (
                <>
                  <Loader2 size={14} className="mr-2 animate-spin" />{" "}
                  Claiming...
                </>
              ) : (
                <>
                  <ShieldCheck size={14} className="mr-2" /> Claim Admin Role
                </>
              )}
            </Button>
            <p className="text-xs text-muted-foreground text-center">
              If an admin already exists, ask them to assign your role using the
              Principal ID above.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-xl mx-auto animate-fade-up">
      <div className="mb-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <ShieldCheck size={22} className="text-primary" />
              Admin Panel
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Manage user roles and permissions
            </p>
          </div>
          <div className="flex items-center gap-2 mt-1">
            <Users size={15} className="text-muted-foreground" />
            {isAdminCountLoading ? (
              <Loader2
                size={13}
                className="animate-spin text-muted-foreground"
              />
            ) : (
              <Badge
                variant={adminLimitReached ? "destructive" : "secondary"}
                className="text-xs font-semibold"
                data-ocid="admin_panel.admin_count.badge"
              >
                Admins: {adminCount} / {maxAdmins}
              </Badge>
            )}
          </div>
        </div>
      </div>

      {adminLimitReached && (
        <Alert
          variant="destructive"
          className="mb-4"
          data-ocid="admin_panel.limit.error_state"
        >
          <AlertTriangle size={15} className="mr-1" />
          <AlertDescription>
            Maximum of {maxAdmins} admins reached. Remove an existing admin
            before promoting a new one.
          </AlertDescription>
        </Alert>
      )}

      <Card className="shadow-card">
        <CardHeader className="pb-4">
          <CardTitle className="text-base flex items-center gap-2">
            <UserCog size={16} className="text-primary" />
            Assign User Role
          </CardTitle>
          <CardDescription>
            Enter a user's principal ID and assign them a role.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="principal">
                User Principal <span className="text-destructive">*</span>
              </Label>
              <Input
                id="principal"
                value={principal}
                onChange={(e) => setPrincipal(e.target.value)}
                placeholder="aaaaa-bbbbb-ccccc-ddddd-eee"
                className="font-mono text-xs"
                data-ocid="admin_panel.principal.input"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Role</Label>
              <Select
                value={role}
                onValueChange={(v) => {
                  setRole(v as UserRole);
                  setError("");
                }}
              >
                <SelectTrigger data-ocid="admin_panel.role.select">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={UserRole.guest}>Guest</SelectItem>
                  <SelectItem value={UserRole.user}>User</SelectItem>
                  <SelectItem value={UserRole.admin}>Admin</SelectItem>
                </SelectContent>
              </Select>
              {adminRoleSelected && adminLimitReached && (
                <p
                  className="text-xs text-destructive flex items-center gap-1 mt-1"
                  data-ocid="admin_panel.admin_limit.error_state"
                >
                  <AlertTriangle size={12} />
                  Admin limit reached ({maxAdmins}/{maxAdmins}). Cannot assign
                  Admin role.
                </p>
              )}
            </div>
            {error && (
              <p
                className="text-sm text-destructive"
                data-ocid="admin_panel.error_state"
              >
                {error}
              </p>
            )}
            <Button
              type="submit"
              disabled={submitDisabled}
              data-ocid="admin_panel.assign.submit_button"
            >
              {assignRole.isPending ? (
                <>
                  <Loader2 size={14} className="mr-2 animate-spin" />{" "}
                  Assigning...
                </>
              ) : (
                <>
                  <ShieldCheck size={14} className="mr-2" /> Assign Role
                </>
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
