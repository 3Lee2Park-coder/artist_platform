"use client";

import { setAnalyticsUserProperties } from "@/lib/client-analytics";
import { useEffect } from "react";

type MeResponse = {
  user?: {
    role?: string;
  } | null;
};

/**
 * Sets GA4 user_properties.role=staff for ADMIN sessions.
 * Regular members / logged-out users clear the property.
 */
export function AnalyticsIdentity() {
  useEffect(() => {
    let cancelled = false;

    void (async () => {
      try {
        const response = await fetch("/api/auth/me", { credentials: "same-origin" });
        if (!response.ok) {
          if (!cancelled) setAnalyticsUserProperties({ role: "anonymous" });
          return;
        }
        const data = (await response.json()) as MeResponse;
        if (cancelled) return;
        const role = data.user?.role;
        setAnalyticsUserProperties({
          role: role === "ADMIN" ? "staff" : role ? role.toLowerCase() : "anonymous"
        });
      } catch {
        if (!cancelled) setAnalyticsUserProperties({ role: "anonymous" });
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  return null;
}
