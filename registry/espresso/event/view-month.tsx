"use client"

import * as React from "react"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { useEventContext } from "./context"
import { EventMonthPill } from "./month-pill"
import { useNow, useStripScroll } from "./hooks"
import { MORE_BUTTON_CLASS, daysList, parseDate } from "./utils"
import {
  COLUMN_INSET,
  COLUMN_RULE,
  barsInColumn,
  dayEvents,
  daysBetween,
  isSpan,
  layoutRow,
  shiftEventDays,
  weekLaneHeight,
  weekLanePitch,
} from "./span"
import { shortMonth, stripWeeks } from "./month-strip"
import type { CalendarEvent, EventConfig, EventRowBar } from "./types"

/** The date-number strip at the top of every cell. */
const HEADER_HEIGHT = 28
const CELL_INSET = 4
const MIN_CELL_ROWS = 3
const CELL_PAD = 6
/** A week row's floor: a day at its fullest — three rows and the "N more". */
const ROW_FLOOR = 159

interface StripRow {
  key: string
  week: Date[]
  bars: EventRowBar[]
  days: CalendarEvent[][]
  lanes: number[]
}

export function EventMonthly({
  events,
  currentMonth,
  currentYear,
  currentDate,
  jumpDate,
  config,
}: {
  events: CalendarEvent[]
  currentMonth: number
  currentYear: number
  currentDate?: Date
  jumpDate?: Date
  config: EventConfig
}) {
  const { actions } = useEventContext("EventMonthly")
  const scroller = React.useRef<HTMLDivElement | null>(null)
  const [isNarrow, setNarrow] = React.useState(false)
  const [rowHeight, setRowHeight] = React.useState(0)

  const laneHeight = weekLaneHeight(isNarrow)
  const lanePitch = weekLanePitch(isNarrow)
  const cellInset = isNarrow ? COLUMN_INSET : CELL_INSET

  const rows = React.useMemo<StripRow[]>(() => {
    const spans = events.filter(isSpan)
    return stripWeeks(currentMonth, currentYear).map((week) => {
      const { bars } = layoutRow(spans, week)
      return {
        key: parseDate(week[0]),
        week,
        bars,
        days: week.map((date) => dayEvents(events, date)),
        lanes: week.map((_, col) => {
          const inColumn = barsInColumn(bars, col)
          return inColumn.length
            ? Math.max(...inColumn.map((bar) => bar.lane)) + 1
            : 0
        }),
      }
    })
  }, [events, currentMonth, currentYear])

  React.useEffect(() => {
    const el = scroller.current
    if (!el || typeof ResizeObserver === "undefined") return
    const observer = new ResizeObserver(([entry]) => {
      const width = entry?.contentRect.width ?? 0
      setNarrow(!!width && width / 7 < 90)
      setRowHeight((entry?.contentRect.height ?? 0) / Math.max(rows.length, 1))
    })
    observer.observe(el)
    return () => observer.disconnect()
  }, [rows.length])

  /** How many rows a cell can draw under its date. */
  const cellCapacity = React.useMemo(() => {
    if (!isNarrow) return MIN_CELL_ROWS
    const room = rowHeight - HEADER_HEIGHT - CELL_PAD
    const gap = lanePitch - laneHeight
    return Math.max(Math.floor((room + gap) / lanePitch), MIN_CELL_ROWS)
  }, [isNarrow, rowHeight, lanePitch, laneHeight])

  const cellEvents = React.useCallback(
    (row: StripRow, col: number, laneLimit: number) => {
      const days = row.days[col] ?? []
      const lanes = Math.min(row.lanes[col] ?? 0, laneLimit)
      const hiddenBars = barsInColumn(row.bars, col).filter(
        (bar) => bar.lane >= laneLimit
      ).length
      const room = Math.max(cellCapacity - lanes, 0)
      if (!hiddenBars && days.length <= room)
        return { shown: days, hidden: 0, lanes }
      // Wide, a cell keeps its three and says how many more on a line of its
      // own under them — the week's floor has room for it — so six events
      // read as three and "3 more". Narrow, the count takes one of the rows.
      const shown = isNarrow ? Math.max(room - 1, 0) : room
      return {
        shown: days.slice(0, shown),
        hidden: days.length - shown + hiddenBars,
        lanes,
      }
    },
    [cellCapacity, isNarrow]
  )

  const laidOut = React.useMemo(
    () =>
      rows.map((row) => {
        const maxLanes = row.lanes.length ? Math.max(...row.lanes) : 0
        const fits = (limit: number) =>
          row.week.every((_, col) => {
            const lanes = Math.min(row.lanes[col] ?? 0, limit)
            const dropped = (row.lanes[col] ?? 0) > limit
            const needsRow = dropped || !!row.days[col]?.length
            return lanes + (needsRow ? 1 : 0) <= cellCapacity
          })
        let laneLimit = maxLanes
        if (isNarrow) while (laneLimit > 0 && !fits(laneLimit)) laneLimit--
        return {
          ...row,
          shownBars: row.bars.filter((bar) => bar.lane < laneLimit),
          cells: row.week.map((_, col) => cellEvents(row, col, laneLimit)),
        }
      }),
    [rows, cellCapacity, cellEvents, isNarrow]
  )

  const now = useNow()
  const isToday = (date: Date) => parseDate(date) === parseDate(now)
  const dayLabel = (date: Date) =>
    date.getDate() === 1 && !isToday(date)
      ? `${shortMonth(date)} 1`
      : String(date.getDate())

  const openDay = (date: Date) => {
    actions.setCalendarDate(date)
    actions.updateActiveView("Day", date)
  }

  useStripScroll(scroller, currentDate, jumpDate)

  function barStyle(bar: EventRowBar): React.CSSProperties {
    const span = bar.endCol - bar.startCol + 1
    return {
      left: `calc(${(bar.startCol / 7) * 100}% + ${cellInset}px)`,
      width: `calc(${(span / 7) * 100}% - ${cellInset * 2 + COLUMN_RULE}px)`,
      top: `${HEADER_HEIGHT + bar.lane * lanePitch}px`,
      height: `${laneHeight}px`,
    }
  }

  /* ── Drag to move ─────────────────────────────────────────────────────── */

  const [draggingId, setDraggingId] = React.useState<CalendarEvent["id"] | null>(
    null
  )

  /**
   * The bar the pointer is on, as an event: a stay across weeks is one piece
   * per row, and pointing at any of them should light the whole of it —
   * :hover only ever knows the piece.
   */
  const [hoverId, setHoverId] = React.useState<CalendarEvent["id"] | null>(null)

  function dateAtPointer(row: HTMLElement, clientX: number, week: Date[]) {
    const rect = row.getBoundingClientRect()
    const col = Math.floor(((clientX - rect.left) / rect.width) * 7)
    return parseDate(week[Math.max(0, Math.min(6, col))])
  }

  const onDragStart =
    (calendarEvent: CalendarEvent, week: Date[]) => (event: React.DragEvent) => {
      if (!calendarEvent.id) return
      setDraggingId(calendarEvent.id)
      const target = event.target as HTMLElement | null
      if (target) target.style.cursor = "move"
      if (!event.dataTransfer) return
      const row = target?.closest("[data-week-row]") as HTMLElement | null
      event.dataTransfer.dropEffect = "move"
      event.dataTransfer.effectAllowed = "move"
      event.dataTransfer.setData("calendarEventID", String(calendarEvent.id))
      event.dataTransfer.setData(
        "calendarGrabDate",
        row ? dateAtPointer(row, event.clientX, week) : parseDate(week[0])
      )
    }

  const onDrop = (week: Date[]) => (event: React.DragEvent) => {
    const calendarEventID = event.dataTransfer?.getData("calendarEventID")
    const grabDate = event.dataTransfer?.getData("calendarGrabDate")
    if (!calendarEventID || !grabDate) return
    const target = event.target as HTMLElement | null
    if (target) target.style.cursor = "default"
    const calendarEvent = events.find((e) => String(e.id) === calendarEventID)
    if (!calendarEvent) return
    const dropDate = dateAtPointer(
      event.currentTarget as HTMLElement,
      event.clientX,
      week
    )
    const shift = daysBetween(grabDate, dropDate)
    if (!shift) return
    actions.updateEventState(shiftEventDays({ ...calendarEvent }, shift))
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="grid w-full grid-cols-7">
        {daysList.map((day) => (
          <span
            key={day}
            className={cn(
              "inline-flex h-8 items-center justify-center text-[color:var(--ec-ink-gray-6)]",
              isNarrow ? "text-[13px]" : "text-[14px]"
            )}
          >
            {day}
          </span>
        ))}
      </div>

      <div
        ref={scroller}
        className={cn(
          "relative -mt-px min-h-0 flex-1 overflow-y-auto border-[color:var(--ec-outline-gray-1)]",
          config.noBorder ? "border-t" : "rounded-[12px] border"
        )}
      >
        <div className="flex min-h-full flex-col">
          {laidOut.map((row) => (
            <div
              key={row.key}
              className="relative grid min-h-[159px] flex-1 basis-0 grid-cols-7 border-b border-[color:var(--ec-outline-gray-1)] select-none last:border-b-0"
              style={{ minHeight: `${ROW_FLOOR}px` }}
              data-strip-date={row.key}
              data-week-row=""
              onDragOver={(e) => e.preventDefault()}
              onDragEnter={(e) => e.preventDefault()}
              onDrop={onDrop(row.week)}
            >
              {row.week.map((date, col) => (
                <div
                  key={parseDate(date)}
                  className={cn(
                    "flex min-w-0 flex-col border-[color:var(--ec-outline-gray-1)]",
                    col > 0 && "border-l"
                  )}
                  onClick={(e) => actions.handleCellClick(e, date)}
                >
                  <div
                    className={cn(
                      "flex shrink-0 items-center px-[3px] text-[12px]",
                      isNarrow ? "justify-center" : "justify-end"
                    )}
                    style={{ height: `${HEADER_HEIGHT}px` }}
                  >
                    <button
                      type="button"
                      className={cn(
                        "flex h-6 min-w-6 cursor-pointer items-center justify-center rounded-full px-1.5 whitespace-nowrap",
                        isToday(date)
                          ? "bg-[color:var(--ec-surface-red-7)] text-white"
                          : "text-[color:var(--ec-ink-gray-8)] hover:bg-[color:var(--ec-surface-gray-2)]"
                      )}
                      onClick={(e) => {
                        e.stopPropagation()
                        openDay(date)
                      }}
                    >
                      {dayLabel(date)}
                    </button>
                  </div>

                  {row.cells[col].lanes ? (
                    <div
                      className="shrink-0"
                      style={{ height: `${row.cells[col].lanes * lanePitch}px` }}
                    />
                  ) : null}

                  {row.cells[col].shown.length || row.cells[col].hidden ? (
                    <div
                      className={cn(
                        "flex flex-col pb-1.5",
                        isNarrow ? "gap-0.5" : "gap-1"
                      )}
                      style={{ paddingInline: `${cellInset}px` }}
                    >
                      {row.cells[col].shown.map((event) => (
                        <EventMonthPill
                          key={String(event.id)}
                          event={event}
                          date={date}
                          dense={isNarrow}
                          className={cn(
                            "cursor-pointer",
                            draggingId === event.id && "opacity-40"
                          )}
                          draggable={config.isEditMode}
                          onDragStart={onDragStart(event, row.week)}
                          onDragEnd={() => setDraggingId(null)}
                        />
                      ))}
                      {row.cells[col].hidden ? (
                        isNarrow ? (
                          // Narrow, the count alone — "more" truncated to an
                          // ellipsis in a column this tight — and the way to
                          // the day, where the whole of it fits.
                          <Button
                            variant="ghost"
                            size="xs"
                            className={cn(MORE_BUTTON_CLASS, "w-full px-0")}
                            style={{ height: `${laneHeight}px` }}
                            onClick={(e) => {
                              e.stopPropagation()
                              openDay(date)
                            }}
                          >
                            {`+${row.cells[col].hidden}`}
                          </Button>
                        ) : (
                          <div
                            className="flex h-7 items-center px-1.5 text-[12px] text-[color:var(--ec-ink-gray-7)]"
                            style={{ height: `${laneHeight}px` }}
                          >
                            {row.cells[col].hidden} more
                          </div>
                        )
                      ) : null}
                    </div>
                  ) : null}
                </div>
              ))}

              {row.shownBars.map((bar) => (
                <EventMonthPill
                  key={String(bar.event.id)}
                  event={bar.event}
                  date={row.week[bar.startCol]}
                  bar={bar}
                  dense={isNarrow}
                  className={cn(
                    "absolute cursor-pointer",
                    draggingId === bar.event.id && "opacity-40",
                    hoverId != null &&
                      hoverId === bar.event.id &&
                      "ec-hover-all"
                  )}
                  style={barStyle(bar)}
                  draggable={config.isEditMode}
                  onDragStart={onDragStart(bar.event, row.week)}
                  onDragEnd={() => setDraggingId(null)}
                  onMouseEnter={() => setHoverId(bar.event.id ?? null)}
                  onMouseLeave={() =>
                    setHoverId((id) => (id === bar.event.id ? null : id))
                  }
                />
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
