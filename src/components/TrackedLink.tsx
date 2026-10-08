"use client";

import { trackProductEvent, type ClientEventType } from "@/lib/client-analytics";
import Link from "next/link";
import type { ReactNode } from "react";

type TrackedLinkProps = {
  href: string;
  children: ReactNode;
  className?: string;
  eventType: ClientEventType;
  exhibitionId?: string;
  source?: string;
  metadata?: Record<string, string | number | boolean | null | undefined>;
};

export function TrackedLink({
  href,
  children,
  className,
  eventType,
  exhibitionId,
  source,
  metadata
}: TrackedLinkProps) {
  return (
    <Link
      href={href}
      className={className}
      onClick={() =>
        void trackProductEvent({
          type: eventType,
          exhibitionId,
          source,
          metadata: { href, ...metadata }
        })
      }
    >
      {children}
    </Link>
  );
}
