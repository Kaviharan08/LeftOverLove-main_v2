import { useEffect, useState, useCallback } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Navbar } from "@/components/Navbar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ImpactStats } from "@/components/ImpactStats";
import { LiveTrackingMap } from "@/components/LiveTrackingMap";
import { supabase } from "@/integrations/supabase/client";
import { fetchFoodListings } from "@/lib/food-listings";
import {
  fetchRequestsForReceiver,
  cancelRequest,
  requestVolunteer,
  confirmDelivery,
  statusLabel,
  statusColor,
  type PickupRequest,
} from "@/lib/pickup-requests";
import { useAuth } from "@/lib/auth";
import { useToast } from "@/hooks/use-toast";
import { Building2, MapPin, Search, Package, X, Truck, CheckCircle, ShieldCheck } from "lucide-react";
import type { Tables } from "@/integrations/supabase/types";

export default function NGODashboard() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const [listings, setListings] = useState<Tables<"food_listings">[]>([]);
  const [requests, setRequests] = useState<PickupRequest[]>([]);
  const [org, setOrg] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(() => {
    if (!user) return;
    setLoading(true);
    Promise.all([
      fetchFoodListings("available"),
      fetchRequestsForReceiver(user.id),
      supabase.from("organizations").select("*").eq("user_id", user.id).maybeSingle(),
    ]).then(([l, r, orgRes]) => {
      const now = new Date();
      const activeRequestedIds = new Set(
        r.filter((req) => req.status !== "cancelled").map((req) => req.listing_id)
      );
      const activeFoods = l.filter(
        (listing) =>
          listing.status === "available" &&
          (!listing.expires_at || new Date(listing.expires_at) > now) &&
          !activeRequestedIds.has(listing.id)
      );
      setListings(activeFoods);
      setRequests(r);
      setOrg(orgRes.data ?? null);
    }).catch(() => {}).finally(() => setLoading(false));
  }, [user]);

  useEffect(() => { loadData(); }, [loadData]);

  useEffect(() => {
    if (!user) return;
    const channel = supabase
      .channel("ngo-dashboard")
      .on("postgres_changes", { event: "*", schema: "public", table: "pickup_requests" }, () => loadData())
      .on("postgres_changes", { event: "*", schema: "public", table: "food_listings" }, () => loadData())
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "food_listings" }, (payload) => {
        const listing = payload.new as any;
        if (listing?.status === "available") {
          toast({
            title: "🍱 New food available!",
            description: `"${listing.title || "Food"}" was just posted — claim it for your organization!`,
          });
        }
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [user, loadData]);

  const handleCancel = async (req: PickupRequest) => {
    if (!confirm("Cancel this request?")) return;
    try {
      await cancelRequest(req.id, req.listing_id);
      toast({ title: "Request cancelled" });
      loadData();
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
  };

  const handleRequestVolunteer = async (req: PickupRequest) => {
    try {
      await requestVolunteer(req.id);
      toast({ title: "Volunteer requested!" });
      loadData();
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
  };

  const handleConfirmDelivery = async (req: PickupRequest) => {
    try {
      await confirmDelivery(req.id);
      toast({ title: "Delivery confirmed!" });
      loadData();
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
  };

  const activeRequests = requests.filter((r) => !["cancelled", "confirmed"].includes(r.status));
  const completedRequests = requests.filter((r) => r.status === "confirmed");
  const trackableRequest = requests.find((r) => ["volunteer_accepted", "picked_up"].includes(r.status));

  // Exclude listings this NGO has ANY request for (active, completed, or cancelled)
  // This prevents ever re-showing food that was already delivered/completed
  const myRequestedListingIds = new Set(
    requests.filter((r) => r.status !== "cancelled").map((r) => r.listing_id)
  );
  const availableListings = listings.filter((l) => !myRequestedListingIds.has(l.id));

  return (
    <div className="min-h-screen">
      <Navbar />
      <div className="container mx-auto px-4 py-8">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-2">
              <Building2 className="h-7 w-7 text-primary" />
              NGO Dashboard
            </h1>
            {org && (
              <div className="mt-1 flex items-center gap-2">
                <span className="text-muted-foreground">{org.org_name}</span>
                {org.verified ? (
                  <Badge className="bg-green-600 text-white text-xs"><ShieldCheck className="h-3 w-3 mr-1" /> Verified</Badge>
                ) : (
                  <Badge variant="outline" className="text-xs text-yellow-600 border-yellow-400">Pending Verification</Badge>
                )}
              </div>
            )}
          </div>
          <Button asChild><Link to="/browse"><Search className="mr-1 h-4 w-4" /> Browse Food</Link></Button>
        </div>

        <div className="mb-8">
          <ImpactStats userId={user?.id} role="ngo" />
        </div>

        <div className="mb-8 grid gap-4 sm:grid-cols-3">
          <Card><CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">Available Food</CardTitle></CardHeader><CardContent><p className="text-3xl font-bold text-primary">{availableListings.length}</p></CardContent></Card>
          <Card><CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">Active Requests</CardTitle></CardHeader><CardContent><p className="text-3xl font-bold text-primary">{activeRequests.length}</p></CardContent></Card>
          <Card><CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">Received</CardTitle></CardHeader><CardContent><p className="text-3xl font-bold text-primary">{completedRequests.length}</p></CardContent></Card>
        </div>

        {/* Live Tracking */}
        {trackableRequest && (
          <div className="mb-8">
            <LiveTrackingMap
              requestId={trackableRequest.id}
              pickupLat={trackableRequest.food_listings?.latitude}
              pickupLng={trackableRequest.food_listings?.longitude}
              volunteerLat={trackableRequest.volunteer_lat}
              volunteerLng={trackableRequest.volunteer_lng}
              status={trackableRequest.status}
            />
          </div>
        )}

        {/* Active Requests */}
        {activeRequests.length > 0 && (
          <>
            <h2 className="mb-4 text-xl font-semibold flex items-center gap-2"><Package className="h-5 w-5" /> Active Requests</h2>
            <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {activeRequests.map((req) => (
                <Card key={req.id}>
                  <CardContent className="p-4 space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <h3 className="font-semibold line-clamp-1 cursor-pointer hover:text-primary" onClick={() => navigate(`/food/${req.listing_id}`)}>{req.food_listings?.title || "Listing"}</h3>
                      <Badge className={`${statusColor(req.status)} text-white shrink-0 text-xs`}>{statusLabel(req.status)}</Badge>
                    </div>
                    {req.food_listings?.pickup_address && (
                      <p className="flex items-center gap-1 text-xs text-muted-foreground"><MapPin className="h-3 w-3" />{req.food_listings.pickup_address}</p>
                    )}
                    <div className="flex flex-wrap gap-2 pt-1">
                      {req.status === "accepted" && (
                        <>
                          <Button size="sm" variant="outline" onClick={() => handleRequestVolunteer(req)}>
                            <Truck className="mr-1 h-3 w-3" /> Request Volunteer
                          </Button>
                          <Button size="sm" variant="ghost" className="text-destructive" onClick={() => handleCancel(req)}>
                            <X className="mr-1 h-3 w-3" /> Cancel
                          </Button>
                        </>
                      )}
                      {(req.status === "volunteer_accepted" || req.status === "picked_up") && (
                        <div className="w-full space-y-2">
                          <p className="text-xs text-blue-500 font-medium flex items-center gap-1.5">
                            <span className="relative flex h-2 w-2">
                              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-blue-400 opacity-75" />
                              <span className="relative inline-flex h-2 w-2 rounded-full bg-blue-500" />
                            </span>
                            {req.status === "volunteer_accepted" ? "Volunteer is on the way" : "Food is on the way to you!"}
                          </p>
                          {(req as any).delivery_otp && (
                            <div className="rounded-lg border-2 border-primary/30 bg-primary/5 px-3 py-2 text-center">
                              <p className="text-xs text-muted-foreground mb-1">Share this OTP with the volunteer:</p>
                              <p className="text-2xl font-bold tracking-widest text-primary">{(req as any).delivery_otp}</p>
                            </div>
                          )}
                        </div>
                      )}
                      {req.status === "delivered" && (
                        <Button size="sm" onClick={() => handleConfirmDelivery(req)}>
                          <CheckCircle className="mr-1 h-3 w-3" /> Confirm Received
                        </Button>
                      )}
                      {req.status === "pending" && (
                        <Button size="sm" variant="ghost" className="text-destructive" onClick={() => handleCancel(req)}>
                          <X className="mr-1 h-3 w-3" /> Cancel
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </>
        )}

        {/* Completed Requests history — collapsed summary */}
        {completedRequests.length > 0 && (
          <details className="mb-8">
            <summary className="mb-3 cursor-pointer text-sm font-medium text-muted-foreground hover:text-foreground select-none">
              View completed requests ({completedRequests.length})
            </summary>
            <div className="mt-3 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {completedRequests.map((req) => (
                <Card key={req.id} className="opacity-60">
                  <CardContent className="p-4 space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <h3 className="font-semibold line-clamp-1 text-sm">{req.food_listings?.title || "Listing"}</h3>
                      <Badge className="bg-green-700 text-white shrink-0 text-xs">Completed</Badge>
                    </div>
                    {req.food_listings?.pickup_address && (
                      <p className="flex items-center gap-1 text-xs text-muted-foreground"><MapPin className="h-3 w-3" />{req.food_listings.pickup_address}</p>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          </details>
        )}

        {/* Available Food */}
        <h2 className="mb-4 text-xl font-semibold">Available Food Nearby</h2>
        {loading ? (
          <p className="text-muted-foreground">Loading...</p>
        ) : availableListings.length === 0 ? (
          <Card><CardContent className="py-12 text-center text-muted-foreground">No available listings right now.</CardContent></Card>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {availableListings.slice(0, 9).map((listing) => (
              <Card key={listing.id} className="cursor-pointer transition-shadow hover:shadow-lg" onClick={() => navigate(`/food/${listing.id}`)}>
                {listing.image_url && <img src={listing.image_url} alt={listing.title} className="h-36 w-full object-cover rounded-t-lg" />}
                <CardContent className="p-4">
                  <h3 className="mb-1 font-semibold">{listing.title}</h3>
                  {listing.pickup_address && <p className="flex items-center gap-1 text-xs text-muted-foreground"><MapPin className="h-3 w-3" />{listing.pickup_address}</p>}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
