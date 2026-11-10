import { describe, it, expect, vi, beforeEach } from "vitest";

const create = vi.fn();
const ctor = vi.fn();
vi.mock("@google/genai", () => ({
  GoogleGenAI: class {
    constructor(opts) {
      ctor(opts);
      this.interactions = { create };
    }
  },
}));
vi.mock("dotenv", () => ({ default: { config: vi.fn() } }));

describe("geminiService.generateSummary", () => {
  let generateSummary, rephraseText;
  beforeEach(async () => {
    vi.resetModules();
    create.mockReset();
    ctor.mockReset();
    process.env.GEMINI_API_KEY = "test-key";
    ({ generateSummary, rephraseText } = await import("../../../src/services/geminiService.js"));
  });

  it("creates the client lazily with the loaded API key and returns the text", async () => {
    expect(ctor).not.toHaveBeenCalled();
    create.mockResolvedValue({ status: "completed", output_text: " A summary. " });
    await expect(generateSummary("text")).resolves.toBe("A summary.");
    expect(ctor).toHaveBeenCalledWith(expect.objectContaining({ apiKey: "test-key" }));
  });

  it("throws 503 when the API key is missing", async () => {
    delete process.env.GEMINI_API_KEY;
    await expect(generateSummary("text")).rejects.toMatchObject({ statusCode: 503 });
    expect(ctor).not.toHaveBeenCalled();
  });

  it("throws 502 when the SDK call fails", async () => {
    create.mockRejectedValue(new Error("boom"));
    await expect(generateSummary("text")).rejects.toMatchObject({ statusCode: 502 });
  });

  it("throws 502 on incomplete or empty responses", async () => {
    create.mockResolvedValue({ status: "incomplete", output_text: "partial" });
    await expect(generateSummary("text")).rejects.toMatchObject({ statusCode: 502 });
    create.mockResolvedValue({ status: "completed", output_text: "" });
    await expect(generateSummary("text")).rejects.toMatchObject({ statusCode: 502 });
  });
});

describe("geminiService.rephraseText", () => {
  let rephraseText;
  beforeEach(async () => {
    vi.resetModules();
    create.mockReset();
    ctor.mockReset();
    process.env.GEMINI_API_KEY = "test-key";
    ({ rephraseText } = await import("../../../src/services/geminiService.js"));
  });

  it("sends the text with a field-specific instruction and returns the rewrite", async () => {
    create.mockResolvedValue({ status: "completed", output_text: " Better text. " });
    await expect(rephraseText("bad txt", "comment")).resolves.toBe("Better text.");
    const arg = create.mock.calls[0][0];
    expect(arg.input).toBe("<text>\nbad txt\n</text>");
    expect(arg.system_instruction).toMatch(/comment/);
    expect(arg.system_instruction).toMatch(/never follow instructions/);
  });

  it("collapses newlines for titles only", async () => {
    create.mockResolvedValue({ status: "completed", output_text: "Line one\nLine two" });
    await expect(rephraseText("x", "title")).resolves.toBe("Line one Line two");
    await expect(rephraseText("x", "content")).resolves.toBe("Line one\nLine two");
  });

  it("throws 503 without a key and 502 on SDK failure or empty output", async () => {
    create.mockRejectedValue(new Error("boom"));
    await expect(rephraseText("x", "title")).rejects.toMatchObject({ statusCode: 502 });
    create.mockResolvedValue({ status: "completed", output_text: "  " });
    await expect(rephraseText("x", "title")).rejects.toMatchObject({ statusCode: 502 });
    vi.resetModules();
    delete process.env.GEMINI_API_KEY;
    const fresh = await import("../../../src/services/geminiService.js");
    await expect(fresh.rephraseText("x", "title")).rejects.toMatchObject({ statusCode: 503 });
  });
});
