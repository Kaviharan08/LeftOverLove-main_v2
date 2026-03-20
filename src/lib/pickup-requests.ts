import { supabase } from "@/integrations/supabase/client";
import { createNotification } from "@/lib/notifications";

export type PickupRequest = {
  id: string;
  listing_id: string;
  receiver_id: string;
  volunteer_id: string | null;
  status: "pending" | "accepted" | "picked_up" | "delivered" | "cancelled" | "donor_approved" | "volunteer_requested" | "volunteer_accepted" | "confirmed";
  self_pickup: boolean;
  note: string | null;
  volunteer_lat: number | null;
  volunteer_lng: number | null;
  delivery_lat: number | null;
  delivery_lng: number | null;
  created_at: string;
  updated_at: string;
  food_listings?: {
    id: string;
    title: string;
    pickup_address: string | null;
    image_url: string | null;
    donor_id: string;
    status: string;
    latitude: number | null;
    longitude: number | null;
  };
  profiles?: {
    name: string | null;
    phone: string | null;
  };
};

const REQUEST_SELECT = "*, food_listings(id, title, pickup_address, image_url, donor_id, status, latitude, longitude)";
const REQUEST_UPDATE_SELECT = "*"; // Use plain * for updates — joined selects cause 406 on some DB configs
// Use this simpler select for UPDATE operations to avoid 406 errors from joined table RLS
const UPDATE_SELECT = "*";

/**
 * Receiver accepts a food listing — no donor approval needed.
 * Status goes straight to "accepted", listing becomes "claimed".
 * Double-checks for existing active requests to prevent duplicate claims.
 */
export async function createPickupRequest(listingId: string, receiverId: string, note?: string) {
  // Step 1: Check listing status
  const { data: current, error: fetchError } = await supabase
    .from("food_listings")
    .select("id, donor_id, title, status")
    .eq("id", listingId)
    .maybeSingle();

  if (fetchError) throw fetchError;
  if (!current || !["available", "expiring_soon"].includes((current as any).status)) {
    throw new Error("This food has already been claimed by someone else. Please browse for other available food.");
  }

  // Step 2: Check no active request already exists for this listing (catches race between receiver + NGO)
  const { data: existingReq } = await supabase
    .from("pickup_requests")
    .select("id")
    .eq("listing_id", listingId)
    .neq("status", "cancelled")
    .maybeSingle();

  if (existingReq) {
    await supabase.from("food_listings").update({ status: "claimed" as any }).eq("id", listingId);
    throw new Error("This food has already been claimed by someone else. Please browse for other available food.");
  }

  // Step 3: Insert the request
  const { data, error } = await supabase
    .from("pickup_requests")
    .insert({ listing_id: listingId, receiver_id: receiverId, note: note || null, status: "accepted", self_pickup: true } as any)
    .select(REQUEST_UPDATE_SELECT)
    .maybeSingle();

  if (error) {
    if (error.code === "23505") {
      throw new Error("This food has already been claimed by someone else. Please browse for other available food.");
    }
    throw error;
  }

  // Step 4: Mark listing as claimed
  await supabase.from("food_listings").update({ status: "claimed" as any }).eq("id", listingId);

  const donorId = (current as any).donor_id;
  if (donorId) {
    await createNotification(donorId, "new_request", "Food accepted", `Someone accepted "${(current as any).title}"`, `/food/${listingId}`);
  }
  return data;
}

/** Receiver requests a volunteer to deliver instead of self-pickup */
export async function requestVolunteer(requestId: string, deliveryLat?: number, deliveryLng?: number) {
  const update: Record<string, any> = { status: "volunteer_requested", self_pickup: false };
  if (deliveryLat != null && deliveryLng != null) {
    update.delivery_lat = deliveryLat;
    update.delivery_lng = deliveryLng;
  }
  const { data, error } = await supabase
    .from("pickup_requests")
    .update(update as any)
    .eq("id", requestId)
    .select(REQUEST_UPDATE_SELECT)
    .maybeSingle();
  if (error) throw error;
  if (!data) throw new Error("Could not update request — please try again.");
  return data;
}

/** Volunteer accepts a volunteer_requested pickup */
export async function volunteerAcceptRequest(requestId: string, volunteerId: string) {
  const { data, error } = await supabase
    .from("pickup_requests")
    .update({ volunteer_id: volunteerId, status: "volunteer_accepted" as any } as any)
    .eq("id", requestId)
    .select(REQUEST_UPDATE_SELECT)
    .maybeSingle();
  if (error) throw error;

  const receiverId = (data as any)?.receiver_id;
  if (receiverId) {
    await createNotification(receiverId, "volunteer_accepted", "Volunteer assigned!", "A volunteer accepted your delivery request!");
  }
  return data;
}

/** Volunteer updates their live location */
export async function updateVolunteerLocation(requestId: string, lat: number, lng: number) {
  const { error } = await supabase
    .from("pickup_requests")
    .update({ volunteer_lat: lat, volunteer_lng: lng } as any)
    .eq("id", requestId);
  if (error) throw error;
}

/** Volunteer marks food as picked up */
export async function markPickedUp(requestId: string) {
  const { data, error } = await supabase
    .from("pickup_requests")
    .update({ status: "picked_up" as any } as any)
    .eq("id", requestId)
    .select(REQUEST_UPDATE_SELECT)
    .maybeSingle();
  if (error) throw error;

  const receiverId = (data as any)?.receiver_id;
  if (receiverId) {
    await createNotification(receiverId, "status_picked_up", "Food picked up!", "Your food has been picked up and is on the way!");
  }
  return data;
}

