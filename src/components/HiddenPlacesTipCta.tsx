import { HiddenPlacesTipControls } from "@/components/HiddenPlacesTipControls";
import { getSession } from "@/lib/auth";
import Link from "next/link";

/** Cookie-bound tip entry — Suspense boundary keeps home shell cacheable */
export async function HiddenPlacesTipCta() {
  const session = await getSession();

  if (!session) {
    return <HiddenPlacesTipFallback />;
  }

  return <HiddenPlacesTipControls />;
}

export function HiddenPlacesTipFallback() {
  return (
    <div className="hidden-place-tip-bar">
      <p>여기에 없는 곳을 알고 있나요?</p>
      <Link
        className="secondary-button"
        href="/auth/login?redirect=/#hidden-places"
      >
        로그인하고 제보하기
      </Link>
    </div>
  );
}
