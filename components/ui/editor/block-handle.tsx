"use client"

// A block's grip, ported from the branch's RteBlockHandle, as Notion draws
// it: six dots in the margin beside the block under the pointer, "Drag to
// move" beneath, that carry the block to wherever it is dropped. The drag
// is drawn here — the browser's snapshot is replaced by a translucent copy
// that follows the pointer, a line marks the edge of the block the pointer
// is over, and the drop puts the block at that edge. Just inside a block's
// left edge, or near its right one, the line stands upright and the block
// lands beside it as a row of columns. A picture carried from one cell of
// a media row onto another cell's picture changes places with it. A
// selection that runs over several blocks is carried whole. A click
// selects the block.
import * as React from "react"
import { createPortal } from "react-dom"
import type { Editor as TiptapEditor } from "@tiptap/core"
import type { Node as PMNode } from "@tiptap/pm/model"
import { NodeSelection, TextSelection } from "@tiptap/pm/state"

import { cn } from "@/lib/utils"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { DragIcon } from "@/components/ui/rich-text-editor-icons"
import { pressHandlers } from "./press"
import { blockSelectKey, chosenBlocks, eachChosen } from "./block-select"
import { BLOCKS_SETTLED, type View } from "./extensions"

/** how far left of the document the grip still answers the pointer */
const GUTTER = 72
const SIZE = 24
/** the grip is narrower than it is tall: the dots 4px from either side */
const WIDTH = 16
/** the gap between the grip and the block */
const GAP = 6
/** how far past a block's edge, into the gap around it, its grip still answers */
const REACH = 16
/** how far in from a cell's corner the grip sits on the picture */
const CELL_INSET = 6
const FIRST_LINE = "p, h1, h2, h3, h4, h5, h6, summary, pre"
const SKIP =
  ".ProseMirror-gapcursor, .ProseMirror-widget, .ProseMirror-separator, br"
const ROW = '[data-type="columns"]'
const MEDIA_ROW = '[data-type="columns"][data-media="true"]'
/** a text column's grip: smaller, centred in the half-gutter between the
 * hairline and the text (styles.tsx: a 56px gutter, the line mid-way) */
const TEXT_GRIP_WIDTH = 12
const TEXT_GRIP_HEIGHT = 20
const HALF_GUTTER = 28
/** how far left of a text column's edge its blocks still answer the
 * pointer: across the grip, so the way from the text to it keeps it */
const TEXT_GRIP_ROOM = HALF_GUTTER - 4
/** a first column's grip stands this far before its text, and the
 * layout's own grip this far before that one */
/** a textless block up to this tall is short enough to centre a grip on */
const SHORT_BLOCK = 64
const FIRST_GRIP_GAP = 4
const ROW_GRIP_GAP = 2
const MAX_COLUMNS = 5
/**
 * Beside a block, as Notion drops one: a pointer this far into a block
 * from its left edge, or near its right edge, lands the block beside it
 * rather than above or below, under a vertical line.
 */
const SIDE_ZONE = 48
const SIDE_INSET = 6

const inCell = (el: Element) =>
  el.parentElement?.matches('[data-type="column"]') === true &&
  el.closest(MEDIA_ROW) !== null
/**
 * The copy carried under the pointer holds no live player: a cloned video
 * would be decoded again from its source (an upload's data, megabytes of
 * it), a cloned frame would load its page again, and the copy, moved every
 * frame, would drag them along. A video becomes a still of its frame as it
 * stands, a frame a quiet box its size.
 */
function lightenPlayers(source: HTMLElement, copy: HTMLElement) {
  const live = [...source.querySelectorAll<HTMLVideoElement | HTMLIFrameElement>("video, iframe")]
  const cloned = [...copy.querySelectorAll<HTMLVideoElement | HTMLIFrameElement>("video, iframe")]
  cloned.forEach((el, i) => {
    const from = live[i]
    const box = from?.getBoundingClientRect()
    const still = document.createElement("canvas")
    still.width = Math.max(1, Math.round(box?.width ?? 1))
    still.height = Math.max(1, Math.round(box?.height ?? 1))
    still.className = el.className
    still.style.cssText = el.style.cssText
    still.style.display = "block"
    still.style.width = `${box?.width ?? 0}px`
    still.style.height = `${box?.height ?? 0}px`
    still.style.background = "#000"
    if (from instanceof HTMLVideoElement && from.readyState >= 2) {
      try {
        still.getContext("2d")?.drawImage(from, 0, 0, still.width, still.height)
      } catch {
        // a frame that cannot be read stays a black still
      }
    }
    el.replaceWith(still)
  })
}

/** the block's markup for a drop outside, without an upload's data in it */
const lightHTML = (el: HTMLElement) =>
  el.outerHTML.replace(/(src|poster|href)="data:[^"]*"/g, '$1=""')

