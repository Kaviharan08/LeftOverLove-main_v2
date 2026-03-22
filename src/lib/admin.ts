import { supabase } from "@/integrations/supabase/client";

export type UserWithRole = {
  user_id: string;
  name: string | null;
  created_at: string;
  role: string | null;
  is_banned: boolean;
  ban_reason: string | null;
};

export type AuditLogEntry = {
  id: string;
  admin_id: string;
  action: string;
  target_type: string;
  target_id: string | null;
  details: any;
  created_at: string;
  admin_name?: string;
};

export type TopDonor = {
  donor_id: string;
  name: string | null;
  avatar_url: string | null;
  donation_count: number;
};

export async function fetchAllUsers(): Promise<UserWithRole[]> {
  const { data: profiles, error } = await supabase
    .from("profiles")
    .select("user_id, name, created_at, is_banned, ban_reason")
    .order("created_at", { ascending: false });
  if (error) throw error;

  const { data: roles } = await supabase.from("user_roles").select("user_id, role");
  const roleMap = new Map((roles ?? []).map((r) => [r.user_id, r.role]));

  return (profiles ?? []).map((p: any) => ({
    ...p,
    role: roleMap.get(p.user_id) ?? null,
  }));
}

export async function fetchTopDonors(limit = 5): Promise<TopDonor[]> {
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

  const { data: listings, error } = await supabase
    .from("food_listings")
    .select("donor_id")
    .gte("created_at", monthStart);
  if (error) throw error;

  // Count per donor
  const countMap = new Map<string, number>();
  (listings ?? []).forEach((l) => {
    countMap.set(l.donor_id, (countMap.get(l.donor_id) ?? 0) + 1);
  });

  // Sort by count descending
  const sorted = [...countMap.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit);

  if (sorted.length === 0) return [];

  const donorIds = sorted.map(([id]) => id);
  const { data: profiles } = await supabase
    .from("profiles")
    .select("user_id, name, avatar_url")
    .in("user_id", donorIds);

  const profileMap = new Map((profiles ?? []).map((p: any) => [p.user_id, p]));

  return sorted.map(([id, count]) => ({
    donor_id: id,
    name: profileMap.get(id)?.name ?? "Anonymous",
    avatar_url: profileMap.get(id)?.avatar_url ?? null,
    donation_count: count,
  }));
}

export async function fetchAuditLog(): Promise<AuditLogEntry[]> {
  const { data, error } = await supabase
    .from("admin_audit_log")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(200);
  if (error) throw error;

  const entries = (data ?? []) as unknown as AuditLogEntry[];
  const adminIds = [...new Set(entries.map((e) => e.admin_id))];
  if (adminIds.length > 0) {
    const { data: profiles } = await supabase.from("profiles").select("user_id, name").in("user_id", adminIds);
    const nameMap = new Map((profiles ?? []).map((p: any) => [p.user_id, p.name ?? "Admin"]));
    return entries.map((e) => ({ ...e, admin_name: nameMap.get(e.admin_id) ?? "Admin" }));
  }
  return entries;
}

export async function changeUserRole(userId: string, newRole: string) {
  await supabase.from("user_roles").delete().eq("user_id", userId);
  const { error } = await supabase
    .from("user_roles")
    .insert({ user_id: userId, role: newRole as any });
  if (error) throw error;
}

export async function deleteReviewAdmin(reviewId: string) {
  const { error } = await supabase.from("reviews").delete().eq("id", reviewId);
  if (error) throw error;
}

export async function fetchAllReviewsAdmin() {
  const { data, error } = await supabase
    .from("reviews")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) throw error;

  const reviews = data ?? [];
  const userIds = [...new Set(reviews.flatMap((r) => [r.reviewer_id, r.reviewed_user_id]))];
  if (userIds.length > 0) {
    const { data: profiles } = await supabase.from("profiles").select("user_id, name").in("user_id", userIds);
    const nameMap = new Map((profiles ?? []).map((p: any) => [p.user_id, p.name ?? "User"]));
    return reviews.map((r) => ({
      ...r,
      reviewer_name: nameMap.get(r.reviewer_id) ?? "User",
      reviewed_name: nameMap.get(r.reviewed_user_id) ?? "User",
    }));
  }
  return reviews.map((r) => ({ ...r, reviewer_name: "User", reviewed_name: "User" }));
}

export async function deleteListingAdmin(listingId: string, title?: string) {
  const { data: { user } } = await supabase.auth.getUser();
  const { error } = await supabase.from("food_listings").delete().eq("id", listingId);
  if (error) throw error;
  if (user) {
    try {
      await (supabase as any).from("admin_audit_log").insert({
        admin_id: user.id,
        action: "delete_listing",
        target_type: "food_listing",
        target_id: listingId,
        details: { title: title ?? listingId },
      });
    } catch {}
  }
}
