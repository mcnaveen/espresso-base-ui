"use client"

import * as React from "react"
import { ChevronLeft, ChevronRight } from "lucide-react"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"

const monthNames = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
]

/**
 * Calendar whose caption is a button: clicking it swaps the month grid for a
 * two-column scrollable year/month picker sized to match the calendar.
 * Picking a year keeps the picker open; picking a month returns to the grid.
 */
export function MonthYearCalendar({
  className,
  ...props
}: React.ComponentProps<typeof Calendar>) {
  const [internalMonth, setInternalMonth] = React.useState<Date>(
    () => (props.defaultMonth as Date | undefined) ?? new Date()
  )
  const month = (props.month as Date | undefined) ?? internalMonth
  const setMonth = (next: Date) => {
    setInternalMonth(next)
    props.onMonthChange?.(next)
  }
  const [pickerOpen, setPickerOpen] = React.useState(false)
  const [panelSize, setPanelSize] = React.useState<{
    width: number
    height: number
  } | null>(null)
  const wrapRef = React.useRef<HTMLDivElement>(null)
  const yearRef = React.useRef<HTMLButtonElement>(null)
  const monthRef = React.useRef<HTMLButtonElement>(null)

  const years = Array.from({ length: 14 }, (_, i) => 2017 + i)

  React.useEffect(() => {
    if (pickerOpen) {
      yearRef.current?.scrollIntoView({ block: "center" })
      monthRef.current?.scrollIntoView({ block: "center" })
    }
  }, [pickerOpen])

  const openPicker = () => {
    const rect = wrapRef.current?.getBoundingClientRect()
    if (rect) setPanelSize({ width: rect.width, height: rect.height })
    setPickerOpen(true)
  }

  const captionButton = (
    <Button
      variant="ghost"
      size="xs"
      className="text-sm font-medium"
      onClick={() => (pickerOpen ? setPickerOpen(false) : openPicker())}
    >
      {monthNames[month.getMonth()]} {month.getFullYear()}
    </Button>
  )

  if (pickerOpen) {
    return (
      <div
        className="flex flex-col [--cell-size:1.5rem]"
        style={panelSize ?? { width: 180, height: 210 }}
      >
        <div className="flex h-(--cell-size) shrink-0 items-center">
          {captionButton}
        </div>
        <div className="mt-1.5 flex min-h-0 flex-1 gap-1">
          <div className="scrollbar-hide flex flex-1 flex-col gap-0.5 overflow-y-auto [animation:scroll-fade-y_linear_both] [animation-timeline:scroll(self)]">
            {years.map((year) => (
              <Button
                key={year}
                ref={year === month.getFullYear() ? yearRef : undefined}
                variant="ghost"
                size="sm"
                onClick={() => setMonth(new Date(year, month.getMonth(), 1))}
                className={cn(
                  "shrink-0 justify-start text-sm",
                  year === month.getFullYear() && "bg-secondary"
                )}
              >
                {year}
              </Button>
            ))}
          </div>
          <div className="scrollbar-hide flex flex-1 flex-col gap-0.5 overflow-y-auto [animation:scroll-fade-y_linear_both] [animation-timeline:scroll(self)]">
            {monthNames.map((name, index) => (
              <Button
                key={name}
                ref={index === month.getMonth() ? monthRef : undefined}
                variant="ghost"
                size="sm"
                onClick={() => {
                  setMonth(new Date(month.getFullYear(), index, 1))
                  setPickerOpen(false)
                }}
                className={cn(
                  "shrink-0 justify-start text-sm",
                  index === month.getMonth() && "bg-secondary"
                )}
              >
                {name}
              </Button>
            ))}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div ref={wrapRef} className="w-fit">
      <Calendar
        {...props}
        month={month}
        onMonthChange={setMonth}
        // the popover hosting it already carries the padding
        className={cn("p-0", className)}
        components={{
          MonthCaption: () => (
            <div className="flex h-(--cell-size) items-center">
              {captionButton}
            </div>
          ),
          Nav: ({ className: navClassName }) => (
            // the nav strip spans the whole header; let clicks pass through
            // to the caption button underneath except on the nav buttons
            <div
              className={cn(
                navClassName,
                // match the caption row height so the nav buttons stay
                // vertically centered at any --cell-size
                "pointer-events-none h-(--cell-size) [&>*]:pointer-events-auto"
              )}
            >
              <Button
                variant="ghost"
                size="icon-xs"
                aria-label="Previous month"
                onClick={() =>
                  setMonth(new Date(month.getFullYear(), month.getMonth() - 1, 1))
                }
              >
                <ChevronLeft />
              </Button>
              <Button
                variant="ghost"
                size="xs"
                className="text-sm"
                onClick={() => setMonth(new Date())}
              >
                Today
              </Button>
              <Button
                variant="ghost"
                size="icon-xs"
                aria-label="Next month"
                onClick={() =>
                  setMonth(new Date(month.getFullYear(), month.getMonth() + 1, 1))
                }
              >
                <ChevronRight />
              </Button>
            </div>
          ),
        }}
      />
    </div>
  )
}
