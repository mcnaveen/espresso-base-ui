"use client"

import * as React from "react"

import { cn } from "@/lib/utils"
import { useEventContext } from "./context"
import { EventPopover } from "./event-popover"
import { NewEventModal } from "./event-modal"
import { useEventBase } from "./use-event-base"
import {
  EVENT_HEIGHT_THRESHOLD,
  calculateDiff,
  calculateMinutes,
  convertMinutesToHours,
  formattedDuration,
  paintedEventHeight,
} from "./utils"
import {
  COLUMN_RULE,
  PILL_INSET,
  PILL_MARGIN,
  isAllDayLike,
  shiftEventDays,
  shiftEventMinutes,
  weekLaneGap,
  weekLaneHeight,
  weekLanePitch,
} from "./span"
import type { CalendarEvent, EventRowBar } from "./types"

/** The ring's width, and the pill's corner radius it runs concentric with. */
const CUT = 2
const PILL_RADIUS = 8
const DAY_COLUMNS = 7

const clampMap: Record<number, string> = {
  1: "line-clamp-1",
  2: "line-clamp-2",
  3: "line-clamp-3",
  4: "line-clamp-4",
  5: "line-clamp-5",
  6: "line-clamp-6",
}
const clampClass = (lines: number) =>
  clampMap[Math.min(Math.max(1, Math.floor(lines)), 6)]

/**
 * A timed pill in the Week and Day grids, and the bars of their all-day rows.
 * An overnight event arrives once per day with `segFromTime`/`segToTime`
 * clipped to that day.
 */
