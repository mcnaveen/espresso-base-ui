"use client"

// The email composer, after the frappe-ui espresso playground's
// email-composer (EmailComposer.vue, node 35709:58442): a 600x540 window
// floating 24 in from its stage's bottom-right corner.
//
//   radius 16 · the card surface · the 2xl elevation
//   header     48 — the input surface, 16 left / 10 right, the title, then
//              two 28px ghost buttons 4 apart (pop out, close)
//   To         41 — 6 above and below a 28px ghost field (8 in, a 16px
//              glyph, 8, then the chips and the caret), Cc and Bcc at the
//              right end 4 apart, a 1px border-soft rule under the row
//   Cc / Bcc   the same row, shown when its button is pressed
//   Subject    41 — the same ghost field with the bubble glyph
//   body       fills — 16 of padding, 14/21, "Type a message..."
//   toolbar    56 — 12 above, 16 below and either side: Send with its menu
//              chevron, then seven 28px ghost icon buttons 4 apart; the bin
//              alone at the right end
//
// The recipients are chips while a field is being edited — a 24px outline
// tag with a 16px face — and a suggestion menu hangs from where the typing
// is: 280 wide, 49px rows of a 32px face over the name and the address, or
// one "Add …" row for a complete address nobody matches. With the focus out
// of all three fields they fold to one line of names, as Gmail does.
import * as React from "react"
import { createPortal } from "react-dom"
import { Extension, type Editor as TiptapEditor } from "@tiptap/core"
import { Plugin, PluginKey } from "@tiptap/pm/state"
import { Decoration, DecorationSet } from "@tiptap/pm/view"
import { EditorContent, useEditor, useEditorState } from "@tiptap/react"
import { Popover as PopoverPrimitive } from "@base-ui/react/popover"
import { CheckIcon as LucideCheck, CopyIcon, GlobeIcon, Link2OffIcon, MailIcon } from "lucide-react"

import { cn } from "@/lib/utils"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  EmojiPicker,
  EmojiPickerContent,
  EmojiPickerTrigger,
} from "@/components/ui/emoji-picker"
import { Input } from "@/components/ui/input"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import {
  PALETTE,
  RichTextKit,
  highlightValue,
  textValue,
} from "@/components/ui/editor"
import {
  AttachmentIcon,
  CheckIcon,
  DeleteIcon,
  EmojiIcon,
  ExpandIcon,
  FileIcon,
  FolderIcon,
  ImageIcon,
  LinkIcon,
  MoreVerticalIcon,
  PeopleIcon,
  PersonIcon,
  PopOutIcon,
  PrintIcon,
  SendChevronIcon,
  ShrinkIcon,
  SmallCloseIcon,
  SmallUpIcon,
  SubjectIcon,
  TextColorIcon,
  TextIcon,
} from "@/components/ui/email-composer-icons"

/* --------------------------------- types --------------------------------- */

/** Someone who can be written to. */
export interface EmailComposerPerson {
  /** the name the chip and the menu show */
  label: string
  /** the address */
  value: string
  /** a picture for the face; the name's initial stands in without one */
  avatar?: string
}

/** Everything a draft holds — what Undo on a discard toast brings back. */
export interface EmailDraft {
  to: string[]
  cc: string[]
  bcc: string[]
  subject: string
  /** the message, as HTML */
  body: string
  attachments: File[]
}

export interface EmailComposerProps {
  /** who the recipient fields suggest as a name is typed */
  people?: EmailComposerPerson[]
  /** a draft to open with — a discarded one, brought back */
  initial?: EmailDraft | null
  /** "Default to full screen", from the ⋮ menu: the window opens expanded */
  fullScreenDefault?: boolean
  onFullScreenDefaultChange?: (value: boolean) => void
  /** "Spell check", from the ⋮ menu (on unless turned off) */
  spellCheck?: boolean
  onSpellCheckChange?: (value: boolean) => void
  /** Send, and Schedule send under its chevron; the window closes after */
  onSend?: (draft: EmailDraft) => void
  onSchedule?: (draft: EmailDraft) => void
  /** the bin: the draft as it was, and the window closes */
  onDiscard?: (draft: EmailDraft) => void
  /** the header's close */
  onClose?: () => void
  /** the folder glyph; nothing behind it unless given */
  onDrive?: () => void
  /** where a picked picture goes; an object URL for the file by default */
  uploadImage?: (file: File) => Promise<string> | string
  className?: string
}

/* ------------------------------ addresses ------------------------------- */

/**
 * Practical email validation, after frappe-ui's MultiEmailInput (Zod v4's
 * own): no leading or doubled dot, a dotted domain, a 2+ letter TLD.
 */
