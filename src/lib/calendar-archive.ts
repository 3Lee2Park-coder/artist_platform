import { Prisma } from "@prisma/client";
import { annotateCards, makeCardKey, resolveCardKeys, type OoofCard } from "@/lib/cards";
import { getTodayKST } from "@/lib/date";
import { prisma } from "@/lib/prisma";
import { resolveMediaUrl } from "@/lib/storage-url";
import { getUserDeckForOwner, getUserDecks } from "@/lib/user-decks";

export type CalendarItemKind = "CARD" | "DECK" | "VISIT";

export type CalendarDayItem = {
  id: string;
  kind: CalendarItemKind;
  date: string;
  title: string;
  imageUrl: string | null;
  tone: string | null;
  cardKey?: string | null;
  deckId?: string | null;
  href?: string | null;
  locked?: boolean;
};

export type CalendarPickCard = {
  key: string;
  name: string;
  imageUrl: string | null;
};

export type CalendarPickDeck = {
  id: string;
  title: string;
  cardCount: number;
  coverImageUrl: string | null;
};

function isIgnorable(error: unknown) {
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    return error.code === "P2021" || error.code === "P2022";
  }
  return false;
}

function calendarEntryDb() {
  const entry = (prisma as { calendarEntry?: typeof prisma.calendarEntry }).calendarEntry;
  return entry ?? null;
}

function calendarShareDb() {
  const share = (prisma as { calendarShare?: typeof prisma.calendarShare }).calendarShare;
  return share ?? null;
}

function calendarDayCoverDb() {
  const cover = (prisma as { calendarDayCover?: typeof prisma.calendarDayCover })
    .calendarDayCover;
  return cover ?? null;
}

/** 개발 서버가 옛 Prisma 클라이언트를 붙잡고 있어도 대표 이미지 테이블은 쓸 수 있게 SQL로 우회한다. */
async function listDayCovers(userId: string, start: string, end: string) {
  const coverDb = calendarDayCoverDb();
  if (coverDb) {
    return coverDb.findMany({
      where: { userId, date: { gte: start, lte: end } },
      select: { date: true, itemRef: true }
    });
  }
  return prisma.$queryRaw<Array<{ date: string; itemRef: string }>>`
    SELECT "date", "itemRef"
    FROM "CalendarDayCover"
    WHERE "userId" = ${userId}
      AND "date" >= ${start}
      AND "date" <= ${end}
  `;
}

async function upsertDayCover(userId: string, date: string, itemRef: string) {
  const coverDb = calendarDayCoverDb();
  if (coverDb) {
    return coverDb.upsert({
      where: { userId_date: { userId, date } },
      create: { userId, date, itemRef },
      update: { itemRef }
    });
  }
  const id = `cdc_${crypto.randomUUID().replaceAll("-", "")}`;
  await prisma.$executeRaw`
    INSERT INTO "CalendarDayCover" ("id", "userId", "date", "itemRef", "createdAt", "updatedAt")
    VALUES (${id}, ${userId}, ${date}, ${itemRef}, NOW(), NOW())
    ON CONFLICT ("userId", "date")
    DO UPDATE SET "itemRef" = EXCLUDED."itemRef", "updatedAt" = NOW()
  `;
  return { id, userId, date, itemRef };
}

async function deleteDayCover(userId: string, where: { date?: string; itemRef?: string }) {
  const coverDb = calendarDayCoverDb();
  if (coverDb) {
    return coverDb.deleteMany({ where: { userId, ...where } });
  }
  if (where.date) {
    await prisma.$executeRaw`
      DELETE FROM "CalendarDayCover" WHERE "userId" = ${userId} AND "date" = ${where.date}
    `;
    return;
  }
  if (where.itemRef) {
    await prisma.$executeRaw`
      DELETE FROM "CalendarDayCover" WHERE "userId" = ${userId} AND "itemRef" = ${where.itemRef}
    `;
  }
}

export function shiftDate(ymd: string, days: number) {
  const [year, month, day] = ymd.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day + days));
  return date.toISOString().slice(0, 10);
}

export function monthStart(yearMonth: string) {
  return `${yearMonth}-01`;
}

