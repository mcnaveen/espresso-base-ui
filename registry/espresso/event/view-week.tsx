"use client"

import * as React from "react"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { useEventContext } from "./context"
import { EventGridPill } from "./grid-pill"
import { EventTimeMarker } from "./time-marker"
import { useEventData, useHourGrid, useNow } from "./hooks"
import { MORE_BUTTON_CLASS, daysList, parseDate } from "./utils"
import {
  COLUMN_INSET,
  PILL_INSET,
  barsInColumn,
  layoutRow,
  weekLaneGap,
  weekLaneHeight,
  weekLanePitch,
} from "./span"
import type { CalendarEvent, EventConfig } from "./types"

const NARROW_COLUMN = 64

/** Past three lanes the all-day row folds to two, with a count. */
const COLLAPSE_ABOVE = 3
const COLLAPSED_LANES = 2

export function EventWeekly({
  events,
  weeklyDates,
  config,
}: {
  events: CalendarEvent[]
  weeklyDates: Date[]
  config: EventConfig
}) {
  const { actions } = useEventContext("EventWeekly")
  const gridRef = React.useRef<HTMLDivElement | null>(null)
  const headRef = React.useRef<HTMLDivElement | null>(null)
  const [isCollapsed, setCollapsed] = React.useState(true)
  const [headWidth, setHeadWidth] = React.useState(0)

  React.useEffect(() => {
    const el = headRef.current
    if (!el || typeof ResizeObserver === "undefined") return
    const observer = new ResizeObserver(([entry]) =>
      setHeadWidth(entry?.contentRect.width ?? 0)
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  const isNarrow =
    !!headWidth && headWidth / (weeklyDates.length || 7) < NARROW_COLUMN

  const laneHeight = weekLaneHeight(isNarrow)
  const laneGap = weekLaneGap(isNarrow)
  const lanePitch = weekLanePitch(isNarrow)
  const barInset = isNarrow ? COLUMN_INSET : PILL_INSET

  const { hourHeight, minuteHeight, timeArray, slotTime } = useHourGrid(
    config,
    gridRef
  )
  const { timedEvents, allDayEvents } = useEventData(events, minuteHeight)

  const allDayRow = React.useMemo(
    () => layoutRow(allDayEvents, weeklyDates),
    [allDayEvents, weeklyDates]
  )

  const showCollapsable = allDayRow.laneCount > COLLAPSE_ABOVE
  const visibleLanes =
    showCollapsable && isCollapsed ? COLLAPSED_LANES : allDayRow.laneCount
  const visibleBars = allDayRow.bars.filter((bar) => bar.lane < visibleLanes)
  const hiddenCount = (col: number) =>
    barsInColumn(allDayRow.bars, col).filter((bar) => bar.lane >= visibleLanes)
      .length

  const allDayHeight =
    visibleLanes * lanePitch +
    (visibleLanes < allDayRow.laneCount ? laneGap + laneHeight : 0) +
    laneGap

  const now = useNow()
  const isToday = (date: Date) => parseDate(date) === parseDate(now)
  const nowTop = (now.getHours() * 60 + now.getMinutes()) * minuteHeight
  const todayVisible = weeklyDates.some(isToday)

  return (
    <div className="isolate flex flex-1 flex-col overflow-y-auto">
      {/* Day strip: "Sun 17" on one line; today wears the red tag. */}
      <div className="flex">
        <div className="w-[72px] shrink-0" />
        <div ref={headRef} className="grid w-full grid-cols-7">
          {weeklyDates.map((date) => (
            <span
              key={parseDate(date)}
              className={cn(
                "group pointer-events-none relative flex items-center text-center",
                isNarrow
                  ? "h-12 flex-col gap-0.5 pt-1.5 pb-1 text-[12px]"
                  : "h-8 justify-center text-[14px]",
                isToday(date)
                  ? "gap-2 text-[color:var(--ec-ink-gray-7)]"
                  : "gap-1 text-[color:var(--ec-ink-gray-6)]"
              )}
            >
              <span className={cn(isNarrow && "leading-4")}>
                {daysList[date.getDay()]}
              </span>
              <span
                className={cn(
                  "inline-flex items-center justify-center",
                  isToday(date)
                    ? "h-6 w-[26px] rounded-[6px] bg-[color:var(--ec-surface-red-7)] text-white"
                    : ""
                )}
              >
                {date.getDate()}
              </span>
            </span>
          ))}
        </div>
      </div>

      {/* The box: the rule under the strip sits inside its 32px. */}
      <div
        className={cn(
          "-mt-px flex min-h-0 flex-1 flex-col overflow-hidden border-[color:var(--ec-outline-gray-1)]",
          config.noBorder ? "border-t" : "rounded-[12px] border"
        )}
      >
        {/* All-day row: one band, the gutter's rule at its left. */}
        <div className="flex h-fit min-h-[34px] shrink-0 border-b border-[color:var(--ec-outline-gray-1)]">
          <div className="flex w-[72px] shrink-0 justify-center border-r border-[color:var(--ec-outline-gray-1)] pt-1 pl-px">
            <div
              className="ml-auto mr-[9px] inline-flex leading-[18px] items-center text-[12px] font-[420] text-[color:var(--ec-ink-gray-8)]"
              style={{ height: `${laneHeight}px` }}
            >
              All day
            </div>
          </div>
          <div
            className="relative grid w-full grid-cols-7 overflow-hidden py-2"
            style={{ minHeight: `${allDayHeight}px` }}
            data-day-columns="7"
          >
            {weeklyDates.map((date, col) => (
              <div
                key={parseDate(date)}
                className="cell -my-2 flex w-full flex-col"
                data-date-attr={String(date)}
                onClick={(e) => {
                  e.preventDefault()
                  if (hiddenCount(col)) setCollapsed(false)
                  actions.handleCellClick(e, date, "", true)
                }}
              >
                {hiddenCount(col) ? (
                  <Button
                    variant="ghost"
                    size="xs"
                    className={cn(
                      MORE_BUTTON_CLASS,
                      isNarrow ? "self-stretch px-1" : "w-fit justify-start px-2"
                    )}
                    style={{
                      marginTop: `${visibleLanes * lanePitch + laneGap}px`,
                      marginLeft: `${barInset}px`,
                      marginRight: isNarrow ? `${barInset}px` : undefined,
                      height: `${laneHeight}px`,
                    }}
                    onClick={(e) => {
                      e.stopPropagation()
                      setCollapsed(false)
                    }}
                  >
                    {isNarrow ? `+${hiddenCount(col)}` : `+${hiddenCount(col)} more`}
                  </Button>
                ) : null}
              </div>
            ))}
            {visibleBars.map((bar) => (
              <EventGridPill
                key={String(bar.event.id)}
                event={bar.event}
                date={weeklyDates[bar.startCol]}
                bar={bar}
                narrow={isNarrow}
                inset={barInset}
              />
            ))}
          </div>
        </div>

        <div
          ref={gridRef}
          className="relative flex h-full flex-col overflow-auto"
        >
          <div className="flex">
            {/* The hour gutter, a spacer as tall as the 24 hours beside it. */}
            <div
              className="w-[72px] shrink-0 border-r border-[color:var(--ec-outline-gray-1)]"
              style={{ height: `${24 * hourHeight}px` }}
            />

            <div className="relative z-0 flex w-full flex-col">
              <div
                className={cn(
                  "grid w-full grid-cols-7",
                  todayVisible && "ec-week-grid"
                )}
                data-day-columns="7"
                style={
                  todayVisible
                    ? ({ "--now-top": `${Math.round(nowTop)}px` } as React.CSSProperties)
                    : undefined
                }
              >
                {weeklyDates.map((date, idx) => (
                  <div
                    key={parseDate(date)}
                    className={cn(
                      "relative w-full",
                      idx === 0 && "calendar-column",
                      idx !== weeklyDates.length - 1 &&
                        "border-r border-[color:var(--ec-outline-gray-1)]"
                    )}
                    data-date-attr={String(date)}
                    data-time-grid=""
                  >
                    {timeArray.map((time, i) => (
                      <div
                        key={time}
                        className="cell relative flex"
                        data-time-attr={i === 0 ? "" : time}
                        onClick={(e) => {
                          e.preventDefault()
                          actions.handleCellClick(e, date, slotTime(e, i))
                        }}
                      >
                        <div
                          className={cn(
                            "w-full",
                            i !== timeArray.length - 1 &&
                              "border-b border-[color:var(--ec-outline-gray-1)]"
                          )}
                          style={{ height: `${hourHeight}px` }}
                        />
                      </div>
                    ))}

                    {(timedEvents[parseDate(date)] ?? []).map((calendarEvent) => (
                      <EventGridPill
                        key={`${calendarEvent.id}-${calendarEvent.date}`}
                        event={calendarEvent}
                        date={date}
                        narrow={isNarrow}
                        inset={barInset}
                      />
                    ))}

                    <EventTimeMarker date={date} />
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
