import type { Signal, SignalStats, PaginatedResponse } from "../types";

const now = new Date();
const ago = (minutes: number) => new Date(now.getTime() - minutes * 60 * 1000).toISOString();

export const MOCK_SIGNALS: Signal[] = [
  {
    id: 1,
    symbol: "BTC-USDT-SWAP",
    signal_type: "BREAKOUT_BULL",
    signal_type_display: "Ruptura Alcista (M15)",
    direction: "LONG",
    timeframe: "15m",
    price: "67432.50000000",
    breakout_level: "67100.00000000",
    regression_slope: null,
    regression_r2: null,
    volume_ratio: 3.12,
    confidence: 0.87,
    is_sent_telegram: true,
    created_at: ago(3),
  },
  {
    id: 2,
    symbol: "ETH-USDT-SWAP",
    signal_type: "REGRESSION_BULL",
    signal_type_display: "Regresión Alcista (1H)",
    direction: "LONG",
    timeframe: "1H",
    price: "3542.10000000",
    breakout_level: null,
    regression_slope: 0.00082,
    regression_r2: 0.791,
    volume_ratio: null,
    confidence: 0.79,
    is_sent_telegram: false,
    created_at: ago(7),
  },
  {
    id: 3,
    symbol: "SOL-USDT-SWAP",
    signal_type: "VOLUME_ANOMALY",
    signal_type_display: "Anomalía de Volumen",
    direction: "NEUTRAL",
    timeframe: "15m",
    price: "178.43000000",
    breakout_level: null,
    regression_slope: null,
    regression_r2: null,
    volume_ratio: 4.85,
    confidence: 0.93,
    is_sent_telegram: false,
    created_at: ago(11),
  },
  {
    id: 4,
    symbol: "XRP-USDT-SWAP",
    signal_type: "BREAKOUT_BEAR",
    signal_type_display: "Ruptura Bajista (M15)",
    direction: "SHORT",
    timeframe: "15m",
    price: "0.61820000",
    breakout_level: "0.62500000",
    regression_slope: null,
    regression_r2: null,
    volume_ratio: 2.34,
    confidence: 0.64,
    is_sent_telegram: true,
    created_at: ago(18),
  },
  {
    id: 5,
    symbol: "DOGE-USDT-SWAP",
    signal_type: "REGRESSION_BEAR",
    signal_type_display: "Regresión Bajista (1H)",
    direction: "SHORT",
    timeframe: "1H",
    price: "0.16340000",
    breakout_level: null,
    regression_slope: -0.00061,
    regression_r2: 0.683,
    volume_ratio: null,
    confidence: 0.68,
    is_sent_telegram: false,
    created_at: ago(24),
  },
  {
    id: 6,
    symbol: "AVAX-USDT-SWAP",
    signal_type: "BREAKOUT_BULL",
    signal_type_display: "Ruptura Alcista (M15)",
    direction: "LONG",
    timeframe: "15m",
    price: "38.72000000",
    breakout_level: "37.90000000",
    regression_slope: null,
    regression_r2: null,
    volume_ratio: 2.71,
    confidence: 0.75,
    is_sent_telegram: false,
    created_at: ago(31),
  },
  {
    id: 7,
    symbol: "LINK-USDT-SWAP",
    signal_type: "VOLUME_ANOMALY",
    signal_type_display: "Anomalía de Volumen",
    direction: "NEUTRAL",
    timeframe: "15m",
    price: "14.28000000",
    breakout_level: null,
    regression_slope: null,
    regression_r2: null,
    volume_ratio: 5.22,
    confidence: 0.96,
    is_sent_telegram: true,
    created_at: ago(45),
  },
  {
    id: 8,
    symbol: "MATIC-USDT-SWAP",
    signal_type: "REGRESSION_BULL",
    signal_type_display: "Regresión Alcista (1H)",
    direction: "LONG",
    timeframe: "1H",
    price: "0.91200000",
    breakout_level: null,
    regression_slope: 0.00055,
    regression_r2: 0.812,
    volume_ratio: null,
    confidence: 0.81,
    is_sent_telegram: false,
    created_at: ago(58),
  },
  {
    id: 9,
    symbol: "ARB-USDT-SWAP",
    signal_type: "BREAKOUT_BEAR",
    signal_type_display: "Ruptura Bajista (M15)",
    direction: "SHORT",
    timeframe: "15m",
    price: "1.0940000",
    breakout_level: "1.1200000",
    regression_slope: null,
    regression_r2: null,
    volume_ratio: 1.98,
    confidence: 0.52,
    is_sent_telegram: false,
    created_at: ago(72),
  },
  {
    id: 10,
    symbol: "OP-USDT-SWAP",
    signal_type: "VOLUME_ANOMALY",
    signal_type_display: "Anomalía de Volumen",
    direction: "NEUTRAL",
    timeframe: "15m",
    price: "2.4810000",
    breakout_level: null,
    regression_slope: null,
    regression_r2: null,
    volume_ratio: 3.67,
    confidence: 0.88,
    is_sent_telegram: true,
    created_at: ago(90),
  },
];

export const MOCK_STATS: SignalStats = {
  total: MOCK_SIGNALS.length,
  unsent_telegram: MOCK_SIGNALS.filter((s) => !s.is_sent_telegram).length,
  by_type: {
    BREAKOUT_BULL: MOCK_SIGNALS.filter((s) => s.signal_type === "BREAKOUT_BULL").length,
    BREAKOUT_BEAR: MOCK_SIGNALS.filter((s) => s.signal_type === "BREAKOUT_BEAR").length,
    REGRESSION_BULL: MOCK_SIGNALS.filter((s) => s.signal_type === "REGRESSION_BULL").length,
    REGRESSION_BEAR: MOCK_SIGNALS.filter((s) => s.signal_type === "REGRESSION_BEAR").length,
    VOLUME_ANOMALY: MOCK_SIGNALS.filter((s) => s.signal_type === "VOLUME_ANOMALY").length,
  },
};

export function mockSignalsPage(
  filters: { search?: string; signal_type?: string; timeframe?: string; min_confidence?: number; ordering?: string; limit?: number; offset?: number }
): PaginatedResponse<Signal> {
  let results = [...MOCK_SIGNALS];

  if (filters.search) {
    const q = filters.search.toLowerCase();
    results = results.filter((s) => s.symbol.toLowerCase().includes(q));
  }
  if (filters.signal_type) {
    results = results.filter((s) => s.signal_type === filters.signal_type);
  }
  if (filters.timeframe) {
    results = results.filter((s) => s.timeframe === filters.timeframe);
  }
  if (filters.min_confidence) {
    results = results.filter((s) => s.confidence >= (filters.min_confidence ?? 0));
  }
  if (filters.ordering) {
    const desc = filters.ordering.startsWith("-");
    const key = filters.ordering.replace(/^-/, "") as keyof Signal;
    results.sort((a, b) => {
      const av = a[key] ?? 0;
      const bv = b[key] ?? 0;
      if (av < bv) return desc ? 1 : -1;
      if (av > bv) return desc ? -1 : 1;
      return 0;
    });
  }

  const limit = filters.limit ?? 50;
  const offset = filters.offset ?? 0;
  return {
    count: results.length,
    next: null,
    previous: null,
    results: results.slice(offset, offset + limit),
  };
}
