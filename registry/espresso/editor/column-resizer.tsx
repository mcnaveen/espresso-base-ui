"use client"

// Notion's column bar, ported from the branch's RteColumnResizer. In the
// gap between two columns a bar stands under the pointer — on the hairline
// of a text row, in the middle of a picture row's gutter — and dragging it
// gives one column what it takes from the other; the rest of the row keeps
// its shares. The shares are kept on the row (`widths`, extensions.tsx) so
// a row drawn again, or reloaded, keeps its proportions, and a row
// re-counted starts equal again.
import * as React from "react"
import { createPortal } from "react-dom"
import type { Editor as TiptapEditor } from "@tiptap/core"

import { cn } from "@/lib/utils"

import { SMOOTH_SKIP } from "./extensions"
import { pressHandlers, type PressEvent } from "./press"

/** no column goes under this share of its row */
const MIN_SHARE = 0.1
/** how far either side of the gap the bar still answers */
const REACH = 6
/** how near a resting place the bar has to come to settle on it, in px */
const SNAP = 10
/** the row's even splits a boundary settles on */
const SPLITS = [1 / 4, 1 / 3, 1 / 2, 2 / 3, 3 / 4]
/** how quickly the row catches the boundary up, in ms: a time constant */
const EASE = 40

interface Gap {
  row: HTMLElement
  cells: HTMLElement[]
  /** the gap after this cell */
  index: number
  /** where the bar stands */
  x: number
  /** the span the bar answers in, which the press zone covers */
  from: number
  to: number
}

