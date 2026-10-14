"use client"

import * as React from "react"

import { cn } from "@/lib/utils"
import { useEventContext } from "./context"
import { EventPopover } from "./event-popover"
import { NewEventModal } from "./event-modal"
import { useEventBase } from "./use-event-base"
import type { CalendarEvent, EventRowBar } from "./types"

/**
 * One event in a month cell: a pill in the day's stack, or — given `bar` — a
 * bar laid across the week row.
 */
export function EventMonthPill({
  event,
  date,
  bar,
  dense,
  className,
  style,
  draggable,
  onDragStart,
  onDragEnd,
  onMouseEnter,
  onMouseLeave,
}: {
  event: CalendarEvent
  date: Date
  bar?: EventRowBar
  dense?: boolean
  className?: string
  style?: React.CSSProperties
  draggable?: boolean
  onDragStart?: (e: React.DragEvent) => void
  onDragEnd?: (e: React.DragEvent) => void
  onMouseEnter?: (e: React.MouseEvent) => void
  onMouseLeave?: (e: React.MouseEvent) => void
}) {
  const context = useEventContext("EventMonthPill")
  const {
    config,
    bgStyle,
    isActive,
    showEventModal,
    setShowEventModal,
    handleEventClick,
    handleEventEdit,
    handleEventDelete,
    registerDeleteShortcut,
    unregisterDeleteShortcut,
  } = useEventBase(event)
  void context

  const [isPopoverOpen, setPopoverOpen] = React.useState(false)
  const EventIcon = event.type ? config.eventIcons[event.type] : undefined

  return (
    <>
      <EventPopover
        open={isPopoverOpen}
        onOpenChange={setPopoverOpen}
        side="left"
        calendarEvent={event}
        date={date}
        onOpen={registerDeleteShortcut}
        onClose={unregisterDeleteShortcut}
        onEdit={handleEventEdit}
        onDelete={handleEventDelete}
      >
        <div
          className={cn(
            "event flex overflow-hidden rounded-[8px] transition-all duration-75",
            bar && "ec-bar",
            dense ? "h-5 gap-1 px-1 py-0.5" : "h-7 gap-1.5 px-1 py-1",
            isActive && "active",
            bar && !bar.isStart && "rounded-l-none",
            bar && !bar.isEnd && "rounded-r-none",
            !!event.isDraft && "event-draft",
            className
          )}
          style={{ ...bgStyle, width: bar ? undefined : "100%", ...style }}
          draggable={draggable}
          onDragStart={onDragStart}
          onDragEnd={onDragEnd}
          onMouseEnter={onMouseEnter}
          onMouseLeave={onMouseLeave}
          onClick={(e) => {
            e.stopPropagation()
            handleEventClick(e, () => setPopoverOpen((o) => !o), isPopoverOpen)
          }}
          onDoubleClick={(e) => {
            e.preventDefault()
            handleEventEdit(e)
          }}
        >
          {event.fromTime && !dense ? (
            <div
              className={cn(
                "event-border my-px w-[2px] shrink-0 rounded-[8px]",
                event.isDraft && "invisible"
              )}
            />
          ) : null}
          <div className="ec-pad relative flex h-full min-w-0 flex-1 overflow-hidden">
            <div className="ec-body relative flex h-full min-w-0 items-center gap-2 overflow-hidden select-none">
              {config.showIcon && EventIcon ? (
                <div>
                  <EventIcon className="mt-px size-3.5" />
                </div>
              ) : null}
              <p
                className={cn(
                  "event-title min-w-0 truncate",
                  dense
                    ? "text-[12px] leading-4 font-medium"
                    : "text-[13px] leading-5 font-medium",
                  event.isDeclined &&
                    "text-[color:var(--ec-ink-gray-5)]! line-through",
                  !event.title && "italic"
                )}
              >
                {event.title || "[No title]"}
              </p>
            </div>
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
