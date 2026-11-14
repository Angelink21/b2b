/** Token values for OG images and non-CSS contexts. Keep in sync with tokens.css */

export const colors = {
  light: {
    bg: "#F3F5F7",
    floor: "#E3E7EB",
    surf: "#FFFFFF",
    line: "#C5CCD4",
    ink: "#0F1B2D",
    steel: "#556171",
    red: "#C9331C",
    redHover: "#B02A16",
    onRed: "#FFFFFF",
  },
  dark: {
    bg: "#0E141C",
    floor: "#17202B",
    surf: "#131B25",
    line: "#2B3745",
    ink: "#E9EEF3",
    steel: "#9AA7B5",
    red: "#C9331C",
    redHover: "#B02A16",
    onRed: "#FFFFFF",
  },
} as const;

export const motion = {
  durFast: 120,
  durBase: 200,
  durSlow: 400,
  durSignature: 1100,
  easeStandard: "cubic-bezier(0.2, 0, 0, 1)",
  easeEmphasized: "cubic-bezier(0.16, 1, 0.3, 1)",
} as const;

export const layout = {
  container: 1200,
  space: [4, 8, 16, 24, 48, 96] as const,
  radiusControl: 6,
  radiusChip: 20,
} as const;
