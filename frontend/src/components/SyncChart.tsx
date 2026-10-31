// Small dependency-free SVG line chart for the 7-day sync success rate.
export default function SyncChart({ points }: { points: { date: string; percent: number | null }[] }) {
  const W = 560, H = 180, PAD = { l: 36, r: 12, t: 12, b: 24 };
  const x = (i: number) => PAD.l + (i * (W - PAD.l - PAD.r)) / Math.max(points.length - 1, 1);
  const y = (v: number) => PAD.t + ((100 - v) * (H - PAD.t - PAD.b)) / 100;
  const valid = points.map((p, i) => (p.percent === null ? null : ([x(i), y(p.percent)] as const)));
  const path = valid.filter(Boolean).map((p, i) => `${i ? "L" : "M"}${p![0]},${p![1]}`).join(" ");

  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%" role="img" aria-label="Sync success rate over the last 7 days">
      {[0, 50, 100].map((v) => (
        <g key={v}>
          <line x1={PAD.l} x2={W - PAD.r} y1={y(v)} y2={y(v)} stroke="var(--pf-t--global--border--color--default)" />
          <text x={PAD.l - 6} y={y(v) + 4} textAnchor="end" fontSize="10" fill="currentColor">{v}%</text>
        </g>
      ))}
      {path && <path d={path} fill="none" stroke="var(--pf-t--global--color--brand--default)" strokeWidth="2" />}
      {valid.map((p, i) => p && <circle key={i} cx={p[0]} cy={p[1]} r="3.5" fill="var(--pf-t--global--color--brand--default)" />)}
      {points.map((p, i) => (
        <text key={p.date} x={x(i)} y={H - 6} textAnchor="middle" fontSize="10" fill="currentColor">{p.date.slice(5)}</text>
      ))}
    </svg>
  );
}
