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

/**
 * Receiver accepts a food listing — no donor approval needed.
 * Status goes straight to "accepted", listing becomes "claimed".
 */
export async function createPickupRequest(listingId: string, receiverId: string, note?: string) {
  const { data, error } = await supabase
    .from("pickup_requests")
    .insert({ listing_id: listingId, receiver_id: receiverId, note: note || null, status: "accepted", self_pickup: true } as any)
    .select("*, food_listings(donor_id, title)")
    .single();
  if (error) throw error;

  const { error: claimRpcError } = await supabase.rpc("update_listing_status", { p_listing_id: listingId, p_new_status: "claimed" });
  if (claimRpcError) {
    await supabase.from("food_listings").update({ status: "claimed" as any }).eq("id", listingId);
  }

  const donorId = (data as any)?.food_listings?.donor_id;
  if (donorId) {
    await createNotification(donorId, "new_request", "Food accepted", `Someone accepted "${(data as any)?.food_listings?.title}"`, `/food/${listingId}`);
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
    .select(REQUEST_SELECT)
    .single();
  if (error) throw error;
  return data;
}

/** Volunteer accepts a volunteer_requested pickup */
export async function volunteerAcceptRequest(requestId: string, volunteerId: string) {
  const { data, error } = await supabase
    .from("pickup_requests")
    .update({ volunteer_id: volunteerId, status: "volunteer_accepted" as any } as any)
    .eq("id", requestId)
    .select("*, food_listings(title)")
    .single();
  if (error) throw error;

  const receiverId = (data as any)?.receiver_id;
  if (receiverId) {
    await createNotification(receiverId, "volunteer_accepted", "Volunteer assigned!", `A volunteer accepted your delivery for "${(data as any)?.food_listings?.title}"`);
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
    .select("*, food_listings(title)")
    .single();
  if (error) throw error;

  const receiverId = (data as any)?.receiver_id;
  if (receiverId) {
    await createNotification(receiverId, "status_picked_up", "Food picked up!", `Your food "${(data as any)?.food_listings?.title}" has been picked up and is on the way!`);
  }
  return data;
}

/** Volunteer marks food as delivered */
export async function markDelivered(requestId: string) {
  const { data, error } = await supabase
    .from("pickup_requests")
    .update({ status: "delivered" as any } as any)
    .eq("id", requestId)
    .select("*, food_listings(title)")
    .single();
  if (error) throw error;

  const receiverId = (data as any)?.receiver_id;
  if (receiverId) {
    await createNotification(receiverId, "status_delivered", "Food delivered!", `Your food "${(data as any)?.food_listings?.title}" has been delivered! Please confirm receipt.`);
  }
  return data;
}

/** Receiver confirms delivery — marks listing as completed */
export async function confirmDelivery(requestId: string) {
  const { data, error } = await supabase
    .from("pickup_requests")
    .update({ status: "confirmed" as any } as any)
    .eq("id", requestId)
    .select("*, food_listings(id, title, donor_id)")
    .single();
  if (error) throw error;

  if ((data as any)?.food_listings?.id) {
    const { error: rpcError } = await supabase.rpc("update_listing_status", { p_listing_id: (data as any).food_listings.id, p_new_status: "completed" });
    // Fallback: try direct update (works if caller is donor or RLS allows it)
    if (rpcError) {
      await supabase.from("food_listings").update({ status: "completed" as any }).eq("id", (data as any).food_listings.id);
    }
  }

  const donorId = (data as any)?.food_listings?.donor_id;
  if (donorId) {
    await createNotification(donorId, "delivery_confirmed", "Delivery confirmed!", `"${(data as any)?.food_listings?.title}" was successfully delivered and confirmed.`);
  }
  return data;
}

/** Receiver completes self-pickup — marks listing as completed directly */
export async function completeSelfPickup(requestId: string) {
  const { data, error } = await supabase
    .from("pickup_requests")
    .update({ status: "confirmed" as any } as any)
    .eq("id", requestId)
    .select("*, food_listings(id, title, donor_id)")
    .single();
  if (error) throw error;

  if ((data as any)?.food_listings?.id) {
    const { error: rpcError } = await supabase.rpc("update_listing_status", { p_listing_id: (data as any).food_listings.id, p_new_status: "completed" });
    // Fallback: try direct update (works if caller is donor or RLS allows it)
    if (rpcError) {
      await supabase.from("food_listings").update({ status: "completed" as any }).eq("id", (data as any).food_listings.id);
    }
  }

  const donorId = (data as any)?.food_listings?.donor_id;
  if (donorId) {
    await createNotification(donorId, "self_pickup_completed", "Self-pickup completed!", `"${(data as any)?.food_listings?.title}" was picked up and confirmed by the receiver.`);
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
  const { error: cancelRpcError } = await supabase.rpc("update_listing_status", { p_listing_id: listingId, p_new_status: "available" });
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