/** an empty paragraph: a line with nothing on it */
const isEmptyLine = (el: Element) =>
  el.matches("p") &&
  (el.textContent ?? "").trim() === "" &&
  !el.querySelector("img, video, iframe, audio, [data-type]")

/** a block (or list item) anywhere inside a column of a row of prose */
const inTextColumn = (el: Element) =>
  el.closest('[data-type="column"]') !== null && el.closest(MEDIA_ROW) === null
/**
 * A picture carried from one cell of a row onto another cell's picture
 * changes places with it; onto an empty slot, or anywhere else, it lands
 * as any block does.
 */
const swapsWith = (from: Element, to: Element) =>
  inCell(from) &&
  inCell(to) &&
  from.parentElement !== to.parentElement &&
  to.querySelector("img") !== null
const spans = (el: Element, y: number) => {
  const r = el.getBoundingClientRect()
  return y >= r.top && y < r.bottom
}

/** the block under the pointer: a top-level block, or a list's item */
function blockAt(
  view: View,
  x: number,
  y: number,
  loose = false
): HTMLElement | null {
  const dom = view.dom as HTMLElement
  const d = dom.getBoundingClientRect()
  // a drop answers from anywhere across the page's width
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
  let block: HTMLElement = el
  // in a row each cell's own block has the grip, so one block moves on its
  // own; the row itself answers from the gaps between its cells
  if (block.matches(ROW)) {
    // a text row's cell reaches into the gutter on its left, over its
    // blocks' grip
    const room = block.matches(MEDIA_ROW) ? 0 : TEXT_GRIP_ROOM
    const cell = [...block.children].find(
      (c): c is HTMLElement =>
        c instanceof HTMLElement &&
        x >= c.getBoundingClientRect().left - room &&
        x < c.getBoundingClientRect().right
    )
    const blocks = cell
      ? [...cell.children].filter(
          (c): c is HTMLElement => c instanceof HTMLElement && !c.matches(SKIP)
        )
      : []
    let inner = blocks.find((c) => spans(c, y))
    // a drop in a short column's empty space below its blocks lands by its
    // last block, not on the whole row (hovering there still offers the
    // row's own grip, the one that carries the row)
    if (!inner && loose && blocks.length) {
      const last = blocks[blocks.length - 1]
      if (y >= last.getBoundingClientRect().bottom) inner = last
    }
    if (inner) block = inner
  }
  while (block.matches("ul, ol")) {
    const item: HTMLElement | undefined = [...block.children].find(
      (c): c is HTMLElement => c instanceof HTMLElement && spans(c, y)
    )
    if (!item) break
    block = item
    const nested: HTMLElement | undefined = [...item.children].find(
      (c): c is HTMLElement =>
        c instanceof HTMLElement && c.matches("ul, ol") && spans(c, y)
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

/**
 * The cell a block leaves empty behind it: its only block, in a row of
 * prose. (A row of pictures keeps the cell and offers it an Add Image
 * slot, extensions.tsx.)
 */
/**
 * The cell the block at `from` is the whole of: its column holds nothing
 * else but empty lines (a picture or a video set into a column keeps the
 * line it was set on). Carrying the block carries the column: beside
 * another column of its row the columns change places; anywhere else the
 * cell goes, its empty lines with it.
 */
function emptiedCell(state: View["state"], from: number) {
  const $from = state.doc.resolve(from)
  const column = state.schema.nodes.column
  if ($from.parent.type !== column) return null
  if ($from.node($from.depth - 1).attrs.media) return null
  const index = $from.index()
  let alone = true
  $from.parent.forEach((child, _offset, i) => {
    if (i === index) return
    if (!(child.isTextblock && child.content.size === 0)) alone = false
  })
  return alone ? { pos: $from.before(), row: $from.before($from.depth - 1) } : null
}

type Tr = View["state"]["tr"]
/**
 * Take the block at `from` (in the document `tr` started from) out of
 * `tr`, after whatever `tr` has already placed: the block, or the cell it
 * leaves empty — and a row left with one cell is a row no more.
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
  // past whatever was set down right before the row: a block dropped on
  // the row's own top edge is inserted at the row's position, and mapping
  // back to that spot would find the block, not the row, and leave the
  // block's original standing (a copy instead of a move)
  const rowAt = tr.mapping.map(cell.row, 1)
  const row = tr.doc.nodeAt(rowAt)
  const cellPos = tr.mapping.map(cell.pos)
  const gone = tr.doc.nodeAt(cellPos)
  if (!row || row.type !== columns || !gone) return
  if (row.childCount === 1) {
    // the layout's last block has left it: the layout goes
    tr.delete(rowAt, rowAt + row.nodeSize)
    return
  }
  // otherwise the emptied cell goes and the rest stay a layout, one
  // column of them stacked if one is all that is left
  tr.delete(cellPos, cellPos + gone.nodeSize)
  const after = tr.doc.nodeAt(rowAt)
  if (after?.type === columns)
    tr.setNodeMarkup(rowAt, undefined, {
      ...after.attrs,
      count: after.childCount,
      widths: null,
    })
}

/**
 * The block at `from` stood beside the block at `to`, on `side` — as a new
 * cell of the row `to` is in, or, `to` standing alone, as a row of two
 * made of them both. Where it came from closes up behind it.
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

  // a column's only block beside another column of its own layout: the
  // columns change places in one step (inserting first would make a sixth
  // column of a full row, which the layout does not hold); their shares
  // go with them
  if (
    fromCell &&
    $to.parent.type === column &&
    fromCell.row === $to.before($to.depth - 1)
  ) {
    const rowPos = fromCell.row
    const row = state.doc.nodeAt(rowPos)
    if (!row) return null
    const cells: PMNode[] = []
    row.forEach((c) => cells.push(c))
    const offsets: number[] = []
    row.forEach((_c, offset) => offsets.push(rowPos + 1 + offset))
    const fromIdx = offsets.indexOf(fromCell.pos)
    const toIdx = offsets.indexOf($to.before())
    if (fromIdx < 0 || toIdx < 0) return null
    const order = cells.map((_c, i) => i)
    order.splice(fromIdx, 1)
    const at = order.indexOf(toIdx) + (side === "left" ? 0 : 1)
    order.splice(at, 0, fromIdx)
    if (order.every((v, i) => v === i)) return null
    const widths = row.attrs.widths as number[] | null
    // the moved column alone is taken out and set back in: the row is not
    // drawn again, so the other columns' players (a video, an embed) keep
    // playing where they are rather than loading again
    const moving = cells[fromIdx]
    tr.delete(offsets[fromIdx], offsets[fromIdx] + moving.nodeSize)
    const kept = tr.doc.nodeAt(rowPos)
    if (!kept) return null
    let landed = rowPos + 1
    for (let i = 0; i < at; i++) landed += kept.child(i).nodeSize
    tr.insert(landed, moving)
    tr.setNodeMarkup(rowPos, undefined, {
      ...row.attrs,
      widths: widths ? order.map((i) => widths[i]) : null,
    })
    // the carried block, in its column's new place, stays selected
    try {
      tr.setSelection(NodeSelection.create(tr.doc, landed + 1))
    } catch {
      // a block that cannot hold a node selection keeps the caret's
    }
    return tr
  }
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
      widths: null,
    })
  } else {
    const cells =
      side === "left"
        ? [column.create(null, node), column.create(null, beside)]
        : [column.create(null, beside), column.create(null, node)]
    tr.replaceWith(to, to + beside.nodeSize, columns.create({ count: 2 }, cells))
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

/** the cell a run from `from` to `to` is the whole of, in a row of prose:
 * carried off, it takes its cell along */
function wholeCell(state: View["state"], from: number, to: number) {
  const $from = state.doc.resolve(from)
  if ($from.parent.type !== state.schema.nodes.column) return null
  if (from !== $from.start() || to !== $from.end()) return null
  if ($from.node($from.depth - 1).attrs.media) return null
  return { pos: $from.before(), row: $from.before($from.depth - 1) }
}

/**
 * The run of blocks from `from` to `to` set beside the block at `to`, on
 * `side`, as one new cell: of the row `at` is in, or, `at` standing alone,
 * of a row of two made of them both. Where the run came from closes up
 * behind it. The range the run now fills is returned with the step.
 */
function dropRunBeside(
  state: View["state"],
  from: number,
  to: number,
  at: number,
  side: "left" | "right"
) {
  const { schema } = state
  const columns = schema.nodes.columns
  const column = schema.nodes.column
  const beside = state.doc.nodeAt(at)
  if (!columns || !column || !beside) return null
  const content = state.doc.slice(from, to).content
  const tr = state.tr
  const $at = state.doc.resolve(at)
  let start: number
  if ($at.parent.type === column) {
    const cellPos = $at.before()
    const spot = side === "left" ? cellPos : cellPos + $at.parent.nodeSize
    tr.insert(spot, column.create(null, content))
    start = spot + 1
    const rowPos = $at.before($at.depth - 1)
    const row = tr.doc.nodeAt(rowPos)!
    tr.setNodeMarkup(rowPos, undefined, {
      ...row.attrs,
      count: row.childCount,
      widths: null,
    })
  } else {
    const ours = column.create(null, content)
    const theirs = column.create(null, beside)
    const cells = side === "left" ? [ours, theirs] : [theirs, ours]
    tr.replaceWith(at, at + beside.nodeSize, columns.create({ count: 2 }, cells))
    start = side === "left" ? at + 2 : at + 2 + theirs.nodeSize
  }
  const placed = tr.steps.length
  const landed = { from: start, to: start + content.size }

  // the run leaves where it was
  leaveBehind(tr, from, to - from, wholeCell(state, from, to))
  const after = tr.mapping.slice(placed)
  return {
    tr,
    landed: { from: after.map(landed.from, 1), to: after.map(landed.to, -1) },
  }
}

export function BlockHandle({ editor }: { editor: TiptapEditor }) {
  const [target, setTarget] = React.useState<HTMLElement | null>(null)
  const [point, setPoint] = React.useState({ left: 0, top: 0 })
  const [onMedia, setOnMedia] = React.useState(false)
  const [inGutter, setInGutter] = React.useState(false)
  const layerRef = React.useRef<HTMLDivElement>(null)
  const targetRef = React.useRef<HTMLElement | null>(null)
  // not state: a re-render of the grip while it is the source of a drag
  // makes the browser end the drag, so a drag leaves the grip's DOM alone;
  // pressed and not yet dragging, a move that reached the grip's tracking
  // first would carry it off to another block and the drag never starts
  const drag = React.useRef<{
    dragging: boolean
    pressed: boolean
    source: {
      el: HTMLElement
      pos: number
      run?: { to: number; doms: HTMLElement[]; chosen: boolean }
    } | null
    grab: { dx: number; dy: number }
    ghost: HTMLElement | null
    line: HTMLElement | null
    landing: {
      el: HTMLElement
      pos: number
      before: boolean
      side: "left" | "right" | null
    } | null
  }>({
    dragging: false,
    pressed: false,
    source: null,
    grab: { dx: 0, dy: 0 },
    ghost: null,
    line: null,
    landing: null,
  })
  const [mounted, setMounted] = React.useState(false)
  React.useEffect(() => setMounted(true), [])

  /**
   * The run of sibling blocks a selection covers, when it covers more than
   * one: their positions and the elements that draw them
   */
  const selectedRun = React.useCallback(() => {
    if (editor.isDestroyed) return null
    // blocks chosen with the box are a run too, one block or many
    const chosen = chosenBlocks(editor.state)
    if (chosen) {
      const doms: HTMLElement[] = []
      eachChosen(editor.state.doc, chosen, (_node, pos) => {
        const dom = editor.view.nodeDOM(pos)
        if (dom instanceof HTMLElement) doms.push(dom)
      })
      return doms.length
        ? { from: chosen.from, to: chosen.to, doms, chosen: true }
        : null
    }
    const sel = editor.state.selection
    if (sel.empty || sel instanceof NodeSelection) return null
    const range = sel.$from.blockRange(sel.$to)
    if (!range || range.endIndex - range.startIndex < 2) return null
    const doms: HTMLElement[] = []
    let pos = range.start
    for (let i = range.startIndex; i < range.endIndex; i++) {
      const dom = editor.view.nodeDOM(pos)
      if (dom instanceof HTMLElement) doms.push(dom)
      pos += range.parent.child(i).nodeSize
    }
    return { from: range.start, to: range.end, doms, chosen: false }
  }, [editor])
  const inRun = (run: { doms: HTMLElement[] }, el: Element) =>
    run.doms.some((d) => d === el || d.contains(el))

  /** text is selected: the formatting bar is up, and the grip steps aside —
   * unless the selection runs over whole blocks, which the grip carries */
  const selectingText = React.useCallback(() => {
    const sel = editor.state.selection
    return (
      !sel.empty && !(sel instanceof NodeSelection) && !selectedRun()
    )
  }, [editor, selectedRun])

  const place = React.useCallback(() => {
    const d = drag.current
    if (d.dragging || d.pressed) return
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
    const media = inCell(el)
    setOnMedia(media)
    setInGutter(false)
    // a cell's block has no margin of its own to stand the grip in: it
    // sits on the picture, in its top-left corner, as the media's chrome
    if (media) {
      setPoint({ top: r.top + CELL_INSET, left: r.left + CELL_INSET })
      return
    }
    // centred on the block's first line of text, not on the block's box
    const first = el.matches(FIRST_LINE)
      ? el
      : (el.querySelector(FIRST_LINE) ?? el)
    const fr = first.getBoundingClientRect()
    const lineHeight = parseFloat(getComputedStyle(first).lineHeight) || SIZE
    const line = Math.min(lineHeight, fr.height)
    // a short block with no line of text (an Add Image slot, a divider)
    // has its grip centred on it, as a single line's is
    const textless = first === el && !el.matches(FIRST_LINE)
    const top =
      textless && r.height <= SHORT_BLOCK
        ? r.top + (r.height - SIZE) / 2
        : fr.top + (line - SIZE) / 2
    // an item's grip sits before its marker, at its list's edge
    const edge = el.matches("li")
      ? (el.parentElement?.getBoundingClientRect().left ?? r.left)
      : r.left
    // a block in a text row's column carries its grip in the gutter just
    // before its text, on its first line, clear of the words
    if (inTextColumn(el)) {
      setInGutter(true)
      // the first column has the page's margin, not a gutter, before it:
      // its grip keeps close to the words, leaving the layout's grip room
      // to stand near the other blocks' grips
      const first = !el.closest('[data-type="column"]')?.previousElementSibling
      setPoint({
        top: top + (SIZE - TEXT_GRIP_HEIGHT) / 2,
        left: first
          ? edge - FIRST_GRIP_GAP - TEXT_GRIP_WIDTH
          : edge - (HALF_GUTTER + TEXT_GRIP_WIDTH) / 2,
      })
      return
    }
    // a text row's own grip stands out past its first column's block
    // grips (in the margin, where they reach): the two never share a spot
    if (el.matches(ROW) && !el.matches(MEDIA_ROW)) {
      setPoint({
        top,
        left: edge - FIRST_GRIP_GAP - TEXT_GRIP_WIDTH - ROW_GRIP_GAP - WIDTH,
      })
      return
    }
    // narrowed, it keeps its dots where the square grip had them
    setPoint({ top, left: edge - GAP - (SIZE + WIDTH) / 2 })
  }, [selectingText])

  React.useEffect(() => {
    const onMove = (event: MouseEvent) => {
      const d = drag.current
      // a held button keeps the grip where it is: the press may be on its
      // way to a drag, and Safari can skip the pointerdown that would
      // have marked it pressed (after a drop), so the pointer leaving the
      // grip as the drag sets out would otherwise hand it another block
      if (d.dragging || d.pressed || event.buttons !== 0) return
      if (editor.isDestroyed || !editor.isEditable || selectingText()) {
        targetRef.current = null
        setTarget(null)
        return
      }
      const t = event.target instanceof Element ? event.target : null
      if (t && layerRef.current?.contains(t)) return
      const el = blockAt(editor.view, event.clientX, event.clientY)
      if (!el) {
        targetRef.current = null
        setTarget(null)
        return
      }
      targetRef.current = el
      setTarget(el)
      place()
    }
    const settle = () => place()
    const hide = () => {
      if (drag.current.dragging || drag.current.pressed) return
      targetRef.current = null
      setTarget(null)
    }
    editor.on("transaction", settle)
    const root = editor.view.dom
    root.addEventListener(BLOCKS_SETTLED, settle)
    document.addEventListener("mousemove", onMove, true)
    document.addEventListener("scroll", settle, true)
    document.addEventListener("mouseleave", hide)
    window.addEventListener("resize", settle)
    return () => {
      editor.off("transaction", settle)
      root.removeEventListener(BLOCKS_SETTLED, settle)
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

  /** whether a block can take another beside it */
  const sideable = React.useCallback(
    (el: HTMLElement) => {
      if (el.matches(ROW) || el.matches("li")) return false
      const cell = el.parentElement
      if (cell?.matches('[data-type="column"]'))
        return (
          (cell.parentElement?.childElementCount ?? MAX_COLUMNS) < MAX_COLUMNS
        )
      return el.parentElement === editor.view.dom
    },
    [editor]
  )

  /**
   * A column's only block set beside another column of the same layout:
   * the columns change places, their number stays, so even a full row
   * (five) takes it
   */
  const reorders = (source: HTMLElement, el: HTMLElement) => {
    const from = source.parentElement
    const to = el.parentElement
    if (!from?.matches('[data-type="column"]') || !to?.matches('[data-type="column"]'))
      return false
    if (from === to || from.parentElement !== to.parentElement) return false
    if (from.parentElement?.matches(MEDIA_ROW)) return false
    // the column's only block, its empty lines aside (see emptiedCell)
    const blocks = [...from.children].filter(
      (c) => c instanceof HTMLElement && !c.matches(SKIP) && !isEmptyLine(c)
    )
    return blocks.length === 1 && blocks[0] === source
  }

  /** the edge the pointer is over */
  const landingAt = React.useCallback(
    (x: number, y: number) => {
      const d = drag.current
      if (editor.isDestroyed || !d.source) return null
      const el = blockAt(editor.view, x, y, true)
      if (!el || el === d.source.el || d.source.el.contains(el)) return null
      // a block carried within its own layout and set on the layout's top
      // or bottom edge stays in the layout, first or last in it: leaving
      // the layout is a drop on a block outside it
      if (el.matches(ROW) && !el.matches(MEDIA_ROW) && el.contains(d.source.el)) {
        const r = el.getBoundingClientRect()
        const top = y < r.top + r.height / 2
        const cells = [...el.children].filter(
          (c): c is HTMLElement => c instanceof HTMLElement
        )
        const cell = top ? cells[0] : cells[cells.length - 1]
        const blocks = cell
          ? [...cell.children].filter(
              (c): c is HTMLElement =>
                c instanceof HTMLElement && !c.matches(SKIP)
            )
          : []
        const inner = top ? blocks[0] : blocks[blocks.length - 1]
        if (!inner || inner === d.source.el) return null
        const innerPos = posOf(editor.view, inner)
        if (innerPos === null) return null
        return {
          el: inner,
          pos: innerPos,
          before: top,
          side: null,
          box: inner.getBoundingClientRect(),
        }
      }
      // a run lands outside itself
      if (d.source.run && inRun(d.source.run, el)) return null
      const pos = posOf(editor.view, el)
      if (pos === null) return null
      const box = el.getBoundingClientRect()
      const zone = Math.min(SIDE_ZONE, box.width / 4)
      let side: "left" | "right" | null = null
      const run = d.source.run
      // a run stands beside a block as a new cell — never one holding a row
      // itself, for a row is no column's block
      const runSideable =
        !!run &&
        sideable(el) &&
        !el.closest(MEDIA_ROW) &&
        !run.doms.some((x) => x.matches(ROW) || x.querySelector(ROW))
      if (
        run
          ? runSideable
          : (sideable(el) || reorders(d.source.el, el)) &&
            !swapsWith(d.source.el, el)
      ) {
        if (x >= box.left + SIDE_INSET && x < box.left + SIDE_INSET + zone)
          side = "left"
        else if (x > box.right - zone) side = "right"
      }
      return { el, pos, before: y < box.top + box.height / 2, side, box }
    },
    [editor, sideable]
  )

  /**
   * The run's blocks dimmed while carried, as a carried block is. The
   * class is set past ProseMirror's watch on its DOM, which would
   * otherwise read it as an edit.
   */
  const carried = React.useCallback(
    (doms: HTMLElement[], on: boolean) => {
      const observer = (
        editor.view as unknown as {
          domObserver?: { stop(): void; start(): void }
        }
      ).domObserver
      observer?.stop()
      doms.forEach((d) => d.classList.toggle("rte-bh-carried", on))
      observer?.start()
    },
    [editor]
  )

  /** a run set down at `edge`, taken from where it was, still selected —
   * and blocks chosen with the box still chosen, where they land on the
   * page itself */
  const dropRun = React.useCallback(
    (from: number, to: number, edge: number, chosen: boolean) => {
      if (edge >= from && edge <= to) return
      const { state } = editor.view
      const tr = state.tr
      tr.insert(edge, state.doc.slice(from, to).content)
      const placed = tr.steps.length
      const start = tr.mapping.map(edge, -1)
      const end = tr.mapping.map(edge, 1)
      leaveBehind(tr, from, to - from, wholeCell(state, from, to))
      const after = tr.mapping.slice(placed)
      const landed = { from: after.map(start, 1), to: after.map(end, -1) }
      if (chosen) {
        tr.setSelection(TextSelection.near(tr.doc.resolve(landed.from)))
        tr.setMeta(blockSelectKey, landed)
      } else
        tr.setSelection(
          TextSelection.between(
            tr.doc.resolve(landed.from),
            tr.doc.resolve(landed.to)
          )
        )
      editor.view.dispatch(tr.scrollIntoView())
      editor.view.focus()
    },
    [editor]
  )

  const finishDrag = React.useCallback(() => {
    const d = drag.current
    gripRef.current?.classList.remove("is-dragging")
    d.pressed = false
    if (d.source?.run) carried(d.source.run.doms, false)
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
    document.body.classList.remove("rte-block-drag")
    if (!editor.isDestroyed) {
      editor.view.dom.classList.remove("rte-dragging")
      editor.view.dragging = null
    }
  }, [editor, carried])

  const gripRef = React.useRef<HTMLButtonElement | null>(null)
  const onDragOverRef = React.useRef<(e: DragEvent) => void>(() => {})
  const onDropRef = React.useRef<(e: DragEvent) => void>(() => {})

  onDragOverRef.current = (event: DragEvent) => {
    const d = drag.current
    if (!d.dragging) return
    // the drag is the grip's, wherever the pointer is: ProseMirror's own
    // drop cursor (a 1px rule) would otherwise draw where the grip has no
    // landing, and stay there, over the carried block
    event.stopPropagation()
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
    d.landing = { el: at.el, pos: at.pos, before: at.before, side: at.side }
    const line = d.line
    if (!line) return
    if (at.side) {
      // beside: a vertical line down the edge it would stand at
      line.hidden = false
      line.classList.remove("is-swap")
      line.classList.add("is-side")
      line.style.top = `${at.box.top}px`
      line.style.height = `${at.box.height}px`
      line.style.width = ""
      line.style.left = `${
        at.side === "left" ? at.box.left - 6 : at.box.right + 3
      }px`
    } else {
      line.classList.remove("is-side")
      line.hidden = false
      // a swap rings the picture it would change places with, not its line
      const swap = d.source !== null && swapsWith(d.source.el, at.el)
      const ring = swap
        ? (at.el.querySelector("img")?.getBoundingClientRect() ?? at.box)
        : at.box
      line.classList.toggle("is-swap", swap)
      line.style.left = `${ring.left}px`
      line.style.width = `${ring.width}px`
      line.style.height = swap ? `${ring.height}px` : ""
      line.style.top = swap
        ? `${ring.top}px`
        : `${at.before ? at.box.top - 3 : at.box.bottom}px`
    }
  }

  onDropRef.current = (event: DragEvent) => {
    const d = drag.current
    if (!d.dragging) return
    event.preventDefault()
    event.stopPropagation()
    const at = landingAt(event.clientX, event.clientY) ?? d.landing
    const from = d.source
    // a drop is the drag's end: Safari can drop and never send the
    // source its dragend, which would leave the grip hidden and stale
    finishDrag()
    targetRef.current = null
    setTarget(null)
    if (editor.isDestroyed || !at || !from) return
    const { state } = editor.view
    const node = state.doc.nodeAt(from.pos)
    const beside = state.doc.nodeAt(at.pos)
    if (!node || !beside) return
    if (from.run && at.side) {
      const out = dropRunBeside(state, from.pos, from.run.to, at.pos, at.side)
      if (!out) return
      const { tr, landed } = out
      if (from.run.chosen) {
        tr.setSelection(TextSelection.near(tr.doc.resolve(landed.from)))
        tr.setMeta(blockSelectKey, landed)
      } else
        tr.setSelection(
          TextSelection.between(
            tr.doc.resolve(landed.from),
            tr.doc.resolve(landed.to)
          )
        )
      editor.view.dispatch(tr.scrollIntoView())
      editor.view.focus()
      return
    }
    if (from.run) {
      dropRun(
        from.pos,
        from.run.to,
        at.before ? at.pos : at.pos + beside.nodeSize,
        from.run.chosen
      )
      return
    }
    if (at.side) {
      const tr = dropBeside(state, from.pos, at.pos, at.side)
      if (tr) {
        editor.view.dispatch(tr.scrollIntoView())
        editor.view.focus()
      }
      return
    }
    if (swapsWith(from.el, at.el)) {
      // the later one first, so the earlier position still holds
      const [first, second] =
        from.pos < at.pos
          ? [
              { pos: from.pos, node },
              { pos: at.pos, node: beside },
            ]
          : [
              { pos: at.pos, node: beside },
              { pos: from.pos, node },
            ]
      const tr = state.tr
        .replaceWith(second.pos, second.pos + second.node.nodeSize, first.node)
        .replaceWith(first.pos, first.pos + first.node.nodeSize, second.node)
      // the carried picture, where it now stands, stays selected
      const shift = second.node.nodeSize - first.node.nodeSize
      const landed = from.pos < at.pos ? at.pos + shift : at.pos
      tr.setSelection(NodeSelection.create(tr.doc, landed))
      editor.view.dispatch(tr.scrollIntoView())
      editor.view.focus()
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
    if (moved !== null) tr.setSelection(NodeSelection.create(tr.doc, moved))
    editor.view.dispatch(tr.scrollIntoView())
    editor.view.focus()
  }

  // the browser's own snapshot is replaced by nothing: the copy is drawn
  // here. Safari cancels a drag outright (dragstart, then dragend at once)
  // when dragstart hands it an image still loading, so the blank loads
  // with the grip, and an unready one is never handed over
  const blankRef = React.useRef<HTMLImageElement | null>(null)
  React.useEffect(() => {
    const img = new window.Image()
    img.src =
      "data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7"
    blankRef.current = img
  }, [])
  const hideSnapshot = (dt: DataTransfer) => {
    const img = blankRef.current
    if (img?.complete && img.naturalWidth > 0) dt.setDragImage(img, 0, 0)
  }

  const buildGhost = (doms: HTMLElement[], width: number) => {
    const ghost = document.createElement("div")
    ghost.className = "rte-bh-ghost"
    ghost.style.width = `${width}px`
    const docWrap = document.createElement("div")
    docWrap.className = editor.view.dom.parentElement?.className ?? ""
    const inner = document.createElement("div")
    inner.className = editor.view.dom.className
      .replace(/\bProseMirror-\S+/g, "")
      .replace("rte-dragging", "")
    for (const d of doms) {
      const copy = d.cloneNode(true) as HTMLElement
      copy.classList.remove("ProseMirror-selectednode", "rte-bh-carried")
      lightenPlayers(d, copy)
      inner.appendChild(copy)
    }
    docWrap.appendChild(inner)
    ghost.appendChild(docWrap)
    document.body.appendChild(ghost)
    return ghost
  }
  const startDragChrome = (
    event: React.DragEvent<HTMLButtonElement>,
    doms: HTMLElement[],
    width: number
  ) => {
    const d = drag.current
    d.dragging = true
    event.currentTarget.classList.add("is-dragging")
    editor.view.dom.classList.add("rte-dragging")
    document.body.classList.add("rte-block-drag")
    d.ghost = buildGhost(doms, width)
    d.ghost.style.transform = `translate(${event.clientX - d.grab.dx}px, ${
      event.clientY - d.grab.dy
    }px)`
    const line = document.createElement("div")
    line.className = "rte-bh-line"
    line.hidden = true
    document.body.appendChild(line)
    d.line = line
    document.addEventListener("dragover", onDragOverRef.current, true)
    document.addEventListener("dragenter", onDragOverRef.current, true)
    document.addEventListener("drop", onDropRef.current, true)
  }

  const onDragStart = (event: React.DragEvent<HTMLButtonElement>) => {
    const el = targetRef.current
    const run = selectedRun()
    const d = drag.current
    if (el && run && inRun(run, el) && event.dataTransfer) {
      // the drag of a run of blocks: the same copy and line, all of them
      const first = run.doms[0]
      const last = run.doms[run.doms.length - 1]
      const r0 = first.getBoundingClientRect()
      const r1 = last.getBoundingClientRect()
      d.source = {
        el: first,
        pos: run.from,
        run: { to: run.to, doms: run.doms, chosen: run.chosen },
      }
      d.grab = { dx: event.clientX - r0.left, dy: event.clientY - r0.top }
      const slice = editor.state.doc.slice(run.from, run.to)
      editor.view.dragging = { slice, move: true }
      const dt = event.dataTransfer
      dt.effectAllowed = "move"
      dt.clearData()
      dt.setData("text/html", run.doms.map((x) => lightHTML(x)).join(""))
      dt.setData("text/plain", run.doms.map((x) => x.textContent).join("\n"))
      hideSnapshot(dt)
      carried(run.doms, true)
      startDragChrome(event, run.doms, Math.max(r0.width, r1.width))
      return
    }
    if (!el || !event.dataTransfer) {
      event.preventDefault()
      return
    }
    // dragging is marked before the selection is dispatched: the
    // transaction would otherwise re-render the grip mid-dragstart
    d.dragging = true
    const sel = selectBlock()
    if (!sel) {
      d.dragging = false
      event.preventDefault()
      return
    }
    const r = el.getBoundingClientRect()
    d.source = { el, pos: sel.from }
    d.grab = { dx: event.clientX - r.left, dy: event.clientY - r.top }
    // what ProseMirror would read, should a drop ever reach it
    editor.view.dragging = { slice: sel.content(), move: true }
    event.dataTransfer.effectAllowed = "move"
    event.dataTransfer.clearData()
    event.dataTransfer.setData("text/html", lightHTML(el))
    event.dataTransfer.setData("text/plain", el.textContent ?? "")
    hideSnapshot(event.dataTransfer)
    startDragChrome(event, [el], r.width)
  }
  const onDragEnd = (event: React.DragEvent<HTMLButtonElement>) => {
    event.currentTarget.classList.remove("is-dragging")
    finishDrag()
    targetRef.current = null
    setTarget(null)
  }

  // pressed and not yet dragging: the grip holds still so the drag's
  // source stays under the press
  const release = React.useCallback(() => {
    drag.current.pressed = false
    window.removeEventListener("pointerup", release, true)
    window.removeEventListener("pointercancel", release, true)
  }, [])
  const onPress = () => {
    drag.current.pressed = true
    window.addEventListener("pointerup", release, true)
    window.addEventListener("pointercancel", release, true)
  }

  const onClick = () => {
    // on a run of selected blocks a click keeps the run
    const run = selectedRun()
    if (run && targetRef.current && inRun(run, targetRef.current)) {
      editor.view.focus()
      return
    }
    if (selectBlock()) editor.view.focus()
  }

  if (!mounted) return null
  return createPortal(
    <div
      ref={layerRef}
      className="pointer-events-none fixed inset-0 z-30"
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
                  ref={gripRef}
                  type="button"
                  draggable
                  aria-label="Drag to move"
                  {...pressHandlers(onPress)}
                  onDragStart={onDragStart}
                  onDragEnd={onDragEnd}
                  onClick={onClick}
                  style={{ left: point.left, top: point.top }}
                  className={cn(
                    "rte-bh-handle",
                    onMedia && "is-on-media",
                    inGutter && "is-in-gutter"
                  )}
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
