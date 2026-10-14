"use client"

import * as React from "react"

import { cn } from "@/lib/utils"
import { useEventContext } from "./context"
import { EventGridPill } from "./grid-pill"
import { EventTimeMarker } from "./time-marker"
import { useEventData, useHourGrid } from "./hooks"
import { parseDate } from "./utils"
import { PILL_INSET, PILL_MARGIN, eventDays } from "./span"
import type { CalendarEvent, EventConfig } from "./types"

/** The lane's own `gap-x-1`, in pixels — the space between two pills. */
const LANE_GAP = 4

export function EventDaily({
  events,
  currentDate,
  config,
}: {
  events: CalendarEvent[]
  currentDate: Date
  config: EventConfig
}) {
  const { actions } = useEventContext("EventDaily")
  const gridRef = React.useRef<HTMLDivElement | null>(null)
  const { hourHeight, minuteHeight, timeArray, slotTime } = useHourGrid(
    config,
    gridRef
  )
  const { timedEvents, allDayEvents } = useEventData(events, minuteHeight)

  const pillInset = PILL_INSET
  const [isCollapsed, setCollapsed] = React.useState(true)

  const dayFullDayEvents = React.useMemo(() => {
    const day = parseDate(currentDate)
    return allDayEvents.filter((event) => {
      const { start, end } = eventDays(event)
      return start <= day && day <= end
    })
  }, [allDayEvents, currentDate])

  /** How many all-day pills fit on one line; -1 when everything fits. */
  const [laneFits, setLaneFits] = React.useState(-1)
  const [measuring, setMeasuring] = React.useState(true)
  const allDayLane = React.useRef<HTMLDivElement | null>(null)
  const laneWidth = React.useRef(0)

  const measureLane = React.useCallback(() => {
    const lane = allDayLane.current
    if (!lane) return
    const nodes = Array.from(lane.children).filter(
      (node): node is HTMLElement => node instanceof HTMLElement
    )
    const more = nodes.find((node) => node.matches("[data-all-day-more]")) ?? null
    const pills = nodes
      .filter((node) => node !== more)
      .map((pill) => pill.offsetWidth)
    const style = getComputedStyle(lane)
    const width =
      lane.clientWidth -
      parseFloat(style.paddingLeft) -
      parseFloat(style.paddingRight)

    if (width <= 0) {
      requestAnimationFrame(measureLane)
      return
    }

    setMeasuring(false)
    laneWidth.current = width
    if (!pills.length) return

    const whole = pills.reduce((sum, pill, i) => sum + pill + (i ? LANE_GAP : 0), 0)
    if (whole <= width) {
      setLaneFits(-1)
      return
    }

    const room = width - ((more?.offsetWidth ?? 0) + LANE_GAP)
    let used = 0
    let fits = 0
    for (const pill of pills) {
      const next = used + pill + (fits ? LANE_GAP : 0)
      if (next > room) break
      used = next
      fits++
    }
    setLaneFits(Math.max(fits, 1))
  }, [])

  const dayKey = parseDate(currentDate)
  const eventsKey = dayFullDayEvents.map((e) => e.id).join("|")
  React.useEffect(() => {
    setCollapsed(true)
    setMeasuring(true)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dayKey, eventsKey])

  React.useLayoutEffect(() => {
    if (measuring) measureLane()
  }, [measuring, measureLane])

  React.useEffect(() => {
    const lane = allDayLane.current
    if (!lane || typeof ResizeObserver === "undefined") return
    const observer = new ResizeObserver(([entry]) => {
      const width = entry?.contentRect.width ?? 0
      if (Math.abs(width - laneWidth.current) < 1) return
      laneWidth.current = width
      setMeasuring(true)
    })
    observer.observe(lane)
    return () => observer.disconnect()
  }, [])

  const shownFullDayEvents =
    measuring || !isCollapsed || laneFits < 0
      ? dayFullDayEvents
      : dayFullDayEvents.slice(0, laneFits)
  const hiddenFullDayEvents = dayFullDayEvents.length - shownFullDayEvents.length

  return (
    <div
      className={cn(
        "flex flex-1 flex-col overflow-y-auto border-[color:var(--ec-outline-gray-1)]",
        config.noBorder ? "" : "rounded-[12px] border"
      )}
    >
      {/* All-day lane */}
      <div
        className={cn(
          "flex h-fit min-h-[34px] shrink-0",
          !config.noBorder && "border-b border-[color:var(--ec-outline-gray-1)]"
        )}
      >
        <div className="flex w-[72px] shrink-0 justify-center border-r border-[color:var(--ec-outline-gray-1)] pt-1 pl-px">
          <div className="ml-auto mr-[9px] inline-flex h-7 items-center text-[12px] font-[420] text-[color:var(--ec-ink-gray-8)]">
            All day
          </div>
        </div>
        <div
          ref={allDayLane}
          data-all-day-lane=""
          className={cn(
            "flex w-full flex-wrap gap-x-1 gap-y-1 overflow-hidden py-1",
            measuring && "max-h-10"
          )}
          style={{ paddingInline: `${pillInset - PILL_MARGIN}px` }}
          data-date-attr={String(currentDate)}
          onClick={(e) => {
            e.preventDefault()
            actions.handleCellClick(e, currentDate, "", true)
          }}
        >
          {shownFullDayEvents.map((calendarEvent, idx) => (
            <EventGridPill
              key={String(calendarEvent.id)}
              event={{ ...calendarEvent, idx }}
              date={currentDate}
            />
          ))}
          {hiddenFullDayEvents || measuring ? (
            <button
              type="button"
              data-all-day-more=""
              className="mx-px h-auto min-h-7 w-fit shrink-0 cursor-pointer self-stretch rounded-[8px] border border-dashed border-[color:var(--ec-outline-gray-1)] px-2 text-[12px] text-[color:var(--ec-ink-gray-6)]"
              onClick={(e) => {
                e.stopPropagation()
                setCollapsed(false)
              }}
            >
              {`+${hiddenFullDayEvents || dayFullDayEvents.length} more`}
            </button>
          ) : null}
        </div>
      </div>
      <div className="h-full overflow-hidden">
        <div
          ref={gridRef}
          className={cn(
            "flex h-full w-full overflow-scroll",
            config.noBorder && "border-t border-[color:var(--ec-outline-gray-1)]"
          )}
        >
          <div
            className="w-[72px] shrink-0 self-start border-r border-[color:var(--ec-outline-gray-1)]"
            style={{ height: `${24 * hourHeight}px` }}
          />
          <div className="grid h-full w-full grid-cols-1 pb-2">
            <div className="calendar-column relative" data-time-grid="">
              {timeArray.map((time, i) => (
                <div
                  key={time}
                  className="relative flex"
                  data-time-attr={i === 0 ? "" : time}
                  onClick={(e) =>
                    actions.handleCellClick(e, currentDate, slotTime(e, i))
                  }
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
              {(timedEvents[parseDate(currentDate)] ?? []).map((calendarEvent) => (
                <EventGridPill
                  key={String(calendarEvent.id)}
                  event={calendarEvent}
                  date={currentDate}
                  inset={pillInset}
                />
              ))}
              <EventTimeMarker date={currentDate} />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
