import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface VerifyPaymentRequest {
  orderId: string;
  razorpayOrderId: string;
  razorpayPaymentId: string;
  razorpaySignature: string;
}

async function verifySignature(
  razorpayOrderId: string,
  razorpayPaymentId: string,
  razorpaySignature: string,
  keySecret: string
): Promise<boolean> {
  const encoder = new TextEncoder();
  const keyData = encoder.encode(keySecret);
  const messageData = encoder.encode(`${razorpayOrderId}|${razorpayPaymentId}`);

  const cryptoKey = await crypto.subtle.importKey(
    "raw",
    keyData,
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );

  const signature = await crypto.subtle.sign("HMAC", cryptoKey, messageData);
  const expectedSignature = Array.from(new Uint8Array(signature))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");

  return expectedSignature === razorpaySignature;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const { orderId, razorpayOrderId, razorpayPaymentId, razorpaySignature }: VerifyPaymentRequest = await req.json();

    if (!orderId || !razorpayOrderId || !razorpayPaymentId || !razorpaySignature) {
      return new Response(
        JSON.stringify({ error: "Missing required payment verification fields" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceKey);

    const razorpayKeySecret = Deno.env.get("RAZORPAY_KEY_SECRET");

    if (!razorpayKeySecret) {
      return new Response(
        JSON.stringify({ error: "Razorpay credentials not configured" }),
        { status: 503, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Fetch the order from the database
    const { data: order, error: orderError } = await supabase
      .from("orders")
      .select("id, order_number, grand_total, razorpay_order_id, payment_status")
      .eq("id", orderId)
      .maybeSingle();

    if (orderError || !order) {
      return new Response(
        JSON.stringify({ error: "Order not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Verify that the razorpay_order_id matches what we have on record
    if (order.razorpay_order_id !== razorpayOrderId) {
      return new Response(
        JSON.stringify({ error: "Razorpay order ID mismatch" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Verify the payment signature using HMAC SHA-256
    const isValid = await verifySignature(
      razorpayOrderId,
      razorpayPaymentId,
      razorpaySignature,
      razorpayKeySecret
    );

    if (!isValid) {
      // Mark payment as failed
      await supabase
        .from("orders")
        .update({ payment_status: "failed" })
        .eq("id", order.id);

      return new Response(
        JSON.stringify({ error: "Payment verification failed" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Payment verified successfully - update the order
    await supabase
      .from("orders")
      .update({
        payment_status: "paid",
        razorpay_payment_id: razorpayPaymentId,
        razorpay_signature: razorpaySignature,
        status: "payment_verified",
      })
      .eq("id", order.id);

    // Add timeline entry
    await supabase.from("order_timeline").insert({
      order_id: order.id,
      status: "Payment Verified",
      note: "Razorpay payment verified successfully",
    });

    // Create admin notification
    await supabase.from("admin_notifications").insert({
      type: "payment_verified",
      title: "Payment Verified",
      message: `Payment verified for order ${order.order_number}`,
      entity_id: order.id,
    });

    // Send order confirmation email if email service is configured
    const resendApiKey = Deno.env.get("RESEND_API_KEY");
    const fromEmail = Deno.env.get("FROM_EMAIL") ?? "noreply@figureclub.com";
    const fromName = Deno.env.get("FROM_NAME") ?? "Figure Club";

    if (resendApiKey) {
      try {
        // Fetch full order details for the email
        const { data: fullOrder } = await supabase
          .from("orders")
          .select("*, order_items(*)")
          .eq("id", order.id)
          .maybeSingle();

        if (fullOrder) {
          const itemsHtml = (fullOrder.order_items || [])
            .map(
              (item: { product_name: string; quantity: number; price: number }) =>
                `<tr><td style="padding:8px;border-bottom:1px solid #e2e8f0;">${item.product_name}</td><td style="padding:8px;border-bottom:1px solid #e2e8f0;text-align:center;">${item.quantity}</td><td style="padding:8px;border-bottom:1px solid #e2e8f0;text-align:right;">Rs. ${(Number(item.price) * item.quantity).toFixed(0)}</td></tr>`
            )
            .join("");

          const emailBody = `<div style="font-family:sans-serif;max-width:600px;margin:0 auto;">
<h2 style="color:#3b82f6;">${fromName}</h2>
<p>Hi ${fullOrder.full_name},</p>
<p>Thank you for your order! Your payment has been verified successfully.</p>
<p><strong>Order Number:</strong> ${fullOrder.order_number}</p>
<p><strong>Payment ID:</strong> ${razorpayPaymentId}</p>
<table style="width:100%;border-collapse:collapse;margin:16px 0;">
<thead><tr style="background:#f1f5f9;"><th style="padding:8px;text-align:left;">Product</th><th style="padding:8px;">Qty</th><th style="padding:8px;text-align:right;">Price</th></tr></thead>
<tbody>${itemsHtml}</tbody>
</table>
<p style="font-size:18px;"><strong>Total: Rs. ${Number(fullOrder.grand_total).toFixed(0)}</strong></p>
<p style="color:#64748b;font-size:14px;margin-top:24px;">We will start processing your order shortly. You will receive updates as your order progresses.</p>
<p style="color:#64748b;font-size:14px;">— The ${fromName} Team</p>
</div>`;

          await fetch("https://api.resend.com/emails", {
            method: "POST",
            headers: {
              Authorization: `Bearer ${resendApiKey}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              from: `${fromName} <${fromEmail}>`,
              to: fullOrder.email,
              subject: `Order Confirmation - ${fullOrder.order_number}`,
              html: emailBody,
            }),
          });
        }
      } catch {
        // Email sending failure should not affect payment verification
      }
    }

    return new Response(
      JSON.stringify({ success: true, message: "Payment verified successfully" }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ error: err.message || "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
