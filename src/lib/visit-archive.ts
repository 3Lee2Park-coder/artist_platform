import { prisma } from "@/lib/prisma";
import { resolveMediaUrl } from "@/lib/storage-url";

export type VisitArchiveKind = "EXHIBITION" | "SPACE" | "PROGRAM";

export const VISIT_KIND_LABEL: Record<VisitArchiveKind, string> = {
  EXHIBITION: "전시",
  SPACE: "작가 공간",
  PROGRAM: "프로그램"
};

// 사용자가 직접 남긴 방문 기록 1건 (전시/공간/프로그램 공통 표현)
export type VisitArchiveEntry = {
  id: string;
  kind: VisitArchiveKind;
  kindLabel: string;
  refId: string;
  title: string;
  subtitle: string | null;
  district: string | null;
  href: string;
  heroTone: string;
  heroImageUrl: string | null;
  visitedAt: string;
};

const FALLBACK_TONE = "linear-gradient(135deg, #efe6da 0%, #b8a68e 55%, #5c4a3a 100%)";

export async function getVisitArchive(
  userId: string
): Promise<VisitArchiveEntry[]> {
  const visits = await prisma.visit.findMany({
    where: { userId },
    orderBy: { visitedAt: "desc" },
    include: {
      exhibition: {
        select: {
          id: true,
          title: true,
          artist: true,
          venue: true,
          district: true,
          heroTone: true,
          heroImageUrl: true
        }
      },
      space: {
        select: {
          id: true,
          slug: true,
          name: true,
          district: true,
          heroTone: true,
          heroImageUrl: true,
          owner: { select: { name: true } }
        }
      },
      program: {
        select: {
          id: true,
          slug: true,
          title: true,
          type: true,
          heroTone: true,
          heroImageUrl: true,
          space: { select: { name: true, district: true } },
          host: { select: { name: true } }
        }
      }
    }
  });

  return visits
    .map((visit): VisitArchiveEntry | null => {
      if (visit.exhibition) {
        return {
          id: visit.id,
          kind: "EXHIBITION",
          kindLabel: VISIT_KIND_LABEL.EXHIBITION,
          refId: visit.exhibition.id,
          title: visit.exhibition.title,
          subtitle: `${visit.exhibition.artist} · ${visit.exhibition.venue}`,
          district: visit.exhibition.district,
          href: `/exhibitions/${visit.exhibition.id}`,
          heroTone: visit.exhibition.heroTone || FALLBACK_TONE,
          heroImageUrl: resolveMediaUrl(visit.exhibition.heroImageUrl) ?? null,
          visitedAt: visit.visitedAt.toISOString()
        };
      }
      if (visit.space) {
        return {
          id: visit.id,
          kind: "SPACE",
          kindLabel: VISIT_KIND_LABEL.SPACE,
          refId: visit.space.id,
          title: visit.space.name,
          subtitle: visit.space.owner?.name
            ? `${visit.space.owner.name} 작가의 공간`
            : null,
          district: visit.space.district,
          href: `/spaces/${visit.space.slug}`,
          heroTone: visit.space.heroTone || FALLBACK_TONE,
          heroImageUrl: resolveMediaUrl(visit.space.heroImageUrl) ?? null,
          visitedAt: visit.visitedAt.toISOString()
        };
      }
      if (visit.program) {
        return {
          id: visit.id,
          kind: "PROGRAM",
          kindLabel: VISIT_KIND_LABEL.PROGRAM,
          refId: visit.program.id,
          title: visit.program.title,
          subtitle: [visit.program.host?.name, visit.program.space.name]
            .filter(Boolean)
            .join(" · ") || null,
          district: visit.program.space.district,
          href: `/programs/${visit.program.slug}`,
          heroTone: visit.program.heroTone || FALLBACK_TONE,
          heroImageUrl: resolveMediaUrl(visit.program.heroImageUrl) ?? null,
          visitedAt: visit.visitedAt.toISOString()
        };
      }
      return null;
    })
    .filter((entry): entry is VisitArchiveEntry => Boolean(entry));
}
