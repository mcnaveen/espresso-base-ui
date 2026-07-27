"use client"

import * as React from "react"
import { ChevronLeftIcon, ChevronRightIcon } from "lucide-react"
import { addDays, format } from "date-fns"

import { Button } from "@/components/ui/button"
import { ButtonGroup } from "@/components/ui/button-group"
import { Calendar } from "@/components/ui/calendar"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

const MONTH_NAMES = [
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

const YEAR_ITEMS = Array.from({ length: 14 }, (_, i) => {
  const y = String(2017 + i)
  return { label: y, value: y }
})

function DatePicker({
  value,
  defaultValue,
  onValueChange,
  className,
}: {
  value?: Date
  defaultValue?: Date
  onValueChange?: (date: Date) => void
  className?: string
}) {
  const [open, setOpen] = React.useState(false)
  const [internalDate, setInternalDate] = React.useState<Date>(
    defaultValue ?? new Date()
  )
  const date = value ?? internalDate
  const [month, setMonth] = React.useState(date)

  const setDate = (next: Date) => {
    setInternalDate(next)
    setMonth(next)
    onValueChange?.(next)
  }

  const monthItems = MONTH_NAMES.map((m) => ({ label: m, value: m }))

  return (
    <ButtonGroup className={className}>
      <Button
        variant="outline"
        size="icon"
        aria-label="Previous day"
        onClick={() => setDate(addDays(date, -1))}
      >
        <ChevronLeftIcon />
      </Button>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger
          render={
            <Button
              variant="outline"
              className="w-56 justify-start gap-2 font-normal"
            >
              <img src="/images/svg/calender.svg" alt="" className="size-4" />
              <span className="text-foreground">{format(date, "PPP")}</span>
            </Button>
          }
        />
        <PopoverContent className="w-auto p-0" align="start" sideOffset={4}>
          <div className="flex w-max">
            <div className="flex flex-col items-start gap-2 border-r border-border px-3 py-3">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setDate(addDays(new Date(), 1))
                  setOpen(false)
                }}
              >
                Tomorrow
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setDate(addDays(new Date(), 7))
                  setOpen(false)
                }}
              >
                Next week
              </Button>
            </div>
            <Calendar
              mode="single"
              selected={date}
              onSelect={(d) => {
                if (!d) return
                setDate(d)
                setOpen(false)
              }}
              month={month}
              onMonthChange={setMonth}
              className="w-full min-w-[280px] border-0 shadow-none [--cell-size:1.5rem] [&_tbody>tr]:mt-1.5"
              classNames={{
                nav: "pointer-events-none absolute inset-x-0 top-0 flex w-full items-center justify-end gap-1 [&>*]:pointer-events-auto",
              }}
              components={{
                MonthCaption: () => (
                  <div className="flex h-(--cell-size) items-center gap-1.5">
                    <Select
                      items={monthItems}
                      value={MONTH_NAMES[month.getMonth()]}
                      onValueChange={(v) => {
                        if (!v) return
                        const next = new Date(month)
                        next.setMonth(MONTH_NAMES.indexOf(v))
                        setMonth(next)
                      }}
                    >
                      <SelectTrigger variant="ghost" size="sm">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectGroup>
                          {monthItems.map((m) => (
                            <SelectItem key={m.value} value={m.value}>
                              {m.label}
                            </SelectItem>
                          ))}
                        </SelectGroup>
                      </SelectContent>
                    </Select>
                    <Select
                      items={YEAR_ITEMS}
                      value={String(month.getFullYear())}
                      onValueChange={(v) => {
                        if (!v) return
                        const next = new Date(month)
                        next.setFullYear(Number(v))
                        setMonth(next)
                      }}
                    >
                      <SelectTrigger variant="ghost" size="sm">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectGroup>
                          {YEAR_ITEMS.map((y) => (
                            <SelectItem key={y.value} value={y.value}>
                              {y.label}
                            </SelectItem>
                          ))}
                        </SelectGroup>
                      </SelectContent>
                    </Select>
                  </div>
                ),
                Nav: ({
                  className: navClassName,
                  onPreviousClick,
                  onNextClick,
                  previousMonth,
                  nextMonth,
                }) => (
                  <nav className={navClassName}>
                    <Button
                      variant="ghost"
                      size="icon-xs"
                      onClick={(e) => onPreviousClick?.(e)}
                      disabled={!previousMonth}
                      aria-label="Previous month"
                    >
                      <ChevronLeftIcon />
                    </Button>
                    <Button
                      variant="ghost"
                      size="xs"
                      onClick={() => setDate(new Date())}
                    >
                      Today
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon-xs"
                      onClick={(e) => onNextClick?.(e)}
                      disabled={!nextMonth}
                      aria-label="Next month"
                    >
                      <ChevronRightIcon />
                    </Button>
                  </nav>
                ),
              }}
            />
          </div>
        </PopoverContent>
      </Popover>
      <Button
        variant="outline"
        size="icon"
        aria-label="Next day"
        onClick={() => setDate(addDays(date, 1))}
      >
        <ChevronRightIcon />
      </Button>
    </ButtonGroup>
  )
}

export { DatePicker }
