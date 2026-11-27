import React from 'react';

const recentTouchStamp = new WeakMap<EventTarget, number>();

export interface MultiTouchTapOptions {
  disabled?: boolean;
  stopPropagation?: boolean;
}

/**
 * Multi-touch friendly tap handler:
 * - On touch/pen (`pointerType !== 'mouse'`), triggers immediately on `pointerDown`
 *   so secondary fingers tap spells, map, jump, dash, or menus reliably while a
 *   primary finger holds the virtual joystick.
 * - Suppresses the follow-up synthesized `click` within 700ms so actions never
 *   double-fire, while preserving normal `onClick` for mouse & keyboard accessibility.
 */
export function multiTouchTap<T extends HTMLElement = HTMLElement>(
  action?: (() => void) | ((e: React.SyntheticEvent<T>) => void),
  options?: MultiTouchTapOptions
): {
  onPointerDown: (e: React.PointerEvent<T>) => void;
  onClick: (e: React.MouseEvent<T>) => void;
} {
  const stopProp = options?.stopPropagation !== false;
  return {
    onPointerDown: (e: React.PointerEvent<T>) => {
      if (stopProp) e.stopPropagation();
      if (options?.disabled || !action) return;
      if (e.pointerType !== 'mouse') {
        recentTouchStamp.set(e.currentTarget, performance.now());
        action(e);
      }
    },
    onClick: (e: React.MouseEvent<T>) => {
      if (stopProp) e.stopPropagation();
      if (options?.disabled || !action) return;
      const last = recentTouchStamp.get(e.currentTarget) ?? 0;
      if (performance.now() - last < 700) {
        return;
      }
      action(e);
    },
  };
}
