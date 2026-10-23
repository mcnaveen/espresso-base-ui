"use client"

import * as React from "react"

import {
  calculateMinutes,
  findOverlappingEventsCount,
  twelveHoursFormat,
  twentyFourHoursFormat,
} from "./utils"
import { daySegments, isAllDayLike } from "./span"
import type {
  CalendarEvent,
  EventConfig,
  GroupedCalendarEvents,
} from "./types"

/* ── One clock for the whole calendar ──────────────────────────────────── */

let now = new Date()
let timer: ReturnType<typeof setInterval> | undefined
const nowListeners = new Set<() => void>()

const tick = () => {
  now = new Date()
  nowListeners.forEach((l) => l())
}
const tickIfVisible = () => {
  if (document.visibilityState === "visible") tick()
}

function subscribeNow(listener: () => void) {
  if (!nowListeners.size) {
    tick()
    // 30s keeps the minute-resolution marker within half a minute of the
    // truth without waking the page every second.
    timer = setInterval(tick, 30_000)
    document.addEventListener("visibilitychange", tickIfVisible)
    window.addEventListener("focus", tick)
  }
  nowListeners.add(listener)
  return () => {
    nowListeners.delete(listener)
    if (!nowListeners.size) {
      if (timer) clearInterval(timer)
      timer = undefined
      document.removeEventListener("visibilitychange", tickIfVisible)
      window.removeEventListener("focus", tick)
    }
  }
}

/** A `Date` that keeps up with the wall clock while the calendar is mounted. */
export function useNow(): Date {
  return React.useSyncExternalStore(
    subscribeNow,
    () => now,
    () => now
  )
}

/* ── The event the reader last reached for ─────────────────────────────── */

let activeEventId: string | number = ""
const activeListeners = new Set<() => void>()

export function setActiveEvent(id: string | number) {
  activeEventId = id
  activeListeners.forEach((l) => l())
}

export function getActiveEvent() {
  return activeEventId
}

export function useActiveEvent(): string | number {
  return React.useSyncExternalStore(
    (l) => {
      activeListeners.add(l)
      return () => activeListeners.delete(l)
    },
    () => activeEventId,
    () => activeEventId
  )
}

/* ── Whether any event popover is open ─────────────────────────────────── */

export const popoverGate = { open: false }

/* ── Splitting events between the time grid and the all-day row ────────── */

export function useEventData(
  events: CalendarEvent[] | undefined,
  minuteHeight?: number
) {
  return React.useMemo(() => {
    const list = events ?? []
    const grouped: GroupedCalendarEvents = {}
    for (const event of list) {
      if (isAllDayLike(event)) continue
      for (const segment of daySegments(event)) {
        segment.startTime = calculateMinutes(segment.segFromTime)
        segment.endTime = calculateMinutes(segment.segToTime)
        ;(grouped[segment.date] ||= []).push(segment)
      }
    }
    for (const [date, segments] of Object.entries(grouped)) {
      grouped[date] = findOverlappingEventsCount(segments, minuteHeight)
    }
    const allDayEvents = list.filter(isAllDayLike)
    return { timedEvents: grouped, allDayEvents }
  }, [events, minuteHeight])
}

/* ── What the Day and Week views share about their hours ───────────────── */

export function useHourGrid(
  config: EventConfig,
  grid: React.RefObject<HTMLElement | null>
) {
  const hourHeight = config.hourHeight
  const minuteHeight = hourHeight / 60
  const timeArray =
    config.timeFormat === "24h" ? twentyFourHoursFormat : twelveHoursFormat

  const LAST_START = 23 * 60 + 30

  /**
   * The time a click asks for: the mark it landed nearest, less the half
   * hour that puts that mark in the middle of the event rather than at its
   * start. Half hours, not quarters.
   */
  const slotTime = React.useCallback(
    (e: React.MouseEvent, hour: number): string => {
      const row = e.currentTarget as HTMLElement | null
      const fraction = row
        ? (e.clientY - row.getBoundingClientRect().top) / hourHeight
        : 0
      const minutes = fraction < 0.25 ? 0 : fraction < 0.75 ? 30 : 60
      const start = Math.min(Math.max(hour * 60 + minutes - 30, 0), LAST_START)
      const startHour = Math.floor(start / 60)
      if (start % 60 === 0) return timeArray[startHour]
      if (config.timeFormat === "24h")
        return `${String(startHour).padStart(2, "0")}:30`
      return `${((startHour + 11) % 12) + 1}:30 ${startHour < 12 ? "am" : "pm"}`
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [hourHeight, config.timeFormat]
  )

  const scrolled = React.useRef(false)
  React.useEffect(() => {
    if (scrolled.current) return
    scrolled.current = true
    const scrollToHour = config.scrollToHour || new Date().getHours()
    grid.current?.scrollBy(0, scrollToHour * 60 * minuteHeight - 10)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return { hourHeight, minuteHeight, timeArray, slotTime }
}

/* ── Keeping a scrolling strip of dated rows in step with navigation ───── */

export function useStripScroll(
  scroller: React.RefObject<HTMLElement | null>,
  target: Date | undefined,
  jump?: Date | undefined
) {
  const rows = React.useCallback(
    () =>
      Array.from(
        scroller.current?.querySelectorAll<HTMLElement>("[data-strip-date]") ??
          []
      ),
    [scroller]
  )

  const rowFor = React.useCallback(
    (date: string): HTMLElement | undefined => {
      let found: HTMLElement | undefined
      for (const row of rows()) {
        const start = row.dataset.stripDate!
        if (start === date) return row
        if (start < date) found = row
        else break
      }
      return found
    },
    [rows]
  )

  const scrollToDate = React.useCallback(
    (date: Date | string) => {
      const d = typeof date === "string" ? new Date(date) : date
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`
      const row = rowFor(key)
      const el = scroller.current
      if (row && el) el.scrollTop = row.offsetTop
    },
    [rowFor, scroller]
  )

  const targetKey = target ? target.toDateString() : ""
  const jumpKey = jump ? jump.getTime() : 0
  const first = React.useRef(true)
  React.useEffect(() => {
    if (first.current) {
      first.current = false
      scrollToDate(target ?? new Date())
      return
    }
    if (target) scrollToDate(target)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [targetKey, jumpKey])

  return { scrollToDate }
}
