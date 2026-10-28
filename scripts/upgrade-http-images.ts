/**
 * Upgrade allowlisted http:// image hosts to https:// in DB columns.
 * Default is dry-run. --apply writes after saving a backup under /tmp.
 * --restore=<backup path> restores before values (dry-run unless --apply).
 */
import { PrismaClient } from "@prisma/client";
import { readFileSync, writeFileSync } from "fs";
import { upgradeImageUrl, upgradeImagesInHtml } from "../src/lib/https-image";

type ColumnChange = {
  table: string;
  column: string;
  id: string;
  before: string;
  after: string;
};

type Backup = {
  script: "upgrade-http-images";
  createdAt: string;
  changes: ColumnChange[];
};

function databaseUrl() {
  if (process.env.DATABASE_URL) return process.env.DATABASE_URL;
  for (const line of readFileSync(".env", "utf8").split("\n")) {
    if (!line.startsWith("DATABASE_URL=")) continue;
    return line.slice("DATABASE_URL=".length).replace(/^"|"$/g, "");
  }
  throw new Error("DATABASE_URL is missing");
}

function upgradeJsonUrlList(raw: string) {
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return null;
    let changed = false;
    const next = parsed.map((item) => {
      if (typeof item !== "string") return item;
      const upgraded = upgradeImageUrl(item);
      if (upgraded && upgraded !== item) {
        changed = true;
        return upgraded;
      }
      return item;
    });
    if (!changed) return null;
    return JSON.stringify(next);
  } catch {
    return null;
  }
}

function printColumn(label: string, changes: ColumnChange[]) {
  console.log(`\n${label}: ${changes.length}`);
  for (const change of changes.slice(0, 5)) {
    console.log(`  ${change.id}`);
    console.log(`    before ${change.before.slice(0, 160)}`);
    console.log(`    after  ${change.after.slice(0, 160)}`);
  }
}

async function collect(prisma: PrismaClient): Promise<ColumnChange[]> {
  const changes: ColumnChange[] = [];

  const exhibitions = await prisma.exhibition.findMany({
    select: {
      id: true,
      heroImageUrl: true,
      descriptionImages: true,
      description: true
    }
  });
  for (const row of exhibitions) {
    if (row.heroImageUrl) {
      const after = upgradeImageUrl(row.heroImageUrl);
      if (after && after !== row.heroImageUrl) {
        changes.push({
          table: "Exhibition",
          column: "heroImageUrl",
          id: row.id,
          before: row.heroImageUrl,
          after
        });
      }
    }
    const imagesAfter = upgradeJsonUrlList(row.descriptionImages);
    if (imagesAfter && imagesAfter !== row.descriptionImages) {
      changes.push({
        table: "Exhibition",
        column: "descriptionImages",
        id: row.id,
        before: row.descriptionImages,
        after: imagesAfter
      });
    }
    const descriptionAfter = upgradeImagesInHtml(row.description);
    if (descriptionAfter !== row.description) {
      changes.push({
        table: "Exhibition",
        column: "description",
        id: row.id,
        before: row.description,
        after: descriptionAfter
      });
    }
  }

  const places = await prisma.place.findMany({
    select: { id: true, imageUrl: true }
  });
  for (const row of places) {
    if (!row.imageUrl) continue;
    const after = upgradeImageUrl(row.imageUrl);
    if (after && after !== row.imageUrl) {
      changes.push({
        table: "Place",
        column: "imageUrl",
        id: row.id,
        before: row.imageUrl,
        after
      });
    }
  }

  const spaces = await prisma.space.findMany({
    select: { id: true, heroImageUrl: true, imageUrls: true }
  });
  for (const row of spaces) {
    if (row.heroImageUrl) {
      const after = upgradeImageUrl(row.heroImageUrl);
      if (after && after !== row.heroImageUrl) {
        changes.push({
          table: "Space",
          column: "heroImageUrl",
          id: row.id,
          before: row.heroImageUrl,
          after
        });
      }
    }
    const imagesAfter = upgradeJsonUrlList(row.imageUrls);
    if (imagesAfter && imagesAfter !== row.imageUrls) {
      changes.push({
        table: "Space",
        column: "imageUrls",
        id: row.id,
        before: row.imageUrls,
        after: imagesAfter
      });
    }
  }

  const curations = await prisma.curation.findMany({
    select: { id: true, coverImageUrl: true, descriptionImages: true }
  });
  for (const row of curations) {
    if (row.coverImageUrl) {
      const after = upgradeImageUrl(row.coverImageUrl);
      if (after && after !== row.coverImageUrl) {
        changes.push({
          table: "Curation",
          column: "coverImageUrl",
          id: row.id,
          before: row.coverImageUrl,
          after
        });
      }
    }
    const imagesAfter = upgradeJsonUrlList(row.descriptionImages);
    if (imagesAfter && imagesAfter !== row.descriptionImages) {
      changes.push({
        table: "Curation",
        column: "descriptionImages",
        id: row.id,
        before: row.descriptionImages,
        after: imagesAfter
      });
    }
  }

  return changes;
}

