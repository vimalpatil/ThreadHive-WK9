import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import { fetchThreadById as fetchThreadByIdAPI } from "../services/threadService";
import { upvoteThreadThunk, downvoteThreadThunk } from "./threadListSlice";
import { handleApiError } from "../utils/handleApiError";

const initialState = {
  thread: null,
  loading: false,
  error: null,
};

// Async thunk
export const fetchThreadById = createAsyncThunk(
  "currentThread/fetchById",
  async (threadId, { rejectWithValue }) => {
    try {
      const thread = await fetchThreadByIdAPI(threadId);
      return thread;
    } catch (err) {
      return rejectWithValue(handleApiError(err));
    }
  },
);

const currentThreadSlice = createSlice({
  name: "currentThread",
  initialState,
  reducers: {
    clearThread: () => initialState,
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchThreadById.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchThreadById.fulfilled, (state, action) => {
        state.loading = false;
        state.thread = action.payload;
      })
      .addCase(fetchThreadById.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      .addCase(upvoteThreadThunk.fulfilled, (state, action) => {
        if (state.thread && state.thread._id === action.payload._id) {
          state.thread = {
            ...state.thread,
            voteCount: action.payload.voteCount,
          };
        }
      })
      .addCase(downvoteThreadThunk.fulfilled, (state, action) => {
        if (state.thread && state.thread._id === action.payload._id) {
          state.thread = {
            ...state.thread,
            voteCount: action.payload.voteCount,
          };
        }
      });
  },
});

export default currentThreadSlice.reducer;
export const { clearThread } = currentThreadSlice.actions;
