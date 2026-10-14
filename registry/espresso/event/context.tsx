"use client"

import * as React from "react"

import type { EventActions, EventConfig, EventSlots, EventView } from "./types"

export interface EventContextValue {
  config: EventConfig
  actions: EventActions
  activeView: EventView
  slots: EventSlots
}

export const EventContext = React.createContext<EventContextValue | null>(null)

export function useEventContext(component: string): EventContextValue {
  const context = React.useContext(EventContext)
  if (!context) {
    throw new Error(`${component} must be rendered inside <Event>.`)
  }
  return context
}
