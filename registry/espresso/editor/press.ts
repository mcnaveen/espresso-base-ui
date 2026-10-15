import type * as React from "react"

/**
 * Press handlers for the editor's own controls (the column bar, the table
 * grips, the picture pills, the block grip). WebKit loses one pointerdown:
 * the first press after a native drag-and-drop arrives as a mousedown with
 * no pointerdown before it, though the pointer still moves and lifts as
 * usual. A control started on pointerdown alone would ignore that press,
 * so `start` runs from whichever comes, once per press.
 */
let lastPointerDown = Number.NEGATIVE_INFINITY

export type PressEvent<E extends Element = Element> =
  | React.PointerEvent<E>
  | React.MouseEvent<E>

/** the pointer a press belongs to; -1 when it came without one */
export const pressPointerId = (e: PressEvent): number =>
  "pointerId" in e ? e.pointerId : -1

export function pressHandlers<E extends Element>(
  start: (e: PressEvent<E>) => void
) {
  return {
    onPointerDown: (e: React.PointerEvent<E>) => {
      lastPointerDown = e.timeStamp
      start(e)
    },
    onMouseDown: (e: React.MouseEvent<E>) => {
      // the press a pointerdown already started
      if (e.timeStamp - lastPointerDown < 500) return
      start(e)
    },
  }
}
