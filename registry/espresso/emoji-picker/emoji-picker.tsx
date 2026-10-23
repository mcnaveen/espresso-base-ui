"use client"


import * as React from "react"
import {
  Clock,
  Flag,
  Leaf,
  Lightbulb,
  Megaphone,
  Paintbrush,
  Signpost,
  Smile,
  SmileIcon,
  Umbrella,
} from "lucide-react"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import {
  Tabs,
  TabsIndicator,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs"
import {
  emojiSections,
  emojis,
  type Emoji,
  type EmojiSection,
} from "@/components/ui/emoji-picker-data"

// The emoji picker from frappe-ui's Picker > Grid (espresso-2.0 Figma): a
// 284px panel — a row of category icon tabs that jump to their section and
// follow the scroll, a keyword search over every emoji, and a 224px body of
// labeled 9-across emoji grids. Picks land in a Recent section remembered
// per browser.

const SECTION_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  recent: Clock,
  smileys: Smile,
  nature: Leaf,
  travel: Umbrella,
  objects: Lightbulb,
  symbols: Megaphone,
  activities: Paintbrush,
  flags: Flag,
  food: Signpost,
}

// ---- recent: the last 18 picks, newest first, remembered per browser
const RECENT_KEY = "espresso-recent-emoji"

function loadRecent(): Emoji[] {
  try {
    const chars: string[] = JSON.parse(
      window.localStorage.getItem(RECENT_KEY) ?? "[]"
    )
    const known = new Map(emojis.map((e) => [e.emoji, e]))
    return chars.map((c) => known.get(c) ?? { emoji: c, name: "" })
  } catch {
    return []
  }
}

type EmojiPickerContextValue = {
  value: string
  open: boolean
  select: (item: Emoji) => void
}

const EmojiPickerContext = React.createContext<EmojiPickerContextValue | null>(
  null
)

function useEmojiPicker() {
  const context = React.useContext(EmojiPickerContext)
  if (!context) {
    throw new Error("useEmojiPicker must be used within an EmojiPicker.")
  }
  return context
}

function EmojiPicker({
  value: valueProp,
  defaultValue = "",
  onValueChange,
  open: openProp,
  onOpenChange,
  children,
}: {
  /** Controlled selected emoji (the character itself). */
  value?: string
  defaultValue?: string
  onValueChange?: (emoji: string, item: Emoji) => void
  open?: boolean
  onOpenChange?: (open: boolean) => void
  children: React.ReactNode
}) {
  const [uncontrolledValue, setUncontrolledValue] =
    React.useState(defaultValue)
  const [uncontrolledOpen, setUncontrolledOpen] = React.useState(false)

  const value = valueProp ?? uncontrolledValue
  const open = openProp ?? uncontrolledOpen

  const setOpen = (next: boolean) => {
    if (openProp === undefined) setUncontrolledOpen(next)
    onOpenChange?.(next)
  }

  const select = (item: Emoji) => {
    if (valueProp === undefined) setUncontrolledValue(item.emoji)
    onValueChange?.(item.emoji, item)
    setOpen(false)
  }

  return (
    <EmojiPickerContext.Provider value={{ value, open, select }}>
      <Popover open={open} onOpenChange={setOpen}>
        {children}
      </Popover>
    </EmojiPickerContext.Provider>
  )
}

// Defaults to a button showing the current pick (or a smile placeholder);
// pass `render` for a custom trigger, exactly like the other popup triggers.
function EmojiPickerTrigger({
  render,
  className,
  ...props
}: React.ComponentProps<typeof PopoverTrigger>) {
  const { value } = useEmojiPicker()
  return (
    <PopoverTrigger
      data-slot="emoji-picker-trigger"
      // passed explicitly (even when undefined) to neutralize PopoverTrigger's
      // built-in `w-fit`, which would otherwise collapse the icon button
      className={className}
      render={
        render ?? (
          <Button variant="outline" size="icon" aria-label="Pick an emoji">
            {value ? (
              <span className="text-lg leading-none">{value}</span>
            ) : (
              <SmileIcon className="text-muted-foreground" />
            )}
          </Button>
        )
      }
      {...props}
    />
  )
}

function EmojiGrid({
  items,
  idPrefix,
}: {
  items: Emoji[]
  idPrefix: string
}) {
  const { value, select } = useEmojiPicker()
  return (
    <div className="grid grid-cols-9 gap-0.5">
      {items.map((item, index) => (
        <button
          key={`${idPrefix}-${index}`}
          type="button"
          title={item.name || undefined}
          aria-label={item.name || item.emoji}
          data-selected={item.emoji === value || undefined}
          className="flex h-7 w-full items-center justify-center rounded-md text-lg leading-none outline-none select-none hover:bg-secondary focus-visible:bg-secondary active:bg-muted data-selected:bg-muted"
          onClick={() => select(item)}
        >
          {item.emoji}
        </button>
      ))}
    </div>
  )
}

