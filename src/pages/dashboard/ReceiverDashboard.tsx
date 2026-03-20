import { useEffect, useState, useCallback } from "react";
import { ImpactStats } from "@/components/ImpactStats";
import { useNavigate, Link } from "react-router-dom";
import { Navbar } from "@/components/Navbar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { FoodMap } from "@/components/FoodMap";
import { LiveTrackingMap } from "@/components/LiveTrackingMap";
import { SmartFoodRecommendations } from "@/components/SmartFoodRecommendations";
import { DeliveryLocationPicker } from "@/components/DeliveryLocationPicker";
import { SkeletonGrid, SkeletonStatCards } from "@/components/SkeletonCard";
import { RequestTimeline } from "@/components/RequestTimeline";
import { EmptyState } from "@/components/EmptyState";
import { ConfettiBurst } from "@/components/ConfettiBurst";
import { supabase } from "@/integrations/supabase/client";
import { fetchFoodListings } from "@/lib/food-listings";
import {
  fetchRequestsForReceiver, cancelRequest, requestVolunteer,
  confirmDelivery, completeSelfPickup, statusLabel, statusColor, type PickupRequest,
} from "@/lib/pickup-requests";
import { useAuth } from "@/lib/auth";
import { useToast } from "@/hooks/use-toast";
import { MapPin, Search, Package, X, Truck, CheckCircle, Clock } from "lucide-react";
import { formatSLDate } from "@/lib/timezone";
import type { Tables } from "@/integrations/supabase/types";
import receiverBanner from "@/assets/receiver-banner.jpg";
import foodPlaceholder from "@/assets/food-placeholder.jpg";

