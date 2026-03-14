import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    const { event_type, user_id, data } = await req.json();

    if (!event_type || !user_id) {
      return new Response(JSON.stringify({ error: "Missing event_type or user_id" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check if user has email notifications enabled
    const { data: profile } = await supabase
      .from("profiles")
      .select("email_notifications, name")
      .eq("user_id", user_id)
      .single();

    if (!profile?.email_notifications) {
      return new Response(JSON.stringify({ message: "Email notifications disabled" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get user email from auth
    const { data: authUser } = await supabase.auth.admin.getUserById(user_id);
    if (!authUser?.user?.email) {
      return new Response(JSON.stringify({ error: "User email not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const email = authUser.user.email;
    const userName = profile.name || "User";

    // Generate email content based on event type
    let subject = "";
    let body = "";

    switch (event_type) {
      case "request_accepted":
        subject = "Your pickup request has been accepted!";
        body = `Hi ${userName},\n\nGreat news! Your request for "${data?.listing_title || "a food listing"}" has been accepted by a volunteer.\n\nPlease coordinate the pickup at your earliest convenience.\n\nBest,\nLeftoverLove Team`;
        break;
      case "food_expiring":
        subject = "Your food listing is expiring soon";
        body = `Hi ${userName},\n\nYour listing "${data?.listing_title || "food item"}" is expiring soon. Please consider updating or removing it.\n\nBest,\nLeftoverLove Team`;
        break;
      case "complaint_reply":
        subject = "Admin replied to your complaint";
        body = `Hi ${userName},\n\nAn admin has replied to your complaint "${data?.subject || ""}":\n\n"${data?.reply || ""}"\n\nBest,\nLeftoverLove Team`;
        break;
      case "account_banned":
        subject = "Account suspended";
        body = `Hi ${userName},\n\nYour LeftoverLove account has been suspended.${data?.reason ? ` Reason: ${data.reason}` : ""}\n\nPlease contact support if you believe this is a mistake.\n\nBest,\nLeftoverLove Team`;
        break;
      case "ngo_verified":
        subject = "Your NGO has been verified!";
        body = `Hi ${userName},\n\nCongratulations! Your organization "${data?.org_name || ""}" has been verified on LeftoverLove. You now have full access to bulk food claims.\n\nBest,\nLeftoverLove Team`;
        break;
      default:
        subject = "LeftoverLove Notification";
        body = `Hi ${userName},\n\n${data?.message || "You have a new notification."}\n\nBest,\nLeftoverLove Team`;
    }

    // Create an in-app notification as well
    await supabase.from("notifications").insert({
      user_id,
      title: subject,
      body: body.substring(0, 200),
      type: event_type,
      link: data?.link || null,
    });

    // Log the email intent (actual email sending would require an email service)
    console.log(`Email notification queued: to=${email}, subject=${subject}`);

    return new Response(
      JSON.stringify({
        success: true,
        message: "Notification created",
        email_to: email,
        subject,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
