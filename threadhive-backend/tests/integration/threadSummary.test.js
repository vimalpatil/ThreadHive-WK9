import { beforeAll, describe, it, expect, vi } from "vitest";
import request from "supertest";
import "../setup.js";
import app from "../../src/app.js";
import Subreddit from "../../src/models/Subreddit.js";
import Thread from "../../src/models/Thread.js";
import Comment from "../../src/models/Comment.js";
import * as geminiService from "../../src/services/geminiService.js";
import { createAppError } from "../../src/utils/createAppError.js";
import dotenv from "dotenv";
dotenv.config();

vi.mock("../../src/services/geminiService.js");

let jwtToken, user;

beforeAll(async () => {
  const email = `summary+${Date.now()}@example.com`;
  const reg = await request(app)
    .post("/api/auth/register")
    .send({ name: "Sum User", email, password: "password123", isAdmin: false });
  const login = await request(app).post("/api/auth/login").send({ email, password: "password123" });
  user = reg.body.data;
  jwtToken = login.body.data.token;
});

const makeThread = async () => {
  const subreddit = await Subreddit.create({ name: `sub${Date.now()}`, description: "d", author: user._id });
  const thread = await Thread.create({
    title: "Best editor?",
    content: "Vim or Emacs?",
    author: user._id,
    subreddit: subreddit._id,
  });
  await Comment.create({ thread: thread._id, user: user._id, content: "Vim all the way" });
  return thread;
};

describe("POST /api/threads/:id/summary", () => {
  it("requires auth", async () => {
    const thread = await makeThread();
    const res = await request(app).post(`/api/threads/${thread._id}/summary`);
    expect(res.status).toBe(401);
  });

  it("returns the summary and sends thread + comments to Gemini", async () => {
    const thread = await makeThread();
    geminiService.generateSummary.mockResolvedValue("People prefer Vim.");
    const res = await request(app)
      .post(`/api/threads/${thread._id}/summary`)
      .set("Authorization", `Bearer ${jwtToken}`);
    expect(res.status).toBe(200);
    expect(res.body.data.summary).toBe("People prefer Vim.");
    const prompt = geminiService.generateSummary.mock.calls[0][0];
    expect(prompt).toContain("Best editor?");
    expect(prompt).toContain("Vim all the way");
  });

  it("returns 404 for an unknown thread", async () => {
    const res = await request(app)
      .post("/api/threads/64b000000000000000000000/summary")
      .set("Authorization", `Bearer ${jwtToken}`);
    expect(res.status).toBe(404);
  });

  it("propagates Gemini failures as 502", async () => {
    const thread = await makeThread();
    geminiService.generateSummary.mockRejectedValue(createAppError("Failed to generate summary. Please try again.", 502));
    const res = await request(app)
      .post(`/api/threads/${thread._id}/summary`)
      .set("Authorization", `Bearer ${jwtToken}`);
    expect(res.status).toBe(502);
    expect(res.body.success).toBe(false);
  });
});
