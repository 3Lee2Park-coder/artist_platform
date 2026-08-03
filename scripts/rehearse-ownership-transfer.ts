/**
 * 소유권 이관 리허설 스크립트.
 *
 * Usage:
 *   npx tsx scripts/rehearse-ownership-transfer.ts \
 *     --email approved@example.com \
 *     --space-id clxxx \
 *     [--exhibition-id clyyy] \
 *     [--program-id clzzz] \
 *     [--dry-run]
 */
import { resolveApprovedArtistByEmail } from "../src/lib/admin-ownership";
import { prisma } from "../src/lib/prisma";

function arg(name: string) {
  const index = process.argv.indexOf(name);
  if (index === -1) return undefined;
  return process.argv[index + 1];
}

async function main() {
  const email = arg("--email");
  const spaceId = arg("--space-id");
  const exhibitionId = arg("--exhibition-id");
  const programId = arg("--program-id");
  const dryRun = process.argv.includes("--dry-run");

  if (!email || !spaceId) {
    console.error(
      "Required: --email <approved-artist@...> --space-id <id> [--exhibition-id] [--program-id] [--dry-run]"
    );
    process.exit(1);
  }

  const resolved = await resolveApprovedArtistByEmail(email);
  if (!resolved.ok) {
    console.error("Artist resolve failed:", resolved.error);
    process.exit(1);
  }

  console.log("Target artist:", resolved.user.email, resolved.user.id);
  if (dryRun) {
    console.log("Dry run — no writes.");
    process.exit(0);
  }

  const space = await prisma.space.update({
    where: { id: spaceId },
    data: { ownerUserId: resolved.user.id },
    select: { id: true, name: true, slug: true }
  });
  console.log("Space owned:", space.name, space.slug);

  if (exhibitionId) {
    const exhibition = await prisma.exhibition.update({
      where: { id: exhibitionId },
      data: { registeredById: resolved.user.id },
      select: { id: true, title: true }
    });
    console.log("Exhibition registrant:", exhibition.title);
  }

  if (programId) {
    const program = await prisma.program.update({
      where: { id: programId },
      data: { hostUserId: resolved.user.id },
      select: { id: true, title: true }
    });
    console.log("Program host:", program.title);
  }

  console.log("Rehearsal transfer complete. Verify in MY as the artist.");
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
