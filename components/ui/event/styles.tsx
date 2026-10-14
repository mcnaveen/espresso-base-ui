"use client"

import * as React from "react"

/**
 * The frappe espresso playground's tokens and event-state rules, carried over
 * verbatim (oklch values resolved from its token build) so the calendar draws
 * the same in this project as on the reference page, in both themes.
 *
 * Injected once as a stylesheet: the rules switch on `.dark` and on dynamic
 * state classes (`active`, `past`, `event-draft`), which inline styles cannot.
 */
const TOKENS: Array<[name: string, light: string, dark: string]> = [
  ["surface-base", "oklch(1 0 0)", "oklch(0.205 0 0)"],
  ["ink-gray-4", "oklch(0.683 0 0)", "oklch(0.58 0 0)"],
  ["ink-gray-5", "oklch(0.586 0 0)", "oklch(0.58 0 0)"],
  ["ink-gray-6", "oklch(0.439 0 0)", "oklch(0.683 0 0)"],
  ["ink-gray-7", "oklch(0.341 0 0)", "oklch(0.754 0 0)"],
  ["ink-gray-8", "oklch(0.205 0 0)", "oklch(0.885 0 0)"],
  ["surface-gray-1", "oklch(0.979 0 0)", "oklch(0.239 0 0)"],
  ["surface-gray-2", "oklch(0.964 0 0)", "oklch(0.281 0 0)"],
  ["surface-gray-3", "oklch(0.946 0 0)", "oklch(0.341 0 0)"],
  ["outline-gray-1", "oklch(0.946 0 0)", "oklch(0.26 0 0)"],
  ["surface-red-5", "oklch(0.772 0.118 19.495)", "oklch(0.445 0.13 24.095)"],
  ["surface-red-6", "oklch(0.595 0.208 26.283)", "oklch(0.507 0.165 25.286)"],
  ["surface-red-7", "oklch(0.556 0.198 26.552)", "oklch(0.547 0.175 25.075)"],
  // The seven named calendar colours, plus red and the gray calendar.
  ["ink-amber", "oklch(0.659 0.142 67.548)", "oklch(0.638 0.14 62.455)"],
  ["surface-amber-1", "oklch(0.98 0.015 86.424)", "oklch(0.253 0.049 61.325)"],
  ["surface-amber-2", "oklch(0.967 0.045 91.733)", "oklch(0.303 0.062 60.12)"],
  ["ink-violet", "oklch(0.545 0.18 287.523)", "oklch(0.646 0.178 291.08)"],
  ["surface-violet-1", "oklch(0.976 0.011 291.956)", "oklch(0.243 0.086 285.669)"],
  ["surface-violet-2", "oklch(0.943 0.031 297.722)", "oklch(0.318 0.121 284.702)"],
  ["ink-pink", "oklch(0.597 0.205 347.195)", "oklch(0.667 0.192 346.848)"],
  ["surface-pink-1", "oklch(0.984 0.011 339.329)", "oklch(0.226 0.058 345.011)"],
  ["surface-pink-2", "oklch(0.952 0.028 340.005)", "oklch(0.274 0.081 346.993)"],
  ["ink-cyan", "oklch(0.597 0.104 223.923)", "oklch(0.73 0.117 221.509)"],
  ["surface-cyan-1", "oklch(0.982 0.01 212.521)", "oklch(0.23 0.031 225.496)"],
  ["surface-cyan-2", "oklch(0.96 0.029 218.179)", "oklch(0.263 0.039 221.051)"],
  ["ink-blue", "oklch(0.587 0.174 252.167)", "oklch(0.671 0.155 247.709)"],
  ["surface-blue-1", "oklch(0.976 0.011 243.65)", "oklch(0.255 0.056 255.801)"],
  ["surface-blue-2", "oklch(0.96 0.021 241.348)", "oklch(0.305 0.092 256.675)"],
  ["ink-orange", "oklch(0.613 0.171 45.528)", "oklch(0.669 0.167 50.064)"],
  ["surface-orange-1", "oklch(0.974 0.015 54.935)", "oklch(0.228 0.041 55.938)"],
  ["surface-orange-2", "oklch(0.962 0.023 56.964)", "oklch(0.258 0.051 54.302)"],
  ["ink-green", "oklch(0.57 0.119 158.092)", "oklch(0.607 0.116 158.84)"],
  ["surface-green-1", "oklch(0.976 0.014 155.594)", "oklch(0.244 0.05 156.367)"],
  ["surface-green-2", "oklch(0.965 0.03 155.987)", "oklch(0.295 0.057 157.43)"],
  ["ink-red", "oklch(0.556 0.198 26.552)", "oklch(0.639 0.196 24.565)"],
  ["surface-red-1", "oklch(0.978 0.011 17.34)", "oklch(0.25 0.059 19.081)"],
  ["surface-red-2", "oklch(0.947 0.026 17.626)", "oklch(0.333 0.082 22.544)"],
  // The gray calendar's card: ink-gray-6 on surface-gray-1 in light; in dark
  // the step that reads as a colour, not as disabled.
  ["cal-gray-ink", "oklch(0.439 0 0)", "oklch(0.885 0 0)"],
  ["cal-gray-bg", "oklch(0.979 0 0)", "oklch(0.281 0 0)"],
  ["cal-gray-bg-active", "oklch(0.964 0 0)", "oklch(0.341 0 0)"],
]

