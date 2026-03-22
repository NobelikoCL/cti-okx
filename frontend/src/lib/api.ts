import axios from "axios";
import type { Signal, SignalStats, PaginatedResponse, TelegramStatus, SignalFilters } from "../types";
import { MOCK_SIGNALS, MOCK_STATS, mockSignalsPage } from "./mock";

const client = axios.create({
  baseURL: "/api",
  headers: { "Content-Type": "application/json" },
  timeout: 3000,
});

/** Returns true if response looks like a real API response (not HTML fallback). */
function isValidJson(data: unknown): boolean {
  return data !== null && typeof data === "object" && !Array.isArray(data);
}

export async function fetchSignals(
  filters: Partial<SignalFilters> & { limit?: number; offset?: number }
): Promise<PaginatedResponse<Signal>> {
  const params: Record<string, string | number> = {};
  if (filters.search) params.search = filters.search;
  if (filters.signal_type) params.signal_type = filters.signal_type;
  if (filters.timeframe) params.timeframe = filters.timeframe;
  if (filters.min_confidence) params.min_confidence = filters.min_confidence;
  if (filters.ordering) params.ordering = filters.ordering;
  if (filters.limit) params.limit = filters.limit;
  if (filters.offset !== undefined) params.offset = filters.offset;

  try {
    const { data } = await client.get<PaginatedResponse<Signal>>("/signals/", { params });
    if (isValidJson(data) && Array.isArray((data as PaginatedResponse<Signal>).results)) {
      return data;
    }
  } catch {
    // fall through to mock
  }
  return mockSignalsPage(filters);
}

export async function fetchStats(): Promise<SignalStats> {
  try {
    const { data } = await client.get<SignalStats>("/signals/stats/");
    if (isValidJson(data) && typeof (data as SignalStats).total === "number") {
      return data;
    }
  } catch {
    // fall through to mock
  }
  return MOCK_STATS;
}

export async function sendSignalTelegram(id: number): Promise<void> {
  try {
    await client.post(`/signals/${id}/send/`);
  } catch {
    const sig = MOCK_SIGNALS.find((s) => s.id === id);
    if (sig) sig.is_sent_telegram = true;
  }
}

export async function sendAllUnsent(): Promise<{ count: number }> {
  try {
    const { data } = await client.post<{ count: number }>("/signals/send-unsent/");
    if (isValidJson(data)) return data;
  } catch {
    // fall through
  }
  return { count: MOCK_SIGNALS.filter((s) => !s.is_sent_telegram).length };
}

export async function triggerScan(): Promise<{ task_id: string }> {
  try {
    const { data } = await client.post<{ task_id: string }>("/scanner/run/");
    if (isValidJson(data)) return data;
  } catch {
    // fall through
  }
  return { task_id: "mock-task-demo" };
}

export async function fetchTelegramStatus(): Promise<TelegramStatus> {
  try {
    const { data } = await client.get<TelegramStatus>("/telegram/status/");
    if (isValidJson(data) && typeof (data as TelegramStatus).configured === "boolean") {
      return data;
    }
  } catch {
    // fall through
  }
  return { configured: false, chat_id: "" };
}

export async function testTelegram(token?: string, chatId?: string): Promise<boolean> {
  const payload: Record<string, string> = {};
  if (token) payload.token = token;
  if (chatId) payload.chat_id = chatId;
  try {
    const { data } = await client.post<{ success: boolean }>("/telegram/test/", payload);
    if (isValidJson(data)) return (data as { success: boolean }).success;
  } catch {
    // fall through
  }
  return false;
}
