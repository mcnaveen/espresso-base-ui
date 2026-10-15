"use client"

// The link card (31823:54797, 31823:54816) over the selection, and the
// `openLinkEditor` command that raises it — the one command the toolbar's
// and the floating bar's Link buttons, ⌘K and a click on a link all run,
// so every way in shows the same card. A 36px card on a 12px radius, 4px
// in, under the xl shadow: the subtle input at 28px — the globe, 8, the
// address — and a 28px ghost button beside it. Over a link the address is
// read and the button is the pencil; editing, the address is live and the
// button unlinks. A new link opens straight into editing with no button.
import * as React from "react"
import { createRoot } from "react-dom/client"
import { Extension, getMarkRange, type Editor as TiptapEditor } from "@tiptap/core"

import { cn } from "@/lib/utils"
import { Input } from "@/components/ui/input"
import {
  EditIcon,
  GlobeIcon,
  LinkBrokenIcon,
} from "@/components/ui/rich-text-editor-icons"

const ALLOWED = /^(https?|mailto|tel):/i

const normalize = (raw: string) => {
  const trimmed = raw.trim()
  if (!trimmed) return ""
  if (/^[a-z][a-z0-9+.-]*:/i.test(trimmed)) return trimmed
  return `https://${trimmed}`
}

const isValid = (href: string) => {
  if (!ALLOWED.test(href)) return false
  let url: URL
  try {
    url = new URL(href)
  } catch {
    return false
  }
  if (url.protocol === "http:" || url.protocol === "https:")
    return url.hostname === "localhost" || url.hostname.includes(".")
  return true
}

export function LinkCard({
  href,
  startInEdit,
  onUpdateHref,
  onClose,
}: {
  href: string
  /** open straight into editing; otherwise a link is read first */
  startInEdit?: boolean
  onUpdateHref: (href: string) => void
  onClose: () => void
}) {
  const [value, setValue] = React.useState(href)
  const [edit, setEdit] = React.useState(startInEdit ?? !href)
  const [shake, setShake] = React.useState(false)
  const inputRef = React.useRef<HTMLInputElement>(null)

  const submit = () => {
    const next = normalize(value)
    if (next === "" || isValid(next)) onUpdateHref(next)
    else {
      setShake(false)
      requestAnimationFrame(() => setShake(true))
    }
  }

  const focusInput = React.useCallback(() => {
    requestAnimationFrame(() => {
      const el = inputRef.current
      if (!el) return
      // the card is placed a frame later; a plain focus would scroll to
      // wherever it sits meanwhile
      el.focus({ preventScroll: true })
      el.select()
    })
  }, [])

  React.useEffect(() => {
    if (edit) focusInput()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Escape is the card's: editing a link it steps back to reading;
  // otherwise it closes
  React.useEffect(() => {
    const onKeydown = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return
      e.preventDefault()
      e.stopPropagation()
      if (edit && href) {
        setValue(href)
        setEdit(false)
        return
      }
      onClose()
    }
    document.addEventListener("keydown", onKeydown, true)
    return () => document.removeEventListener("keydown", onKeydown, true)
  }, [edit, href, onClose])

  const ghostBtn =
    "flex size-7 shrink-0 items-center justify-center rounded-md text-secondary-foreground transition-colors hover:bg-secondary [&>svg]:size-4"

  return (
    <div
      className="rte-link flex items-center gap-1 rounded-xl bg-card p-1 shadow-elevation-xl"
      role="dialog"
      aria-label="Link"
    >
      <div
        className={cn("relative w-[276px]", shake && "rte-link-shake")}
        onAnimationEnd={() => setShake(false)}
      >
        <GlobeIcon className="pointer-events-none absolute top-1/2 left-2 size-4 -translate-y-1/2 text-secondary-foreground" />
        <Input
          ref={inputRef}
          size="sm"
          variant="subtle"
          className="w-full pl-8"
          placeholder="Paste or type a link"
          readOnly={!edit}
          aria-label="Link address"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault()
              submit()
            }
          }}
        />
      </div>
      {!edit ? (
        <button
          type="button"
          aria-label="Edit link"
          className={ghostBtn}
          onClick={() => {
            setEdit(true)
            focusInput()
          }}
        >
          <EditIcon />
        </button>
      ) : href ? (
        <button
          type="button"
          aria-label="Remove link"
          className={ghostBtn}
          onClick={() => onUpdateHref("")}
        >
          <LinkBrokenIcon />
        </button>
      ) : null}
    </div>
  )
}

type Range = { from: number; to: number }

/** the range carried through the live document */
function mapRange(editor: TiptapEditor, range: Range): Range {
  const size = editor.state.doc.content.size
  return {
    from: Math.min(range.from, size),
    to: Math.min(range.to, size),
  }
}

function selectionRect(editor: TiptapEditor, range: Range): DOMRect {
  const { from, to } = mapRange(editor, range)
  const start = editor.view.coordsAtPos(from)
  const end = editor.view.coordsAtPos(to)
  const top = Math.min(start.top, end.top)
  const bottom = Math.max(start.bottom, end.bottom)
  const left = Math.min(start.left, end.left)
  const right = Math.max(start.right, end.right)
  return new DOMRect(left, top, Math.max(right - left, 0), bottom - top)
}

