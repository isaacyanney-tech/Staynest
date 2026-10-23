// Brand colours administrators may choose from. Each option carries the hover
// and tint shades plus a text-safe ink colour, so swapping colours can never
// produce unreadable text. Contrast ratios are checked in theme.test.ts.
export const PRIMARY_OPTIONS = {
  "#173B57": { label: "Harbour navy (default)", hover: "#0F2C42", soft: "#E8EEF3" },
  "#1E3A5F": { label: "Deep blue", hover: "#152B47", soft: "#E9EEF5" },
  "#24343F": { label: "Slate", hover: "#18242C", soft: "#EBEEF0" },
  "#0B4F4A": { label: "Forest teal", hover: "#073934", soft: "#E6F0EF" },
} as const;

export const SECONDARY_OPTIONS = {
  "#18A999": { label: "Lagoon teal (default)", ink: "#0F7A6E", soft: "#E3F5F2" },
  "#2A9D8F": { label: "Sea green", ink: "#1E7268", soft: "#E5F3F1" },
  "#E0A100": { label: "Sunrise amber", ink: "#8A6200", soft: "#FDF4DC" },
  "#D9653B": { label: "Terracotta", ink: "#A3431F", soft: "#FBEBE4" },
} as const;

export type PrimaryColor = keyof typeof PRIMARY_OPTIONS;
export type SecondaryColor = keyof typeof SECONDARY_OPTIONS;

export const DEFAULT_THEME = { primary: "#173B57", secondary: "#18A999" } as const;

export function isPrimaryColor(value: unknown): value is PrimaryColor {
  return typeof value === "string" && value in PRIMARY_OPTIONS;
}

export function isSecondaryColor(value: unknown): value is SecondaryColor {
  return typeof value === "string" && value in SECONDARY_OPTIONS;
}

/** CSS custom properties for a stored theme; unknown values fall back to defaults. */
export function themeToCssVars(theme: unknown): Record<string, string> {
  const t = (theme ?? {}) as { primary?: unknown; secondary?: unknown };
  const primary = isPrimaryColor(t.primary) ? t.primary : DEFAULT_THEME.primary;
  const secondary = isSecondaryColor(t.secondary) ? t.secondary : DEFAULT_THEME.secondary;
  const p = PRIMARY_OPTIONS[primary];
  const s = SECONDARY_OPTIONS[secondary];
  return {
    "--brand-primary": primary,
    "--brand-primary-hover": p.hover,
    "--brand-primary-soft": p.soft,
    "--brand-secondary": secondary,
    "--brand-secondary-ink": s.ink,
    "--brand-secondary-soft": s.soft,
  };
}

// WCAG relative luminance and contrast, used by tests and the admin preview.
export function contrastRatio(a: string, b: string): number {
  const lum = (hex: string) => {
    const n = hex.replace("#", "");
    const [r, g, bl] = [0, 2, 4].map((i) => {
      const c = parseInt(n.slice(i, i + 2), 16) / 255;
      return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
    });
    return 0.2126 * r + 0.7152 * g + 0.0722 * bl;
  };
  const [hi, lo] = [lum(a), lum(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}
