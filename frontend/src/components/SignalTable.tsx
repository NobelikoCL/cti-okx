import { useState } from "react";
import { formatDistanceToNow } from "date-fns";
import { es } from "date-fns/locale";
import { useSignals, useSendSignal } from "../hooks/useSignals";
import type { Signal, SignalFilters } from "../types";
import clsx from "clsx";

const TYPE_BADGE: Record<string, string> = {
  BREAKOUT_BULL: "bg-emerald-900 text-emerald-300 border-emerald-700",
  BREAKOUT_BEAR: "bg-red-900 text-red-300 border-red-700",
  REGRESSION_BULL: "bg-teal-900 text-teal-300 border-teal-700",
  REGRESSION_BEAR: "bg-rose-900 text-rose-300 border-rose-700",
  VOLUME_ANOMALY: "bg-yellow-900 text-yellow-300 border-yellow-700",
};

const DIR_BADGE: Record<string, string> = {
  LONG: "bg-emerald-700 text-white",
  SHORT: "bg-red-700 text-white",
  NEUTRAL: "bg-gray-700 text-gray-300",
};

interface Props {
  filters: Partial<SignalFilters>;
}

export default function SignalTable({ filters }: Props) {
  const [page, setPage] = useState(0);
  const PAGE_SIZE = 50;
  const { data, isLoading, isFetching } = useSignals(filters, page, PAGE_SIZE);
  const sendMutation = useSendSignal();

  const signals = data?.results ?? [];
  const total = data?.count ?? 0;
  const totalPages = Math.ceil(total / PAGE_SIZE);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between text-sm text-gray-400">
        <span>{total} señales encontradas</span>
        {isFetching && <span className="text-xs text-blue-400 animate-pulse">Actualizando…</span>}
      </div>

      <div className="overflow-x-auto rounded-xl border border-gray-700">
        <table className="w-full text-sm">
          <thead className="bg-gray-800 text-gray-400 text-xs uppercase tracking-wider">
            <tr>
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
          <span className="text-sm text-gray-400">
            {page + 1} / {totalPages}
          </span>
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
  onSend,
  sending,
}: {
  signal: Signal;
  onSend: () => void;
  sending: boolean;
}) {
  const ago = formatDistanceToNow(new Date(signal.created_at), { addSuffix: true, locale: es });

  return (
    <tr className="hover:bg-gray-800/50 transition-colors">
      <td className="px-4 py-3 font-mono font-semibold text-white">{signal.symbol}</td>
      <td className="px-4 py-3">
        <span
          className={clsx(
            "px-2 py-0.5 rounded-md border text-xs font-medium",
            TYPE_BADGE[signal.signal_type]
          )}
        >
          {signal.signal_type_display}
        </span>
      </td>
      <td className="px-4 py-3">
        <span
          className={clsx(
            "px-2 py-0.5 rounded text-xs font-bold",
            DIR_BADGE[signal.direction]
          )}
        >
          {signal.direction}
        </span>
      </td>
      <td className="px-4 py-3 text-gray-300 font-mono">{signal.timeframe}</td>
      <td className="px-4 py-3 text-right font-mono text-white">
        {parseFloat(signal.price).toFixed(4)}
      </td>
      <td className="px-4 py-3 text-right font-mono text-gray-300">
        {signal.breakout_level ? parseFloat(signal.breakout_level).toFixed(4) : "—"}
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
        {signal.is_sent_telegram ? (
          <span title="Enviado" className="text-emerald-400">✓</span>
        ) : (
          <span title="No enviado" className="text-gray-600">—</span>
        )}
      </td>
      <td className="px-4 py-3 text-center">
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
  );
}

function ConfidenceBar({ value }: { value: number }) {
  const pct = Math.round(value * 100);
  const color =
    pct >= 80 ? "bg-emerald-500" : pct >= 50 ? "bg-yellow-500" : "bg-red-500";
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
      {Array.from({ length: 12 }).map((_, i) => (
        <td key={i} className="px-4 py-3">
          <div className="h-4 bg-gray-800 rounded" />
        </td>
      ))}
    </tr>
  );
}
