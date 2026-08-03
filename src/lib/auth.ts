import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";

export type UserRole = "MEMBER" | "ARTIST" | "GALLERY" | "ADMIN";
export type ArtistStatus = "NONE" | "PENDING" | "APPROVED" | "REJECTED";

const SESSION_COOKIE = "exhibit_session";
const SESSION_MAX_AGE = 60 * 60 * 24 * 7;

export type SessionUser = {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  artistStatus: ArtistStatus;
};

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
}

export async function destroySession() {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE);
}

export async function getSession(): Promise<SessionUser | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;

  if (!token) {
    return null;
  }

  try {
    const { payload } = await jwtVerify(token, getAuthSecret());
    const id = payload.id as string;
    const email = payload.email as string;
    const name = payload.name as string;
    const role = payload.role as UserRole;
    const artistStatus = payload.artistStatus as ArtistStatus;

    if (!id || !email || !name || !role || !artistStatus) {
      return null;
    }

    return { id, email, name, role: role as UserRole, artistStatus: artistStatus as ArtistStatus };
  } catch {
    return null;
  }
}

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
      role: true,
      artistStatus: true,
      interestTags: true,
      visitPurposes: true,
      onboardedAt: true
    }
  });
}

export function isApprovedArtist(session: SessionUser | null) {
  return (
    session?.role === "ARTIST" ||
    session?.role === "GALLERY" ||
    session?.role === "ADMIN" ||
    session?.artistStatus === "APPROVED"
  );
}
