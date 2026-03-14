import { useEffect, useState, useRef, useCallback } from "react";
import { useParams, Link } from "react-router-dom";
import { Navbar } from "@/components/Navbar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import {
  fetchMyThreads,
  fetchThreadMessages,
  sendMessage,
  markThreadAsRead,
  type MessageThread,
  type Message,
} from "@/lib/messages";
import { MessageSquare, Send, ArrowLeft } from "lucide-react";

export default function Messages() {
  const { listingId, otherUserId } = useParams<{ listingId?: string; otherUserId?: string }>();
  const { user } = useAuth();
  const [threads, setThreads] = useState<MessageThread[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMsg, setNewMsg] = useState("");
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);
  const bottomRef = useRef<HTMLDivElement>(null);

  const inThread = listingId && otherUserId;

  const loadThreads = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    const t = await fetchMyThreads(user.id);
    setThreads(t);
    setLoading(false);
  }, [user]);

  const loadMessages = useCallback(async () => {
    if (!user || !listingId || !otherUserId) return;
    const msgs = await fetchThreadMessages(listingId, user.id, otherUserId);
    setMessages(msgs);
    setLoading(false);
    await markThreadAsRead(listingId, user.id, otherUserId);
    setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: "smooth" }), 100);
  }, [user, listingId, otherUserId]);

  useEffect(() => {
    if (inThread) {
      setLoading(true);
      loadMessages();
    } else {
      loadThreads();
    }
  }, [loadMessages, loadThreads, inThread]);

  // Realtime for thread view
  useEffect(() => {
    if (!user || !inThread) return;
    const channel = supabase
      .channel("thread-messages")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "messages" }, () => loadMessages())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [user, listingId, otherUserId, loadMessages]);

  const handleSend = async () => {
    if (!user || !listingId || !otherUserId || !newMsg.trim()) return;
    setSending(true);
    try {
      await sendMessage(listingId, user.id, otherUserId, newMsg.trim());
      setNewMsg("");
      await loadMessages();
    } catch { }
    setSending(false);
  };

  const currentThread = threads.find((t) => t.listing_id === listingId && t.other_user_id === otherUserId);

  return (
    <div className="min-h-screen">
      <Navbar />
      <div className="container mx-auto max-w-2xl px-4 py-8">
        {inThread ? (
          <>
            <Link to="/messages" className="mb-4 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
              <ArrowLeft className="h-4 w-4" /> All Messages
            </Link>
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg">
                  {currentThread?.listing_title || "Conversation"}
                  <span className="ml-2 text-sm font-normal text-muted-foreground">
                    with {currentThread?.other_user_name || "User"}
                  </span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="mb-4 max-h-96 space-y-3 overflow-y-auto rounded-lg border bg-muted/30 p-4">
                  {loading ? (
                    <p className="text-center text-sm text-muted-foreground">Loading...</p>
                  ) : messages.length === 0 ? (
                    <p className="text-center text-sm text-muted-foreground">No messages yet. Say hello!</p>
                  ) : (
                    messages.map((msg) => (
                      <div
                        key={msg.id}
                        className={`flex ${msg.sender_id === user?.id ? "justify-end" : "justify-start"}`}
                      >
                        <div
                          className={`max-w-[75%] rounded-2xl px-4 py-2 text-sm ${
                            msg.sender_id === user?.id
                              ? "bg-primary text-primary-foreground"
                              : "bg-card border"
                          }`}
                        >
                          <p>{msg.content}</p>
                          <p className={`mt-1 text-[10px] ${msg.sender_id === user?.id ? "text-primary-foreground/70" : "text-muted-foreground"}`}>
                            {new Date(msg.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                          </p>
                        </div>
                      </div>
                    ))
                  )}
                  <div ref={bottomRef} />
                </div>
                <form
                  onSubmit={(e) => { e.preventDefault(); handleSend(); }}
                  className="flex gap-2"
                >
                  <Input
                    placeholder="Type a message..."
                    value={newMsg}
                    onChange={(e) => setNewMsg(e.target.value)}
                    disabled={sending}
                  />
                  <Button type="submit" size="icon" disabled={sending || !newMsg.trim()}>
                    <Send className="h-4 w-4" />
                  </Button>
                </form>
              </CardContent>
            </Card>
          </>
        ) : (
          <>
            <h1 className="mb-6 text-3xl font-bold flex items-center gap-2">
              <MessageSquare className="h-7 w-7" /> Messages
            </h1>
            {loading ? (
              <p className="text-muted-foreground">Loading...</p>
            ) : threads.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center text-muted-foreground">
                  No conversations yet. Start one from a food listing!
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-2">
                {threads.map((thread) => (
                  <Link
                    key={`${thread.listing_id}-${thread.other_user_id}`}
                    to={`/messages/${thread.listing_id}/${thread.other_user_id}`}
                    className="block"
                  >
                    <Card className={`transition-shadow hover:shadow-md ${thread.unread_count > 0 ? "border-primary/30 bg-primary/5" : ""}`}>
                      <CardContent className="flex items-center gap-4 p-4">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary font-bold">
                          {thread.other_user_name.charAt(0).toUpperCase()}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center justify-between gap-2">
                            <h3 className="text-sm font-semibold truncate">{thread.listing_title}</h3>
                            <span className="shrink-0 text-[10px] text-muted-foreground">
                              {new Date(thread.last_message_at).toLocaleDateString()}
                            </span>
                          </div>
                          <p className="text-xs text-muted-foreground">{thread.other_user_name}</p>
                          <p className="mt-0.5 text-sm text-muted-foreground truncate">{thread.last_message}</p>
                        </div>
                        {thread.unread_count > 0 && (
                          <Badge className="bg-primary text-primary-foreground shrink-0">{thread.unread_count}</Badge>
                        )}
                      </CardContent>
                    </Card>
                  </Link>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
