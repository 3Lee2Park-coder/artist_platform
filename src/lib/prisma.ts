import { PrismaClient } from "@prisma/client";

/**
 * 개발 서버 HMR이 PrismaClient를 다시 만들 때마다 연결이 남는다.
 * Supabase는 클라이언트 연결이 200개에서 막히므로, 프로세스당 하나 + 풀 상한을 강제한다.
 */
const PRISMA_CLIENT_REV = 6;

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
  prismaRev?: number;
};

function databaseUrl() {
  const url = process.env.DATABASE_URL ?? "";
  if (!url) return url;
  if (/[?&]connection_limit=/.test(url)) return url;
  const limit = process.env.NODE_ENV === "production" ? 8 : 3;
  return `${url}${url.includes("?") ? "&" : "?"}connection_limit=${limit}`;
}

function createPrismaClient() {
  return new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
    datasources: {
      db: { url: databaseUrl() }
    }
  });
}

if (
  globalForPrisma.prisma &&
  globalForPrisma.prismaRev !== PRISMA_CLIENT_REV
) {
  void globalForPrisma.prisma.$disconnect();
  globalForPrisma.prisma = undefined;
}

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
  globalForPrisma.prismaRev = PRISMA_CLIENT_REV;
}
