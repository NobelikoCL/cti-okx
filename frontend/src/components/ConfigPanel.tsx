import { useState, useEffect } from "react";
import { useScannerConfig, useSaveScannerConfig } from "../hooks/useSignals";
import type { ScannerConfig } from "../types";

const TIMEFRAMES = [
  { value: "1m",  label: "1 min" },
  { value: "3m",  label: "3 min" },
  { value: "5m",  label: "5 min" },
  { value: "15m", label: "15 min" },
  { value: "30m", label: "30 min" },
  { value: "1H",  label: "1 hora" },
  { value: "2H",  label: "2 horas" },
  { value: "4H",  label: "4 horas" },
  { value: "6H",  label: "6 horas" },
  { value: "12H", label: "12 horas" },
  { value: "1D",  label: "1 día" },
];

const SELECT_CLS =
  "bg-gray-900 border border-gray-600 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:border-blue-500 w-full";

export default function ConfigPanel() {
  const { data: remote } = useScannerConfig();
  const saveMutation = useSaveScannerConfig();

  const [form, setForm] = useState<ScannerConfig>({
    breakout_tf:              "15m",
    volume_tf:                "15m",
    regression_tf:            "1H",
    top_symbols_count:        50,
    min_confidence:           0,
    telegram_breakout:        true,
    telegram_volume:          false,
    telegram_regression:      false,
    telegram_reversal_filter: false,
    ema_fast:                 9,
    ema_slow:                 21,
    telegram_cooldown_minutes:       15,
    telegram_min_confidence_tg:      0,
    telegram_regression_reversal:    false,
    telegram_reversal:               true,
    scan_interval_minutes:           15,
  });
  const [saved, setSaved] = useState(false);

  // Sync with remote when loaded
  useEffect(() => {
    if (remote) setForm(remote);
  }, [remote]);

  const update = (field: keyof ScannerConfig, value: string | number | boolean) =>
    setForm((prev) => ({ ...prev, [field]: value }));

  const handleSave = async () => {
    setSaved(false);
    await saveMutation.mutateAsync(form);
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  return (
    <div className="bg-gray-800 border border-gray-700 rounded-xl p-5 space-y-5">
      <div className="flex items-center gap-3">
        <span className="text-2xl">⚙️</span>
        <div>
          <h2 className="text-base font-semibold text-white">Configuración del Scanner</h2>
          <p className="text-xs text-gray-400">Timeframes y parámetros del análisis</p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Breakout TF */}
        <div className="space-y-1.5">
          <label className="text-xs text-gray-400 uppercase tracking-wide font-medium">
            📈 Ruptura — Timeframe
          </label>
          <select
            value={form.breakout_tf}
            onChange={(e) => update("breakout_tf", e.target.value)}
            className={SELECT_CLS}
          >
            {TIMEFRAMES.map((t) => (
              <option key={t.value} value={t.value}>{t.label}</option>
            ))}
          </select>
          <p className="text-xs text-gray-500">Rango de velas para detectar rupturas</p>
        </div>

        {/* Volume TF */}
        <div className="space-y-1.5">
          <label className="text-xs text-gray-400 uppercase tracking-wide font-medium">
            ⚡ Volumen — Timeframe
          </label>
          <select
            value={form.volume_tf}
            onChange={(e) => update("volume_tf", e.target.value)}
            className={SELECT_CLS}
          >
            {TIMEFRAMES.map((t) => (
              <option key={t.value} value={t.value}>{t.label}</option>
            ))}
          </select>
          <p className="text-xs text-gray-500">Velas para z-score de anomalía de volumen</p>
        </div>

        {/* Regression TF */}
        <div className="space-y-1.5">
          <label className="text-xs text-gray-400 uppercase tracking-wide font-medium">
            📐 Tendencia — Timeframe
          </label>
          <select
            value={form.regression_tf}
            onChange={(e) => update("regression_tf", e.target.value)}
            className={SELECT_CLS}
          >
            {TIMEFRAMES.map((t) => (
              <option key={t.value} value={t.value}>{t.label}</option>
            ))}
          </select>
          <p className="text-xs text-gray-500">Velas para regresión lineal (LSRL)</p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 border-t border-gray-700 pt-4">
        {/* Top symbols */}
        <div className="space-y-1.5">
          <label className="text-xs text-gray-400 uppercase tracking-wide font-medium">
            🏆 Top activos por volumen
          </label>
          <input
            type="number"
            min={10}
            max={300}
            value={form.top_symbols_count}
            onChange={(e) => update("top_symbols_count", parseInt(e.target.value) || 50)}
            className="bg-gray-900 border border-gray-600 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:border-blue-500 w-full"
          />
          <p className="text-xs text-gray-500">Número de pares USDT-SWAP a escanear</p>
        </div>

        {/* Min confidence */}
        <div className="space-y-1.5">
          <label className="text-xs text-gray-400 uppercase tracking-wide font-medium">
            🎯 Confianza mínima para guardar
          </label>
          <div className="flex items-center gap-3">
            <input
              type="range"
              min={0}
              max={1}
              step={0.05}
              value={form.min_confidence}
              onChange={(e) => update("min_confidence", parseFloat(e.target.value))}
              className="flex-1 accent-blue-500"
            />
            <span className="text-sm text-gray-300 w-10 text-right font-mono">
              {Math.round(form.min_confidence * 100)}%
            </span>
          </div>
          <p className="text-xs text-gray-500">Señales por debajo se descartan</p>
        </div>
      </div>

      {/* Telegram auto-send */}
      <div className="border-t border-gray-700 pt-4 space-y-3">
        <p className="text-xs text-gray-400 uppercase tracking-wide font-medium">
          📱 Enviar automáticamente a Telegram
        </p>
        <div className="flex flex-wrap gap-4">
          {[
            { field: "telegram_breakout",   label: "📈 Ruptura" },
            { field: "telegram_volume",     label: "⚡ Volumen" },
            { field: "telegram_regression", label: "📐 Tendencia" },
            { field: "telegram_reversal",   label: "🔄 Reversión LSRL" },
          ].map(({ field, label }) => (
            <label key={field} className="flex items-center gap-2 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={form[field as keyof ScannerConfig] as boolean}
                onChange={(e) => update(field as keyof ScannerConfig, e.target.checked)}
                className="w-4 h-4 accent-blue-500"
              />
              <span className="text-sm text-gray-300">{label}</span>
            </label>
          ))}
        </div>
        <p className="text-xs text-gray-500">
          Solo los tipos marcados dispararán alertas Telegram al detectarse
        </p>

        {/* Reversal filter */}
        <div className="mt-3 p-3 bg-gray-900/60 rounded-lg border border-gray-600 space-y-3">
          <label className="flex items-center gap-2 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={form.telegram_reversal_filter}
              onChange={(e) => update("telegram_reversal_filter", e.target.checked)}
              className="w-4 h-4 accent-blue-500"
            />
            <span className="text-sm text-gray-200 font-medium">
              🔄 Exigir cambio de tendencia (EMA crossover)
            </span>
          </label>
          <p className="text-xs text-gray-500 pl-6">
            Solo envía ruptura si EMA({form.ema_fast}) cruza EMA({form.ema_slow}) — alcista↔bajista
          </p>
          {form.telegram_reversal_filter && (
            <div className="grid grid-cols-2 gap-3 pl-6">
              <div className="space-y-1">
                <label className="text-xs text-gray-400">EMA rápida</label>
                <input
                  type="number"
                  min={2}
                  max={50}
                  value={form.ema_fast}
                  onChange={(e) => update("ema_fast", parseInt(e.target.value) || 9)}
                  className="bg-gray-800 border border-gray-600 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:border-blue-500 w-full"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs text-gray-400">EMA lenta</label>
                <input
                  type="number"
                  min={3}
                  max={200}
                  value={form.ema_slow}
                  onChange={(e) => update("ema_slow", parseInt(e.target.value) || 21)}
                  className="bg-gray-800 border border-gray-600 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:border-blue-500 w-full"
                />
              </div>
            </div>
          )}
        </div>

      </div>

      {/* Noise filters */}
      <div className="border-t border-gray-700 pt-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Cooldown */}
        <div className="space-y-1.5">
          <label className="text-xs text-gray-400 uppercase tracking-wide font-medium">
            ⏱ Cooldown entre alertas
          </label>
          <div className="flex items-center gap-3">
            <input
              type="range"
              min={0}
              max={120}
              step={5}
              value={form.telegram_cooldown_minutes}
              onChange={(e) => update("telegram_cooldown_minutes", parseInt(e.target.value))}
              className="flex-1 accent-blue-500"
            />
            <span className="text-sm text-gray-300 w-14 text-right font-mono">
              {form.telegram_cooldown_minutes === 0 ? "sin límite" : `${form.telegram_cooldown_minutes} min`}
            </span>
          </div>
          <p className="text-xs text-gray-500">Mismo activo+tipo no se reenvía antes de este tiempo</p>
        </div>

        {/* Min confidence for TG */}
        <div className="space-y-1.5">
          <label className="text-xs text-gray-400 uppercase tracking-wide font-medium">
            🎯 Confianza mínima para Telegram
          </label>
          <div className="flex items-center gap-3">
            <input
              type="range"
              min={0}
              max={1}
              step={0.05}
              value={form.telegram_min_confidence_tg}
              onChange={(e) => update("telegram_min_confidence_tg", parseFloat(e.target.value))}
              className="flex-1 accent-blue-500"
            />
            <span className="text-sm text-gray-300 w-10 text-right font-mono">
              {Math.round(form.telegram_min_confidence_tg * 100)}%
            </span>
          </div>
          <p className="text-xs text-gray-500">Señales por debajo no disparan alerta TG</p>
        </div>
      </div>

      {/* Auto-scan interval */}
      <div className="border-t border-gray-700 pt-4 space-y-2">
        <p className="text-xs text-gray-400 uppercase tracking-wide font-medium">
          🕐 Escaneo automático 24/7
        </p>
        <div className="flex items-center gap-3">
          <input
            type="range"
            min={1}
            max={60}
            step={1}
            value={form.scan_interval_minutes}
            onChange={(e) => update("scan_interval_minutes", parseInt(e.target.value))}
            className="flex-1 accent-blue-500"
          />
          <span className="text-sm text-gray-300 w-16 text-right font-mono">
            cada {form.scan_interval_minutes} min
          </span>
        </div>
        <p className="text-xs text-gray-500">
          El scanner corre en el servidor continuamente — sin importar si esta pantalla está abierta
        </p>
      </div>

      <div className="flex items-center justify-between pt-1">
        <p className="text-xs text-gray-500">
          Los cambios aplican en el próximo ciclo de escaneo
        </p>
        <div className="flex items-center gap-3">
          {saved && (
            <span className="text-sm text-emerald-400">✓ Guardado</span>
          )}
          <button
            onClick={handleSave}
            disabled={saveMutation.isPending}
            className="px-4 py-1.5 bg-blue-700 hover:bg-blue-600 disabled:opacity-50 rounded-lg text-sm font-medium transition-colors"
          >
            {saveMutation.isPending ? "Guardando…" : "💾 Guardar configuración"}
          </button>
        </div>
      </div>
    </div>
  );
}
