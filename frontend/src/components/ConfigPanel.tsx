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
    breakout_tf:        "15m",
    volume_tf:          "15m",
    regression_tf:      "1H",
    top_symbols_count:  50,
    min_confidence:     0,
    telegram_breakout:  true,
    telegram_volume:    false,
    telegram_regression: false,
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
            max={200}
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
