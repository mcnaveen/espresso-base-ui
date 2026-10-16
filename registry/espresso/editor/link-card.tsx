"use client"

// The link card (31823:54797, 31823:54816) over a link, and the
// `openLinkEditor` command that raises it over the selection (the
// toolbar's and the floating bar's Link buttons and ⌘K). A 36px card on a
// 12px radius, 4px in, under the xl shadow: the subtle input at 28px (the
// globe, 8, the address) and a 28px ghost button beside it. The address is
// always the one to change: a click in it edits, Enter keeps it, Escape
// leaves it. Over a link the button unlinks; a new link has none. Hovering
// a link raises the same card over it; a click on a link goes to its page.
import * as React from "react"
import { createRoot } from "react-dom/client"
import { Extension, getMarkRange, type Editor as TiptapEditor } from "@tiptap/core"
import { Plugin, PluginKey } from "@tiptap/pm/state"

import { cn } from "@/lib/utils"
import { Input } from "@/components/ui/input"
import {
  GlobeIcon,
  LinkBrokenIcon,
} from "@/components/ui/rich-text-editor-icons"

import { LINK_ON_KEY } from "./extensions"

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
  autoFocus,
  onUpdateHref,
  onClose,
  onEngage,
}: {
  href: string
  /** the address takes the focus as the card opens (a card asked for) */
  autoFocus?: boolean
  onUpdateHref: (href: string) => void
  onClose: () => void
  /** the address is being edited: a hover card stays while it is */
  onEngage?: () => void
}) {
  const [value, setValue] = React.useState(href)
  const [shake, setShake] = React.useState(false)
  const inputRef = React.useRef<HTMLInputElement>(null)

  const submit = () => {
    const next = normalize(value)
    if (next === href) return onClose()
    if (next === "" || isValid(next)) onUpdateHref(next)
    else {
      setShake(false)
      requestAnimationFrame(() => setShake(true))
    }
  }

  React.useEffect(() => {
    if (!autoFocus) return
    requestAnimationFrame(() => {
      const el = inputRef.current
      if (!el) return
      // the card is placed a frame later; a plain focus would scroll to
      // wherever it sits meanwhile
      el.focus({ preventScroll: true })
      el.select()
    })
  }, [autoFocus])

  // Escape is the card's: it goes, the address as it was
  React.useEffect(() => {
    const onKeydown = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return
      e.preventDefault()
      e.stopPropagation()
      onClose()
    }
    document.addEventListener("keydown", onKeydown, true)
    return () => document.removeEventListener("keydown", onKeydown, true)
  }, [onClose])

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
          aria-label="Link address"
          value={value}
          onFocus={onEngage}
          onChange={(e) => {
            setValue(e.target.value)
            onEngage?.()
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault()
              submit()
            }
          }}
        />
      </div>
      {href ? (
        <button
          type="button"
          aria-label="Remove link"
          title="Remove link"
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

type LinkPopup = {
  /** the address to set, `''` to unlink, or `null` when the card was left */
  done: Promise<string | null>
  close: () => void
  /** the card's box, for a hover's way across to it */
  host: HTMLElement
  /** the address has been taken up: a hover card no longer leaves by itself */
  engaged: () => boolean
}

/**
 * The card over `range`, placed above it (below when there is no room).
 * Asked for (the Link button, ⌘K) it takes the focus; raised by a hover it
 * waits to be clicked into. Never rejects.
 */
function openLinkPopup(args: {
  editor: TiptapEditor
  href: string | null
  autoFocus: boolean
  range: Range
}): LinkPopup {
  const { editor } = args
  let settled = false
  let engaged = args.autoFocus
  let resolve: (value: string | null) => void = () => {}
  const done = new Promise<string | null>((r) => (resolve = r))
  const host = document.createElement("div")
  host.className = "fixed z-70"
  document.body.appendChild(host)
  const root = createRoot(host)

  const ground = (on: boolean) => {
    if (editor.isDestroyed) return
    const range = on ? mapRange(editor, args.range) : null
    editor.view.dispatch(editor.state.tr.setMeta(LINK_ON_KEY, range))
  }
  const settle = (value: string | null) => {
    if (settled) return
    settled = true
    ground(false)
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
  ground(true)

  root.render(
    <LinkCard
      href={args.href ?? ""}
      autoFocus={args.autoFocus}
      onEngage={() => (engaged = true)}
      onUpdateHref={(href) => settle(href)}
      onClose={() => {
        const asked = args.autoFocus
        settle(null)
        if (asked && !editor.isDestroyed)
          editor.commands.focus(undefined, { scrollIntoView: false })
      }}
    />
  )
  position()
  requestAnimationFrame(position)
  return { done, close: () => settle(null), host, engaged: () => engaged }
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
      openLinkEditor: () => ReturnType
    }
  }
}

export const LinkEditor = Extension.create({
  name: "rteLinkEditor",
  addCommands() {
    return {
      openLinkEditor:
        () =>
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
            void openLinkPopup({ editor, href: existing, autoFocus: true, range })
              .done.then((href) => {
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

/** how long the pointer rests on a link before its card comes */
const HOVER_OPEN = 350
/** how long the card waits once the pointer has left link and card both */
const HOVER_CLOSE = 250

/**
 * A link in the document, edited in place.
 *
 * A click goes to its page, in a new tab, through the editor's own click
 * handling (ProseMirror calls it on a real click, no drag), not the raw
 * DOM click a contenteditable can swallow. Read-only, the browser follows
 * the link itself.
 *
 * A hover raises the link card over the link: the address to change and
 * the button that unlinks. It leaves as the pointer leaves link and card
 * both, unless the address has been taken up. With text selected the
 * selection's own bar is the one up, and no card comes over it.
 */
export function LinkClickCard({ editor }: { editor: TiptapEditor }) {
  React.useEffect(() => {
    if (editor.isDestroyed) return
    const view = editor.view
    let card: (LinkPopup & { link: Element }) | null = null
    let openTimer: ReturnType<typeof setTimeout> | undefined
    let closeTimer: ReturnType<typeof setTimeout> | undefined
    let pending: Element | null = null

    const closeCard = () => {
      clearTimeout(closeTimer)
      card?.close()
      card = null
    }
    const scheduleClose = () => {
      clearTimeout(closeTimer)
      closeTimer = setTimeout(() => {
        if (card && !card.engaged()) closeCard()
      }, HOVER_CLOSE)
    }
    const linkOf = (target: EventTarget | null) => {
      const el = target instanceof Element ? target : null
      const link = el?.closest("a[href]:not([data-attachment])") ?? null
      return link && view.dom.contains(link) ? link : null
    }
    const rangeOf = (link: Element) => {
      let pos: number
      try {
        pos = view.posAtDOM(link, 0)
      } catch {
        return null
      }
      const type = editor.state.schema.marks.link
      if (!type) return null
      const $pos = editor.state.doc.resolve(Math.min(pos + 1, editor.state.doc.content.size))
      return getMarkRange($pos, type) ?? null
    }
    const raise = (link: Element) => {
      const range = rangeOf(link)
      const href = link.getAttribute("href")
      if (!range || !href) return
      closeCard()
      const popup = openLinkPopup({ editor, href, autoFocus: false, range })
      card = { ...popup, link }
      popup.host.addEventListener("mouseenter", () => clearTimeout(closeTimer))
      popup.host.addEventListener("mouseleave", scheduleClose)
      void popup.done.then((next) => {
        if (card?.host === popup.host) card = null
        if (next === null || editor.isDestroyed) return
        applyLink(editor, range, next)
      })
    }

    const onOver = (event: MouseEvent) => {
      if (!view.editable || event.buttons !== 0) return
      const link = linkOf(event.target)
      if (!link) return
      // a selection has its own bar; the card does not come over it
      if (!editor.state.selection.empty) return
      if (card?.link === link) {
        clearTimeout(closeTimer)
        return
      }
      if (pending === link) return
      pending = link
      clearTimeout(openTimer)
      openTimer = setTimeout(() => {
        pending = null
        if (!editor.state.selection.empty || editor.isDestroyed) return
        if (!link.isConnected) return
        raise(link)
      }, HOVER_OPEN)
    }
    const onOut = (event: MouseEvent) => {
      const link = linkOf(event.target)
      if (!link) return
      const to = event.relatedTarget
      if (to instanceof Node && (link.contains(to) || card?.host.contains(to))) return
      if (pending === link) {
        pending = null
        clearTimeout(openTimer)
      }
      if (card?.link === link) scheduleClose()
    }
    // a press in the document (a selection begun, a caret placed) sends it
    const onDown = () => {
      clearTimeout(openTimer)
      pending = null
    }

    view.dom.addEventListener("mouseover", onOver)
    view.dom.addEventListener("mouseout", onOut)
    view.dom.addEventListener("mousedown", onDown)

    const key = new PluginKey("rteLinkClick")
    editor.registerPlugin(
      new Plugin({
        key,
        props: {
          handleClick(v, _pos, event) {
            if (!v.editable || event.button !== 0) return false
            const link = linkOf(event.target)
            const href = link?.getAttribute("href")
            if (!href) return false
            event.preventDefault()
            closeCard()
            window.open(href, "_blank", "noopener,noreferrer")
            return true
          },
        },
      })
    )
    return () => {
      clearTimeout(openTimer)
      closeCard()
      view.dom.removeEventListener("mouseover", onOver)
      view.dom.removeEventListener("mouseout", onOut)
      view.dom.removeEventListener("mousedown", onDown)
      if (!editor.isDestroyed) editor.unregisterPlugin(key)
    }
  }, [editor])
  return null
}
