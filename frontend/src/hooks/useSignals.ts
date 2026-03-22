import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  fetchSignals,
  fetchStats,
  sendSignalTelegram,
  sendAllUnsent,
  triggerScan,
  fetchTelegramStatus,
  testTelegram,
} from "../lib/api";
import type { SignalFilters } from "../types";

const REFETCH_INTERVAL = 30_000; // 30 seconds

export function useSignals(filters: Partial<SignalFilters>, page = 0, pageSize = 50) {
  return useQuery({
    queryKey: ["signals", filters, page],
    queryFn: () => fetchSignals({ ...filters, limit: pageSize, offset: page * pageSize }),
    refetchInterval: REFETCH_INTERVAL,
    placeholderData: (prev) => prev,
  });
}

export function useStats() {
  return useQuery({
    queryKey: ["stats"],
    queryFn: fetchStats,
    refetchInterval: REFETCH_INTERVAL,
  });
}

export function useTelegramStatus() {
  return useQuery({
    queryKey: ["telegram-status"],
    queryFn: fetchTelegramStatus,
  });
}

export function useSendSignal() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: sendSignalTelegram,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["signals"] }),
  });
}

export function useSendAllUnsent() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: sendAllUnsent,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["signals"] }),
  });
}

export function useTriggerScan() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: triggerScan,
    onSuccess: () => setTimeout(() => qc.invalidateQueries({ queryKey: ["signals"] }), 5000),
  });
}

export function useTestTelegram() {
  return useMutation({
    mutationFn: ({ token, chatId }: { token?: string; chatId?: string }) =>
      testTelegram(token, chatId),
  });
}
