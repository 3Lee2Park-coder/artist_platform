import { displayName } from "@/lib/nickname";
import { prisma } from "@/lib/prisma";
import { resolveMediaUrl } from "@/lib/storage-url";

export const KKIKKORI_AVATAR = "/brand/kkikkori-avatar.webp";

export function readShowOnHome(application: unknown): boolean {
  if (!application || typeof application !== "object") return false;
  return (application as { showOnHome?: unknown }).showOnHome === true;
}

export type HomeWalker = {
  id: string;
  displayName: string;
  initial: string;
  imageUrl: string | null;
  usesMascot: boolean;
  bio: string | null;
  href: string;
};

function familyInitial(name: string) {
  const trimmed = name.trim();
  const first = trimmed.charAt(0);
  return first || "술";
}

export async function getHomeWalkers(limit = 6): Promise<HomeWalker[]> {
  try {
    const records = await prisma.user.findMany({
      where: { artistStatus: "APPROVED" },
      take: 40,
      orderBy: { updatedAt: "desc" },
      select: {
        id: true,
        name: true,
        nickname: true,
        artistApplication: true
      }
    });

    return records
      .filter((user) => {
        const application = user.artistApplication as
          | { showOnHome?: boolean; status?: string }
          | null;
        return application?.status === "APPROVED" && readShowOnHome(application);
      })
      .slice(0, Math.max(1, limit))
      .map((user) => {
        const application = user.artistApplication as {
          profileImageUrl?: string | null;
          bio?: string | null;
        } | null;
        const shown = displayName(user);
        const imageUrl = resolveMediaUrl(application?.profileImageUrl) ?? null;

        return {
          id: user.id,
          displayName: shown,
          initial: familyInitial(shown),
          imageUrl,
          usesMascot: !imageUrl,
          bio: application?.bio?.slice(0, 80) ?? null,
          href: `/artists/${user.id}`
        };
      });
  } catch (error) {
    console.error("getHomeWalkers failed", error);
    return [];
  }
}
