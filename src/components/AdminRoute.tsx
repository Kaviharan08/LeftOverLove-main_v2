import { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "@/lib/auth";
import { useToast } from "@/hooks/use-toast";

/**
 * AdminRoute — Strict guard for admin-only routes.
 * If user is not authenticated → redirect to /admin/login
 * If user is authenticated but NOT admin → sign out immediately & redirect to /
 */
export function AdminRoute({ children }: { children: React.ReactNode }) {
  const { user, role, loading, signOut } = useAuth();
  const { toast } = useToast();
  const [checked, setChecked] = useState(false);
  const [authorized, setAuthorized] = useState(false);

  useEffect(() => {
    if (loading) return;

    if (!user) {
      setChecked(true);
      setAuthorized(false);
      return;
    }

    if (role === "admin") {
      setChecked(true);
      setAuthorized(true);
    } else if (role !== null) {
      // User is logged in but not admin — force logout
      toast({
        title: "Access Denied",
        description: "You do not have admin privileges. You have been signed out.",
        variant: "destructive",
      });
      signOut().finally(() => {
        setChecked(true);
        setAuthorized(false);
      });
    }
    // role is still null but user exists → wait for role fetch
  }, [user, role, loading]);

  if (loading || (!checked && user)) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          <p className="text-sm text-muted-foreground">Verifying admin access...</p>
        </div>
      </div>
    );
  }

  if (!authorized) {
    return <Navigate to={user ? "/" : "/admin/login"} replace />;
  }

  return <>{children}</>;
}
