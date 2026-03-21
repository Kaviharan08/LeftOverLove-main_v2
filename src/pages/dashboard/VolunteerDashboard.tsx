import { useEffect, useState, useRef, useCallback } from "react";
import { ImpactStats } from "@/components/ImpactStats";
import { LiveTrackingMap } from "@/components/LiveTrackingMap";
import { useNavigate } from "react-router-dom";
import { Navbar } from "@/components/Navbar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { SkeletonGrid, SkeletonStatCards } from "@/components/SkeletonCard";
import { RequestTimeline } from "@/components/RequestTimeline";
import { EmptyState } from "@/components/EmptyState";
import { ConfettiBurst } from "@/components/ConfettiBurst";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import {
  fetchVolunteerAvailableRequests, fetchVolunteerMyRequests,
  volunteerAcceptRequest, markPickedUp, markDelivered,
  updateVolunteerLocation, verifyDeliveryOtp, statusLabel, statusColor, type PickupRequest,
} from "@/lib/pickup-requests";
import { getDistance } from "@/lib/food-listings";
import { MapPin, Truck, CheckCircle, Package, Navigation } from "lucide-react";

export default function VolunteerDashboard() {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [available, setAvailable] = useState<PickupRequest[]>([]);
  const [myDeliveries, setMyDeliveries] = useState<PickupRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [confetti, setConfetti] = useState(false);
  const [prevCompleted, setPrevCompleted] = useState(0);
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const locationInterval = useRef<ReturnType<typeof setInterval> | null>(null);

  // Get volunteer's location for distance display
  useEffect(() => {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      (pos) => setUserLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      () => {}
    );
  }, []);

  const loadData = useCallback(() => {
    if (!user) return;
    setLoading(true);
    Promise.all([
      fetchVolunteerAvailableRequests(),
      fetchVolunteerMyRequests(user.id),
    ]).then(([a, d]) => { setAvailable(a); setMyDeliveries(d); }).catch(() => {}).finally(() => setLoading(false));
  }, [user]);

  useEffect(() => { loadData(); }, [loadData]);

  useEffect(() => {
    if (!user) return;
    const channel = supabase.channel("volunteer-dashboard")
      .on("postgres_changes", { event: "*", schema: "public", table: "pickup_requests" }, () => loadData())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [user, loadData]);

  const activeDelivery = myDeliveries.find((d) => d.status === "volunteer_accepted" || d.status === "picked_up");
  const completed = myDeliveries.filter((d) => d.status === "delivered" || d.status === "confirmed");

  // Confetti on new completion
  useEffect(() => {
    if (completed.length > prevCompleted && prevCompleted > 0) setConfetti(true);
    setPrevCompleted(completed.length);
  }, [completed.length]);

  // Auto-send location
  useEffect(() => {
    if (!activeDelivery) {
      if (locationInterval.current) { clearInterval(locationInterval.current); locationInterval.current = null; }
      return;
    }
    const send = () => navigator.geolocation.getCurrentPosition(
      (pos) => updateVolunteerLocation(activeDelivery.id, pos.coords.latitude, pos.coords.longitude).catch(() => {}),
      () => {}, { enableHighAccuracy: true }
    );
    send();
    locationInterval.current = setInterval(send, 10000);
    return () => { if (locationInterval.current) clearInterval(locationInterval.current); };
  }, [activeDelivery?.id, activeDelivery?.status]);

  const handleAccept = async (requestId: string) => {
    if (!user) return;
    try {
      await volunteerAcceptRequest(requestId, user.id);
      toast({ title: "🚗 Delivery accepted!", description: "Head to the pickup location." });
      loadData();
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
  };

  const [otpInput, setOtpInput] = useState("");
  const [otpError, setOtpError] = useState(false);
  const [otpLoading, setOtpLoading] = useState(false);

  const handlePickedUp = async (requestId: string) => {
    try {
      await markPickedUp(requestId);
      toast({ title: "📦 Marked as picked up!" });
      loadData();
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
  };

  const handleVerifyOtp = async (requestId: string) => {
    if (otpInput.length !== 4) return;
    setOtpLoading(true);
    setOtpError(false);
    try {
      const success = await verifyDeliveryOtp(requestId, otpInput);
      if (success) {
        toast({ title: "✅ OTP Verified! Delivery confirmed!" });
        setOtpInput("");
        setConfetti(true);
        loadData();
      } else {
        setOtpError(true);
        toast({ title: "❌ Wrong OTP", description: "Ask the receiver for the correct code.", variant: "destructive" });
      }
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setOtpLoading(false);
    }
  };

  const active = myDeliveries.filter((d) => ["volunteer_accepted", "picked_up"].includes(d.status));

  const statCards = [
    { label: "Available Pickups",  value: available.length, color: "text-primary" },
    { label: "Active Deliveries",  value: active.length,    color: "text-accent" },
    { label: "Completed",          value: completed.length, color: "text-green-600 dark:text-green-400" },
  ];

  return (
    <div className="min-h-screen">
      <Navbar />
      <div className="container mx-auto px-4 py-8">

        {/* Header */}
        <div className="mb-6 flex items-center gap-3">
          <div className="rounded-xl bg-primary/10 p-3">
            <Truck className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h1 className="text-3xl font-bold">Volunteer Dashboard</h1>
            <p className="text-sm text-muted-foreground">Help deliver food to people in need</p>
          </div>
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
          <ImpactStats userId={user?.id} role="volunteer" variant="compact" />
        </div>

        {/* Active delivery */}
        {activeDelivery && (
          <div className="mb-8">
            <h2 className="mb-4 text-xl font-semibold flex items-center gap-2">
              <Navigation className="h-5 w-5 text-primary" /> Active Delivery
            </h2>
            <Card className="border-primary/30">
              <CardContent className="p-4 space-y-4">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h3 className="font-semibold">{activeDelivery.food_listings?.title}</h3>
                    {activeDelivery.food_listings?.pickup_address && (
                      <p className="flex items-center gap-1 text-sm text-muted-foreground"><MapPin className="h-3 w-3" />{activeDelivery.food_listings.pickup_address}</p>
                    )}
                  </div>
                  <Badge className={`${statusColor(activeDelivery.status)} text-white`}>{statusLabel(activeDelivery.status)}</Badge>
                </div>

                <RequestTimeline status={activeDelivery.status} selfPickup={activeDelivery.self_pickup} volunteerId={activeDelivery.volunteer_id} />

                <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                  <span className="relative flex h-2 w-2">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-green-400 opacity-75" />
                    <span className="relative inline-flex h-2 w-2 rounded-full bg-green-500" />
                  </span>
                  Sharing your location every 10 seconds
                </p>

                <LiveTrackingMap
                  requestId={activeDelivery.id}
                  pickupLat={activeDelivery.food_listings?.latitude}
                  pickupLng={activeDelivery.food_listings?.longitude}
                  deliveryLat={(activeDelivery as any).delivery_lat}
                  deliveryLng={(activeDelivery as any).delivery_lng}
                  volunteerLat={activeDelivery.volunteer_lat}
                  volunteerLng={activeDelivery.volunteer_lng}
                  status={activeDelivery.status}
                  className="mt-2"
                />

                <div className="flex gap-2 pt-1">
                  {activeDelivery.status === "volunteer_accepted" && (
                    <Button onClick={() => handlePickedUp(activeDelivery.id)} className="gap-1">
                      <Package className="h-4 w-4" /> Mark Picked Up
                    </Button>
                  )}
                  {activeDelivery.status === "picked_up" && (
                    <div className="w-full space-y-3">
                      <p className="text-sm font-medium text-muted-foreground">Ask the receiver for their 4-digit OTP to confirm delivery:</p>
                      <div className="flex gap-2 items-center">
                        <input
                          type="text"
                          maxLength={4}
                          value={otpInput}
                          onChange={(e) => { setOtpInput(e.target.value.replace(/\D/g, "")); setOtpError(false); }}
                          placeholder="Enter 4-digit OTP"
                          className={`w-36 rounded-md border px-3 py-2 text-center text-lg font-bold tracking-widest focus:outline-none focus:ring-2 focus:ring-primary ${otpError ? "border-destructive focus:ring-destructive" : "border-input"}`}
                        />
                        <Button
                          onClick={() => handleVerifyOtp(activeDelivery.id)}
                          disabled={otpInput.length !== 4 || otpLoading}
                          className="gap-1 bg-green-600 hover:bg-green-700 text-white"
                        >
                          <CheckCircle className="h-4 w-4" />
                          {otpLoading ? "Verifying..." : "Verify & Deliver"}
                        </Button>
                      </div>
                      {otpError && <p className="text-xs text-destructive">Incorrect OTP. Ask the receiver to check their dashboard.</p>}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Available pickups */}
        <h2 className="mb-4 text-xl font-semibold flex items-center gap-2"><Package className="h-5 w-5" /> Available Pickups</h2>
        {loading ? (
          <div className="mb-8"><SkeletonGrid count={3} /></div>
        ) : available.length === 0 ? (
          <div className="mb-8">
            <EmptyState icon="🚗" title="No pickups available" description="Check back soon — new requests appear when receivers claim food listings." />
          </div>
        ) : (
          <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3 stagger-children">
            {available.map((req) => (
              <Card key={req.id} className="animate-fade-in-up overflow-hidden transition-all hover:shadow-lg hover:-translate-y-0.5">
                {req.food_listings?.image_url && (
                  <img src={req.food_listings.image_url} alt={req.food_listings.title} className="h-32 w-full object-cover" />
                )}
                <CardContent className="p-4 space-y-2">
                  <h3 className="font-semibold line-clamp-1 cursor-pointer hover:text-primary" onClick={() => navigate(`/food/${req.listing_id}`)}>
                    {req.food_listings?.title || "Listing"}
                  </h3>
                  {req.food_listings?.pickup_address && (
                    <p className="flex items-center gap-1 text-xs text-muted-foreground"><MapPin className="h-3 w-3" />{req.food_listings.pickup_address}</p>
                  )}
                  {userLocation && req.food_listings?.latitude && req.food_listings?.longitude && (
                    <p className="flex items-center gap-1 text-xs font-medium text-primary">
                      <Navigation className="h-3 w-3" />
                      {getDistance(userLocation.lat, userLocation.lng, req.food_listings.latitude, req.food_listings.longitude).toFixed(1)} km away
                    </p>
                  )}
                  {req.note && <p className="text-xs text-muted-foreground italic">"{req.note}"</p>}
                  <Button size="sm" className="w-full gap-1 mt-1" onClick={() => handleAccept(req.id)} disabled={!!activeDelivery}>
                    <Truck className="h-3 w-3" /> {activeDelivery ? "Finish current delivery first" : "Accept Delivery"}
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Completed */}
        {completed.length > 0 && (
          <>
            <h2 className="mb-4 text-xl font-semibold flex items-center gap-2"><CheckCircle className="h-5 w-5 text-green-600" /> Completed Deliveries</h2>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 stagger-children">
              {completed.map((req) => (
                <Card key={req.id} className="animate-fade-in-up opacity-75 hover:opacity-100 transition-opacity">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-2">
                      <h3 className="font-semibold line-clamp-1">{req.food_listings?.title || "Listing"}</h3>
                      <Badge className="bg-green-600 text-white shrink-0 text-xs">{statusLabel(req.status)}</Badge>
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">Completed {new Date(req.updated_at).toLocaleDateString()}</p>
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
