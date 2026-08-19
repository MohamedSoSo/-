"use client";

import { MotionConfig } from "framer-motion";
import type { ReactNode } from "react";

/**
 * Manual `useReducedMotion()` conditionals on `initial`/variants race with
 * the hook's first-render resolution (it starts false/null for SSR safety
 * and only corrects via an effect) — confirmed empirically: hero content
 * still fully animated in under emulated prefers-reduced-motion before
 * this fix. `reducedMotion="user"` disables transform/opacity animation at
 * framer-motion's own engine level instead, which is the documented,
 * race-free way to honor the OS setting.
 */
export function MotionProvider({ children }: { children: ReactNode }) {
  return <MotionConfig reducedMotion="user">{children}</MotionConfig>;
}
