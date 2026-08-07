import { getSession } from "@/lib/auth";
import { getTodayKST } from "@/lib/date";
import {
  buildArtistReservationNoticeEmail,
  buildReservationConfirmEmail,
  getAppUrl
} from "@/lib/email";
import { logEvent } from "@/lib/events";
import { sendEmailOnce } from "@/lib/notifications";
import { prisma } from "@/lib/prisma";
import {
  findSlotCapacity,
  getSlotsForDate,
  parseReservationSchedule
} from "@/lib/reservation-slots";
import { NextResponse } from "next/server";
import { z } from "zod";

const reservationSchema = z
  .object({
    exhibitionId: z.string().min(1).optional(),
    programId: z.string().min(1).optional(),
    visitDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    slot: z.string().min(1)
  })
  .refine(
    (value) =>
      [value.exhibitionId, value.programId].filter(Boolean).length === 1,
    { message: "전시 또는 프로그램 중 하나만 예약할 수 있습니다." }
  );

type ReservationTarget = {
  kind: "exhibition" | "program";
  title: string;
  venue: string;
  startDate: string;
  endDate: string;
  reservationSlots: string;
  detailPath: string;
  exhibitionId: string | null;
  programId: string | null;
  hostUserId: string | null;
  kindLabel: string;
};

