import { useState, useEffect, useRef } from "react";
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

// Column definitions
const COLS = [
  { id: "symbol",   label: "Símbolo",    sortKey: "symbol",       always: true  },
  { id: "type",     label: "Tipo",       sortKey: null,           always: false },
  { id: "dir",      label: "Dir.",       sortKey: null,           always: false },
  { id: "tf",       label: "TF",         sortKey: null,           always: false },
  { id: "price",    label: "Precio",     sortKey: null,           always: false },
  { id: "level",    label: "Nivel",      sortKey: null,           always: false },
  { id: "vol",      label: "Vol ×",      sortKey: "volume_ratio", always: false },
  { id: "conf",     label: "Confianza",  sortKey: "confidence",   always: false },
  { id: "age",      label: "Hace",       sortKey: "created_at",   always: false },
  { id: "tg",       label: "TG",         sortKey: null,           always: false },
  { id: "action",   label: "Acción",     sortKey: null,           always: true  },
] as const;

type ColId = typeof COLS[number]["id"];

interface Props {
  filters: Partial<SignalFilters>;
  onOrderingChange?: (ordering: string) => void;
}

export default function SignalTable({ filters, onOrderingChange }: Props) {
  const [page, setPage] = useState(0);
  const PAGE_SIZE = 30;
  const { data, isLoading, isFetching, dataUpdatedAt } = useSignals(filters, page, PAGE_SIZE);
  const sendMutation = useSendSignal();
  const countdown = useCountdown(REFETCH_INTERVAL, dataUpdatedAt);

  const signals    = data?.results ?? [];
  const total      = data?.count ?? 0;
  const totalPages = Math.ceil(total / PAGE_SIZE);

  // Column visibility
  const [hiddenCols, setHiddenCols] = useState<Set<ColId>>(new Set());
  const [showColPicker, setShowColPicker] = useState(false);
  const pickerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (pickerRef.current && !pickerRef.current.contains(e.target as Node)) {
        setShowColPicker(false);
      }
    }
    if (showColPicker) document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [showColPicker]);

  const toggleCol = (id: ColId) =>
    setHiddenCols((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });

  const visibleCols = COLS.filter((c) => !hiddenCols.has(c.id));

  // Sort helpers
  const currentOrdering = (filters as SignalFilters).ordering ?? "-created_at";
  const handleSort = (sortKey: string | null) => {
    if (!sortKey || !onOrderingChange) return;
    const isDesc = currentOrdering === `-${sortKey}`;
    onOrderingChange(isDesc ? sortKey : `-${sortKey}`);
  };

  const sortIcon = (sortKey: string | null) => {
    if (!sortKey || !onOrderingChange) return null;
    if (currentOrdering === `-${sortKey}`) return " ↓";
    if (currentOrdering === sortKey) return " ↑";
    return " ↕";
  };

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
          {/* Column picker */}
          <div className="relative" ref={pickerRef}>
            <button
              onClick={() => setShowColPicker((v) => !v)}
              className="px-2 py-1 bg-gray-800 border border-gray-700 rounded text-xs text-gray-300 hover:bg-gray-700"
            >
              Columnas ▾
            </button>
            {showColPicker && (
              <div className="absolute right-0 mt-1 z-20 bg-gray-800 border border-gray-700 rounded-lg shadow-xl p-2 w-40 space-y-1">
                {COLS.filter((c) => !c.always).map((c) => (
                  <label key={c.id} className="flex items-center gap-2 cursor-pointer text-xs text-gray-300 hover:text-white px-1 py-0.5 rounded hover:bg-gray-700">
                    <input
                      type="checkbox"
                      checked={!hiddenCols.has(c.id)}
                      onChange={() => toggleCol(c.id)}
                      className="accent-blue-500"
                    />
                    {c.label}
                  </label>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="overflow-x-auto rounded-xl border border-gray-700">
        <table className="w-full text-sm">
          <thead className="bg-gray-800 text-gray-400 text-xs uppercase tracking-wider">
            <tr>
              <th className="px-4 py-3 text-left w-6" />
              {visibleCols.map((col) => (
                <th
                  key={col.id}
                  onClick={() => handleSort(col.sortKey)}
                  className={clsx(
                    "px-4 py-3",
                    col.id === "price" || col.id === "level" || col.id === "vol" || col.id === "conf"
                      ? "text-right"
                      : col.id === "tg" || col.id === "action"
                      ? "text-center"
                      : "text-left",
                    col.sortKey && onOrderingChange ? "cursor-pointer hover:text-white select-none" : ""
                  )}
                >
                  {col.label}{sortIcon(col.sortKey)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-800">
            {isLoading
              ? Array.from({ length: 8 }).map((_, i) => (
                  <SkeletonRow key={i} colCount={visibleCols.length + 1} />
                ))
              : signals.map((sig) => (
                  <SignalRow
                    key={sig.id}
                    signal={sig}
                    visibleCols={visibleCols.map((c) => c.id)}
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

function SignalRow({
  signal,
  visibleCols,
  onSend,
  sending,
}: {
  signal: Signal;
  visibleCols: string[];
  onSend: () => void;
  sending: boolean;
}) {
  const [expanded, setExpanded] = useState(false);
  const ago = formatDistanceToNow(new Date(signal.created_at), { addSuffix: true, locale: es });

  const price = parseFloat(signal.price);
  const decimals = price < 0.01 ? 6 : price < 1 ? 5 : price < 100 ? 4 : 2;
  const fmt = (v: string | number | null) =>
    v !== null && v !== undefined ? parseFloat(String(v)).toFixed(decimals) : "—";

  const show = (id: string) => visibleCols.includes(id);

  return (
    <>
      <tr
        className="hover:bg-gray-800/50 transition-colors cursor-pointer select-none"
        onClick={() => setExpanded((v) => !v)}
      >
        <td className="px-3 py-3 text-gray-500 text-xs">{expanded ? "▲" : "▼"}</td>

        {show("symbol") && (
          <td className="px-4 py-3 font-mono font-semibold">
            <a
              href={`https://www.okx.com/trade-swap/${signal.symbol.toLowerCase()}`}
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
        )}

        {show("type") && (
          <td className="px-4 py-3">
            <span className={clsx("px-2 py-0.5 rounded-md border text-xs font-medium", TYPE_BADGE[signal.signal_type])}>
              {signal.signal_type_display}
            </span>
            {signal.repeat_count > 1 && (
              <span
                title={`×${signal.repeat_count} en las últimas 24h`}
                className="ml-1.5 px-1.5 py-0.5 rounded text-xs font-bold bg-orange-900 text-orange-300 border border-orange-700"
              >
                ×{signal.repeat_count}
              </span>
            )}
          </td>
        )}

        {show("dir") && (
          <td className="px-4 py-3">
            <span className={clsx("px-2 py-0.5 rounded text-xs font-bold", DIR_BADGE[signal.direction])}>
              {signal.direction}
            </span>
          </td>
        )}

        {show("tf") && (
          <td className="px-4 py-3 text-gray-300 font-mono">{signal.timeframe}</td>
        )}

        {show("price") && (
          <td className="px-4 py-3 text-right font-mono text-white">{fmt(signal.price)}</td>
        )}

        {show("level") && (
          <td className="px-4 py-3 text-right font-mono text-gray-300">
            {signal.breakout_level ? fmt(signal.breakout_level) : "—"}
          </td>
        )}

        {show("vol") && (
          <td className="px-4 py-3 text-right text-yellow-300">
            {signal.volume_ratio ? `${signal.volume_ratio.toFixed(2)}×` : "—"}
          </td>
        )}

        {show("conf") && (
          <td className="px-4 py-3 text-right">
            <ConfidenceBar value={signal.confidence} />
          </td>
        )}

        {show("age") && (
          <td className="px-4 py-3 text-gray-400 text-xs whitespace-nowrap">{ago}</td>
        )}

        {show("tg") && (
          <td className="px-4 py-3 text-center">
            {signal.is_sent_telegram
              ? <span title="Enviado" className="text-emerald-400">✓</span>
              : <span title="No enviado" className="text-gray-600">—</span>}
          </td>
        )}

        {show("action") && (
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
        )}
      </tr>

      {expanded && (
        <tr className="bg-gray-900/80 border-b border-gray-700">
          <td colSpan={visibleCols.length + 1} className="px-6 py-4">
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4 text-xs">
              <DetailCard label="Stop Loss" color="text-red-400">{fmt(signal.stop_loss)}</DetailCard>
              <DetailCard label="Take Profit" color="text-emerald-400">{fmt(signal.take_profit)}</DetailCard>
              <DetailCard label="Risk/Reward" color="text-blue-300">
                {signal.risk_reward != null ? `1 : ${signal.risk_reward.toFixed(2)}` : "—"}
              </DetailCard>
              <DetailCard label="ATR (14)" color="text-purple-300">
                {signal.atr != null ? signal.atr.toFixed(decimals) : "—"}
              </DetailCard>
              <DetailCard
                label="RSI (14)"
                color={signal.rsi == null ? "text-gray-400" : signal.rsi > 70 ? "text-red-400" : signal.rsi < 30 ? "text-emerald-400" : "text-gray-300"}
              >
                {signal.rsi != null ? signal.rsi.toFixed(1) : "—"}
              </DetailCard>
              <DetailCard
                label="Funding Rate"
                color={signal.funding_extreme ? "text-amber-400" : "text-gray-300"}
              >
                {signal.funding_rate != null
                  ? `${(signal.funding_rate * 100).toFixed(4)}%${signal.funding_extreme ? " ⚠️" : ""}`
                  : "—"}
              </DetailCard>
              {signal.trend_reversal != null && (
                <DetailCard
                  label="Cambio tendencia"
                  color={signal.trend_reversal ? "text-emerald-400" : "text-gray-500"}
                >
                  {signal.trend_reversal ? "🔄 Sí" : "No"}
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

function SkeletonRow({ colCount }: { colCount: number }) {
  return (
    <tr className="animate-pulse">
      {Array.from({ length: colCount }).map((_, i) => (
        <td key={i} className="px-4 py-3">
          <div className="h-4 bg-gray-800 rounded" />
        </td>
      ))}
    </tr>
  );
}
