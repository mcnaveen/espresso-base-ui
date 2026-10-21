"use client"

// Notion's box selection. A press in the empty page around the document,
// dragged, draws a box; every block it touches is chosen whole and tinted,
// as it is drawn and after. The choice is a run of the document's
// top-level blocks, kept beside the editor's own selection: Backspace or
// Delete takes them all away, copy and cut carry them, Escape, a click or
// a key lets them go.
import * as React from "react"
import { createPortal } from "react-dom"
import { Extension, type Editor as TiptapEditor } from "@tiptap/core"
import {
  Plugin,
  PluginKey,
  TextSelection,
  type EditorState,
} from "@tiptap/pm/state"
import { Decoration, DecorationSet, type EditorView } from "@tiptap/pm/view"

/** the run of sibling blocks chosen, as document positions: the page's own
 * blocks as the box chooses them, or a column's, carried there */
export interface BlockRange {
  from: number
  to: number
}

export const blockSelectKey = new PluginKey<BlockRange | null>(
  "rteBlockSelect"
)

/** the blocks chosen, if any */
export const chosenBlocks = (state: EditorState) =>
  blockSelectKey.getState(state) ?? null

/** a step that chooses `range`, or lets the choice go */
const choose = (view: EditorView, range: BlockRange | null) => {
  const { state } = view
  const tr = state.tr.setMeta(blockSelectKey, range)
  // the caret waits, unseen, at the first block chosen, so the keys and
  // the clipboard come to the document
  if (range) {
    const near = TextSelection.near(state.doc.resolve(range.from))
    tr.setSelection(near)
  }
  view.dispatch(tr)
}

/** each block of the run, with its position */
export function eachChosen(
  doc: EditorState["doc"],
  range: BlockRange,
  f: (node: EditorState["doc"], pos: number) => void
) {
  const $from = doc.resolve(range.from)
  const start = $from.start()
  $from.parent.forEach((node, offset) => {
    const pos = start + offset
    if (pos >= range.from && pos + node.nodeSize <= range.to) f(node, pos)
  })
}

/** the chosen blocks taken away, a line left if they were all there was */
const remove = (view: EditorView, range: BlockRange) => {
  const { state } = view
  const tr = state.tr
  const $from = state.doc.resolve(range.from)
  if (range.from === $from.start() && range.to === $from.end())
    tr.replaceWith(range.from, range.to, state.schema.nodes.paragraph.create())
  else tr.delete(range.from, range.to)
  const at = Math.min(range.from, tr.doc.content.size)
  tr.setSelection(TextSelection.near(tr.doc.resolve(at), -1))
  tr.setMeta(blockSelectKey, null)
  view.dispatch(tr.scrollIntoView())
}

export const BlockSelect = Extension.create({
  name: "rteBlockSelect",
  addProseMirrorPlugins() {
    return [
      new Plugin<BlockRange | null>({
        key: blockSelectKey,
        state: {
          init: () => null,
          apply(tr, value) {
            const meta = tr.getMeta(blockSelectKey) as
              | BlockRange
              | null
              | undefined
            if (meta !== undefined) return meta
            // any edit, or the caret moved by a click or a key, lets go
            if (!value || tr.docChanged || tr.selectionSet) return null
            return value
          },
        },
        props: {
          decorations(state) {
            const range = blockSelectKey.getState(state)
            if (!range) return null
            const marks: Decoration[] = []
            eachChosen(state.doc, range, (node, pos) =>
              marks.push(
                Decoration.node(pos, pos + node.nodeSize, {
                  class: "rte-block-chosen",
                })
              )
            )
            return DecorationSet.create(state.doc, marks)
          },
          attributes(state): Record<string, string> {
            return blockSelectKey.getState(state)
              ? { class: "has-chosen-blocks" }
              : {}
          },
          handleKeyDown(view, event) {
            const range = blockSelectKey.getState(view.state)
            if (!range) return false
            if (event.key === "Backspace" || event.key === "Delete") {
              remove(view, range)
              return true
            }
            if (event.key === "Escape") {
              choose(view, null)
              return true
            }
            // copy and cut go on to the clipboard's own events; a modifier
            // alone changes nothing
            const mod = event.metaKey || event.ctrlKey
            if (mod && ["c", "x"].includes(event.key.toLowerCase())) return false
            if (["Meta", "Control", "Shift", "Alt"].includes(event.key))
              return false
            // any other key lets the blocks go and does what it does
            choose(view, null)
            return false
          },
          handleDOMEvents: {
            copy: (view, event) => carry(view, event, false),
            cut: (view, event) => carry(view, event, true),
          },
        },
      }),
    ]
  },
})

/** the chosen blocks put on the clipboard, and taken away on a cut */
function carry(view: EditorView, event: ClipboardEvent, cut: boolean) {
  const range = blockSelectKey.getState(view.state)
  if (!range || !event.clipboardData) return false
  event.preventDefault()
  const slice = view.state.doc.slice(range.from, range.to)
  const { dom, text } = view.serializeForClipboard(slice)
  event.clipboardData.clearData()
  event.clipboardData.setData("text/html", dom.innerHTML)
  event.clipboardData.setData("text/plain", text)
  if (cut) remove(view, range)
  return true
}

