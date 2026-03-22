import { useStats } from "../hooks/useSignals";

const LABELS: Record<string, string> = {
  BREAKOUT_BULL: "↑ Ruptura",
  BREAKOUT_BEAR: "↓ Ruptura",
  REGRESSION_BULL: "↑ Regresión",
  REGRESSION_BEAR: "↓ Regresión",
  VOLUME_ANOMALY: "⚡ Volumen",
};

const COLORS: Record<string, string> = {
  BREAKOUT_BULL: "text-emerald-400",
  BREAKOUT_BEAR: "text-red-400",
  REGRESSION_BULL: "text-emerald-300",
  REGRESSION_BEAR: "text-red-300",
  VOLUME_ANOMALY: "text-yellow-400",
};

export default function StatsBar() {
  const { data: stats, isLoading } = useStats();

  if (isLoading || !stats || !stats.by_type) {
    return (
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
        {Array.from({ length: 7 }).map((_, i) => (
          <div key={i} className="bg-gray-800 rounded-xl h-16 animate-pulse" />
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
      <StatCard label="Total señales" value={stats.total} color="text-white" />
      <StatCard label="Sin enviar" value={stats.unsent_telegram} color="text-orange-400" />
      {Object.entries(LABELS).map(([type, label]) => (
        <StatCard
          key={type}
          label={label}
          value={stats.by_type?.[type as keyof typeof stats.by_type] ?? 0}
          color={COLORS[type]}
        />
      ))}
    </div>
  );
}

function StatCard({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="bg-gray-800 border border-gray-700 rounded-xl p-3 flex flex-col items-center justify-center">
      <span className={`text-2xl font-bold ${color}`}>{value}</span>
      <span className="text-xs text-gray-400 text-center mt-0.5">{label}</span>
    </div>
  );
}
