/**
 * Read-only list of public-API exhibitions that look like the same show
 * under two URLs. Writes /tmp/exhibition-dupes.csv and .md. Does not write to the DB.
 */
import { PrismaClient } from "@prisma/client";
import { readFileSync, writeFileSync } from "fs";

const KEEPER_IDS = new Set(["public-202508210001995"]);

type Row = {
  id: string;
  title: string;
  venue: string;
  startDate: string;
  endDate: string;
  description: string;
  descriptionImages: string;
  heroImageUrl: string | null;
  status: string;
};

type Pair = {
  group: number;
  keeper: Row;
  loser: Row;
  titleExact: boolean;
  venueExact: boolean;
  reason: string;
};

function loadDatabaseUrl() {
  if (process.env.DATABASE_URL) return process.env.DATABASE_URL;
  const env = readFileSync(".env", "utf8");
  for (const line of env.split("\n")) {
    if (!line.startsWith("DATABASE_URL=")) continue;
    return line.slice("DATABASE_URL=".length).replace(/^"|"$/g, "");
  }
  throw new Error("DATABASE_URL is missing");
}

function normalize(value: string) {
  return value
    .normalize("NFKC")
    .toLowerCase()
    .replace(/[\s\u00a0]+/g, "")
    .replace(/[「」《》<>“”„‟『』【】〔〕()[\]{}（）〈〉"'`´]/g, "")
    .replace(/[^\p{L}\p{N}]+/gu, "");
}

function imageCount(raw: string) {
  try {
    const parsed = JSON.parse(raw) as unknown;
    return Array.isArray(parsed) ? parsed.filter(Boolean).length : 0;
  } catch {
    return 0;
  }
}

function overlaps(a: Row, b: Row) {
  return a.startDate <= b.endDate && a.endDate >= b.startDate;
}

function includesEnough(a: string, b: string) {
  if (!a || !b || a === b) return false;
  const [shorter, longer] = a.length <= b.length ? [a, b] : [b, a];
  return shorter.length >= 6 && longer.includes(shorter);
}

function titleMatch(a: string, b: string) {
  if (!a || !b) return null;
  if (a === b) return "exact" as const;
  if (includesEnough(a, b)) return "include" as const;
  return null;
}

function venueMatch(a: string, b: string) {
  if (!a || !b) return null;
  if (a === b) return "exact" as const;
  if (a.includes(b) || b.includes(a)) return "include" as const;
  return null;
}

function score(row: Row) {
  return [
    row.heroImageUrl ? 1 : 0,
    row.description.trim().length,
    imageCount(row.descriptionImages),
    row.id.startsWith("public-") ? 1 : 0
  ] as const;
}

function chooseKeeper(a: Row, b: Row) {
  const aFixed = KEEPER_IDS.has(a.id);
  const bFixed = KEEPER_IDS.has(b.id);
  if (aFixed && !bFixed) return { keeper: a, loser: b, reason: "광고 랜딩으로 고정된 URL" };
  if (bFixed && !aFixed) return { keeper: b, loser: a, reason: "광고 랜딩으로 고정된 URL" };

  const as = score(a);
  const bs = score(b);
  for (let i = 0; i < as.length; i += 1) {
    if (as[i] === bs[i]) continue;
    const winner = as[i] > bs[i] ? a : b;
    const loser = winner === a ? b : a;
    const reason =
      i === 0
        ? "대표 이미지가 있는 쪽"
        : i === 1
          ? "설명이 더 긴 쪽"
          : i === 2
            ? "본문 이미지가 더 많은 쪽"
            : "동률이라 public- 쪽";
    return { keeper: winner, loser, reason };
  }
  const [keeper, loser] = a.id < b.id ? [a, b] : [b, a];
  return { keeper, loser, reason: "점수 동률이라 id 순" };
}

function csvCell(value: string | number) {
  const text = String(value);
  if (/[",\n]/.test(text)) return `"${text.replace(/"/g, '""')}"`;
  return text;
}

function mdCell(value: string | number) {
  return String(value).replace(/\|/g, "\\|").replace(/\n/g, " ");
}

function range(row: Row) {
  return `${row.startDate}~${row.endDate}`;
}

async function main() {
  const prisma = new PrismaClient({
    datasources: { db: { url: loadDatabaseUrl() } }
  });

  try {
    const rows = await prisma.exhibition.findMany({
      where: {
        status: { in: ["PUBLISHED", "HIDDEN"] },
        OR: [{ id: { startsWith: "cultureinfo-" } }, { id: { startsWith: "public-" } }]
      },
      select: {
        id: true,
        title: true,
        venue: true,
        startDate: true,
        endDate: true,
        description: true,
        descriptionImages: true,
        heroImageUrl: true,
        status: true
      }
    });

    const titles = rows.map((row) => normalize(row.title));
    const venues = rows.map((row) => normalize(row.venue));
    const parent = rows.map((_, index) => index);
    const find = (index: number): number => {
      let cursor = index;
      while (parent[cursor] !== cursor) cursor = parent[cursor];
      return cursor;
    };
    const unite = (a: number, b: number) => {
      const ra = find(a);
      const rb = find(b);
      if (ra !== rb) parent[rb] = ra;
    };

    const direct: Array<[number, number]> = [];
    for (let i = 0; i < rows.length; i += 1) {
      for (let j = i + 1; j < rows.length; j += 1) {
        if (!titleMatch(titles[i], titles[j])) continue;
        if (!venueMatch(venues[i], venues[j])) continue;
        if (!overlaps(rows[i], rows[j])) continue;
        direct.push([i, j]);
        unite(i, j);
      }
    }

    const groupOf = new Map<number, number>();
    let nextGroup = 1;
    for (const [i] of direct) {
      const root = find(i);
      if (!groupOf.has(root)) groupOf.set(root, nextGroup++);
    }

    const pairs: Pair[] = direct.map(([i, j]) => {
      const titleKind = titleMatch(titles[i], titles[j]);
      const venueKind = venueMatch(venues[i], venues[j]);
      const choice = chooseKeeper(rows[i], rows[j]);
      const matchNote = [
        titleKind === "exact" ? "제목 일치" : "제목 포함",
        venueKind === "exact" ? "장소 일치" : "장소 포함"
      ].join(", ");
      return {
        group: groupOf.get(find(i)) ?? 0,
        keeper: choice.keeper,
        loser: choice.loser,
        titleExact: titleKind === "exact",
        venueExact: venueKind === "exact",
        reason: `${choice.reason} (${matchNote})`
      };
    });

    pairs.sort((a, b) => a.group - b.group || a.keeper.id.localeCompare(b.keeper.id));

    const header = [
      "group",
      "keeper_id",
      "loser_id",
      "title_keeper",
      "title_loser",
      "venue",
      "start~end",
      "desc_len(k/l)",
      "hero(k/l)",
      "status(k/l)",
      "근거"
    ];

    const lines = pairs.map((pair) => {
      const period = `${range(pair.keeper)} / ${range(pair.loser)}`;
      const desc = `${pair.keeper.description.trim().length}/${pair.loser.description.trim().length}`;
      const hero = `${pair.keeper.heroImageUrl ? "Y" : "N"}/${pair.loser.heroImageUrl ? "Y" : "N"}`;
      const status = `${pair.keeper.status}/${pair.loser.status}`;
      return [
        pair.group,
        pair.keeper.id,
        pair.loser.id,
        pair.keeper.title,
        pair.loser.title,
        pair.keeper.venue,
        period,
        desc,
        hero,
        status,
        pair.reason
      ];
    });

    const csv = [header, ...lines].map((line) => line.map(csvCell).join(",")).join("\n") + "\n";
    const table = [
      `| ${header.join(" | ")} |`,
      `| ${header.map(() => "---").join(" | ")} |`,
      ...lines.map((line) => `| ${line.map(mdCell).join(" | ")} |`)
    ].join("\n");

    const ambiguous = pairs.filter((pair) => !pair.titleExact || !pair.venueExact);
    const ambiguousSection =
      ambiguous.length === 0
        ? "없음"
        : ambiguous
            .map(
              (pair) =>
                `- group ${pair.group}: ${pair.keeper.id} ↔ ${pair.loser.id} — ${pair.reason}`
            )
            .join("\n");

    const md = [
      "# 중복으로 보이는 공공 전시",
      "",
      `대상 ${rows.length}건, 쌍 ${pairs.length}개.`,
      "제목·장소·기간이 비슷한 다른 전시를 한 쌍으로 잘못 묶을 수 있다. 자동으로 숨기지 말고, 쌍마다 승인 또는 제외를 표시한 뒤 그 표만 다음 단계 입력으로 쓴다.",
      "",
      table,
      "",
      "## 애매한 쌍",
      "",
      "제목이나 장소가 완전히 같지 않고 포함 관계로만 묶인 쌍이다.",
      "",
      ambiguousSection,
      ""
    ].join("\n");

    writeFileSync("/tmp/exhibition-dupes.csv", csv);
    writeFileSync("/tmp/exhibition-dupes.md", md);
    console.log(`pairs ${pairs.length} ambiguous ${ambiguous.length}`);
    console.log("wrote /tmp/exhibition-dupes.csv");
    console.log("wrote /tmp/exhibition-dupes.md");
  } finally {
    await prisma.$disconnect();
  }
}

void main();