/** how far the pointer goes before a press becomes a box */
const START = 4
/** how near the scroller's edge the box starts scrolling it, in px */
const EDGE = 48

/**
 * The box itself: a press on the page around the document (never on a
 * block, a control or a menu) draws it, and as it grows the blocks it
 * touches are chosen.
 */
export function BlockMarquee({ editor }: { editor: TiptapEditor }) {
  const [box, setBox] = React.useState<{
    left: number
    top: number
    width: number
    height: number
  } | null>(null)

  React.useEffect(() => {
    if (editor.isDestroyed) return
    const view = editor.view
    const dom = view.dom as HTMLElement
    const stage = dom.closest<HTMLElement>('[data-slot="rich-text-editor"]')
    const scroller = dom.closest<HTMLElement>(
      '[data-slot="rich-text-editor-scroll"]'
    )
    if (!stage || !scroller) return

    const onDown = (e: MouseEvent) => {
      if (e.button !== 0 || !editor.isEditable) return
      const target = e.target as Element | null
      // the page around the document only: not a block, nor a control on it
      if (!target || !scroller.contains(target) || dom.contains(target)) return
      if (
        target.closest(
          'button, a, input, textarea, select, [role="menu"], [role="dialog"], .rte-bh-handle, .rte-cr'
        )
      )
        return
      // no text selection of the page, no focus taken from the document
      e.preventDefault()

      // the box is kept in the scroller's own frame, so it stays put on
      // the page as the page scrolls under it
      const frame = () => scroller.getBoundingClientRect()
      const startX = e.clientX - frame().left + scroller.scrollLeft
      const startY = e.clientY - frame().top + scroller.scrollTop
      let x = e.clientX
      let y = e.clientY
      let drawing = false
      let tick = 0

      const update = () => {
        const f = frame()
        const nowX = x - f.left + scroller.scrollLeft
        const nowY = y - f.top + scroller.scrollTop
        const left = Math.min(startX, nowX)
        const top = Math.min(startY, nowY)
        const width = Math.abs(nowX - startX)
        const height = Math.abs(nowY - startY)
        // drawn on the screen, where the portal stands
        const screen = {
          left: left + f.left - scroller.scrollLeft,
          top: top + f.top - scroller.scrollTop,
          width,
          height,
        }
        setBox(screen)
        let first: number | null = null
        let last: number | null = null
        view.state.doc.forEach((node, offset) => {
          const el = view.nodeDOM(offset)
          if (!(el instanceof HTMLElement)) return
          const r = el.getBoundingClientRect()
          const hit =
            r.right > screen.left &&
            r.left < screen.left + width &&
            r.bottom > screen.top &&
            r.top < screen.top + height
          if (!hit) return
          if (first === null) first = offset
          last = offset + node.nodeSize
        })
        const range = first !== null && last !== null ? { from: first, to: last } : null
        const was = blockSelectKey.getState(view.state)
        if (was?.from !== range?.from || was?.to !== range?.to)
          choose(view, range)
      }

      // near the scroller's top or bottom edge the page scrolls along
      const scroll = () => {
        tick = 0
        const f = frame()
        const step =
          y < f.top + EDGE
            ? -Math.ceil((f.top + EDGE - y) / 4)
            : y > f.bottom - EDGE
              ? Math.ceil((y - f.bottom + EDGE) / 4)
              : 0
        if (!step) return
        scroller.scrollTop += step
        update()
        tick = requestAnimationFrame(scroll)
      }

      const move = (ev: MouseEvent) => {
        x = ev.clientX
        y = ev.clientY
        if (!drawing) {
          if (Math.hypot(x - e.clientX, y - e.clientY) < START) return
          drawing = true
          document.body.classList.add("rte-marquee")
          // the blocks chosen before go when a new box starts
          choose(view, null)
        }
        update()
        if (!tick) tick = requestAnimationFrame(scroll)
      }
      const up = () => {
        window.removeEventListener("mousemove", move)
        window.removeEventListener("mouseup", up)
        cancelAnimationFrame(tick)
        document.body.classList.remove("rte-marquee")
        setBox(null)
        if (!drawing) {
          // a plain press on the page lets the chosen blocks go
          if (blockSelectKey.getState(view.state)) choose(view, null)
          return
        }
        // the keys come to the document, the caret unseen in it
        view.focus()
        // the click that ends the box is the box's, not a click on the page
        const swallow = (c: MouseEvent) => {
          c.stopPropagation()
          c.preventDefault()
        }
        window.addEventListener("click", swallow, { capture: true, once: true })
        setTimeout(
          () => window.removeEventListener("click", swallow, { capture: true }),
          0
        )
      }
      window.addEventListener("mousemove", move)
      window.addEventListener("mouseup", up)
    }

    scroller.addEventListener("mousedown", onDown)
    return () => scroller.removeEventListener("mousedown", onDown)
  }, [editor])

  if (!box) return null
  return createPortal(
    <div
      className="rte-marquee-box"
      aria-hidden="true"
      style={{
        left: box.left,
        top: box.top,
        width: box.width,
        height: box.height,
      }}
    />,
    document.body
  )
}
