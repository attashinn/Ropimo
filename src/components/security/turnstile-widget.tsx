"use client";

import * as React from "react";

export interface TurnstileWidgetProps {
  onVerify: (token: string) => void;
  className?: string;
}

export function TurnstileWidget({ onVerify, className = "" }: TurnstileWidgetProps) {
  const siteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;

  React.useEffect(() => {
    // If no site key is configured in dev/testing, auto-verify token
    if (!siteKey) {
      onVerify("dev-verified-token");
      return;
    }

    const scriptId = "cloudflare-turnstile-script";
    if (!document.getElementById(scriptId)) {
      const script = document.createElement("script");
      script.id = scriptId;
      script.src = "https://challenges.cloudflare.com/turnstile/v0/api.js";
      script.async = true;
      script.defer = true;
      document.head.appendChild(script);
    }

    (window as any).onTurnstileSuccess = (token: string) => {
      onVerify(token);
    };
  }, [siteKey, onVerify]);

  if (!siteKey) {
    return null;
  }

  return (
    <div
      className={`cf-turnstile my-2 ${className}`}
      data-sitekey={siteKey}
      data-callback="onTurnstileSuccess"
      data-theme="light"
    />
  );
}