export function addMonths(yearMonth: string, delta: number) {
  const [year, month] = yearMonth.split("-").map(Number);
  const date = new Date(year, month - 1 + delta, 1);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

export function upcomingWeekend(today = getTodayKST()) {
  const day = new Date(`${today}T12:00:00+09:00`).getDay();
  if (day === 0) {
    return { saturday: shiftDate(today, -1), sunday: today, label: "이번 주말" };
  }
  if (day === 6) {
    return { saturday: today, sunday: shiftDate(today, 1), label: "이번 주말" };
  }
  const toSaturday = 6 - day;
  return {
    saturday: shiftDate(today, toSaturday),
    sunday: shiftDate(today, toSaturday + 1),
    label: day >= 5 ? "이번 주말" : "다음 주말"
  };
}

function kstDate(value: Date) {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Seoul" }).format(value);
}

async function visitItems(userId: string, from: string, to: string): Promise<CalendarDayItem[]> {
  const fromDate = new Date(`${from}T00:00:00+09:00`);
  const toDate = new Date(`${to}T23:59:59+09:00`);
  const visits = await prisma.visit.findMany({
    where: { userId, visitedAt: { gte: fromDate, lte: toDate } },
    include: {
      exhibition: { select: { id: true, title: true, heroImageUrl: true, heroTone: true } },
      space: { select: { id: true, name: true, slug: true, heroImageUrl: true, heroTone: true } },
      place: { select: { id: true, name: true, imageUrl: true } },
      program: { select: { id: true, title: true, slug: true, heroImageUrl: true, heroTone: true } }
    }
  });

  return visits
    .map((visit): CalendarDayItem | null => {
      const date = kstDate(visit.visitedAt);
      if (visit.exhibition) {
        return {
          id: `visit-${visit.id}`,
          kind: "VISIT",
          date,
          title: visit.exhibition.title,
          imageUrl: resolveMediaUrl(visit.photoUrl || visit.exhibition.heroImageUrl) ?? null,
          tone: visit.exhibition.heroTone,
          cardKey: makeCardKey("exhibition", visit.exhibition.id),
          href: `/exhibitions/${visit.exhibition.id}`,
          locked: true
        };
      }
      if (visit.space) {
        return {
          id: `visit-${visit.id}`,
          kind: "VISIT",
          date,
          title: visit.space.name,
          imageUrl: resolveMediaUrl(visit.photoUrl || visit.space.heroImageUrl) ?? null,
          tone: visit.space.heroTone,
          cardKey: makeCardKey("space", visit.space.id),
          href: `/spaces/${visit.space.slug}`,
          locked: true
        };
      }
      if (visit.place) {
        return {
          id: `visit-${visit.id}`,
          kind: "VISIT",
          date,
          title: visit.place.name,
          imageUrl: resolveMediaUrl(visit.photoUrl || visit.place.imageUrl) ?? null,
          tone: null,
          cardKey: makeCardKey("place", visit.place.id),
          href: `/places/${visit.place.id}`,
          locked: true
        };
      }
      if (visit.program) {
        return {
          id: `visit-${visit.id}`,
          kind: "VISIT",
          date,
          title: visit.program.title,
          imageUrl: resolveMediaUrl(visit.photoUrl || visit.program.heroImageUrl) ?? null,
          tone: visit.program.heroTone,
          href: `/programs/${visit.program.slug}`,
          locked: true
        };
      }
      return null;
    })
    .filter((item): item is CalendarDayItem => Boolean(item));
}

export async function getCalendarMonth(userId: string, yearMonth: string) {
  const start = monthStart(yearMonth);
  const next = `${addMonths(yearMonth, 1)}-01`;
  const end = shiftDate(next, -1);
  const entry = calendarEntryDb();
  let rows: Array<{
    id: string;
    date: string;
    kind: string;
    cardKey: string | null;
    deckId: string | null;
    sortOrder: number;
  }> = [];

  if (entry) {
    try {
      rows = await entry.findMany({
        where: { userId, date: { gte: start, lte: end } },
        orderBy: [{ date: "asc" }, { sortOrder: "asc" }, { createdAt: "asc" }]
      });
    } catch (error) {
      if (!isIgnorable(error)) console.error("getCalendarMonth entries", error);
    }
  }

  const cardKeys = rows.filter((row) => row.kind === "CARD" && row.cardKey).map((row) => row.cardKey as string);
  const cards = cardKeys.length ? await annotateCards(await resolveCardKeys(cardKeys), userId) : [];
  const cardMap = new Map(cards.map((card) => [card.key, card]));

  // 달력에는 덱 전체 카드 hydrate가 필요 없다. 메타+커버만 가져온다.
  const deckRows = await prisma.userDeck.findMany({
    where: { userId },
    select: {
      id: true,
      title: true,
      accentColor: true,
      cards: {
        orderBy: { sortOrder: "asc" },
        take: 1,
        select: { cardKey: true }
      },
      _count: { select: { cards: true } }
    },
    orderBy: { updatedAt: "desc" },
    take: 40
  });
  const coverKeys = deckRows
    .map((row) => row.cards[0]?.cardKey)
    .filter((key): key is string => Boolean(key));
  const coverCards = coverKeys.length
    ? await annotateCards(await resolveCardKeys(coverKeys), userId)
    : [];
  const coverByKey = new Map(coverCards.map((card) => [card.key, card]));
  const decks = deckRows.map((row) => {
    const cover = row.cards[0]?.cardKey
      ? coverByKey.get(row.cards[0].cardKey)
      : undefined;
    return {
      id: row.id,
      title: row.title,
      accentColor: row.accentColor,
      cardCount: row._count.cards,
      coverImageUrl: cover?.visitedPhotoUrl || cover?.imageUrl || null
    };
  });
  const deckMap = new Map(decks.map((deck) => [deck.id, deck]));

  const planned: CalendarDayItem[] = rows.map((row) => {
    if (row.kind === "DECK" && row.deckId) {
      const deck = deckMap.get(row.deckId);
      return {
        id: row.id,
        kind: "DECK",
        date: row.date,
        title: deck?.title ?? "나의 덱",
        imageUrl: deck?.coverImageUrl ?? null,
        tone: deck?.accentColor ?? null,
        deckId: row.deckId
      };
    }
    const card = row.cardKey ? cardMap.get(row.cardKey) : undefined;
    return {
      id: row.id,
      kind: "CARD",
      date: row.date,
      title: card?.name ?? "카드",
      imageUrl: card?.visitedPhotoUrl || card?.imageUrl || null,
      tone: card?.tone ?? null,
      cardKey: row.cardKey,
      href: card?.href ?? null
    };
  });

  let visits: CalendarDayItem[] = [];
  try {
    visits = await visitItems(userId, start, end);
  } catch (error) {
    console.error("getCalendarMonth visits", error);
  }

  const days: Record<string, CalendarDayItem[]> = {};
  for (const item of [...visits, ...planned]) {
    (days[item.date] ??= []).push(item);
  }

  // 하루에 여러 항목이 있을 때 손님이 고른 대표 이미지
  const covers: Record<string, string> = {};
  try {
    const rows = await listDayCovers(userId, start, end);
    for (const row of rows) {
      if ((days[row.date] ?? []).some((item) => item.id === row.itemRef)) {
        covers[row.date] = row.itemRef;
      }
    }
  } catch (error) {
    if (!isIgnorable(error)) console.error("getCalendarMonth covers", error);
  }

  const savedRows = await prisma.savedCard.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    take: 40,
    select: { cardKey: true }
  });
  const savedCardsResolved = savedRows.length
    ? await annotateCards(
        await resolveCardKeys(savedRows.map((row) => row.cardKey)),
        userId
      )
    : [];

  const savedCards: CalendarPickCard[] = savedCardsResolved.map((card) => ({
    key: card.key,
    name: card.name,
    imageUrl: card.visitedPhotoUrl || card.imageUrl
  }));

  const pickDecks: CalendarPickDeck[] = decks.map((deck) => ({
    id: deck.id,
    title: deck.title,
    cardCount: deck.cardCount,
    coverImageUrl: deck.coverImageUrl
  }));

  return {
    today: getTodayKST(),
    month: yearMonth,
    weekend: upcomingWeekend(),
    days,
    covers,
    savedCards,
    decks: pickDecks
  };
}

