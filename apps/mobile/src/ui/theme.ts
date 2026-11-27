import {
  fontSize,
  fontWeight,
  lightPalette,
  MAX_FONT_SCALE,
  minTouchTarget,
  space,
} from '@muslim-give/ui-tokens';

/** Launch ships light only (spec 6.5); the hook is where dark mode will switch palettes. */
export function useTheme() {
  return {
    colors: lightPalette,
    space,
    fontSize,
    fontWeight,
    maxFontScale: MAX_FONT_SCALE,
    minTouchTarget,
  };
}
