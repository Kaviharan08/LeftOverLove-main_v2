import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Heart, Building2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { PasswordInput, isStrongPassword } from "@/components/PasswordInput";

export default function NGOSignup() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [orgName, setOrgName] = useState("");
  const [registrationNumber, setRegistrationNumber] = useState("");
  const [contactName, setContactName] = useState("");
  const [phone, setPhone] = useState("");
  const [description, setDescription] = useState("");
  const [serviceArea, setServiceArea] = useState("50");
  const [loading, setLoading] = useState(false);
  const { signUp } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isStrongPassword(password)) {
      toast({ title: "Weak password", description: "Please meet all password requirements.", variant: "destructive" });
      return;
    }
    setLoading(true);
    try {
      await signUp(email, password, contactName, "ngo" as any);

      setTimeout(async () => {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          await supabase.from("profiles").update({ phone }).eq("user_id", user.id);
          await supabase.from("organizations" as any).insert({
            user_id: user.id,
            org_name: orgName,
            registration_number: registrationNumber || null,
            description: description || null,
            service_area_km: parseInt(serviceArea) || 50,
          });
        }
      }, 1000);

      toast({ title: "NGO account created!", description: "Your organization is pending verification." });
      navigate("/");
    } catch (err: any) {
      toast({ title: "Signup failed", description: err.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-primary/5 via-background to-accent/5 px-4 py-12">
      <Card className="w-full max-w-lg">
        <CardHeader className="text-center">
          <Link to="/" className="mx-auto mb-2 flex items-center gap-2 text-xl font-bold text-primary">
            <Heart className="h-6 w-6 fill-primary" /> LeftoverLove
          </Link>
          <div className="mx-auto flex items-center gap-2">
            <Building2 className="h-5 w-5 text-primary" />
            <CardTitle className="text-2xl">NGO Registration</CardTitle>
          </div>
          <CardDescription>Register your organization to receive bulk food donations</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="orgName">Organization Name *</Label>
                <Input id="orgName" value={orgName} onChange={(e) => setOrgName(e.target.value)} required placeholder="Food Bank Inc." />
              </div>
              <div className="space-y-2">
                <Label htmlFor="regNumber">Registration Number</Label>
                <Input id="regNumber" value={registrationNumber} onChange={(e) => setRegistrationNumber(e.target.value)} placeholder="NGO-12345" />
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="contactName">Contact Person *</Label>
                <Input id="contactName" value={contactName} onChange={(e) => setContactName(e.target.value)} required placeholder="Jane Smith" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">Phone</Label>
                <Input id="phone" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+94" />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email *</Label>
              <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required placeholder="org@example.com" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password *</Label>
              <PasswordInput id="password" value={password} onChange={(e) => setPassword(e.target.value)} required showStrength />
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Organization Description</Label>
              <Textarea id="description" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Tell us about your organization and mission..." rows={3} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="serviceArea">Service Area (km radius)</Label>
              <Input id="serviceArea" type="number" value={serviceArea} onChange={(e) => setServiceArea(e.target.value)} min={1} max={500} />
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Creating account..." : "Register Organization"}
            </Button>
          </form>
          <p className="mt-4 text-center text-sm text-muted-foreground">
            Individual user?{" "}
            <Link to="/signup" className="font-medium text-primary hover:underline">Sign up here</Link>
          </p>
          <p className="mt-2 text-center text-sm text-muted-foreground">
            Already have an account?{" "}
            <Link to="/login" className="font-medium text-primary hover:underline">Log in</Link>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
