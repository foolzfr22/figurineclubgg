import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface SendEmailRequest {
  type: "message_reply" | "newsletter";
  to?: string;
  subject: string;
  body: string;
  subscriberIds?: string[];
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const { type, to, subject, body, subscriberIds }: SendEmailRequest = await req.json();

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceKey);

    const resendApiKey = Deno.env.get("RESEND_API_KEY");
    const fromEmail = Deno.env.get("FROM_EMAIL") ?? "noreply@figureclub.com";
    const fromName = Deno.env.get("FROM_NAME") ?? "Figure Club";

    if (!resendApiKey) {
      return new Response(
        JSON.stringify({ error: "Email service not configured. Set RESEND_API_KEY secret." }),
        { status: 503, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    let recipients: string[] = [];

    if (type === "message_reply" && to) {
      recipients = [to];
    } else if (type === "newsletter") {
      let query = supabase.from("newsletter_subscribers").select("email");
      if (subscriberIds && subscriberIds.length > 0) {
        query = query.in("id", subscriberIds);
      }
      const { data: subscribers, error: subError } = await query;
      if (subError) {
        return new Response(
          JSON.stringify({ error: "Failed to fetch subscribers" }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      recipients = (subscribers ?? []).map((s: { email: string }) => s.email);
    } else {
      return new Response(
        JSON.stringify({ error: "Invalid request type" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (recipients.length === 0) {
      return new Response(
        JSON.stringify({ error: "No recipients found" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const sendPromises = recipients.map((recipient) =>
      fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${resendApiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: `${fromName} <${fromEmail}>`,
          to: recipient,
          subject,
          html: body,
        }),
      })
    );

    const results = await Promise.allSettled(sendPromises);
    const succeeded = results.filter((r) => r.status === "fulfilled").length;
    const failed = results.filter((r) => r.status === "rejected").length;

    return new Response(
      JSON.stringify({ success: true, sent: succeeded, failed }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ error: err.message ?? "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
