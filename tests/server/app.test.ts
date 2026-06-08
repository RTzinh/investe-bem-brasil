import request from 'supertest';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../../server/src/services/fastapi.ts', async () => {
  const actual = await vi.importActual<typeof import('../../server/src/services/fastapi.ts')>(
    '../../server/src/services/fastapi.ts',
  );
  return {
    ...actual,
    fetchFastApiAssistantReply: vi.fn().mockRejectedValue(new Error('offline')),
  };
});

import { createApp } from '../../server/src/app.js';
import { fetchFastApiAssistantReply } from '../../server/src/services/fastapi.js';

const apiKey = process.env.SERVER_API_KEY ?? 'test-api-key-123456';
const app = createApp();

describe('API authentication and validation', () => {
  it('rejects requests without an API key header', async () => {
    const response = await request(app).get('/api/transactions');
    expect(response.status).toBe(401);
    expect(response.body).toMatchObject({ message: 'Unauthorized request' });
  });

  it('rejects an invalid payload for creating a transaction', async () => {
    const response = await request(app)
      .post('/api/transactions')
      .set('x-api-key', apiKey)
      .send({ amount: 'invalid' });

    expect(response.status).toBe(400);
    expect(response.body.message).toContain('Invalid data');
  });
});

describe('Assistant fallback', () => {
  beforeEach(() => {
    (fetchFastApiAssistantReply as unknown as ReturnType<typeof vi.fn>).mockRejectedValue(
      new Error('offline'),
    );
  });

  it('returns an educational response when FastAPI is offline', async () => {
    const response = await request(app)
      .post('/api/assistant')
      .set('x-api-key', apiKey)
      .send({
        messages: [{ role: 'user' as const, content: 'Financial summary for the month' }],
      });

    expect(response.status).toBe(200);
    expect(response.body.reply).toContain('Current financial summary');
    expect(response.body.error).toBe('assistant_unavailable');
  });
});
