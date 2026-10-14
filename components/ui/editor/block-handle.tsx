"use client"

// A block's grip, ported from the branch's RteBlockHandle: six dots in the
// margin beside the block under the pointer that carry the block — or lay
// it beside another as a column row. The drag is drawn here: a translucent
// copy follows the pointer and a line marks the edge it would land on.
import * as React from "react"
import { createPortal } from "react-dom"
import type { Editor as TiptapEditor } from "@tiptap/core"
import { NodeSelection, TextSelection } from "@tiptap/pm/state"

import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { DragIcon } from "@/components/ui/rich-text-editor-icons"
import { type View } from "./extensions"

/* ------------------------------- block handle ------------------------------
 * A block's grip, as the source draws it (and Notion before it): six dots
 * in the margin beside the block under the pointer that carry the block to
 * wherever it is dropped. The drag is drawn here — the browser's snapshot
 * is replaced by a translucent copy of the block that follows the pointer,
 * a line marks the edge of the block the pointer is over (above it in its
 * top half, below it in its bottom) and the drop puts the block at that
 * edge. A click selects the block.
 */
const GUTTER = 72
const HANDLE_SIZE = 24
const HANDLE_WIDTH = 16
const HANDLE_GAP = 6
const REACH = 16
const FIRST_LINE = "p, h1, h2, h3, h4, h5, h6, summary, pre"
const ROW_SELECTOR = '[data-type="columns"]'
/** a pointer this far into a block from its left edge, or near its right
 * edge, lands the carried block beside it rather than above or below */
const SIDE_ZONE = 48
const SIDE_INSET = 6
const MAX_COLUMNS = 4
const SKIP =
  ".ProseMirror-gapcursor, .ProseMirror-widget, .ProseMirror-separator, br"


function blockAt(
  view: View,
  x: number,
  y: number,
  loose = false
): HTMLElement | null {
  const dom = view.dom as HTMLElement
  const d = dom.getBoundingClientRect()
  const span = loose ? window.innerWidth : GUTTER
  if (x < d.left - span || x > d.right + span || y < d.top || y > d.bottom)
    return null
  // the block the pointer is on, or the nearest one when it is in the gap
  // between blocks — a rule is a pixel tall
  let el: HTMLElement | null = null
  let nearest = Infinity
  for (const child of dom.children) {
    if (!(child instanceof HTMLElement) || child.matches(SKIP)) continue
    const r = child.getBoundingClientRect()
    const distance = y < r.top ? r.top - y : y >= r.bottom ? y - r.bottom : 0
    if (distance < nearest) {
      nearest = distance
      el = child
    }
  }
  if (!el || nearest > REACH) return null
  const spansY = (node: Element) => {
    const r = node.getBoundingClientRect()
    return y >= r.top && y < r.bottom
  }
  let block: HTMLElement = el
  // in a row each cell's own block has the grip, so one block moves on its
  // own; the row itself answers from the gaps between its cells
  if (block.matches(ROW_SELECTOR)) {
    const cell = [...block.children].find(
      (c): c is HTMLElement =>
        c instanceof HTMLElement &&
        x >= c.getBoundingClientRect().left &&
        x < c.getBoundingClientRect().right
    )
    const inner = cell
      ? [...cell.children].find(
          (c): c is HTMLElement =>
            c instanceof HTMLElement && !c.matches(SKIP) && spansY(c)
        )
      : undefined
    if (inner) block = inner
  }
  // inside a list the item under the pointer has its own grip, down to the
  // innermost list
  while (block.matches("ul, ol")) {
    const item = [...block.children].find(
      (c): c is HTMLElement => c instanceof HTMLElement && spansY(c)
    )
    if (!item) break
    block = item
    const nested = [...item.children].find(
      (c): c is HTMLElement =>
        c instanceof HTMLElement && c.matches("ul, ol") && spansY(c)
    )
    if (!nested) break
    block = nested
  }
  return block
}

/** the document position of the node an element draws, if it is one */
function posOf(view: View, el: HTMLElement): number | null {
  let p: number
  try {
    p = view.posAtDOM(el, 0)
  } catch {
    return null
  }
  const $p = view.state.doc.resolve(p)
  const candidates = [p, p - 1]
  for (let d = $p.depth; d > 0; d--) candidates.push($p.before(d))
  for (const c of candidates) {
    if (c < 0) continue
    try {
      if (view.nodeDOM(c) === el) return c
    } catch {
      // not a node boundary
    }
  }
  return null
}