export function EventGridPill({
  event,
  date,
  bar,
  narrow,
  inset,
  slotsKey,
}: {
  event: CalendarEvent
  date: Date
  /** Places the card as a bar across a row of day columns. */
  bar?: EventRowBar
  /** Drawn in a week whose columns are narrow. */
  narrow?: boolean
  /** How far inside its column the pill's own edge lands, in pixels. */
  inset?: number
  slotsKey?: string
}) {
  void slotsKey
  const context = useEventContext("EventGridPill")
  const {
    config,
    actions,
    bgStyle,
    isActive,
    preventClick,
    showEventModal,
    setShowEventModal,
    handleEventClick,
    handleEventEdit,
    handleEventDelete,
    registerDeleteShortcut,
    unregisterDeleteShortcut,
  } = useEventBase(event)

  const [isPopoverOpen, setPopoverOpen] = React.useState(false)
  const [isResizing, setResizing] = React.useState(false)
  const [isRepositioning, setRepositioning] = React.useState(false)
  // Pixel offset of the card while dragged, and the move it stands for.
  const [drag, setDrag] = React.useState({ xAxis: 0, yAxis: 0 })
  const dragState = React.useRef({ dayShift: 0, minuteShift: 0, updated: false })

  // The live times while a drag or resize previews the move.
  const [previewTimes, setPreviewTimes] = React.useState<{
    fromTime?: string
    toTime?: string
  } | null>(null)

  const eventRef = React.useRef<HTMLDivElement | null>(null)
  const contentRef = React.useRef<HTMLDivElement | null>(null)
  const titleRef = React.useRef<HTMLParagraphElement | null>(null)
  const timeRef = React.useRef<HTMLParagraphElement | null>(null)

  const minuteHeight = config.hourHeight / 60
  const height15Min = minuteHeight * 15

  const isAllDay = isAllDayLike(event)
  const popoverSide = context.activeView === "Week" ? "left" : "bottom"
  const EventIcon = event.type ? config.eventIcons[event.type] : undefined

  const placedFromTime = () =>
    String(event.segFromTime || event.fromTime || "00:00")
  // While the card is being stretched, the geometry follows the stretch: the
  // wrapper that holds the pill keeps step with the pointer, so the release
  // has nothing to jump between — the Vue original's live mutation, done
  // through the preview.
  const placedToTime = () =>
    String(
      (isResizing && previewTimes?.toTime) ||
        event.segToTime ||
        event.toTime ||
        "00:00"
    )

  const pillInset = inset ?? PILL_INSET
  const wrapperInset = pillInset - PILL_MARGIN

  /** Where a timed pill sits in its column — see the frappe source. */
  const timedBox = React.useCallback(
    function timedBox(
      startMinutes: number,
      minutes: number,
      hall?: number,
      over: CalendarEvent[] = []
    ): {
      top: number
      bottom: number
      height: number
      hallNumber: number
      left: (extra?: number) => string
      right: (extra?: number) => string
    } {
      const height = Math.round(paintedEventHeight(minutes, minuteHeight))
      let top = Math.round(
        Math.min(startMinutes * minuteHeight, 24 * config.hourHeight - height)
      )
      let bottom = top + height
      const beneath = over.map((other) =>
        timedBox(
          other.startTime || 0,
          (other.endTime || 0) - (other.startTime || 0),
          other.hallNumber,
          other.over || []
        )
      )
      for (let moved = true; moved; ) {
        moved = false
        for (const other of beneath) {
          if (other.top <= top && top < other.top + CUT) {
            top = other.top + CUT
            moved = true
          }
          if (other.bottom - CUT < bottom && bottom <= other.bottom) {
            bottom = other.bottom - CUT
            moved = true
          }
        }
      }
      const hallNumber = hall || 0
      return {
        top,
        bottom,
        height: bottom - top,
        hallNumber,
        left: (extra = 0) =>
          `calc(${hallNumber * 20}% + ${pillInset + extra}px)`,
        right: (extra = 0) => `calc(7% + ${hallNumber * 2 * CUT - extra}px)`,
      }
    },
    [minuteHeight, config.hourHeight, pillInset]
  )

  const ownBox = () =>
    timedBox(
      calculateMinutes(placedFromTime()),
      calculateDiff(placedFromTime(), placedToTime()),
      event.hallNumber,
      (event.over || []) as CalendarEvent[]
    )

  /** One cut per event this pill lies on. */
  const cuts = (() => {
    if (isAllDay || isResizing || isRepositioning) return []
    const over = (event.over || []) as CalendarEvent[]
    if (!over.length) return []
    const own = ownBox()
    const ring: React.CSSProperties = {
      top: `${own.top - CUT}px`,
      left: own.left(-CUT),
      right: own.right(CUT),
      height: `${own.height + 2 * CUT}px`,
      borderRadius: `${PILL_RADIUS + CUT}px`,
    }
    return over.map((other) => {
      const box = timedBox(
        other.startTime || 0,
        (other.endTime || 0) - (other.startTime || 0),
        other.hallNumber,
        other.over || []
      )
      const clip = `inset(${box.top}px ${box.right()} calc(100% - ${box.top + box.height}px) ${box.left()} round ${PILL_RADIUS}px)`
      return { id: `${other.id}-${other.hallNumber}-${other.idx}`, clip, ring }
    })
  })()

  const containerStyle: React.CSSProperties = (() => {
    if (bar) {
      const span = bar.endCol - bar.startCol + 1
      return {
        position: "absolute",
        left: `calc(${(bar.startCol / DAY_COLUMNS) * 100}% + ${wrapperInset}px)`,
        width: `calc(${(span / DAY_COLUMNS) * 100}% - ${pillInset * 2 + COLUMN_RULE}px)`,
        top: `${weekLaneGap(narrow) + bar.lane * weekLanePitch(narrow)}px`,
        height: `${weekLaneHeight(narrow)}px`,
        transform: `translate(${drag.xAxis}px, 0)`,
        zIndex: isRepositioning ? 100 : 1,
        transition: isRepositioning ? "none" : "all 0.1s ease",
      }
    }
    if (isAllDay) {
      return {
        transform: `translate(${drag.xAxis}px, ${drag.yAxis}px)`,
        zIndex: isRepositioning ? 100 : (event.idx || 0) + 1,
      }
    }
    const { top, height, hallNumber } = ownBox()
    const dragging = isResizing || isRepositioning
    const box = timedBox(0, 0, hallNumber)
    const left = dragging
      ? `${wrapperInset}px`
      : `calc(${hallNumber * 20}% + ${wrapperInset}px)`
    const right = dragging ? `${PILL_MARGIN}px` : box.right(-PILL_MARGIN)
    return {
      position: "absolute",
      top: `${top}px`,
      left,
      right,
      // The popover trigger merges a w-fit of its own onto this wrapper;
      // spelled inline, the width stays the stretch between the insets.
      width: "auto",
      height: `${height}px`,
      zIndex: dragging ? 100 : 0,
      transform: `translate(${drag.xAxis}px, ${drag.yAxis}px)`,
      transition: dragging ? "none" : "all 0.1s ease",
    }
  })()

  // A timed pill keeps 1px off the top and the bottom, so two events that
  // meet on an hour stay two blocks (the espresso treatment). Across, it
  // takes the whole of the width its wrapper stretches to.
  const timed = !isAllDay
  const innerStyle: React.CSSProperties = {
    ...bgStyle,
    height: timed && !isResizing ? "calc(100% - 2px)" : "100%",
    marginTop: timed ? 1 : undefined,
    marginBottom: timed ? 1 : undefined,
    width: "100%",
    maxWidth: "100%",
    cursor: isRepositioning ? "grabbing" : "pointer",
  }

  const isTight = !!narrow
  const timeLabel = formattedDuration(
    (previewTimes?.fromTime ?? event.fromTime ?? "") as string,
    (previewTimes?.toTime ?? event.toTime ?? "") as string,
    config.timeFormat
  )
  const isCompact =
    !isAllDay &&
    calculateDiff(placedFromTime(), placedToTime()) * minuteHeight <
      EVENT_HEIGHT_THRESHOLD

  /* ── Line clamps and floors, measured ─────────────────────────────────── */

  const [measure, setMeasure] = React.useState({
    contentWidth: 0,
    titleClamp: undefined as string | undefined,
    timeClamp: "line-clamp-1",
    showTitle: true,
    showTime: true,
  })

  const TITLE_FLOOR = isTight ? 20 : 24
  const TIME_FLOOR = 16
  const COMPACT_GAP = 6
  const iconWidth = config.showIcon && EventIcon ? 16 + 8 : 0

  const remeasure = React.useCallback(() => {
    const content = contentRef.current
    const pill = eventRef.current
    if (!content || !pill) return
    const contentWidth = content.clientWidth

    const lineHeightOf = (el: HTMLElement) =>
      parseFloat(getComputedStyle(el).lineHeight)
    const contentHeight = pill.clientHeight - 8 - 2

    let titleClamp: string | undefined
    let timeClamp = "line-clamp-1"
    let titleLines: number | undefined

    if (!isAllDay && titleRef.current && (event.fromTime || event.toTime)) {
      const timeLine = timeRef.current ? lineHeightOf(timeRef.current) : 0
      titleLines = Math.max(
        1,
        Math.floor((contentHeight - timeLine) / lineHeightOf(titleRef.current))
      )
      titleClamp = clampClass(titleLines)
      if (timeRef.current) {
        const titleLine = lineHeightOf(titleRef.current)
        const natural = Math.round(titleRef.current.scrollHeight / titleLine)
        const taken = Math.min(natural, titleLines) * titleLine
        timeClamp = clampClass(
          (contentHeight - taken) / lineHeightOf(timeRef.current)
        )
      }
    }

    let showTitle = true
    let showTime = true
    if (isCompact && contentWidth) {
      showTitle = contentWidth - iconWidth >= TITLE_FLOOR
      if (!showTitle) showTime = false
      else {
        const title = Math.min(
          titleRef.current?.scrollWidth ?? TITLE_FLOOR,
          TITLE_FLOOR
        )
        showTime =
          contentWidth - iconWidth - COMPACT_GAP - title >= TIME_FLOOR
      }
    }

    setMeasure((prev) => {
      const next = { contentWidth, titleClamp, timeClamp, showTitle, showTime }
      return prev.contentWidth === next.contentWidth &&
        prev.titleClamp === next.titleClamp &&
        prev.timeClamp === next.timeClamp &&
        prev.showTitle === next.showTitle &&
        prev.showTime === next.showTime
        ? prev
        : next
    })
  }, [isAllDay, isCompact, event.fromTime, event.toTime, iconWidth, TITLE_FLOOR])

  React.useLayoutEffect(() => {
    remeasure()
  })

  React.useEffect(() => {
    const content = contentRef.current
    if (!content || typeof ResizeObserver === "undefined") return
    const observer = new ResizeObserver(() => remeasure())
    observer.observe(content)
    return () => observer.disconnect()
  }, [remeasure])

  /* ── Resize ───────────────────────────────────────────────────────────── */

  function newEventEndTime(heightPx: number) {
    let end = heightPx / minuteHeight + calculateMinutes(placedFromTime())
    end = Math.floor(end)
    if (end > 1440) end = 1440
    return convertMinutesToHours(end)
  }

  function handleResizeMouseDown(e: React.MouseEvent) {
    e.stopPropagation()
    const pill = eventRef.current
    if (!pill) return
    setResizing(true)
    setRepositioning(false)

    const oldTime = event.toTime
    let latest = event.toTime

    const resize = (ev: MouseEvent) => {
      preventClick.current = true
      if (!eventRef.current) return
      const diff = ev.clientY - eventRef.current.getBoundingClientRect().top
      const height = Math.round(diff / height15Min) * height15Min
      eventRef.current.style.height = height + "px"
      eventRef.current.style.width = "100%"
      const toTime = newEventEndTime(height)
      latest = toTime
      setPreviewTimes({ fromTime: event.fromTime, toTime })
    }

    const stop = () => {
      setResizing(false)
      setPreviewTimes(null)
      if (eventRef.current) {
        // Put back what React rendered, not nothing: React's diff still
        // holds these values, so a blank would never be re-written and the
        // card would shrink to its content.
        eventRef.current.style.height = "calc(100% - 2px)"
        eventRef.current.style.width = "100%"
      }
      if (oldTime !== latest && latest) {
        const next: CalendarEvent = { ...event, toTime: latest }
        if (next.segToTime) next.segToTime = latest
        actions.updateEventState(next)
      }
      window.removeEventListener("mousemove", resize)
    }

    window.addEventListener("mousemove", resize)
    window.addEventListener("mouseup", stop, { once: true })
  }

  /* ── Reposition ───────────────────────────────────────────────────────── */

  function columnWidth(): number {
    const row = eventRef.current?.closest(
      "[data-day-columns]"
    ) as HTMLElement | null
    if (row) return row.clientWidth / DAY_COLUMNS
    return eventRef.current?.clientWidth || 1
  }

  function handleRepositionMouseDown(e: React.MouseEvent) {
    if (!config.isEditMode) return
    if (isResizing) return
    e.preventDefault()
    const prevY = e.clientY
    const pill = eventRef.current
    if (!pill) return
    const rect = pill.getBoundingClientRect()
    const activeView = context.activeView
    dragState.current = { dayShift: 0, minuteShift: 0, updated: false }

    const mousemove = (ev: MouseEvent) => {
      if (isPopoverOpen) setPopoverOpen(false)
      setRepositioning(true)
      preventClick.current = true
      if (!eventRef.current) return

      let xAxis = 0
      let yAxis = 0

      if (activeView === "Week") {
        const width = columnWidth()
        let diff = Math.floor((ev.clientX - rect.left) / width)
        const column = bar ? bar.startCol : new Date(date).getDay()
        diff = Math.max(-column, Math.min(diff, DAY_COLUMNS - 1 - column))
        xAxis = Math.ceil(diff * width)
        dragState.current.dayShift = diff
      }
      if (!isAllDay) {
        let diffY = ev.clientY - prevY
        const parentRect = eventRef.current
          .closest("[data-time-grid]")
          ?.getBoundingClientRect()
        if (parentRect) {
          if (ev.clientY < parentRect.top) diffY = parentRect.top - rect.top
          if (ev.clientY > parentRect.bottom)
            diffY = parentRect.bottom - rect.bottom
          diffY = Math.round(diffY / height15Min) * height15Min
          yAxis = diffY
          dragState.current.minuteShift = Math.round(diffY / minuteHeight)
        }
      }

      setDrag({ xAxis, yAxis })

      // The subtitle previews where the event would land.
      const preview = shiftEventMinutes(
        { ...event },
        dragState.current.minuteShift
      )
      setPreviewTimes({ fromTime: preview.fromTime, toTime: preview.toTime })
      dragState.current.updated =
        dragState.current.dayShift !== 0 || dragState.current.minuteShift !== 0
    }

    const mouseup = (ev: MouseEvent) => {
      ev.preventDefault()
      setRepositioning(false)
      setPreviewTimes(null)
      if (dragState.current.updated) {
        const next = { ...event }
        if (dragState.current.minuteShift)
          shiftEventMinutes(next, dragState.current.minuteShift)
        if (dragState.current.dayShift)
          shiftEventDays(next, dragState.current.dayShift)
        actions.updateEventState(next)
        dragState.current.updated = false
      }
      setDrag({ xAxis: 0, yAxis: 0 })
      dragState.current.dayShift = 0
      dragState.current.minuteShift = 0
      window.removeEventListener("mousemove", mousemove)
      window.removeEventListener("mouseup", mouseup)
    }

    window.addEventListener("mousemove", mousemove)
    window.addEventListener("mouseup", mouseup)
  }

  /* ── Render ───────────────────────────────────────────────────────────── */

  const padClass = isAllDay ? (isTight ? "px-1 py-0.5" : "p-1") : "p-1"

  return (
    <>
      {cuts.map((cut) => (
        <div
          key={cut.id}
          className="ec-cut pointer-events-none absolute inset-0"
          style={{ clipPath: cut.clip }}
        >
          <div
            className="absolute"
            style={{ ...cut.ring, backgroundColor: "var(--ec-surface-base)" }}
          />
        </div>
      ))}
      <EventPopover
        open={isPopoverOpen}
        onOpenChange={setPopoverOpen}
        side={popoverSide}
        calendarEvent={event}
        date={date}
        onOpen={registerDeleteShortcut}
        onClose={unregisterDeleteShortcut}
        onEdit={handleEventEdit}
        onDelete={handleEventDelete}
      >
        <div className="flex" style={containerStyle}>
          <div
            ref={eventRef}
            className={cn(
              "event mx-px shrink-0 overflow-hidden rounded-[8px] transition-all duration-75",
              bar && "h-full",
              isAllDay && !bar && "h-7",
              !isAllDay && "min-h-6",
              isActive && "active",
              bar && !bar.isStart && "rounded-l-none",
              bar && !bar.isEnd && "rounded-r-none",
              !isAllDay && event.segIsEnd === false && "rounded-b-none",
              !isAllDay && event.segIsStart === false && "rounded-t-none",
              !!event.isDraft && "event-draft"
            )}
            style={innerStyle}
            onClick={(e) => {
              e.stopPropagation()
              e.preventDefault()
              handleEventClick(e, () => setPopoverOpen((o) => !o), isPopoverOpen)
            }}
            onDoubleClick={(e) => {
              e.preventDefault()
              handleEventEdit(e)
            }}
            onMouseDown={handleRepositionMouseDown}
          >
            <div className={cn("ec-pad flex h-full gap-1.5", padClass)}>
              {event.fromTime && !isTight ? (
                <div
                  className={cn(
                    "event-border my-px w-[2px] shrink-0 rounded-[8px]",
                    event.isDraft && "invisible"
                  )}
                />
              ) : null}
              <div
                ref={contentRef}
                className={cn(
                  "ec-body relative flex h-full min-w-0 flex-1 gap-2 overflow-hidden select-none",
                  isAllDay ? "items-center" : "items-start"
                )}
              >
                {config.showIcon && EventIcon ? (
                  <div>
                    <EventIcon className="mt-px size-3.5" />
                  </div>
                ) : null}
                <div
                  className={cn(
                    "flex min-w-0 overflow-hidden",
                    isCompact ? "items-baseline gap-1.5" : "w-full flex-col gap-0.5"
                  )}
                >
                  {(!isCompact || measure.showTitle) && (
                    <p
                      ref={titleRef}
                      className={cn(
                        "event-title break-words",
                        isTight
                          ? "text-[12px] leading-4 font-medium"
                          : isCompact || isAllDay
                            ? "text-[13px] leading-5 font-medium"
                            : "text-[13px] leading-snug font-medium",
                        isCompact
                          ? cn(isTight ? "min-w-5" : "min-w-6", "shrink-[100] truncate")
                          : measure.titleClamp,
                        event.isDeclined &&
                          "text-[color:var(--ec-ink-gray-5)]! line-through"
                      )}
                    >
                      {event.title || "[No title]"}
                    </p>
                  )}
                  {!isAllDay && !isTight && (!isCompact || measure.showTime) ? (
                    <p
                      ref={timeRef}
                      className={cn(
                        "event-subtitle text-[12px]",
                        isCompact ? "min-w-4 truncate" : measure.timeClamp
                      )}
                    >
                      {timeLabel}
                    </p>
                  ) : null}
                </div>
              </div>
            </div>
            {config.isEditMode && !isAllDay && event.segIsEnd !== false ? (
              <div
                className="absolute -bottom-1 h-3 w-full cursor-ns-resize"
                onMouseDown={handleResizeMouseDown}
              />
            ) : null}
          </div>
        </div>
      </EventPopover>
      <NewEventModal
        open={showEventModal}
        onOpenChange={setShowEventModal}
        event={event}
      />
    </>
  )
}
