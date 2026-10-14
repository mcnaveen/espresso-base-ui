import { parseDate } from "./utils"
import type { CalendarEvent, EventDaySegment, EventRowBar } from "./types"

/**
 * Where an event sits on the day grid.
 *
 * An event runs from `fromDate fromTime` to `toDate toTime`, dates inclusive.
 * The one wrinkle is a timed event whose `toTime` is midnight: it ends as the
 * next day begins, so that day is not one it occupies. Full-day events ignore
 * their times and cover `fromDate`..`toDate` whole.
 */

const DAY_MS = 24 * 60 * 60 * 1000
const DAY_MINUTES = 24 * 60

/** A row of the day view's all-day lane, and of a month cell. */
export const LANE_HEIGHT = 28

/** The air between one all-day bar and the next. */
export const ALL_DAY_LANE_GAP = 4
export const NARROW_ALL_DAY_LANE_GAP = 2
export const NARROW_WEEK_LANE_HEIGHT = 20

export const weekLaneHeight = (narrow?: boolean) =>
  narrow ? NARROW_WEEK_LANE_HEIGHT : LANE_HEIGHT
export const weekLaneGap = (narrow?: boolean) =>
  narrow ? NARROW_ALL_DAY_LANE_GAP : ALL_DAY_LANE_GAP
export const weekLanePitch = (narrow?: boolean) =>
  weekLaneHeight(narrow) + weekLaneGap(narrow)

/** How far inside its day an event is drawn, in pixels. */
export const COLUMN_INSET = 2
export const PILL_MARGIN = 1

/** The gap an event keeps from the edges of its day, in pixels. */
export const PILL_INSET = 4

/** The rule a column draws down its own right edge. */
export const COLUMN_RULE = 1

export function addDays(date: string, days: number): string {
  const d = toDate(date)
  return parseDate(new Date(d.getFullYear(), d.getMonth(), d.getDate() + days))
}

/** Whole days from `from` to `to` (negative when `to` is earlier). */
export function daysBetween(from: string, to: string): number {
  return Math.round((toDate(to).getTime() - toDate(from).getTime()) / DAY_MS)
}

function toDate(date: string): Date {
  const [y, m, d] = date.split("-").map(Number)
  return new Date(y, m - 1, d)
}

function minutes(time?: string): number {
  if (!time) return 0
  const [h, m] = time.split(":")
  return parseInt(h) * 60 + parseInt(m || "0")
}

const isMidnight = (time?: string) => minutes(time) === 0

/** Inclusive first and last day an event occupies, as `YYYY-MM-DD` strings. */
export function eventDays(event: CalendarEvent): { start: string; end: string } {
  const start = event.fromDate || event.date || ""
  let end = event.toDate || start
  if (end < start) end = start
  if (!event.isFullDay && end > start && isMidnight(event.toTime)) {
    end = addDays(end, -1)
  }
  return { start, end }
}

/** Days the event occupies, inclusive of both ends. */
export function eventDayCount(event: CalendarEvent): number {
  const { start, end } = eventDays(event)
  return daysBetween(start, end) + 1
}

/**
 * A timed event that crosses midnight but is shorter than a day: an evening
 * that runs late rather than a stay.
 */
export function isOvernight(event: CalendarEvent): boolean {
  if (event.isFullDay) return false
  const { start, end } = eventDays(event)
  if (end === start) return false
  const total =
    daysBetween(start, event.toDate || end) * 24 * 60 +
    minutes(event.toTime) -
    minutes(event.fromTime)
  return total < 24 * 60
}

/** Whether the event belongs in the all-day row. */
export function isAllDayLike(event: CalendarEvent): boolean {
  if (event.isFullDay) return true
  return eventDayCount(event) > 1 && !isOvernight(event)
}

/**
 * The time-grid pieces of an event, one per day it occupies. An overnight one
 * is cut at midnight, with the first piece running to `24:00` and the last
 * starting at `00:00`.
 */
export function daySegments(event: CalendarEvent): EventDaySegment[] {
  const { start, end } = eventDays(event)
  const count = daysBetween(start, end) + 1
  const endsAtMidnight =
    !event.isFullDay && (event.toDate || start) > end && isMidnight(event.toTime)
  const segments: EventDaySegment[] = []
  for (let i = 0; i < count; i++) {
    const segIsStart = i === 0
    const segIsEnd = i === count - 1
    segments.push({
      ...event,
      date: addDays(start, i),
      segFromTime: segIsStart ? event.fromTime || "00:00" : "00:00",
      segToTime: segIsEnd && !endsAtMidnight ? event.toTime || "00:00" : "24:00",
      segIsStart,
      segIsEnd,
    })
  }
  return segments
}

/**
 * Packs events into lanes across one row of dates so a bar keeps the same
 * vertical slot on every day it covers.
 */
