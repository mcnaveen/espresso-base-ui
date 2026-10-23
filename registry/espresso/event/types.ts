import * as React from "react"

export type EventView = "Day" | "Week" | "Month" | "Agenda"
export type EventTimeFormat = "12h" | "24h"

/**
 * One event colour: the bar, the fill, the fill a step deeper for hover and
 * selection, and the muted ink inside.
 */
export interface EventColor {
  color: string
  border: string
  subtext: string
  bg: string
  bgActive: string
}

export interface CalendarEvent {
  id?: string | number
  name?: string | number
  title?: string
  date?: string
  /**
   * First and last day, inclusive. An event whose `toDate` is later than its
   * `fromDate` spans those days: the Month view draws it as one bar, the Week
   * view puts it in the all-day row (or, for a timed event shorter than a
   * day, splits it at midnight in the time grid).
   */
  fromDate?: string
  toDate?: string
  fromTime?: string
  /** A timed event ending at `00:00` on `toDate` stops as that day begins. */
  toTime?: string
  fromDateTime?: string
  toDateTime?: string
  participant?: string
  venue?: string
  description?: string
  color?: string
  type?: string
  /** Ignores the times and covers `fromDate`..`toDate` whole. */
  isFullDay?: boolean
  /** Saved but not sent: drawn as a plain tinted block in its own colour. */
  isDraft?: boolean
  /**
   * The viewer said no. The title is struck through, and in the Week and Day
   * views the event claims no room.
   */
  isDeclined?: boolean
  startTime?: number
  endTime?: number
  hallNumber?: number
  idx?: number
  /** The events this pill is drawn on, with their own place in the layout. */
  over?: CalendarEvent[]
  [key: string]: unknown
}

/** A tag on a listed event — the Agenda's rows carry these. */
export interface EventRowTag {
  label: string
  theme?: "blue" | "amber" | "red" | "green" | "gray" | "violet"
  variant?: "subtle" | "solid"
}

/** What the row render props receive. */
export interface EventRowSlotProps {
  calendarEvent: CalendarEvent
  /** The day the row belongs to; a multi-day event has one row per day. */
  date: Date
  /** The library's own description, so a filled slot extends it. */
  description: string
  /** Where the event stands against the clock, shown beside the time. */
  timing: EventRowTag | null
}

/**
 * One day's piece of an event in the time grid. The `seg*` fields place the
 * piece; the views set them and strip them again before an event leaves.
 */
export interface EventDaySegment extends CalendarEvent {
  date: string
  segFromTime: string
  segToTime: string
  segIsStart: boolean
  segIsEnd: boolean
}

/** An event clipped to one row of days and packed into a lane. */
export interface EventRowBar {
  event: CalendarEvent
  startCol: number
  endCol: number
  lane: number
  isStart: boolean
  isEnd: boolean
}

export interface EventConfig {
  /** Hour (0-23) the Week and Day views scroll to on mount. */
  scrollToHour: number
  /** Views removed from the view switcher. */
  disableModes: EventView[]
  /** View shown when the calendar mounts. */
  defaultMode: EventView
  /**
   * Enables editing: create events by clicking a cell, edit on double click,
   * drag to move, resize, and delete with the keyboard.
   */
  isEditMode: boolean
  /** Icons keyed by an event's `type` field. */
  eventIcons: Record<string, React.ComponentType<{ className?: string }>>
  /** Pixel height of one hour row in the Week and Day views. */
  hourHeight: number
  /** Enables keyboard shortcuts: m/w/d/a switch views, t today, arrows move. */
  enableShortcuts: boolean
  /** Shows the event's `eventIcons` icon on its card. */
  showIcon: boolean
  /** Clock format for time labels. */
  timeFormat: EventTimeFormat
  /** Removes the outer grid border. */
  noBorder?: boolean
}

export interface EventCellClickData {
  e: React.MouseEvent | MouseEvent
  view: EventView
  date: Date | string
  time: string
  isFullDay: boolean
}

export interface EventPopoverSlotProps {
  calendarEvent: CalendarEvent
  date: Date
  isEditMode: boolean
  close: () => void
}

export interface EventHeaderSlotProps {
  currentMonthYear: string
  currentYear: number
  currentMonth: number
  enabledModes: { label: EventView; value: EventView }[]
  activeView: EventView
  decrement: () => void
  increment: () => void
  updateActiveView: (view: EventView, date?: Date) => void
  setCalendarDate: (date?: Date | string) => void
  onMonthYearChange: (value: string | Date) => void
  selectedMonthDate: string
}

export interface EventPublicProps {
  /** Events to render. Each needs an `id`, a title, and date/time fields. */
  events?: CalendarEvent[]
  /** Whether the events for the visible range are still on their way. */
  loading?: boolean
  /** Behavior overrides, merged over the defaults. */
  config?: Partial<EventConfig>
  /** Replaces the default single-click behavior (opening the popover). */
  onEventClick?: (data: {
    e: React.MouseEvent | MouseEvent | KeyboardEvent
    calendarEvent: CalendarEvent
  }) => void
  /** Replaces the default double-click behavior (opening the edit modal). */
  onEventDblClick?: (data: {
    e: React.MouseEvent | MouseEvent | null
    calendarEvent: CalendarEvent
  }) => void
  /** Replaces the default cell-click behavior (opening the new-event modal). */
  onCellClick?: (data: EventCellClickData) => void
  /** Fired when an event is created through the built-in modal. */
  onCreate?: (event: CalendarEvent) => void
  /** Fired when an event is moved, resized or edited. */
  onUpdate?: (event: CalendarEvent) => void
  /** Fired when an event is deleted. */
  onDelete?: (eventID: CalendarEvent["id"]) => void
  /** Fired when the visible range changes. */
  onRangeChange?: (payload: {
    view: EventView
    startDate: string
    endDate: string
  }) => void
}

export interface EventActions {
  createNewEvent: (event: CalendarEvent) => void
  updateEventState: (event: CalendarEvent) => void
  deleteEvent: (eventID: CalendarEvent["id"]) => void
  handleCellClick: (
    e: React.MouseEvent | MouseEvent,
    date: Date | string,
    time?: string,
    isFullDay?: boolean
  ) => void
  updateActiveView: (value: EventView, date?: Date) => void
  /** Moves the calendar to a date, or to today when none is given. */
  setCalendarDate: (date?: Date | string) => void
  props: EventPublicProps
}

export type GroupedCalendarEvents = Record<string, CalendarEvent[]>

/** The render props every view hands through. */
export interface EventSlots {
  eventPopoverContent?: (props: EventPopoverSlotProps) => React.ReactNode
  eventDescription?: (props: EventRowSlotProps) => React.ReactNode
  eventSuffix?: (props: EventRowSlotProps) => React.ReactNode
  eventParticipant?: (props: EventRowSlotProps) => React.ReactNode
  /** Rewrites the Agenda's day labels — "Oct 15" leading, the weekday after. */
  agendaDayLabel?: (
    date: Date,
    isToday: boolean
  ) => { primary: string; secondary: string }
}
