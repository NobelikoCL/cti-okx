import type { Direction, SignalFilters, SignalType } from "../types";

const SIGNAL_TYPES: { value: SignalType | ""; label: string }[] = [
  { value: "", label: "Todos los tipos" },
  { value: "BREAKOUT_BULL",   label: "↑ Ruptura Alcista" },
  { value: "BREAKOUT_BEAR",   label: "↓ Ruptura Bajista" },
  { value: "REGRESSION_BULL", label: "↑ Regresión Alcista" },
  { value: "REGRESSION_BEAR", label: "↓ Regresión Bajista" },
  { value: "VOLUME_ANOMALY",  label: "⚡ Anomalía Volumen" },
  { value: "REVERSAL_BULL",   label: "🔄 Reversión Alcista" },
  { value: "REVERSAL_BEAR",   label: "🔄 Reversión Bajista" },
];

const TIMEFRAMES = [
  { value: "", label: "Todos los TF" },
  { value: "15m", label: "M15" },
  { value: "1H",  label: "1H" },
];

const DIRECTIONS: { value: Direction | ""; label: string }[] = [
  { value: "",        label: "Todas las dir." },
  { value: "LONG",    label: "↑ LONG" },
  { value: "SHORT",   label: "↓ SHORT" },
  { value: "NEUTRAL", label: "— NEUTRAL" },
];

interface Props {
  filters: SignalFilters;
  onChange: (f: Partial<SignalFilters>) => void;
}

const SELECT_CLS =
  "bg-gray-900 border border-gray-600 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:border-blue-500";

export default function FilterBar({ filters, onChange }: Props) {
  return (
    <div className="flex flex-wrap gap-3 items-center bg-gray-800/60 border border-gray-700 rounded-xl p-3">
      {/* Search */}
      <input
        type="text"
        placeholder="Buscar símbolo…"
        value={filters.search}
        onChange={(e) => onChange({ search: e.target.value })}
        className="bg-gray-900 border border-gray-600 rounded-lg px-3 py-1.5 text-sm w-44 focus:outline-none focus:border-blue-500"
      />

      {/* Signal type */}
      <select
        value={filters.signal_type}
        onChange={(e) => onChange({ signal_type: e.target.value as SignalType | "" })}
        className={SELECT_CLS}
      >
        {SIGNAL_TYPES.map((t) => (
          <option key={t.value} value={t.value}>{t.label}</option>
        ))}
      </select>

      {/* Direction */}
      <select
        value={filters.direction}
        onChange={(e) => onChange({ direction: e.target.value as Direction | "" })}
        className={SELECT_CLS}
      >
        {DIRECTIONS.map((d) => (
          <option key={d.value} value={d.value}>{d.label}</option>
        ))}
      </select>

      {/* Timeframe */}
      <select
        value={filters.timeframe}
        onChange={(e) => onChange({ timeframe: e.target.value })}
        className={SELECT_CLS}
      >
        {TIMEFRAMES.map((t) => (
          <option key={t.value} value={t.value}>{t.label}</option>
        ))}
      </select>

      {/* Min confidence */}
      <div className="flex items-center gap-2 text-sm">
        <label className="text-gray-400">Confianza mín.</label>
        <input
          type="range"
          min={0}
          max={1}
          step={0.05}
          value={filters.min_confidence}
          onChange={(e) => onChange({ min_confidence: parseFloat(e.target.value) })}
          className="w-24 accent-blue-500"
        />
        <span className="text-gray-300 w-10">{Math.round(filters.min_confidence * 100)}%</span>
      </div>

      {/* Ordering */}
      <select
        value={filters.ordering}
        onChange={(e) => onChange({ ordering: e.target.value })}
        className={SELECT_CLS}
      >
        <option value="-created_at">Más reciente</option>
        <option value="created_at">Más antiguo</option>
        <option value="-confidence">Mayor confianza</option>
        <option value="confidence">Menor confianza</option>
        <option value="symbol">Símbolo A-Z</option>
      </select>

      {/* Reset */}
      <button
        onClick={() =>
          onChange({ search: "", signal_type: "", direction: "", timeframe: "", min_confidence: 0, ordering: "-created_at" })
        }
        className="text-xs text-gray-400 hover:text-white underline transition-colors"
      >
        Limpiar
      </button>
    </div>
  );
}
