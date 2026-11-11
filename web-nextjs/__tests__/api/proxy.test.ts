/**
 * @jest-environment node
 */
import { NextRequest } from "next/server";
import { GET as catchAllGet, POST as catchAllPost } from "@/app/api/[...path]/route";
import { POST as registerPost } from "@/app/api/auth/register/route";
import { POST as loginPost } from "@/app/api/auth/login/route";

describe("Dynamic Runtime API Proxy", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.resetModules();
    process.env = { ...originalEnv };
    global.fetch = jest.fn();
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  it("forwards GET /api/free-sessions to dynamic API_BASE_URL with query params and auth headers", async () => {
    process.env.API_BASE_URL = "http://api:18080";

    (global.fetch as jest.Mock).mockResolvedValueOnce(
      new Response(JSON.stringify([{ id: 1, title: "Session 1" }]), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      })
    );

    const req = new NextRequest("http://localhost:3000/api/free-sessions?count=10", {
      method: "GET",
      headers: {
        Authorization: "Bearer test-jwt-token",
        Accept: "application/json",
      },
    });

    const response = await catchAllGet(req, {
      params: Promise.resolve({ path: ["free-sessions"] }),
    });

    expect(global.fetch).toHaveBeenCalledWith(
      "http://api:18080/api/free-sessions?count=10",
      expect.objectContaining({
        method: "GET",
        headers: expect.any(Headers),
      })
    );

    const fetchHeaders = (global.fetch as jest.Mock).mock.calls[0][1].headers as Headers;
    expect(fetchHeaders.get("authorization")).toBe("Bearer test-jwt-token");
    expect(response.status).toBe(200);

    const data = await response.json();
    expect(data).toEqual([{ id: 1, title: "Session 1" }]);
  });

  it("forwards POST /api/mock-exams/1/attempts with request body", async () => {
    process.env.API_BASE_URL = "http://api:18080";

    (global.fetch as jest.Mock).mockResolvedValueOnce(
      new Response(JSON.stringify({ id: 99, status: "IN_PROGRESS" }), {
        status: 201,
        headers: { "Content-Type": "application/json" },
      })
    );

    const req = new NextRequest("http://localhost:3000/api/mock-exams/1/attempts", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: "Bearer test-jwt-token",
      },
      body: JSON.stringify({ mode: "standard" }),
    });

    const response = await catchAllPost(req, {
      params: Promise.resolve({ path: ["mock-exams", "1", "attempts"] }),
    });

    expect(global.fetch).toHaveBeenCalledWith(
      "http://api:18080/api/mock-exams/1/attempts",
      expect.objectContaining({
        method: "POST",
      })
    );

    expect(response.status).toBe(201);
    const data = await response.json();
    expect(data.id).toBe(99);
  });

  it("forwards POST /api/auth/register to ${API_BASE_URL}/api/auth/register", async () => {
    process.env.API_BASE_URL = "http://api:18080";

    (global.fetch as jest.Mock).mockResolvedValueOnce(
      new Response(JSON.stringify({ username: "newuser" }), {
        status: 201,
        headers: { "Content-Type": "application/json" },
      })
    );

    const req = new NextRequest("http://localhost:3000/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username: "newuser", password: "password123" }),
    });

    const response = await registerPost(req);

    expect(global.fetch).toHaveBeenCalledWith(
      "http://api:18080/api/auth/register",
      expect.objectContaining({
        method: "POST",
      })
    );
    expect(response.status).toBe(201);
  });

  it("forwards POST /api/auth/login to ${API_BASE_URL}/login", async () => {
    process.env.API_BASE_URL = "http://api:18080";

    (global.fetch as jest.Mock).mockResolvedValueOnce(
      new Response(JSON.stringify({ access_token: "jwt123" }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      })
    );

    const req = new NextRequest("http://localhost:3000/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username: "admin", password: "secret" }),
    });

    const response = await loginPost(req);

    expect(global.fetch).toHaveBeenCalledWith(
      "http://api:18080/login",
      expect.objectContaining({
        method: "POST",
      })
    );
    expect(response.status).toBe(200);
  });

  it("returns 502 with JSON error when backend fetch fails with connection error", async () => {
    const consoleSpy = jest.spyOn(console, "error").mockImplementation(() => {});
    process.env.API_BASE_URL = "http://api:18080";

    (global.fetch as jest.Mock).mockRejectedValueOnce(
      new Error("connect ECONNREFUSED 127.0.0.1:18080")
    );

    const req = new NextRequest("http://localhost:3000/api/free-sessions", {
      method: "GET",
    });

    const response = await catchAllGet(req, {
      params: Promise.resolve({ path: ["free-sessions"] }),
    });

    expect(response.status).toBe(502);
    const data = await response.json();
    expect(data.error).toMatch(/conexión/i);
    consoleSpy.mockRestore();
  });
});
