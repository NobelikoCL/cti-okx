import { useState } from "react";
import { useSignals, useTriggerScan } from "../hooks/useSignals";
import StatsBar from "../components/StatsBar";
import FilterBar from "../components/FilterBar";
import SignalTable from "../components/SignalTable";
import TelegramPanel from "../components/TelegramPanel";
import type { SignalFilters } from "../types";

const DEFAULT_FILTERS: SignalFilters = {
  search:         "",
  signal_type:    "",
  direction:      "",
  timeframe:      "",
  min_confidence: 0,
  ordering:       "-created_at",
};

/** Count signals generated in the last N minutes */
function useRecentCount(minutes = 15) {
  const { data } = useSignals({ ordering: "-created_at" }, 0, 100);
  if (!data?.results) return 0;
  const cutoff = Date.now() - minutes * 60 * 1000;
  return data.results.filter((s) => new Date(s.created_at).getTime() >= cutoff).length;
}

export default function Dashboard() {
  const [filters, setFilters] = useState<SignalFilters>(DEFAULT_FILTERS);
  const [showTelegram, setShowTelegram]   = useState(false);
  const scanMutation = useTriggerScan();
  const recentCount  = useRecentCount(15);

  const updateFilters = (partial: Partial<SignalFilters>) => {
    setFilters((prev) => ({ ...prev, ...partial }));
  };

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100">
      {/* Header */}
      <header className="bg-gray-900 border-b border-gray-800 sticky top-0 z-10">
        <div className="max-w-screen-2xl mx-auto px-4 sm:px-6 py-3 flex items-center gap-4">
          <div className="flex items-center gap-2">
            <span className="text-xl">📡</span>
            <div>
              <h1 className="text-base font-bold leading-none">CTIS OKX</h1>
              <p className="text-xs text-gray-400 leading-none mt-0.5">Futuros USDT — Scanner</p>
            </div>
            {/* Badge: new signals in last 15 min */}
            {recentCount > 0 && (
              <span
                title={`${recentCount} señales en los últimos 15 min`}
                className="ml-1 bg-emerald-500 text-white text-xs font-bold rounded-full px-2 py-0.5 animate-pulse"
              >
                +{recentCount}
              </span>
            )}
          </div>

          <div className="ml-auto flex items-center gap-3">
            <button
              onClick={() => setShowTelegram((v) => !v)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-800 hover:bg-gray-700 border border-gray-700 rounded-lg text-sm transition-colors"
            >
              📱 Telegram
            </button>
            <button
              onClick={() => scanMutation.mutate()}
              disabled={scanMutation.isPending}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-700 hover:bg-blue-600 disabled:opacity-50 rounded-lg text-sm font-medium transition-colors"
            >
              {scanMutation.isPending ? <span className="animate-spin">⟳</span> : "▶ Escanear ahora"}
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-screen-2xl mx-auto px-4 sm:px-6 py-6 space-y-6">
        {scanMutation.isSuccess && (
          <div className="bg-blue-900/40 border border-blue-700 rounded-lg px-4 py-2 text-sm text-blue-300">
            ✓ Escaneo iniciado — las señales aparecerán en ~30 segundos
          </div>
        )}

        {showTelegram && (
          <div className="max-w-md">
            <TelegramPanel />
          </div>
        )}

        <StatsBar />
        <FilterBar filters={filters} onChange={updateFilters} />
        <SignalTable filters={filters} />
      </main>
    </div>
  );
}
