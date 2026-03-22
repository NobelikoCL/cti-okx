import { useState, useEffect } from "react";
import { formatDistanceToNow } from "date-fns";
import { es } from "date-fns/locale";
import { useSignals, useSendSignal } from "../hooks/useSignals";
import type { Signal, SignalFilters } from "../types";
import clsx from "clsx";

const REFETCH_INTERVAL = 30; // seconds

function useCountdown(seconds: number, trigger: unknown) {
  const [remaining, setRemaining] = useState(seconds);
  useEffect(() => {
    setRemaining(seconds);
    const id = setInterval(() => setRemaining((s) => (s <= 1 ? seconds : s - 1)), 1000);
    return () => clearInterval(id);
  }, [seconds, trigger]);
  return remaining;
}

const TYPE_BADGE: Record<string, string> = {
  BREAKOUT_BULL:   "bg-emerald-900 text-emerald-300 border-emerald-700",
  BREAKOUT_BEAR:   "bg-red-900 text-red-300 border-red-700",
  REGRESSION_BULL: "bg-teal-900 text-teal-300 border-teal-700",
  REGRESSION_BEAR: "bg-rose-900 text-rose-300 border-rose-700",
  VOLUME_ANOMALY:  "bg-yellow-900 text-yellow-300 border-yellow-700",
};

const DIR_BADGE: Record<string, string> = {
  LONG:    "bg-emerald-700 text-white",
  SHORT:   "bg-red-700 text-white",
  NEUTRAL: "bg-gray-700 text-gray-300",
};

interface Props {
  filters: Partial<SignalFilters>;
}

export default function SignalTable({ filters }: Props) {
  const [page, setPage] = useState(0);
  const PAGE_SIZE = 50;
  const { data, isLoading, isFetching, dataUpdatedAt } = useSignals(filters, page, PAGE_SIZE);
  const sendMutation = useSendSignal();
  const countdown = useCountdown(REFETCH_INTERVAL, dataUpdatedAt);

  const signals    = data?.results ?? [];
  const total      = data?.count ?? 0;
  const totalPages = Math.ceil(total / PAGE_SIZE);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between text-sm text-gray-400">
        <span>{total} señales encontradas</span>
        <div className="flex items-center gap-3 text-xs">
          {isFetching
            ? <span className="text-blue-400 animate-pulse">⟳ Actualizando…</span>
            : <span className="text-gray-500">
                próxima actualización en{" "}
                <span className={clsx("font-mono", countdown <= 5 ? "text-amber-400" : "text-gray-400")}>
                  {countdown}s
                </span>
              </span>
          }
        </div>
      </div>

      <div className="overflow-x-auto rounded-xl border border-gray-700">
        <table className="w-full text-sm">
          <thead className="bg-gray-800 text-gray-400 text-xs uppercase tracking-wider">
            <tr>
              <th className="px-4 py-3 text-left w-6" />
              <th className="px-4 py-3 text-left">Símbolo</th>
              <th className="px-4 py-3 text-left">Tipo</th>
              <th className="px-4 py-3 text-left">Dir.</th>
              <th className="px-4 py-3 text-left">TF</th>
              <th className="px-4 py-3 text-right">Precio</th>
              <th className="px-4 py-3 text-right">Nivel</th>
              <th className="px-4 py-3 text-right">Vol ×</th>
              <th className="px-4 py-3 text-right">R²</th>
              <th className="px-4 py-3 text-right">Confianza</th>
              <th className="px-4 py-3 text-left">Hace</th>
              <th className="px-4 py-3 text-center">TG</th>
              <th className="px-4 py-3 text-center">Acción</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-800">
            {isLoading
              ? Array.from({ length: 8 }).map((_, i) => <SkeletonRow key={i} />)
              : signals.map((sig) => (
                  <SignalRow
                    key={sig.id}
                    signal={sig}
                    onSend={() => sendMutation.mutate(sig.id)}
                    sending={sendMutation.isPending && sendMutation.variables === sig.id}
                  />
                ))}
          </tbody>
        </table>
        {!isLoading && signals.length === 0 && (
          <div className="py-16 text-center text-gray-500">No se encontraron señales</div>
        )}
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <button
            onClick={() => setPage((p) => Math.max(0, p - 1))}
            disabled={page === 0}
            className="px-3 py-1.5 bg-gray-800 border border-gray-700 rounded-lg text-sm disabled:opacity-40 hover:bg-gray-700"
          >
            ← Anterior
          </button>
          <span className="text-sm text-gray-400">{page + 1} / {totalPages}</span>
          <button
            onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
            disabled={page >= totalPages - 1}
            className="px-3 py-1.5 bg-gray-800 border border-gray-700 rounded-lg text-sm disabled:opacity-40 hover:bg-gray-700"
          >
            Siguiente →
          </button>
        </div>
      )}
    </div>
  );
}