/**
 * Resolves with the address to set, `''` to unlink, or `null` when the
 * card was left — never rejects.
 */
function openLinkPopup(args: {
  editor: TiptapEditor
  href: string | null
  startInEdit: boolean
  range: Range
}): Promise<string | null> {
  const { editor } = args
  return new Promise<string | null>((resolve) => {
    let settled = false
    const host = document.createElement("div")
    host.className = "fixed z-70"
    document.body.appendChild(host)
    const root = createRoot(host)

    const settle = (value: string | null) => {
      if (settled) return
      settled = true
      document.removeEventListener("pointerdown", onDown, true)
      window.removeEventListener("scroll", position, true)
      window.removeEventListener("resize", position)
      root.unmount()
      host.remove()
      resolve(value)
    }
    const onDown = (e: PointerEvent) => {
      if (e.target instanceof Node && host.contains(e.target)) return
      settle(null)
    }
    const position = () => {
      if (settled || editor.isDestroyed) return
      try {
        const rect = selectionRect(editor, args.range)
        const box = host.firstElementChild?.getBoundingClientRect()
        const height = box?.height ?? 36
        const above = rect.top - 8 - height
        host.style.left = `${Math.max(8, rect.left)}px`
        host.style.top = `${above >= 8 ? above : rect.bottom + 8}px`
      } catch {
        // the document moved out from underneath; keep the last place
      }
    }
    document.addEventListener("pointerdown", onDown, true)
    window.addEventListener("scroll", position, true)
    window.addEventListener("resize", position)

    root.render(
      <LinkCard
        href={args.href ?? ""}
        startInEdit={args.startInEdit}
        onUpdateHref={(href) => settle(href)}
        onClose={() => {
          settle(null)
          if (!editor.isDestroyed)
            editor.commands.focus(undefined, { scrollIntoView: false })
        }}
      />
    )
    position()
    requestAnimationFrame(position)
  })
}

/** `''` unlinks; an address sets it. Stored marks go, so typing on is plain. */
function applyLink(editor: TiptapEditor, stored: Range, href: string): void {
  const { from, to } = mapRange(editor, stored)
  const chain = editor.chain().focus(undefined, { scrollIntoView: false })
  if (href === "") {
    chain
      .setTextSelection({ from, to })
      .unsetLink()
      .command(({ tr }) => {
        tr.setStoredMarks([])
        return true
      })
      .run()
    return
  }
  chain
    .setTextSelection({ from, to })
    .setLink({ href })
    .setTextSelection(to)
    .command(({ tr }) => {
      tr.setStoredMarks([])
      return true
    })
    .run()
}

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    rteLinkEditor: {
      /** raise the link card over the selection, or the link the caret is in */
      openLinkEditor: (options?: { startInEdit?: boolean }) => ReturnType
    }
  }
}

export const LinkEditor = Extension.create({
  name: "rteLinkEditor",
  addCommands() {
    return {
      openLinkEditor:
        (options) =>
        ({ editor }) => {
          const { state } = editor
          const markType = state.schema.marks.link
          if (!markType) return false
          const { from, to } = state.selection

          let range: Range
          let delay = false
          if (from === to) {
            // a caret in a link: the whole link, and the card once its
            // selection has painted
            const markRange = getMarkRange(state.selection.$from, markType)
            if (!markRange) return false
            range = { from: markRange.from, to: markRange.to }
            editor.chain().setTextSelection(range).run()
            delay = true
          } else {
            range = { from, to }
          }

          const existing =
            (editor.getAttributes("link").href as string | undefined) || null

          const show = () => {
            void openLinkPopup({
              editor,
              href: existing,
              startInEdit: options?.startInEdit ?? !existing,
              range,
            }).then((href) => {
              if (href === null || editor.isDestroyed) return
              applyLink(editor, range, href)
            })
          }
          if (delay) requestAnimationFrame(show)
          else show()
          return true
        },
    }
  },
  addKeyboardShortcuts() {
    return {
      "Mod-k": () => this.editor.commands.openLinkEditor(),
    }
  },
})

/** the card over a clicked link: read first, as the file draws it */
export function LinkClickCard({ editor }: { editor: TiptapEditor }) {
  React.useEffect(() => {
    const dom = editor.view.dom
    const onClick = (event: MouseEvent) => {
      if (!editor.isEditable) return
      const target = event.target instanceof Element ? event.target : null
      const link = target?.closest?.("a[href]:not([data-attachment])")
      if (!link || !dom.contains(link)) return
      event.preventDefault()
      let pos: number | null = null
      try {
        pos = editor.view.posAtDOM(link, 0)
      } catch {
        pos = null
      }
      if (pos === null) return
      const $pos = editor.state.doc.resolve(pos + 1)
      const markType = editor.state.schema.marks.link
      const range = getMarkRange($pos, markType)
      if (!range) return
      editor.chain().setTextSelection(range).run()
      requestAnimationFrame(() =>
        editor.commands.openLinkEditor({ startInEdit: false })
      )
    }
    dom.addEventListener("click", onClick)
    return () => dom.removeEventListener("click", onClick)
  }, [editor])
  return null
}