export async function POST(request: Request) {
  const session = await getSession();

  if (!session) {
    return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
  }

  try {
    const body = await request.json();
    const parsed = reservationSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "입력값이 올바르지 않습니다." },
        { status: 400 }
      );
    }

    const { exhibitionId, programId, visitDate, slot } = parsed.data;

    let target: ReservationTarget | null = null;

    if (exhibitionId) {
      const exhibition = await prisma.exhibition.findUnique({
        where: { id: exhibitionId }
      });

      if (!exhibition) {
        return NextResponse.json({ error: "전시를 찾을 수 없습니다." }, { status: 404 });
      }

      if (!exhibition.reservable) {
        return NextResponse.json(
          { error: "이 전시는 온라인 예약을 지원하지 않습니다." },
          { status: 400 }
        );
      }

      target = {
        kind: "exhibition",
        title: exhibition.title,
        venue: exhibition.venue,
        startDate: exhibition.startDate,
        endDate: exhibition.endDate,
        reservationSlots: exhibition.reservationSlots,
        detailPath: `/exhibitions/${exhibition.id}#reservation`,
        exhibitionId: exhibition.id,
        programId: null,
        hostUserId: exhibition.registeredById,
        kindLabel: "작가와의 대화"
      };
    } else if (programId) {
      const program = await prisma.program.findUnique({
        where: { id: programId },
        include: {
          space: { select: { name: true, ownerUserId: true } },
          exhibition: { select: { venue: true, title: true, registeredById: true } }
        }
      });

      if (!program || program.status !== "PUBLISHED" || !program.isPublic) {
        return NextResponse.json(
          { error: "프로그램을 찾을 수 없습니다." },
          { status: 404 }
        );
      }

      if (!program.reservationRequired) {
        return NextResponse.json(
          { error: "이 프로그램은 예약 없이 참여할 수 있습니다." },
          { status: 400 }
        );
      }

      target = {
        kind: "program",
        title: program.title,
        venue:
          program.space?.name ??
          program.exhibition?.venue ??
          program.exhibition?.title ??
          "장소 미정",
        startDate: program.startDate,
        endDate: program.endDate,
        reservationSlots: program.reservationSlots,
        detailPath: `/programs/${program.slug}`,
        exhibitionId: null,
        programId: program.id,
        hostUserId:
          program.hostUserId ??
          program.space?.ownerUserId ??
          program.exhibition?.registeredById ??
          null,
        kindLabel: "프로그램"
      };
    }

    if (!target) {
      return NextResponse.json({ error: "잘못된 요청입니다." }, { status: 400 });
    }

    if (visitDate < getTodayKST()) {
      return NextResponse.json(
        { error: "과거 날짜는 예약할 수 없습니다." },
        { status: 400 }
      );
    }

    if (visitDate < target.startDate || visitDate > target.endDate) {
      return NextResponse.json(
        { error: "운영 기간 밖의 날짜는 예약할 수 없습니다." },
        { status: 400 }
      );
    }

    const schedule = parseReservationSchedule(target.reservationSlots);
    const daySlots = getSlotsForDate(schedule, visitDate);
    const capacity = findSlotCapacity(schedule, visitDate, slot);

    if (!daySlots.some((item) => item.time === slot) || capacity == null) {
      return NextResponse.json(
        { error: "선택한 날짜/시간은 예약 가능하지 않습니다." },
        { status: 400 }
      );
    }

    const booked = await prisma.reservation.count({
      where: {
        ...(target.exhibitionId
          ? { exhibitionId: target.exhibitionId }
          : { programId: target.programId }),
        visitDate,
        slot,
        status: "CONFIRMED"
      }
    });

    if (booked >= capacity) {
      return NextResponse.json(
        { error: "해당 시간 정원이 마감되었습니다. 다른 시간을 선택해주세요." },
        { status: 409 }
      );
    }

    const reservation = await prisma.reservation.create({
      data: {
        userId: session.id,
        exhibitionId: target.exhibitionId,
        programId: target.programId,
        visitDate,
        slot
      }
    });
    await logEvent({
      type:
        target.kind === "program"
          ? "PROGRAM_RESERVATION_CREATE"
          : "RESERVATION_CREATE",
      userId: session.id,
      exhibitionId: target.exhibitionId,
      reservationId: reservation.id,
      source: "reservation_widget",
      metadata: {
        visitDate,
        slot,
        capacity,
        booked: booked + 1,
        programId: target.programId
      }
    });

    const user = await prisma.user.findUnique({
      where: { id: session.id },
      select: { id: true, email: true, name: true, notifyEmail: true, emailVerifiedAt: true }
    });

    if (user?.notifyEmail && user.emailVerifiedAt) {
      const template = buildReservationConfirmEmail({
        name: user.name,
        exhibitionTitle: target.title,
        venue: target.venue,
        visitDate,
        slot,
        detailUrl: getAppUrl(target.detailPath),
        kindLabel: target.kindLabel
      });

      await sendEmailOnce({
        userId: user.id,
        type: "RESERVATION_CONFIRM",
        dedupeKey: reservation.id,
        to: user.email,
        subject: template.subject,
        html: template.html,
        text: template.text,
        exhibitionId: target.exhibitionId ?? undefined,
        reservationId: reservation.id
      });
    }

    // 작가(호스트)에게 예약 알림
    if (target.hostUserId && target.hostUserId !== session.id) {
      const host = await prisma.user.findUnique({
        where: { id: target.hostUserId },
        select: {
          id: true,
          email: true,
          name: true,
          notifyEmail: true,
          emailVerifiedAt: true
        }
      });

      if (host?.notifyEmail && host.emailVerifiedAt && user) {
        const notice = buildArtistReservationNoticeEmail({
          artistName: host.name,
          guestName: user.name,
          guestEmail: user.email,
          title: target.title,
          venue: target.venue,
          visitDate,
          slot,
          manageUrl: getAppUrl("/my?tab=artist"),
          kindLabel: target.kindLabel
        });

        await sendEmailOnce({
          userId: host.id,
          type: "ARTIST_RESERVATION_NOTICE",
          dedupeKey: `${reservation.id}:host`,
          to: host.email,
          subject: notice.subject,
          html: notice.html,
          text: notice.text,
          exhibitionId: target.exhibitionId ?? undefined,
          reservationId: reservation.id
        });
      }
    }

    return NextResponse.json(
      {
        reservation,
        remaining: Math.max(0, capacity - booked - 1)
      },
      { status: 201 }
    );
  } catch (error) {
    if (
      error instanceof Error &&
      error.message.includes("Unique constraint")
    ) {
      return NextResponse.json(
        { error: "이미 예약된 시간입니다. 다른 시간을 선택해주세요." },
        { status: 409 }
      );
    }

    return NextResponse.json(
      { error: "예약 처리 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}

export async function GET(request: Request) {
  const session = await getSession();

  if (!session) {
    return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const exhibitionId = searchParams.get("exhibitionId");
  const programId = searchParams.get("programId");
  const visitDate = searchParams.get("visitDate");

  if ((exhibitionId || programId) && visitDate) {
    let rawSlots: string | null = null;

    if (exhibitionId) {
      const exhibition = await prisma.exhibition.findUnique({
        where: { id: exhibitionId },
        select: { reservationSlots: true }
      });
      if (!exhibition) {
        return NextResponse.json({ error: "전시를 찾을 수 없습니다." }, { status: 404 });
      }
      rawSlots = exhibition.reservationSlots;
    } else if (programId) {
      const program = await prisma.program.findUnique({
        where: { id: programId },
        select: { reservationSlots: true }
      });
      if (!program) {
        return NextResponse.json(
          { error: "프로그램을 찾을 수 없습니다." },
          { status: 404 }
        );
      }
      rawSlots = program.reservationSlots;
    }

    const schedule = parseReservationSchedule(rawSlots);
    const slots = getSlotsForDate(schedule, visitDate);
    const counts = await prisma.reservation.groupBy({
      by: ["slot"],
      where: {
        ...(exhibitionId ? { exhibitionId } : { programId }),
        visitDate,
        status: "CONFIRMED"
      },
      _count: { _all: true }
    });
    const countMap = new Map(counts.map((item) => [item.slot, item._count._all]));

    return NextResponse.json({
      slots: slots.map((slot) => ({
        time: slot.time,
        capacity: slot.capacity,
        booked: countMap.get(slot.time) ?? 0,
        remaining: Math.max(0, slot.capacity - (countMap.get(slot.time) ?? 0))
      }))
    });
  }

  const reservations = await prisma.reservation.findMany({
    where: { userId: session.id },
    include: {
      exhibition: { select: { id: true, title: true, venue: true, district: true } },
      program: {
        select: {
          id: true,
          slug: true,
          title: true,
          type: true,
          space: { select: { name: true, district: true } }
        }
      }
    },
    orderBy: { createdAt: "desc" }
  });

  return NextResponse.json({ reservations });
}
