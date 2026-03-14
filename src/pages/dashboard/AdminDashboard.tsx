import { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/lib/auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { StarRating } from "@/components/StarRating";
import { ImpactStats } from "@/components/ImpactStats";
import { useToast } from "@/hooks/use-toast";
import { fetchFoodListings } from "@/lib/food-listings";
import { fetchAllRequestsAdmin, statusLabel, statusColor, type PickupRequest } from "@/lib/pickup-requests";
import { fetchAllUsers, changeUserRole, deleteListingAdmin, deleteReviewAdmin, fetchAllReviewsAdmin, fetchAuditLog, fetchTopDonors, type UserWithRole, type AuditLogEntry, type TopDonor } from "@/lib/admin";
import { BanUserDialog } from "@/components/BanUserDialog";
import { supabase } from "@/integrations/supabase/client";
import type { Tables as DbTables } from "@/integrations/supabase/types";
import { Users, UtensilsCrossed, Truck, Trash2, ShieldCheck, Mail, MessageCircleWarning, BarChart3, Reply, LogOut, Shield, Trophy, Crown } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";

type ContactMsg = { id: string; name: string; email: string; phone: string | null; message: string; read: boolean; created_at: string };
type Complaint = { id: string; user_id: string; subject: string; message: string; status: string; admin_reply: string | null; read: boolean; created_at: string; user_name?: string };

export default function AdminDashboard() {
  const { toast } = useToast();
  const [users, setUsers] = useState<UserWithRole[]>([]);
  const [listings, setListings] = useState<DbTables<"food_listings">[]>([]);
  const [requests, setRequests] = useState<PickupRequest[]>([]);
  const [reviews, setReviews] = useState<any[]>([]);
  const [contacts, setContacts] = useState<ContactMsg[]>([]);
  const [complaints, setComplaints] = useState<Complaint[]>([]);
  const [auditLog, setAuditLog] = useState<AuditLogEntry[]>([]);
  const [topDonors, setTopDonors] = useState<TopDonor[]>([]);
  const [loading, setLoading] = useState(true);

  const [confirmAction, setConfirmAction] = useState<{ title: string; desc: string; action: () => Promise<void> } | null>(null);
  const [replyDialog, setReplyDialog] = useState<{ id: string; subject: string } | null>(null);
  const [replyText, setReplyText] = useState("");

  const loadData = useCallback(() => {
    setLoading(true);
    Promise.all([
      fetchAllUsers(),
      fetchFoodListings(),
      fetchAllRequestsAdmin(),
      fetchAllReviewsAdmin(),
      supabase.from("contact_messages").select("*").order("created_at", { ascending: false }),
      supabase.from("complaints").select("*").order("created_at", { ascending: false }),
      fetchAuditLog(),
      fetchTopDonors(5),
    ])
      .then(async ([u, l, r, rev, contactRes, complaintRes, audit, donors]) => {
        setUsers(u);
        setListings(l);
        setRequests(r);
        setReviews(rev);
        setContacts((contactRes.data as ContactMsg[]) ?? []);
        setAuditLog(audit);
        setTopDonors(donors);

        const rawComplaints = (complaintRes.data ?? []) as Complaint[];
        const userIds = [...new Set(rawComplaints.map((c) => c.user_id))];
        if (userIds.length > 0) {
          const { data: profiles } = await supabase.from("profiles").select("user_id, name").in("user_id", userIds);
          const nameMap = new Map((profiles ?? []).map((p: any) => [p.user_id, p.name ?? "User"]));
          setComplaints(rawComplaints.map((c) => ({ ...c, user_name: nameMap.get(c.user_id) ?? "User" })));
        } else {
          setComplaints(rawComplaints);
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  useEffect(() => {
    const channel = supabase
      .channel("admin-realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "pickup_requests" }, () => loadData())
      .on("postgres_changes", { event: "*", schema: "public", table: "food_listings" }, () => loadData())
      .on("postgres_changes", { event: "*", schema: "public", table: "complaints" }, () => loadData())
      .on("postgres_changes", { event: "*", schema: "public", table: "contact_messages" }, () => loadData())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [loadData]);

  const activePickups = requests.filter((r) => r.status === "accepted" || r.status === "picked_up").length;
  const pendingRequests = requests.filter((r) => r.status === "pending").length;

  const roleCounts = ["admin", "donor", "receiver", "volunteer", "ngo"].map((r) => ({
    name: r === "ngo" ? "NGO" : r.charAt(0).toUpperCase() + r.slice(1),
    value: users.filter((u) => u.role === r).length,
  }));
  const PIE_COLORS = ["hsl(var(--primary))", "hsl(var(--accent))", "#22c55e", "#f59e0b", "#8b5cf6"];

  const listingStatusData = ["available", "claimed", "completed"].map((s) => ({
    name: s.charAt(0).toUpperCase() + s.slice(1),
    count: listings.filter((l) => l.status === s).length,
  }));

  const requestStatusData = ["pending", "accepted", "picked_up", "delivered", "cancelled"].map((s) => ({
    name: s.replace("_", " ").replace(/\b\w/g, (c) => c.toUpperCase()),
    count: requests.filter((r) => r.status === s).length,
  }));

  const handleRoleChange = async (userId: string, newRole: string) => {
    try {
      await changeUserRole(userId, newRole);
      toast({ title: "Role updated" });
      loadData();
    } catch {
      toast({ title: "Error updating role", variant: "destructive" });
    }
  };

  const handleDeleteListing = (id: string, title: string) => {
    setConfirmAction({
      title: "Delete Listing",
      desc: `Are you sure you want to delete "${title}"?`,
      action: async () => { await deleteListingAdmin(id); toast({ title: "Listing deleted" }); loadData(); },
    });
  };

  const handleDeleteReview = (id: string) => {
    setConfirmAction({
      title: "Delete Review",
      desc: "Are you sure you want to remove this review?",
      action: async () => { await deleteReviewAdmin(id); toast({ title: "Review deleted" }); loadData(); },
    });
  };

  const handleDeleteContact = (id: string) => {
    setConfirmAction({
      title: "Delete Contact Message",
      desc: "Delete this contact message?",
      action: async () => {
        await supabase.from("contact_messages").delete().eq("id", id);
        toast({ title: "Deleted" }); loadData();
      },
    });
  };

  const handleReplyComplaint = async () => {
    if (!replyDialog || !replyText.trim()) return;
    await supabase.from("complaints").update({ admin_reply: replyText.trim(), status: "resolved" }).eq("id", replyDialog.id);
    toast({ title: "Reply sent" });
    setReplyDialog(null);
    setReplyText("");
    loadData();
  };

  const handleDeleteComplaint = (id: string) => {
    setConfirmAction({
      title: "Delete Complaint",
      desc: "Delete this complaint?",
      action: async () => {
        await supabase.from("complaints").delete().eq("id", id);
        toast({ title: "Deleted" }); loadData();
      },
    });
  };

  const confirmExec = async () => {
    if (!confirmAction) return;
    try { await confirmAction.action(); } catch { toast({ title: "Action failed", variant: "destructive" }); }
    setConfirmAction(null);
  };

  const statCards = [
    { label: "Users", value: users.length, icon: Users, color: "text-primary" },
    { label: "Listings", value: listings.length, icon: UtensilsCrossed, color: "text-primary" },
    { label: "Active Pickups", value: activePickups, icon: Truck, color: "text-primary" },
    { label: "Pending Requests", value: pendingRequests, icon: ShieldCheck, color: "text-accent" },
    { label: "Contacts", value: contacts.length, icon: Mail, color: "text-primary" },
    { label: "Complaints", value: complaints.filter((c) => c.status === "open").length, icon: MessageCircleWarning, color: "text-destructive" },
  ];

  const { signOut, user } = useAuth();
  const navigate = useNavigate();

  const handleAdminLogout = async () => {
    await signOut();
    navigate("/admin/login");
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Admin Header */}
      <header className="sticky top-0 z-50 border-b bg-destructive/5 backdrop-blur-md">
        <div className="container mx-auto flex h-14 items-center justify-between px-4">
          <div className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-destructive" />
            <span className="font-bold text-foreground">Admin Panel</span>
            <Badge variant="outline" className="ml-2 text-xs border-destructive/30 text-destructive">Restricted</Badge>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-xs text-muted-foreground">{user?.email}</span>
            <Button variant="ghost" size="sm" onClick={handleAdminLogout} className="text-destructive hover:text-destructive">
              <LogOut className="h-4 w-4 mr-1" /> Sign Out
            </Button>
          </div>
        </div>
      </header>
      <div className="container mx-auto px-4 py-8">
        <h1 className="mb-6 text-3xl font-bold">Admin Dashboard</h1>

        {/* Stats */}
        <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
          {statCards.map((s) => (
            <Card key={s.label}>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">{s.label}</CardTitle>
                <s.icon className={`h-4 w-4 ${s.color}`} />
              </CardHeader>
              <CardContent>
                <p className={`text-3xl font-bold ${s.color}`}>{loading ? "..." : s.value}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Top Donor of the Month */}
        <div className="mb-8">
          <h2 className="mb-3 text-lg font-semibold flex items-center gap-2"><Trophy className="h-5 w-5 text-accent" /> Top Donors of the Month</h2>
          <div className="grid gap-4 md:grid-cols-2">
            {/* Highlight card for #1 */}
            {topDonors.length > 0 ? (
              <Card className="border-2 border-accent/30 bg-gradient-to-br from-accent/5 to-transparent">
                <CardContent className="flex items-center gap-4 p-6">
                  <div className="relative">
                    <Avatar className="h-16 w-16">
                      <AvatarImage src={topDonors[0].avatar_url || undefined} />
                      <AvatarFallback className="bg-accent/20 text-accent text-xl">{topDonors[0].name?.charAt(0) || "?"}</AvatarFallback>
                    </Avatar>
                    <Crown className="absolute -top-2 -right-2 h-6 w-6 text-accent" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">🏆 Top Donor</p>
                    <p className="text-xl font-bold">{topDonors[0].name}</p>
                    <p className="text-sm text-accent font-semibold">{topDonors[0].donation_count} donations this month</p>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <Card>
                <CardContent className="p-6 text-center text-muted-foreground">No donations this month yet.</CardContent>
              </Card>
            )}

            {/* Top 5 Leaderboard */}
            {topDonors.length > 1 && (
              <Card>
                <CardHeader className="pb-2"><CardTitle className="text-sm">Leaderboard</CardTitle></CardHeader>
                <CardContent className="space-y-3">
                  {topDonors.map((d, i) => (
                    <div key={d.donor_id} className="flex items-center gap-3">
                      <span className={`text-sm font-bold ${i === 0 ? "text-accent" : "text-muted-foreground"}`}>#{i + 1}</span>
                      <Avatar className="h-8 w-8">
                        <AvatarImage src={d.avatar_url || undefined} />
                        <AvatarFallback className="text-xs">{d.name?.charAt(0) || "?"}</AvatarFallback>
                      </Avatar>
                      <span className="flex-1 text-sm font-medium truncate">{d.name}</span>
                      <Badge variant="secondary" className="text-xs">{d.donation_count}</Badge>
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}
          </div>
        </div>

        {/* Platform Impact */}
        <div className="mb-8">
          <h2 className="mb-3 text-lg font-semibold">Platform Impact</h2>
          <ImpactStats role="admin" />
        </div>

        {/* Charts */}
        <div className="mb-8 grid gap-6 md:grid-cols-3">
          <Card>
            <CardHeader><CardTitle className="text-sm flex items-center gap-2"><BarChart3 className="h-4 w-4" /> Users by Role</CardTitle></CardHeader>
            <CardContent className="h-[220px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={roleCounts} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={70} label={({ name, value }) => `${name}: ${value}`}>
                    {roleCounts.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle className="text-sm">Listing Status</CardTitle></CardHeader>
            <CardContent className="h-[220px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={listingStatusData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                  <YAxis allowDecimals={false} />
                  <Tooltip />
                  <Bar dataKey="count" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle className="text-sm">Request Status</CardTitle></CardHeader>
            <CardContent className="h-[220px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={requestStatusData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                  <YAxis allowDecimals={false} />
                  <Tooltip />
                  <Bar dataKey="count" fill="hsl(var(--accent))" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="users" className="space-y-4">
          <TabsList className="grid w-full grid-cols-7">
            <TabsTrigger value="users">Users</TabsTrigger>
            <TabsTrigger value="listings">Listings</TabsTrigger>
            <TabsTrigger value="requests">Requests</TabsTrigger>
            <TabsTrigger value="reviews">Reviews</TabsTrigger>
            <TabsTrigger value="contacts">Contacts</TabsTrigger>
            <TabsTrigger value="complaints">Complaints</TabsTrigger>
            <TabsTrigger value="audit">Audit Log</TabsTrigger>
          </TabsList>

          {/* Users Tab */}
          <TabsContent value="users">
            <Card>
              <CardHeader><CardTitle>User Management</CardTitle></CardHeader>
              <CardContent>
                {loading ? <p className="text-muted-foreground">Loading...</p> : users.length === 0 ? (
                  <p className="text-muted-foreground">No users yet.</p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                         <TableHead>Name</TableHead>
                         <TableHead>Role</TableHead>
                         <TableHead>Status</TableHead>
                         <TableHead>Joined</TableHead>
                         <TableHead>Change Role</TableHead>
                         <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {users.map((u) => (
                        <TableRow key={u.user_id}>
                          <TableCell className="font-medium">
                            {u.name || "—"}
                            {u.is_banned && <Badge variant="destructive" className="ml-2 text-xs">Banned</Badge>}
                          </TableCell>
                           <TableCell><Badge variant="secondary" className="capitalize">{u.role || "none"}</Badge></TableCell>
                           <TableCell>
                             {u.is_banned ? (
                               <span className="text-xs text-destructive" title={u.ban_reason || undefined}>Suspended</span>
                             ) : (
                               <span className="text-xs text-green-600">Active</span>
                             )}
                           </TableCell>
                           <TableCell className="text-muted-foreground text-sm">{new Date(u.created_at).toLocaleDateString()}</TableCell>
                           <TableCell>
                             <Select defaultValue={u.role ?? ""} onValueChange={(v) => handleRoleChange(u.user_id, v)}>
                               <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="admin">Admin</SelectItem>
                                  <SelectItem value="donor">Donor</SelectItem>
                                  <SelectItem value="receiver">Receiver</SelectItem>
                                  <SelectItem value="volunteer">Volunteer</SelectItem>
                                  <SelectItem value="ngo">NGO</SelectItem>
                                </SelectContent>
                             </Select>
                           </TableCell>
                           <TableCell>
                             <BanUserDialog
                               userId={u.user_id}
                               userName={u.name || "User"}
                               isBanned={u.is_banned}
                               onComplete={loadData}
                             />
                           </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Listings Tab */}
          <TabsContent value="listings">
            <Card>
              <CardHeader><CardTitle>Food Listings</CardTitle></CardHeader>
              <CardContent>
                {loading ? <p className="text-muted-foreground">Loading...</p> : listings.length === 0 ? (
                  <p className="text-muted-foreground">No listings yet.</p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Title</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Created</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {listings.map((l) => (
                        <TableRow key={l.id}>
                          <TableCell className="font-medium max-w-[200px] truncate">{l.title}</TableCell>
                          <TableCell><Badge variant="outline" className="capitalize">{l.status}</Badge></TableCell>
                          <TableCell className="text-muted-foreground text-sm">{new Date(l.created_at).toLocaleDateString()}</TableCell>
                          <TableCell>
                            <Button variant="ghost" size="icon" onClick={() => handleDeleteListing(l.id, l.title)}>
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Requests Tab */}
          <TabsContent value="requests">
            <Card>
              <CardHeader><CardTitle>Pickup Requests</CardTitle></CardHeader>
              <CardContent>
                {loading ? <p className="text-muted-foreground">Loading...</p> : requests.length === 0 ? (
                  <p className="text-muted-foreground">No requests yet.</p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Listing</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Volunteer</TableHead>
                        <TableHead>Created</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {requests.map((r) => (
                        <TableRow key={r.id}>
                          <TableCell className="font-medium max-w-[200px] truncate">{r.food_listings?.title || "—"}</TableCell>
                          <TableCell><Badge className={`${statusColor(r.status)} text-white text-xs`}>{statusLabel(r.status)}</Badge></TableCell>
                          <TableCell className="text-sm text-muted-foreground">{r.volunteer_id ? "Assigned" : "—"}</TableCell>
                          <TableCell className="text-muted-foreground text-sm">{new Date(r.created_at).toLocaleDateString()}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Reviews Tab */}
          <TabsContent value="reviews">
            <Card>
              <CardHeader><CardTitle>Review Moderation</CardTitle></CardHeader>
              <CardContent>
                {loading ? <p className="text-muted-foreground">Loading...</p> : reviews.length === 0 ? (
                  <p className="text-muted-foreground">No reviews yet.</p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Reviewer</TableHead>
                        <TableHead>Reviewed</TableHead>
                        <TableHead>Rating</TableHead>
                        <TableHead>Comment</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {reviews.map((r) => (
                        <TableRow key={r.id}>
                          <TableCell className="text-sm">{r.reviewer_name}</TableCell>
                          <TableCell className="text-sm">{r.reviewed_name}</TableCell>
                          <TableCell><StarRating value={r.rating} readonly size="sm" /></TableCell>
                          <TableCell className="max-w-[200px] truncate text-sm text-muted-foreground">{r.comment || "—"}</TableCell>
                          <TableCell>
                            <Button variant="ghost" size="icon" onClick={() => handleDeleteReview(r.id)}>
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Contacts Tab */}
          <TabsContent value="contacts">
            <Card>
              <CardHeader><CardTitle>Contact Messages</CardTitle></CardHeader>
              <CardContent>
                {loading ? <p className="text-muted-foreground">Loading...</p> : contacts.length === 0 ? (
                  <p className="text-muted-foreground">No contact messages yet.</p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Name</TableHead>
                        <TableHead>Email</TableHead>
                        <TableHead>Phone</TableHead>
                        <TableHead>Message</TableHead>
                        <TableHead>Date</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {contacts.map((c) => (
                        <TableRow key={c.id}>
                          <TableCell className="font-medium">{c.name}</TableCell>
                          <TableCell className="text-sm">{c.email}</TableCell>
                          <TableCell className="text-sm text-muted-foreground">{c.phone || "—"}</TableCell>
                          <TableCell className="max-w-[200px] truncate text-sm">{c.message}</TableCell>
                          <TableCell className="text-muted-foreground text-sm">{new Date(c.created_at).toLocaleDateString()}</TableCell>
                          <TableCell>
                            <Button variant="ghost" size="icon" onClick={() => handleDeleteContact(c.id)}>
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Complaints Tab */}
          <TabsContent value="complaints">
            <Card>
              <CardHeader><CardTitle>User Complaints</CardTitle></CardHeader>
              <CardContent>
                {loading ? <p className="text-muted-foreground">Loading...</p> : complaints.length === 0 ? (
                  <p className="text-muted-foreground">No complaints yet.</p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>User</TableHead>
                        <TableHead>Subject</TableHead>
                        <TableHead>Message</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Date</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {complaints.map((c) => (
                        <TableRow key={c.id}>
                          <TableCell className="font-medium text-sm">{c.user_name || "User"}</TableCell>
                          <TableCell className="text-sm">{c.subject}</TableCell>
                          <TableCell className="max-w-[180px] truncate text-sm text-muted-foreground">{c.message}</TableCell>
                          <TableCell>
                            <Badge className={`${c.status === "open" ? "bg-yellow-500" : "bg-green-500"} text-white text-xs capitalize`}>{c.status}</Badge>
                          </TableCell>
                          <TableCell className="text-muted-foreground text-sm">{new Date(c.created_at).toLocaleDateString()}</TableCell>
                          <TableCell className="flex gap-1">
                            <Button variant="ghost" size="icon" onClick={() => { setReplyDialog({ id: c.id, subject: c.subject }); setReplyText(c.admin_reply || ""); }}>
                              <Reply className="h-4 w-4 text-primary" />
                            </Button>
                            <Button variant="ghost" size="icon" onClick={() => handleDeleteComplaint(c.id)}>
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Audit Log Tab */}
          <TabsContent value="audit">
            <Card>
              <CardHeader><CardTitle>Admin Activity Log</CardTitle></CardHeader>
              <CardContent>
                {loading ? <p className="text-muted-foreground">Loading...</p> : auditLog.length === 0 ? (
                  <p className="text-muted-foreground">No activity recorded yet.</p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Admin</TableHead>
                        <TableHead>Action</TableHead>
                        <TableHead>Target</TableHead>
                        <TableHead>Details</TableHead>
                        <TableHead>Date</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {auditLog.map((entry) => (
                        <TableRow key={entry.id}>
                          <TableCell className="font-medium text-sm">{entry.admin_name || "Admin"}</TableCell>
                          <TableCell>
                            <Badge variant="outline" className="capitalize text-xs">
                              {entry.action.replace(/_/g, " ")}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground capitalize">{entry.target_type}</TableCell>
                          <TableCell className="max-w-[200px] truncate text-sm text-muted-foreground">
                            {entry.details?.user_name || entry.details?.reason || "—"}
                          </TableCell>
                          <TableCell className="text-muted-foreground text-sm">{new Date(entry.created_at).toLocaleString()}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* Confirmation Dialog */}
      <Dialog open={!!confirmAction} onOpenChange={() => setConfirmAction(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{confirmAction?.title}</DialogTitle>
            <DialogDescription>{confirmAction?.desc}</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmAction(null)}>Cancel</Button>
            <Button variant="destructive" onClick={confirmExec}>Confirm</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reply Dialog */}
      <Dialog open={!!replyDialog} onOpenChange={() => setReplyDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reply to: {replyDialog?.subject}</DialogTitle>
            <DialogDescription>Your reply will be visible to the user.</DialogDescription>
          </DialogHeader>
          <Textarea placeholder="Type your reply..." value={replyText} onChange={(e) => setReplyText(e.target.value)} rows={4} />
          <DialogFooter>
            <Button variant="outline" onClick={() => setReplyDialog(null)}>Cancel</Button>
            <Button onClick={handleReplyComplaint} disabled={!replyText.trim()}>Send Reply</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
