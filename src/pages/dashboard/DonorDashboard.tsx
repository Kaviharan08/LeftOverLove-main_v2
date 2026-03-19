import { useEffect, useState, useCallback, useMemo } from "react";
import { ImpactStats } from "@/components/ImpactStats";
import { Link } from "react-router-dom";
import { Navbar } from "@/components/Navbar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { LiveTrackingMap } from "@/components/LiveTrackingMap";
import { SkeletonGrid, SkeletonStatCards } from "@/components/SkeletonCard";
import { RequestTimeline } from "@/components/RequestTimeline";
import { DonationStreak } from "@/components/DonationStreak";
import { EmptyState } from "@/components/EmptyState";
import { ConfettiBurst } from "@/components/ConfettiBurst";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { fetchMyListings, deleteFoodListing } from "@/lib/food-listings";
import { fetchRequestsForDonor, statusLabel, statusColor, type PickupRequest } from "@/lib/pickup-requests";
import { useToast } from "@/hooks/use-toast";
import { Plus, Edit, Trash2, MapPin, Package, TrendingUp, CalendarDays, AlertTriangle } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from "recharts";
import type { Tables } from "@/integrations/supabase/types";
import donorBanner from "@/assets/donor-banner.jpg";

const CAT_COLORS: Record<string, string> = {
  cooked: "#1E7A5F", raw: "#2D9C78", packaged: "#5BC49A",
  baked: "#F59E0B", beverages: "#3B82F6", other: "#9CA3AF",
};
const STS_COLORS: Record<string, string> = {
  accepted: "#1E7A5F", expired: "#EF4444",
};
function pctLabel(o: any): string {
  return o.percent > 0.05 ? String(Math.round(o.percent * 100)) + "%" : "";
}
function fmtLegend(value: any): string {
  return String(value);
}

