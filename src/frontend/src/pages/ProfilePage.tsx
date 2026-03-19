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
import { Loader2, ShieldCheck, User } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { UserRole } from "../backend.d";
import { useInternetIdentity } from "../hooks/useInternetIdentity";
import {
  useCallerProfile,
  useCallerRole,
  useSaveProfile,
} from "../hooks/useQueries";

export default function ProfilePage() {
  const { identity } = useInternetIdentity();
  const { data: profile, isLoading } = useCallerProfile();
  const { data: role } = useCallerRole();
  const saveProfile = useSaveProfile();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");

  useEffect(() => {
    if (profile) {
      setName(profile.name);
      setEmail(profile.email);
    }
  }, [profile]);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    saveProfile.mutate(
      { name: name.trim(), email: email.trim() },
      {
        onSuccess: () => toast.success("Profile saved!"),
        onError: () => toast.error("Failed to save profile"),
      },
    );
  }

  const roleLabel =
    role === UserRole.admin
      ? "Admin"
      : role === UserRole.user
        ? "User"
        : "Guest";
  const roleBadgeClass =
    role === UserRole.admin
      ? "bg-purple-100 text-purple-700 border-0"
      : role === UserRole.user
        ? "bg-blue-100 text-blue-700 border-0"
        : "bg-muted text-muted-foreground border-0";

  return (
    <div className="max-w-xl mx-auto animate-fade-up">
      <div className="mb-6">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <User size={22} className="text-primary" />
          Profile
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Manage your account details
        </p>
      </div>

      <div className="space-y-4">
        {/* Role Card */}
        <Card className="shadow-card">
          <CardContent className="p-5">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                <User size={20} className="text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold">
                  {profile?.name || "No name set"}
                </p>
                <p className="text-xs text-muted-foreground truncate">
                  {identity?.getPrincipal().toString()}
                </p>
              </div>
              <Badge className={`${roleBadgeClass} gap-1.5`}>
                <ShieldCheck size={12} />
                {roleLabel}
              </Badge>
            </div>
          </CardContent>
        </Card>

        {/* Edit Form */}
        <Card className="shadow-card">
          <CardHeader className="pb-4">
            <CardTitle className="text-base">Edit Profile</CardTitle>
            <CardDescription>
              Update your name and email address.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="name">Full Name</Label>
                <Input
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="John Smith"
                  disabled={isLoading}
                  data-ocid="profile.name.input"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="email">Email Address</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="john@company.com"
                  disabled={isLoading}
                  data-ocid="profile.email.input"
                />
              </div>
              <Button
                type="submit"
                disabled={saveProfile.isPending || isLoading}
                data-ocid="profile.save.submit_button"
              >
                {saveProfile.isPending ? (
                  <>
                    <Loader2 size={14} className="mr-2 animate-spin" />{" "}
                    Saving...
                  </>
                ) : (
                  "Save Profile"
                )}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
