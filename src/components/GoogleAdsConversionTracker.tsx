"use client";

import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";

const CONVERSION_PATH = "/map";
const CONVERSION_DESTINATION = "AW-17704857949/X2F-CNHe1r8cEN3iqvpB";

type GoogleTagArguments = [command: "event", eventName: string, parameters: {
  send_to: string;
}];

declare global {
  interface Window {
    dataLayer?: unknown[];
    gtag?: (...args: GoogleTagArguments) => void;
  }
}

export function GoogleAdsConversionTracker() {
  const pathname = usePathname();
  const trackedVisit = useRef(false);

  useEffect(() => {
    if (pathname !== CONVERSION_PATH) {
      trackedVisit.current = false;
      return;
    }

    if (trackedVisit.current) {
      return;
    }

    trackedVisit.current = true;
    window.dataLayer = window.dataLayer || [];

    if (window.gtag) {
      window.gtag("event", "conversion", {
        send_to: CONVERSION_DESTINATION
      });
      return;
    }

    window.dataLayer.push([
      "event",
      "conversion",
      { send_to: CONVERSION_DESTINATION }
    ]);
  }, [pathname]);

  return null;
}
