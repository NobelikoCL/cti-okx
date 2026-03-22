export type SignalType =
  | "BREAKOUT_BULL"
  | "BREAKOUT_BEAR"
  | "REGRESSION_BULL"
  | "REGRESSION_BEAR"
  | "VOLUME_ANOMALY";

export type Direction = "LONG" | "SHORT" | "NEUTRAL";

export interface Signal {
  id: number;
  symbol: string;
  signal_type: SignalType;
  signal_type_display: string;
  direction: Direction;
  timeframe: string;
  price: string;
  breakout_level: string | null;
  regression_slope: number | null;
  regression_r2: number | null;
  volume_ratio: number | null;
  // Quantitative enrichment (Tier 3)
  rsi: number | null;
  atr: number | null;
  stop_loss: string | null;
  take_profit: string | null;
  risk_reward: number | null;
  funding_rate: number | null;
  funding_extreme: boolean;
  trend_reversal: boolean | null;
  confidence: number;
  is_sent_telegram: boolean;
  created_at: string;
}

export interface SignalStats {
  total: number;
  unsent_telegram: number;
  by_type: Record<SignalType, number>;
}

export interface PaginatedResponse<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}

export interface TelegramStatus {
  configured: boolean;
  chat_id: string;
}

export interface ScannerConfig {
  breakout_tf: string;
  volume_tf: string;
  regression_tf: string;
  top_symbols_count: number;
  min_confidence: number;
  telegram_breakout: boolean;
  telegram_volume: boolean;
  telegram_regression: boolean;
  telegram_reversal_filter: boolean;
  ema_fast: number;
  ema_slow: number;
}

export interface SignalFilters {
  search: string;
  signal_type: SignalType | "";
  direction: Direction | "";
  timeframe: string;
  min_confidence: number;
  ordering: string;
}
