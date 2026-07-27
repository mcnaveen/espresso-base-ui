"use client"

import * as React from "react"
import { ChevronLeftIcon, ChevronRightIcon } from "lucide-react"
import {
  addDays,
  addMonths,
  differenceInDays,
  endOfMonth,
  format,
  isSameDay,
  isSameMonth,
  startOfMonth,
} from "date-fns"
import type { DateRange } from "react-day-picker"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { ButtonGroup } from "@/components/ui/button-group"
import { Calendar } from "@/components/ui/calendar"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"

function isFullMonthRange(range: { from: Date; to: Date }) {
  return (
    range.from.getDate() === 1 &&
    isSameMonth(range.from, range.to) &&
    isSameDay(endOfMonth(range.from), range.to)
  )
}

function shiftRange(
  range: DateRange | undefined,
  direction: 1 | -1
): DateRange | undefined {
  if (!range?.from || !range?.to) return range

  if (isFullMonthRange({ from: range.from, to: range.to })) {
    const targetMonth = addMonths(range.from, direction)
    return { from: startOfMonth(targetMonth), to: endOfMonth(targetMonth) }
  }

  const amount = direction * (differenceInDays(range.to, range.from) + 1)
  return { from: addDays(range.from, amount), to: addDays(range.to, amount) }
}

function DateRangePicker({
  value,
  defaultValue,
  onValueChange,
  disableFuture = true,
  showOutsideDays = false,
  className,
}: {
  value?: DateRange
  defaultValue?: DateRange
  onValueChange?: (range: DateRange | undefined) => void
  disableFuture?: boolean
  showOutsideDays?: boolean
  className?: string
}) {
  const [open, setOpen] = React.useState(false)
  const [internalRange, setInternalRange] = React.useState<
    DateRange | undefined
  >(defaultValue)
  const range = value ?? internalRange

  const setRange = (next: DateRange | undefined) => {
    setInternalRange(next)
    onValueChange?.(next)
  }

  const nextRange = shiftRange(range, 1)
  const canGoNext =
    !disableFuture || !nextRange?.to || nextRange.to <= new Date()

  return (
    <ButtonGroup className={className}>
      <Button
        variant="outline"
        size="icon"
        aria-label="Previous period"
        disabled={!range?.from || !range?.to}
        onClick={() => setRange(shiftRange(range, -1))}
      >
        <ChevronLeftIcon />
      </Button>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger
          render={
            <Button
              variant="outline"
              className="w-80 justify-start gap-2 font-normal"
            >
              {range?.from && range?.to ? (
                <span className="text-foreground">
                  {format(range.from, "dd/MM/yyyy")} –{" "}
                  {format(range.to, "dd/MM/yyyy")}
                </span>
              ) : (
                <span className="text-card-foreground">
                  Pick a date range
                </span>
              )}
            </Button>
          }
        />
        <PopoverContent className="w-auto p-0" align="center" sideOffset={4}>
          <div className="flex w-max flex-col">
            <Calendar
              mode="range"
              selected={range}
              onSelect={setRange}
              numberOfMonths={2}
              defaultMonth={range?.from ?? new Date()}
              showOutsideDays={showOutsideDays}
              disabled={disableFuture ? { after: new Date() } : undefined}
              className="border-0 shadow-none [--cell-size:1.5rem]"
              classNames={{
                months: cn(
                  "relative flex flex-row items-start",
                  "[&>div+div]:border-l [&>div+div]:border-border [&>div]:px-3.5 [&>div]:py-3"
                ),
                nav: "absolute inset-x-3.5 top-3 flex w-auto items-center justify-between gap-1",
                root: "w-fit p-0!",
              }}
            />
            <div className="flex items-center justify-end gap-2 border-t border-border px-4 py-3.5">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setRange(undefined)}
              >
                Clear
              </Button>
              <Button size="sm" onClick={() => setOpen(false)}>
                Done
              </Button>
            </div>
          </div>
        </PopoverContent>
      </Popover>
      <Button
        variant="outline"
        size="icon"
        aria-label="Next period"
        disabled={!canGoNext}
        onClick={() => setRange(shiftRange(range, 1))}
      >
        <ChevronRightIcon />
      </Button>
    </ButtonGroup>
  )
}

export { DateRangePicker }