/** 그날 항목 중 하나를 달력 칸 대표 이미지로 지정. itemRef가 null이면 자동으로 되돌린다. */
export async function setCalendarDayCover(
  userId: string,
  date: string,
  itemRef: string | null
) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) throw new Error("invalid date");

  if (!itemRef) {
    await deleteDayCover(userId, { date });
    return null;
  }

  const belongsToDay = await coverItemExists(userId, date, itemRef);
  if (!belongsToDay) throw new Error("item missing");

  return upsertDayCover(userId, date, itemRef);
}

async function coverItemExists(userId: string, date: string, itemRef: string) {
  if (itemRef.startsWith("visit-")) {
    const visit = await prisma.visit.findFirst({
      where: { id: itemRef.slice("visit-".length), userId },
      select: { visitedAt: true }
    });
    return Boolean(visit) && kstDate(visit!.visitedAt) === date;
  }

  const entry = calendarEntryDb();
  if (!entry) return false;
  const row = await entry.findFirst({
    where: { id: itemRef, userId, date },
    select: { id: true }
  });
  return Boolean(row);
}

export async function addCalendarEntry(
  userId: string,
  input: { date: string; kind: "CARD" | "DECK"; cardKey?: string; deckId?: string }
) {
  const entry = calendarEntryDb();
  if (!entry) throw new Error("calendar unavailable");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(input.date)) {
    throw new Error("invalid date");
  }

  if (input.kind === "CARD") {
    if (!input.cardKey) throw new Error("card required");
    const existing = await entry.findFirst({
      where: { userId, date: input.date, kind: "CARD", cardKey: input.cardKey }
    });
    if (existing) return existing;
    return entry.create({
      data: { userId, date: input.date, kind: "CARD", cardKey: input.cardKey }
    });
  }

  if (!input.deckId) throw new Error("deck required");
  const owned = await getUserDeckForOwner(userId, input.deckId);
  if (!owned) throw new Error("deck missing");
  const existing = await entry.findFirst({
    where: { userId, date: input.date, kind: "DECK", deckId: input.deckId }
  });
  if (existing) return existing;
  return entry.create({
    data: { userId, date: input.date, kind: "DECK", deckId: input.deckId }
  });
}

