import { prisma } from "@/lib/prisma";
import { displayName } from "@/lib/nickname";
import bcrypt from "bcryptjs";
import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import { cache } from "react";

export type UserRole = "MEMBER" | "ARTIST" | "GALLERY" | "ADMIN";
export type ArtistStatus = "NONE" | "PENDING" | "APPROVED" | "REJECTED";

const SESSION_COOKIE = "ooof_session";
/** Legacy cookie from Exhibit working name — read + clear on migrate */
const LEGACY_SESSION_COOKIE = "exhibit_session";
const SESSION_MAX_AGE = 60 * 60 * 24 * 7;

export type SessionUser = {
  id: string;
  email: string;
  name: string;
  nickname: string | null;
  role: UserRole;
  artistStatus: ArtistStatus;
};

export { displayName };

function getAuthSecret() {
  const secret = process.env.AUTH_SECRET;

  if (!secret) {
    throw new Error("AUTH_SECRET 환경 변수가 설정되지 않았습니다.");
  }

  return new TextEncoder().encode(secret);
}

export async function hashPassword(password: string) {
  return bcrypt.hash(password, 12);
}

export async function verifyPassword(password: string, passwordHash: string) {
  return bcrypt.compare(password, passwordHash);
}

export async function createSession(user: SessionUser) {
  const token = await new SignJWT({
    id: user.id,
    email: user.email,
    name: user.name,
    nickname: user.nickname,
    role: user.role,
    artistStatus: user.artistStatus
  })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${SESSION_MAX_AGE}s`)
    .sign(getAuthSecret());

  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: SESSION_MAX_AGE,
    path: "/"
  });
  cookieStore.delete(LEGACY_SESSION_COOKIE);
}

export async function destroySession() {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE);
  cookieStore.delete(LEGACY_SESSION_COOKIE);
}

export const getSession = cache(async (): Promise<SessionUser | null> => {
  const cookieStore = await cookies();
  const token =
    cookieStore.get(SESSION_COOKIE)?.value ??
    cookieStore.get(LEGACY_SESSION_COOKIE)?.value;

  if (!token) {
    return null;
  }

  try {
    const { payload } = await jwtVerify(token, getAuthSecret());
    const id = payload.id as string;

    if (!id) {
      return null;
    }

    const user = await prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        email: true,
        name: true,
        nickname: true,
        role: true,
        artistStatus: true
      }
    });

    if (!user) {
      return null;
    }

    return {
      id: user.id,
      email: user.email,
      name: user.name,
      nickname: user.nickname,
      role: user.role as UserRole,
      artistStatus: user.artistStatus as ArtistStatus
    };
  } catch {
    return null;
  }
});

export async function requireSession() {
  const session = await getSession();

  if (!session) {
    throw new Error("UNAUTHORIZED");
  }

  return session;
}

export async function getUserById(id: string) {
  return prisma.user.findUnique({
    where: { id },
    select: {
      id: true,
      email: true,
      name: true,
      nickname: true,
      role: true,
      artistStatus: true,
      interestTags: true,
      visitPurposes: true,
      onboardedAt: true
    }
  });
}

export function sessionDisplayName(session: SessionUser) {
  return displayName(session);
}

export function isApprovedArtist(session: SessionUser | null) {
  return (
    session?.role === "ARTIST" ||
    session?.role === "GALLERY" ||
    session?.role === "ADMIN" ||
    session?.artistStatus === "APPROVED"
  );
}
