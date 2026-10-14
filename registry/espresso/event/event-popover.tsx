"use client"

import * as React from "react"
import {
  CalendarIcon,
  ClockIcon,
  MapPinIcon,
  PencilIcon,
  Trash2Icon,
  UserIcon,
  XIcon,
} from "lucide-react"

import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { useEventContext } from "./context"
import { parseDateEventPopupFormat } from "./utils"
import type { CalendarEvent, EventPopoverSlotProps } from "./types"

/** The card the default popover shows: the event, read. */
export function EventModalContent({
  calendarEvent,
  date,
  isEditMode,
  onClose,
  onEdit,
  onDelete,
}: {
  calendarEvent: CalendarEvent
  date: Date
  isEditMode?: boolean
  onClose: () => void
  onEdit: (e?: React.MouseEvent) => void
  onDelete: () => void
}) {
  return (
    <div className="w-80 p-4 text-[color:var(--ec-ink-gray-8)]">
      <div className="flex flex-row-reverse gap-2">
        <button
          type="button"
          aria-label="Close"
          className="cursor-pointer"
          onClick={(e) => {
            e.stopPropagation()
            onClose()
          }}
        >
          <XIcon className="size-4" />
        </button>
        {isEditMode && (
          <button
            type="button"
            aria-label="Edit"
            className="cursor-pointer"
            onClick={(e) => {
              e.stopPropagation()
              onEdit(e)
            }}
          >
            <PencilIcon className="size-4" />
          </button>
        )}
        {isEditMode && (
          <button
            type="button"
            aria-label="Delete"
            className="cursor-pointer"
            onClick={(e) => {
              e.stopPropagation()
              onDelete()
            }}
          >
            <Trash2Icon className="size-4" />
          </button>
        )}
      </div>
      <div className="flex flex-col gap-5">
        <div className="flex justify-between text-xl font-semibold">
          <span>{calendarEvent.title || "New Event"}</span>
        </div>
        <div className="flex flex-col gap-4">
          <div className="flex items-center gap-2">
            <CalendarIcon className="size-4" />
            <span className="text-[13px]">{parseDateEventPopupFormat(date)}</span>
          </div>
          {calendarEvent.participant ? (
            <div className="flex items-center gap-2">
              <UserIcon className="size-4" />
              <span className="text-[13px]">{calendarEvent.participant}</span>
            </div>
          ) : null}
          {calendarEvent.fromTime && calendarEvent.toTime ? (
            <div className="flex items-center gap-2">
              <ClockIcon className="size-4" />
              <span className="text-[13px]">
                {calendarEvent.fromTime} - {calendarEvent.toTime}
              </span>
            </div>
          ) : null}
          {calendarEvent.venue ? (
            <div className="flex items-center gap-2">
              <MapPinIcon className="size-4" />
              <span className="text-[13px]">{calendarEvent.venue}</span>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  )
}

/**
 * The popover every drawn event opens — a grid pill, a month pill, an agenda
 * row. Controlled rather than trigger-driven: a single click opens it only
 * after a 200ms wait, so a double click can edit the event instead.
 */
export function EventPopover({
  open,
  onOpenChange,
  side,
  calendarEvent,
  date,
  onOpen,
  onClose,
  onEdit,
  onDelete,
  children,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  side: "left" | "bottom" | "right" | "top"
  calendarEvent: CalendarEvent
  date: Date
  onOpen?: () => void
  onClose?: () => void
  onEdit: (e?: React.MouseEvent) => void
  onDelete: () => void
  children: React.ReactElement
}) {
  const context = useEventContext("EventPopover")
  const slot = context.slots.eventPopoverContent

  const wasOpen = React.useRef(false)
  React.useEffect(() => {
    if (open && !wasOpen.current) onOpen?.()
    if (!open && wasOpen.current) onClose?.()
    wasOpen.current = open
  }, [open, onOpen, onClose])

  const close = React.useCallback(() => onOpenChange(false), [onOpenChange])

  const slotProps: EventPopoverSlotProps = {
    calendarEvent,
    date,
    isEditMode: context.config.isEditMode,
    close,
  }

  return (
    <Popover
      open={open}
      onOpenChange={(value) => {
        // Honoured only on the way down — the click handler owns opening.
        if (!value) onOpenChange(false)
      }}
    >
      <PopoverTrigger
        render={children}
        // The pill's own click handler opens the popover after its wait;
        // Base UI's pointer-driven open would race it.
        onClick={(e: React.MouseEvent) => e.preventDefault()}
        nativeButton={false}
      />
      <PopoverContent side={side} align="center" className="w-auto p-0">
        {slot ? (
          slot(slotProps)
        ) : (
          <EventModalContent
            calendarEvent={calendarEvent}
            date={date}
            isEditMode={context.config.isEditMode}
            onClose={close}
            onEdit={(e) => {
              close()
              onEdit(e)
            }}
            onDelete={() => {
              close()
              onDelete()
            }}
          />
        )}
      </PopoverContent>
    </Popover>
  )
}