function EmojiPickerContent({
  className,
  align = "start",
  sideOffset = 6,
  placeholder = "Search by keyword",
  ...props
}: Omit<React.ComponentProps<typeof PopoverContent>, "children"> & {
  placeholder?: string
}) {
  const { value, open, select } = useEmojiPicker()
  const [query, setQuery] = React.useState("")
  const [active, setActive] = React.useState("smileys")
  const [recent, setRecent] = React.useState<Emoji[]>([])
  const bodyRef = React.useRef<HTMLDivElement>(null)
  const jumpingRef = React.useRef(false)

  const sections = React.useMemo<EmojiSection[]>(
    () => [
      ...(recent.length
        ? [{ id: "recent", label: "Recent", emojis: recent }]
        : []),
      ...emojiSections,
    ],
    [recent]
  )

  const needle = query.trim().toLowerCase()
  const results = needle
    ? emojis.filter((item) => item.name.includes(needle))
    : null

  const sectionEl = (id: string) =>
    bodyRef.current?.querySelector<HTMLElement>(`[data-section="${id}"]`) ??
    null

  // The content component stays mounted while the popup DOM mounts per
  // open, so per-open state keys on `open`: reload the stored picks and
  // start fresh on Smileys with an empty search.
  React.useLayoutEffect(() => {
    if (!open) return
    const loaded = loadRecent()
    setRecent(loaded)
    setQuery("")
    setActive(loaded.length ? "recent" : "smileys")
  }, [open])
  const jumpTo = (id: string) => {
    setActive(id)
    setQuery("")
    // after the sections re-render (leaving search results), scroll to it
    requestAnimationFrame(() => {
      const body = bodyRef.current
      if (!body) return
      const el = sectionEl(id)
      // The scroll follows the tab, not the other way round, until the
      // smooth scroll has ended — otherwise a long trip hands the tab back
      // to the sections it passes.
      jumpingRef.current = true
      const done = () => {
        jumpingRef.current = false
        clearTimeout(fallback)
      }
      body.addEventListener("scrollend", done, { once: true })
      // scrollend is not everywhere yet; a timer closes the gap
      const fallback = setTimeout(done, 1200)
      body.scrollTo({ top: el ? el.offsetTop - 8 : 0, behavior: "smooth" })
    })
  }

  // The active tab is the last section whose top has scrolled past.
  const onScroll = () => {
    const body = bodyRef.current
    if (!body || jumpingRef.current || results) return
    const top = body.scrollTop + 16
    let current = sections[0]?.id ?? "smileys"
    for (const section of sections) {
      const el = sectionEl(section.id)
      if (el && el.offsetTop <= top) current = section.id
    }
    setActive(current)
  }

  const pick = (item: Emoji) => {
    // persisted before select() closes the popup and unmounts this content —
    // a state updater would be discarded with the unmount
    const next = [
      item,
      ...recent.filter((r) => r.emoji !== item.emoji),
    ].slice(0, 18)
    try {
      window.localStorage.setItem(
        RECENT_KEY,
        JSON.stringify(next.map((r) => r.emoji))
      )
    } catch {
      // storage unavailable: Recent lasts for this visit only
    }
    setRecent(next)
    select(item)
  }

  return (
    <EmojiPickerContext.Provider value={{ value, open, select: pick }}>
      <PopoverContent
        data-slot="emoji-picker-content"
        align={align}
        sideOffset={sideOffset}
        className={cn("w-[284px] gap-0 p-0", className)}
        {...props}
      >
        {/* category tabs: jump to their section and follow the scroll */}
        <div className="pt-1 pb-0.5">
          <Tabs value={active} onValueChange={(id) => jumpTo(String(id))}>
            <TabsList
              variant="line"
              size="sm"
              className="w-full gap-1 border-b-0 px-1.5"
              aria-label="Emoji categories"
            >
              <TabsIndicator />
              {[
                ...(recent.length
                  ? [{ id: "recent", label: "Recent" }]
                  : []),
                ...emojiSections,
              ].map((section) => {
                const Icon = SECTION_ICONS[section.id] ?? Smile
                return (
                  <TabsTrigger
                    key={section.id}
                    value={section.id}
                    aria-label={section.label}
                    className="group-data-[size=sm]/tabs-list:px-0"
                  >
                    <Icon className="size-4" />
                  </TabsTrigger>
                )
              })}
            </TabsList>
          </Tabs>
        </div>

        <div className="p-1.5">
          <Input
            variant="subtle"
            size="sm"
            placeholder={placeholder}
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
        </div>

        <div
          ref={bodyRef}
          data-slot="emoji-picker-body"
          className="scroll-fade-t scroll-fade-4 relative h-[224px] overflow-y-auto p-2"
          onScroll={onScroll}
        >
          {results ? (
            results.length ? (
              <EmojiGrid items={results} idPrefix="search" />
            ) : (
              <p className="py-8 text-center text-base text-muted-foreground">
                No emoji found
              </p>
            )
          ) : (
            sections.map((section, index) => (
              <section
                key={section.id}
                data-section={section.id}
                aria-label={section.label}
                className={cn(index > 0 && "pt-2")}
              >
                <p className="px-1 pb-1.5 text-xs text-muted-foreground">
                  {section.label}
                </p>
                <EmojiGrid items={section.emojis} idPrefix={section.id} />
              </section>
            ))
          )}
        </div>
      </PopoverContent>
    </EmojiPickerContext.Provider>
  )
}

export { EmojiPicker, EmojiPickerTrigger, EmojiPickerContent }
export {
  emojis,
  emojiSections,
  type Emoji,
  type EmojiSection,
} from "@/components/ui/emoji-picker-data"