const EMAIL =
  /^(?!\.)(?!.*\.\.)([A-Za-z0-9_'+\-.]*)[A-Za-z0-9_+-]@([A-Za-z0-9][A-Za-z0-9-]*\.)+[A-Za-z]{2,}$/

export const isValidEmail = (value: string) => EMAIL.test(value.trim())

/**
 * A pasted list, split on comma, semicolon, newline and tab — a quoted name
 * with a comma in it, `"Doe, John" <a@b.co>`, stays one token.
 */
function splitTokens(input: string) {
  const parts: string[] = []
  let current = ""
  let quoted = false
  for (const char of input) {
    if (char === '"') {
      quoted = !quoted
      current += char
    } else if (/[,;\n\r\t]/.test(char) && !quoted) {
      if (current.trim()) parts.push(current.trim())
      current = ""
    } else current += char
  }
  if (current.trim()) parts.push(current.trim())
  return parts
}

/** `Name <email>` to the bare address */
const extractEmail = (token: string) =>
  (token.match(/<([^>]+)>/)?.[1] ?? token).trim()

/* ---------------------------- held selection ---------------------------- */

// Pressing Link opens a popup whose field takes the focus, and the document
// can show only one selection — the run the link is for would stop being
// highlighted. This paints that run itself, from the press until the editor
// has the focus back or the document changes.
const holdKey = new PluginKey<DecorationSet>("emailComposerHold")

const HoldSelection = Extension.create({
  name: "emailComposerHold",
  onFocus() {
    release(this.editor)
  },
  addProseMirrorPlugins() {
    return [
      new Plugin<DecorationSet>({
        key: holdKey,
        state: {
          init: () => DecorationSet.empty,
          apply(tr, set) {
            const meta = tr.getMeta(holdKey) as
              | { from: number; to: number }
              | null
              | undefined
            if (meta === null) return DecorationSet.empty
            if (meta)
              return DecorationSet.create(tr.doc, [
                Decoration.inline(meta.from, meta.to, {
                  class: "email-composer-held",
                }),
              ])
            return tr.docChanged ? DecorationSet.empty : set
          },
        },
        props: {
          decorations: (state) => holdKey.getState(state),
        },
      }),
    ]
  },
})

function hold(editor: TiptapEditor) {
  const { from, to } = editor.state.selection
  if (from === to) return
  editor.view.dispatch(editor.state.tr.setMeta(holdKey, { from, to }))
}

function release(editor: TiptapEditor) {
  if (holdKey.getState(editor.state) === DecorationSet.empty) return
  editor.view.dispatch(editor.state.tr.setMeta(holdKey, null))
}

/* ------------------------------- the bar -------------------------------- */

// The toolbar's tooltips: a 12px label, in 150ms
const tipClass = "px-2 py-1 text-xs leading-[1.35]"

/**
 * A toolbar glyph: a 28px ghost button in the text's ink, its press kept to
 * itself so the caret and the selection stay in the message — what colour,
 * link and emoji act on.
 */
function BarButton({
  label,
  className,
  ...props
}: React.ComponentProps<typeof Button> & { label: string }) {
  return (
    <Button
      variant="ghost"
      size="icon-sm"
      aria-label={label}
      className={cn("text-secondary-foreground", className)}
      onMouseDown={(event) => event.preventDefault()}
      {...props}
    />
  )
}

function BarTip({
  label,
  children,
}: {
  label: string
  children: React.ReactElement
}) {
  return (
    <Tooltip>
      <TooltipTrigger render={children} />
      <TooltipContent side="top" className={tipClass}>
        {label}
      </TooltipContent>
    </Tooltip>
  )
}

/* ------------------------------- colour -------------------------------- */

const paletteName = (value: unknown, of: (name: string) => string) =>
  PALETTE.find((name) => of(name) === value) ?? null

const capitalise = (name: string) => name[0].toUpperCase() + name.slice(1)

/**
 * The text colour picker (frappe-ui's FontColor): Text Color and Background
 * Color, each a 6-across grid of 24px "A" swatches 8 apart, Default first;
 * the colour in force ringed. A pick applies and closes.
 */
function ColorPanel({
  editor,
  onPick,
}: {
  editor: TiptapEditor
  onPick: () => void
}) {
  const current = useEditorState({
    editor,
    selector: ({ editor: ed }) => ({
      text: paletteName(ed.getAttributes("textStyle").color, textValue),
      highlight: paletteName(
        ed.getAttributes("highlight").color,
        highlightValue
      ),
    }),
  })
  const swatches = [null, ...PALETTE] as (string | null)[]
  const pickText = (name: string | null) => {
    const chain = editor.chain().focus()
    ;(name ? chain.setColor(textValue(name)) : chain.unsetColor()).run()
    onPick()
  }
  const pickHighlight = (name: string | null) => {
    const chain = editor.chain().focus()
    ;(name
      ? chain.setHighlight({ color: highlightValue(name) })
      : chain.unsetHighlight()
    ).run()
    onPick()
  }
  const swatchClass =
    "flex size-6 items-center justify-center rounded-2xs border text-base leading-none outline-none focus-visible:ring-2 focus-visible:ring-border-normal"
  const grid = (kind: "text" | "highlight") =>
    swatches.map((name) => {
      const label = name ? capitalise(name) : "Default"
      const active =
        (kind === "text" ? current?.text : current?.highlight) === name
      return (
        <Tooltip key={label}>
          <TooltipTrigger
            render={
              <button
                type="button"
                aria-label={label}
                aria-pressed={active}
                onClick={() =>
                  kind === "text" ? pickText(name) : pickHighlight(name)
                }
                className={cn(
                  swatchClass,
                  kind === "text"
                    ? "border-border-soft"
                    : name
                      ? "border-transparent text-foreground"
                      : "border-border-soft text-foreground",
                  kind === "text" && !name && "text-foreground",
                  active && "ring-2 ring-border-strong"
                )}
                style={
                  name
                    ? kind === "text"
                      ? { color: textValue(name) }
                      : { backgroundColor: highlightValue(name) }
                    : undefined
                }
              >
                A
              </button>
            }
          />
          <TooltipContent side="top" className={tipClass}>
            {label}
          </TooltipContent>
        </Tooltip>
      )
    })
  return (
    <div role="group" aria-label="Text and background color">
      <div className="text-sm leading-[1.35] text-secondary-foreground">
        Text Color
      </div>
      <div className="mt-2 grid grid-cols-6 gap-2">{grid("text")}</div>
      <div className="mt-4 text-sm leading-[1.35] text-secondary-foreground">
        Background Color
      </div>
      <div className="mt-2 grid grid-cols-6 gap-2">{grid("highlight")}</div>
    </div>
  )
}

/* -------------------------------- link --------------------------------- */

const LINK_SCHEMES = ["http:", "https:", "mailto:", "tel:"]

/** `github.com` → `https://github.com`; a scheme already there stays */
const normaliseHref = (value: string) => {
  const trimmed = value.trim()
  if (!trimmed) return ""
  return /^[a-z][a-z0-9+.-]*:/i.test(trimmed) ? trimmed : `https://${trimmed}`
}

/** a safe scheme, and for the web a dotted host (or localhost) */
const validHref = (href: string) => {
  let url: URL
  try {
    url = new URL(href)
  } catch {
    return false
  }
  if (!LINK_SCHEMES.includes(url.protocol)) return false
  if (url.protocol === "http:" || url.protocol === "https:")
    return url.hostname === "localhost" || url.hostname.includes(".")
  return true
}

/** the selection's box, or the caret's when nothing is selected */
function selectionRect(editor: TiptapEditor): DOMRect {
  const { from, to } = editor.state.selection
  const start = editor.view.coordsAtPos(from)
  const end = editor.view.coordsAtPos(to)
  const left = Math.min(start.left, end.left)
  const right = Math.max(start.right, end.right)
  return new DOMRect(left, start.top, right - left, end.bottom - start.top)
}

/**
 * The link popup (frappe-ui's LinkEditorPopup): over the run the link is
 * for, a 28px field with Apply — and Remove when the run is a link already.
 * An existing link opens on its address first, with Copy and Edit. Enter
 * applies, an empty field removes, a malformed one shakes; Escape steps
 * back from editing an existing link, else closes.
 */
function LinkPopup({
  editor,
  open,
  onClose,
}: {
  editor: TiptapEditor
  open: boolean
  onClose: () => void
}) {
  const anchor = React.useMemo(
    () => (open ? { getBoundingClientRect: () => selectionRect(editor) } : null),
    [open, editor]
  )
  const close = () => {
    onClose()
    editor.commands.focus()
  }

  return (
    <PopoverPrimitive.Root
      open={open}
      onOpenChange={(next) => {
        if (!next) close()
      }}
    >
      <PopoverPrimitive.Portal>
        <PopoverPrimitive.Positioner
          anchor={anchor}
          side="top"
          sideOffset={4}
          className="isolate z-50"
        >
          <PopoverPrimitive.Popup
            data-slot="email-composer-link"
            aria-label="Edit link"
            initialFocus={false}
            finalFocus={false}
            className="flex max-w-80 min-w-60 items-center gap-1 rounded-lg bg-card p-1 shadow-elevation-lg outline-none data-open:animate-in data-open:fade-in-0 data-open:zoom-in-95"
          >
            {/* mounted with each open, so it starts from the run's link */}
            <LinkPopupBody
              editor={editor}
              existing={
                (editor.getAttributes("link").href as string | undefined) ?? ""
              }
              onDone={onClose}
              onCancel={close}
            />
          </PopoverPrimitive.Popup>
        </PopoverPrimitive.Positioner>
      </PopoverPrimitive.Portal>
    </PopoverPrimitive.Root>
  )
}

function LinkPopupBody({
  editor,
  existing,
  onDone,
  onCancel,
}: {
  editor: TiptapEditor
  existing: string
  onDone: () => void
  onCancel: () => void
}) {
  const [href, setHref] = React.useState(existing)
  const [editing, setEditing] = React.useState(!existing)
  const inputRef = React.useRef<HTMLInputElement>(null)
  const fieldRef = React.useRef<HTMLDivElement>(null)

  const focusField = () =>
    // the field is mounted a frame after the popup
    requestAnimationFrame(() => {
      inputRef.current?.focus({ preventScroll: true })
      inputRef.current?.select()
    })
  React.useEffect(() => {
    if (!existing) focusField()
  }, [existing])

  const apply = (value: string) => {
    const chain = editor.chain().focus().extendMarkRange("link")
    if (!value) chain.unsetLink().run()
    else if (editor.state.selection.empty && !existing)
      chain
        .insertContent({
          type: "text",
          text: value,
          marks: [{ type: "link", attrs: { href: value } }],
        })
        .run()
    else chain.setLink({ href: value }).run()
    onDone()
  }
  const submit = () => {
    const value = normaliseHref(href)
    if (value === "" || validHref(value)) apply(value)
    else if (!window.matchMedia("(prefers-reduced-motion: reduce)").matches)
      // not a link: the field shakes its head
      fieldRef.current?.animate(
        [
          { transform: "translateX(0)" },
          { transform: "translateX(-3px)" },
          { transform: "translateX(3px)" },
          { transform: "translateX(0)" },
        ],
        { duration: 160, easing: "ease-in-out" }
      )
  }

  return (
    <div
      className="contents"
      onKeyDown={(event) => {
        if (event.key !== "Escape") return
        event.preventDefault()
        event.stopPropagation()
        if (editing && existing) {
          setHref(existing)
          setEditing(false)
        } else onCancel()
      }}
    >
      {editing ? (
        <>
          <div ref={fieldRef} className="flex-1">
            <Input
              ref={inputRef}
              variant="subtle"
              size="sm"
              placeholder="https://example.com"
              aria-label="Link address"
              value={href}
              onChange={(event) => setHref(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault()
                  submit()
                }
              }}
            />
          </div>
          {existing && (
            <Button
              variant="ghost"
              size="icon-xs"
              aria-label="Remove link"
              onClick={() => apply("")}
            >
              <Link2OffIcon className="size-3.5" />
            </Button>
          )}
          <Button
            variant="ghost"
            size="icon-xs"
            aria-label="Apply"
            className="text-foreground"
            onClick={submit}
          >
            <LucideCheck className="size-3.5" />
          </Button>
        </>
      ) : (
        <>
          <GlobeIcon
            aria-hidden="true"
            className="ml-1.5 size-4 shrink-0 text-accent-foreground"
          />
          <div className="flex min-w-0 flex-1 pl-1.5">
            <a
              href={href}
              title={href}
              target="_blank"
              rel="noopener noreferrer"
              className="truncate border-b border-border text-sm text-foreground hover:border-border-normal"
            >
              {href}
            </a>
          </div>
          <Button
            variant="ghost"
            size="icon-xs"
            aria-label="Copy link"
            onClick={() => {
              void navigator.clipboard?.writeText(href).catch(() => {})
            }}
          >
            <CopyIcon className="size-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="xs"
            onClick={() => {
              setEditing(true)
              focusField()
            }}
          >
            Edit
          </Button>
        </>
      )}
    </div>
  )
}

/* ----------------------------- recipients ------------------------------- */

type Field = "to" | "cc" | "bcc"

const MENU_WIDTH = 280
const MENU_INSET = 8

function Face({
  person,
  label,
  size,
}: {
  person?: EmailComposerPerson
  label: string
  size: "xs" | "xl"
}) {
  return (
    <Avatar size={size} className="shrink-0">
      {person?.avatar && <AvatarImage src={person.avatar} alt="" />}
      <AvatarFallback className="font-normal text-accent-foreground">
        {label.trim()[0]?.toUpperCase()}
      </AvatarFallback>
    </Avatar>
  )
}

type Row =
  | { kind: "create"; value: string }
  | { kind: "person"; value: string; person: EmailComposerPerson }

/**
 * One recipient field (frappe-ui's MultiEmailInput, dressed to the file):
 * the chips and an inline caret, sized to what is typed so a long address
 * wraps to the next line. A suggestion menu opens only for a query: the
 * people with a word of the name, or the address, starting with it — or,
 * for a complete address nobody matches, one "Add …" row. Enter takes the
 * row pointed at; Backspace on an empty field points at the last chip, and
 * again takes it away; a pasted list becomes chips at once.
 */
function RecipientField({
  values,
  onValuesChange,
  people,
  placeholder,
  query,
  onQueryChange,
  nameOf,
  inputRef,
  boundsRef,
}: {
  values: string[]
  onValuesChange: (values: string[]) => void
  people: EmailComposerPerson[]
  placeholder: string
  query: string
  onQueryChange: (query: string) => void
  nameOf: (value: string) => string
  inputRef: (el: HTMLInputElement | null) => void
  boundsRef: React.RefObject<HTMLElement | null>
}) {
  const [focused, setFocused] = React.useState(false)
  const [highlight, setHighlight] = React.useState(0)
  const [dismissed, setDismissed] = React.useState(false)
  const [current, setCurrent] = React.useState<number | null>(null)
  const [place, setPlace] = React.useState<{ top: number; left: number }>()
  const controlRef = React.useRef<HTMLDivElement>(null)
  const ownInput = React.useRef<HTMLInputElement | null>(null)
  const listId = React.useId()

  const chosen = new Set(values.map((v) => v.toLowerCase()))
  const q = query.trim()
  const lower = q.toLowerCase()
  const suggestions = lower
    ? people.filter(
        (p) =>
          !chosen.has(p.value.toLowerCase()) &&
          (p.label
            .toLowerCase()
            .split(" ")
            .some((word) => word.startsWith(lower)) ||
            p.value.toLowerCase().startsWith(lower))
      )
    : []
  const create =
    q !== "" &&
    isValidEmail(q) &&
    !chosen.has(lower) &&
    !suggestions.some((p) => p.value.toLowerCase() === lower)
  const rows: Row[] = [
    ...(create ? [{ kind: "create" as const, value: q }] : []),
    ...suggestions.map((person) => ({
      kind: "person" as const,
      value: person.value,
      person,
    })),
  ]
  const open = focused && !dismissed && rows.length > 0
  const active = Math.min(highlight, rows.length - 1)

  // the menu hangs from where the caret's text starts — or, when 280 from
  // there would run past the window's right edge, ends at the caret
  React.useLayoutEffect(() => {
    if (!open) return
    const input = ownInput.current
    const control = controlRef.current
    if (!input || !control) return
    const ir = input.getBoundingClientRect()
    const cr = control.getBoundingClientRect()
    const wr = boundsRef.current?.getBoundingClientRect() ?? {
      left: 0,
      right: window.innerWidth,
    }
    let left = ir.left
    if (left + MENU_WIDTH > wr.right - MENU_INSET) {
      const cx = document.createElement("canvas").getContext("2d")
      const cs = getComputedStyle(input)
      let caret = ir.left
      if (cx) {
        cx.font = `${cs.fontWeight} ${cs.fontSize} ${cs.fontFamily}`
        caret += cx.measureText(input.value).width
      }
      left = Math.max(wr.left + MENU_INSET, caret - MENU_WIDTH)
    }
    setPlace({ top: cr.bottom, left })
  }, [open, query, values.length, boundsRef])

  const commit = (value: string) => {
    onValuesChange([...values, value])
    onQueryChange("")
    setHighlight(0)
  }
  const remove = (index: number) => {
    onValuesChange(values.filter((_, i) => i !== index))
    setCurrent(null)
  }

  const onKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    const input = event.currentTarget
    const atStart = input.selectionStart === 0 && input.selectionEnd === 0
    if (event.key === "ArrowDown" && open) {
      event.preventDefault()
      setHighlight((active + 1) % rows.length)
    } else if (event.key === "ArrowUp" && open) {
      event.preventDefault()
      setHighlight((active - 1 + rows.length) % rows.length)
    } else if (event.key === "Enter") {
      event.preventDefault()
      if (open) commit(rows[active].value)
    } else if (event.key === "Escape" && open) {
      event.preventDefault()
      event.stopPropagation()
      setDismissed(true)
    } else if (
      (event.key === "Backspace" || event.key === "Delete") &&
      input.value === "" &&
      values.length
    ) {
      event.preventDefault()
      if (current === null) setCurrent(values.length - 1)
      else remove(current)
    } else if (event.key === "ArrowLeft" && atStart && values.length) {
      event.preventDefault()
      setCurrent(Math.max(0, (current ?? values.length) - 1))
    } else if (event.key === "ArrowRight" && current !== null) {
      event.preventDefault()
      setCurrent(current + 1 < values.length ? current + 1 : null)
    } else setCurrent(null)
  }

  const onPaste = (event: React.ClipboardEvent<HTMLInputElement>) => {
    const text = event.clipboardData.getData("text")
    if (!text || !/[,;\n\r\t]/.test(text)) return
    event.preventDefault()
    const seen = new Set(chosen)
    const additions: string[] = []
    for (const token of splitTokens(text)) {
      const email = extractEmail(token)
      if (!email || !isValidEmail(email)) continue
      const key = email.toLowerCase()
      if (seen.has(key)) continue
      seen.add(key)
      additions.push(email)
    }
    if (additions.length) onValuesChange([...values, ...additions])
    onQueryChange("")
  }

  const menu =
    open && place
      ? createPortal(
          <div
            id={listId}
            role="listbox"
            data-slot="email-composer-suggestions"
            onMouseDown={(event) => event.preventDefault()}
            style={{ top: place.top, left: place.left }}
            className={cn(
              "fixed z-50 max-h-60 overflow-y-auto rounded-lg bg-card p-1 shadow-elevation-xl [scrollbar-color:var(--border-normal)_transparent] [scrollbar-width:thin]",
              // only the "Add …" row: the menu hugs its label
              suggestions.length ? "w-[280px]" : "w-max max-w-[280px]"
            )}
          >
            {rows.map((row, index) => (
              <div
                key={`${row.kind}-${row.value}`}
                role="option"
                aria-selected={index === active}
                data-highlighted={index === active || undefined}
                onMouseMove={() => setHighlight(index)}
                onClick={() => commit(row.value)}
                className={cn(
                  "flex cursor-default items-center text-base tracking-normal data-highlighted:bg-secondary [&+&]:mt-px",
                  row.kind === "create"
                    ? "min-h-7 gap-1.5 rounded-md px-2 py-1.5"
                    : "min-h-[49px] gap-2 rounded-lg p-2"
                )}
              >
                {row.kind === "create" ? (
                  <>
                    <MailIcon
                      aria-hidden="true"
                      className="size-4 shrink-0 text-accent-foreground"
                    />
                    <span className="min-w-0 truncate leading-[1.15] text-foreground">
                      Add &quot;{row.value}&quot;
                    </span>
                  </>
                ) : (
                  <>
                    <Face person={row.person} label={row.person.label} size="xl" />
                    <span className="flex min-w-0 flex-col">
                      <span className="truncate text-base leading-[1.15] text-foreground">
                        {row.person.label}
                      </span>
                      <span className="mt-0.5 truncate text-sm leading-[1.15] text-muted-foreground">
                        {row.person.value}
                      </span>
                    </span>
                  </>
                )}
              </div>
            ))}
          </div>,
          document.body
        )
      : null

  return (
    <div
      ref={controlRef}
      data-slot="email-composer-control"
      className="flex min-h-7 min-w-0 flex-1 flex-wrap items-center gap-1"
      onMouseDown={(event) => {
        // a press on the field's own room puts the caret in it
        if (event.target === event.currentTarget) {
          event.preventDefault()
          ownInput.current?.focus()
        }
      }}
    >
      {values.map((value, index) => {
        const person = people.find(
          (p) => p.value.toLowerCase() === value.toLowerCase()
        )
        const label = person?.label ?? nameOf(value)
        return (
          <span
            key={value}
            data-slot="email-composer-chip"
            aria-current={current === index || undefined}
            className="inline-flex h-6 max-w-full items-center gap-1 rounded-sm border border-border pr-[3px] pl-[5px] transition-colors duration-75 hover:border-border-normal aria-current:ring-2 aria-current:ring-border-normal"
          >
            <Face person={person} label={label} size="xs" />
            <span className="truncate text-sm leading-[1.35] tracking-normal text-secondary-foreground">
              {label}
            </span>
            <button
              type="button"
              aria-label={`Remove ${label}`}
              onMouseDown={(event) => event.preventDefault()}
              onClick={(event) => {
                event.stopPropagation()
                remove(index)
              }}
              className="flex size-3 shrink-0 items-center justify-center text-secondary-foreground hover:text-foreground"
            >
              <SmallCloseIcon className="size-3" />
            </button>
          </span>
        )
      })}
      <input
        ref={(el) => {
          ownInput.current = el
          inputRef(el)
        }}
        type="text"
        role="combobox"
        aria-label={placeholder}
        aria-expanded={open}
        aria-controls={open ? listId : undefined}
        aria-autocomplete="list"
        autoComplete="off"
        autoCorrect="off"
        autoCapitalize="off"
        spellCheck={false}
        placeholder={values.length ? "" : placeholder}
        value={query}
        onChange={(event) => {
          onQueryChange(event.target.value)
          setHighlight(0)
          setDismissed(false)
          setCurrent(null)
        }}
        onKeyDown={onKeyDown}
        onPaste={onPaste}
        onFocus={() => {
          setFocused(true)
          setDismissed(false)
        }}
        onBlur={() => {
          setFocused(false)
          setCurrent(null)
        }}
        className="max-w-full min-w-16 flex-[1_1_auto] border-0 bg-transparent p-0 text-base leading-[1.35] tracking-normal text-secondary-foreground outline-none [field-sizing:content] placeholder:text-card-foreground"
      />
      {menu}
    </div>
  )
}

