import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.42.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

serve(async (req: Request) => {
  // 1. Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // 2. Validate Authorization Header
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ success: false, error: "Unauthorized: Missing authorization header." }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? "";

    if (!supabaseUrl || !supabaseAnonKey) {
      return new Response(
        JSON.stringify({ success: false, error: "Server configuration error: Supabase environment missing." }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 3. Create Supabase client scoped to the caller's JWT token
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    // 4. Verify caller's authenticated session
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user || !user.email) {
      return new Response(
        JSON.stringify({ success: false, error: "Unauthorized: Valid authenticated session required." }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Derive user email strictly from authenticated identity
    const requesterEmail = user.email;
    const utcTimestamp = new Date().toISOString();

    // 5. Rate limiting guard (1 request per user per 15 minutes)
    try {
      const fifteenMinutesAgo = new Date(Date.now() - 15 * 60 * 1000).toISOString();
      const { data: recentRequests } = await supabase
        .from("access_requests")
        .select("id, created_at")
        .eq("user_id", user.id)
        .gte("created_at", fifteenMinutesAgo);

      if (recentRequests && recentRequests.length > 0) {
        return new Response(
          JSON.stringify({
            success: false,
            error: "You have already submitted an access request recently. Please wait a few minutes before trying again.",
          }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    } catch {
      // Table may not exist yet in SQL Editor; proceed safely
    }

    // 6. Retrieve Environment Secrets for Resend API
    const resendApiKey = Deno.env.get("RESEND_API_KEY");
    const recipientEmail = Deno.env.get("ACCESS_REQUEST_TO") || "mkirithik@gmail.com";
    const senderEmail = Deno.env.get("ACCESS_REQUEST_FROM") || "SATURN Access <access@resend.dev>";

    if (!resendApiKey) {
      console.error("[SATURN Edge Function request-access] RESEND_API_KEY environment secret is not set in Supabase Edge Function settings.");
      return new Response(
        JSON.stringify({
          success: false,
          error: "We couldn't send your request right now. Please try again later.",
        }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 7. Format Plain Text and HTML Email Bodies
    const plainTextBody = `A new SATURN access request has been submitted.

Requester email: ${requesterEmail}
Request time: ${utcTimestamp} (UTC)

Message: The user has requested access to the SATURN private workspace.

This email was generated automatically by SATURN. Review the request and decide whether to add the user's email to the authorized-account allowlist.`;

    const htmlBody = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>SATURN Access Request</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #000000; color: #F5F0E5; padding: 24px; margin: 0;">
  <div style="max-width: 520px; margin: 0 auto; background-color: #0c0a08; border: 1px solid rgba(247, 215, 148, 0.25); border-radius: 18px; padding: 32px; box-shadow: 0 16px 40px rgba(0,0,0,0.8);">
    <div style="text-align: center; margin-bottom: 24px;">
      <h2 style="color: #F7D794; letter-spacing: 0.22em; font-size: 22px; font-weight: 700; margin: 0;">SATURN</h2>
      <p style="color: rgba(247, 215, 148, 0.6); font-size: 11px; margin-top: 6px; font-family: monospace; letter-spacing: 0.1em; text-transform: uppercase;">ACCESS REQUEST NOTIFICATION</p>
    </div>
    
    <p style="font-size: 14px; line-height: 1.6; color: rgba(245,240,229,0.85);">
      A new user has submitted an access request for the private SATURN workspace.
    </p>

    <div style="background-color: rgba(255,255,255,0.03); border: 1px solid rgba(247, 215, 148, 0.15); border-radius: 12px; padding: 18px; margin: 20px 0; font-family: monospace; font-size: 13px;">
      <div style="margin-bottom: 10px;"><strong style="color: rgba(245,240,229,0.5);">Requester Email:</strong> <span style="color: #F7D794; font-weight: 600;">${escapeHtml(requesterEmail)}</span></div>
      <div><strong style="color: rgba(245,240,229,0.5);">Timestamp:</strong> <span style="color: #F5F0E5;">${utcTimestamp}</span></div>
    </div>

    <p style="font-size: 13px; line-height: 1.5; color: rgba(245,240,229,0.7);">
      Review this request and, if approved, add <strong style="color: #F7D794;">${escapeHtml(requesterEmail)}</strong> to the authorized email allowlist in your SATURN configuration.
    </p>

    <hr style="border: none; border-top: 1px solid rgba(247,215,148,0.12); margin: 24px 0;" />
    <p style="font-size: 11px; color: rgba(245,240,229,0.4); text-align: center; margin: 0;">
      Automated System Notification from SATURN Private Workspace
    </p>
  </div>
</body>
</html>`;

    // 8. Dispatch Email via Resend REST API
    const resendResponse = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${resendApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: senderEmail,
        to: [recipientEmail],
        subject: "SATURN — New Access Request",
        text: plainTextBody,
        html: htmlBody,
      }),
    });

    const resendData = await resendResponse.json();

    if (!resendResponse.ok) {
      console.error("Resend API Error:", resendData);
      return new Response(
        JSON.stringify({
          success: false,
          error: resendData.message || "Email provider rejected the request. Please check Resend configuration.",
        }),
        { status: resendResponse.status, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 9. Record Access Request in database for rate limiting & audit
    try {
      await supabase.from("access_requests").insert({
        user_id: user.id,
        requester_email: requesterEmail,
        created_at: utcTimestamp,
      });
    } catch (dbErr) {
      console.warn("Could not insert access_requests record:", dbErr);
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: "Access request sent successfully. Thank you — the workspace owner has been notified.",
        id: resendData.id,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : "Internal server error";
    return new Response(
      JSON.stringify({ success: false, error: errorMsg }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
