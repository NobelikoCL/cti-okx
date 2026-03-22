import { useState, useEffect } from "react";
import { useSignals, useTriggerScan, useScannerStatus, useScannerConfig } from "../hooks/useSignals";
import StatsBar from "../components/StatsBar";
import FilterBar from "../components/FilterBar";
import SignalTable from "../components/SignalTable";
import TelegramPanel from "../components/TelegramPanel";
import ConfigPanel from "../components/ConfigPanel";
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

/** Live uptime string from a ISO start timestamp */
function useUptime(runningSince: string | null): string {
  const [uptime, setUptime] = useState("");
  useEffect(() => {
    if (!runningSince) { setUptime(""); return; }
    const update = () => {
      const secs = Math.floor((Date.now() - new Date(runningSince).getTime()) / 1000);
      const h = Math.floor(secs / 3600);
      const m = Math.floor((secs % 3600) / 60);
      setUptime(h > 0 ? `${h}h ${m}m` : `${m}m`);
    };
    update();
    const id = setInterval(update, 30_000);
    return () => clearInterval(id);
  }, [runningSince]);
  return uptime;
}

/** Countdown to next scan */
function useNextScanIn(lastScanAt: string | null, intervalMinutes: number): string {
  const [countdown, setCountdown] = useState("");
  useEffect(() => {
    if (!lastScanAt) { setCountdown(""); return; }
    const update = () => {
      const next = new Date(lastScanAt).getTime() + intervalMinutes * 60_000;
      const diff = Math.max(0, Math.floor((next - Date.now()) / 1000));
      if (diff === 0) { setCountdown("inminente"); return; }
      const m = Math.floor(diff / 60);
      const s = diff % 60;
      setCountdown(m > 0 ? `${m}m ${s}s` : `${s}s`);
    };
    update();
    const id = setInterval(update, 1000);
    return () => clearInterval(id);
  }, [lastScanAt, intervalMinutes]);
  return countdown;
}

export default function Dashboard() {
  const [filters, setFilters] = useState<SignalFilters>(DEFAULT_FILTERS);
  const [showTelegram, setShowTelegram] = useState(false);
  const [showConfig, setShowConfig]     = useState(false);
  const scanMutation  = useTriggerScan();
  const { data: scanStatus } = useScannerStatus();
  const { data: scanConfig } = useScannerConfig();
  const recentCount   = useRecentCount(15);
  const isScanning    = scanMutation.isPending || !!scanStatus?.is_scanning;

  const intervalMinutes = scanConfig?.scan_interval_minutes ?? 15;
  const uptime    = useUptime(scanStatus?.running_since ?? null);
  const nextScanIn = useNextScanIn(
    isScanning ? null : (scanStatus?.last_scan_at ?? null),
    intervalMinutes,
  );

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
            {/* Auto-scan status pill */}
            <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 bg-gray-800 border border-gray-700 rounded-lg text-xs select-none">
              {isScanning ? (
                <>
                  <span className="w-2 h-2 rounded-full bg-blue-400 animate-pulse" />
                  <span className="text-blue-300 font-medium">Escaneando…</span>
                </>
              ) : uptime ? (
                <>
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  <span className="text-emerald-400 font-medium">Activo {uptime}</span>
                  {nextScanIn && (
                    <span className="text-gray-500">· próximo {nextScanIn}</span>
                  )}
                </>
              ) : (
                <>
                  <span className="w-2 h-2 rounded-full bg-gray-500" />
                  <span className="text-gray-400">Esperando primer scan…</span>
                </>
              )}
            </div>

            <button
              onClick={() => { setShowConfig((v) => !v); setShowTelegram(false); }}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-800 hover:bg-gray-700 border border-gray-700 rounded-lg text-sm transition-colors"
            >
              ⚙️ Config
            </button>
            <button
              onClick={() => { setShowTelegram((v) => !v); setShowConfig(false); }}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-800 hover:bg-gray-700 border border-gray-700 rounded-lg text-sm transition-colors"
            >
              📱 Telegram
            </button>
            <button
              onClick={() => scanMutation.mutate()}
              disabled={isScanning}
              title="Forzar un scan manual ahora (el scanner automático ya corre en el servidor)"
              className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-700 hover:bg-blue-600 disabled:opacity-60 rounded-lg text-sm font-medium transition-colors"
            >
              {isScanning
                ? <><span className="animate-spin inline-block">⟳</span> Escaneando…</>
                : "▶ Scan manual"}
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-screen-2xl mx-auto px-4 sm:px-6 py-6 space-y-6">
        {scanMutation.isSuccess && (
          <div className="bg-blue-900/40 border border-blue-700 rounded-lg px-4 py-2 text-sm text-blue-300">
            ✓ Scan manual iniciado — las señales aparecerán en ~30 segundos
          </div>
        )}

        {showConfig && <ConfigPanel />}

        {showTelegram && (
          <div className="max-w-md">
            <TelegramPanel />
          </div>
        )}

        <StatsBar />
        <FilterBar filters={filters} onChange={updateFilters} />
        <SignalTable
          filters={filters}
          onOrderingChange={(o) => updateFilters({ ordering: o })}
        />
      </main>
    </div>
  );
}
