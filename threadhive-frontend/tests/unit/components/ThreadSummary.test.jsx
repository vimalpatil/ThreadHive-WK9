import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import { http, HttpResponse, delay } from 'msw';
import { describe, it, expect } from 'vitest';
import { server } from '../../mocks/server';
import currentThreadReducer from '../../../src/reducers/currentThreadSlice';
import ThreadSummary from '../../../src/components/Thread/ThreadSummary';

const BASE_URL = 'http://localhost:3000/api';

const renderComponent = () => {
  const store = configureStore({ reducer: { currentThread: currentThreadReducer } });
  render(
    <Provider store={store}>
      <ThreadSummary threadId="thread-1" />
    </Provider>
  );
};

describe('ThreadSummary', () => {
  it('shows loading state then the summary', async () => {
    server.use(
      http.post(`${BASE_URL}/threads/:id/summary`, async () => {
        await delay(100);
        return HttpResponse.json({ data: { summary: 'A great summary.' } });
      })
    );
    renderComponent();
    await userEvent.click(screen.getByRole('button', { name: /^summarize$/i }));
    expect(screen.getByRole('button', { name: /summarizing/i })).toBeDisabled();
    expect(await screen.findByText('A great summary.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /regenerate/i })).toBeEnabled();
  });

  it('shows an error and recovers on retry', async () => {
    server.use(
      http.post(
        `${BASE_URL}/threads/:id/summary`,
        () => HttpResponse.json({ message: 'Failed to generate summary.' }, { status: 502 }),
        { once: true }
      )
    );
    renderComponent();
    await userEvent.click(screen.getByRole('button', { name: /^summarize$/i }));
    expect(await screen.findByText(/failed to generate summary/i)).toBeInTheDocument();
    const button = screen.getByRole('button', { name: /^summarize$/i });
    expect(button).toBeEnabled();

    await userEvent.click(button);
    await waitFor(() =>
      expect(screen.getByText('Mock AI summary paragraph.')).toBeInTheDocument()
    );
    expect(screen.queryByText(/failed to generate summary/i)).not.toBeInTheDocument();
  });
});
