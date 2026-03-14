import { useState, useEffect } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Heart } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { PasswordInput } from "@/components/PasswordInput";
import loginIllustration from "@/assets/login-illustration.jpg";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [pendingRedirect, setPendingRedirect] = useState(false);
  const { signIn, user, role } = useAuth();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { toast } = useToast();

  // Redirect after login once role is resolved
  useEffect(() => {
    if (pendingRedirect && user && role) {
      setPendingRedirect(false);
      navigate(`/dashboard/${role}`, { replace: true });
    }
  }, [pendingRedirect, user, role, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await signIn(email, password);
      setPendingRedirect(true);
    } catch (err: any) {
      toast({ title: "Login failed", description: err.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen">
      {/* Left side - illustration (hidden on mobile) */}
      <div className="hidden lg:flex lg:w-1/2 relative items-center justify-center bg-primary/5">
        <img
          src={loginIllustration}
          alt="Food donation illustration"
          className="h-full w-full object-cover dark:opacity-80"
          loading="lazy"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-background/60 to-transparent" />
        <div className="absolute bottom-12 left-8 right-8 text-center">
          <h2 className="text-2xl font-bold text-foreground">Welcome Back</h2>
          <p className="mt-2 text-muted-foreground">Continue sharing love through food</p>
        </div>
      </div>

      {/* Right side - form */}
      <div className="flex w-full items-center justify-center bg-gradient-to-br from-primary/5 via-background to-accent/5 px-4 lg:w-1/2">
        <Card className="w-full max-w-md">
          {/* Show success message after email verification */}
          {searchParams.get("verified") === "true" && (
            <div className="mx-4 mt-4 flex items-center gap-2 rounded-lg border border-green-200 bg-green-50 dark:border-green-800/40 dark:bg-green-950/20 px-4 py-3">
              <span className="text-green-600 dark:text-green-400 text-lg">✅</span>
              <p className="text-sm text-green-700 dark:text-green-300 font-medium">Email verified! You can now log in.</p>
            </div>
          )}
          <CardHeader className="text-center">
            <Link to="/" className="mx-auto mb-2 flex items-center gap-2 text-xl font-bold text-primary">
              <Heart className="h-6 w-6 fill-primary" /> LeftoverLove
            </Link>
            <CardTitle className="text-2xl">Welcome back</CardTitle>
            <CardDescription>Sign in to your account</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input id="email" type="email" placeholder="you@example.com" value={email} onChange={(e) => setEmail(e.target.value)} required />
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="password">Password</Label>
                  <Link to="/forgot-password" className="text-xs text-primary hover:underline">Forgot password?</Link>
                </div>
                <PasswordInput id="password" value={password} onChange={(e) => setPassword(e.target.value)} required autoComplete="current-password" />
              </div>
              <Button type="submit" className="w-full" disabled={loading || pendingRedirect}>
                {loading || pendingRedirect ? "Signing in..." : "Sign In"}
              </Button>
            </form>
            <p className="mt-4 text-center text-sm text-muted-foreground">
              Don't have an account?{" "}
              <Link to="/signup" className="font-medium text-primary hover:underline">Sign up</Link>
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
