"use client"

/**
 * The event side panel, to the playground's file: 352 wide, full height
 * beside the grid, sections divided by a hairline inset 20 either side.
 * Every field is `sm` and ghost. An event that exists is live — each change
 * saves itself; Create is only for the one being made.
 */
import * as React from "react"
import {
  CheckIcon,
  ChevronDownIcon,
  GlobeIcon,
  MapPinIcon,
  Trash2Icon,
  VideoIcon,
  XIcon,
} from "lucide-react"

import { cn } from "@/lib/utils"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { MonthYearCalendar } from "@/components/ui/event/month-year-calendar"
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Input } from "@/components/ui/input"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { Tabs, TabsIndicator, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Textarea } from "@/components/ui/textarea"
import type { CalendarEvent } from "@/components/ui/event"

import { DateIcon } from "./icons"
import { faceFor, people } from "./sample-events"
import type { CalendarDraft } from "./drag"

const COLOURS = ["gray", "blue", "green", "amber", "red", "violet"] as const

/** The swatch's own fill: the card's ink, which is what names the calendar. */
const DOT: Record<string, string> = {
  gray: "var(--ec-ink-gray-6, oklch(0.439 0 0))",
  blue: "var(--ec-ink-blue, oklch(0.587 0.174 252.167))",
  green: "var(--ec-ink-green, oklch(0.57 0.119 158.092))",
  amber: "var(--ec-ink-amber, oklch(0.659 0.142 67.548))",
  red: "var(--ec-ink-red, oklch(0.556 0.198 26.552))",
  violet: "var(--ec-ink-violet, oklch(0.545 0.18 287.523))",
}

const TAG_THEMES = [
  "text-blue-700 bg-blue-100",
  "text-green-700 bg-green-100",
  "text-amber-700 bg-amber-100",
  "text-red-700 bg-red-100",
  "text-violet-700 bg-violet-100",
  "text-gray-600 bg-gray-100",
]
const TAG_OPTIONS = [
  "Design",
  "Engineering",
  "Marketing",
  "Sales",
  "Research",
  "Urgent",
].map((label, i) => ({ label, value: label.toLowerCase(), theme: TAG_THEMES[i] }))

const tagTheme = (label: string) => {
  const known = TAG_OPTIONS.find((o) => o.label === label)
  if (known) return known.theme
  let n = 0
  for (const ch of label) n = (n * 31 + ch.charCodeAt(0)) % 997
  return TAG_THEMES[n % TAG_THEMES.length]
}

const ORGS = [
  { label: "Cooper", value: "cooper", logo: "/images/kanban/logo-evergreen.png" },
  { label: "Dropbox", value: "dropbox", logo: "/images/kanban/logo-hourglass.png" },
]

const hhmm = (t?: unknown) => (t ? String(t).slice(0, 5) : "")
const CLOCK_STEP = 15

const clock = (t?: string) =>
  t
    ? new Date(`2000-01-01T${t}`)
        .toLocaleTimeString("en-US", {
          hour: "numeric",
          minute: "2-digit",
          hour12: true,
        })
        .toLowerCase()
    : ""

const pretty = (iso?: string) =>
  iso
    ? new Date(`${iso}T00:00`).toLocaleDateString(undefined, {
        weekday: "short",
        month: "short",
        day: "numeric",
      })
    : ""

const TIMES = Array.from({ length: (24 * 60) / CLOCK_STEP }, (_, i) => {
  const mins = i * CLOCK_STEP
  const value = `${String(Math.floor(mins / 60)).padStart(2, "0")}:${String(mins % 60).padStart(2, "0")}`
  return { label: clock(value), value }
})

const minutesOf = (t: string) => {
  const [h, m] = t.split(":").map(Number)
  return (h || 0) * 60 + (m || 0)
}
const asClock = (mins: number) => {
  const m = Math.max(0, Math.min(24 * 60 - CLOCK_STEP, mins))
  return `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`
}

