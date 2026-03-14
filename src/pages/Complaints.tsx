import { useEffect, useState } from "react";
import { Navbar } from "@/components/Navbar";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { Send, MessageCircleWarning } from "lucide-react";

type Complaint = {
  id: string;
  subject: string;
  message: string;
  status: string;
  admin_reply: string | null;
  created_at: string;
};

export default function Complaints() {
  const { toast } = useToast();
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [complaints, setComplaints] = useState<Complaint[]>([]);
  const [form, setForm] = useState({ subject: "", message: "" });

  const fetchComplaints = async () => {
    if (!user) return;
    const { data } = await supabase
      .from("complaints")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });
    setComplaints((data as Complaint[]) ?? []);
  };

  useEffect(() => {
    fetchComplaints();
  }, [user]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !form.subject.trim() || !form.message.trim()) return;
    setLoading(true);
    try {
      const { error } = await supabase.from("complaints").insert({
        user_id: user.id,
        subject: form.subject.trim(),
        message: form.message.trim(),
      });
      if (error) throw error;
      toast({ title: "Complaint submitted", description: "Admin will review it soon." });
      setForm({ subject: "", message: "" });
      fetchComplaints();
    } catch {
      toast({ title: "Failed to submit", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const statusColor = (s: string) => {
    if (s === "open") return "bg-yellow-500";
    if (s === "resolved") return "bg-green-500";
    return "bg-muted";
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-accent/5">
      <Navbar />
      <div className="container mx-auto max-w-2xl px-4 py-12">
        <h1 className="mb-2 text-3xl font-bold flex items-center gap-2">
          <MessageCircleWarning className="h-7 w-7 text-primary" /> Complaints & Feedback
        </h1>
        <p className="mb-8 text-muted-foreground">Submit a complaint or feedback to the admin team.</p>

        <Card className="mb-8">
          <CardHeader>
            <CardTitle>New Complaint</CardTitle>
            <CardDescription>Describe your issue and we'll look into it.</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="subject">Subject *</Label>
                <Input id="subject" placeholder="Brief subject" value={form.subject} onChange={(e) => setForm({ ...form, subject: e.target.value })} required maxLength={150} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="complaint-msg">Message *</Label>
                <Textarea id="complaint-msg" placeholder="Describe your complaint..." rows={4} value={form.message} onChange={(e) => setForm({ ...form, message: e.target.value })} required maxLength={2000} />
              </div>
              <Button type="submit" disabled={loading}>
                <Send className="mr-2 h-4 w-4" />
                {loading ? "Submitting..." : "Submit Complaint"}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Past complaints */}
        <h2 className="mb-4 text-xl font-semibold">Your Complaints</h2>
        {complaints.length === 0 ? (
          <p className="text-muted-foreground">No complaints submitted yet.</p>
        ) : (
          <div className="space-y-4">
            {complaints.map((c) => (
              <Card key={c.id}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="font-medium">{c.subject}</p>
                      <p className="mt-1 text-sm text-muted-foreground">{c.message}</p>
                    </div>
                    <Badge className={`${statusColor(c.status)} text-white text-xs capitalize`}>{c.status}</Badge>
                  </div>
                  {c.admin_reply && (
                    <div className="mt-3 rounded-md bg-muted p-3">
                      <p className="text-xs font-medium text-muted-foreground mb-1">Admin Reply:</p>
                      <p className="text-sm">{c.admin_reply}</p>
                    </div>
                  )}
                  <p className="mt-2 text-xs text-muted-foreground">{new Date(c.created_at).toLocaleString()}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
