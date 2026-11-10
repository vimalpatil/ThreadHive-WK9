import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("../../../src/services/geminiService.js", () => ({
  rephraseText: vi.fn(),
  REPHRASE_FIELDS: ["title", "content", "comment"],
}));
import { rephraseText } from "../../../src/services/geminiService.js";
import { rephrase } from "../../../src/controllers/aiController.js";

const makeRes = () => ({ status: vi.fn().mockReturnThis(), json: vi.fn().mockReturnThis() });

describe("aiController.rephrase", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns the rephrased text", async () => {
    rephraseText.mockResolvedValue("Nice");
    const res = makeRes();
    await rephrase({ body: { text: "  nice  ", field: "title" } }, res);
    expect(rephraseText).toHaveBeenCalledWith("nice", "title");
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ success: true, data: { rephrased: "Nice" } }),
    );
  });

  it.each([
    [{ field: "title" }],
    [{ text: "   ", field: "title" }],
    [{ text: 42, field: "title" }],
    [{ text: "a".repeat(5001), field: "title" }],
    [{ text: "ok", field: "bogus" }],
    [{ text: "ok" }],
  ])("rejects invalid body %#", async (body) => {
    await expect(rephrase({ body }, makeRes())).rejects.toMatchObject({ statusCode: 400 });
    expect(rephraseText).not.toHaveBeenCalled();
  });

  it("propagates service errors", async () => {
    rephraseText.mockRejectedValue(Object.assign(new Error("fail"), { statusCode: 502 }));
    await expect(rephrase({ body: { text: "a", field: "comment" } }, makeRes())).rejects.toMatchObject({ statusCode: 502 });
  });
});
