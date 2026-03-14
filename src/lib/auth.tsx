import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { User, Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

type AppRole = "admin" | "donor" | "receiver" | "volunteer";

interface AuthContextType {
  user: User | null;
  session: Session | null;
  role: AppRole | null;
  loading: boolean;
  signUp: (email: string, password: string, name: string, role: AppRole) => Promise<{ requiresConfirmation: boolean }>;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [role, setRole] = useState<AppRole | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchRole = async (userId: string) => {
    const { data } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", userId)
      .maybeSingle();
    setRole((data?.role as AppRole) ?? null);
  };

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        // Handle stale/invalid refresh tokens gracefully
        if (event === "TOKEN_REFRESHED" && !session) {
          setSession(null);
          setUser(null);
          setRole(null);
          setLoading(false);
          return;
        }

        // Block unconfirmed users from being treated as logged in
        // Supabase fires SIGNED_IN even when email is unconfirmed
        const isConfirmed = session?.user?.email_confirmed_at || session?.user?.confirmed_at;
        if (session?.user && !isConfirmed) {
          // User signed up but hasn't confirmed email yet — don't set session
          setSession(null);
          setUser(null);
          setRole(null);
          setLoading(false);
          return;
        }

        setSession(session);
        setUser(session?.user ?? null);
        if (session?.user) {
          setTimeout(() => fetchRole(session.user.id), 0);
        } else {
          setRole(null);
        }
        setLoading(false);
      }
    );

    supabase.auth.getSession().then(({ data: { session } }) => {
      const isConfirmed = session?.user?.email_confirmed_at || session?.user?.confirmed_at;
      if (session?.user && !isConfirmed) {
        // Block unconfirmed users
        setSession(null);
        setUser(null);
        setRole(null);
        setLoading(false);
        return;
      }
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchRole(session.user.id);
      }
      setLoading(false);
    }).catch(() => {
      // Clear stale session on error (e.g. invalid refresh token)
      setSession(null);
      setUser(null);
      setRole(null);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signUp = async (email: string, password: string, name: string, role: AppRole) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/login`,
        data: { name, role },
      },
    });
    if (error) throw error;

    // Check if user is confirmed (email confirmation disabled = instant session)
    const isConfirmed = data.user?.email_confirmed_at || data.user?.confirmed_at;
    const hasSession = !!data.session && !!isConfirmed;

    if (hasSession && data.user) {
      // Email confirmation disabled — insert role immediately
      await supabase.from("user_roles").upsert(
        { user_id: data.user.id, role },
        { onConflict: "user_id" }
      );
      await supabase.from("profiles").upsert(
        { user_id: data.user.id, name },
        { onConflict: "user_id" }
      );
      setRole(role);
    }

    // requiresConfirmation = true if user is not yet confirmed
    return { requiresConfirmation: !hasSession };
  };

  const signIn = async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;

    // Check if user is banned
    const { data: profile } = await supabase
      .from("profiles")
      .select("is_banned, ban_reason")
      .eq("user_id", data.user.id)
      .single();

    if (profile?.is_banned) {
      await supabase.auth.signOut();
      throw new Error(
        `Your account has been suspended.${profile.ban_reason ? ` Reason: ${profile.ban_reason}` : ""} Contact support for assistance.`
      );
    }
  };

  const signOut = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
    // Clear state immediately so UI updates synchronously
    setUser(null);
    setSession(null);
    setRole(null);
  };

  return (
    <AuthContext.Provider value={{ user, session, role, loading, signUp, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within AuthProvider");
  return context;
}
