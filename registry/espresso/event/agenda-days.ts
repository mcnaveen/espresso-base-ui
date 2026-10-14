import { parseDate } from "./utils"
import { eventsOn } from "./span"
import { shortMonth, weekStart } from "./month-strip"
import type { CalendarEvent } from "./types"

/**
 * The Agenda view is three months as a list of days. A day with nothing on it
 * is not listed at all, and the window rolls a month at a time.
 */

export const AGENDA_MONTHS = 3

export interface AgendaRow {
  date: Date
  key: string
  events: CalendarEvent[]
  isToday: boolean
  isPast: boolean
}

/** The three months the view is anchored on, from the 1st to the last day. */
export function agendaMonths(anchor: Date): { start: Date; end: Date } {
  const year = anchor.getFullYear()
  const month = anchor.getMonth()
  return {
    start: new Date(year, month, 1),
    end: new Date(year, month + AGENDA_MONTHS, 0),
  }
}

/** The span the view lists, padded out to whole weeks at both ends. */
export function agendaRange(anchor: Date): { start: Date; end: Date } {
  const { start, end } = agendaMonths(anchor)
  return { start: weekStart(start), end: addDays(weekStart(end), 6) }
}

/** The rows the list draws — one per day that has something on it. */
export function agendaRows(
  events: CalendarEvent[],
  anchor: Date,
  today: Date = new Date()
): AgendaRow[] {
  const { start, end } = agendaRange(anchor)
  const todayKey = parseDate(today)
  const rows: AgendaRow[] = []

  for (
    let date = start;
    date <= end;
    date = new Date(date.getFullYear(), date.getMonth(), date.getDate() + 1)
  ) {
    const onThisDay = eventsOn(events, date)
    if (!onThisDay.length) continue
    const key = parseDate(date)
    rows.push({
      date,
      key,
      events: onThisDay,
      isToday: key === todayKey,
      isPast: key < todayKey,
    })
  }

  return rows
}

export interface AgendaWeek {
  key: string
  start: Date
  end: Date
  isCurrent: boolean
  isNext: boolean
  isPrevious: boolean
  isPast: boolean
  days: AgendaRow[]
}

function addDays(date: Date, days: number): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate() + days)
}

/** The list as the view draws it: the weeks that have anything in them. */
export function agendaWeeks(
  events: CalendarEvent[],
  anchor: Date,
  today: Date = new Date()
): AgendaWeek[] {
  const rows = agendaRows(events, anchor, today)
  const currentWeek = parseDate(weekStart(today))
  const nextWeek = parseDate(addDays(weekStart(today), 7))
  const lastWeek = parseDate(addDays(weekStart(today), -7))
  const weeks: AgendaWeek[] = []

  for (const row of rows) {
    const start = weekStart(row.date)
    const key = parseDate(start)
    let week = weeks[weeks.length - 1]

    if (week?.key !== key) {
      const end = addDays(start, 6)
      week = {
        key,
        start,
        end,
        isCurrent: key === currentWeek,
        isNext: key === nextWeek,
        isPrevious: key === lastWeek,
        isPast: parseDate(end) < parseDate(today),
        days: [],
      }
      weeks.push(week)
    }

    week.days.push(row)
  }

  return weeks
}

/** "Sep 6 – 12", or "Sep 27 – Oct 3" where the range crosses a month end. */
export function agendaRangeLabel(start: Date, end: Date): string {
  const from = `${shortMonth(start)} ${start.getDate()}`
  const to =
    start.getMonth() === end.getMonth()
      ? `${end.getDate()}`
      : `${shortMonth(end)} ${end.getDate()}`
  return `${from} – ${to}`
}
