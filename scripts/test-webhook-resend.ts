import crypto from "crypto";
import { POST } from "../src/app/api/webhooks/resend/route";
import { NextRequest } from "next/server";

async function testResendWebhook() {
  console.log("--- Testing Resend Webhook Signature & Status Updates ---");

  const secret = process.env.RESEND_WEBHOOK_SECRET || "whsec_dev_testing_secret_12345";
  process.env.RESEND_WEBHOOK_SECRET = secret;

  const payload = JSON.stringify({
    type: "email.delivered",
    created_at: new Date().toISOString(),
    data: {
      email_id: "msg_test_12345",
      to: ["test.recipient@example.com"],
      subject: "Invitation delivered",
    },
  });

  const svixId = "msg_test_12345";
  const svixTimestamp = Math.floor(Date.now() / 1000).toString();

  // Create expected signature
  let rawSecret: Buffer;
  const cleanSecret = secret.startsWith("whsec_") ? secret.slice(6) : secret;
  try {
    rawSecret = Buffer.from(cleanSecret, "base64");
  } catch {
    rawSecret = Buffer.from(secret, "utf8");
  }

  const toSign = `${svixId}.${svixTimestamp}.${payload}`;
  const sig = crypto.createHmac("sha256", rawSecret).update(toSign).digest("base64");
  const svixSignature = `v1,${sig}`;

  // 1. Valid signature test
  const validReq = new NextRequest("http://localhost:3000/api/webhooks/resend", {
    method: "POST",
    headers: {
      "svix-id": svixId,
      "svix-timestamp": svixTimestamp,
      "svix-signature": svixSignature,
      "content-type": "application/json",
    },
    body: payload,
  });

  const validRes = await POST(validReq);
  const validJson = await validRes.json();
  console.log("Valid webhook response:", validRes.status, validJson);
  if (validRes.status !== 200 || validJson.status !== "delivered") {
    throw new Error(`Expected 200 delivered, got ${validRes.status}`);
  }
  console.log("✓ Webhook valid signature verified successfully!");

  // 2. Invalid signature test
  const invalidReq = new NextRequest("http://localhost:3000/api/webhooks/resend", {
    method: "POST",
    headers: {
      "svix-id": svixId,
      "svix-timestamp": svixTimestamp,
      "svix-signature": "v1,invalidsignature==",
      "content-type": "application/json",
    },
    body: payload,
  });

  const invalidRes = await POST(invalidReq);
  console.log("Invalid webhook response:", invalidRes.status);
  if (invalidRes.status !== 401) {
    throw new Error(`Expected 401 Unauthorized for bad signature, got ${invalidRes.status}`);
  }
  console.log("✓ Webhook invalid signature rejected with 401 Unauthorized!");
}

testResendWebhook().catch((e) => {
  console.error("Webhook test failed:", e);
  process.exit(1);
});