/* ------------------------------- window -------------------------------- */

const emptyDraft: EmailDraft = {
  to: [],
  cc: [],
  bcc: [],
  subject: "",
  body: "",
  attachments: [],
}

const escapeHtml = (text: string) =>
  text.replace(
    /[&<>]/g,
    (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" })[c] as string
  )

export function EmailComposer({
  people = [],
  initial,
  fullScreenDefault,
  onFullScreenDefaultChange,
  spellCheck,
  onSpellCheckChange,
  onSend,
  onSchedule,
  onDiscard,
  onClose,
  onDrive,
  uploadImage,
  className,
}: EmailComposerProps) {
  const start = initial ?? emptyDraft
  const rootRef = React.useRef<HTMLElement>(null)

  /* ---- the recipients */
  const [to, setTo] = React.useState(start.to)
  const [cc, setCc] = React.useState(start.cc)
  const [bcc, setBcc] = React.useState(start.bcc)
  const [showCc, setShowCc] = React.useState(start.cc.length > 0)
  const [showBcc, setShowBcc] = React.useState(start.bcc.length > 0)
  const [queries, setQueries] = React.useState<Record<Field, string>>({
    to: "",
    cc: "",
    bcc: "",
  })
  const [editing, setEditing] = React.useState<Field | null>(null)
  const inputs = React.useRef<Record<Field, HTMLInputElement | null>>({
    to: null,
    cc: null,
    bcc: null,
  })
  const rows = React.useRef<Record<Field, HTMLElement | null>>({
    to: null,
    cc: null,
    bcc: null,
  })

  /**
   * A name for an address: the person's, or — for one outside the list — a
   * name read off the address, "harsha.r@timeless.co" as "Harsha R", so the
   * folded line and the chip read as people, not addresses.
   */
  const nameOf = React.useCallback(
    (value: string) =>
      people.find((p) => p.value.toLowerCase() === value.toLowerCase())
        ?.label ??
      value
        .split("@")[0]
        .split(/[._-]+/)
        .filter(Boolean)
        .map((word) => word[0].toUpperCase() + word.slice(1))
        .join(" "),
    [people]
  )

  const openField = (field: Field) => {
    setEditing(field)
    requestAnimationFrame(() => inputs.current[field]?.focus())
  }
  /** focus leaving a field — not into another of the three — folds them */
  const leaveField = (field: Field) => {
    setTimeout(() => {
      const active = document.activeElement
      if (rows.current[field]?.contains(active)) return
      setEditing((now) => (now === field ? null : now))
    }, 0)
  }
  /**
   * With the focus out of all three fields and people in them, the To line
   * carries everyone — "Alison Samuel  Cc: Sandeep Prabhakaran" — and the
   * Cc and Bcc rows stay out of the way until the line is opened again.
   */
  const folded = editing === null && to.length + cc.length + bcc.length > 0
  const foldedGroups = [
    { label: "", names: to },
    { label: "Cc:", names: cc },
    { label: "Bcc:", names: bcc },
  ]
    .filter((group) => group.names.length)
    .map((group) => ({
      label: group.label,
      text: group.names.map(nameOf).join(", "),
    }))
  /** Cc / Bcc pressed: the row shows, and takes the caret when it opens */
  const toggleRow = (field: "cc" | "bcc") => {
    const next = !(field === "cc" ? showCc : showBcc)
    ;(field === "cc" ? setShowCc : setShowBcc)(next)
    if (next) openField(field)
  }

  /** a row's glyph wears the placeholder's grey until it holds something */
  const glyphInk = (filled: boolean) =>
    filled ? "text-secondary-foreground" : "text-card-foreground"
  const fieldFilled = (field: Field, values: string[]) =>
    values.length > 0 || (editing === field && queries[field].trim() !== "")

  /* ---- the subject and the message */
  const [subject, setSubject] = React.useState(start.subject)
  const [attachments, setAttachments] = React.useState<File[]>(
    start.attachments
  )
  const fileRef = React.useRef<HTMLInputElement>(null)
  const imageRef = React.useRef<HTMLInputElement>(null)

  const editor = useEditor({
    immediatelyRender: false,
    content: start.body,
    extensions: [
      RichTextKit.configure({
        heading: { levels: [1, 2, 3] },
        table: false,
        taskList: false,
        details: false,
        columns: false,
        callout: false,
        attachment: false,
        audio: false,
        embed: false,
        video: false,
        mention: false,
        slashCommands: false,
        fontFamily: false,
        fontSize: false,
        lineHeight: false,
        subscript: false,
        superscript: false,
        tabKeys: false,
        limit: false,
        placeholder: { placeholder: "Type a message..." },
      }),
      HoldSelection,
    ],
  })

  /* ---- the window */
  const [expanded, setExpanded] = React.useState(!!fullScreenDefault)
  const [ownSpell, setOwnSpell] = React.useState(true)
  const spellOn = (spellCheck ?? ownSpell) !== false
  const [ownFull, setOwnFull] = React.useState(!!fullScreenDefault)
  const fullOn = fullScreenDefault ?? ownFull

  React.useEffect(() => {
    editor?.view.dom.setAttribute("spellcheck", spellOn ? "true" : "false")
  }, [editor, spellOn])

  const [colorOpen, setColorOpen] = React.useState(false)
  const [sendOpen, setSendOpen] = React.useState(false)
  const [linkOpen, setLinkOpen] = React.useState(false)

  const draft = (): EmailDraft => ({
    to,
    cc,
    bcc,
    subject,
    body: editor?.getHTML() ?? "",
    attachments,
  })
  const reset = () => {
    setTo([])
    setCc([])
    setBcc([])
    setShowCc(false)
    setShowBcc(false)
    setSubject("")
    setAttachments([])
    editor?.commands.clearContent()
  }
  const send = () => {
    onSend?.(draft())
    reset()
    onClose?.()
  }
  const schedule = () => {
    // nothing behind it unless given: a scheduled message leaves as a sent one
    if (onSchedule) {
      onSchedule(draft())
      reset()
      onClose?.()
    } else send()
  }
  const discard = () => {
    onDiscard?.(draft())
    reset()
    onClose?.()
  }

  const insertLink = () => {
    if (!editor) return
    // keep the run the link is for in view while the popup's field has focus
    hold(editor)
    setLinkOpen(true)
  }
  const takeImage = async (file: File | undefined) => {
    if (!file || !editor) return
    const src = uploadImage
      ? await uploadImage(file)
      : URL.createObjectURL(file)
    editor.chain().focus().setImage({ src, alt: file.name }).run()
  }

  /** the message on its own page, printed from a frame the page never shows */
  const printMessage = () => {
    const names = (list: string[]) => list.map(nameOf).join(", ")
    const title = escapeHtml(subject || "New message")
    const lines = [
      to.length && `<p><b>To:</b> ${escapeHtml(names(to))}</p>`,
      cc.length && `<p><b>Cc:</b> ${escapeHtml(names(cc))}</p>`,
      bcc.length && `<p><b>Bcc:</b> ${escapeHtml(names(bcc))}</p>`,
    ].filter(Boolean)
    const frame = document.createElement("iframe")
    frame.style.cssText = "position:fixed;width:0;height:0;border:0;opacity:0"
    document.body.appendChild(frame)
    const doc = frame.contentDocument
    if (!doc || !frame.contentWindow) return frame.remove()
    doc.open()
    doc.write(
      `<html><head><title>${title}</title><style>body{font:14px/1.5 Inter,system-ui,sans-serif;margin:40px;color:#171717}h1{font-size:20px}</style></head><body><h1>${title}</h1>${lines.join("")}<hr>${editor?.getHTML() ?? ""}</body></html>`
    )
    doc.close()
    frame.contentWindow.focus()
    frame.contentWindow.print()
    setTimeout(() => frame.remove(), 1000)
  }

  const recipientRow = (
    field: Field,
    values: string[],
    setValues: (values: string[]) => void,
    placeholder: string,
    Glyph: typeof PersonIcon
  ) => (
    <span
      ref={(el) => {
        rows.current[field] = el
      }}
      className="flex min-w-0 flex-1 items-start gap-2 pl-2"
      onFocus={() => setEditing(field)}
      onBlur={() => leaveField(field)}
    >
      <Glyph
        className={cn(
          "mt-1.5 size-4 shrink-0 transition-colors",
          glyphInk(fieldFilled(field, values))
        )}
      />
      {field === "to" && folded ? (
        // the line takes no focus of its own: a press that focused it would
        // open the field under the pointer before the click could land
        <button
          type="button"
          data-slot="email-composer-folded"
          className="h-7 min-w-0 flex-1 truncate text-left text-base leading-[1.35] tracking-normal text-secondary-foreground"
          onMouseDown={(event) => event.preventDefault()}
          onClick={() => openField("to")}
        >
          {foldedGroups.map((group, index) => (
            <React.Fragment key={group.label || "to"}>
              {index > 0 && <span aria-hidden="true">&ensp;</span>}
              {group.label && (
                <span className="mr-1 text-accent-foreground">
                  {group.label}
                </span>
              )}
              {group.text}
            </React.Fragment>
          ))}
        </button>
      ) : (
        <RecipientField
          values={values}
          onValuesChange={setValues}
          people={people}
          placeholder={placeholder}
          query={queries[field]}
          onQueryChange={(query) =>
            setQueries((now) => ({ ...now, [field]: query }))
          }
          nameOf={nameOf}
          inputRef={(el) => {
            inputs.current[field] = el
          }}
          boundsRef={rootRef}
        />
      )}
    </span>
  )

  const more = [
    {
      label: "Default to full screen",
      Icon: ExpandIcon,
      on: fullOn,
      run: () => {
        const on = !fullOn
        setOwnFull(on)
        onFullScreenDefaultChange?.(on)
        if (on) setExpanded(true)
      },
    },
    { label: "Print", Icon: PrintIcon, run: printMessage },
    {
      label: "Spell check",
      Icon: TextIcon,
      on: spellOn,
      run: () => {
        setOwnSpell(!spellOn)
        onSpellCheckChange?.(!spellOn)
      },
    },
  ]

  return (
    <TooltipProvider delay={150}>
      <section
        ref={rootRef}
        data-slot="email-composer"
        aria-label="New message"
        className={cn(
          "absolute right-6 bottom-6 z-20 flex max-h-[calc(100%-48px)] max-w-[calc(100%-48px)] flex-col overflow-hidden rounded-3xl bg-card shadow-elevation-2xl",
          // a fill paints over the window's inset edge, so the shadow is
          // drawn once more on a layer above everything (the window's clip
          // leaves only its inner edge); a fill under the contents covers
          // the window's own, or the edge showed twice
          "before:pointer-events-none before:absolute before:inset-0 before:-z-10 before:bg-card after:pointer-events-none after:absolute after:inset-0 after:z-10 after:rounded-[inherit] after:shadow-elevation-2xl",
          expanded ? "top-6 left-6" : "h-[540px] w-[600px]",
          className
        )}
      >
        {/* the header: the title, then pop out and close */}
        <header className="flex h-12 shrink-0 items-center justify-between bg-input pr-2.5 pl-4">
          <h2 className="text-lg leading-[1.35] font-medium tracking-normal text-foreground">
            New message
          </h2>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon-sm"
              className="text-foreground"
              aria-label={expanded ? "Shrink" : "Pop out"}
              onClick={() => setExpanded(!expanded)}
            >
              {expanded ? (
                <ShrinkIcon className="size-4" />
              ) : (
                <PopOutIcon className="size-4" />
              )}
            </Button>
            <Button
              variant="ghost"
              size="icon-sm"
              className="text-foreground"
              aria-label="Close"
              onClick={() => onClose?.()}
            >
              <SmallCloseIcon className="size-4" />
            </Button>
          </div>
        </header>

        {/* To. The row holds its top: when the chips run to a second line
            the glyph and Cc/Bcc stay with the first. 11.2 on the right sets
            the word's ink under the close glyph's in the header above */}
        <div className="flex shrink-0 items-start gap-2 border-b border-border-soft py-1.5 pr-[11.2px] pl-2">
          {recipientRow("to", to, setTo, "Recipients", PersonIcon)}
          <div className="flex shrink-0 items-center gap-1">
            {(["cc", "bcc"] as const).map((field) => {
              const shown = field === "cc" ? showCc : showBcc
              return (
                <Button
                  key={field}
                  variant="ghost"
                  size="sm"
                  aria-pressed={shown}
                  className={cn(
                    shown ? "text-secondary-foreground" : "text-accent-foreground"
                  )}
                  onClick={() => toggleRow(field)}
                >
                  {field === "cc" ? "Cc" : "Bcc"}
                </Button>
              )
            })}
          </div>
        </div>

        {/* Cc and Bcc: the same row without the buttons */}
        {(
          [
            ["cc", "Cc", showCc, cc, setCc],
            ["bcc", "Bcc", showBcc, bcc, setBcc],
          ] as const
        ).map(([field, label, shown, values, setValues]) => (
          <div
            key={field}
            className={cn(
              "flex shrink-0 items-start gap-2 border-b border-border-soft px-2 py-1.5",
              (!shown || folded) && "hidden"
            )}
          >
            {recipientRow(field, values, setValues, label, PeopleIcon)}
          </div>
        ))}

        {/* Subject */}
        <div className="relative shrink-0 border-b border-border-soft px-2 py-1.5">
          <SubjectIcon
            aria-hidden="true"
            className={cn(
              "pointer-events-none absolute top-1/2 left-4 size-4 -translate-y-1/2 transition-colors",
              glyphInk(subject.trim() !== "")
            )}
          />
          <input
            type="text"
            aria-label="Subject"
            placeholder="Subjects"
            autoComplete="off"
            value={subject}
            onChange={(event) => setSubject(event.target.value)}
            className="h-7 w-full rounded-md border-0 bg-transparent py-1.5 ps-8 pe-2 text-base leading-[1.15] tracking-normal text-secondary-foreground outline-none placeholder:text-card-foreground"
          />
        </div>

        {/* the message, and under it whatever is attached */}
        <div className="flex min-h-0 flex-1 flex-col overflow-y-auto">
          <EditorContent
            editor={editor}
            className={cn(
              "flex flex-1 flex-col p-4",
              "[&_.ProseMirror]:flex-1 [&_.ProseMirror]:text-base [&_.ProseMirror]:leading-[1.5] [&_.ProseMirror]:tracking-normal [&_.ProseMirror]:text-secondary-foreground [&_.ProseMirror]:whitespace-pre-wrap [&_.ProseMirror]:outline-none [&_.ProseMirror_p]:m-0",
              "[&_.ProseMirror_p.is-editor-empty:first-child]:before:pointer-events-none [&_.ProseMirror_p.is-editor-empty:first-child]:before:float-left [&_.ProseMirror_p.is-editor-empty:first-child]:before:h-0 [&_.ProseMirror_p.is-editor-empty:first-child]:before:text-card-foreground [&_.ProseMirror_p.is-editor-empty:first-child]:before:content-[attr(data-placeholder)]",
              "[&_.ProseMirror_ul]:list-disc [&_.ProseMirror_ul]:pl-5 [&_.ProseMirror_ol]:list-decimal [&_.ProseMirror_ol]:pl-5 [&_.ProseMirror_blockquote]:border-l-2 [&_.ProseMirror_blockquote]:border-border [&_.ProseMirror_blockquote]:pl-3 [&_.ProseMirror_pre]:my-1 [&_.ProseMirror_pre]:rounded-md [&_.ProseMirror_pre]:bg-secondary [&_.ProseMirror_pre]:p-3 [&_.ProseMirror_pre]:font-mono [&_.ProseMirror_pre]:text-sm [&_.ProseMirror_img]:max-w-full [&_.ProseMirror_img]:rounded-md [&_.ProseMirror_a]:text-blue-600 [&_.ProseMirror_a]:underline",
              // a picture stands clear of the lines around it, its ring too
              "[&_.ProseMirror_.rte-media]:my-2",
              // the run a link is being made for, painted while the popup
              // has the focus
              "[&_.email-composer-held]:bg-[color-mix(in_srgb,Highlight_35%,transparent)]"
            )}
          />
          {attachments.length > 0 && (
            <div className="flex shrink-0 flex-wrap items-center gap-1 px-4 pb-4">
              {attachments.map((file, index) => (
                <span
                  key={`${file.name}-${index}`}
                  data-slot="email-composer-attachment"
                  className="flex h-6 max-w-full items-center gap-1 rounded-sm border border-border pr-[3px] pl-[5px] transition-colors hover:border-border-normal"
                >
                  <FileIcon className="size-4 shrink-0 text-secondary-foreground" />
                  <span className="truncate text-sm leading-[1.35] tracking-normal text-secondary-foreground">
                    {file.name}
                  </span>
                  <button
                    type="button"
                    aria-label={`Remove ${file.name}`}
                    onClick={() =>
                      setAttachments((now) => now.filter((_, i) => i !== index))
                    }
                    className="flex size-3 shrink-0 items-center justify-center text-secondary-foreground hover:text-foreground"
                  >
                    <SmallCloseIcon className="size-3" />
                  </button>
                </span>
              ))}
            </div>
          )}
          <input
            ref={fileRef}
            type="file"
            multiple
            hidden
            aria-hidden="true"
            tabIndex={-1}
            onChange={(event) => {
              const picked = Array.from(event.target.files ?? [])
              setAttachments((now) => [...now, ...picked])
              event.target.value = ""
            }}
          />
          <input
            ref={imageRef}
            type="file"
            accept="image/*"
            hidden
            aria-hidden="true"
            tabIndex={-1}
            onChange={(event) => {
              void takeImage(event.target.files?.[0])
              event.target.value = ""
            }}
          />
        </div>

        {/* the toolbar: Send and its menu, the glyphs, the bin */}
        <div className="flex h-14 shrink-0 items-center justify-between px-4 pt-3 pb-4">
          <div className="flex items-center gap-1">
            {/* Send: two solid buttons side by side, the word and the
                chevron parted by a 1px line; the chevron opens Schedule
                send above the pill and turns up while it is open */}
            <DropdownMenu open={sendOpen} onOpenChange={setSendOpen}>
              <div className="flex items-center">
                <Button
                  size="sm"
                  className="w-[50px] rounded-r-none px-2"
                  onClick={send}
                >
                  Send
                </Button>
                <DropdownMenuTrigger
                  render={
                    <Button
                      size="sm"
                      aria-label="Send options"
                      className={cn(
                        "w-6 rounded-l-none border-l border-border-stronger pr-1 pl-[3px]",
                        sendOpen && "bg-primary/86"
                      )}
                    >
                      {sendOpen ? (
                        <SmallUpIcon className="size-4" />
                      ) : (
                        <SendChevronIcon className="size-4" />
                      )}
                    </Button>
                  }
                />
              </div>
              {/* the menu hangs from the pill's left edge, not the chevron's */}
              <DropdownMenuContent
                side="top"
                align="start"
                alignOffset={-50}
                sideOffset={4}
                className="min-w-40"
              >
                <DropdownMenuItem className="gap-2" onClick={schedule}>
                  Schedule send
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            <Popover open={colorOpen} onOpenChange={setColorOpen}>
              <BarTip label="Text color">
                <PopoverTrigger
                  className={undefined}
                  render={
                    <BarButton
                      label="Text color"
                      className="data-popup-open:bg-muted"
                    >
                      <TextColorIcon className="size-4" />
                    </BarButton>
                  }
                />
              </BarTip>
              {editor && (
                <PopoverContent
                  side="top"
                  align="start"
                  sideOffset={4}
                  initialFocus={false}
                  finalFocus={false}
                  className="w-auto gap-0 rounded-lg p-2.5"
                >
                  <ColorPanel
                    editor={editor}
                    onPick={() => setColorOpen(false)}
                  />
                </PopoverContent>
              )}
            </Popover>

            <BarTip label="Attachment">
              <BarButton
                label="Attachment"
                onClick={() => fileRef.current?.click()}
              >
                <AttachmentIcon className="size-4" />
              </BarButton>
            </BarTip>

            <BarTip label="Link">
              <BarButton
                label="Link"
                className={cn(linkOpen && "bg-muted")}
                onClick={insertLink}
              >
                <LinkIcon className="size-4" />
              </BarButton>
            </BarTip>

            <EmojiPicker
              onValueChange={(emoji) =>
                editor?.chain().focus().insertContent(emoji).run()
              }
            >
              <BarTip label="Emoji">
                <EmojiPickerTrigger
                  render={
                    <BarButton
                      label="Emoji"
                      className="data-popup-open:bg-muted"
                    >
                      <EmojiIcon className="size-4" />
                    </BarButton>
                  }
                />
              </BarTip>
              <EmojiPickerContent side="top" align="start" sideOffset={6} />
            </EmojiPicker>

            <BarTip label="Drive">
              <BarButton label="Drive" onClick={() => onDrive?.()}>
                <FolderIcon className="size-4" />
              </BarButton>
            </BarTip>

            <BarTip label="Images">
              <BarButton
                label="Images"
                onClick={() => imageRef.current?.click()}
              >
                <ImageIcon className="size-4" />
              </BarButton>
            </BarTip>

            {/* the ⋮: two settings with the check at the right when on —
                the check keeps its room when off, so the menu is one width
                whichever are on — and Print between them */}
            <DropdownMenu>
              <BarTip label="More Options">
                <DropdownMenuTrigger
                  render={
                    <BarButton label="More Options">
                      <MoreVerticalIcon className="size-4" />
                    </BarButton>
                  }
                />
              </BarTip>
              <DropdownMenuContent
                side="top"
                align="start"
                sideOffset={4}
                className="min-w-40"
              >
                {more.map((item) => (
                  <DropdownMenuItem
                    key={item.label}
                    className="gap-2"
                    onClick={item.run}
                  >
                    <item.Icon className="size-4 shrink-0 text-secondary-foreground" />
                    <span className="min-w-0 flex-1 truncate leading-[1.15]">
                      {item.label}
                    </span>
                    {"on" in item && (
                      <CheckIcon
                        aria-hidden="true"
                        className={cn(
                          "size-4 shrink-0 text-secondary-foreground",
                          !item.on && "invisible"
                        )}
                      />
                    )}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          <Button
            variant="ghost"
            size="icon-sm"
            aria-label="Discard"
            className="text-accent-foreground"
            onClick={discard}
          >
            <DeleteIcon className="size-4" />
          </Button>
        </div>

        {editor && (
          <LinkPopup
            editor={editor}
            open={linkOpen}
            onClose={() => {
              setLinkOpen(false)
              release(editor)
            }}
          />
        )}
      </section>
    </TooltipProvider>
  )
}
