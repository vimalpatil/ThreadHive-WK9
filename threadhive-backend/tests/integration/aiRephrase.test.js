import { beforeAll, describe, it, expect, vi } from "vitest";
import request from "supertest";
import "../setup.js";
import app from "../../src/app.js";
import * as geminiService from "../../src/services/geminiService.js";
import { createAppError } from "../../src/utils/createAppError.js";
import dotenv from "dotenv";
dotenv.config();

vi.mock("../../src/services/geminiService.js", () => ({
  rephraseText: vi.fn(),
  generateSummary: vi.fn(),
  REPHRASE_FIELDS: ["title", "content", "comment"],
}));

let jwtToken;
beforeAll(async () => {
  const email = `rephrase+${Date.now()}@example.com`;
  await request(app).post("/api/auth/register").send({ name: "R User", email, password: "password123", isAdmin: false });
  const login = await request(app).post("/api/auth/login").send({ email, password: "password123" });
  jwtToken = login.body.data.token;
});

const post = (body, auth = true) => {
  const r = request(app).post("/api/ai/rephrase");
  return (auth ? r.set("Authorization", `Bearer ${jwtToken}`) : r).send(body);
};

describe("POST /api/ai/rephrase", () => {
  it("requires auth", async () => {
    expect((await post({ text: "a", field: "title" }, false)).status).toBe(401);
  });
  it("validates input", async () => {
    expect((await post({ field: "title" })).status).toBe(400);
    expect((await post({ text: "a", field: "nope" })).status).toBe(400);
  });
  it("returns the rephrased text", async () => {
    geminiService.rephraseText.mockResolvedValue("Polished");
    const res = await post({ text: "rough", field: "content" });
    expect(res.status).toBe(200);
    expect(res.body.data.rephrased).toBe("Polished");
    expect(geminiService.rephraseText).toHaveBeenCalledWith("rough", "content");
  });
  it("propagates Gemini failures as 502", async () => {
    geminiService.rephraseText.mockRejectedValue(createAppError("Failed to rephrase text. Please try again.", 502));
    const res = await post({ text: "rough", field: "comment" });
    expect(res.status).toBe(502);
    expect(res.body.success).toBe(false);
  });
});
