import { rephraseText, REPHRASE_FIELDS } from "../services/geminiService.js";
import { createAppError } from "../utils/createAppError.js";

const MAX_TEXT_LENGTH = 5000;

// POST /api/ai/rephrase
export const rephrase = async (req, res) => {
  const { text, field } = req.body || {};

  if (typeof text !== "string" || !text.trim()) {
    throw createAppError("Text is required.", 400);
  }
  if (text.length > MAX_TEXT_LENGTH) {
    throw createAppError(`Text must be at most ${MAX_TEXT_LENGTH} characters.`, 400);
  }
  if (!REPHRASE_FIELDS.includes(field)) {
    throw createAppError(`Field must be one of: ${REPHRASE_FIELDS.join(", ")}.`, 400);
  }

  const rephrased = await rephraseText(text.trim(), field);
  res.status(200).json({
    success: true,
    message: "Text rephrased successfully",
    data: { rephrased },
  });
};
