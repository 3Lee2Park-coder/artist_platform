import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

if (
  process.env.NODE_ENV !== "production" &&
  globalForPrisma.prisma &&
  (!("eventLog" in globalForPrisma.prisma) ||
    !("place" in globalForPrisma.prisma) ||
    !("notificationLog" in globalForPrisma.prisma))
) {
  globalForPrisma.prisma = undefined;
}

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"]
  });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
