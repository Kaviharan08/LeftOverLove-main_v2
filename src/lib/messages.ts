import { supabase } from "@/integrations/supabase/client";

export interface Message {
  id: string;
  listing_id: string;
  sender_id: string;
  receiver_id: string;
  content: string;
  read: boolean;
  created_at: string;
}

export interface MessageThread {
  listing_id: string;
  listing_title: string;
  other_user_id: string;
  other_user_name: string;
  last_message: string;
  last_message_at: string;
  unread_count: number;
}

export async function sendMessage(listingId: string, senderId: string, receiverId: string, content: string) {
  const { error } = await supabase.from("messages").insert({
    listing_id: listingId,
    sender_id: senderId,
    receiver_id: receiverId,
    content,
  });
  if (error) throw error;

  // Create notification for receiver
  await supabase.from("notifications").insert({
    user_id: receiverId,
    type: "new_message",
    title: "New message",
    body: content.slice(0, 100),
    link: `/messages/${listingId}/${senderId}`,
  });
}

export async function fetchThreadMessages(listingId: string, userId: string, otherUserId: string): Promise<Message[]> {
  const { data, error } = await supabase
    .from("messages")
    .select("*")
    .eq("listing_id", listingId)
    .or(`and(sender_id.eq.${userId},receiver_id.eq.${otherUserId}),and(sender_id.eq.${otherUserId},receiver_id.eq.${userId})`)
    .order("created_at", { ascending: true });
  if (error) throw error;
  return (data as Message[]) ?? [];
}

export async function markThreadAsRead(listingId: string, receiverId: string, senderId: string) {
  await supabase
    .from("messages")
    .update({ read: true })
    .eq("listing_id", listingId)
    .eq("sender_id", senderId)
    .eq("receiver_id", receiverId)
    .eq("read", false);
}

export async function fetchMyThreads(userId: string): Promise<MessageThread[]> {
  // Get all messages where user is sender or receiver
  const { data: messages, error } = await supabase
    .from("messages")
    .select("*")
    .or(`sender_id.eq.${userId},receiver_id.eq.${userId}`)
    .order("created_at", { ascending: false });

  if (error) throw error;
  if (!messages || messages.length === 0) return [];

  // Group by listing + other user
  const threadMap = new Map<string, { msgs: Message[]; otherUserId: string }>();
  for (const msg of messages as Message[]) {
    const otherUserId = msg.sender_id === userId ? msg.receiver_id : msg.sender_id;
    const key = `${msg.listing_id}__${otherUserId}`;
    if (!threadMap.has(key)) {
      threadMap.set(key, { msgs: [], otherUserId });
    }
    threadMap.get(key)!.msgs.push(msg);
  }

  // Fetch listing titles
  const listingIds = [...new Set(messages.map((m: Message) => m.listing_id))];
  const { data: listings } = await supabase.from("food_listings").select("id, title").in("id", listingIds);
  const listingMap = new Map((listings ?? []).map((l: any) => [l.id, l.title]));

  // Fetch user names
  const otherUserIds = [...new Set([...threadMap.values()].map((t) => t.otherUserId))];
  const { data: profiles } = await supabase.from("profiles").select("user_id, name").in("user_id", otherUserIds);
  const profileMap = new Map((profiles ?? []).map((p: any) => [p.user_id, p.name ?? "User"]));

  const threads: MessageThread[] = [];
  for (const [key, { msgs, otherUserId }] of threadMap) {
    const listingId = key.split("__")[0];
    const unread = msgs.filter((m) => m.receiver_id === userId && !m.read).length;
    threads.push({
      listing_id: listingId,
      listing_title: listingMap.get(listingId) ?? "Listing",
      other_user_id: otherUserId,
      other_user_name: profileMap.get(otherUserId) ?? "User",
      last_message: msgs[0].content,
      last_message_at: msgs[0].created_at,
      unread_count: unread,
    });
  }

  threads.sort((a, b) => new Date(b.last_message_at).getTime() - new Date(a.last_message_at).getTime());
  return threads;
}

export async function fetchUnreadCount(userId: string): Promise<number> {
  const { count, error } = await supabase
    .from("messages")
    .select("*", { count: "exact", head: true })
    .eq("receiver_id", userId)
    .eq("read", false);
  if (error) return 0;
  return count ?? 0;
}
