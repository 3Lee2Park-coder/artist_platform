/**
 * Hide approved duplicate exhibitions and point their view logs at the keeper.
 * Default is dry-run. --apply writes a backup first, then one transaction.
 * --revert=<backup> restores only rows this script changed.
 */
import { PrismaClient } from "@prisma/client";
import { mkdirSync, readFileSync, writeFileSync } from "fs";
import { EXHIBITION_REDIRECTS, KEEPER_END_DATES } from "../src/lib/exhibition-redirects";

type Show = {
  id: string;
  status: string;
  startDate: string;
  endDate: string;
  updatedAt: Date;
};

type StatusChange = {
  id: string;
  keeperId: string;
  beforeStatus: string;
  afterStatus: string | null;
  updatedAt: string;
  action: "hide" | "skip";
  reason: string;
  keeperStart: string;
  keeperEnd: string;
  loserStart: string;
  loserEnd: string;
};

type EventChange = {
  id: string;
  beforeExhibitionId: string;
  afterExhibitionId: string;
};

type Backup = {
  script: "hide-duplicate-exhibitions";
  createdAt: string;
  exhibitions: StatusChange[];
  eventLogs: EventChange[];
};

function loadDatabaseUrl() {
  if (process.env.DATABASE_URL) return process.env.DATABASE_URL;
  for (const line of readFileSync(".env", "utf8").split("\n")) {
    if (!line.startsWith("DATABASE_URL=")) continue;
    return line.slice("DATABASE_URL=".length).replace(/^"|"$/g, "");
  }
  throw new Error("DATABASE_URL is missing");
}

function stamp() {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23"
  }).formatToParts(new Date());
  const get = (type: string) => parts.find((part) => part.type === type)?.value ?? "";
  return `${get("year")}${get("month")}${get("day")}-${get("hour")}${get("minute")}${get("second")}`;
}

function printTable(rows: StatusChange[]) {
  const header = [
    "loser_id",
    "keeper_id",
    "action",
    "before",
    "after",
    "keeper_start",
    "keeper_end",
    "loser_start",
    "loser_end",
    "reason"
  ];
  console.log(header.join("\t"));
  for (const row of rows) {
    console.log(
      [
        row.id,
        row.keeperId,
        row.action,
        row.beforeStatus,
        row.afterStatus ?? "-",
        row.keeperStart,
        row.keeperEnd,
        row.loserStart,
        row.loserEnd,
        row.reason
      ].join("\t")
    );
  }
  const hide = rows.filter((row) => row.action === "hide").length;
  const skip = rows.filter((row) => row.action === "skip").length;
  console.log(`rows ${rows.length} hide ${hide} skip ${skip}`);
}

