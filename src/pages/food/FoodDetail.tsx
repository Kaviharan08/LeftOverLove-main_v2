import { useEffect, useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { Navbar } from "@/components/Navbar";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { fetchListingById } from "@/lib/food-listings";
import { supabase } from "@/integrations/supabase/client";
import { createPickupRequest } from "@/lib/pickup-requests";
import { createReview, hasReviewed } from "@/lib/reviews";
import { StarRating } from "@/components/StarRating";
import { CountdownTimer, ExpiryStatusBadge } from "@/components/CountdownTimer";
import { CategoryBadge, DietaryTagBadges } from "@/components/FoodCategoryFilter";
import { useAuth } from "@/lib/auth";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, MapPin, Clock, MessageSquare, Package, Scale, AlertTriangle } from "lucide-react";
import { formatSLDateTime, formatSLDate } from "@/lib/timezone";
import { FoodMap } from "@/components/FoodMap";
import foodPlaceholder from "@/assets/food-placeholder.jpg";

export default function FoodDetail() {
  const { id } = useParams<{ id: string }>();
  const { user, role } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [listing, setListing] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [requesting, setRequesting] = useState(false);
  const [note, setNote] = useState("");
  const [showNote, setShowNote] = useState(false);

  const [showReview, setShowReview] = useState(false);
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewComment, setReviewComment] = useState("");
  const [submittingReview, setSubmittingReview] = useState(false);
  const [alreadyReviewed, setAlreadyReviewed] = useState(false);

  useEffect(() => {
    if (!id) return;
    supabase.rpc("archive_expired_listings").then(() => {});
    fetchListingById(id).then((data) => {
      // Only apply expiry logic to available/expiring_soon listings
      // Never change claimed, completed, delivered, cancelled, or picked_up statuses
      const expiryEligible = ["available", "expiring_soon"];
      if (data.expires_at && new Date(data.expires_at) < new Date() && expiryEligible.includes(data.status)) {
        setListing({ ...data, status: "expired" });
        supabase.rpc("update_listing_status", { p_listing_id: id, p_new_status: "expired" }).then(() => {});
      } else {
        setListing(data);
      }
    }).catch(() => {}).finally(() => setLoading(false));
  }, [id]);

  useEffect(() => {
    if (!id || !user) return;
    hasReviewed(id, user.id).then(setAlreadyReviewed);
  }, [id, user]);

  // Expiry logic only applies to available/expiring_soon — never to claimed, completed, delivered, cancelled
  const expiryRelevant = listing && ["available", "expiring_soon", "expired"].includes(listing.status);
  const isExpired = expiryRelevant && (listing?.status === "expired" || (listing?.expires_at && new Date(listing.expires_at) < new Date()));
  const isExpiringSoon = expiryRelevant && (listing?.status === "expiring_soon" || (listing?.expires_at && !isExpired && (new Date(listing.expires_at).getTime() - Date.now()) < 2 * 60 * 60 * 1000));
  const showExpiryWarnings = listing && ["available", "expiring_soon"].includes(listing.status);

  const handleRequest = async () => {
    if (!user || !listing || isExpired) return;
    setRequesting(true);
    try {
      await createPickupRequest(listing.id, user.id, note);
      toast({ title: "Food accepted!", description: "Go to your dashboard to manage pickup." });
      setListing({ ...listing, status: "claimed" as any });
      setShowNote(false);
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setRequesting(false);
    }
  };

  const handleReview = async () => {
    if (!user || !listing) return;
    setSubmittingReview(true);
    try {
      await createReview(listing.id, user.id, listing.donor_id, reviewRating, reviewComment);
      toast({ title: "Review submitted!", description: "Thank you for your feedback." });
      setAlreadyReviewed(true);
      setShowReview(false);
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setSubmittingReview(false);
    }
  };

  if (loading) return <div className="min-h-screen"><Navbar /><div className="flex items-center justify-center py-20 text-muted-foreground">Loading...</div></div>;
  if (!listing) return <div className="min-h-screen"><Navbar /><div className="flex items-center justify-center py-20 text-muted-foreground">Listing not found.</div></div>;

  const canMessage = user && listing.donor_id !== user.id;
  const canReview = user && role === "receiver" && listing.status === "completed" && !alreadyReviewed && listing.donor_id !== user.id;

  return (
    <div className="min-h-screen">
      <Navbar />
      <div className="container mx-auto max-w-3xl px-4 py-8">
        <Link to="/browse" className="mb-4 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" /> Back to Browse
        </Link>

        {/* Expired Warning Banner */}
        {isExpired && (
          <div className="mb-4 flex items-center gap-3 rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-destructive">
            <AlertTriangle className="h-5 w-5 shrink-0" />
            <div>
              <p className="font-semibold">This listing has expired</p>
              <p className="text-sm opacity-80">This food item is no longer available for pickup.</p>
            </div>
          </div>
        )}

        {/* Expiring Soon Warning */}
        {isExpiringSoon && !isExpired && (
          <div className="mb-4 flex items-center gap-3 rounded-lg border border-yellow-500/30 bg-yellow-500/10 px-4 py-3 text-yellow-700 dark:text-yellow-400">
            <Clock className="h-5 w-5 shrink-0 animate-pulse" />
            <div>
              <p className="font-semibold">Expiring Soon!</p>
              <p className="text-sm opacity-80">This food item will expire shortly. Claim it before it's too late.</p>
            </div>
          </div>
        )}

        <Card>
          <CardContent className="p-0">
            <img
              src={listing.image_url || foodPlaceholder}
              alt={listing.title}
              className="h-64 w-full rounded-t-lg object-cover"
              loading="lazy"
            />
            <div className="space-y-4 p-6">
              <div className="flex items-start justify-between gap-3">
                <h1 className="text-2xl font-bold">{listing.title}</h1>
                <ExpiryStatusBadge status={listing.status} expiresAt={listing.expires_at} />
              </div>

              {/* Real-time Countdown Timer */}
              {showExpiryWarnings && listing.expires_at && (
                <div className="flex items-center gap-2 rounded-lg border bg-muted/50 px-4 py-3">
                  <Clock className="h-4 w-4 text-primary" />
                  <CountdownTimer expiresAt={listing.expires_at} status={listing.status} showBadge={false} className="text-sm font-medium" />
                </div>
              )}

              {listing.description && <p className="text-muted-foreground">{listing.description}</p>}

              {/* Quantity & Weight */}
              {(listing.quantity || listing.weight_kg) && (
                <div className="flex items-center gap-4 text-sm">
                  {listing.quantity && (
                    <span className="flex items-center gap-1 text-muted-foreground">
                      <Package className="h-4 w-4 text-primary" /> {listing.quantity} items
                    </span>
                  )}
                  {listing.weight_kg && (
                    <span className="flex items-center gap-1 text-muted-foreground">
                      <Scale className="h-4 w-4 text-primary" /> {listing.weight_kg} kg
                    </span>
                  )}
                </div>
              )}

              <div className="flex flex-wrap gap-2">
                <CategoryBadge category={listing.category} />
                <DietaryTagBadges tags={listing.dietary_tags} />
              </div>

              {listing.pickup_address && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <MapPin className="h-4 w-4 text-primary" />
                  {listing.pickup_address}
                </div>
              )}

              {/* Expiry date display */}
              {listing.expires_at && (
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Clock className="h-3 w-3" />
                  Expires: {formatSLDateTime(listing.expires_at)}
                </div>
              )}

              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Clock className="h-3 w-3" />
                Posted {formatSLDate(listing.created_at)}
              </div>

              {listing.latitude && listing.longitude && (
                <FoodMap listings={[listing]} className="mt-4" />
              )}

              {canMessage && (
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => navigate(`/messages/${listing.id}/${listing.donor_id}`)}
                >
                  <MessageSquare className="mr-2 h-4 w-4" /> Message Donor
                </Button>
              )}

              {/* Request Pickup — disabled if expired */}
              {(listing.status === "available" || listing.status === "expiring_soon") && !isExpired && (role === "receiver" || (role as string) === "ngo") && (
                <div className="space-y-3">
                  {!showNote ? (
                    <Button className="w-full" size="lg" onClick={() => setShowNote(true)}>
                      Accept &amp; Claim Food
                    </Button>
                  ) : (
                    <>
                      <Textarea
                        placeholder="Add a note (optional)..."
                        value={note}
                        onChange={(e) => setNote(e.target.value)}
                      />
                      <div className="flex gap-2">
                        <Button className="flex-1" size="lg" onClick={handleRequest} disabled={requesting}>
                          {requesting ? "Claiming..." : "Confirm"}
                        </Button>
                        <Button variant="outline" size="lg" onClick={() => setShowNote(false)}>
                          Cancel
                        </Button>
                      </div>
                    </>
                  )}
                </div>
              )}

              {/* Expired - show disabled message */}
              {isExpired && (
                <div className="space-y-2">
                  <Button className="w-full" size="lg" disabled>
                    Cannot Claim — Expired
                  </Button>
                  <p className="text-center text-sm text-muted-foreground">This listing has expired and cannot be claimed.</p>
                </div>
              )}

              {listing.status === "claimed" && (
                <p className="text-center text-sm text-muted-foreground">This listing has been claimed.</p>
              )}

              {canReview && (
                <div className="space-y-3 rounded-lg border p-4">
                  {!showReview ? (
                    <Button variant="secondary" className="w-full" onClick={() => setShowReview(true)}>
                      Leave a Review
                    </Button>
                  ) : (
                    <>
                      <h3 className="text-sm font-semibold">Rate this donor</h3>
                      <StarRating value={reviewRating} onChange={setReviewRating} />
                      <Textarea
                        placeholder="Share your experience (optional)..."
                        value={reviewComment}
                        onChange={(e) => setReviewComment(e.target.value)}
                      />
                      <div className="flex gap-2">
                        <Button className="flex-1" onClick={handleReview} disabled={submittingReview}>
                          {submittingReview ? "Submitting..." : "Submit Review"}
                        </Button>
                        <Button variant="outline" onClick={() => setShowReview(false)}>Cancel</Button>
                      </div>
                    </>
                  )}
                </div>
              )}

              {alreadyReviewed && listing.status === "completed" && (
                <p className="text-center text-sm text-muted-foreground">✓ You've already reviewed this listing.</p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