/** the cell a block leaves empty behind it: its only block */
function emptiedCell(state: View["state"], from: number) {
  const $from = state.doc.resolve(from)
  const column = state.schema.nodes.column
  return $from.parent.type === column && $from.parent.childCount === 1
    ? { pos: $from.before(), row: $from.before($from.depth - 1) }
    : null
}

type Tr = View["state"]["tr"]
/**
 * Take the block at `from` (in the document `tr` started from) out of `tr`,
 * after whatever `tr` has already placed: the block, or the cell it leaves
 * empty — and a row left with one cell is a row no more, its blocks
 * standing on their own again.
 */
function leaveBehind(
  tr: Tr,
  from: number,
  size: number,
  cell: { pos: number; row: number } | null
) {
  const columns = tr.doc.type.schema.nodes.columns
  if (!cell) {
    const at = tr.mapping.map(from)
    tr.delete(at, at + size)
    return
  }
  const rowAt = tr.mapping.map(cell.row, -1)
  const row = tr.doc.nodeAt(rowAt)
  const cellPos = tr.mapping.map(cell.pos)
  const gone = tr.doc.nodeAt(cellPos)
  if (!row || row.type !== columns || !gone) return
  if (row.childCount === 2) {
    // one cell would be left: the row goes, and the other cell's blocks
    // stand on their own in its place
    const kept = row.child(cellPos === rowAt + 1 ? 1 : 0)
    tr.replaceWith(rowAt, rowAt + row.nodeSize, kept.content)
    return
  }
  tr.delete(cellPos, cellPos + gone.nodeSize)
  const after = tr.doc.nodeAt(rowAt)
  if (after?.type === columns)
    tr.setNodeMarkup(rowAt, undefined, {
      ...after.attrs,
      count: after.childCount,
    })
}

/**
 * The block at `from` stood beside the block at `to`, on `side` — as a new
 * cell of the row `to` is in, or, `to` standing alone, as a row of two made
 * of them both. Where it came from closes up behind it.
 */
function dropBeside(
  state: View["state"],
  from: number,
  to: number,
  side: "left" | "right"
) {
  const { schema } = state
  const columns = schema.nodes.columns
  const column = schema.nodes.column
  const node = state.doc.nodeAt(from)
  const beside = state.doc.nodeAt(to)
  if (!columns || !column || !node || !beside) return null
  const tr = state.tr

  const fromCell = emptiedCell(state, from)

  // where it goes
  const $to = state.doc.resolve(to)
  let landed: number
  if ($to.parent.type === column) {
    const cellPos = $to.before()
    const cell = $to.parent
    const at = side === "left" ? cellPos : cellPos + cell.nodeSize
    tr.insert(at, column.create(null, node))
    landed = at + 1
    const rowPos = $to.before($to.depth - 1)
    const row = tr.doc.nodeAt(rowPos)!
    tr.setNodeMarkup(rowPos, undefined, {
      ...row.attrs,
      count: row.childCount,
    })
  } else {
    const cells =
      side === "left"
        ? [column.create(null, node), column.create(null, beside)]
        : [column.create(null, beside), column.create(null, node)]
    tr.replaceWith(
      to,
      to + beside.nodeSize,
      columns.create({ count: 2 }, cells)
    )
    landed = side === "left" ? to + 2 : to + 2 + cells[0].nodeSize
  }
  const placed = tr.steps.length

  // the block leaves where it was
  leaveBehind(tr, from, node.nodeSize, fromCell)

  // the carried block, where it now stands, stays selected
  const moved = tr.mapping.slice(placed).map(landed)
  try {
    tr.setSelection(NodeSelection.create(tr.doc, moved))
  } catch {
    // a block that cannot hold a node selection keeps the caret's
  }
  return tr
}

