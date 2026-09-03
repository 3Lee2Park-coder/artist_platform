import { permanentRedirect } from "next/navigation";
import { publicMeta } from "@/lib/seo";

export function generateMetadata() {
  return publicMeta({
    title: "서울 전시 발견 코스 — 전시와 동네 장소를 한 번에",
    description:
      "함께 둘러보기 좋은 전시·공간·동네 장소를 카드로 묶은 서울 전시 코스입니다.",
    canonical: "/decks"
  });
}

export default function CurationsIndexPage() {
  permanentRedirect("/decks");
}