export async function removeCalendarEntry(userId: string, id: string) {
  const entry = calendarEntryDb();
  if (!entry) return false;
  const existing = await entry.findFirst({ where: { id, userId } });
  if (!existing) return false;
  await entry.delete({ where: { id } });
  try {
    await deleteDayCover(userId, { itemRef: id });
  } catch (error) {
    if (!isIgnorable(error)) console.error("removeCalendarEntry cover", error);
  }
  return true;
}

export async function shareCalendarDay(userId: string, date: string) {
  const share = calendarShareDb();
  if (!share) throw new Error("calendar unavailable");
  const existing = await share.findUnique({
    where: { userId_date: { userId, date } }
  });
  if (existing) return existing;
  return share.create({
    data: {
      userId,
      date,
      shareToken: crypto.randomUUID().replaceAll("-", "").slice(0, 16)
    }
  });
}

export async function getPublicCalendarDay(shareToken: string) {
  const share = calendarShareDb();
  if (!share) return null;
  const row = await share.findUnique({ where: { shareToken } });
  if (!row) return null;
  const month = row.date.slice(0, 7);
  const data = await getCalendarMonth(row.userId, month);
  const items = (data.days[row.date] ?? []).filter((item) => item.kind !== "VISIT");
  const user = await prisma.user.findUnique({
    where: { id: row.userId },
    select: { nickname: true, name: true }
  });
  const decks = await getUserDecks(row.userId);
  const dayDecks = items
    .filter((item) => item.kind === "DECK" && item.deckId)
    .map((item) => decks.find((deck) => deck.id === item.deckId))
    .filter((deck): deck is NonNullable<typeof deck> => Boolean(deck));
  const cardKeys = items.filter((item) => item.cardKey).map((item) => item.cardKey as string);
  const cards: OoofCard[] = cardKeys.length
    ? await annotateCards(await resolveCardKeys(cardKeys), row.userId)
    : [];

  return {
    date: row.date,
    ownerName: user?.nickname || user?.name || "OOOF.",
    items,
    decks: dayDecks,
    cards
  };
}

export async function getWeekendPreview(userId: string) {
  const weekend = upcomingWeekend();
  const month = weekend.saturday.slice(0, 7);
  const data = await getCalendarMonth(userId, month);
  const items = [
    ...(data.days[weekend.saturday] ?? []),
    ...(data.days[weekend.sunday] ?? [])
  ];
  return { ...weekend, items };
}
