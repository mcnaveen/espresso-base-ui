"use client"

/**
 * The page's own drag systems over the Event calendar — a port of the frappe
 * espresso playground's `useDragToCreate`: drag a span of hours or days open,
 * the card-in-hand that replaces the browser's drag picture, and pulling a
 * month bar's edge.
 */
import * as React from "react"

export interface CalendarDraft {
  fromDate: string
  toDate: string
  fromTime: string
  toTime: string
  allDay: boolean
}

export interface DragBand {
  left: number
  top: number
  width: number
  height: number
}

const pad = (n: number) => String(n).padStart(2, "0")

const isoDay = (attr: string) => {
  const d = new Date(attr)
  return Number.isNaN(d.getTime())
    ? ""
    : `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}
const hhmm = (minutes: number) =>
  `${pad(Math.floor(minutes / 60) % 24)}:${pad(minutes % 60)}`

/* ── Drag a span of time open (Week and Day) ─────────────────────────────── */

export function useDragToCreate(
  root: React.RefObject<HTMLElement | null>,
  hourHeight: number,
  onDone: (draft: CalendarDraft) => void,
  enabled = true
) {
  const [band, setBand] = React.useState<DragBand | null>(null)
  const onDoneRef = React.useRef(onDone)
  onDoneRef.current = onDone

  React.useEffect(() => {
    const el = root.current
    if (!el) return

    const SNAP = 30
    let active = false
    let startDate = ""
    let startMin = 0
    let startCol: HTMLElement | null = null
    let grid: HTMLElement | null = null

    const columns = () =>
      grid ? [...grid.querySelectorAll<HTMLElement>("[data-time-grid]")] : []

    function dateOf(col: HTMLElement) {
      const attr =
        col.getAttribute("data-date-attr") ??
        col.closest("[data-date-attr]")?.getAttribute("data-date-attr") ??
        root.current
          ?.querySelector("[data-date-attr]")
          ?.getAttribute("data-date-attr")
      return isoDay(String(attr ?? ""))
    }

    function read(e: PointerEvent) {
      const cols = columns()
      if (!cols.length) return null
      let col = cols.find((c) => {
        const r = c.getBoundingClientRect()
        return e.clientX >= r.left && e.clientX < r.right
      })
      if (!col) {
        col =
          e.clientX < cols[0].getBoundingClientRect().left
            ? cols[0]
            : cols[cols.length - 1]
      }
      const r = col.getBoundingClientRect()
      const minutes = ((e.clientY - r.top) / hourHeight) * 60
      const snapped = Math.max(
        0,
        Math.min(24 * 60, Math.round(minutes / SNAP) * SNAP)
      )
      return { date: dateOf(col), minutes: snapped, rect: r, col }
    }

    type At = ReturnType<typeof read>

    function paint(a: At, b: At) {
      if (!a || !b || !grid) return
      const gridTop = grid.getBoundingClientRect().top
      const left = Math.min(a.rect.left, b.rect.left)
      const right = Math.max(a.rect.right, b.rect.right)
      const top = gridTop + (Math.min(a.minutes, b.minutes) / 60) * hourHeight
      const bottom =
        gridTop + (Math.max(a.minutes, b.minutes) / 60) * hourHeight
      setBand({
        left,
        top,
        width: right - left,
        height: Math.max(bottom - top, 2),
      })
    }

    function onPointerMove(e: PointerEvent) {
      if (!active || !startCol) return
      const at = read(e)
      if (!at) return
      const rect = startCol.getBoundingClientRect()
      paint(
        { date: startDate, minutes: startMin, rect, col: startCol },
        { ...at, date: startDate, rect, col: startCol }
      )
    }

    function onPointerUp(e: PointerEvent) {
      window.removeEventListener("pointermove", onPointerMove)
      if (!active) return
      active = false
      setBand(null)
      const at = read(e)
      if (!at) return
      let [a, b] =
        at.minutes < startMin ? [at.minutes, startMin] : [startMin, at.minutes]
      if (a === b) b = a + 60
      onDoneRef.current({
        fromDate: startDate,
        toDate: startDate,
        fromTime: hhmm(a),
        toTime: hhmm(Math.min(b, 24 * 60)),
        allDay: false,
      })
    }

    function onPointerDown(e: PointerEvent) {
      if (e.button !== 0) return
      const target = e.target as HTMLElement
      if (
        target.closest("[data-slot=calendar-event], .event") ||
        target.classList.contains("cursor-ns-resize") ||
        target.closest(".cursor-ns-resize, .cursor-move, [draggable=true]")
      )
        return
      grid =
        target.closest<HTMLElement>("[data-time-grid]")?.parentElement ?? null
      if (!grid) return
      const at = read(e)
      if (!at) return
      active = true
      startDate = at.date
      startMin = at.minutes
      startCol = at.col
      paint(at, at)
      window.addEventListener("pointermove", onPointerMove)
      window.addEventListener("pointerup", onPointerUp, { once: true })
    }

    el.addEventListener("pointerdown", onPointerDown)
    return () => {
      el.removeEventListener("pointerdown", onPointerDown)
      window.removeEventListener("pointermove", onPointerMove)
    }
  }, [root, hourHeight, enabled])

  return band
}

/* ── Drag a span of days open (Month) ────────────────────────────────────── */

export function useMonthDragToCreate(
  root: React.RefObject<HTMLElement | null>,
  onDone: (draft: CalendarDraft) => void,
  enabled = true
) {
  const [bands, setBands] = React.useState<DragBand[]>([])
  const onDoneRef = React.useRef(onDone)
  onDoneRef.current = onDone

  React.useEffect(() => {
    const el = root.current
    if (!el) return

    const CARD_INSET = 4
    const DATE_ROW = 28
    const CARD_HEIGHT = 24

    let active = false
    let startIso = ""
    let marked: string[] = []

    const cellsOf = (row: HTMLElement) => [...row.children] as HTMLElement[]

    function dayOf(cell: HTMLElement): string {
      const row = cell.closest<HTMLElement>("[data-week-row]")
      const key = row?.getAttribute("data-strip-date")
      if (!row || !key) return ""
      const start = new Date(key)
      if (Number.isNaN(start.getTime())) return ""
      const col = cellsOf(row).indexOf(cell)
      if (col < 0) return ""
      const d = new Date(start)
      d.setDate(d.getDate() + col)
      return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
    }

    const cellAt = (e: PointerEvent) => {
      const under = document.elementFromPoint(
        e.clientX,
        e.clientY
      ) as HTMLElement | null
      const row = under?.closest<HTMLElement>("[data-week-row]")
      if (!row) return null
      return cellsOf(row).find((c) => c.contains(under!)) ?? null
    }

    function span(a: string, b: string) {
      const [from, to] = a <= b ? [a, b] : [b, a]
      const out: string[] = []
      const d = new Date(from)
      const end = new Date(to)
      while (d <= end) {
        out.push(`${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`)
        d.setDate(d.getDate() + 1)
      }
      return out
    }

    function paintBands(days: string[]) {
      const host = root.current
      if (!host || !days.length) {
        setBands([])
        return
      }
      const out: DragBand[] = []
      for (const row of host.querySelectorAll<HTMLElement>("[data-week-row]")) {
        const hits = cellsOf(row).filter((c) => days.includes(dayOf(c)))
        if (!hits.length) continue
        const first = hits[0].getBoundingClientRect()
        const last = hits[hits.length - 1].getBoundingClientRect()
        out.push({
          left: first.left + CARD_INSET,
          top: first.top + DATE_ROW,
          width: last.right - first.left - CARD_INSET * 2,
          height: CARD_HEIGHT,
        })
      }
      setBands(out)
    }

    function onPointerMove(e: PointerEvent) {
      if (!active) return
      const cell = cellAt(e)
      const iso = cell ? dayOf(cell) : ""
      if (!iso) return
      marked = span(startIso, iso)
      paintBands(marked)
    }

    function onPointerUp() {
      window.removeEventListener("pointermove", onPointerMove)
      if (!active) return
      active = false
      const days = marked
      marked = []
      paintBands([])
      if (!days.length) return
      onDoneRef.current({
        fromDate: days[0],
        toDate: days[days.length - 1],
        fromTime: "09:00",
        toTime: "10:00",
        allDay: false,
      })
    }

    function onPointerDown(e: PointerEvent) {
      if (e.button !== 0) return
      const target = e.target as HTMLElement
      if (target.closest("[data-slot=calendar-event], .event, button")) return
      const cell = cellAt(e)
      if (!cell) return
      const iso = dayOf(cell)
      if (!iso) return
      active = true
      startIso = iso
      marked = [iso]
      paintBands(marked)
      window.addEventListener("pointermove", onPointerMove)
      window.addEventListener("pointerup", onPointerUp, { once: true })
    }

    el.addEventListener("pointerdown", onPointerDown)
    return () => {
      el.removeEventListener("pointerdown", onPointerDown)
      window.removeEventListener("pointermove", onPointerMove)
    }
  }, [root, enabled])

  return bands
}

/* ── Holding a pill out of sight while its copy lands ────────────────────── */

const HELD = "data-landing"
function hold(el: HTMLElement) {
  el.setAttribute(HELD, "")
}
function release(root: ParentNode, ...more: HTMLElement[]) {
  const els = [...root.querySelectorAll<HTMLElement>(`[${HELD}]`), ...more]
  for (const el of els) el.setAttribute(HELD, "done")
  requestAnimationFrame(() => {
    for (const el of els) el.removeAttribute(HELD)
  })
}

export interface CardCopy {
  html: string
  rect: DragBand
}

/* ── The three parts of a card being moved in Week or Day view ───────────── */

export function useDragShadow(root: React.RefObject<HTMLElement | null>, enabled = true) {
  const [ghost, setGhost] = React.useState<CardCopy | null>(null)
  const [slot, setSlot] = React.useState<DragBand | null>(null)
  const [carrying, setCarrying] = React.useState<CardCopy | null>(null)
  const [landing, setLanding] = React.useState(false)

  React.useEffect(() => {
    const el = root.current
    if (!el) return

    let watching: HTMLElement | null = null
    let origin: DragBand | null = null
    let grabX = 0
    let grabY = 0
    let scroller: HTMLElement | null = null
    let scrolledFrom = 0
    let lastSlot: DragBand | null = null
    let hasCopy = false

    function rectOf(node: HTMLElement): DragBand {
      const r = node.getBoundingClientRect()
      return { left: r.left, top: r.top, width: r.width, height: r.height }
    }

    function scrollerOf(node: HTMLElement) {
      let n: HTMLElement | null = node
      while (n && n !== document.body) {
        if (n.scrollHeight > n.clientHeight + 1) return n
        n = n.parentElement
      }
      return null
    }

    function markupOf(node: HTMLElement) {
      return node.outerHTML.replace(/cursor:\s*grabbing/g, "cursor: grab")
    }

    function onFirstMove(e: PointerEvent) {
      window.removeEventListener("pointermove", onFirstMove)
      if (!watching || !origin) return
      const html = markupOf(watching)
      hasCopy = true
      setGhost({ html, rect: origin })
      lastSlot = origin
      setSlot(origin)
      setCarrying({
        html,
        rect: { ...origin, left: e.clientX - grabX, top: e.clientY - grabY },
      })
      window.addEventListener("pointermove", onMove)
    }

    function onMove(e: PointerEvent) {
      if (!watching || !origin) return
      // The blank slot sits where the component has snapped the pill to —
      // read on the next frame, after the component has moved it.
      const held = watching
      requestAnimationFrame(() => {
        if (watching === held && held) {
          lastSlot = rectOf(held)
          setSlot(lastSlot)
        }
      })
      const drift = (scroller?.scrollTop ?? 0) - scrolledFrom
      // Captured now: the state updater runs after this handler, and the
      // drop may have cleared `origin` by then.
      const from = origin
      setGhost((g) =>
        g ? { ...g, rect: { ...from, top: from.top - drift } } : g
      )
      setCarrying((c) =>
        c
          ? {
              ...c,
              rect: {
                ...c.rect,
                left: e.clientX - grabX,
                top: e.clientY - grabY,
              },
            }
          : c
      )
    }

    const LANDING = 180

    function landedIn(name: string, near: DragBand): HTMLElement | null {
      const box = root.current
      if (!box) return null
      let best: HTMLElement | null = null
      let closest = Infinity
      for (const node of box.querySelectorAll<HTMLElement>(".event")) {
        if ((node.textContent?.trim() ?? "") !== name) continue
        const r = node.getBoundingClientRect()
        const off = Math.abs(r.top - near.top) + Math.abs(r.left - near.left)
        if (off < closest) {
          closest = off
          best = node
        }
      }
      return best
    }

    function onUp() {
      window.removeEventListener("pointermove", onFirstMove)
      window.removeEventListener("pointermove", onMove)
      const held = watching
      const to = lastSlot
      const copied = hasCopy
      watching = null
      origin = null
      scroller = null
      lastSlot = null
      hasCopy = false
      setGhost(null)
      setSlot(null)

      if (!held || !to || !copied) {
        setCarrying(null)
        return
      }
      setLanding(true)
      const name = held.textContent?.trim() ?? ""
      hold(held)

      let started = 0
      const step = () => {
        const landed = landedIn(name, to)
        if (landed) hold(landed)
        if (!started) {
          started = performance.now()
          const dest = landed ? rectOf(landed) : to
          setCarrying((c) => (c ? { ...c, rect: dest } : c))
          requestAnimationFrame(step)
          return
        }
        if (performance.now() - started < LANDING + 16) {
          requestAnimationFrame(step)
          return
        }
        setCarrying(null)
        setLanding(false)
        release(root.current ?? document, held)
      }
      requestAnimationFrame(step)
    }

    function onPointerDown(e: PointerEvent) {
      const target = e.target as HTMLElement
      const pill = target.closest<HTMLElement>(".event")
      if (!pill || target.closest(".cursor-ns-resize")) return
      if (pill.closest("[data-week-row]")) return
      if (pill.closest(".calendar-row")) return
      watching = pill
      origin = rectOf(pill)
      grabX = e.clientX - origin.left
      grabY = e.clientY - origin.top
      scroller = scrollerOf(pill)
      scrolledFrom = scroller?.scrollTop ?? 0
      window.addEventListener("pointermove", onFirstMove)
      window.addEventListener("pointerup", onUp, { once: true })
    }

    el.addEventListener("pointerdown", onPointerDown)
    return () => {
      el.removeEventListener("pointerdown", onPointerDown)
      window.removeEventListener("pointermove", onFirstMove)
      window.removeEventListener("pointermove", onMove)
    }
  }, [root, enabled])

  return { ghost, slot, carrying, landing }
}

/* ── The month view's own card-in-hand ───────────────────────────────────── */

export function useMonthDragSkeleton(root: React.RefObject<HTMLElement | null>, enabled = true) {
  const [slot, setSlot] = React.useState<DragBand | null>(null)
  const [carrying, setCarrying] = React.useState<CardCopy | null>(null)
  const [landing, setLanding] = React.useState(false)

  React.useEffect(() => {
    const el = root.current
    if (!el) return

    let size: { width: number; height: number } | null = null
    let grabX = 0
    let grabY = 0
    let lane = 0
    let name = ""
    let lastSlot: DragBand | null = null
    let isLanding = false

    let blank: HTMLImageElement | null = null
    function blankImage() {
      if (blank) return blank
      blank = new Image()
      blank.src =
        "data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7"
      blank.style.cssText =
        "position:fixed;top:0;left:-10px;width:1px;height:1px;pointer-events:none"
      document.body.appendChild(blank)
      return blank
    }

    function markupOf(bar: HTMLElement) {
      const copy = bar.cloneNode(true) as HTMLElement
      copy.classList.remove("absolute", "opacity-40", "opacity-50")
      copy.style.position = "static"
      copy.style.left = ""
      copy.style.top = ""
      copy.style.width = "100%"
      copy.style.height = "100%"
      return copy.outerHTML
    }

    function rectOf(node: HTMLElement): DragBand {
      const r = node.getBoundingClientRect()
      return { left: r.left, top: r.top, width: r.width, height: r.height }
    }

    function onDragStart(e: DragEvent) {
      const bar = (e.target as HTMLElement)?.closest<HTMLElement>(".event")
      if (!bar) return
      const r = bar.getBoundingClientRect()
      const row = bar.closest<HTMLElement>("[data-week-row]")
      size = { width: r.width, height: r.height }
      grabX = e.clientX - r.left
      grabY = e.clientY - r.top
      lane = row ? r.top - row.getBoundingClientRect().top : 0
      name = bar.textContent?.trim() ?? ""
      e.dataTransfer?.setDragImage(blankImage(), 0, 0)
      const html = markupOf(bar)
      setCarrying({
        html,
        rect: { left: r.left, top: r.top, width: r.width, height: r.height },
      })
    }

    function onDragOver(e: DragEvent) {
      if (!size) return
      setCarrying((c) =>
        c
          ? {
              ...c,
              rect: {
                ...c.rect,
                left: e.clientX - grabX,
                top: e.clientY - grabY,
              },
            }
          : c
      )
      const row = (e.target as HTMLElement)?.closest<HTMLElement>(
        "[data-week-row]"
      )
      if (!row) {
        lastSlot = null
        setSlot(null)
        return
      }
      const rowRect = row.getBoundingClientRect()
      const cell = rowRect.width / 7
      const col = Math.round((e.clientX - grabX - rowRect.left) / cell)
      const left = rowRect.left + Math.min(Math.max(col, 0), 6) * cell
      lastSlot = {
        left,
        top: rowRect.top + lane,
        width: Math.min(size.width, rowRect.right - left),
        height: size.height,
      }
      setSlot(lastSlot)
    }

    const LANDING = 180

    function landedAt(cx: number, cy: number, hint: DragBand) {
      const row = document
        .elementFromPoint(cx, cy)
        ?.closest<HTMLElement>("[data-week-row]")
      if (!row) return null
      let best: HTMLElement | null = null
      let closest = Infinity
      for (const node of row.querySelectorAll<HTMLElement>(".event")) {
        if (node.textContent?.trim() !== name) continue
        const r = node.getBoundingClientRect()
        if (cx < r.left - 2 || cx > r.right + 2) continue
        const off = Math.abs(r.top - hint.top)
        if (off < closest) {
          closest = off
          best = node
        }
      }
      return best
    }

    function fly(cx: number, cy: number, hint: DragBand, width: number) {
      isLanding = true
      setLanding(true)
      let started = 0
      const step = () => {
        const landed = landedAt(cx, cy, hint)
        if (landed) hold(landed)
        if (!started) {
          started = performance.now()
          const to = landed ? rectOf(landed) : hint
          setCarrying((c) => (c ? { ...c, rect: { ...to, width } } : c))
          requestAnimationFrame(step)
          return
        }
        if (performance.now() - started < LANDING + 16) {
          requestAnimationFrame(step)
          return
        }
        setCarrying(null)
        isLanding = false
        setLanding(false)
        release(root.current ?? document)
      }
      requestAnimationFrame(step)
    }

    function onDrop(e: DragEvent) {
      const hint = lastSlot
      const cx = e.clientX
      const cy = e.clientY
      lastSlot = null
      setSlot(null)
      const width = size?.width ?? 0
      size = null
      if (hint) {
        setCarrying((c) => {
          if (c) fly(cx, cy, hint, width || c.rect.width)
          return c
        })
      } else {
        setCarrying(null)
        setLanding(false)
      }
    }

    function onDragEnd() {
      size = null
      lastSlot = null
      setSlot(null)
      if (!isLanding) setCarrying(null)
    }

    el.addEventListener("dragstart", onDragStart)
    el.addEventListener("dragover", onDragOver)
    el.addEventListener("drop", onDrop)
    el.addEventListener("dragend", onDragEnd)
    return () => {
      el.removeEventListener("dragstart", onDragStart)
      el.removeEventListener("dragover", onDragOver)
      el.removeEventListener("drop", onDrop)
      el.removeEventListener("dragend", onDragEnd)
    }
  }, [root, enabled])

  return { slot, carrying, landing }
}

/* ── Pulling a month bar's edge ──────────────────────────────────────────── */

export type MonthEdge = "start" | "end"

export interface MonthResize {
  title: string
  from: string
  to: string
  edge: MonthEdge
  date: string
}

export function useMonthResize(
  root: React.RefObject<HTMLElement | null>,
  onResize: (r: MonthResize) => void,
  enabled = true
) {
  const onResizeRef = React.useRef(onResize)
  onResizeRef.current = onResize

  React.useEffect(() => {
    const el = root.current
    if (!el) return

    const EDGE = 7
    let armed: { bar: HTMLElement; edge: MonthEdge } | null = null
    let pulling: {
      title: string
      from: string
      to: string
      edge: MonthEdge
    } | null = null
    /** The pulled bar's own fill, which with its title picks out its pieces. */
    let pulledBg = ""

    /**
     * Every piece of the bar being pulled, in its hover fill for as long as
     * it is held. Pulled into another week the bar is drawn as one piece per
     * row, and :hover only ever lit the piece under the pointer. The pieces
     * are new elements after every step, so they are found again each time:
     * the same title and fill, on days inside the span being drawn.
     */
    const HELD_BAR = "data-pulled"
    function markPieces(span: [string, string] | null) {
      const bars = root.current?.querySelectorAll<HTMLElement>(
        "[data-week-row] .event"
      )
      for (const bar of bars ?? []) {
        const row = bar.closest<HTMLElement>("[data-week-row]")
        let on = false
        if (span && row && pulling) {
          const rect = bar.getBoundingClientRect()
          const cell = row.getBoundingClientRect().width / 7
          const first = dayAt(row, rect.left + cell / 2)
          const last = dayAt(row, rect.right - cell / 2)
          on =
            bar.innerText.trim().split("\n")[0] === pulling.title &&
            bar.style.getPropertyValue("--bg") === pulledBg &&
            first >= span[0] &&
            last <= span[1]
        }
        if (on) bar.setAttribute(HELD_BAR, "")
        else bar.removeAttribute(HELD_BAR)
      }
    }
    /** Let go of: every piece rests until the pointer next leaves it. */
    function restPieces() {
      for (const bar of root.current?.querySelectorAll<HTMLElement>(
        `[${HELD_BAR}]`
      ) ?? []) {
        bar.removeAttribute(HELD_BAR)
        bar.setAttribute("data-rested", "")
        bar.addEventListener(
          "pointerleave",
          () => bar.removeAttribute("data-rested"),
          { once: true }
        )
      }
    }

    function barAt(e: PointerEvent) {
      const under = e.target as HTMLElement | null
      const bar = under?.closest<HTMLElement>(".event")
      return bar?.closest("[data-week-row]") ? bar : null
    }

    function addDays(iso: string, days: number) {
      const d = new Date(`${iso}T00:00`)
      if (Number.isNaN(d.getTime())) return iso
      d.setDate(d.getDate() + days)
      return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
    }

    function dayAt(row: HTMLElement, clientX: number) {
      const rect = row.getBoundingClientRect()
      const col = Math.floor(((clientX - rect.left) / rect.width) * 7)
      return addDays(row.dataset.stripDate ?? "", Math.min(Math.max(col, 0), 6))
    }

    function disarm() {
      if (!armed) return
      armed.bar.style.cursor = ""
      armed.bar.draggable = true
      armed = null
    }

    function onPull(e: PointerEvent) {
      if (!pulling) return
      const under = document.elementFromPoint(
        e.clientX,
        e.clientY
      ) as HTMLElement
      const row =
        under?.closest<HTMLElement>("[data-week-row]") ??
        armed?.bar.closest<HTMLElement>("[data-week-row]")
      if (!row) return
      const date = dayAt(row, e.clientX)
      onResizeRef.current({ ...pulling, date })
      // After the calendar has drawn the new span.
      const p = pulling
      const span: [string, string] =
        p.edge === "end"
          ? [p.from, date < p.from ? p.from : date]
          : [date > p.to ? p.to : date, p.to]
      requestAnimationFrame(() => pulling === p && markPieces(span))
    }

    function onDrop() {
      window.removeEventListener("pointermove", onPull)
      window.removeEventListener("pointerup", onDrop)
      window.removeEventListener("pointercancel", onDrop)
      if (pulling) restPieces()
      pulling = null
      disarm()
    }

    function onHover(e: PointerEvent) {
      if (pulling && e.buttons === 0) onDrop()
      if (pulling) return
      const bar = barAt(e)
      if (!bar) return disarm()
      const rect = bar.getBoundingClientRect()
      const edge: MonthEdge | null =
        e.clientX - rect.left <= EDGE
          ? "start"
          : rect.right - e.clientX <= EDGE
            ? "end"
            : null
      if (!edge) return disarm()
      if (armed && armed.bar !== bar) disarm()
      armed = { bar, edge }
      bar.style.cursor = "ew-resize"
      bar.draggable = false
    }

    function onPointerDown(e: PointerEvent) {
      if (!armed) return
      const bar = barAt(e)
      if (!bar || bar !== armed.bar) return
      const row = bar.closest<HTMLElement>("[data-week-row]")
      if (!row) return
      e.preventDefault()
      e.stopPropagation()
      const rect = bar.getBoundingClientRect()
      const rowRect = row.getBoundingClientRect()
      const cell = rowRect.width / 7
      const col = (x: number) =>
        Math.min(Math.max(Math.round((x - rowRect.left) / cell), 0), 7)
      pulling = {
        title: bar.innerText.trim().split("\n")[0] ?? "",
        from: dayAt(row, rect.left + cell / 2),
        to: addDays(row.dataset.stripDate ?? "", Math.max(col(rect.right) - 1, 0)),
        edge: armed.edge,
      }
      pulledBg = bar.style.getPropertyValue("--bg")
      markPieces([pulling.from, pulling.to])
      window.addEventListener("pointermove", onPull)
      window.addEventListener("pointerup", onDrop, { once: true })
      window.addEventListener("pointercancel", onDrop, { once: true })
    }

    el.addEventListener("pointermove", onHover)
    el.addEventListener("pointerdown", onPointerDown, true)
    el.addEventListener("pointerleave", disarm)
    return () => {
      el.removeEventListener("pointermove", onHover)
      el.removeEventListener("pointerdown", onPointerDown, true)
      el.removeEventListener("pointerleave", disarm)
      window.removeEventListener("pointermove", onPull)
    }
  }, [root, enabled])
}