function SignalRow({ signal, onSend, sending }: { signal: Signal; onSend: () => void; sending: boolean }) {
  const [expanded, setExpanded] = useState(false);
  const ago = formatDistanceToNow(new Date(signal.created_at), { addSuffix: true, locale: es });

  const price = parseFloat(signal.price);
  const decimals = price < 0.01 ? 6 : price < 1 ? 5 : price < 100 ? 4 : 2;
  const fmt = (v: string | number | null) =>
    v !== null && v !== undefined ? parseFloat(String(v)).toFixed(decimals) : "—";

  return (
    <>
      <tr
        className="hover:bg-gray-800/50 transition-colors cursor-pointer select-none"
        onClick={() => setExpanded((v) => !v)}
      >
        {/* expand toggle */}
        <td className="px-3 py-3 text-gray-500 text-xs">
          {expanded ? "▲" : "▼"}
        </td>
        <td className="px-4 py-3 font-mono font-semibold">
          <a
            href={`https://www.okx.com/trade-swap/${signal.symbol.toLowerCase().replace(/-/g, "-")}`}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
            className="text-blue-400 hover:text-blue-300 hover:underline transition-colors"
            title="Ver en OKX"
          >
            {signal.symbol}
          </a>
          {signal.funding_extreme && (
            <span title={`Funding extremo: ${((signal.funding_rate ?? 0) * 100).toFixed(3)}%`}
                  className="ml-1 text-amber-400 text-xs">⚠️</span>
          )}
        </td>
        <td className="px-4 py-3">
          <span className={clsx("px-2 py-0.5 rounded-md border text-xs font-medium", TYPE_BADGE[signal.signal_type])}>
            {signal.signal_type_display}
          </span>
          {signal.repeat_count > 1 && (
            <span
              title={`Este activo ha generado esta señal ×${signal.repeat_count} en las últimas 24h`}
              className="ml-1.5 px-1.5 py-0.5 rounded text-xs font-bold bg-orange-900 text-orange-300 border border-orange-700"
            >
              ×{signal.repeat_count}
            </span>
          )}
        </td>
        <td className="px-4 py-3">
          <span className={clsx("px-2 py-0.5 rounded text-xs font-bold", DIR_BADGE[signal.direction])}>
            {signal.direction}
          </span>
        </td>
        <td className="px-4 py-3 text-gray-300 font-mono">{signal.timeframe}</td>
        <td className="px-4 py-3 text-right font-mono text-white">{fmt(signal.price)}</td>
        <td className="px-4 py-3 text-right font-mono text-gray-300">
          {signal.breakout_level ? fmt(signal.breakout_level) : "—"}
        </td>
        <td className="px-4 py-3 text-right text-yellow-300">
          {signal.volume_ratio ? `${signal.volume_ratio.toFixed(2)}×` : "—"}
        </td>
        <td className="px-4 py-3 text-right text-blue-300">
          {signal.regression_r2 !== null ? signal.regression_r2.toFixed(3) : "—"}
        </td>
        <td className="px-4 py-3 text-right">
          <ConfidenceBar value={signal.confidence} />
        </td>
        <td className="px-4 py-3 text-gray-400 text-xs whitespace-nowrap">{ago}</td>
        <td className="px-4 py-3 text-center">
          {signal.is_sent_telegram
            ? <span title="Enviado" className="text-emerald-400">✓</span>
            : <span title="No enviado" className="text-gray-600">—</span>}
        </td>
        <td className="px-4 py-3 text-center" onClick={(e) => e.stopPropagation()}>
          {!signal.is_sent_telegram && (
            <button
              onClick={onSend}
              disabled={sending}
              className="px-2 py-1 text-xs bg-blue-700 hover:bg-blue-600 rounded disabled:opacity-50 transition-colors"
            >
              {sending ? "…" : "📤 TG"}
            </button>
          )}
        </td>
      </tr>

      {/* ── Expanded detail row ─────────────────────────────────────────────── */}
      {expanded && (
        <tr className="bg-gray-900/80 border-b border-gray-700">
          <td colSpan={13} className="px-6 py-4">
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4 text-xs">
              {/* Stop Loss */}
              <DetailCard label="Stop Loss" color="text-red-400">
                {fmt(signal.stop_loss)}
              </DetailCard>

              {/* Take Profit */}
              <DetailCard label="Take Profit" color="text-emerald-400">
                {fmt(signal.take_profit)}
              </DetailCard>

              {/* Risk/Reward */}
              <DetailCard label="Risk/Reward" color="text-blue-300">
                {signal.risk_reward != null
                  ? `1 : ${signal.risk_reward.toFixed(2)}`
                  : "—"}
              </DetailCard>

              {/* ATR */}
              <DetailCard label="ATR (14)" color="text-purple-300">
                {signal.atr != null ? signal.atr.toFixed(decimals) : "—"}
              </DetailCard>

              {/* RSI */}
              <DetailCard
                label="RSI (14)"
                color={
                  signal.rsi == null ? "text-gray-400"
                  : signal.rsi > 70 ? "text-red-400"
                  : signal.rsi < 30 ? "text-emerald-400"
                  : "text-gray-300"
                }
              >
                {signal.rsi != null ? signal.rsi.toFixed(1) : "—"}
              </DetailCard>

              {/* Funding Rate */}
              <DetailCard
                label="Funding Rate"
                color={signal.funding_extreme ? "text-amber-400" : "text-gray-300"}
              >
                {signal.funding_rate != null
                  ? `${(signal.funding_rate * 100).toFixed(4)}%${signal.funding_extreme ? " ⚠️" : ""}`
                  : "—"}
              </DetailCard>

              {/* Trend Reversal */}
              {signal.trend_reversal != null && (
                <DetailCard
                  label="Cambio tendencia"
                  color={signal.trend_reversal ? "text-emerald-400" : "text-gray-500"}
                >
                  {signal.trend_reversal ? "🔄 Sí — EMA cruzó" : "No"}
                </DetailCard>
              )}
            </div>
          </td>
        </tr>
      )}
    </>
  );
}

function DetailCard({ label, color, children }: { label: string; color: string; children: React.ReactNode }) {
  return (
    <div className="bg-gray-800 rounded-lg px-3 py-2 space-y-1">
      <div className="text-gray-500 text-xs uppercase tracking-wide">{label}</div>
      <div className={clsx("font-mono font-semibold text-sm", color)}>{children}</div>
    </div>
  );
}

function ConfidenceBar({ value }: { value: number }) {
  const pct   = Math.round(value * 100);
  const color = pct >= 80 ? "bg-emerald-500" : pct >= 50 ? "bg-yellow-500" : "bg-red-500";
  return (
    <div className="flex items-center gap-2 justify-end">
      <div className="w-16 h-1.5 bg-gray-700 rounded-full overflow-hidden">
        <div className={clsx("h-full rounded-full", color)} style={{ width: `${pct}%` }} />
      </div>
      <span className="text-xs text-gray-300 w-8 text-right">{pct}%</span>
    </div>
  );
}

function SkeletonRow() {
  return (
    <tr className="animate-pulse">
      {Array.from({ length: 13 }).map((_, i) => (
        <td key={i} className="px-4 py-3">
          <div className="h-4 bg-gray-800 rounded" />
        </td>
      ))}
    </tr>
  );
}