export function layoutRow(
  events: CalendarEvent[],
  rowDates: Date[]
): { bars: EventRowBar[]; laneCount: number } {
  if (!rowDates.length) return { bars: [], laneCount: 0 }
  const rowStart = parseDate(rowDates[0])
  const rowEnd = parseDate(rowDates[rowDates.length - 1])
  const columns = rowDates.length

  const clipped = events
    .map((event) => {
      const { start, end } = eventDays(event)
      if (end < rowStart || start > rowEnd) return null
      const startCol = Math.max(0, daysBetween(rowStart, start))
      const endCol = Math.min(columns - 1, daysBetween(rowStart, end))
      return {
        event,
        startCol,
        endCol,
        isStart: start >= rowStart,
        isEnd: end <= rowEnd,
        lane: 0,
      }
    })
    .filter((bar): bar is EventRowBar => bar !== null)

  clipped.sort((a, b) => {
    if (a.startCol !== b.startCol) return a.startCol - b.startCol
    const spanA = a.endCol - a.startCol
    const spanB = b.endCol - b.startCol
    if (spanA !== spanB) return spanB - spanA
    const fullA = a.event.isFullDay ? 0 : 1
    const fullB = b.event.isFullDay ? 0 : 1
    if (fullA !== fullB) return fullA - fullB
    const timeA = minutes(a.event.fromTime)
    const timeB = minutes(b.event.fromTime)
    if (timeA !== timeB) return timeA - timeB
    return String(a.event.id ?? "").localeCompare(String(b.event.id ?? ""))
  })

  const lanes: boolean[][] = []
  for (const bar of clipped) {
    let lane = 0
    for (;;) {
      const row = lanes[lane] || (lanes[lane] = Array(columns).fill(false))
      let free = true
      for (let c = bar.startCol; c <= bar.endCol; c++) {
        if (row[c]) {
          free = false
          break
        }
      }
      if (free) {
        for (let c = bar.startCol; c <= bar.endCol; c++) row[c] = true
        bar.lane = lane
        break
      }
      lane++
    }
  }

  return { bars: clipped, laneCount: lanes.length }
}

/** Bars in a row that touch a given column. */
export function barsInColumn(bars: EventRowBar[], col: number) {
  return bars.filter((bar) => bar.startCol <= col && col <= bar.endCol)
}

/** Moves an event by whole days, keeping its length. */
export function shiftEventDays(event: CalendarEvent, days: number) {
  const fromDate = addDays(event.fromDate || event.date || "", days)
  const toDate = addDays(event.toDate || event.fromDate || event.date || "", days)
  event.date = fromDate
  event.fromDate = fromDate
  event.toDate = toDate
  event.fromDateTime = fromDate + " " + (event.fromTime || "")
  event.toDateTime = toDate + " " + (event.toTime || "")
  return event
}

function toClock(totalMinutes: number): string {
  const h = String(Math.floor(totalMinutes / 60)).padStart(2, "0")
  const m = String(totalMinutes % 60).padStart(2, "0")
  return `${h}:${m}:00`
}

/**
 * Moves a timed event by minutes, keeping its length. Either end may roll
 * over midnight, in which case its date follows.
 */
export function shiftEventMinutes(event: CalendarEvent, delta: number) {
  const fromDate = event.fromDate || event.date || ""
  const toDate = event.toDate || fromDate
  let start = minutes(event.fromTime) + delta
  let end =
    daysBetween(fromDate, toDate) * DAY_MINUTES + minutes(event.toTime) + delta
  const startDays = Math.floor(start / DAY_MINUTES)
  const endDays = Math.floor(end / DAY_MINUTES)
  start -= startDays * DAY_MINUTES
  end -= endDays * DAY_MINUTES
  event.fromDate = addDays(fromDate, startDays)
  event.toDate = addDays(fromDate, endDays)
  event.date = event.fromDate
  event.fromTime = toClock(start)
  event.toTime = toClock(end)
  event.fromDateTime = event.fromDate + " " + event.fromTime
  event.toDateTime = event.toDate + " " + event.toTime
  return event
}

/** Drops the placement-only fields a view attaches. */
export function stripPlacement(event: CalendarEvent): CalendarEvent {
  const { segFromTime, segToTime, segIsStart, segIsEnd, ...rest } = event
  void segFromTime
  void segToTime
  void segIsStart
  void segIsEnd
  return rest
}

/** Whether the event covers more than one day, and so draws as a bar. */
export function isSpan(event: CalendarEvent): boolean {
  return eventDayCount(event) > 1
}

/** Full-day events first, then by start time, then a stable tiebreak. */
export function sortByStart(
  events: CalendarEvent[],
  date?: Date
): CalendarEvent[] {
  const key = date ? parseDate(date) : null
  const startsOn = (event: CalendarEvent) =>
    key && eventDays(event).start < key ? 0 : minutes(event.fromTime)

  return [...events].sort((a, b) => {
    const fullA = a.isFullDay ? 0 : 1
    const fullB = b.isFullDay ? 0 : 1
    if (fullA !== fullB) return fullA - fullB
    const timeA = startsOn(a)
    const timeB = startsOn(b)
    if (timeA !== timeB) return timeA - timeB
    return String(a.id ?? "").localeCompare(String(b.id ?? ""))
  })
}

/** Single-day events that fall on `date`. */
export function dayEvents(events: CalendarEvent[], date: Date): CalendarEvent[] {
  const key = parseDate(date)
  return sortByStart(
    events.filter((e) => !isSpan(e) && eventDays(e).start === key)
  )
}

/** Every event that occupies `date`, spans included. */
export function eventsOn(events: CalendarEvent[], date: Date): CalendarEvent[] {
  const key = parseDate(date)
  return sortByStart(
    events.filter((e) => {
      const { start, end } = eventDays(e)
      return start <= key && key <= end
    }),
    date
  )
}