async function plan(prisma: PrismaClient): Promise<{ rows: StatusChange[]; events: EventChange[] }> {
  const loserIds = Object.keys(EXHIBITION_REDIRECTS);
  const keeperIds = [...new Set(Object.values(EXHIBITION_REDIRECTS))];
  const shows = await prisma.exhibition.findMany({
    where: { id: { in: [...loserIds, ...keeperIds] } },
    select: { id: true, status: true, startDate: true, endDate: true, updatedAt: true }
  });
  const byId = new Map(shows.map((show) => [show.id, show as Show]));
  const rows: StatusChange[] = [];

  for (const [loserId, keeperId] of Object.entries(EXHIBITION_REDIRECTS)) {
    const loser = byId.get(loserId);
    const keeper = byId.get(keeperId);
    const base = {
      id: loserId,
      keeperId,
      beforeStatus: loser?.status ?? "MISSING",
      updatedAt: loser?.updatedAt.toISOString() ?? "",
      keeperStart: keeper?.startDate ?? "",
      keeperEnd: keeper?.endDate ?? "",
      loserStart: loser?.startDate ?? "",
      loserEnd: loser?.endDate ?? ""
    };

    if (!keeper) {
      rows.push({ ...base, afterStatus: null, action: "skip", reason: "keeper 없음" });
      console.warn(`skip ${loserId}: keeper ${keeperId} 가 없습니다.`);
      continue;
    }
    if (keeper.status !== "PUBLISHED") {
      rows.push({
        ...base,
        afterStatus: null,
        action: "skip",
        reason: `keeper status=${keeper.status}`
      });
      console.warn(`skip ${loserId}: keeper ${keeperId} status=${keeper.status}`);
      continue;
    }
    const expectedEnd = KEEPER_END_DATES[keeperId];
    if (expectedEnd && keeper.endDate !== expectedEnd) {
      rows.push({
        ...base,
        afterStatus: null,
        action: "skip",
        reason: `keeper endDate ${keeper.endDate} != ${expectedEnd}`
      });
      console.warn(
        `skip ${loserId}: keeper ${keeperId} endDate=${keeper.endDate}, 기대값 ${expectedEnd}`
      );
      continue;
    }
    if (!loser) {
      rows.push({ ...base, afterStatus: null, action: "skip", reason: "loser 없음" });
      continue;
    }
    if (loser.status !== "PUBLISHED") {
      rows.push({
        ...base,
        afterStatus: null,
        action: "skip",
        reason: `skip(원래 상태 ${loser.status})`
      });
      continue;
    }
    rows.push({
      ...base,
      afterStatus: "HIDDEN",
      action: "hide",
      reason: "PUBLISHED → HIDDEN"
    });
  }

  const hideIds = rows.filter((row) => row.action === "hide").map((row) => row.id);
  const logs = hideIds.length
    ? await prisma.eventLog.findMany({
        where: { exhibitionId: { in: hideIds } },
        select: { id: true, exhibitionId: true }
      })
    : [];
  const events: EventChange[] = logs.flatMap((log) => {
    const before = log.exhibitionId;
    if (!before) return [];
    const after = EXHIBITION_REDIRECTS[before];
    if (!after) return [];
    return [{ id: log.id, beforeExhibitionId: before, afterExhibitionId: after }];
  });

  const cardKeys = loserIds.map((id) => `exhibition:${id}`);
  const [deckCards, calendarCards] = await Promise.all([
    prisma.userDeckCard.count({ where: { cardKey: { in: cardKeys } } }),
    prisma.calendarEntry.count({ where: { cardKey: { in: cardKeys } } })
  ]);
  console.log(`EventLog references ${events.length}`);
  console.log(`UserDeckCard cardKey references ${deckCards}`);
  console.log(`CalendarEntry cardKey references ${calendarCards}`);
  return { rows, events };
}

async function apply(prisma: PrismaClient) {
  const { rows, events } = await plan(prisma);
  printTable(rows);
  const backup: Backup = {
    script: "hide-duplicate-exhibitions",
    createdAt: new Date().toISOString(),
    exhibitions: rows,
    eventLogs: events
  };
  mkdirSync("backups", { recursive: true });
  const path = `backups/hide-dupes-${stamp()}.json`;
  try {
    writeFileSync(path, JSON.stringify(backup, null, 2));
  } catch (error) {
    console.error(`backup write failed: ${path}`);
    console.error(error);
    process.exitCode = 1;
    return;
  }

  const hideIds = rows.filter((row) => row.action === "hide").map((row) => row.id);
  const eventsByKeeper = new Map<string, string[]>();
  for (const event of events) {
    const list = eventsByKeeper.get(event.afterExhibitionId) ?? [];
    list.push(event.id);
    eventsByKeeper.set(event.afterExhibitionId, list);
  }
  try {
    await prisma.$transaction(
      async (tx) => {
        for (const id of hideIds) {
          const current = await tx.exhibition.findUnique({
            where: { id },
            select: { status: true }
          });
          if (current?.status !== "PUBLISHED") {
            throw new Error(`${id} status changed before write (${current?.status ?? "MISSING"})`);
          }
          await tx.exhibition.update({ where: { id }, data: { status: "HIDDEN" } });
        }
        for (const [keeperId, ids] of eventsByKeeper) {
          await tx.eventLog.updateMany({
            where: { id: { in: ids } },
            data: { exhibitionId: keeperId }
          });
        }
      },
      { maxWait: 20_000, timeout: 180_000 }
    );
  } catch (error) {
    console.error("transaction failed. database was not changed. backup kept for inspection only.");
    console.error(error);
    process.exitCode = 1;
    return;
  }

  console.log(`applied. backup ${path}`);
  for (const row of rows.filter((item) => item.action === "hide")) {
    console.log(`${row.id} ${row.beforeStatus} → HIDDEN`);
  }
  console.log(`event logs moved ${events.length}`);
}

