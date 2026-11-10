import React, { useState } from 'react';
import { render, screen, within, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse, delay } from 'msw';
import { describe, it, expect } from 'vitest';
import { server } from '../../mocks/server';
import RephraseWithAI from '../../../src/components/Rephrase/RephraseWithAI';

const BASE_URL = 'http://localhost:3000/api';

function Harness() {
  const [title, setTitle] = useState('rough title');
  const [content, setContent] = useState('rough body');
  return (
    <div>
      <input aria-label="title" value={title} onChange={(e) => setTitle(e.target.value)} />
      <RephraseWithAI field="title" text={title} onAccept={setTitle} />
      <textarea aria-label="content" value={content} onChange={(e) => setContent(e.target.value)} />
      <RephraseWithAI field="content" text={content} onAccept={setContent} />
    </div>
  );
}

const titleBox = () => screen.getByTestId('rephrase-title');
const contentBox = () => screen.getByTestId('rephrase-content');

describe('RephraseWithAI', () => {
  it('shows a suggestion without touching the text, then Accept replaces it', async () => {
    render(<Harness />);
    await userEvent.click(within(titleBox()).getByRole('button', { name: /rephrase with ai/i }));
    expect(await within(titleBox()).findByText('Improved: rough title')).toBeInTheDocument();
    expect(screen.getByLabelText('title')).toHaveValue('rough title');

    await userEvent.click(within(titleBox()).getByRole('button', { name: 'Accept' }));
    expect(screen.getByLabelText('title')).toHaveValue('Improved: rough title');
    expect(within(titleBox()).queryByText('AI suggestion')).not.toBeInTheDocument();
  });

  it('Reject keeps the original text', async () => {
    render(<Harness />);
    await userEvent.click(within(contentBox()).getByRole('button', { name: /rephrase with ai/i }));
    await within(contentBox()).findByText('Improved: rough body');
    await userEvent.click(within(contentBox()).getByRole('button', { name: 'Reject' }));
    expect(screen.getByLabelText('content')).toHaveValue('rough body');
    expect(within(contentBox()).queryByText('AI suggestion')).not.toBeInTheDocument();
  });

  it('has an independent loading state per field', async () => {
    server.use(
      http.post(`${BASE_URL}/ai/rephrase`, async () => {
        await delay(150);
        return HttpResponse.json({ data: { rephrased: 'slow' } });
      }),
    );
    render(<Harness />);
    await userEvent.click(within(titleBox()).getByRole('button', { name: /rephrase with ai/i }));
    expect(within(titleBox()).getByRole('button', { name: /rephrasing/i })).toBeDisabled();
    expect(within(contentBox()).getByRole('button', { name: /rephrase with ai/i })).toBeEnabled();
    await within(titleBox()).findByText('slow');
  });

  it('keeps the original text on failure and allows retry', async () => {
    server.use(
      http.post(`${BASE_URL}/ai/rephrase`, () => HttpResponse.json({ message: 'nope' }, { status: 502 }), { once: true }),
    );
    render(<Harness />);
    await userEvent.click(within(titleBox()).getByRole('button', { name: /rephrase with ai/i }));
    expect(await within(titleBox()).findByText(/couldn't rephrase/i)).toBeInTheDocument();
    expect(screen.getByLabelText('title')).toHaveValue('rough title');

    await userEvent.click(within(titleBox()).getByRole('button', { name: /rephrase with ai/i }));
    expect(await within(titleBox()).findByText('Improved: rough title')).toBeInTheDocument();
  });

  it('discards a stale suggestion when the user edits the field', async () => {
    render(<Harness />);
    await userEvent.click(within(titleBox()).getByRole('button', { name: /rephrase with ai/i }));
    await within(titleBox()).findByText('Improved: rough title');
    await userEvent.type(screen.getByLabelText('title'), '!');
    await waitFor(() => expect(within(titleBox()).queryByText('AI suggestion')).not.toBeInTheDocument());
  });

  it('disables the button when the field is blank', async () => {
    render(<Harness />);
    await userEvent.clear(screen.getByLabelText('content'));
    expect(within(contentBox()).getByRole('button', { name: /rephrase with ai/i })).toBeDisabled();
  });
});
