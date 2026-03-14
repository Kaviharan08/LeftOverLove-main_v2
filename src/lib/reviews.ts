import { supabase } from "@/integrations/supabase/client";

export interface Review {
  id: string;
  listing_id: string;
  reviewer_id: string;
  reviewed_user_id: string;
  rating: number;
  comment: string | null;
  created_at: string;
  reviewer_name?: string;
  listing_title?: string;
}

export async function createReview(
  listingId: string,
  reviewerId: string,
  reviewedUserId: string,
  rating: number,
  comment?: string
) {
  const { error } = await supabase.from("reviews").insert({
    listing_id: listingId,
    reviewer_id: reviewerId,
    reviewed_user_id: reviewedUserId,
    rating,
    comment: comment ?? null,
  });
  if (error) throw error;

  // Notify the reviewed user
  await supabase.from("notifications").insert({
    user_id: reviewedUserId,
    type: "new_review",
    title: "New review received",
    body: `You received a ${rating}-star review!`,
  });
}

export async function fetchReviewsForUser(userId: string): Promise<Review[]> {
  const { data, error } = await supabase
    .from("reviews")
    .select("*")
    .eq("reviewed_user_id", userId)
    .order("created_at", { ascending: false });
  if (error) throw error;

  const reviews = (data ?? []) as Review[];

  // Fetch reviewer names
  const reviewerIds = [...new Set(reviews.map((r) => r.reviewer_id))];
  if (reviewerIds.length > 0) {
    const { data: profiles } = await supabase.from("profiles").select("user_id, name").in("user_id", reviewerIds);
    const profileMap = new Map((profiles ?? []).map((p: any) => [p.user_id, p.name ?? "User"]));
    reviews.forEach((r) => (r.reviewer_name = profileMap.get(r.reviewer_id) ?? "User"));
  }

  return reviews;
}

export async function fetchAverageRating(userId: string): Promise<{ avg: number; count: number }> {
  const { data, error } = await supabase
    .from("reviews")
    .select("rating")
    .eq("reviewed_user_id", userId);
  if (error || !data || data.length === 0) return { avg: 0, count: 0 };
  const sum = data.reduce((acc, r) => acc + r.rating, 0);
  return { avg: sum / data.length, count: data.length };
}

export async function hasReviewed(listingId: string, reviewerId: string): Promise<boolean> {
  const { count } = await supabase
    .from("reviews")
    .select("*", { count: "exact", head: true })
    .eq("listing_id", listingId)
    .eq("reviewer_id", reviewerId);
  return (count ?? 0) > 0;
}