const vars = (theme: "light" | "dark") =>
  TOKENS.map(([n, l, d]) => `--ec-${n}: ${theme === "light" ? l : d};`).join("")

const CSS = `
.ec-scope { ${vars("light")} }
.dark .ec-scope { ${vars("dark")} }

/* ── An event wherever it is drawn: a pill in the grids, a row in the list ── */
.ec-scope .event { background-color: var(--bg); }
.ec-scope .event .event-title { color: var(--border); }
.ec-scope .event .event-subtitle { color: color-mix(in srgb, var(--border) 70%, transparent); }
.ec-scope .event .event-border { background-color: var(--border); }
.ec-scope .event svg { color: var(--border); }
/* A draft — the span waiting on the panel — carries no edge at all: its fill
   is the event's own, so picking blue in the panel turns the block blue. */
.ec-scope .event.event-draft { background-color: var(--bg); }
.ec-scope.ec-grey-draft .event.event-draft { background-color: var(--ec-surface-gray-1); }
@media (hover: hover) {
  .ec-scope .event:hover { background-color: var(--bg-active); }
  .ec-scope .event.event-draft:hover { background-color: var(--bg); }
  .ec-scope.ec-grey-draft .event.event-draft:hover { background-color: var(--ec-surface-gray-1); }
}
/* Open: a shade past hover, mixed from the event's own colour. */
.ec-scope .event.active,
.ec-scope .event.active:hover { background-color: color-mix(in srgb, var(--border) 10%, var(--bg-active)); }
/* Behind you: the event fades whole. Not the open one. */
.ec-scope .event.past:not(.active) { opacity: 0.5; }
/* A card with no accent line starts its title where an event's starts. */
.ec-scope .event:not(:has(.event-border)) > .ec-pad > .ec-body { padding-left: 8px; }

/* ── The hour labels, hung off the first day column's rows ────────────── */
.ec-scope .calendar-column { position: relative; }
.ec-scope .calendar-column [data-time-attr]::before {
  content: attr(data-time-attr);
  position: absolute;
  right: calc(100% + 10px);
  top: -9px;
  font-size: 12px;
  font-weight: 420;
  white-space: nowrap;
  color: var(--ec-ink-gray-7);
}

/* ── Now: the hairline across the week, and today's own line ──────────── */
.ec-scope .ec-week-grid::before {
  content: "";
  position: absolute;
  inset-inline: 0;
  top: calc(var(--now-top) + 0.5px);
  height: 1px;
  background: var(--ec-surface-red-5);
  z-index: 10;
  pointer-events: none;
}
.ec-scope .current-time {
  position: relative;
  height: 2px;
  background: var(--ec-surface-red-6);
  border-radius: 8px;
  z-index: 20;
  margin-left: 2px;
  margin-right: 1px;
}
.ec-scope .current-time::before {
  content: "";
  position: absolute;
  left: -1px;
  top: -6px;
  width: 2px;
  height: 14px;
  border-radius: 9999px;
  background: var(--ec-surface-red-6);
}

/* ── Agenda ───────────────────────────────────────────────────────────── */
.ec-scope .calendar-day-header.past > * { opacity: 0.55; }
.ec-scope .calendar-week-label.past { opacity: 0.55; }
.ec-scope .calendar-row-description:empty { display: none; }
/* While a week label is stuck, the rows going under it fade out. */
.ec-scope .calendar-week-label[data-stuck]::before {
  content: "";
  position: absolute;
  left: 0; right: 0; top: 100%;
  height: 16px;
  background: linear-gradient(to bottom, var(--ec-surface-base), transparent);
  pointer-events: none;
}

/* ── Held, stretched or carried: the hover fill the whole while ───────── */
/* The component lifts the box it is stretching or moving to z-index 100
   for as long as it is held, and nothing else then. The pointer runs off a
   card's end between one 15-minute step and the next, so :hover alone
   flickered it at every step. */
.ec-scope [data-time-grid] [style*="z-index: 100"] > .event {
  background-color: var(--bg-active) !important;
}
/* Let go of, it rests until the pointer next leaves it — the page marks
   the card on release. */
.ec-scope [data-time-grid] .event[data-rested]:not(.active) {
  background-color: var(--bg) !important;
}
/* Pointing at any piece of a bar across weeks lights the whole of it. */
@media (hover: hover) {
  .ec-scope [data-week-row] .event.ec-hover-all {
    background-color: var(--bg-active) !important;
  }
}
/* Month's: every week's piece of a bar whose edge is being pulled, and
   each of them resting once it is let go. */
.ec-scope [data-week-row] .event[data-pulled] {
  background-color: var(--bg-active) !important;
}
.ec-scope [data-week-row] .event[data-rested]:not(.active) {
  background-color: var(--bg) !important;
}
/* The white ring a pill wears where it lies on another comes in by the
   same pixel top and bottom, or it reads 3 there against 2 at the sides:
   a transparent border on its border-box, the fill clipped inside. */
.ec-scope [data-time-grid] .ec-cut > div {
  border-block: 1px solid transparent;
  background-clip: padding-box;
}

/* ── A month bar settles rather than jumps ────────────────────────────── */
.ec-scope [data-week-row] .event.ec-bar {
  transition: left 180ms ease-out, width 180ms ease-out, top 180ms ease-out;
}

/* ── The drag system's marks (set by the page's card-in-hand) ─────────── */
.ec-scope .event[data-landing],
.ec-scope div:has(> .event[data-landing]) { transition: none !important; }
.ec-scope .event[data-landing=""] { opacity: 0 !important; }
.ec-landing [data-date-attr] div:has(> .event:not([data-landing])) {
  transition: top 180ms ease-out, left 180ms ease-out, right 180ms ease-out, height 180ms ease-out !important;
}
.ec-landing [data-date-attr] .ec-cut > div { animation: ec-ring-in 180ms ease-out; }
@keyframes ec-ring-in { from { opacity: 0; } }
/* The pill the page is carrying goes invisible while it is held. */
.ec-scope [style*="grabbing"] { opacity: 0 !important; }
/* A card being moved or resized keeps the width it had standing still. */
.ec-scope .flex[style*="z-index: 100"][style*="translate"]:has(> .event) {
  right: calc(7% + 1px) !important;
}

/* ── Agenda, the flat variant (fill held back until the pointer) ──────── */
.ec-agenda-flat .calendar-row .event-border,
.ec-agenda-flat .calendar-row .calendar-row-time { display: none; }
.ec-agenda-flat .calendar-row span:has(> .agenda-lead) { order: -1; }
.ec-agenda-flat .calendar-row { background-color: transparent; }
@media (hover: hover) {
  .ec-agenda-flat .calendar-row:hover {
    background-color: var(--ec-surface-gray-1) !important;
    --stack-ring: var(--ec-surface-gray-1);
  }
}
.ec-agenda-flat .calendar-row .calendar-row-title { color: var(--ec-ink-gray-7) !important; }
.ec-agenda-flat .calendar-row .calendar-row-description {
  color: var(--ec-ink-gray-5) !important;
  font-size: 13px !important;
  line-height: 20px !important;
  display: flex;
  align-items: baseline;
  gap: 8px;
}
.ec-agenda-flat .calendar-row > div > span:has(.calendar-row-title) { max-width: 880px; }
.ec-agenda-flat .calendar-row-participant { margin-left: auto; }
.ec-agenda-flat .agenda-dot { width: 16px !important; height: 16px !important; margin-top: 0 !important; }
.ec-agenda-flat .calendar-row:hover .agenda-when { visibility: hidden; }
.ec-agenda-flat .calendar-row:hover .agenda-lasts { visibility: visible; }
.ec-agenda-flat .calendar-day-header { width: 112px !important; }
.ec-agenda-flat .calendar-week-label > span {
  font-size: inherit !important;
  line-height: inherit !important;
  font-weight: 420 !important;
  color: var(--ec-ink-gray-5) !important;
}
`

let injected = false

/** Mounts the calendar's stylesheet once per document. */
export function EventStyles() {
  const [, force] = React.useState(0)
  React.useEffect(() => {
    if (injected) return
    injected = true
    force((n) => n + 1)
  }, [])

  React.useEffect(() => {
    if (document.getElementById("espresso-event-styles")) return
    const style = document.createElement("style")
    style.id = "espresso-event-styles"
    style.textContent = CSS
    document.head.appendChild(style)
  }, [])

  return null
}
