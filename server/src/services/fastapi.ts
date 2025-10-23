import { config } from '../config.js';

const BASE_URL = config.FASTAPI_BASE_URL.replace(/\/$/, '');

const withTimeout = <T>(promise: Promise<T>, ms: number) =>
  new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new Error(`Request timed out after ${ms}ms`));
    }, ms);
    promise
      .then((value) => {
        clearTimeout(timer);
        resolve(value);
      })
      .catch((error) => {
        clearTimeout(timer);
        reject(error);
      });
  });

export interface FastApiAsset {
  symbol: string;
  name: string;
  metrics?: {
    last_price: number | null;
    daily_return?: number | null;
    volatility?: number | null;
    beta?: number | null;
    sharpe?: number | null;
    max_drawdown?: number | null;
    atr?: number | null;
    volume_avg?: number | null;
    last_volume?: number | null;
  };
}

export interface FastApiInsight {
  id: number;
  asset_symbol: string | null;
  title: string;
  summary: string;
  rationale: string | null;
  impact: string | null;
  created_at: string;
  raw_context: Record<string, unknown> | null;
}

export interface FastApiAssistantMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface FastApiAssistantResponse {
  reply: string;
}

export const requestFastApi = async <T>(path: string, init: RequestInit = {}) => {
  const url = `${BASE_URL}/${path.replace(/^\//, '')}`;
  const response = await withTimeout(fetch(url, init), 10_000);
  if (!response.ok) {
    const text = await response.text();
    throw new Error(`FastAPI request failed (${response.status}): ${text || response.statusText}`);
  }
  return (await response.json()) as T;
};

export const fetchFastApiAssets = () => requestFastApi<FastApiAsset[]>('/assets');

export const fetchFastApiInsights = () => requestFastApi<FastApiInsight[]>('/insights');

export const fetchFastApiAssistantReply = (messages: FastApiAssistantMessage[]) =>
  requestFastApi<FastApiAssistantResponse>('/assistant', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ messages }),
  });
