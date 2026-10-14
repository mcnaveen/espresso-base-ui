import {
  calculateMinutes,
  formatTime,
  formattedDuration,
  parseDate,
} from "./utils"
import { daysBetween, eventDays, isOvernight } from "./span"
import type { CalendarEvent, EventRowTag, EventTimeFormat } from "./types"

/**
 * What a listed event says about itself. The Agenda view reads an event as a
 * row rather than a pill, and a row has room for more than a title.
 */

/** "11 am – 1 pm", or "All day" for an event that owns the whole of it. */
export function rowTimeLabel(
  event: CalendarEvent,
  format: EventTimeFormat,
  date?: Date
): string {
  if (event.isFullDay) return "All day"

  const key = date ? parseDate(date) : null
  const { start, end } = key ? eventDays(event) : { start: "", end: "" }
  if (key && (start < key || end > key)) {
    if (start < key && end > key) return "All day"
    if (start < key) {
      const ends = String(event.segToTime || event.toTime || "")
      return ends ? `Ends ${formatTime(ends, format)}` : "All day"
    }
    if (isOvernight(event)) return spanLabel(event, format)
    const begins = String(event.segFromTime || event.fromTime || "")
    return begins ? `From ${formatTime(begins, format)}` : "All day"
  }

  return spanLabel(event, format)
}

function spanLabel(event: CalendarEvent, format: EventTimeFormat): string {
  const from = String(event.segFromTime || event.fromTime || "00:00")
  const to = String(event.segToTime || event.toTime || "")
  if (!to || to === from) return formatTime(from, format)
  return formattedDuration(from, to, format)
}

/** "Day 1/3" for an event occupying more than one day; null otherwise. */
export function daySpan(event: CalendarEvent, date: Date): string | null {
  const { start, end } = eventDays(event)
  const total = daysBetween(start, end) + 1
  if (total < 2) return null
  const day = daysBetween(start, parseDate(date)) + 1
  if (day < 1 || day > total) return null
  return `Day ${day}/${total}`
}

/** The library's own one-line description of a row. */
export function rowDescription(event: CalendarEvent, date: Date): string {
  const parts: string[] = []
  if (event.venue) parts.push(String(event.venue))
  const span = daySpan(event, date)
  if (span) parts.push(span)
  return parts.join(" · ")
}

function minutesUntil(event: CalendarEvent, date: Date, now: Date): number {
  if (parseDate(now) !== parseDate(date)) return Infinity
  const start = calculateMinutes(
    String(event.segFromTime || event.fromTime || "00:00")
  )
  return start - (now.getHours() * 60 + now.getMinutes())
}

const SOON_MINUTES = 60

/** Whether the event is behind the reader on the day it is listed under. */
export function hasEnded(event: CalendarEvent, date: Date, now: Date): boolean {
  const day = parseDate(date)
  const today = parseDate(now)
  if (day < today) return true
  if (day > today) return false
  if (event.isFullDay) return false
  if (eventDays(event).end > day) return false
  const to =
    calculateMinutes(String(event.segToTime || event.toTime || "00:00")) ||
    24 * 60
  return to <= now.getHours() * 60 + now.getMinutes()
}

/** Where the event stands against the clock: `Now` or `Soon`, or nothing. */
export function rowTiming(
  event: CalendarEvent,
  date: Date,
  now: Date
): EventRowTag | null {
  if (isUnderWay(event, date, now))
    return { label: "Now", theme: "blue", variant: "solid" }
  const until = minutesUntil(event, date, now)
  if (until > 0 && until <= SOON_MINUTES) return { label: "Soon", theme: "amber" }
  return null
}

function isUnderWay(event: CalendarEvent, date: Date, now: Date): boolean {
  if (event.isFullDay) return false
  const key = parseDate(date)
  if (parseDate(now) !== key) return false

  const { start, end } = eventDays(event)
  if (key < start || key > end) return false

  const minutes = now.getHours() * 60 + now.getMinutes()
  const from =
    key > start
      ? 0
      : calculateMinutes(String(event.segFromTime || event.fromTime || "00:00"))
  const to =
    key < end
      ? 24 * 60
      : calculateMinutes(String(event.segToTime || event.toTime || "00:00")) ||
        24 * 60
  return from <= minutes && minutes < to
}