const rowLabel = "w-[90px] shrink-0 text-[14px] text-[color:var(--ec-ink-gray-6)]"
const ghostField =
  "flex h-7 w-full min-w-0 items-center gap-2 rounded-[8px] px-2 text-[14px] text-[color:var(--ec-ink-gray-7)] transition-colors hover:bg-[color:var(--ec-surface-gray-2)]"

function PersonFace({ name, className }: { name: string; className?: string }) {
  const image = faceFor(name)
  return (
    <Avatar size="xs" className={cn("size-4 shrink-0", className)}>
      {image ? <AvatarImage src={image} alt={name} /> : null}
      <AvatarFallback className="text-[8px]">{name[0]}</AvatarFallback>
    </Avatar>
  )
}

export function EventPanel({
  event,
  draft,
  kind,
  titleModel,
  colourModel,
  onTitleModel,
  onColourModel,
  onDraftChange,
  onClose,
  onCreate,
  onSave,
  onDelete,
}: {
  event: CalendarEvent | null
  draft?: CalendarDraft | null
  kind?: "Event" | "Task"
  titleModel?: string
  colourModel?: string
  onTitleModel: (value: string) => void
  onColourModel: (value: string) => void
  onDraftChange: (value: CalendarDraft) => void
  onClose: () => void
  onCreate: (event: CalendarEvent) => void
  onSave: (event: CalendarEvent) => void
  onDelete: (id: string | number | undefined) => void
}) {
  const creating = !event
  const [tab, setTab] = React.useState<string>(kind ?? "Event")
  const [confirmingDelete, setConfirmingDelete] = React.useState(false)
  const deleteKind = event?.type === "task" ? "task" : "event"

  React.useEffect(() => {
    setTab(kind ?? "Event")
  }, [kind])

  /* ── The span the panel is working on ─────────────────────────────────── */

  const source = React.useMemo(
    () =>
      event
        ? {
            fromDate: String(event.fromDate ?? ""),
            toDate: String(event.toDate ?? event.fromDate ?? ""),
            fromTime: String(event.fromTime ?? ""),
            toTime: String(event.toTime ?? ""),
            allDay: !!event.isFullDay,
          }
        : (draft ?? null),
    // Seeded from whatever opened the panel; the rows hold their own copy.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [event?.id, !!draft]
  )

  const [allDay, setAllDay] = React.useState(false)
  const [span, setSpan] = React.useState({
    fromDate: "",
    toDate: "",
    fromTime: "",
    toTime: "",
  })

  React.useEffect(() => {
    setAllDay(!!source?.allDay)
    setSpan({
      fromDate: source?.fromDate || "",
      toDate: source?.toDate || source?.fromDate || "",
      fromTime: hhmm(source?.fromTime),
      toTime: hhmm(source?.toTime),
    })
  }, [source])

  // The grid's rows moving the block: the draft follows the panel's edits.
  const draftFollows = React.useRef(false)
  React.useEffect(() => {
    if (!draftFollows.current) {
      draftFollows.current = true
      return
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [span, allDay])

  /* ── Title and colour ─────────────────────────────────────────────────── */

  const [ownTitle, setOwnTitle] = React.useState("")
  React.useEffect(() => {
    setOwnTitle(String(event?.title ?? ""))
  }, [event])
  const title = event ? ownTitle : (titleModel ?? "")

  const [picked, setPicked] = React.useState<string | null>(null)
  React.useEffect(() => setPicked(null), [event])

  const nameOfColour = (v: unknown) => {
    const s = String(v ?? "gray")
    return (COLOURS as readonly string[]).includes(s) ? s : "gray"
  }
  const chosenColour =
    picked ?? (event ? nameOfColour(event.color) : (colourModel ?? "gray"))

  /* ── Other fields ─────────────────────────────────────────────────────── */

  const behaviourDefaults: Record<string, string> = {
    Repeat: "None",
    Alert: "None",
    Occupancy: "Busy",
    Visibility: "Default",
  }
  const [behaviour, setBehaviour] = React.useState(behaviourDefaults)
  const taskDefaults: Record<string, string> = {
    Backlog: "Backlog",
    Priority: "Medium",
  }
  const [taskFields, setTaskFields] = React.useState(taskDefaults)
  const taskOptions: Record<string, string[]> = {
    Backlog: ["Backlog", "Todo", "In progress", "Done", "Cancelled"],
    Priority: ["Low", "Medium", "High", "Urgent"],
  }
  const behaviourOptions: Record<string, string[]> = {
    Repeat: ["None", "Daily", "Weekly", "Monthly"],
    Alert: ["None", "10 min before", "30 min before", "1 hour before"],
    Occupancy: ["Busy", "Free"],
    Visibility: ["Default", "Public", "Private"],
  }
  const asTabs = ["Occupancy", "Visibility"]

  const [assignee, setAssignee] = React.useState("")
  const [tags, setTags] = React.useState<string[]>([])
  const [organisation, setOrganisation] = React.useState("")
  const [link, setLink] = React.useState("")
  const [attendees, setAttendees] = React.useState<string[]>([])
  const [meet, setMeet] = React.useState("")
  const [location, setLocation] = React.useState("")
  const [description, setDescription] = React.useState("")

  React.useEffect(() => {
    setAttendees(
      event?.participant
        ? String(event.participant)
            .split(",")
            .map((v) => v.trim())
            .filter(Boolean)
        : []
    )
    setLocation(String(event?.venue ?? ""))
    setDescription(String(event?.description ?? ""))
  }, [event])

  /* ── Save / create ────────────────────────────────────────────────────── */

  const todayIso = () => {
    const d = new Date()
    const p = (n: number) => String(n).padStart(2, "0")
    return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`
  }

  const stateRef = React.useRef({
    span,
    allDay,
    title,
    chosenColour,
    attendees,
    location,
    description,
    tab,
  })
  stateRef.current = {
    span,
    allDay,
    title,
    chosenColour,
    attendees,
    location,
    description,
    tab,
  }

  const save = React.useCallback(() => {
    const s = stateRef.current
    onSave({
      id: event?.id,
      title: s.title,
      fromDate: s.span.fromDate,
      toDate: s.span.toDate,
      fromTime: s.allDay ? undefined : s.span.fromTime,
      toTime: s.allDay ? undefined : s.span.toTime,
      isFullDay: s.allDay,
      type: event?.type,
      color: s.chosenColour,
      participant: s.attendees.join(", "),
      venue: s.location,
      description: s.description,
    })
  }, [event?.id, event?.type, onSave])

  /** Every field runs through `touch`: a made event saves as it changes. */
  const touch = React.useCallback(() => {
    if (event) requestAnimationFrame(save)
  }, [event, save])

  const push = (nextSpan = span, nextAllDay = allDay) => {
    touch()
    if (nextSpan.fromDate)
      onDraftChange({ ...nextSpan, allDay: nextAllDay })
  }

  const submit = () => {
    const s = stateRef.current
    onCreate({
      title: s.title || `New ${s.tab.toLowerCase()}`,
      fromDate: s.span.fromDate || todayIso(),
      toDate: s.span.toDate || s.span.fromDate || todayIso(),
      fromTime: s.allDay ? undefined : s.span.fromTime,
      toTime: s.allDay ? undefined : s.span.toTime,
      isFullDay: s.allDay,
      type: s.tab.toLowerCase(),
      color: s.chosenColour,
      participant: s.attendees.join(", "),
      venue: s.location,
      description: s.description,
    })
  }

  const setFromTime = (value: string) => {
    const length = Math.max(
      CLOCK_STEP,
      minutesOf(span.toTime) - minutesOf(span.fromTime)
    )
    const next = {
      ...span,
      fromTime: value,
      toTime: asClock(minutesOf(value) + length),
    }
    setSpan(next)
    push(next)
  }

  const setToTime = (value: string) => {
    const next = {
      ...span,
      toTime:
        minutesOf(value) > minutesOf(span.fromTime)
          ? value
          : asClock(minutesOf(span.fromTime) + CLOCK_STEP),
    }
    setSpan(next)
    push(next)
  }

  const [datesOpen, setDatesOpen] = React.useState(false)
  const dateLabel =
    span.toDate && span.toDate !== span.fromDate
      ? `${pretty(span.fromDate)} – ${pretty(span.toDate)}`
      : pretty(span.fromDate)

  const iso = (d: Date) => {
    const p = (n: number) => String(n).padStart(2, "0")
    return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`
  }

  /* ── Render ───────────────────────────────────────────────────────────── */

  const divider = (
    <div className="mx-5 shrink-0 border-t border-[color:var(--ec-outline-gray-1)]" />
  )

  const rowSelect = (
    label: string,
    value: string,
    options: string[],
    onChange: (v: string) => void
  ) => (
    <div key={label} className="flex h-10 items-center gap-3.5 px-5">
      <span className={rowLabel}>{label}</span>
      <Select
        value={value}
        onValueChange={(v) => {
          onChange(String(v))
          touch()
        }}
      >
        <SelectTrigger variant="ghost" size="sm" className="h-7 w-full flex-1">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {options.map((option) => (
            <SelectItem key={option} value={option}>
              {option}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )

  return (
    <aside className="ec-scope flex h-full w-[352px] shrink-0 flex-col overflow-y-auto border-l border-[color:var(--ec-outline-gray-1)] bg-[color:var(--ec-surface-base)]">
      {/* Header, 54 tall */}
      <header className="flex shrink-0 items-center gap-1 px-5 py-[18px]">
        <h2 className="mr-2 min-w-0 flex-1 truncate text-[16px] font-medium text-[color:var(--ec-ink-gray-7)]">
          {creating ? `New ${tab}` : "Event detail"}
        </h2>
        {!creating && (
          <Button
            size="icon-sm"
            variant="ghost"
            aria-label="Delete event"
            onClick={() => setConfirmingDelete(true)}
          >
            <Trash2Icon />
          </Button>
        )}
        <Button size="icon-sm" variant="ghost" aria-label="Close" onClick={onClose}>
          <XIcon />
        </Button>
      </header>

      {/* Event / Task, underlined */}
      <Tabs
        value={tab}
        onValueChange={(v) => setTab(String(v))}
        className="mt-[2px] shrink-0"
      >
        {/* pl-3: the trigger carries 8px of its own, so the list gives 12
            and the tab's E stands on the heading's E at 20. */}
        <TabsList
          variant="line"
          className="w-full justify-start gap-5 pr-5 pl-3"
        >
          <TabsIndicator />
          <TabsTrigger value="Event" className="flex-none">
            Event
          </TabsTrigger>
          <TabsTrigger value="Task" className="flex-none">
            Task
          </TabsTrigger>
        </TabsList>
      </Tabs>

      {/* ── When ─────────────────────────────────────────────────────────── */}
      <div className="flex flex-col pt-5 pb-2.5">
        <div className="flex items-center gap-1 pb-1.5 pr-5 pl-3">
          <DropdownMenu>
            <DropdownMenuTrigger
              render={
                <Button size="icon-sm" variant="ghost" aria-label={`Colour: ${chosenColour}`}>
                  <span
                    className="block rounded-[4px]"
                    style={{
                      width: 12,
                      height: 12,
                      backgroundColor: DOT[chosenColour] ?? DOT.amber,
                    }}
                  />
                </Button>
              }
            />
            <DropdownMenuContent align="start">
              {COLOURS.map((c) => (
                <DropdownMenuItem
                  key={c}
                  onClick={() => {
                    setPicked(c)
                    if (!event) onColourModel(c)
                    touch()
                  }}
                >
                  <span
                    className="block shrink-0 rounded-[4px]"
                    style={{ width: 12, height: 12, backgroundColor: DOT[c] }}
                  />
                  {c[0].toUpperCase() + c.slice(1)}
                  {chosenColour === c ? (
                    <CheckIcon className="ml-auto size-4 text-[color:var(--ec-ink-gray-6)]" />
                  ) : null}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
          <Input
            variant="ghost"
            size="sm"
            value={title}
            placeholder={`${tab} Title`}
            className="min-w-0 flex-1"
            onChange={(e) => {
              if (event) setOwnTitle(e.target.value)
              else onTitleModel(e.target.value)
              touch()
            }}
          />
        </div>

        <div className="flex h-9 items-center gap-3 py-1 pr-[29px] pl-5">
          <label className="flex items-center gap-2 text-[14px] text-[color:var(--ec-ink-gray-7)]">
            <Switch
              size="sm"
              checked={allDay}
              onCheckedChange={(value) => {
                setAllDay(!!value)
                touch()
                if (span.fromDate) onDraftChange({ ...span, allDay: !!value })
              }}
            />
            All day
          </label>
          <span className="ml-auto flex items-center gap-1.5 text-[14px] text-[color:var(--ec-ink-gray-5)]">
            <GlobeIcon className="size-4 shrink-0" />
            GMT+5:30
          </span>
        </div>

        <div className="flex h-10 items-center gap-3.5 px-5">
          <span className={rowLabel}>Date</span>
          <Popover open={datesOpen} onOpenChange={setDatesOpen}>
            <PopoverTrigger
              render={
                <button type="button" aria-label="Date" className={cn(ghostField, "w-full flex-1 pl-[9px]")}>
                  <span
                    className={cn(
                      "truncate",
                      !dateLabel && "text-[color:var(--ec-ink-gray-4)]"
                    )}
                  >
                    {dateLabel || "Pick a date"}
                  </span>
                  <DateIcon className="ml-auto size-4 shrink-0 text-[color:var(--ec-ink-gray-4)]" />
                </button>
              }
            />
            <PopoverContent align="start" className="w-auto p-2">
              <MonthYearCalendar
                mode="range"
                defaultMonth={
                  span.fromDate ? new Date(span.fromDate + "T00:00") : undefined
                }
                selected={
                  span.fromDate
                    ? {
                        from: new Date(span.fromDate + "T00:00"),
                        to: new Date((span.toDate || span.fromDate) + "T00:00"),
                      }
                    : undefined
                }
                onSelect={(range) => {
                  if (!range?.from) return
                  const next = {
                    ...span,
                    fromDate: iso(range.from),
                    toDate: iso(range.to ?? range.from),
                  }
                  setSpan(next)
                  push(next)
                  if (range.to && range.to.getTime() !== range.from.getTime())
                    setDatesOpen(false)
                }}
              />
            </PopoverContent>
          </Popover>
        </div>

        {!allDay && (
          <div className="flex h-10 items-center gap-3.5 px-5">
            <span className={rowLabel}>Time</span>
            <div className="flex min-w-0 flex-1 gap-2">
              <Select value={span.fromTime} onValueChange={(v) => setFromTime(String(v))}>
                <SelectTrigger
                  variant="ghost"
                  size="sm"
                  className="h-7 min-w-0 flex-1"
                  aria-label="Start time"
                >
                  <SelectValue>
                    {(value: string | null) =>
                      value ? (
                        clock(value)
                      ) : (
                        <span className="text-[color:var(--ec-ink-gray-4)]">Start</span>
                      )
                    }
                  </SelectValue>
                </SelectTrigger>
                <SelectContent
                  alignItemWithTrigger={false}
                  align="start"
                  className="max-h-[232px] w-[120px]"
                >
                  {TIMES.map((t) => (
                    <SelectItem key={t.value} value={t.value}>
                      {t.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={span.toTime} onValueChange={(v) => setToTime(String(v))}>
                <SelectTrigger
                  variant="ghost"
                  size="sm"
                  className="h-7 min-w-0 flex-1"
                  aria-label="End time"
                >
                  <SelectValue>
                    {(value: string | null) =>
                      value ? (
                        clock(value)
                      ) : (
                        <span className="text-[color:var(--ec-ink-gray-4)]">End</span>
                      )
                    }
                  </SelectValue>
                </SelectTrigger>
                <SelectContent
                  alignItemWithTrigger={false}
                  align="start"
                  className="max-h-[232px] w-[120px]"
                >
                  {TIMES.map((t) => (
                    <SelectItem key={t.value} value={t.value}>
                      {t.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        )}
      </div>

      {divider}

      {/* ── How it behaves ───────────────────────────────────────────────── */}
      <div className="flex flex-col py-2.5">
        {tab === "Task" && (
          <div className="flex h-10 items-center gap-3.5 px-5">
            <span className={rowLabel}>Assignee</span>
            <Select value={assignee} onValueChange={(v) => { setAssignee(String(v)); touch() }}>
              <SelectTrigger variant="ghost" size="sm" className="h-7 w-full flex-1">
                <SelectValue>
                  {(value: string | null) =>
                    value ? (
                      <span className="flex items-center gap-2">
                        <PersonFace name={value} />
                        {value}
                      </span>
                    ) : (
                      <span className="text-[color:var(--ec-ink-gray-4)]">Unassigned</span>
                    )
                  }
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {people.map((p) => (
                  <SelectItem key={p.value} value={p.label}>
                    <span className="flex items-center gap-2">
                      <PersonFace name={p.label} />
                      {p.label}
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        {tab === "Task" && (
          <div className="flex min-h-10 items-start gap-3.5 px-5 py-1.5">
            <span className={cn(rowLabel, "mt-1.5")}>Tags</span>
            <DropdownMenu>
              <DropdownMenuTrigger
                render={
                  <button
                    type="button"
                    aria-label="Add tags"
                    className={cn(
                      "flex h-auto min-h-7 w-full min-w-0 flex-1 items-center rounded-[8px] py-[3px] text-left text-[14px] transition-colors hover:bg-[color:var(--ec-surface-gray-2)]",
                      tags.length ? "pl-[3px]" : "pl-2"
                    )}
                  >
                    {tags.length ? (
                      <span className="flex min-w-0 flex-wrap items-center gap-1">
                        {tags.map((value) => {
                          const label =
                            TAG_OPTIONS.find((o) => o.value === value)?.label ?? value
                          return (
                            <span
                              key={value}
                              className={cn(
                                "flex h-5 shrink-0 items-center gap-1 rounded-[5px] px-1.5 text-[12px]",
                                tagTheme(label)
                              )}
                            >
                              {label}
                              <XIcon
                                className="size-3 cursor-pointer opacity-70 hover:opacity-100"
                                onClick={(e) => {
                                  e.stopPropagation()
                                  setTags((t) => t.filter((v) => v !== value))
                                  touch()
                                }}
                              />
                            </span>
                          )
                        })}
                      </span>
                    ) : (
                      <span className="text-[color:var(--ec-ink-gray-4)]">Add tags</span>
                    )}
                  </button>
                }
              />
              <DropdownMenuContent align="start" className="w-[207px]">
                {TAG_OPTIONS.map((option) => (
                  <DropdownMenuItem
                    key={option.value}
                    closeOnClick={false}
                    onClick={() => {
                      setTags((t) =>
                        t.includes(option.value)
                          ? t.filter((v) => v !== option.value)
                          : [...t, option.value]
                      )
                      touch()
                    }}
                  >
                    {option.label}
                    {tags.includes(option.value) ? (
                      <CheckIcon className="ml-auto size-4 text-[color:var(--ec-ink-gray-6)]" />
                    ) : null}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        )}

        {Object.entries(tab === "Task" ? taskOptions : behaviourOptions).map(
          ([label, options]) =>
            asTabs.includes(label) && tab !== "Task" ? (
              <div key={label} className="flex h-10 items-center gap-3.5 px-5">
                <span className={rowLabel}>{label}</span>
                <Tabs
                  value={behaviour[label]}
                  onValueChange={(v) => {
                    setBehaviour((b) => ({ ...b, [label]: String(v) }))
                    touch()
                  }}
                  className="w-full min-w-0 flex-1"
                >
                  <TabsList size="sm" className="flex w-full">
                    <TabsIndicator />
                    {options.map((option) => (
                      <TabsTrigger
                        key={option}
                        value={option}
                        className="flex-1 justify-center"
                      >
                        {option}
                      </TabsTrigger>
                    ))}
                  </TabsList>
                </Tabs>
              </div>
            ) : tab === "Task" ? (
              rowSelect(label, taskFields[label], options, (v) =>
                setTaskFields((t) => ({ ...t, [label]: v }))
              )
            ) : (
              rowSelect(label, behaviour[label], options, (v) =>
                setBehaviour((b) => ({ ...b, [label]: v }))
              )
            )
        )}

        {tab === "Task" && (
          <div className="flex h-10 items-center gap-3.5 px-5">
            <span className={rowLabel}>Organisation</span>
            <Select
              value={organisation}
              onValueChange={(v) => {
                setOrganisation(String(v))
                touch()
              }}
            >
              <SelectTrigger variant="ghost" size="sm" className="h-7 w-full flex-1">
                <SelectValue>
                  {(value: string | null) => {
                    const org = ORGS.find((o) => o.value === value)
                    return org ? (
                      <span className="flex items-center gap-2">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={org.logo} alt="" className="size-4 shrink-0 rounded-[4px] object-cover" />
                        {org.label}
                      </span>
                    ) : (
                      <span className="text-[color:var(--ec-ink-gray-4)]">Select option</span>
                    )
                  }}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {ORGS.map((org) => (
                  <SelectItem key={org.value} value={org.value}>
                    <span className="flex items-center gap-2">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={org.logo} alt="" className="size-4 shrink-0 rounded-[4px] object-cover" />
                      {org.label}
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
      </div>

      {tab === "Event" && (
        <>
          {divider}
          {/* ── What it is attached to ───────────────────────────────────── */}
          <div className="flex flex-col py-2.5">
            <div className="flex h-10 items-center gap-3.5 px-5">
              <span className={rowLabel}>Link</span>
              <Select value={link} onValueChange={(v) => { setLink(String(v)); touch() }}>
                <SelectTrigger variant="ghost" size="sm" className="h-7 w-full flex-1">
                  <SelectValue>
                    {(value: string | null) => {
                      const org = ORGS.find((o) => o.value === value)
                      return org ? (
                        <span className="flex items-center gap-2">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={org.logo} alt="" className="size-4 shrink-0 rounded-[4px] object-cover" />
                          {org.label}
                        </span>
                      ) : (
                        <span className="text-[color:var(--ec-ink-gray-4)]">Select option</span>
                      )
                    }}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {ORGS.map((org) => (
                    <SelectItem key={org.value} value={org.value}>
                      <span className="flex items-center gap-2">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={org.logo} alt="" className="size-4 shrink-0 rounded-[4px] object-cover" />
                        {org.label}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* People: attendees as chips inside the field. */}
            <div className="flex min-h-10 items-start gap-3.5 px-5 py-1.5">
              <span className={cn(rowLabel, "mt-1.5")}>People</span>
              <DropdownMenu>
                <DropdownMenuTrigger
                  render={
                    <button
                      type="button"
                      aria-label="Add attendee"
                      className={cn(
                        "flex h-auto min-h-7 w-full min-w-0 flex-1 items-center rounded-[8px] py-1 text-left text-[14px] transition-colors hover:bg-[color:var(--ec-surface-gray-2)]",
                        attendees.length ? "pl-1" : "pl-2"
                      )}
                    >
                      {attendees.length ? (
                        <span className="flex min-w-0 flex-wrap items-center gap-1">
                          {attendees.map((value) => {
                            const name =
                              people.find((p) => p.value === value)?.label ?? value
                            return (
                              <span
                                key={value}
                                className="flex h-6 shrink-0 items-center gap-1 rounded-[6px] bg-[color:var(--ec-surface-gray-2)] py-[4.5px] pr-1 pl-1.5"
                              >
                                <PersonFace name={name} className="size-3" />
                                <span className="text-[13px] text-[color:var(--ec-ink-gray-7)]">
                                  {name}
                                </span>
                                <XIcon
                                  className="size-3 cursor-pointer text-[color:var(--ec-ink-gray-7)] hover:text-[color:var(--ec-ink-gray-8)]"
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    setAttendees((a) => a.filter((v) => v !== value))
                                    touch()
                                  }}
                                />
                              </span>
                            )
                          })}
                        </span>
                      ) : (
                        <span className="text-[color:var(--ec-ink-gray-4)]">
                          Add attendee
                        </span>
                      )}
                    </button>
                  }
                />
                <DropdownMenuContent align="start" className="w-[240px] p-0">
                  {/* The fade rides the scroller, not the popup: the popup's
                      enter animation would override the scroll-driven one. */}
                  <div className="scroll-fade scroll-fade-5 max-h-[280px] overflow-y-auto p-1">
                  {people.map((p) => (
                    <DropdownMenuItem
                      key={p.value}
                      closeOnClick={false}
                      onClick={() => {
                        setAttendees((a) =>
                          a.includes(p.value)
                            ? a.filter((v) => v !== p.value)
                            : [...a, p.value]
                        )
                        touch()
                      }}
                    >
                      <PersonFace name={p.label} />
                      {p.label}
                      {attendees.includes(p.value) ? (
                        <CheckIcon className="ml-auto size-4 text-[color:var(--ec-ink-gray-6)]" />
                      ) : null}
                    </DropdownMenuItem>
                  ))}
                  </div>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </>
      )}

      {divider}

      {/* ── What it carries ──────────────────────────────────────────────── */}
      <div className="flex flex-col gap-3 px-5 py-4">
        <Select value={meet} onValueChange={(v) => { setMeet(String(v)); touch() }}>
          <SelectTrigger
            variant="ghost"
            size="sm"
            className="-ml-2 h-7 w-[calc(100%+0.5rem)]"
            aria-label="Video conference"
          >
            <SelectValue>
              {(value: string | null) => (
                <span className="flex items-center gap-2">
                  <VideoIcon className="size-4 shrink-0 text-[color:var(--ec-ink-gray-5)]" />
                  {value === "meet" ? (
                    "Google meet"
                  ) : value === "zoom" ? (
                    "Zoom"
                  ) : (
                    <span className="text-[color:var(--ec-ink-gray-4)]">
                      Add video conference
                    </span>
                  )}
                </span>
              )}
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="meet">Google meet</SelectItem>
            <SelectItem value="zoom">Zoom</SelectItem>
          </SelectContent>
        </Select>

        <div className="relative -ml-2 w-[calc(100%+0.5rem)]">
          <MapPinIcon className="pointer-events-none absolute top-1/2 left-2 size-4 -translate-y-1/2 text-[color:var(--ec-ink-gray-5)]" />
          <Input
            variant="ghost"
            size="sm"
            value={location}
            placeholder="Add location"
            className="pl-8"
            onChange={(e) => {
              setLocation(e.target.value)
              touch()
            }}
          />
        </div>
      </div>

      {divider}

      <div className="px-5 py-4">
        <Textarea
          variant="ghost"
          rows={2}
          value={description}
          placeholder="Add description"
          className="-ml-2 w-[calc(100%+0.5rem)]"
          onChange={(e) => {
            setDescription(e.target.value)
            touch()
          }}
        />
      </div>

      {creating && (
        <div className="mt-auto shrink-0 border-t border-[color:var(--ec-outline-gray-1)] p-5">
          <Button className="w-full" onClick={submit}>
            {`Create ${tab.toLowerCase()}`}
          </Button>
        </div>
      )}

      {/* Deleting asks first. */}
      <Dialog open={confirmingDelete} onOpenChange={setConfirmingDelete}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <span className="flex size-5 shrink-0 items-center justify-center rounded-[4px] bg-[color:var(--ec-surface-red-2,#fde3e3)]">
                <Trash2Icon className="size-3.5 text-[color:var(--ec-ink-red,#b91c1c)]" />
              </span>
              {`Delete ${deleteKind}`}
            </DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            This will permanently remove the {deleteKind}. This action cannot be
            undone.
          </p>
          <DialogFooter>
            <Button variant="secondary" size="sm" onClick={() => setConfirmingDelete(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              size="sm"
              onClick={() => {
                setConfirmingDelete(false)
                onDelete(event?.id)
              }}
            >
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </aside>
  )
}
