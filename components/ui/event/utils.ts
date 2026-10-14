import type { CalendarEvent, EventColor, EventTimeFormat } from "./types"

export function getCalendarDates(month: number, year: number): Date[] {
  const daysInMonth = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31]
  const firstDay = new Date(year, month, 1)
  const leftPadding = firstDay.getDay()

  const datesInPreviousMonth = getBeforeDates(firstDay, leftPadding)
  const datesInCurrentMonth = getCurrentMonthDates(firstDay)
  const datesTillNow = [...datesInPreviousMonth, ...datesInCurrentMonth]
  const datesInNextMonth = getNextMonthDates(datesTillNow)

  return [...datesTillNow, ...datesInNextMonth]

  function getCurrentMonthDates(date: Date): Date[] {
    const m = date.getMonth()
    if (m === 1 && isLeapYear(date)) daysInMonth[m] = 29
    return getDatesAfter(date, 1, daysInMonth[m] + 1)
  }

  function getBeforeDates(first: Date, padding: number): Date[] {
    return getDatesAfter(first, 0, padding, -1).reverse()
  }

  function getNextMonthDates(soFar: Date[]): Date[] {
    const total = soFar.length > 35 ? 42 : 35
    const last = soFar[soFar.length - 1]
    return getDatesAfter(last, 1, total - soFar.length + 1, 1, true)
  }

  function getDatesAfter(
    date: Date,
    startIndex: number,
    counter: number,
    stepper = 1,
    nextMonth = false
  ): Date[] {
    const all: Date[] = []
    for (let index = startIndex; index < counter; index++) {
      all.push(
        new Date(
          date.getFullYear(),
          nextMonth ? date.getMonth() + 1 : date.getMonth(),
          index * stepper
        )
      )
    }
    return all
  }

  function isLeapYear(date: Date) {
    const y = date.getFullYear()
    return y % 400 === 0 || (y % 100 !== 0 && y % 4 === 0)
  }
}

export function calculateMinutes(time: string): number {
  const [hours, minutes] = time.split(":")
  return parseInt(hours) * 60 + parseInt(minutes)
}

export function convertMinutesToHours(minutes: number): string {
  let hours: number | string = Math.floor(minutes / 60)
  let remaining: number | string = minutes % 60
  if (hours < 10) hours = `0${hours}`
  if (remaining < 10) remaining = `0${remaining}`
  return `${hours}:${remaining}:00`
}

export function parseDate(date: Date | string): string {
  if (typeof date === "string") date = new Date(date)
  let dd: number | string = date.getDate()
  let mm: number | string = date.getMonth() + 1
  const yyyy = date.getFullYear()
  if (dd < 10) dd = "0" + dd
  if (mm < 10) mm = "0" + mm
  return `${yyyy}-${mm}-${dd}`
}

export function parseDateEventPopupFormat(
  date: Date,
  showDay = true,
  showMonth = true,
  weekDay: "short" | "long" | "narrow" = "short"
): string {
  const options: Intl.DateTimeFormatOptions = { day: "numeric" }
  if (showMonth) options.month = "short"
  if (showDay) options.weekday = weekDay
  return date.toLocaleDateString("en-US", options)
}

export function calculateDiff(from: string, to: string): number {
  return calculateMinutes(to) - calculateMinutes(from)
}

export function handleSeconds(time: string): string {
  return time.split(":").slice(0, 2).join(":") + ":00"
}

/**
 * Below this the pill is held at `MINIMUM_EVENT_HEIGHT`, which is the height
 * a title and a time need to stay readable.
 */
export const EVENT_HEIGHT_THRESHOLD = 40
export const MINIMUM_EVENT_HEIGHT = 32.5

/** How tall a timed event is drawn, against how long it runs. */
export function paintedEventHeight(
  durationMinutes: number,
  minuteHeight: number
): number {
  const height = durationMinutes * minuteHeight
  return height < EVENT_HEIGHT_THRESHOLD ? MINIMUM_EVENT_HEIGHT : height
}

/**
 * Lays a day's timed events out into overlap columns ("halls"), and says of
 * each which of its edges lie over another event. See the frappe source for
 * the full account; `over` is the events the pill is actually drawn on.
 */
export function findOverlappingEventsCount(
  events: CalendarEvent[],
  minuteHeight?: number
): CalendarEvent[] {
  // A declined event claims no room: the others lay out as if it were not
  // there, and it sits full width beneath them.
  const declined: CalendarEvent[] = events
    .filter((event) => event.isDeclined)
    .map((event) => ({ ...event, hallNumber: 0, idx: -1 }))
  events = events.filter((event) => !event.isDeclined)

  events = [...events].sort((a, b) => (a.startTime || 0) - (b.startTime || 0))

  const result: CalendarEvent[][] = []
  for (const event of events) {
    const availableHall = result.find(
      (hall) => (hall[hall.length - 1].endTime || 0) <= (event.startTime || 0)
    )
    if (availableHall) availableHall.push(event)
    else result.push([event])
  }

  const painted = (event: CalendarEvent): [number, number] => {
    const start = event.startTime || 0
    const minutes = (event.endTime || 0) - start
    const end = minuteHeight
      ? start + paintedEventHeight(minutes, minuteHeight) / minuteHeight
      : start + minutes
    return [start, end]
  }
  const crosses = (a: [number, number], b: [number, number]) =>
    a[0] < b[1] && b[0] < a[1]

  const placed: CalendarEvent[][] = []
  for (const [hallIdx, hall] of result.entries()) {
    const placedHall: CalendarEvent[] = []
    placed.push(placedHall)
    for (const [eventIdx, event] of hall.entries()) {
      const beneath = placed
        .slice(0, hallIdx)
        .flat()
        .concat(placedHall.slice(Math.max(eventIdx - 1, 0), eventIdx))
      const own = painted(event)
      placedHall.push({
        ...event,
        hallNumber: hallIdx,
        idx: eventIdx,
        over: beneath.filter((other) => crosses(painted(other), own)),
      })
    }
  }
  return declined.concat(placed.flat())
}

