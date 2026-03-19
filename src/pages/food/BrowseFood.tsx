import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Navbar } from "@/components/Navbar";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FoodMap } from "@/components/FoodMap";
import { fetchFoodListings, getDistance } from "@/lib/food-listings";
import { CountdownTimer, ExpiryStatusBadge } from "@/components/CountdownTimer";
import { CategoryBadge, DietaryTagBadges, FOOD_CATEGORIES, DIETARY_TAGS } from "@/components/FoodCategoryFilter";
import { MapPin, Navigation, Search, Grid, Map as MapIcon, Package, Scale, Flame } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

import { useAuth } from "@/lib/auth";
import { fetchRequestsForReceiver } from "@/lib/pickup-requests";
import foodPlaceholder from "@/assets/food-placeholder.jpg";
import { SkeletonGrid } from "@/components/SkeletonCard";
import { EmptyState } from "@/components/EmptyState";

const BOOST_HOURS = 3;
function hoursLeft(expiresAt: string | null): number | null {
  if (!expiresAt) return null;
  return (new Date(expiresAt).getTime() - Date.now()) / 3600000;
}
function isNearExpiry(l: any): boolean {
  const h = hoursLeft(l.expires_at);
  return h !== null && h > 0 && h <= BOOST_HOURS;
}

export default function BrowseFood() {
  const navigate = useNavigate();
  const { user, role } = useAuth();
  const [claimedListingIds, setClaimedListingIds] = useState<Set<string>>(new Set());
  const [listings, setListings] = useState<any[]>([]);
  const [filtered, setFiltered] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [maxDistance, setMaxDistance] = useState<number>(50);
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [view, setView] = useState<"grid" | "map">("grid");
  const [locating, setLocating] = useState(false);
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [dietaryFilter, setDietaryFilter] = useState("all");
  const [sortBy, setSortBy] = useState("newest");

  // Fetch current user's claimed listings to exclude from browse
  useEffect(() => {
    if (!user || (role !== "receiver" && role !== "ngo")) return;
    fetchRequestsForReceiver(user.id).then((reqs) => {
      const ids = new Set(
        reqs.filter((r) => r.status !== "cancelled").map((r) => r.listing_id)
      );
      setClaimedListingIds(ids);
    }).catch(() => {});
  }, [user, role]);

  useEffect(() => {
    supabase.rpc("archive_expired_listings").then(() => {});

    const now = new Date();
    Promise.all([
      fetchFoodListings("available"),
      fetchFoodListings("expiring_soon"),
    ]).then(([avail, expiringSoon]) => {
      // Only show listings that are not yet expired
      const active = [...avail, ...expiringSoon].filter(
        (l) => !l.expires_at || new Date(l.expires_at) > now
      );
      setListings(active);
    }).catch(() => {}).finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    let result = [...listings];

    if (search) {
      const s = search.toLowerCase();
      result = result.filter((l) => l.title.toLowerCase().includes(s) || l.description?.toLowerCase().includes(s) || l.pickup_address?.toLowerCase().includes(s));
    }

    if (categoryFilter !== "all") {
      result = result.filter((l) => l.category === categoryFilter);
    }

    if (dietaryFilter !== "all") {
      result = result.filter((l) => l.dietary_tags?.includes(dietaryFilter));
    }

    // Filter out listings this receiver already claimed
    if (claimedListingIds.size > 0) {
      result = result.filter((l) => !claimedListingIds.has(l.id));
    }

    if (userLocation) {
      result = result
        .filter((l) => l.latitude && l.longitude)
        .filter((l) => getDistance(userLocation.lat, userLocation.lng, l.latitude!, l.longitude!) <= maxDistance);
    }

    if (sortBy === "nearest" && userLocation) {
      result.sort((a, b) => {
        const da = a.latitude && a.longitude ? getDistance(userLocation.lat, userLocation.lng, a.latitude, a.longitude) : Infinity;
        const db = b.latitude && b.longitude ? getDistance(userLocation.lat, userLocation.lng, b.latitude, b.longitude) : Infinity;
        return da - db;
      });
    } else if (sortBy === "expiry") {
      result.sort((a, b) => {
        if (!a.expires_at) return 1;
        if (!b.expires_at) return -1;
        return new Date(a.expires_at).getTime() - new Date(b.expires_at).getTime();
      });
    } else {
      // Default: near-expiry listings pinned to top, rest sorted by newest
      const nearExpiry = result.filter(isNearExpiry).sort((a, b) =>
        new Date(a.expires_at).getTime() - new Date(b.expires_at).getTime()
      );
      const rest = result
        .filter((l) => !isNearExpiry(l))
        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
      result = [...nearExpiry, ...rest];
    }

    setFiltered(result);
  }, [listings, search, userLocation, maxDistance, categoryFilter, dietaryFilter, sortBy, claimedListingIds]);

  const handleUseLocation = () => {
    if (!navigator.geolocation) return;
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => { setUserLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude }); setLocating(false); },
      () => setLocating(false)
    );
  };

  const nearExpiryCount = filtered.filter(isNearExpiry).length;

  const renderListingCard = (listing: any, isExpired = false) => {
    const nearExpiry = isNearExpiry(listing);
    const h = hoursLeft(listing.expires_at);
    return (
    <Card key={listing.id} className={`cursor-pointer overflow-hidden transition-all hover:shadow-lg hover:-translate-y-0.5 ${isExpired ? "opacity-60" : ""} ${nearExpiry ? "ring-2 ring-orange-400 border-orange-300" : ""}`} onClick={() => navigate(`/food/${listing.id}`)}>
      <div className="relative">
        <img src={listing.image_url || foodPlaceholder} alt={listing.title} className="h-40 w-full object-cover" loading="lazy" />
        {nearExpiry && (
          <div className="absolute top-2 left-2 flex items-center gap-1 rounded-full bg-orange-500 px-2 py-0.5 text-white text-xs font-semibold shadow">
            <Flame className="h-3 w-3" /> Grab it fast!
          </div>
        )}
      </div>
      <CardContent className="p-4">
        {nearExpiry && h !== null && (
          <div className="mb-2 flex items-center gap-1.5 rounded-md bg-orange-50 dark:bg-orange-950/30 border border-orange-200 dark:border-orange-800/40 px-2 py-1">
            <Flame className="h-3 w-3 text-orange-500 shrink-0" />
            <span className="text-xs font-medium text-orange-700 dark:text-orange-300">
              Expires in {h < 1 ? `${Math.round(h * 60)}min` : `${h.toFixed(1)}h`} — claim before it's gone!
            </span>
          </div>
        )}
        <div className="mb-2 flex items-start justify-between gap-2">
          <h3 className="font-semibold line-clamp-1">{listing.title}</h3>
          <ExpiryStatusBadge status={listing.status} expiresAt={listing.expires_at} />
        </div>
        {listing.description && <p className="mb-2 text-sm text-muted-foreground line-clamp-2">{listing.description}</p>}
        {listing.expires_at && !isExpired && !nearExpiry && (
          <div className="mb-2">
            <CountdownTimer expiresAt={listing.expires_at} status={listing.status} showBadge={false} className="text-xs" />
          </div>
        )}
        {(listing.quantity || listing.weight_kg) && (
          <div className="mb-2 flex items-center gap-2 text-xs text-muted-foreground">
            {listing.quantity  && <span className="flex items-center gap-1"><Package className="h-3 w-3" />{listing.quantity} items</span>}
            {listing.weight_kg && <span className="flex items-center gap-1"><Scale   className="h-3 w-3" />{listing.weight_kg} kg</span>}
          </div>
        )}
        <div className="mb-2 flex flex-wrap gap-1">
          <CategoryBadge category={listing.category} />
          <DietaryTagBadges tags={listing.dietary_tags} />
        </div>
        {listing.pickup_address && (
          <p className="flex items-center gap-1 text-xs text-muted-foreground">
            <MapPin className="h-3 w-3" /> {listing.pickup_address}
          </p>
        )}
        {userLocation && listing.latitude && listing.longitude && (
          <p className="mt-1 text-xs font-medium text-primary">
            {getDistance(userLocation.lat, userLocation.lng, listing.latitude, listing.longitude).toFixed(1)} km away
          </p>
        )}
      </CardContent>
    </Card>
  );};

  return (
    <div className="min-h-screen">
      <Navbar />
      <div className="container mx-auto px-4 py-8">
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-3xl font-bold">Browse Food</h1>
            {nearExpiryCount > 0 && (
              <p className="mt-1 flex items-center gap-1 text-sm text-orange-600 font-medium">
                <Flame className="h-4 w-4" />
                {nearExpiryCount} listing{nearExpiryCount > 1 ? "s" : ""} expiring within {BOOST_HOURS} hours — claim now!
              </p>
            )}
          </div>
          <div className="flex gap-2">
            <Button variant={view === "grid" ? "default" : "outline"} size="sm" onClick={() => setView("grid")}>
              <Grid className="mr-1 h-4 w-4" /> Grid
            </Button>
            <Button variant={view === "map" ? "default" : "outline"} size="sm" onClick={() => setView("map")}>
              <MapIcon className="mr-1 h-4 w-4" /> Map
            </Button>
          </div>
        </div>

        {/* Filters row */}
        <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input className="pl-9" placeholder="Search food listings..." value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
          <Select value={categoryFilter} onValueChange={setCategoryFilter}>
            <SelectTrigger className="w-[140px]"><SelectValue placeholder="Category" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories</SelectItem>
              {FOOD_CATEGORIES.map((c) => (
                <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={dietaryFilter} onValueChange={setDietaryFilter}>
            <SelectTrigger className="w-[140px]"><SelectValue placeholder="Dietary" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Dietary</SelectItem>
              {DIETARY_TAGS.map((t) => (
                <SelectItem key={t} value={t}>{t}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={sortBy} onValueChange={setSortBy}>
            <SelectTrigger className="w-[130px]"><SelectValue placeholder="Sort" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="newest">Newest</SelectItem>
              <SelectItem value="expiry">Expiring Soon</SelectItem>
              {userLocation && <SelectItem value="nearest">Nearest</SelectItem>}
            </SelectContent>
          </Select>
          <Button variant="outline" onClick={handleUseLocation} disabled={locating}>
            <Navigation className="mr-1 h-4 w-4" />
            {locating ? "Locating..." : userLocation ? "Update Location" : "Use My Location"}
          </Button>
          {userLocation && (
            <div className="flex items-center gap-2">
              <label className="text-sm text-muted-foreground whitespace-nowrap">Max {maxDistance}km</label>
              <input type="range" min={1} max={100} value={maxDistance} onChange={(e) => setMaxDistance(Number(e.target.value))} className="w-24" />
            </div>
          )}
        </div>

        {loading ? (
          <p className="text-center text-muted-foreground py-12">Loading listings...</p>
        ) : view === "map" ? (
          <FoodMap listings={filtered} userLocation={userLocation} onListingClick={(id) => navigate(`/food/${id}`)} />
        ) : filtered.length === 0 ? (
          <p className="text-center text-muted-foreground py-12">No food listings found.</p>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {filtered.map((listing) => renderListingCard(listing))}
          </div>
        )}
      </div>
    </div>
  );
}