function readBackup(path: string | undefined): Backup {
  if (!path) {
    console.error("--revert needs a backup path");
    process.exit(1);
  }
  let raw: string;
  try {
    raw = readFileSync(path, "utf8");
  } catch {
    console.error(`backup file not found: ${path}`);
    process.exit(1);
  }
  const parsed = JSON.parse(raw) as Backup;
  if (parsed.script !== "hide-duplicate-exhibitions" || !Array.isArray(parsed.exhibitions)) {
    console.error("backup file is not from this script");
    process.exit(1);
  }
  return parsed;
}

async function revert(prisma: PrismaClient, path: string | undefined, write: boolean) {
  const backup = readBackup(path);
  const hides = backup.exhibitions.filter((row) => row.action === "hide");
  const events = backup.eventLogs ?? [];
  const shows = await prisma.exhibition.findMany({
    where: { id: { in: hides.map((row) => row.id) } },
    select: { id: true, status: true }
  });
  const statusOf = new Map(shows.map((show) => [show.id, show.status]));
  const drifted = hides.filter((row) => statusOf.get(row.id) !== row.afterStatus);
  const logs = events.length
    ? await prisma.eventLog.findMany({
        where: { id: { in: events.map((event) => event.id) } },
        select: { id: true, exhibitionId: true }
      })
    : [];
  const logOf = new Map(logs.map((log) => [log.id, log.exhibitionId]));
  const driftedLogs = events.filter((event) => logOf.get(event.id) !== event.afterExhibitionId);

  console.log(`revert candidates ${hides.length} event logs ${events.length}`);
  if (drifted.length || driftedLogs.length) {
    console.error("current rows differ from the backup after-state. nothing was changed.");
    for (const row of drifted) {
      console.error(`${row.id} backup after=${row.afterStatus} current=${statusOf.get(row.id) ?? "MISSING"}`);
    }
    for (const event of driftedLogs) {
      console.error(
        `event ${event.id} backup after=${event.afterExhibitionId} current=${logOf.get(event.id) ?? "MISSING"}`
      );
    }
    process.exitCode = 1;
    return;
  }
  if (!write) {
    for (const row of hides) console.log(`would restore ${row.id} ${row.afterStatus} → ${row.beforeStatus}`);
    console.log("dry-run. pass --apply with --revert to write.");
    return;
  }

  const eventsByBefore = new Map<string, string[]>();
  for (const event of events) {
    const list = eventsByBefore.get(event.beforeExhibitionId) ?? [];
    list.push(event.id);
    eventsByBefore.set(event.beforeExhibitionId, list);
  }
  await prisma.$transaction(
    async (tx) => {
      for (const row of hides) {
        await tx.exhibition.update({
          where: { id: row.id },
          data: { status: row.beforeStatus }
        });
      }
      for (const [loserId, ids] of eventsByBefore) {
        await tx.eventLog.updateMany({
          where: { id: { in: ids } },
          data: { exhibitionId: loserId }
        });
      }
    },
    { maxWait: 20_000, timeout: 180_000 }
  );
  for (const row of hides) console.log(`${row.id} ${row.afterStatus} → ${row.beforeStatus}`);
  console.log(`reverted ${hides.length} exhibitions and ${events.length} event logs`);
}

async function main() {
  const args = process.argv.slice(2);
  const applyWrite = args.includes("--apply");
  const revertArg = args.find((arg) => arg.startsWith("--revert"));
  const revertPath = revertArg?.includes("=") ? revertArg.slice(revertArg.indexOf("=") + 1) : undefined;
  if (revertArg && !revertPath) {
    console.error("use --revert=<backup path>");
    process.exit(1);
  }
  if (applyWrite && revertArg && args.filter((arg) => arg === "--apply").length > 1) {
    console.error("pass --apply once");
    process.exit(1);
  }

  const prisma = new PrismaClient({ datasources: { db: { url: loadDatabaseUrl() } } });
  try {
    if (revertArg) {
      await revert(prisma, revertPath, applyWrite);
      return;
    }
    if (!applyWrite) {
      const { rows, events } = await plan(prisma);
      printTable(rows);
      console.log(`dry-run. event logs that would move: ${events.length}`);
      return;
    }
    await apply(prisma);
  } finally {
    await prisma.$disconnect();
  }
}

void main();
