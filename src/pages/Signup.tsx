import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Heart, ShieldCheck, Mail, CheckCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { PasswordInput, isStrongPassword } from "@/components/PasswordInput";
import signupIllustration from "@/assets/signup-illustration.jpg";

type AppRole = "donor" | "receiver" | "volunteer";

export default function Signup() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<AppRole>("receiver");
  const [loading, setLoading] = useState(false);
  const [pendingRedirect, setPendingRedirect] = useState(false);
  const [emailSent, setEmailSent] = useState(false);
  const [signedUpEmail, setSignedUpEmail] = useState("");
  const { signUp, user, role: authRole } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  // Redirect after signup once role is resolved
  useEffect(() => {
    if (pendingRedirect && user && authRole) {
      setPendingRedirect(false);
      navigate(`/dashboard/${authRole}`, { replace: true });
    }
  }, [pendingRedirect, user, authRole, navigate]);

  // Timeout fallback — if role hasn't loaded in 3s, use the selected role to redirect
  useEffect(() => {
    if (!pendingRedirect) return;
    const timer = setTimeout(() => {
      if (pendingRedirect && user && !authRole) {
        setPendingRedirect(false);
        navigate(`/dashboard/${role}`, { replace: true });
      }
    }, 3000);
    return () => clearTimeout(timer);
  }, [pendingRedirect, user, authRole, role, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isStrongPassword(password)) {
      toast({ title: "Weak password", description: "Please meet all password requirements.", variant: "destructive" });
      return;
    }
    setLoading(true);
    try {
      const { requiresConfirmation } = await signUp(email, password, name, role);
      if (requiresConfirmation) {
        setSignedUpEmail(email);
        setEmailSent(true);
      } else {
        toast({ title: "Account created!", description: "You're now signed in." });
        setPendingRedirect(true);
      }
    } catch (err: any) {
      toast({ title: "Signup failed", description: err.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  // Show email verification screen
  if (emailSent) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-primary/5 via-background to-accent/5 px-4">
        <Card className="w-full max-w-md text-center">
          <CardContent className="py-12 px-8">
            <div className="mb-6 flex justify-center">
              <div className="rounded-full bg-primary/10 p-5">
                <Mail className="h-10 w-10 text-primary" />
              </div>
            </div>
            <h2 className="text-2xl font-bold mb-2">Check your email</h2>
            <p className="text-muted-foreground mb-2">
              We sent a verification link to
            </p>
            <p className="font-semibold text-primary mb-6">{signedUpEmail}</p>
            <div className="rounded-xl bg-muted/50 p-4 mb-6 text-left space-y-2">
              <div className="flex items-center gap-2 text-sm"><CheckCircle className="h-4 w-4 text-primary shrink-0" /> Click the link in your email</div>
              <div className="flex items-center gap-2 text-sm"><CheckCircle className="h-4 w-4 text-primary shrink-0" /> You will be redirected to login</div>
              <div className="flex items-center gap-2 text-sm"><CheckCircle className="h-4 w-4 text-primary shrink-0" /> Sign in with your credentials</div>
            </div>
            <p className="text-xs text-muted-foreground mb-4">Didn't receive it? Check your spam folder.</p>
            <Link to="/login" className="text-sm font-medium text-primary hover:underline">
              Already verified? Log in →
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="relative flex min-h-screen">
      <Button
        variant="ghost"
        size="sm"
        className="absolute right-4 top-4 z-10 text-xs text-muted-foreground hover:text-foreground"
        asChild
      >
        <Link to="/admin/login">
          <ShieldCheck className="mr-1 h-3.5 w-3.5" />
          Admin Login
        </Link>
      </Button>

      {/* Left side - illustration (hidden on mobile) */}
      <div className="hidden lg:flex lg:w-1/2 relative items-center justify-center bg-accent/5">
        <img
          src={signupIllustration}
          alt="People sharing food in a community"
          className="h-full w-full object-cover dark:opacity-80"
          loading="lazy"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-background/60 to-transparent" />
        <div className="absolute bottom-12 left-8 right-8 text-center">
          <h2 className="text-2xl font-bold text-foreground">Join Our Community</h2>
          <p className="mt-2 text-muted-foreground">Together we can reduce food waste</p>
        </div>
      </div>

      {/* Right side - form */}
      <div className="flex w-full items-center justify-center bg-gradient-to-br from-primary/5 via-background to-accent/5 px-4 lg:w-1/2">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <Link to="/" className="mx-auto mb-2 flex items-center gap-2 text-xl font-bold text-primary">
              <Heart className="h-6 w-6 fill-primary" /> LeftoverLove
            </Link>
            <CardTitle className="text-2xl">Create your account</CardTitle>
            <CardDescription>Join the community and start sharing food</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Full Name</Label>
                <Input id="name" placeholder="John Doe" value={name} onChange={(e) => setName(e.target.value)} required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input id="email" type="email" placeholder="you@example.com" value={email} onChange={(e) => setEmail(e.target.value)} required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <PasswordInput id="password" value={password} onChange={(e) => setPassword(e.target.value)} required showStrength />
              </div>
              <div className="space-y-2">
                <Label>I want to join as</Label>
                <Select value={role} onValueChange={(v) => setRole(v as AppRole)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="donor">🍽️ Donor — Share surplus food</SelectItem>
                    <SelectItem value="receiver">🙋 Receiver — Find free food</SelectItem>
                    <SelectItem value="volunteer">🚗 Volunteer — Help with deliveries</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button type="submit" className="w-full" disabled={loading || pendingRedirect}>
                {loading || pendingRedirect ? "Creating account..." : "Sign Up"}
              </Button>
            </form>
            <p className="mt-4 text-center text-sm text-muted-foreground">
              Already have an account?{" "}
              <Link to="/login" className="font-medium text-primary hover:underline">Log in</Link>
            </p>
            <p className="mt-2 text-center text-sm text-muted-foreground">
              Registering an NGO?{" "}
              <Link to="/signup/ngo" className="font-medium text-primary hover:underline">NGO Registration</Link>
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