export const monthList = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
]

export const daysList = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]
export const daysListFull = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
]
export const twelveHoursFormat = [
  "12 am",
  "1 am",
  "2 am",
  "3 am",
  "4 am",
  "5 am",
  "6 am",
  "7 am",
  "8 am",
  "9 am",
  "10 am",
  "11 am",
  "12 pm",
  "1 pm",
  "2 pm",
  "3 pm",
  "4 pm",
  "5 pm",
  "6 pm",
  "7 pm",
  "8 pm",
  "9 pm",
  "10 pm",
  "11 pm",
]
export const twentyFourHoursFormat = Array.from(
  { length: 24 },
  (_, i) => `${String(i).padStart(2, "0")}:00`
)

export function formattedDuration(
  fromTime: string,
  toTime: string,
  timeFormat: EventTimeFormat
): string {
  fromTime = formatTime(fromTime, timeFormat)
  toTime = formatTime(toTime, timeFormat)
  if (fromTime.split(" ")[1] === toTime.split(" ")[1]) {
    fromTime = fromTime.split(" ")[0]
  }
  // An en dash, as the design sets it: a range, not a subtraction.
  return fromTime + " – " + toTime
}

export function formatTime(time: string, format: EventTimeFormat): string {
  if (format === "12h") {
    const [hoursValue, minutes] = time.split(":")
    let hours: number | string = parseInt(hoursValue)
    const ampm = hours >= 12 ? "pm" : "am"
    hours = hours % 12
    hours = hours ? hours : 12
    if (minutes === "00") return `${hours} ${ampm}`
    time = `${hours}:${minutes} ${ampm}`
  }
  return time
}

/**
 * The palette, on the `--ec-*` tokens the injected stylesheet defines for
 * both themes — the frappe espresso playground's own values, to the pixel.
 */
const named = (c: string): EventColor => ({
  color: `var(--ec-ink-${c})`,
  border: `var(--ec-ink-${c})`,
  subtext: `var(--ec-ink-gray-6)`,
  bg: `var(--ec-surface-${c}-1)`,
  bgActive: `var(--ec-surface-${c}-2)`,
})

export const colorMap: Record<string, EventColor> = {
  amber: named("amber"),
  violet: named("violet"),
  pink: named("pink"),
  cyan: named("cyan"),
  blue: named("blue"),
  orange: named("orange"),
  green: named("green"),
  red: named("red"),
  // The gray calendar: the file's ink-gray-6 on surface-gray-1 in light; in
  // dark the step that reads as a colour, not as disabled.
  gray: {
    color: "var(--ec-cal-gray-ink)",
    border: "var(--ec-cal-gray-ink)",
    subtext: "var(--ec-ink-gray-6)",
    bg: "var(--ec-cal-gray-bg)",
    bgActive: "var(--ec-cal-gray-bg-active)",
  },
}

const legacyColorNamesByHex: Record<string, string> = {
  "#db7706": "amber",
  "#6846e3": "violet",
  "#e34aa6": "pink",
  "#3bbde5": "cyan",
  "#0289f7": "blue",
  "#e86c13": "orange",
  "#30a66d": "green",
}

/** A colour a calendar carries of its own, mixed into the page's ground. */
const derivedColor = (value: string): EventColor => ({
  color: value,
  border: value,
  subtext: "var(--ec-ink-gray-6)",
  bg: `color-mix(in srgb, ${value} 10%, var(--ec-surface-base))`,
  bgActive: `color-mix(in srgb, ${value} 16%, var(--ec-surface-base))`,
})

export function eventColor(colorValue?: string): EventColor {
  if (!colorValue?.startsWith("#")) {
    return colorMap[colorValue || "green"] || colorMap["green"]
  }
  const legacy = legacyColorNamesByHex[colorValue.toLowerCase()]
  if (legacy) return colorMap[legacy]
  return derivedColor(colorValue)
}

/** The CSS custom properties an event's root carries. */
export function eventBgStyle(event: CalendarEvent): React.CSSProperties {
  const color = eventColor(event.color || "green")
  return {
    "--bg": color.bg,
    "--subtext": color.subtext,
    "--bg-active": color.bgActive,
    "--border": color.border,
  } as React.CSSProperties
}

export function formatMonthYear(month: number, year: number): string {
  return `${monthList[month]} ${year}`
}

export function getWeekMonthParts(weekDates?: Date[]) {
  const parts: Array<{ key: string; month: number; year: number }> = []
  for (const d of weekDates || []) {
    const dt = new Date(d)
    const m = dt.getMonth()
    const y = dt.getFullYear()
    const key = `${y}-${m}`
    if (!parts.find((p) => p.key === key)) parts.push({ key, month: m, year: y })
  }
  return parts
}

export function isTargetEditable(e: KeyboardEvent): boolean {
  const target = e.target as HTMLElement | null
  if (!target) return false
  const tag = target.tagName
  return (
    tag === "INPUT" ||
    tag === "TEXTAREA" ||
    tag === "SELECT" ||
    target.isContentEditable
  )
}