export default function ReceiverDashboard() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const [listings, setListings] = useState<Tables<"food_listings">[]>([]);
  const [requests, setRequests] = useState<PickupRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [volunteerPickerReq, setVolunteerPickerReq] = useState<PickupRequest | null>(null);
  const [volunteerRequesting, setVolunteerRequesting] = useState(false);
  const [confetti, setConfetti] = useState(false);
  const [prevCompleted, setPrevCompleted] = useState(0);

  const loadData = useCallback(() => {
    if (!user) return;
    setLoading(true);
    Promise.all([
      fetchFoodListings("available"),
      fetchRequestsForReceiver(user.id),
    ]).then(([l, r]) => {
      const now = new Date();
      // Build set of listing IDs this user has active (non-cancelled) requests for
      const activeRequestedIds = new Set(
        r.filter((req) => req.status !== "cancelled").map((req) => req.listing_id)
      );
      // Only show truly available, non-expired listings that aren't already claimed by this user
      const activeFoods = l.filter(
        (listing) =>
          listing.status === "available" &&
          (!listing.expires_at || new Date(listing.expires_at) > now) &&
          !activeRequestedIds.has(listing.id)
      );
      setListings(activeFoods);
      setRequests(r);
    }).catch(() => {}).finally(() => setLoading(false));
  }, [user]);

  useEffect(() => { loadData(); }, [loadData]);

  useEffect(() => {
    if (!user) return;
    const channel = supabase.channel("receiver-dashboard")
      .on("postgres_changes", { event: "*", schema: "public", table: "pickup_requests" }, () => loadData())
      .on("postgres_changes", { event: "*", schema: "public", table: "food_listings" }, () => loadData())
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

  const handleRequestVolunteer = async (lat: number, lng: number) => {
    if (!volunteerPickerReq) return;
    setVolunteerRequesting(true);
    try {
      await requestVolunteer(volunteerPickerReq.id, lat, lng);
      toast({ title: "🚗 Volunteer requested!", description: "A volunteer will be assigned soon." });
      setVolunteerPickerReq(null);
      loadData();
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally { setVolunteerRequesting(false); }
  };

  const handleConfirmDelivery = async (req: PickupRequest) => {
    try {
      await confirmDelivery(req.id);
      toast({ title: "🎉 Delivery confirmed!", description: "Thank you! The listing is now completed." });
      setConfetti(true);
      loadData();
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
  };

  const handleSelfPickupComplete = async (req: PickupRequest) => {
    if (!confirm("Confirm you have picked up this food?")) return;
    try {
      await completeSelfPickup(req.id);
      toast({ title: "🎉 Pickup completed!", description: "Thank you! The listing is now completed." });
      setConfetti(true);
      loadData();
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
  };

  const activeRequests = requests.filter((r) => !["cancelled", "confirmed"].includes(r.status));
  const completedRequests = requests.filter((r) => r.status === "confirmed");
  const trackableRequest = requests.find((r) => ["volunteer_accepted", "picked_up"].includes(r.status));

  // Trigger confetti on new completion
  useEffect(() => {
    if (completedRequests.length > prevCompleted && prevCompleted > 0) setConfetti(true);
    setPrevCompleted(completedRequests.length);
  }, [completedRequests.length]);

  // Exclude active + completed requests but NOT cancelled — cancelled means food is available again
  const myRequestedListingIds = new Set(
    requests
      .filter((r) => r.status !== "cancelled")
      .map((r) => r.listing_id)
  );
  const availableListings = listings.filter((l) => !myRequestedListingIds.has(l.id));

  const statCards = [
    { label: "Available Food", value: availableListings.length, color: "text-primary" },
    { label: "Active Requests", value: activeRequests.length, color: "text-accent" },
    { label: "Completed", value: completedRequests.length, color: "text-green-600 dark:text-green-400" },
  ];

  return (
    <div className="min-h-screen">
      <Navbar />
      <div className="container mx-auto px-4 py-8">

        {/* Banner */}
        <div className="relative mb-8 overflow-hidden rounded-2xl shadow-md">
          <img src={receiverBanner} alt="Community food support" className="h-44 w-full object-cover dark:opacity-70" loading="lazy" />
          <div className="absolute inset-0 bg-gradient-to-r from-background/95 via-background/70 to-transparent flex items-center px-8">
            <div>
              <h2 className="text-2xl font-bold">Food for everyone 💚</h2>
              <p className="mt-1 text-muted-foreground">Find free food near you from generous donors.</p>
            </div>
          </div>
        </div>

        <div className="mb-6 flex items-center justify-between">
          <h1 className="text-3xl font-bold">Receiver Dashboard</h1>
          <Button asChild><Link to="/browse"><Search className="mr-1 h-4 w-4" /> Browse All</Link></Button>
        </div>

        {/* Stats */}
        {loading ? (
          <div className="mb-8"><SkeletonStatCards count={3} /></div>
        ) : (
          <div className="relative mb-8">
            <ConfettiBurst trigger={confetti} onDone={() => setConfetti(false)} />
            <div className="grid gap-4 sm:grid-cols-3 stagger-children">
              {statCards.map((s) => (
                <Card key={s.label} className="animate-fade-in-up hover:shadow-md transition-shadow">
                  <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">{s.label}</CardTitle></CardHeader>
                  <CardContent><p className={`text-3xl font-bold ${s.color}`}>{s.value}</p></CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* Impact */}
        <div className="mb-8">
          <h2 className="mb-3 text-lg font-semibold">Your Impact</h2>
          <ImpactStats userId={user?.id} role="receiver" variant="compact" />
        </div>

        {/* Live tracking */}
        {trackableRequest && (
          <div className="mb-8">
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
          </div>
        )}

        <DeliveryLocationPicker
          open={!!volunteerPickerReq}
          onOpenChange={(open) => { if (!open) setVolunteerPickerReq(null); }}
          onConfirm={handleRequestVolunteer}
          loading={volunteerRequesting}
        />

        {/* My Requests — active only shown by default */}
        {activeRequests.length > 0 && (
          <>
            <h2 className="mb-4 text-xl font-semibold flex items-center gap-2"><Package className="h-5 w-5" /> My Requests</h2>
            <div className="mb-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3 stagger-children">
              {activeRequests.map((req) => (
                <Card key={req.id} className="animate-fade-in-up transition-shadow hover:shadow-md">
                  <CardContent className="p-4 space-y-3">
                    <div className="flex items-start justify-between gap-2">
                      <h3 className="font-semibold line-clamp-1 cursor-pointer hover:text-primary" onClick={() => navigate(`/food/${req.listing_id}`)}>
                        {req.food_listings?.title || "Listing"}
                      </h3>
                      <Badge className={`${statusColor(req.status)} text-white shrink-0 text-xs`}>{statusLabel(req.status)}</Badge>
                    </div>

                    {/* Step timeline */}
                    {!["cancelled", "pending"].includes(req.status) && (
                      <RequestTimeline status={req.status} selfPickup={req.self_pickup} volunteerId={req.volunteer_id} />
                    )}

                    {req.food_listings?.pickup_address && (
                      <p className="flex items-center gap-1 text-xs text-muted-foreground"><MapPin className="h-3 w-3" />{req.food_listings.pickup_address}</p>
                    )}
                    <p className="text-xs text-muted-foreground">Requested {formatSLDate(req.created_at)}</p>

                    <div className="flex flex-wrap gap-2 pt-1">
                      {req.status === "accepted" && (
                        <>
                          <Button size="sm" onClick={() => handleSelfPickupComplete(req)} className="gap-1">
                            <CheckCircle className="h-3 w-3" /> I Picked It Up
                          </Button>
                          <Button size="sm" variant="outline" onClick={() => setVolunteerPickerReq(req)} className="gap-1">
                            <Truck className="h-3 w-3" /> Request Volunteer
                          </Button>
                          <Button size="sm" variant="ghost" className="text-destructive" onClick={() => handleCancel(req)}>
                            <X className="h-3 w-3" />
                          </Button>
                        </>
                      )}
                      {req.status === "volunteer_requested" && (
                        <p className="flex items-center gap-1.5 text-xs text-purple-500 font-medium">
                          <Clock className="h-3 w-3" /> Waiting for a volunteer...
                        </p>
                      )}
                      {(req.status === "volunteer_accepted" || req.status === "picked_up") && (
                        <p className="text-xs text-blue-500 font-medium flex items-center gap-1.5">
                          <span className="relative flex h-2 w-2">
                            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-blue-400 opacity-75" />
                            <span className="relative inline-flex h-2 w-2 rounded-full bg-blue-500" />
                          </span>
                          {req.status === "volunteer_accepted" ? "Volunteer is on the way to pick up" : "Food is on the way to you!"}
                        </p>
                      )}
                      {req.status === "delivered" && (
                        <Button size="sm" onClick={() => handleConfirmDelivery(req)} className="gap-1 bg-green-600 hover:bg-green-700 text-white">
                          <CheckCircle className="h-3 w-3" /> Confirm Received
                        </Button>
                      )}
                      {req.status === "pending" && (
                        <Button size="sm" variant="ghost" className="text-destructive" onClick={() => handleCancel(req)}>
                          <X className="h-3 w-3" /> Cancel
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </>
        )}

        {/* Past requests — collapsed by default */}
        {completedRequests.length > 0 && (
          <details className="mb-8">
            <summary className="mb-3 cursor-pointer text-sm font-medium text-muted-foreground hover:text-foreground select-none">
              View past requests ({completedRequests.length} completed)
            </summary>
            <div className="mt-3 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {completedRequests.map((req) => (
                <Card key={req.id} className="opacity-60">
                  <CardContent className="p-4 space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <h3 className="font-semibold line-clamp-1 text-sm cursor-pointer hover:text-primary" onClick={() => navigate(`/food/${req.listing_id}`)}>
                        {req.food_listings?.title || "Listing"}
                      </h3>
                      <Badge className="bg-green-700 text-white shrink-0 text-xs">Completed</Badge>
                    </div>
                    <p className="text-xs text-muted-foreground">Requested {formatSLDate(req.created_at)}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </details>
        )}

        {/* Smart Recommendations */}
        <SmartFoodRecommendations maxItems={6} excludeListingIds={myRequestedListingIds} />

        {/* Nearby Food */}
        <h2 className="mb-4 text-xl font-semibold">Nearby Food</h2>
        {loading ? (
          <SkeletonGrid count={6} />
        ) : availableListings.length === 0 ? (
          <EmptyState
            icon="🌱"
            title="No food nearby right now"
            description="Check back soon — donors are always adding new listings in your area."
            action={{ label: "Browse All Food", to: "/browse" }}
          />
        ) : (
          <>
            <FoodMap listings={availableListings} onListingClick={(id) => navigate(`/food/${id}`)} className="mb-6" />
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 stagger-children">
              {availableListings.slice(0, 6).map((listing) => (
                <Card key={listing.id} className="animate-fade-in-up cursor-pointer transition-all hover:shadow-lg hover:-translate-y-0.5" onClick={() => navigate(`/food/${listing.id}`)}>
                  <img src={listing.image_url || foodPlaceholder} alt={listing.title} className="h-36 w-full object-cover rounded-t-xl" />
                  <CardContent className="p-4">
                    <h3 className="mb-1 font-semibold line-clamp-1">{listing.title}</h3>
                    {listing.pickup_address && (
                      <p className="flex items-center gap-1 text-xs text-muted-foreground"><MapPin className="h-3 w-3" />{listing.pickup_address}</p>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