export function BlockHandle({ editor }: { editor: TiptapEditor }) {
  const [target, setTarget] = React.useState<HTMLElement | null>(null)
  const [point, setPoint] = React.useState({ left: 0, top: 0 })
  const layerRef = React.useRef<HTMLDivElement>(null)
  const targetRef = React.useRef<HTMLElement | null>(null)
  // not state: a re-render of the grip while it is the source of a drag
  // makes the browser end the drag, so a drag leaves the grip's DOM alone
  const drag = React.useRef<{
    dragging: boolean
    source: { el: HTMLElement; pos: number } | null
    grab: { dx: number; dy: number }
    ghost: HTMLElement | null
    line: HTMLElement | null
    landing: { pos: number; before: boolean; side: "left" | "right" | null } | null
  }>({
    dragging: false,
    source: null,
    grab: { dx: 0, dy: 0 },
    ghost: null,
    line: null,
    landing: null,
  })
  const [mounted, setMounted] = React.useState(false)
  React.useEffect(() => setMounted(true), [])

  const selectingText = React.useCallback(() => {
    const sel = editor.state.selection
    return !sel.empty && !(sel instanceof NodeSelection)
  }, [editor])

  const place = React.useCallback(() => {
    if (drag.current.dragging) return
    if (selectingText()) {
      targetRef.current = null
      setTarget(null)
      return
    }
    const el = targetRef.current
    if (!el || !el.isConnected) {
      setTarget(null)
      return
    }
    const r = el.getBoundingClientRect()
    if (r.width === 0 && r.height === 0) {
      targetRef.current = null
      setTarget(null)
      return
    }
    // centred on the block's first line of text, not on the block's box
    const first = el.matches(FIRST_LINE)
      ? el
      : (el.querySelector(FIRST_LINE) ?? el)
    const fr = first.getBoundingClientRect()
    const lineHeight =
      parseFloat(getComputedStyle(first).lineHeight) || HANDLE_SIZE
    const line = Math.min(lineHeight, fr.height)
    const top = fr.top + (line - HANDLE_SIZE) / 2
    // an item's grip sits before its marker, at its list's edge
    const edge = el.matches("li")
      ? (el.parentElement?.getBoundingClientRect().left ?? r.left)
      : r.left
    setPoint({
      top,
      left: edge - HANDLE_GAP - (HANDLE_SIZE + HANDLE_WIDTH) / 2,
    })
  }, [selectingText])

  React.useEffect(() => {
    const onMove = (event: MouseEvent) => {
      if (drag.current.dragging) return
      if (editor.isDestroyed || !editor.isEditable || selectingText()) {
        targetRef.current = null
        setTarget(null)
        return
      }
      const t = event.target instanceof Element ? event.target : null
      if (t && layerRef.current?.contains(t)) return
      const el = blockAt(editor.view, event.clientX, event.clientY)
      targetRef.current = el
      setTarget(el)
      place()
    }
    const settle = () => place()
    const hide = () => {
      if (drag.current.dragging) return
      targetRef.current = null
      setTarget(null)
    }
    editor.on("transaction", settle)
    document.addEventListener("mousemove", onMove, true)
    document.addEventListener("scroll", settle, true)
    document.addEventListener("mouseleave", hide)
    window.addEventListener("resize", settle)
    return () => {
      editor.off("transaction", settle)
      document.removeEventListener("mousemove", onMove, true)
      document.removeEventListener("scroll", settle, true)
      document.removeEventListener("mouseleave", hide)
      window.removeEventListener("resize", settle)
    }
  }, [editor, place, selectingText])

  const selectBlock = React.useCallback((): NodeSelection | null => {
    const el = targetRef.current
    if (editor.isDestroyed || !el) return null
    const pos = posOf(editor.view, el)
    if (pos === null) return null
    const sel = NodeSelection.create(editor.view.state.doc, pos)
    editor.view.dispatch(editor.view.state.tr.setSelection(sel))
    return sel
  }, [editor])

  /** whether a block can take another beside it: a block standing on its
   * own at the top level becomes a row of two, a block in a row's cell gets
   * a cell of its own next to it — while the row has room */
  const sideable = React.useCallback(
    (el: HTMLElement) => {
      if (el.matches(ROW_SELECTOR) || el.matches("li")) return false
      const cell = el.parentElement
      if (cell?.matches('[data-type="column"]'))
        return (cell.parentElement?.childElementCount ?? MAX_COLUMNS) < MAX_COLUMNS
      return el.parentElement === editor.view.dom
    },
    [editor]
  )

  /** the edge the pointer is over: beside the block near its left or right
   * edge, else its top in its upper half and its bottom in its lower one */
  const landingAt = React.useCallback(
    (x: number, y: number) => {
      const d = drag.current
      if (editor.isDestroyed || !d.source) return null
      const el = blockAt(editor.view, x, y, true)
      if (!el || el === d.source.el || d.source.el.contains(el)) return null
      const pos = posOf(editor.view, el)
      if (pos === null) return null
      const box = el.getBoundingClientRect()
      const zone = Math.min(SIDE_ZONE, box.width / 4)
      let side: "left" | "right" | null = null
      if (sideable(el)) {
        if (x >= box.left + SIDE_INSET && x < box.left + SIDE_INSET + zone)
          side = "left"
        else if (x > box.right - zone) side = "right"
      }
      return { pos, before: y < box.top + box.height / 2, side, box }
    },
    [editor, sideable]
  )

  const finishDrag = React.useCallback(() => {
    const d = drag.current
    d.dragging = false
    d.source = null
    d.landing = null
    d.ghost?.remove()
    d.ghost = null
    d.line?.remove()
    d.line = null
    document.removeEventListener("dragover", onDragOverRef.current, true)
    document.removeEventListener("dragenter", onDragOverRef.current, true)
    document.removeEventListener("drop", onDropRef.current, true)
    if (!editor.isDestroyed) {
      editor.view.dragging = null
    }
  }, [editor])

  const onDragOverRef = React.useRef<(e: DragEvent) => void>(() => {})
  const onDropRef = React.useRef<(e: DragEvent) => void>(() => {})

  onDragOverRef.current = (event: DragEvent) => {
    const d = drag.current
    if (!d.dragging) return
    if (d.ghost)
      d.ghost.style.transform = `translate(${event.clientX - d.grab.dx}px, ${
        event.clientY - d.grab.dy
      }px)`
    const at = landingAt(event.clientX, event.clientY)
    if (!at) {
      d.landing = null
      if (d.line) d.line.hidden = true
      return
    }
    // the drop is ours, wherever the pointer is
    event.preventDefault()
    event.stopPropagation()
    if (event.dataTransfer) event.dataTransfer.dropEffect = "move"
    d.landing = { pos: at.pos, before: at.before, side: at.side }
    if (d.line) {
      d.line.hidden = false
      if (at.side) {
        // beside: a vertical line down the edge it would stand at
        d.line.style.top = `${at.box.top}px`
        d.line.style.height = `${at.box.height}px`
        d.line.style.width = "3px"
        d.line.style.left = `${
          at.side === "left" ? at.box.left - 6 : at.box.right + 3
        }px`
      } else {
        d.line.style.height = "3px"
        d.line.style.left = `${at.box.left}px`
        d.line.style.width = `${at.box.width}px`
        d.line.style.top = `${at.before ? at.box.top - 3 : at.box.bottom}px`
      }
    }
  }

  onDropRef.current = (event: DragEvent) => {
    const d = drag.current
    if (!d.dragging) return
    event.preventDefault()
    event.stopPropagation()
    const at = landingAt(event.clientX, event.clientY) ?? d.landing
    const from = d.source
    finishDrag()
    if (editor.isDestroyed || !at || !from) return
    const { state } = editor.view
    const node = state.doc.nodeAt(from.pos)
    const beside = state.doc.nodeAt(at.pos)
    if (!node || !beside) return
    if (at.side) {
      const tr = dropBeside(state, from.pos, at.pos, at.side)
      if (tr) {
        editor.view.dispatch(tr.scrollIntoView())
        editor.view.focus()
      }
      return
    }
    const edge = at.before ? at.pos : at.pos + beside.nodeSize
    // the block is already there
    if (edge === from.pos || edge === from.pos + node.nodeSize) return
    // placed first, then taken from where it was: the insert only ever
    // adds, so the source's position still maps
    const tr = state.tr
    const cell = emptiedCell(state, from.pos)
    tr.insert(edge, node)
    const placed = tr.steps.length
    leaveBehind(tr, from.pos, node.nodeSize, cell)
    const to = tr.mapping.slice(placed).map(edge, at.before ? -1 : 1)
    // the block, wherever the fit put it, stays selected
    let moved: number | null = null
    tr.doc.nodesBetween(
      Math.max(0, to - 2),
      Math.min(tr.doc.content.size, to + node.nodeSize + 2),
      (n, pos) => {
        if (moved === null && n.type === node.type && n.eq(node)) moved = pos
        return moved === null
      }
    )
    if (moved !== null)
      tr.setSelection(NodeSelection.create(tr.doc, moved))
    editor.view.dispatch(tr.scrollIntoView())
    editor.view.focus()
  }

  // the browser's own snapshot is replaced by nothing: the copy is drawn here
  const blankRef = React.useRef<HTMLImageElement | null>(null)
  const onDragStart = (event: React.DragEvent<HTMLButtonElement>) => {
    const el = targetRef.current
    if (!el || !event.dataTransfer) {
      event.preventDefault()
      return
    }
    // dragging is marked before the selection is dispatched: the
    // transaction would otherwise re-render the grip mid-dragstart — the
    // drag's own source — and the browser ends a drag whose source moves
    drag.current.dragging = true
    const sel = selectBlock()
    if (!sel) {
      drag.current.dragging = false
      event.preventDefault()
      return
    }
    if (!blankRef.current) {
      blankRef.current = new window.Image()
      blankRef.current.src =
        "data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7"
    }
    const d = drag.current
    const r = el.getBoundingClientRect()
    d.source = { el, pos: sel.from }
    d.grab = { dx: event.clientX - r.left, dy: event.clientY - r.top }
    // what ProseMirror would read, should a drop ever reach it
    editor.view.dragging = { slice: sel.content(), move: true }
    event.dataTransfer.effectAllowed = "move"
    event.dataTransfer.clearData()
    event.dataTransfer.setData("text/html", el.outerHTML)
    event.dataTransfer.setData("text/plain", el.textContent ?? "")
    event.dataTransfer.setDragImage(blankRef.current, 0, 0)
    event.currentTarget.classList.add("opacity-0")
    // the copy: the block as drawn, half seen, following the pointer
    const ghost = document.createElement("div")
    ghost.className = "pointer-events-none fixed top-0 left-0 z-70 opacity-50 will-change-transform"
    ghost.style.width = `${r.width}px`
    const docWrap = document.createElement("div")
    docWrap.className = editor.view.dom.parentElement?.className ?? ""
    const inner = document.createElement("div")
    inner.className = editor.view.dom.className.replace(/\bProseMirror-\S+/g, "")
    const copy = el.cloneNode(true) as HTMLElement
    copy.classList.remove("ProseMirror-selectednode")
    inner.appendChild(copy)
    docWrap.appendChild(inner)
    ghost.appendChild(docWrap)
    document.body.appendChild(ghost)
    ghost.style.transform = `translate(${event.clientX - d.grab.dx}px, ${
      event.clientY - d.grab.dy
    }px)`
    d.ghost = ghost
    // the line at the edge the block would land on
    const line = document.createElement("div")
    line.className = "pointer-events-none fixed z-65 h-[3px] rounded-full bg-border-stronger"
    line.hidden = true
    document.body.appendChild(line)
    d.line = line
    document.addEventListener("dragover", onDragOverRef.current, true)
    document.addEventListener("dragenter", onDragOverRef.current, true)
    document.addEventListener("drop", onDropRef.current, true)
  }
  const onDragEnd = (event: React.DragEvent<HTMLButtonElement>) => {
    event.currentTarget.classList.remove("opacity-0")
    finishDrag()
    targetRef.current = null
    setTarget(null)
  }

  if (!mounted) return null
  return createPortal(
    <div
      ref={layerRef}
      className="pointer-events-none fixed inset-0 z-55"
      data-slot="rich-text-editor-block-handle"
    >
      {/* the grip stays mounted through a drag, hidden: the browser ends a
          drag whose source leaves the document */}
      {target && (
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger
              render={
                <button
                  type="button"
                  draggable
                  aria-label="Drag to move"
                  onDragStart={onDragStart}
                  onDragEnd={onDragEnd}
                  onClick={() => {
                    if (selectBlock()) editor.view.focus()
                  }}
                  style={{ left: point.left, top: point.top }}
                  className="pointer-events-auto fixed flex h-6 w-4 cursor-grab items-center justify-center rounded-[4px] text-muted-foreground transition-colors hover:bg-secondary hover:text-secondary-foreground active:cursor-grabbing"
                >
                  <DragIcon className="size-4" />
                </button>
              }
            />
            <TooltipContent side="bottom">Drag to move</TooltipContent>
          </Tooltip>
        </TooltipProvider>
      )}
    </div>,
    document.body
  )
}
