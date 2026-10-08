import { cookies, headers } from "next/headers";
import { adminEmails } from "@/data/admins";
import { dbGet, dbRun } from "@/lib/db";
import type { AuthFormState, CurrentUser, VerifyState } from "@/lib/auth-types";
import { hashPassword, verifyPassword } from "@/lib/password";
import { createToken, hashToken } from "@/lib/tokens";

const SESSION_COOKIE = "farm_session";
const SESSION_DAYS = 14;
const VERIFICATION_HOURS = 24;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

type UserRow = {
  id: number;
  email: string;
  password_hash: string;
  verified_at: string | null;
};

const dummyPasswordHash = hashPassword("not-a-real-password");

function normalizeEmail(value: FormDataEntryValue | null) {
  return String(value ?? "").trim().toLowerCase();
}

function readPassword(value: FormDataEntryValue | null) {
  return String(value ?? "");
}

function validateCredentials(email: string, password: string): string | undefined {
  if (!EMAIL_PATTERN.test(email) || email.length > 254) {
    return "Enter a valid email address.";
  }
  if (password.length < 8) {
    return "Use at least 8 characters for the password.";
  }
  if (password.length > 128) {
    return "Use a password shorter than 128 characters.";
  }
  return undefined;
}

function hoursFromNow(hours: number) {
  return new Date(Date.now() + hours * 60 * 60 * 1000).toISOString();
}

function daysFromNow(days: number) {
  return new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString();
}

async function verificationUrl(token: string) {
  const path = `/verify?token=${encodeURIComponent(token)}`;
  if (process.env.NODE_ENV === "production") {
    return undefined;
  }

  const headerList = await headers();
  const host = headerList.get("x-forwarded-host") ?? headerList.get("host") ?? "localhost:3000";
  const proto = headerList.get("x-forwarded-proto") ?? "http";
  console.log(`Verification link: ${proto}://${host}${path}`);
  return path;
}

async function issueVerification(userId: number) {
  const { token, tokenHash } = createToken();
  await dbRun("DELETE FROM verification_tokens WHERE user_id = ?", [userId]);
  await dbRun(
    "INSERT INTO verification_tokens (token_hash, user_id, expires_at) VALUES (?, ?, ?)",
    [tokenHash, userId, hoursFromNow(VERIFICATION_HOURS)],
  );
  return token;
}

export async function signup(formData: FormData): Promise<AuthFormState> {
  const email = normalizeEmail(formData.get("email"));
  const password = readPassword(formData.get("password"));
  const confirmPassword = readPassword(formData.get("confirmPassword"));
  const validationError = validateCredentials(email, password);
  if (validationError) {
    return { error: validationError };
  }
  if (password !== confirmPassword) {
    return { error: "Those passwords do not match." };
  }

  const existing = await dbGet<{ id: number }>("SELECT id FROM users WHERE email = ?", [email]);
  if (existing) {
    return { error: "An account with that email already exists." };
  }

  const passwordHash = await hashPassword(password);
  const created = await dbRun(
    "INSERT INTO users (email, password_hash, created_at) VALUES (?, ?, ?)",
    [email, passwordHash, new Date().toISOString()],
  );
  const token = await issueVerification(created.lastInsertRowid);

  return {
    verificationUrl: await verificationUrl(token),
  };
}

export async function login(formData: FormData): Promise<AuthFormState> {
  const email = normalizeEmail(formData.get("email"));
  const password = readPassword(formData.get("password"));
  const validationError = validateCredentials(email, password);
  if (validationError) {
    return { error: "Email or password is incorrect." };
  }

  const user = await dbGet<UserRow>(
    "SELECT id, email, password_hash, verified_at FROM users WHERE email = ?",
    [email],
  );

  const passwordHash = user?.password_hash ?? (await dummyPasswordHash);
  const passwordMatches = await verifyPassword(password, passwordHash);
  if (!user || !passwordMatches) {
    return { error: "Email or password is incorrect." };
  }

  if (!user.verified_at) {
    const token = await issueVerification(user.id);
    return {
      error: "Verify your email before logging in. The link expires in 24 hours.",
      verificationUrl: await verificationUrl(token),
    };
  }

  await createSession(user.id);
  return {};
}

export async function verifyEmail(formData: FormData): Promise<VerifyState> {
  const token = String(formData.get("token") ?? "");
  if (!token) {
    return { error: "This verification link is missing a token." };
  }

  const row = await dbGet<{ user_id: number; expires_at: string; verified_at: string | null }>(
    `SELECT verification_tokens.user_id, verification_tokens.expires_at, users.verified_at
     FROM verification_tokens
     JOIN users ON users.id = verification_tokens.user_id
     WHERE verification_tokens.token_hash = ?`,
    [hashToken(token)],
  );

  if (!row || row.expires_at <= new Date().toISOString()) {
    return { error: "This verification link is invalid or expired." };
  }

  if (!row.verified_at) {
    await dbRun("UPDATE users SET verified_at = ? WHERE id = ?", [
      new Date().toISOString(),
      row.user_id,
    ]);
  }

  return { message: "Email verified. You can log in." };
}

export async function getCurrentUser(): Promise<CurrentUser | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  if (!token) {
    return null;
  }

  const now = new Date().toISOString();
  const row = await dbGet<{ id: number; email: string; is_admin: number }>(
    `SELECT users.id, users.email, users.is_admin
     FROM sessions
     JOIN users ON users.id = sessions.user_id
     WHERE sessions.token_hash = ? AND sessions.expires_at > ?`,
    [hashToken(token), now],
  );

  if (!row) {
    await dbRun("DELETE FROM sessions WHERE token_hash = ?", [hashToken(token)]);
    return null;
  }

  const isAdmin = adminEmails.some(
    (entry) => entry.trim().toLowerCase() === row.email,
  );
  if ((row.is_admin === 1) !== isAdmin) {
    await dbRun("UPDATE users SET is_admin = ? WHERE id = ?", [isAdmin ? 1 : 0, row.id]);
  }

  return { id: row.id, email: row.email, isAdmin };
}

export async function logout() {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  if (token) {
    await dbRun("DELETE FROM sessions WHERE token_hash = ?", [hashToken(token)]);
  }
  cookieStore.delete(SESSION_COOKIE);
}

async function createSession(userId: number) {
  const { token, tokenHash } = createToken();
  await dbRun("INSERT INTO sessions (token_hash, user_id, expires_at) VALUES (?, ?, ?)", [
    tokenHash,
    userId,
    daysFromNow(SESSION_DAYS),
  ]);

  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_DAYS * 24 * 60 * 60,
  });
}
