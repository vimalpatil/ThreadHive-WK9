import Thread from "../models/Thread.js";
import User from "../models/User.js";
import Subreddit from "../models/Subreddit.js";
import { createAppError } from "../utils/createAppError.js";
import { getCommentsByThread } from "./commentService.js";
import { generateSummary } from "./geminiService.js";

export const fetchAllThreads = async () => {
  const threads = await Thread.find()
    .populate({ path: "author", model: User })
    .populate({ path: "subreddit", model: Subreddit })
    .sort({ createdAt: -1 });

  return threads;
};

export const fetchThreadById = async (id) => {
  const thread = await Thread.findById(id)
    .populate({ path: "author" })
    .populate({ path: "subreddit" });

  if (!thread) {
    throw createAppError("Thread not found", 404);
  }

  return thread;
};

export const createNewThread = async (title, content, author, subreddit) => {
  const newThread = new Thread({ title, content, author, subreddit });
  await newThread.save();

  const populatedThread = await Thread.findById(newThread._id)
    .populate({ path: "subreddit", select: "name description" })
    .populate({ path: "author", select: "name" });

  if (!populatedThread) {
    throw createAppError("Failed to create thread", 500);
  }

  return populatedThread;
};

export const updateThreadById = async (id, updateData) => {
  const updatedThread = await Thread.findByIdAndUpdate(id, updateData, {
    new: true,
    runValidators: true,
  });

  if (!updatedThread) {
    throw createAppError("Thread not found", 404);
  }

  return updatedThread;
};

export const deleteThreadById = async (id) => {
  const deletedThread = await Thread.findByIdAndDelete(id);

  if (!deletedThread) {
    throw createAppError("Thread not found", 404);
  }

  return deletedThread;
};
const MAX_PROMPT_CHARS = 20000;

export const summarizeThread = async (id) => {
  const thread = await fetchThreadById(id);
  const comments = await getCommentsByThread(id);

  const commentLines = comments.map(
    (c, i) => `${i + 1}. ${c.user?.name || "Unknown"}: ${c.content}`
  );
  const text = [
    `Thread title: ${thread.title}`,
    `Thread content: ${thread.content}`,
    commentLines.length ? `Comments:\n${commentLines.join("\n")}` : "Comments: (none)",
  ]
    .join("\n\n")
    .slice(0, MAX_PROMPT_CHARS);

  const summary = await generateSummary(text);
  return { summary };
};
