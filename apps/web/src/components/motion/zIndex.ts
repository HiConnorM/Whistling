/**
 * Systemic z-index scale. Use these named layers only; never spam arbitrary
 * z-10 / z-50 in components.
 */
export const Z = {
  base: 0,
  raised: 10,
  sticky: 30,
  nav: 50,
  overlay: 60,
  grain: 70,
} as const

export type ZLayer = keyof typeof Z
