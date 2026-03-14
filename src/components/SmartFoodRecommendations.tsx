import { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CountdownTimer, ExpiryStatusBadge } from "@/components/CountdownTimer";
import { fetchFoodListings, getDistance } from "@/lib/food-listings";
import { MapPin, Clock, Package, Scale, Sparkles, Navigation, Loader2 } from "lucide-react";
import type { Tables } from "@/integrations/supabase/types";
import foodPlaceholder from "@/assets/food-placeholder.jpg";

type ListingWithDistance = Tables<"food_listings"> & { distance?: number };

interface Props {
  maxItems?: number;
  excludeListingIds?: Set<string>;
}

export function SmartFoodRecommendations({ maxItems = 6, excludeListingIds }: Props) {
  const navigate = useNavigate();
  const [recommendations, setRecommendations] = useState<ListingWithDistance[]>([]);
  const [loading, setLoading] = useState(true);
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [locationStatus, setLocationStatus] = useState<"idle" | "requesting" | "granted" | "denied">("idle");

  // Get user location
  useEffect(() => {
    if (!navigator.geolocation) {
      setLocationStatus("denied");
      return;
    }
    setLocationStatus("requesting");
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setUserLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setLocationStatus("granted");
      },
      () => setLocationStatus("denied"),
      { timeout: 8000, maximumAge: 300000 }
    );
  }, []);

  // Fetch and rank listings
  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const [available, expiringSoon] = await Promise.all([
          fetchFoodListings("available"),
          fetchFoodListings("expiring_soon"),
        ]);

        let all: ListingWithDistance[] = [...available, ...expiringSoon];

        // Filter out truly expired client-side
        const now = Date.now();
        all = all.filter((l) => !l.expires_at || new Date(l.expires_at).getTime() > now);

        // Filter out listings the receiver already has requests for
        if (excludeListingIds && excludeListingIds.size > 0) {
          all = all.filter((l) => !excludeListingIds.has(l.id));
        }

        // Calculate distances if location available
        if (userLocation) {
          all = all.map((l) => ({
            ...l,
            distance:
              l.latitude && l.longitude
                ? getDistance(userLocation.lat, userLocation.lng, l.latitude, l.longitude)
                : undefined,
          }));
        }

        // Score-based sorting: lower score = better recommendation
        all.sort((a, b) => {
          const scoreA = getRecommendationScore(a, now);
          const scoreB = getRecommendationScore(b, now);
          return scoreA - scoreB;
        });

        setRecommendations(all.slice(0, maxItems));
      } catch {
        // silently fail
      } finally {
        setLoading(false);
      }
    };
    // Wait for location resolution or timeout
    if (locationStatus === "granted" || locationStatus === "denied") {
      load();
    }
  }, [userLocation, locationStatus, maxItems, excludeListingIds]);

  if (loading) {
    return (
      <div className="mb-8">
        <h2 className="mb-4 flex items-center gap-2 text-xl font-semibold">
          <Sparkles className="h-5 w-5 text-primary" /> Recommended Food Near You
        </h2>
        <div className="flex items-center justify-center py-12 text-muted-foreground">
          <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Finding best matches…
        </div>
      </div>
    );
  }

  if (recommendations.length === 0) return null;

  return (
    <div className="mb-8">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="flex items-center gap-2 text-xl font-semibold">
          <Sparkles className="h-5 w-5 text-primary" /> Recommended Food Near You
        </h2>
        <Button variant="ghost" size="sm" asChild>
          <Link to="/browse" className="text-sm text-primary hover:underline">
            View All →
          </Link>
        </Button>
      </div>

      {locationStatus === "denied" && (
        <p className="mb-3 flex items-center gap-1 text-xs text-muted-foreground">
          <Navigation className="h-3 w-3" /> Enable location for distance-based results
        </p>
      )}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {recommendations.map((listing) => (
          <Card
            key={listing.id}
            className="group cursor-pointer overflow-hidden border transition-all hover:shadow-lg hover:border-primary/30"
            onClick={() => navigate(`/food/${listing.id}`)}
          >
            <div className="relative">
              <img
                src={listing.image_url || foodPlaceholder}
                alt={listing.title}
                className="h-36 w-full object-cover transition-transform group-hover:scale-105"
                loading="lazy"
              />
              <div className="absolute right-2 top-2">
                <ExpiryStatusBadge status={listing.status} expiresAt={listing.expires_at} />
              </div>
              {listing.distance !== undefined && (
                <div className="absolute left-2 bottom-2">
                  <Badge variant="secondary" className="bg-background/80 backdrop-blur-sm text-xs font-medium">
                    <MapPin className="mr-1 h-3 w-3" />
                    {listing.distance < 1
                      ? `${(listing.distance * 1000).toFixed(0)}m`
                      : `${listing.distance.toFixed(1)}km`}
                  </Badge>
                </div>
              )}
            </div>

            <CardContent className="space-y-2 p-4">
              <h3 className="font-semibold line-clamp-1">{listing.title}</h3>

              {/* Quantity & Weight */}
              <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                {listing.quantity && (
                  <span className="flex items-center gap-1">
                    <Package className="h-3 w-3 text-primary" /> {listing.quantity} items
                  </span>
                )}
                {listing.weight_kg && (
                  <span className="flex items-center gap-1">
                    <Scale className="h-3 w-3 text-primary" /> {listing.weight_kg} kg
                  </span>
                )}
              </div>

              {/* Countdown timer */}
              {listing.expires_at && ["available", "expiring_soon"].includes(listing.status) && (
                <div className="flex items-center gap-1.5 rounded-md border bg-muted/40 px-2 py-1.5 text-xs">
                  <Clock className="h-3 w-3 text-primary shrink-0" />
                  <CountdownTimer expiresAt={listing.expires_at} status={listing.status} showBadge={false} className="text-xs font-medium" />
                </div>
              )}

              {listing.pickup_address && (
                <p className="flex items-center gap-1 text-xs text-muted-foreground line-clamp-1">
                  <MapPin className="h-3 w-3 shrink-0" /> {listing.pickup_address}
                </p>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

/**
 * Compute a recommendation score (lower = better).
 * Prioritizes: expiring soon > nearby > higher quantity.
 */
function getRecommendationScore(listing: ListingWithDistance, now: number): number {
  let score = 0;

  // Expiry urgency: 0-100 points (sooner = lower score = better)
  if (listing.expires_at) {
    const hoursLeft = (new Date(listing.expires_at).getTime() - now) / (1000 * 60 * 60);
    // Clamp between 0 and 48h for scoring
    score += Math.max(0, Math.min(hoursLeft, 48)) * 2;
  } else {
    score += 96; // no expiry = low urgency, push down
  }

  // Distance: 0-100 points (closer = lower score)
  if (listing.distance !== undefined) {
    score += Math.min(listing.distance, 50) * 2;
  } else {
    score += 50; // unknown distance = neutral
  }

  // Quantity bonus: more food = slight preference (negative adjustment)
  const qty = listing.quantity || 0;
  const weight = Number(listing.weight_kg) || 0;
  score -= Math.min(qty + weight * 2, 10); // up to -10 bonus

  return score;
}
