"use client"

import * as React from "react"

import { useEventContext } from "./context"
import {
  popoverGate,
  setActiveEvent,
  useActiveEvent,
} from "./hooks"
import { eventBgStyle, isTargetEditable } from "./utils"
import type { CalendarEvent } from "./types"

/**
 * What every drawn event shares: its colour variables, the click that opens
 * its popover (after the wait that lets a double click edit instead), the
 * edit and delete actions, and the delete shortcut while its popover is up.
 */
export function useEventBase(event: CalendarEvent) {
  const context = useEventContext("Event pill")
  const { config, actions } = context
  const activeEvent = useActiveEvent()

  const preventClick = React.useRef(false)
  const clickTimer = React.useRef<ReturnType<typeof setTimeout> | null>(null)
  const [showEventModal, setShowEventModal] = React.useState(false)

  const eventRefState = React.useRef(event)
  eventRefState.current = event

  const bgStyle = eventBgStyle(event)

  const markActive = React.useCallback(() => {
    setActiveEvent(event.id || event.name || "")
  }, [event.id, event.name])

  const handleEventClick = React.useCallback(
    (
      e: React.MouseEvent,
      togglePopover: () => void,
      isPopoverOpen?: boolean
    ) => {
      popoverGate.open = false
      if (preventClick.current) {
        preventClick.current = false
        return
      }
      if (e.detail !== 1 && e.detail !== 0) return

      const open = () => {
        markActive()
        if (actions.props.onEventClick) {
          actions.props.onEventClick({
            e: e as unknown as MouseEvent,
            calendarEvent: eventRefState.current,
          })
        } else {
          togglePopover()
          popoverGate.open = !isPopoverOpen
        }
      }

      // The wait is for a second click: it is what lets a double click edit
      // instead of open. Where nothing answers a double click there is
      // nothing to wait for.
      if (!actions.props.onEventDblClick && !config.isEditMode) {
        open()
        return
      }
      clickTimer.current = setTimeout(open, 200)
    },
    [actions, config.isEditMode, markActive]
  )

  const handleEventEdit = React.useCallback(
    (e: React.MouseEvent | null = null) => {
      e?.stopPropagation()
      if (clickTimer.current) clearTimeout(clickTimer.current)
      if (actions.props.onEventDblClick) {
        actions.props.onEventDblClick({
          e: e as unknown as MouseEvent | null,
          calendarEvent: eventRefState.current,
        })
        return
      }
      if (!config.isEditMode) return
      setShowEventModal(true)
    },
    [actions, config.isEditMode]
  )

  const handleEventDelete = React.useCallback(() => {
    actions.deleteEvent(eventRefState.current.id)
  }, [actions])

  /** The delete shortcut, live while the event's popover is up. */
  const shortcutLive = React.useRef(false)
  React.useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (!shortcutLive.current) return
      if (e.key !== "Delete" && e.key !== "Backspace") return
      if (isTargetEditable(e)) return
      e.preventDefault()
      handleEventDelete()
    }
    document.addEventListener("keydown", handler)
    return () => document.removeEventListener("keydown", handler)
  }, [handleEventDelete])

  const registerDeleteShortcut = React.useCallback(() => {
    if (!config.isEditMode || !config.enableShortcuts) return
    shortcutLive.current = true
  }, [config.isEditMode, config.enableShortcuts])

  const unregisterDeleteShortcut = React.useCallback(() => {
    shortcutLive.current = false
  }, [])

  const isActive = activeEvent !== "" && activeEvent === (event.id || event.name)

  return {
    config,
    actions,
    bgStyle,
    isActive,
    preventClick,
    showEventModal,
    setShowEventModal,
    markActive,
    handleEventClick,
    handleEventEdit,
    handleEventDelete,
    registerDeleteShortcut,
    unregisterDeleteShortcut,
  }
}
