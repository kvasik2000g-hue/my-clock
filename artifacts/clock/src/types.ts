export type ClockStyle = "apple" | "digital";
export type ClockTheme = "black" | "night" | "matrix" | "amber" | "day";
export type ClockWeight = 200 | 250 | 300 | 350;

export interface ClockFaceProps {
  time: Date;
  showSeconds: boolean;
}

export const THEME_COLORS: Record<ClockTheme, string> = {
  black: "#000000",
  night: "#030d1f",
  matrix: "#001400",
  amber: "#1c0e00",
  day: "#f2f2f7",
};

export const STYLE_LABELS: Record<ClockStyle, string> = {
  apple: "A",
  digital: "D",
};

export const THEME_LABELS: Record<ClockTheme, string> = {
  black: "Чёрная",
  night: "Ночь",
  matrix: "Matrix",
  amber: "Янтарь",
  day: "День",
};

export const THEME_DOT_COLORS: Record<ClockTheme, string> = {
  black: "#333333",
  night: "#1a3a6e",
  matrix: "#004400",
  amber: "#4a2700",
  day: "#c8c8d0",
};

export const CLOCK_WEIGHTS: ClockWeight[] = [200, 250, 300, 350];
