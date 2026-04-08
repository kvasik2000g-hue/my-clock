export type ClockStyle = "digital" | "apple" | "analog" | "neon" | "flip";
export type ClockTheme = "black" | "night" | "matrix" | "amber" | "day";

export interface ClockFaceProps {
  time: Date;
  showSeconds: boolean;
  use24h: boolean;
}

export const THEME_COLORS: Record<ClockTheme, string> = {
  black: "#000000",
  night: "#030d1f",
  matrix: "#001400",
  amber: "#1c0e00",
  day: "#f2f2f7",
};

export const STYLE_LABELS: Record<ClockStyle, string> = {
  digital: "Digital",
  apple: "Apple",
  analog: "Аналог",
  neon: "Neon",
  flip: "Flip",
};

export const THEME_LABELS: Record<ClockTheme, string> = {
  black: "Чёрная",
  night: "Ночь",
  matrix: "Matrix",
  amber: "Янтарь",
  day: "День",
};

export const THEME_DOT_COLORS: Record<ClockTheme, string> = {
  black: "#2a2a2a",
  night: "#1a3a6e",
  matrix: "#003300",
  amber: "#4a2700",
  day: "#c8c8d0",
};
