// @vitest-environment node
import { describe, test, expect, vi, beforeEach } from "vitest";
import { SignJWT, jwtVerify } from "jose";
import { NextRequest } from "next/server";

vi.mock("server-only", () => ({}));

const mockGet = vi.fn();
const mockSet = vi.fn();
const mockDelete = vi.fn();

vi.mock("next/headers", () => ({
  cookies: vi.fn(() => ({ get: mockGet, set: mockSet, delete: mockDelete })),
}));

import { createSession, getSession, deleteSession, verifySession } from "@/lib/auth";

const SECRET = new TextEncoder().encode("development-secret-key");

async function makeToken(overrides: Record<string, unknown> = {}, expOffset = 7 * 24 * 60 * 60) {
  return new SignJWT({ userId: "user1", email: "test@example.com", ...overrides })
    .setProtectedHeader({ alg: "HS256" })
    .setExpirationTime(Math.floor(Date.now() / 1000) + expOffset)
    .setIssuedAt()
    .sign(SECRET);
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("createSession", () => {
  test("sets httpOnly cookie with JWT token", async () => {
    await createSession("user1", "test@example.com");

    expect(mockSet).toHaveBeenCalledOnce();
    const [name, token, options] = mockSet.mock.calls[0];
    expect(name).toBe("auth-token");
    expect(typeof token).toBe("string");
    expect(token.split(".")).toHaveLength(3);
    expect(options.httpOnly).toBe(true);
    expect(options.sameSite).toBe("lax");
    expect(options.path).toBe("/");
  });

  test("sets cookie expiry 7 days from now", async () => {
    await createSession("user1", "test@example.com");

    const [, , options] = mockSet.mock.calls[0];
    const diff = options.expires.getTime() - Date.now();
    expect(diff).toBeGreaterThan(6 * 24 * 60 * 60 * 1000);
    expect(diff).toBeLessThanOrEqual(7 * 24 * 60 * 60 * 1000 + 1000);
  });

  test("JWT contains correct userId and email", async () => {
    await createSession("user123", "hello@example.com");

    const [, token] = mockSet.mock.calls[0];
    const { payload } = await jwtVerify(token, SECRET);
    expect(payload.userId).toBe("user123");
    expect(payload.email).toBe("hello@example.com");
  });

  test("secure flag is false outside production", async () => {
    await createSession("user1", "test@example.com");

    const [, , options] = mockSet.mock.calls[0];
    expect(options.secure).toBe(false);
  });
});

describe("getSession", () => {
  test("returns null when no cookie", async () => {
    mockGet.mockReturnValue(undefined);
    expect(await getSession()).toBeNull();
  });

  test("returns session payload with valid token", async () => {
    mockGet.mockReturnValue({ value: await makeToken() });

    const session = await getSession();
    expect(session?.userId).toBe("user1");
    expect(session?.email).toBe("test@example.com");
  });

  test("returns null with invalid token", async () => {
    mockGet.mockReturnValue({ value: "not.a.token" });
    expect(await getSession()).toBeNull();
  });

  test("returns null with expired token", async () => {
    mockGet.mockReturnValue({ value: await makeToken({}, -100) });
    expect(await getSession()).toBeNull();
  });
});

describe("deleteSession", () => {
  test("deletes the auth cookie", async () => {
    await deleteSession();
    expect(mockDelete).toHaveBeenCalledWith("auth-token");
  });
});

describe("verifySession", () => {
  test("returns null when no cookie in request", async () => {
    const req = new NextRequest("http://localhost/api/test");
    expect(await verifySession(req)).toBeNull();
  });

  test("returns session payload with valid token", async () => {
    const token = await makeToken();
    const req = new NextRequest("http://localhost/api/test", {
      headers: { cookie: `auth-token=${token}` },
    });

    const session = await verifySession(req);
    expect(session?.userId).toBe("user1");
    expect(session?.email).toBe("test@example.com");
  });

  test("returns null with invalid token", async () => {
    const req = new NextRequest("http://localhost/api/test", {
      headers: { cookie: "auth-token=bad.token.value" },
    });
    expect(await verifySession(req)).toBeNull();
  });

  test("returns null with expired token", async () => {
    const token = await makeToken({}, -100);
    const req = new NextRequest("http://localhost/api/test", {
      headers: { cookie: `auth-token=${token}` },
    });
    expect(await verifySession(req)).toBeNull();
  });
});
