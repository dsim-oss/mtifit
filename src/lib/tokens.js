// Active Health Design System v3
export const T = {
  ink: "#1A1D23",
  accent: "#0F766E",
  accentDeep: "#0D5F58",
  warmBg: "#FAFAF8",
  warmCloud: "#F5F4F1",
  mist: "#E5E7EB",
  white: "#FFFFFF",
  red: "#DC2626",
  amber: "#F59E0B",
  green: "#22C55E",
  purple: "#7C3AED",
  mono: "'IBM Plex Mono', monospace",
  sans: "'DM Sans', system-ui, -apple-system, sans-serif",
  r: { sm: 6, md: 10, lg: 16 },
}

export const flagColor = (f) =>
  f === "improved" ? T.green :
  f === "stable" ? T.amber :
  f === "noise" ? "#D1D5DB" :
  f === "declined" ? T.red : "#9CA3AF"

export const flagLabel = (f) =>
  f === "improved" ? "REAL CHANGE" :
  f === "stable" ? "TRENDING" :
  f === "noise" ? "WITHIN NOISE" :
  f === "declined" ? "DECLINED" : "BASELINE"