function group(changes: ColumnChange[]) {
  const map = new Map<string, ColumnChange[]>();
  for (const change of changes) {
    const key = `${change.table}.${change.column}`;
    const list = map.get(key) ?? [];
    list.push(change);
    map.set(key, list);
  }
  return map;
}

const TRANSACTION_OPTIONS = { maxWait: 20_000, timeout: 180_000 } as const;

async function applyOne(
  tx: {
    exhibition: PrismaClient["exhibition"];
    place: PrismaClient["place"];
    space: PrismaClient["space"];
    curation: PrismaClient["curation"];
  },
  change: ColumnChange,
  value: string
) {
  if (change.table === "Exhibition") {
    await tx.exhibition.update({
      where: { id: change.id },
      data: { [change.column]: value }
    });
    return;
  }
  if (change.table === "Place") {
    await tx.place.update({
      where: { id: change.id },
      data: { [change.column]: value }
    });
    return;
  }
  if (change.table === "Space") {
    await tx.space.update({
      where: { id: change.id },
      data: { [change.column]: value }
    });
    return;
  }
  if (change.table === "Curation") {
    await tx.curation.update({
      where: { id: change.id },
      data: { [change.column]: value }
    });
  }
}

async function applyChanges(prisma: PrismaClient, changes: ColumnChange[]) {
  await prisma.$transaction(async (tx) => {
    for (const change of changes) {
      await applyOne(tx, change, change.after);
    }
  }, TRANSACTION_OPTIONS);
}

async function restore(prisma: PrismaClient, path: string, write: boolean) {
  let backup: Backup;
  try {
    backup = JSON.parse(readFileSync(path, "utf8")) as Backup;
  } catch {
    console.error("backup file not found or invalid");
    process.exit(1);
  }
  if (backup.script !== "upgrade-http-images" || !Array.isArray(backup.changes)) {
    console.error("backup is not from upgrade-http-images");
    process.exit(1);
  }

  console.log(`restore candidates ${backup.changes.length}`);
  for (const [key, list] of group(backup.changes)) {
    printColumn(key, list);
  }
  if (!write) {
    console.log("\ndry-run. pass --apply with --restore to write.");
    return;
  }

  await prisma.$transaction(async (tx) => {
    for (const change of backup.changes) {
      await applyOne(tx, change, change.before);
    }
  }, TRANSACTION_OPTIONS);
  console.log(`restored ${backup.changes.length} values from ${path}`);
}

async function main() {
  const args = process.argv.slice(2);
  const applyWrite = args.includes("--apply");
  const restoreArg = args.find((arg) => arg.startsWith("--restore"));
  const restorePath = restoreArg?.includes("=")
    ? restoreArg.slice(restoreArg.indexOf("=") + 1)
    : undefined;
  if (restoreArg && !restorePath) {
    console.error("use --restore=<backup path>");
    process.exit(1);
  }

  if (!process.env.DATABASE_URL) process.env.DATABASE_URL = databaseUrl();
  const prisma = new PrismaClient();
  try {
    if (restoreArg) {
      await restore(prisma, restorePath!, applyWrite);
      return;
    }

    const changes = await collect(prisma);
    for (const [key, list] of group(changes)) {
      printColumn(key, list);
    }
    console.log(`\ntotal ${changes.length}`);

    if (!applyWrite) {
      console.log("dry-run. pass --apply to write.");
      return;
    }

    const stamp = new Date()
      .toLocaleString("sv-SE", { timeZone: "Asia/Seoul" })
      .replace(/[-: ]/g, "")
      .slice(0, 14);
    const backupPath = `/tmp/http-images-backup-${stamp}.json`;
    const backup: Backup = {
      script: "upgrade-http-images",
      createdAt: new Date().toISOString(),
      changes
    };
    writeFileSync(backupPath, JSON.stringify(backup, null, 2));
    console.log(`backup ${backupPath}`);
    await applyChanges(prisma, changes);
    console.log(`applied ${changes.length}`);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : "upgrade failed");
  process.exit(1);
});