export default function DonorDashboard() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [listings, setListings] = useState<Tables<"food_listings">[]>([]);
  const [requests, setRequests] = useState<PickupRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [chartView, setChartView] = useState<"week" | "month">("week");
  const [confetti, setConfetti] = useState(false);
  const [prevCompleted, setPrevCompleted] = useState(0);

  const loadData = useCallback(() => {
    if (!user) return;
    setLoading(true);
    Promise.all([
      fetchMyListings(user.id),
      fetchRequestsForDonor(user.id),
    ]).then(([l, r]) => { setListings(l); setRequests(r); }).catch(() => {}).finally(() => setLoading(false));
  }, [user]);

  useEffect(() => { loadData(); }, [loadData]);

  useEffect(() => {
    if (!user) return;
    const channel = supabase
      .channel("donor-dashboard")
      .on("postgres_changes", { event: "*", schema: "public", table: "pickup_requests" }, () => loadData())
      .on("postgres_changes", { event: "*", schema: "public", table: "food_listings" }, () => loadData())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [user, loadData]);

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this listing?")) return;
    try {
      await deleteFoodListing(id);
      toast({ title: "✅ Deleted", description: "Listing removed successfully." });
      loadData();
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
  };

  // Cross-check requests for accurate status display
  const confirmedListingIds = new Set(requests.filter((r) => r.status === "confirmed").map((r) => r.listing_id));
  const claimedListingIds = new Set(requests.filter((r) => r.status !== "cancelled" && r.status !== "confirmed").map((r) => r.listing_id));

  const active = listings.filter((l) => l.status === "available" && !confirmedListingIds.has(l.id) && !claimedListingIds.has(l.id)).length;
  const completed = listings.filter((l) => l.status === "completed" || confirmedListingIds.has(l.id)).length;
  const claimed = listings.filter((l) => (l.status === "claimed" || claimedListingIds.has(l.id)) && !confirmedListingIds.has(l.id)).length;

  // Trigger confetti when a new completion happens
  useEffect(() => {
    if (completed > prevCompleted && prevCompleted > 0) setConfetti(true);
    setPrevCompleted(completed);
  }, [completed]);

  // Expiring soon warning (within 24h)
  const expiringSoon = listings.filter((l) => {
    if (!l.expires_at) return false;
    // Only warn for truly active listings (not completed, not claimed by confirmed request)
    if (confirmedListingIds.has(l.id)) return false;
    if (!["available", "expiring_soon"].includes(l.status)) return false;
    const hoursLeft = (new Date(l.expires_at).getTime() - Date.now()) / 3600000;
    return hoursLeft > 0 && hoursLeft <= 24;
  });

  const now = new Date();
  const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const weeklyCount = listings.filter((l) => new Date(l.created_at) >= weekAgo).length;
  const monthlyCount = listings.filter((l) => new Date(l.created_at) >= monthAgo).length;

  const chartData = useMemo(() => {
    if (chartView === "week") {
      return Array.from({ length: 7 }, (_, i) => {
        const d = new Date(now.getTime() - (6 - i) * 86400000);
        return {
          name: d.toLocaleDateString("en", { weekday: "short" }),
          count: listings.filter((l) => new Date(l.created_at).toDateString() === d.toDateString()).length,
        };
      });
    } else {
      return Array.from({ length: 4 }, (_, i) => {
        const start = new Date(now.getTime() - (4 - i) * 7 * 86400000);
        const end = new Date(now.getTime() - (3 - i) * 7 * 86400000);
        return {
          name: `Week ${i + 1}`,
          count: listings.filter((l) => { const c = new Date(l.created_at); return c >= start && c < end; }).length,
        };
      });
    }
  }, [listings, chartView]);

  const trackableRequest = requests.find((r) => ["volunteer_accepted", "picked_up"].includes(r.status));

  const categoryChartData = useMemo(() => {
    const counts: Record<string, number> = {};
    listings.forEach((l) => {
      const cat = (l as any).category || "other";
      counts[cat] = (counts[cat] || 0) + 1;
    });
    return Object.entries(counts)
      .map(([k, v]) => ({ name: k.charAt(0).toUpperCase() + k.slice(1), value: v, key: k }))
      .filter((d) => d.value > 0)
      .sort((a, b) => b.value - a.value);
  }, [listings]);

  const statusChartData = useMemo(() => {
    const acc = listings.filter((l) => l.status === "completed" || confirmedListingIds.has(l.id)).length;
    const exp = listings.filter((l) => l.status === "expired").length;
    return [
      { name: "Accepted", value: acc, key: "accepted" },
      { name: "Expired",  value: exp, key: "expired"  },
    ].filter((d) => d.value > 0);
  }, [listings, confirmedListingIds]);

  const statCards = [
    { label: "Active Listings", value: active, color: "text-primary" },
    { label: "Completed",       value: completed, color: "text-green-600 dark:text-green-400" },
    { label: "Claimed",         value: claimed, color: "text-accent" },
    { label: "Active Requests", value: requests.filter(r => !["cancelled","confirmed"].includes(r.status)).length, color: "text-accent" },
  ];

  return (
    <div className="min-h-screen">
      <Navbar />
      <div className="container mx-auto px-4 py-8">

        {/* Banner */}
        <div className="relative mb-8 overflow-hidden rounded-2xl shadow-md">
          <img src={donorBanner} alt="Food donation" className="h-44 w-full object-cover dark:opacity-70" loading="lazy" />
          <div className="absolute inset-0 bg-gradient-to-r from-background/95 via-background/70 to-transparent flex items-center px-8">
            <div>
              <h2 className="text-2xl font-bold">Every donation counts! 🌱</h2>
              <p className="mt-1 text-muted-foreground">Your generosity helps feed communities and reduce waste.</p>
            </div>
          </div>
        </div>

        {/* Expiry warning */}
        {expiringSoon.length > 0 && (
          <div className="mb-6 flex items-center gap-3 rounded-xl border border-yellow-300 bg-yellow-50 dark:border-yellow-800/40 dark:bg-yellow-950/20 px-4 py-3 animate-fade-in-up">
            <AlertTriangle className="h-5 w-5 shrink-0 text-yellow-600 dark:text-yellow-400" />
            <p className="text-sm text-yellow-700 dark:text-yellow-300">
              <span className="font-semibold">{expiringSoon.length} listing{expiringSoon.length > 1 ? "s" : ""}</span> expire{expiringSoon.length === 1 ? "s" : ""} within 24 hours — consider editing to extend.
            </p>
          </div>
        )}

        {/* Donation streak */}
        <div className="mb-6">
          <DonationStreak listings={listings} />
        </div>

        <div className="mb-6 flex items-center justify-between">
          <h1 className="text-3xl font-bold">Donor Dashboard</h1>
          <Button asChild className="shadow-sm shadow-primary/20">
            <Link to="/food/create"><Plus className="mr-1 h-4 w-4" /> New Listing</Link>
          </Button>
        </div>

        {/* Stats */}
        {loading ? (
          <div className="mb-8"><SkeletonStatCards count={4} /></div>
        ) : (
          <div className="relative mb-8">
            <ConfettiBurst trigger={confetti} onDone={() => setConfetti(false)} />
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 stagger-children">
              {statCards.map((s) => (
                <Card key={s.label} className="animate-fade-in-up hover:shadow-md transition-shadow">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">{s.label}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className={`text-3xl font-bold ${s.color}`}>{s.value}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* Analytics */}
        <div className="mb-8">
          <h2 className="mb-3 text-lg font-semibold flex items-center gap-2"><TrendingUp className="h-5 w-5 text-primary" /> Donation Analytics</h2>
          <div className="grid gap-4 sm:grid-cols-2 mb-4">
            <Card className="border-primary/20 hover:shadow-md transition-shadow">
              <CardContent className="flex items-center gap-4 p-4">
                <div className="rounded-lg bg-primary/10 p-3"><CalendarDays className="h-5 w-5 text-primary" /></div>
                <div>
                  <p className="text-sm text-muted-foreground">This Week</p>
                  <p className="text-2xl font-bold text-primary">{weeklyCount} donations</p>
                </div>
              </CardContent>
            </Card>
            <Card className="border-accent/20 hover:shadow-md transition-shadow">
              <CardContent className="flex items-center gap-4 p-4">
                <div className="rounded-lg bg-accent/10 p-3"><TrendingUp className="h-5 w-5 text-accent" /></div>
                <div>
                  <p className="text-sm text-muted-foreground">This Month</p>
                  <p className="text-2xl font-bold text-accent">{monthlyCount} donations</p>
                </div>
              </CardContent>
            </Card>
          </div>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm">Donations Over Time</CardTitle>
              <div className="flex gap-1">
                <Button size="sm" variant={chartView === "week" ? "default" : "outline"} onClick={() => setChartView("week")}>Week</Button>
                <Button size="sm" variant={chartView === "month" ? "default" : "outline"} onClick={() => setChartView("month")}>Month</Button>
              </div>
            </CardHeader>
            <CardContent className="h-[220px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                  <YAxis allowDecimals={false} />
                  <Tooltip />
                  <Bar dataKey="count" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} name="Donations" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Pie charts */}
          <div className="grid gap-4 sm:grid-cols-2 mt-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Food Type Breakdown</CardTitle>
              </CardHeader>
              <CardContent>
                {categoryChartData.length === 0 ? (
                  <div className="flex h-48 items-center justify-center text-sm text-muted-foreground">No donations yet</div>
                ) : (
                  <ResponsiveContainer width="100%" height={200}>
                    <PieChart>
                      <Pie data={categoryChartData} cx="50%" cy="50%" outerRadius={70} dataKey="value" labelLine={false} label={pctLabel}>
                        {categoryChartData.map((entry) => (
                          <Cell key={entry.key} fill={CAT_COLORS[entry.key] || "#9CA3AF"} />
                        ))}
                      </Pie>
                      <Tooltip />
                      <Legend formatter={fmtLegend} />
                    </PieChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Accepted vs Expired</CardTitle>
              </CardHeader>
              <CardContent>
                {statusChartData.length === 0 ? (
                  <div className="flex h-48 items-center justify-center text-sm text-muted-foreground">No completed or expired listings yet</div>
                ) : (
                  <ResponsiveContainer width="100%" height={200}>
                    <PieChart>
                      <Pie data={statusChartData} cx="50%" cy="50%" outerRadius={70} dataKey="value" labelLine={false} label={pctLabel}>
                        {statusChartData.map((entry) => (
                          <Cell key={entry.key} fill={STS_COLORS[entry.key] || "#9CA3AF"} />
                        ))}
                      </Pie>
                      <Tooltip />
                      <Legend formatter={fmtLegend} />
                    </PieChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Impact */}
        <div className="mb-8">
          <h2 className="mb-3 text-lg font-semibold">Your Impact</h2>
          <ImpactStats userId={user?.id} role="donor" variant="compact" />
        </div>

        {/* Live tracking */}
        {trackableRequest && (
          <div className="mb-8">
            <h2 className="mb-3 text-lg font-semibold">📍 Live Delivery Tracking</h2>
            <Card>
              <CardContent className="p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold">{trackableRequest.food_listings?.title}</h3>
                  <Badge className={`${statusColor(trackableRequest.status)} text-white`}>{statusLabel(trackableRequest.status)}</Badge>
                </div>
                <RequestTimeline status={trackableRequest.status} selfPickup={trackableRequest.self_pickup} volunteerId={trackableRequest.volunteer_id} />
                <LiveTrackingMap
                  requestId={trackableRequest.id}
                  pickupLat={trackableRequest.food_listings?.latitude}
                  pickupLng={trackableRequest.food_listings?.longitude}
                  deliveryLat={(trackableRequest as any).delivery_lat}
                  deliveryLng={(trackableRequest as any).delivery_lng}
                  volunteerLat={trackableRequest.volunteer_lat}
                  volunteerLng={trackableRequest.volunteer_lng}
                  status={trackableRequest.status}
                />
              </CardContent>
            </Card>
          </div>
        )}

        {/* Requests */}
        {requests.length > 0 && (
          <>
            <h2 className="mb-4 text-xl font-semibold flex items-center gap-2"><Package className="h-5 w-5" /> Requests</h2>
            <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3 stagger-children">
              {requests.map((req) => (
                <Card key={req.id} className={`animate-fade-in-up transition-shadow hover:shadow-md ${req.status === "cancelled" ? "opacity-50" : ""}`}>
                  <CardContent className="p-4 space-y-3">
                    <div className="flex items-start justify-between gap-2">
                      <h3 className="font-semibold line-clamp-1">{req.food_listings?.title || "Listing"}</h3>
                      <Badge className={`${statusColor(req.status)} text-white shrink-0 text-xs`}>{statusLabel(req.status)}</Badge>
                    </div>
                    {/* Step timeline */}
                    {!["cancelled", "pending"].includes(req.status) && (
                      <RequestTimeline status={req.status} selfPickup={req.self_pickup} volunteerId={req.volunteer_id} />
                    )}
                    {req.note && <p className="text-sm text-muted-foreground italic line-clamp-2">"{req.note}"</p>}
                    <p className="text-xs text-muted-foreground">Requested {new Date(req.created_at).toLocaleDateString()}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </>
        )}

        {/* My Listings */}
        <h2 className="mb-4 text-xl font-semibold">My Listings</h2>
        {loading ? (
          <SkeletonGrid count={6} />
        ) : listings.length === 0 ? (
          <EmptyState
            icon="🍽️"
            title="No listings yet"
            description="Your first donation is one click away! Share surplus food with your community."
            action={{ label: "Create First Listing", to: "/food/create" }}
          />
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 stagger-children">
            {listings.map((listing) => {
              const hasConfirmedRequest = requests.some((r) => r.listing_id === listing.id && r.status === "confirmed");
              const hasActiveRequest    = requests.some((r) => r.listing_id === listing.id && !["cancelled", "confirmed"].includes(r.status));
              const displayStatus = hasConfirmedRequest ? "completed" : hasActiveRequest ? "claimed" : listing.status;
              const badgeClass =
                displayStatus === "available"    ? "bg-primary text-primary-foreground" :
                displayStatus === "completed"    ? "bg-green-600 text-white" :
                displayStatus === "claimed"      ? "bg-accent text-accent-foreground" :
                displayStatus === "expired"      ? "bg-destructive text-destructive-foreground" :
                displayStatus === "expiring_soon"? "bg-yellow-500 text-white" :
                "bg-secondary text-secondary-foreground";

              // Expiry warning only for active listings
              const hoursLeft = listing.expires_at
                ? (new Date(listing.expires_at).getTime() - Date.now()) / 3600000
                : null;
              const isCompleted = displayStatus === "completed";
              const isUrgent = !isCompleted && hoursLeft !== null && hoursLeft > 0 && hoursLeft <= 24;

              return (
                <Card key={listing.id} className={`animate-fade-in-up overflow-hidden transition-shadow hover:shadow-lg ${isUrgent ? "border-yellow-400 dark:border-yellow-700" : ""}`}>
                  {listing.image_url ? (
                    <img src={listing.image_url} alt={listing.title} className="h-36 w-full object-cover" />
                  ) : (
                    <div className="h-36 w-full bg-muted flex items-center justify-center text-4xl">🍽️</div>
                  )}
                  {isUrgent && (
                    <div className="bg-yellow-50 dark:bg-yellow-950/30 border-b border-yellow-200 dark:border-yellow-800/40 px-3 py-1.5 flex items-center gap-2">
                      <AlertTriangle className="h-3.5 w-3.5 text-yellow-600 dark:text-yellow-400 shrink-0" />
                      <span className="text-xs font-medium text-yellow-700 dark:text-yellow-300">
                        Expires in {Math.ceil(hoursLeft!)}h
                      </span>
                    </div>
                  )}
                  <CardContent className="p-4">
                    <div className="mb-2 flex items-start justify-between gap-2">
                      <h3 className="font-semibold line-clamp-1">{listing.title}</h3>
                      <Badge className={`shrink-0 text-xs capitalize ${badgeClass}`}>{displayStatus}</Badge>
                    </div>
                    {(listing.quantity || listing.weight_kg) && (
                      <p className="mb-1 text-xs text-muted-foreground">
                        {listing.quantity && `${listing.quantity} items`}
                        {listing.quantity && listing.weight_kg && " · "}
                        {listing.weight_kg && `${listing.weight_kg} kg`}
                      </p>
                    )}
                    {listing.pickup_address && (
                      <p className={`flex items-center gap-1 text-xs text-muted-foreground ${isCompleted ? "" : "mb-3"}`}><MapPin className="h-3 w-3" />{listing.pickup_address}</p>
                    )}
                    {!isCompleted && (
                      <div className="flex gap-2 mt-3">
                        <Button size="sm" variant="outline" asChild><Link to={`/food/edit/${listing.id}`}><Edit className="mr-1 h-3 w-3" /> Edit</Link></Button>
                        <Button size="sm" variant="ghost" className="text-destructive hover:bg-destructive/10" onClick={() => handleDelete(listing.id)}><Trash2 className="h-3 w-3" /></Button>
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
