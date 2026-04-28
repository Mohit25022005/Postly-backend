const request = require("supertest");
const jwt = require("jsonwebtoken");

jest.mock("../src/config/db", () => ({
  user: {
    findUnique: jest.fn(),
    create: jest.fn(),
  },
  refreshToken: {
    findUnique: jest.fn(),
    create: jest.fn(),
    delete: jest.fn(),
    deleteMany: jest.fn(),
  },
  aIKey: {
    findUnique: jest.fn(),
  },
  post: {
    findMany: jest.fn(),
    count: jest.fn(),
  },
}));

jest.mock("../src/modules/queue/queue", () => ({
  add: jest.fn(),
}));

jest.mock("../src/config/redis", () => ({
  get: jest.fn(),
  set: jest.fn(),
  del: jest.fn(),
  on: jest.fn(),
}));

const app = require("../src/app");
const prisma = require("../src/config/db");

const tokenFor = (payload = { id: "user-123", email: "test@example.com" }) =>
  jwt.sign(payload, process.env.JWT_SECRET);

describe("auth endpoints", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test("POST /api/auth/register with valid body returns 201", async () => {
    prisma.user.findUnique.mockResolvedValue(null);
    prisma.user.create.mockResolvedValue({
      id: "user-123",
      email: "test@example.com",
      name: "Test User",
    });

    const res = await request(app).post("/api/auth/register").send({
      email: "test@example.com",
      password: "password123",
      name: "Test User",
    });

    expect(res.status).toBe(201);
    expect(res.body.data.email).toBe("test@example.com");
    expect(res.body.error).toBeNull();
  });

  test("POST /api/auth/login returns 200 and tokens", async () => {
    const bcrypt = require("bcrypt");
    const passwordHash = await bcrypt.hash("password123", 4);

    prisma.user.findUnique.mockResolvedValue({
      id: "user-123",
      email: "test@example.com",
      password_hash: passwordHash,
    });
    prisma.refreshToken.create.mockResolvedValue({});

    const res = await request(app).post("/api/auth/login").send({
      email: "test@example.com",
      password: "password123",
    });

    expect(res.status).toBe(200);
    expect(res.body.data.access_token).toBeTruthy();
    expect(res.body.data.refresh_token).toBeTruthy();
  });

  test("GET /api/auth/me with valid Bearer token returns 200", async () => {
    const res = await request(app)
      .get("/api/auth/me")
      .set("Authorization", `Bearer ${tokenFor()}`);

    expect(res.status).toBe(200);
    expect(res.body.data.id).toBe("user-123");
  });

  test("GET /api/auth/me with invalid token returns 401", async () => {
    const res = await request(app)
      .get("/api/auth/me")
      .set("Authorization", "Bearer invalid-token");

    expect(res.status).toBe(401);
  });

  test("GET /api/auth/me with no token returns 401", async () => {
    const res = await request(app).get("/api/auth/me");

    expect(res.status).toBe(401);
  });
});

describe("content and posts endpoints", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test("POST /api/content/generate with missing idea returns 400", async () => {
    const res = await request(app)
      .post("/api/content/generate")
      .set("Authorization", `Bearer ${tokenFor()}`)
      .send({
        post_type: "announcement",
        platforms: ["twitter"],
        tone: "professional",
        model: "openai",
      });

    expect(res.status).toBe(400);
    expect(res.body.error.message).toBe("Validation failed");
  });

  test("GET /api/posts with valid token returns paginated empty data", async () => {
    prisma.post.findMany.mockResolvedValue([]);
    prisma.post.count.mockResolvedValue(0);

    const res = await request(app)
      .get("/api/posts?page=1&limit=10")
      .set("Authorization", `Bearer ${tokenFor()}`);

    expect(res.status).toBe(200);
    expect(res.body).toEqual({
      data: [],
      meta: { total: 0, page: 1, limit: 10 },
      error: null,
    });
  });
});
