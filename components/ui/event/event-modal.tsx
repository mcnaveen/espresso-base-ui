"use client"

import * as React from "react"

import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { useEventContext } from "./context"
import { calculateDiff, colorMap, handleSeconds } from "./utils"
import type { CalendarEvent } from "./types"

const COLORS = Object.keys(colorMap)

/**
 * The default edit and create modal: the calendar's own, shown where a host
 * has not replaced cell clicks and double clicks with its own panel.
 */
export function NewEventModal({
  open,
  onOpenChange,
  event,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  event?: CalendarEvent
}) {
  const { actions } = useEventContext("NewEventModal")
  const editing = !!event && Object.prototype.hasOwnProperty.call(event, "id")

  const [form, setForm] = React.useState<CalendarEvent>({})
  const [errorMessage, setErrorMessage] = React.useState("")

  React.useEffect(() => {
    if (!open) return
    setForm({
      title: event?.title || "",
      date: event?.date || "",
      participant: event?.participant || "",
      fromDate: event?.fromDate || "",
      toDate: event?.toDate || "",
      fromTime: (event?.fromTime || "").slice(0, 5),
      toTime: (event?.toTime || "").slice(0, 5),
      venue: event?.venue || "",
      color: event?.color || "green",
      isFullDay: event?.isFullDay || false,
    })
    setErrorMessage("")
  }, [open, event])

  const set = (patch: Partial<CalendarEvent>) =>
    setForm((f) => ({ ...f, ...patch }))

  function validate(next: CalendarEvent): string {
    if (!next.date) return "Date is required"
    if (!next.fromTime && !next.isFullDay) return "Start Time is required"
    if (!next.toTime && !next.isFullDay) return "End Time is required"
    if (
      !next.isFullDay &&
      next.fromTime &&
      next.toTime &&
      calculateDiff(next.fromTime, next.toTime) <= 0
    ) {
      return "Start time must be less than End Time"
    }
    return ""
  }

  function submit() {
    const next: CalendarEvent = {
      ...form,
      fromDate: form.date,
      toDate: form.toDate || form.date,
    }
    const error = validate(next)
    setErrorMessage(error)
    if (error) return

    if (next.isFullDay) {
      next.fromTime = ""
      next.toTime = ""
    } else {
      next.fromTime = handleSeconds(next.fromTime || "")
      next.toTime = handleSeconds(next.toTime || "")
    }

    if (editing) {
      next.id = event!.id
      actions.updateEventState(next)
    } else {
      next.id = "#" + Math.random().toString(36).substring(3, 9)
      actions.createNewEvent(next)
    }
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{editing ? "Edit Event" : "New Event"}</DialogTitle>
        </DialogHeader>
        <div className="grid grid-cols-1 gap-4">
          <div className="flex flex-col gap-2">
            <Label htmlFor="ec-title">Title</Label>
            <Input
              id="ec-title"
              value={String(form.title ?? "")}
              placeholder="Meet with John Doe"
              onChange={(e) => set({ title: e.target.value })}
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="ec-date">Date</Label>
            <Input
              id="ec-date"
              type="date"
              required
              value={String(form.date ?? "")}
              onChange={(e) => set({ date: e.target.value })}
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="ec-person">Person</Label>
            <Input
              id="ec-person"
              value={String(form.participant ?? "")}
              placeholder="John Doe"
              onChange={(e) => set({ participant: e.target.value })}
            />
          </div>
          {!form.isFullDay && (
            <div className="flex flex-col gap-2">
              <Label htmlFor="ec-from">Start Time</Label>
              <Input
                id="ec-from"
                type="time"
                value={String(form.fromTime ?? "")}
                onChange={(e) => set({ fromTime: e.target.value })}
              />
            </div>
          )}
          {!form.isFullDay && (
            <div className="flex flex-col gap-2">
              <Label htmlFor="ec-to">End Time</Label>
              <Input
                id="ec-to"
                type="time"
                value={String(form.toTime ?? "")}
                onChange={(e) => set({ toTime: e.target.value })}
              />
            </div>
          )}
          <div className="flex flex-col gap-2">
            <Label htmlFor="ec-venue">Venue</Label>
            <Input
              id="ec-venue"
              value={String(form.venue ?? "")}
              placeholder="Frappe, Neelkanth Business Park"
              onChange={(e) => set({ venue: e.target.value })}
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label>Color</Label>
            <Select
              value={String(form.color ?? "green")}
              onValueChange={(value) => set({ color: String(value) })}
            >
              <SelectTrigger className="w-full capitalize">
                <span
                  className="size-4 shrink-0 rounded-full shadow-md"
                  style={{
                    backgroundColor: colorMap[String(form.color || "green")]?.color,
                  }}
                />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {COLORS.map((color) => (
                  <SelectItem key={color} value={color} className="capitalize">
                    {color}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <label className="flex items-center gap-2 text-sm">
            <Checkbox
              checked={!!form.isFullDay}
              onCheckedChange={(checked) => set({ isFullDay: !!checked })}
            />
            Full Day Event?
          </label>
          {errorMessage ? (
            <p className="text-sm text-destructive">{errorMessage}</p>
          ) : null}
        </div>
        <DialogFooter>
          <Button className="w-full" onClick={submit}>
            Submit
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