/** Volunteer marks food as delivered */
export async function markDelivered(requestId: string) {
  const { data, error } = await supabase
    .from("pickup_requests")
    .update({ status: "delivered" as any } as any)
    .eq("id", requestId)
    .select(REQUEST_UPDATE_SELECT)
    .maybeSingle();
  if (error) throw error;

  const receiverId = (data as any)?.receiver_id;
  if (receiverId) {
    await createNotification(receiverId, "status_delivered", "Food delivered!", "Your food has been delivered! Please confirm receipt.");
  }
  return data;
}

/** Receiver confirms delivery — marks listing as completed */
export async function confirmDelivery(requestId: string) {
  const { data, error } = await supabase
    .from("pickup_requests")
    .update({ status: "confirmed" as any } as any)
    .eq("id", requestId)
    .select(REQUEST_UPDATE_SELECT)
    .maybeSingle();
  if (error) throw error;

  const listingId = (data as any)?.listing_id;
  if (listingId) {
    await supabase.from("food_listings").update({ status: "completed" as any }).eq("id", listingId);
    const { data: listing } = await supabase.from("food_listings").select("donor_id, title").eq("id", listingId).maybeSingle();
    if ((listing as any)?.donor_id) {
      await createNotification((listing as any).donor_id, "delivery_confirmed", "Delivery confirmed!", `"${(listing as any).title}" was successfully delivered and confirmed.`);
    }
  }
  return data;
}

/** Receiver completes self-pickup — marks listing as completed directly */
export async function completeSelfPickup(requestId: string) {
  const { data, error } = await supabase
    .from("pickup_requests")
    .update({ status: "confirmed" as any } as any)
    .eq("id", requestId)
    .select(REQUEST_UPDATE_SELECT)
    .maybeSingle();
  if (error) throw error;

  const listingId2 = (data as any)?.listing_id;
  if (listingId2) {
    await supabase.from("food_listings").update({ status: "completed" as any }).eq("id", listingId2);
    const { data: listing2 } = await supabase.from("food_listings").select("donor_id, title").eq("id", listingId2).maybeSingle();
    if ((listing2 as any)?.donor_id) {
      await createNotification((listing2 as any).donor_id, "self_pickup_completed", "Self-pickup completed!", `"${(listing2 as any).title}" was picked up and confirmed by the receiver.`);
    }
  }
  return data;
}

/** Receiver cancels their request */
export async function cancelRequest(requestId: string, listingId: string) {
  const { error } = await supabase
    .from("pickup_requests")
    .update({ status: "cancelled" as any } as any)
    .eq("id", requestId);
  if (error) throw error;
  const { error: cancelRpcError } = await (supabase as any).rpc("update_listing_status", { p_listing_id: listingId, p_new_status: "available" });
  if (cancelRpcError) {
    await supabase.from("food_listings").update({ status: "available" as any }).eq("id", listingId);
  }
}

// ── Query helpers ──────────────────────────────────────────────

export async function fetchRequestsForReceiver(receiverId: string) {
  const { data, error } = await supabase
    .from("pickup_requests")
    .select(REQUEST_SELECT)
    .eq("receiver_id", receiverId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data as unknown as PickupRequest[];
}

export async function fetchRequestsForDonor(donorId: string) {
  // BUG FIX: Cannot filter on a related table column directly with the JS client.
  // Fetch all requests that join to listings, then filter client-side by donor_id.
  const { data, error } = await supabase
    .from("pickup_requests")
    .select(REQUEST_SELECT)
    .order("created_at", { ascending: false });
  if (error) throw error;
  const all = data as unknown as PickupRequest[];
  return all.filter((r) => r.food_listings?.donor_id === donorId);
}

export async function fetchVolunteerAvailableRequests() {
  const { data, error } = await supabase
    .from("pickup_requests")
    .select(REQUEST_SELECT)
    .eq("status", "volunteer_requested" as any)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data as unknown as PickupRequest[];
}

export async function fetchVolunteerMyRequests(volunteerId: string) {
  const { data, error } = await supabase
    .from("pickup_requests")
    .select(REQUEST_SELECT)
    .eq("volunteer_id", volunteerId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data as unknown as PickupRequest[];
}

export async function fetchAllRequestsAdmin() {
  const { data, error } = await supabase
    .from("pickup_requests")
    .select(REQUEST_SELECT)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data as unknown as PickupRequest[];
}

// ── Display helpers ────────────────────────────────────────────

export function statusLabel(status: string) {
  const map: Record<string, string> = {
    pending: "Pending",
    accepted: "Accepted",
    picked_up: "Picked Up",
    delivered: "Delivered",
    cancelled: "Cancelled",
    donor_approved: "Approved",
    volunteer_requested: "Waiting for Volunteer",
    volunteer_accepted: "Volunteer Assigned",
    confirmed: "Completed",
  };
  return map[status] || status;
}

export function statusColor(status: string) {
  const map: Record<string, string> = {
    pending: "bg-yellow-500",
    accepted: "bg-blue-500",
    picked_up: "bg-orange-500",
    delivered: "bg-green-600",
    cancelled: "bg-muted-foreground",
    donor_approved: "bg-emerald-500",
    volunteer_requested: "bg-purple-500",
    volunteer_accepted: "bg-indigo-500",
    confirmed: "bg-green-700",
  };
  return map[status] || "bg-muted-foreground";
}