export function ColumnResizer({ editor }: { editor: TiptapEditor }) {
  const [bar, setBar] = React.useState<{
    left: number
    top: number
    height: number
    /** the press zone: wherever the bar shows, a press takes it */
    from: number
    to: number
  } | null>(null)
  const [dragging, setDragging] = React.useState(false)
  /** the bar rests on one of the row's even splits */
  const [snapped, setSnapped] = React.useState(false)
  const hit = React.useRef<Gap | null>(null)
  const draggingRef = React.useRef(false)
  draggingRef.current = dragging
  const [mounted, setMounted] = React.useState(false)
  React.useEffect(() => setMounted(true), [])

  /** the gap under the pointer, in any row of columns */
  const gapAt = React.useCallback(
    (x: number, y: number): Gap | null => {
      if (editor.isDestroyed || !editor.isEditable) return null
      const rows = editor.view.dom.querySelectorAll<HTMLElement>(
        '[data-type="columns"]'
      )
      for (const row of rows) {
        const r = row.getBoundingClientRect()
        if (y < r.top || y >= r.bottom || x < r.left || x > r.right) continue
        const cells = [...row.children].filter(
          (c): c is HTMLElement => c instanceof HTMLElement
        )
        for (let i = 0; i < cells.length - 1; i++) {
          const a = cells[i].getBoundingClientRect()
          const b = cells[i + 1].getBoundingClientRect()
          // stacked, on a narrow page: no gap to take hold of
          if (b.left <= a.right) continue
          if (x < a.right - REACH || x > b.left + REACH) continue
          // the bar stands in the middle of the gap: on a text row's
          // hairline, and where a picture row's would be
          const at = (a.right + b.left) / 2
          return {
            row,
            cells,
            index: i,
            x: at,
            from: a.right - REACH,
            to: b.left + REACH,
          }
        }
      }
      return null
    },
    [editor]
  )

  React.useEffect(() => {
    const onMove = (e: MouseEvent) => {
      if (draggingRef.current) return
      // a picture's own resize pill, a block's grip in the gap, or a
      // picture resize under way, is no column gap: the bar would stand
      // beside the pill or the grip and read as theirs
      const onPill =
        e.target instanceof Element &&
        !!e.target.closest('[aria-label^="Resize media"], .rte-bh-handle')
      if (onPill || document.body.classList.contains("rte-media-resizing")) {
        hit.current = null
        setBar(null)
        return
      }
      const gap = gapAt(e.clientX, e.clientY)
      hit.current = gap
      if (!gap) {
        setBar(null)
        return
      }
      const r = gap.row.getBoundingClientRect()
      setBar({
        left: gap.x,
        top: r.top,
        height: r.height,
        from: gap.from,
        to: gap.to,
      })
    }
    const hide = () => {
      if (!draggingRef.current) setBar(null)
    }
    document.addEventListener("mousemove", onMove, true)
    document.addEventListener("scroll", hide, true)
    document.addEventListener("mouseleave", hide)
    return () => {
      document.removeEventListener("mousemove", onMove, true)
      document.removeEventListener("scroll", hide, true)
      document.removeEventListener("mouseleave", hide)
    }
  }, [gapAt])

  /** the position of the row's node, by the element the view draws it with */
  const posOf = (row: HTMLElement): number | null => {
    if (editor.isDestroyed) return null
    let found: number | null = null
    editor.state.doc.descendants((node, pos) => {
      if (found !== null) return false
      if (node.type.name === "columns" && editor.view.nodeDOM(pos) === row)
        found = pos
      return found === null
    })
    return found
  }

  const onDown = (e: PressEvent<HTMLDivElement>) => {
    const gap = hit.current
    if (!gap || e.button !== 0 || editor.isDestroyed) return
    const pos = posOf(gap.row)
    if (pos === null) return
    e.preventDefault()
    const { index } = gap
    const start = gap.cells.map((c) => c.getBoundingClientRect().width)
    const total = start.reduce((sum, w) => sum + w, 0)
    const pair = start[index] + start[index + 1]
    const floor = total * MIN_SHARE
    const x0 = e.clientX
    const original =
      (editor.state.doc.nodeAt(pos)?.attrs.widths as number[] | null) ?? null
    let shares = start.map((w) => w / total)

    // The places the boundary settles on, as the width of the column before
    // it: the row cut in quarters or thirds, the two columns even, and
    // either one as wide as another column of the row, so a row of three
    // can be put back even by eye.
    const before = start.slice(0, index).reduce((sum, w) => sum + w, 0)
    const rests = [
      ...SPLITS.map((f) => total * f - before),
      pair / 2,
      ...start.flatMap((w, i) =>
        i === index || i === index + 1 ? [] : [w, pair - w]
      ),
    ].filter((w) => w >= floor && w <= pair - floor)
    const settle = (w: number) => {
      let best: number | null = null
      for (const r of rests) {
        const off = Math.abs(r - w)
        if (off <= SNAP && (best === null || off < Math.abs(best - w))) best = r
      }
      return best
    }

    // The shares go through the document, never onto the row's element: an
    // inline style written there is a mutation ProseMirror answers by
    // drawing the node again. On release the row is put back as it began
    // and the drag written as one step, so one undo takes the whole of it.
    const write = (widths: number[] | null, record: boolean) => {
      if (editor.isDestroyed) return
      const node = editor.state.doc.nodeAt(pos)
      if (!node || node.type.name !== "columns") return
      const tr = editor.state.tr.setNodeMarkup(pos, undefined, {
        ...node.attrs,
        widths,
      })
      tr.setMeta(SMOOTH_SKIP, true)
      if (!record) tr.setMeta("addToHistory", false)
      editor.view.dispatch(tr)
    }

    setDragging(true)
    draggingRef.current = true
    document.body.classList.add("rte-col-drag")

    // The pointer sets where the boundary is headed; the row eases there a
    // frame at a time, so a snap, and the text wrapping again with it,
    // glides over instead of jumping. Each frame closes the same part of
    // what is left whatever the frame rate.
    const still = window.matchMedia("(prefers-reduced-motion: reduce)").matches
    let target = start[index]
    let shown = start[index]
    let last = 0
    let frame = 0
    let released = false
    const draw = (a: number) => {
      const next = start.slice()
      next[index] = a
      next[index + 1] = pair - a
      shares = next.map((w) => w / total)
      write(shares, false)
      // the row is drawn anew with each share: the bar follows the
      // boundary the new drawing puts down
      const row = editor.view.nodeDOM(pos)
      if (!(row instanceof HTMLElement)) return
      const cells = [...row.children].filter(
        (c): c is HTMLElement => c instanceof HTMLElement
      )
      const ra = cells[index]?.getBoundingClientRect()
      const rb = cells[index + 1]?.getBoundingClientRect()
      // the text wraps again as the columns change: the bar grows and
      // shrinks with the row, as the hairline does
      const rr = row.getBoundingClientRect()
      if (ra && rb)
        setBar((b) =>
          b
            ? {
                ...b,
                top: rr.top,
                height: rr.height,
                left: (ra.right + rb.left) / 2,
                from: ra.right - REACH,
                to: rb.left + REACH,
              }
            : b
        )
    }
    const step = (now: number) => {
      frame = 0
      const dt = last ? Math.min(now - last, 64) : 16
      last = now
      const left = target - shown
      shown =
        still || Math.abs(left) < 0.3
          ? target
          : shown + left * (1 - Math.exp(-dt / EASE))
      draw(shown)
      if (shown !== target) frame = requestAnimationFrame(step)
      else if (released) finish()
      else last = 0
    }
    const move = (ev: PointerEvent) => {
      const dx = ev.clientX - x0
      const free = Math.min(Math.max(start[index] + dx, floor), pair - floor)
      const rest = settle(free)
      target = rest ?? free
      setSnapped(rest !== null)
      if (!frame) frame = requestAnimationFrame(step)
    }
    const up = () => {
      window.removeEventListener("pointermove", move)
      window.removeEventListener("pointerup", up)
      window.removeEventListener("pointercancel", up)
      released = true
      // the row lands where it was headed before the drag is written down
      if (!frame) finish()
    }
    const finish = () => {
      document.body.classList.remove("rte-col-drag")
      setDragging(false)
      setSnapped(false)
      draggingRef.current = false
      write(original, false)
      write(shares, true)
      hit.current = null
      setBar(null)
    }
    // the window follows the pointer: a press WebKit started without a
    // pointerdown can take no capture
    window.addEventListener("pointermove", move)
    window.addEventListener("pointerup", up)
    window.addEventListener("pointercancel", up)
  }

  if (!mounted || (!bar && !dragging)) return null
  // the zone spans the whole reach the bar answers in, so a press wherever
  // the bar is showing takes it; the bar itself stays on its boundary
  const zone = bar
    ? {
        left: Math.min(bar.from, bar.left - 6),
        width: Math.max(bar.to, bar.left + 6) - Math.min(bar.from, bar.left - 6),
      }
    : null
  return createPortal(
    <div
      className={cn("rte-cr", dragging && "is-dragging", snapped && "is-snapped")}
      style={
        bar && zone
          ? {
              left: zone.left,
              width: zone.width,
              marginLeft: 0,
              justifyContent: "flex-start",
              top: bar.top,
              height: bar.height,
            }
          : undefined
      }
      aria-hidden="true"
      {...pressHandlers(onDown)}
    >
      <div
        className="rte-cr-bar"
        style={bar && zone ? { marginLeft: bar.left - zone.left - 1.5 } : undefined}
      />
    </div>,
    document.body
  )
}
