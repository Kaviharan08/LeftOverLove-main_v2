import { supabase } from "@/integrations/supabase/client";
import type { Tables, TablesInsert, TablesUpdate } from "@/integrations/supabase/types";

export async function fetchFoodListings(status?: string) {
  let query = supabase.from("food_listings").select("*").order("created_at", { ascending: false });
  if (status) query = query.eq("status", status as any);
  const { data, error } = await query;
  if (error) throw error;
  return data;
}

export async function fetchMyListings(donorId: string) {
  const { data, error } = await supabase
    .from("food_listings")
    .select("*")
    .eq("donor_id", donorId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data;
}

export async function fetchListingById(id: string) {
  const { data, error } = await supabase.from("food_listings").select("*").eq("id", id).single();
  if (error) throw error;
  return data;
}

export async function createFoodListing(listing: TablesInsert<"food_listings">) {
  const { data, error } = await supabase.from("food_listings").insert(listing).select().single();
  if (error) throw error;
  return data;
}

export async function updateFoodListing(id: string, updates: TablesUpdate<"food_listings">) {
  const { data, error } = await supabase.from("food_listings").update(updates).eq("id", id).select().single();
  if (error) throw error;
  return data;
}

export async function deleteFoodListing(id: string) {
  const { error } = await supabase.from("food_listings").delete().eq("id", id);
  if (error) throw error;
}

export async function uploadFoodImage(userId: string, file: File): Promise<string> {
  const ext = file.name.split(".").pop();
  const path = `${userId}/${Date.now()}.${ext}`;
  const { error } = await supabase.storage.from("food-images").upload(path, file);
  if (error) throw error;
  const { data } = supabase.storage.from("food-images").getPublicUrl(path);
  return data.publicUrl;
}

export function getDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}
