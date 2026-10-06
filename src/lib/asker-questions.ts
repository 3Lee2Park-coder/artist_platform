import { prisma } from "@/lib/prisma";
import { toAskerQuestionView, type AskerQuestionView } from "@/lib/question-intake";

export async function listAskerIntakeQuestions(userId: string): Promise<AskerQuestionView[]> {
  try {
    const rows = await prisma.question.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      take: 50,
      include: {
        exhibition: { select: { id: true, title: true, artist: true } },
        artist: { select: { name: true, nickname: true } },
        work: { select: { title: true } },
        answers: {
          where: { visibility: { in: ["private", "public"] } },
          orderBy: { createdAt: "desc" },
          take: 1
        }
      }
    });

    return rows.map((row) =>
      toAskerQuestionView({
        id: row.id,
        status: row.status,
        text: row.text,
        exhibitionId: row.exhibitionId,
        exhibitionTitle: row.exhibition?.title,
        exhibitionArtist:
          row.exhibition?.artist || row.artist?.nickname || row.artist?.name || null,
        workTitle: row.work?.title,
        createdAt: row.createdAt,
        answer: row.answers[0]
          ? {
              text: row.answers[0].text,
              visibility: row.answers[0].visibility,
              createdAt: row.answers[0].createdAt
            }
          : null
      })
    );
  } catch (error) {
    console.error("listAskerIntakeQuestions failed", error);
    return [];
  }
}

export async function getAskerIntakeQuestionForUser(userId: string, questionId: string) {
  const row = await prisma.question.findFirst({
    where: { id: questionId, userId },
    include: {
      exhibition: {
        select: { id: true, title: true, artist: true, venue: true, district: true }
      },
      artist: { select: { id: true, name: true, nickname: true } },
      work: { select: { id: true, title: true } },
      answers: {
        where: { visibility: { in: ["private", "public"] } },
        orderBy: { createdAt: "desc" },
        take: 1
      }
    }
  });
  if (!row) return null;

  const relatedDecks = row.exhibitionId
    ? await prisma.curation.findMany({
        where: {
          published: true,
          OR: [
            { exhibitions: { some: { exhibitionId: row.exhibitionId } } },
            { stops: { some: { exhibitionId: row.exhibitionId } } }
          ]
        },
        select: { id: true, title: true, subtitle: true },
        take: 4,
        orderBy: [{ featured: "desc" }, { updatedAt: "desc" }]
      })
    : [];

  return {
    view: toAskerQuestionView({
      id: row.id,
      status: row.status,
      text: row.text,
      exhibitionId: row.exhibitionId,
      exhibitionTitle: row.exhibition?.title,
      exhibitionArtist:
        row.exhibition?.artist || row.artist?.nickname || row.artist?.name || null,
      workTitle: row.work?.title,
      createdAt: row.createdAt,
      answer: row.answers[0]
        ? {
            text: row.answers[0].text,
            visibility: row.answers[0].visibility,
            createdAt: row.answers[0].createdAt
          }
        : null
    }),
    exhibition: row.exhibition
      ? {
          id: row.exhibition.id,
          title: row.exhibition.title,
          artist: row.exhibition.artist,
          venue: row.exhibition.venue,
          district: row.exhibition.district
        }
      : null,
    relatedDecks: relatedDecks.map((deck) => ({
      id: deck.id,
      title: deck.title,
      subtitle: deck.subtitle,
      href: `/decks/${deck.id}`
    }))
  };
}
