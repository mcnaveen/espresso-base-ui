"use client"

// Figma: espresso-2.0 › table (32157:9144). The table's controls, ported
// from the branch's RteTableControls and drawn over the document on a
// fixed layer so nothing is clipped by the table's scrolling card:
//
// - handles on the row and column of the cell under the pointer, or of the
//   caret's cell: a dash on the table's own rule (drawn by .rte-tc-edge at
//   the rule's device pixels), growing into the file's grip — a 10×20 (or
//   20×10) gray-500 pill with white dots — under the pointer, which opens
//   its menu; a selected cell or run adds a handle at its right edge;
// - a grip pressed selects its row or column; released in place it opens
//   the menu, and carried 4px it drags the row or column instead — a 3px
//   line marks the edge it will land on, the cells settle into their new
//   order over 220ms, and the first rows stay header rows;
// - two 16px strips, 8px off the table's right and bottom edges, that add
//   a column or a row at the end;
// - a fresh table shares the card's width between its columns; once a
//   column is added or resized every column holds the width it has, so
//   the new or wider one grows the table past the card instead of
//   squeezing the others.
import * as React from "react"
import { createPortal } from "react-dom"
import type { Editor as TiptapEditor } from "@tiptap/core"
import { Fragment, type Node as PMNode, type ResolvedPos } from "@tiptap/pm/model"
import { TextSelection } from "@tiptap/pm/state"
import {
  CellSelection,
  TableMap,
  cellAround,
  columnResizingPluginKey,
  isInTable,
} from "@tiptap/pm/tables"

import { cn } from "@/lib/utils"

import { pressHandlers, pressPointerId, type PressEvent } from "./press"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Add12Icon,
  ArrowDownIcon,
  ArrowLeftIcon,
  ArrowRightIcon,
  ArrowUpIcon,
  CellColorIcon,
  CellMergeIcon,
  DeleteIcon,
  DuplicateIcon,
  HeaderRowIcon,
  SmallCloseIcon,
} from "@/components/ui/rich-text-editor-icons"
import { hue, PALETTE, SMOOTH_SKIP, TABLE_SETTLE } from "./extensions"

type Box = { left: number; top: number; width: number; height: number }
const box = (r: DOMRect): Box => ({
  left: r.left,
  top: r.top,
  width: r.width,
  height: r.height,
})
const px = (n: number) => `${n}px`

type Ctx = {
  ed: TiptapEditor
  table: PMNode
  start: number
  map: TableMap
}

function ctxAt(ed: TiptapEditor, $pos: ResolvedPos): Ctx | null {
  for (let d = $pos.depth; d >= 0; d--) {
    if ($pos.node(d).type.name === "table") {
      const table = $pos.node(d)
      return { ed, table, start: $pos.start(d), map: TableMap.get(table) }
    }
  }
  return null
}

// The editor's own cell selections may come from the table extension's
// bundled copy of prosemirror-tables, a different class from the one
// imported here, so they are told by shape.
function asCellSelection(selection: unknown): CellSelection | null {
  return selection && typeof selection === "object" && "$anchorCell" in selection
    ? (selection as CellSelection)
    : null
}

const DRAG_START = 4
const SCROLL_EDGE = 40
const SETTLE = { duration: 220, easing: "cubic-bezier(0.2, 0, 0, 1)" }

type SelKind = "caret" | "cells" | "row" | "col" | null
type DragKind = "row" | "col"
type PressKind = DragKind | "cell"

interface Geo {
  tableBox: Box | null
  rowBox: Box | null
  colBox: Box | null
  cellBox: Box | null
  cellKnobOn: boolean
  ringTop: boolean
  ringLeft: boolean
  rowIndex: number
  colIndex: number
  cellCount: number
  cellMerged: boolean
  selKind: SelKind
  isHeaderRow: boolean
}

const EMPTY: Geo = {
  tableBox: null,
  rowBox: null,
  colBox: null,
  cellBox: null,
  cellKnobOn: false,
  ringTop: false,
  ringLeft: false,
  rowIndex: -1,
  colIndex: -1,
  cellCount: 0,
  cellMerged: false,
  selKind: null,
  isHeaderRow: false,
}

export function TableControls({ editor }: { editor: TiptapEditor }) {
  const [geo, setGeo] = React.useState<Geo>(EMPTY)
  const [rowOpen, setRowOpen] = React.useState(false)
  const [colOpen, setColOpen] = React.useState(false)
  const [cellOpen, setCellOpen] = React.useState(false)
  const [dragKind, setDragKind] = React.useState<DragKind | null>(null)
  const [dropLine, setDropLine] = React.useState<Box | null>(null)
  const [dropOn, setDropOn] = React.useState(false)
  const [mounted, setMounted] = React.useState(false)
  React.useEffect(() => setMounted(true), [])

  const layerRef = React.useRef<HTMLDivElement>(null)
  const geoRef = React.useRef<Geo>(EMPTY)
  geoRef.current = geo
  const menuOpenRef = React.useRef(false)
  menuOpenRef.current = rowOpen || colOpen || cellOpen

  // what the controls follow, held as document positions
  const self = React.useRef({
    anchorPos: null as number | null,
    hoverPos: null as number | null,
    hovering: false,
    resizeHeld: false,
    wrapper: null as HTMLElement | null,
    press: null as null | {
      kind: PressKind
      index: number
      x: number
      y: number
      lastX: number
      lastY: number
      el: HTMLElement
      pointerId: number
      wasOpen: boolean
      active: boolean
      to: number | null
    },
    ghost: null as HTMLElement | null,
    ghostAt: { left: 0, top: 0, size: 0 },
    grab: 0,
    scrollRaf: 0,
    dropLine: null as Box | null,
  })

  const openFor = React.useMemo(
    () => ({
      row: setRowOpen,
      col: setColOpen,
      cell: setCellOpen,
    }),
    []
  )
  const rowAnchorRef = React.useRef<HTMLElement | null>(null)
  const colAnchorRef = React.useRef<HTMLElement | null>(null)
  const cellAnchorRef = React.useRef<HTMLElement | null>(null)
  const anchorRefs = React.useMemo(
    () => ({ row: rowAnchorRef, col: colAnchorRef, cell: cellAnchorRef }),
    []
  )
  const isOpenRef = React.useRef({ row: false, col: false, cell: false })
  isOpenRef.current = { row: rowOpen, col: colOpen, cell: cellOpen }

  /* ---- geometry from the document */
  const ctxOf = React.useCallback(
    (ed: TiptapEditor): Ctx | null => {
      const el = self.current.wrapper?.querySelector("table")
      if (!el || !el.isConnected) return null
      try {
        return ctxAt(ed, ed.state.doc.resolve(ed.view.posAtDOM(el, 0)))
      } catch {
        return null
      }
    },
    []
  )
  const cellPos = (c: Ctx, row: number, col: number) =>
    c.start + c.map.map[row * c.map.width + col]
  const cellsIn = (c: Ctx, axis: "row" | "col", index: number): number[] => {
    const out: number[] = []
    const n = axis === "row" ? c.map.width : c.map.height
    for (let i = 0; i < n; i++) {
      const pos = axis === "row" ? cellPos(c, index, i) : cellPos(c, i, index)
      if (!out.includes(pos)) out.push(pos)
    }
    return out
  }
  const rowNodeAt = (c: Ctx, row: number): { node: PMNode; pos: number } => {
    let pos = c.start
    for (let i = 0; i < row; i++) pos += c.table.child(i).nodeSize
    return { node: c.table.child(row), pos }
  }

  /* ---- measuring */
  const measure = React.useCallback(() => {
    const s = self.current
    const ed = editor
    let cellEl: HTMLElement | null = null
    if (s.anchorPos !== null && ed && !ed.isDestroyed) {
      try {
        const dom = ed.view.nodeDOM(s.anchorPos)
        cellEl = dom instanceof HTMLElement ? dom : null
      } catch {
        cellEl = null
      }
    }
    if (cellEl)
      s.wrapper =
        cellEl.closest<HTMLElement>(".tableWrapper") ?? cellEl.closest("table")
    const w = s.wrapper
    if (!w || !w.isConnected) {
      s.wrapper = null
      s.anchorPos = null
      setGeo(EMPTY)
      return
    }
    const tableBox = box(w.getBoundingClientRect())
    const inCard = (x: number) =>
      x >= tableBox.left && x <= tableBox.left + tableBox.width
    const r = cellEl?.closest("tr")
    const rowBox = r ? box(r.getBoundingClientRect()) : null
    // a column scrolled out of the card has no handle over the page
    let colBox: Box | null = null
    if (cellEl) {
      const cr = cellEl.getBoundingClientRect()
      const mid = cr.left + cr.width / 2
      colBox = inCard(mid)
        ? {
            left: cr.left,
            top: tableBox.top,
            width: cr.width,
            height: tableBox.height,
          }
        : null
    }
    const selected = w.querySelectorAll<HTMLElement>(".selectedCell")
    // on the table's own edge the ring keeps to the cell's edge, a pixel
    // inside the rule
    const colMid = colBox && colBox.left + colBox.width / 2
    const rowMid = rowBox && rowBox.top + rowBox.height / 2
    let ringTop = false
    let ringLeft = false
    selected.forEach((el) => {
      const b = el.getBoundingClientRect()
      const tr = el.parentElement
      if (
        colMid !== null &&
        colMid !== undefined &&
        tr === tr?.parentElement?.firstElementChild &&
        colMid >= b.left &&
        colMid <= b.right
      )
        ringTop = true
      if (
        rowMid !== null &&
        rowMid !== undefined &&
        el === tr?.firstElementChild &&
        rowMid >= b.top &&
        rowMid <= b.bottom
      )
        ringLeft = true
    })
    let cellBox: Box | null = null
    let cellKnobOn = false
    const kind = geoRef.current.selKind
    if (selected.length) {
      let left = Infinity
      let top = Infinity
      let right = -Infinity
      let bottom = -Infinity
      selected.forEach((el) => {
        const b = el.getBoundingClientRect()
        left = Math.min(left, b.left)
        top = Math.min(top, b.top)
        right = Math.max(right, b.right)
        bottom = Math.max(bottom, b.bottom)
      })
      cellBox = { left, top, width: right - left, height: bottom - top }
      cellKnobOn = inCard(right)
    } else if (cellEl && kind === "caret") {
      cellBox = box(cellEl.getBoundingClientRect())
      cellKnobOn = inCard(cellBox.left + cellBox.width)
    }
    // the menus read the row's header state fresh
    const c = ctxOf(ed)
    let isHeaderRow = false
    if (c && geoRef.current.rowIndex === 0) {
      const first = c.table.child(0)
      isHeaderRow = first.childCount > 0
      for (let i = 0; i < first.childCount; i++)
        if (first.child(i).type.name !== "tableHeader") isHeaderRow = false
    }
    setGeo((g) => ({
      ...g,
      tableBox,
      rowBox,
      colBox,
      cellBox,
      cellKnobOn,
      ringTop,
      ringLeft,
      isHeaderRow,
    }))
  }, [editor, ctxOf])

  // the run's selection box is drawn by the overlay on the cells' outer
  // edges; it moves out onto the rules, stops at the card's edge, and at a
  // corner of the card takes the card's inner 11px radius
  /* ---- the selection: a row, a column, a run of cells, or the caret's
     cell; the cell under the pointer takes over from a caret */
  const syncSelection = React.useCallback(() => {
    const s = self.current
    const ed = editor
    if (!ed || ed.isDestroyed || !ed.isEditable || menuOpenRef.current) return
    let view
    try {
      view = ed.view
    } catch {
      return
    }
    const { selection } = ed.state
    const $selCell = isInTable(ed.state) ? cellAround(selection.$from) : null
    let $cell = $selCell
    let kind: SelKind = null
    let count = 0
    if ($selCell) {
      const cells = asCellSelection(selection)
      if (cells) {
        cells.forEachCell(() => count++)
        kind = cells.isRowSelection()
          ? "row"
          : cells.isColSelection()
            ? "col"
            : "cells"
      } else {
        count = 1
        kind = "caret"
      }
    }
    if (s.hoverPos !== null && (kind === "caret" || kind === null)) {
      const $hover = cellAt(ed, s.hoverPos)
      if ($hover) $cell = $hover
    }
    if (!$cell) {
      // the caret left the table: the controls stay while the pointer hovers
      if (!s.hovering) {
        s.wrapper = null
        s.anchorPos = null
        setGeo(EMPTY)
        return
      }
      s.anchorPos = null
      setGeo((g) => ({ ...g, cellBox: null, cellCount: 0, selKind: null }))
      return
    }
    const c = ctxAt(ed, $cell)
    if (!c) return
    const dom = view.nodeDOM(c.start - 1)
    const tableDom =
      dom instanceof HTMLElement
        ? dom.tagName === "TABLE"
          ? dom
          : dom.querySelector("table")
        : null
    const wrapper = tableDom?.closest<HTMLElement>(".tableWrapper") ?? tableDom
    if (wrapper) s.wrapper = wrapper
    const rect = c.map.findCell($cell.pos - c.start)
    s.anchorPos = $cell.pos
    const cell = $selCell?.nodeAfter
    setGeo((g) => ({
      ...g,
      rowIndex: rect.top,
      colIndex: rect.left,
      cellCount: count,
      selKind: kind,
      cellMerged:
        !!cell && (cell.attrs.colspan > 1 || cell.attrs.rowspan > 1),
    }))
    // measured on the fresh indices
    geoRef.current = {
      ...geoRef.current,
      rowIndex: rect.top,
      colIndex: rect.left,
      selKind: kind,
    }
    measure()
  }, [editor, measure])

  const cellAt = (ed: TiptapEditor, pos: number): ResolvedPos | null => {
    try {
      const $pos = ed.state.doc.resolve(pos)
      const role = (
        $pos.nodeAfter?.type.spec as { tableRole?: string } | undefined
      )?.tableRole
      return role === "cell" || role === "header_cell" ? $pos : null
    } catch {
      return null
    }
  }

  /* ---- widths. tiptap's resize sets only the dragged column's width, so
     before a column is added or resized every column is told the width it
     has, and the table grows past the card instead of squeezing */
  const columnWidths = (c: Ctx): number[] => {
    const cols = [...(self.current.wrapper?.querySelectorAll("col") ?? [])]
    let raw: number[]
    // Safari rects a sizeless <col> at 0: only trust the colgroup when
    // every column measures, and fall back to the first row's cells
    const colWidths =
      cols.length === c.map.width
        ? cols.map((col) => col.getBoundingClientRect().width)
        : null
    if (colWidths && colWidths.every((w) => w > 0)) raw = colWidths
    else {
      raw = []
      for (let i = 0; i < c.map.width; i++) {
        const dom = c.ed.view.nodeDOM(c.start + c.map.map[i])
        raw.push(
          dom instanceof HTMLElement ? dom.getBoundingClientRect().width : 100
        )
      }
    }
    return wholePixels(raw)
  }
  const wholePixels = (raw: number[]): number[] => {
    const total = Math.round(raw.reduce((a, b) => a + b, 0))
    const floors = raw.map((w) => Math.floor(w))
    let left = total - floors.reduce((a, b) => a + b, 0)
    const order = raw
      .map((w, i) => ({ i, rest: w - Math.floor(w) }))
      .sort((a, b) => b.rest - a.rest)
    for (const { i } of order) {
      if (left <= 0) break
      floors[i] += 1
      left -= 1
    }
    return floors
  }
  const holdWidths = (c: Ctx, widths: number[]) => {
    const tr = c.ed.state.tr
    const seen = new Set<number>()
    c.map.map.forEach((rel) => {
      if (seen.has(rel)) return
      seen.add(rel)
      const pos = c.start + rel
      const cell = c.ed.state.doc.nodeAt(pos)
      if (!cell) return
      const r = c.map.findCell(rel)
      const colwidth = widths.slice(r.left, r.right)
      const had = cell.attrs.colwidth as number[] | null
      if (
        had &&
        had.length === colwidth.length &&
        had.every((w, k) => w === colwidth[k])
      )
        return
      tr.setNodeMarkup(pos, null, { ...cell.attrs, colwidth })
    })
    // the widths written as they already stand: nothing moves, nothing
    // slides
    tr.setMeta(SMOOTH_SKIP, true)
    if (tr.docChanged) c.ed.view.dispatch(tr)
  }
  const hasUnsizedColumn = (c: Ctx): boolean => {
    let unsized = false
    c.table.descendants((node) => {
      if (unsized) return false
      const name = node.type.name
      if (name !== "tableCell" && name !== "tableHeader") return true
      if (!node.attrs.colwidth) unsized = true
      return false
    })
    return unsized
  }
  /** `add` puts a column at `at`; it takes column `like`'s width */
  const withColumnAdded = (
    c: Ctx,
    at: number,
    like: number,
    add: () => void
  ) => {
    const widths = columnWidths(c)
    add()
    const fresh = ctxOf(c.ed)
    if (!fresh || fresh.map.width !== widths.length + 1) return
    const next = widths.slice()
    next.splice(at, 0, widths[Math.min(Math.max(like, 0), widths.length - 1)])
    holdWidths(fresh, next)
  }
  // a resize in the offing (tiptap's handle armed under the pointer) on a
  // table with columns still sharing the card: they hold their widths now
  const holdBeforeResize = React.useCallback(
    (ed: TiptapEditor) => {
      const armed =
        columnResizingPluginKey.getState(ed.state)?.activeHandle ?? -1
      if (armed < 0) return
      let c: Ctx | null = null
      try {
        c = ctxAt(ed, ed.state.doc.resolve(armed))
      } catch {
        c = null
      }
      if (!c) return
      // the context is keyed off the armed handle, not the hovered wrapper
      const el = ed.view.nodeDOM(c.start - 1)
      const wrapper =
        el instanceof HTMLElement
          ? (el.closest(".tableWrapper") as HTMLElement | null) ??
            (el.querySelector(".tableWrapper") as HTMLElement | null)
          : null
      if (wrapper) self.current.wrapper = wrapper
      if (!hasUnsizedColumn(c)) return
      holdWidths(c, columnWidths(c))
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [editor]
  )

  /* ---- actions */
  const focusCell = (c: Ctx, pos: number) => {
    c.ed.view.dispatch(
      c.ed.state.tr.setSelection(TextSelection.create(c.ed.state.doc, pos + 2))
    )
  }
  const selectRow = React.useCallback(
    (row: number) => {
      const c = ctxOf(editor)
      if (!c) return
      const { doc } = c.ed.state
      const sel = CellSelection.rowSelection(
        doc.resolve(cellPos(c, row, 0)),
        doc.resolve(cellPos(c, row, c.map.width - 1))
      )
      c.ed.view.dispatch(c.ed.state.tr.setSelection(sel))
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [editor, ctxOf]
  )
  const selectCol = React.useCallback(
    (col: number) => {
      const c = ctxOf(editor)
      if (!c) return
      const { doc } = c.ed.state
      const sel = CellSelection.colSelection(
        doc.resolve(cellPos(c, 0, col)),
        doc.resolve(cellPos(c, c.map.height - 1, col))
      )
      c.ed.view.dispatch(c.ed.state.tr.setSelection(sel))
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [editor, ctxOf]
  )
  const clearCells = (c: Ctx, positions: number[]) => {
    const tr = c.ed.state.tr
    const paragraph = c.ed.schema.nodes.paragraph
    ;[...positions]
      .sort((a, b) => b - a)
      .forEach((pos) => {
        const cell = tr.doc.nodeAt(pos)
        if (!cell) return
        tr.replaceWith(pos + 1, pos + cell.nodeSize - 1, paragraph.create())
      })
    c.ed.view.dispatch(tr)
  }
  const withCtx = (run: (c: Ctx) => void) => {
    const c = ctxOf(editor)
    if (!c) return
    run(c)
    editor.commands.focus(undefined, { scrollIntoView: false })
  }

  const g = geoRef
  const rowActions = {
    insertAbove: () =>
      withCtx((c) => {
        focusCell(c, cellPos(c, g.current.rowIndex, 0))
        c.ed.commands.addRowBefore()
      }),
    insertBelow: () =>
      withCtx((c) => {
        focusCell(c, cellPos(c, g.current.rowIndex, 0))
        c.ed.commands.addRowAfter()
      }),
    duplicate: () =>
      withCtx((c) => {
        const { node, pos } = rowNodeAt(c, g.current.rowIndex)
        c.ed.view.dispatch(
          c.ed.state.tr.insert(
            pos + node.nodeSize,
            node.type.create(node.attrs, node.content)
          )
        )
      }),
    clear: () =>
      withCtx((c) => clearCells(c, cellsIn(c, "row", g.current.rowIndex))),
    remove: () =>
      withCtx((c) => {
        if (c.map.height === 1) {
          c.ed.commands.deleteTable()
          return
        }
        selectRow(g.current.rowIndex)
        c.ed.commands.deleteRow()
      }),
    colour: (name: string | null) =>
      withCtx((c) => {
        selectRow(g.current.rowIndex)
        c.ed.commands.setCellBackground(name)
      }),
    toggleHeader: () =>
      withCtx((c) => {
        focusCell(c, cellPos(c, 0, 0))
        c.ed.commands.toggleHeaderRow()
      }),
  }
  const colActions = {
    insertLeft: () =>
      withCtx((c) =>
        withColumnAdded(c, g.current.colIndex, g.current.colIndex, () => {
          focusCell(c, cellPos(c, 0, g.current.colIndex))
          c.ed.commands.addColumnBefore()
        })
      ),
    insertRight: () =>
      withCtx((c) =>
        withColumnAdded(c, g.current.colIndex + 1, g.current.colIndex, () => {
          focusCell(c, cellPos(c, 0, g.current.colIndex))
          c.ed.commands.addColumnAfter()
        })
      ),
    duplicate: () =>
      withCtx((c) =>
        withColumnAdded(c, g.current.colIndex + 1, g.current.colIndex, () => {
          const tr = c.ed.state.tr
          cellsIn(c, "col", g.current.colIndex)
            .sort((a, b) => b - a)
            .forEach((pos) => {
              const cell = tr.doc.nodeAt(pos)
              if (!cell) return
              tr.insert(
                pos + cell.nodeSize,
                cell.type.create(cell.attrs, cell.content)
              )
            })
          c.ed.view.dispatch(tr)
        })
      ),
    clear: () =>
      withCtx((c) => clearCells(c, cellsIn(c, "col", g.current.colIndex))),
    remove: () =>
      withCtx((c) => {
        if (c.map.width === 1) {
          c.ed.commands.deleteTable()
          return
        }
        selectCol(g.current.colIndex)
        c.ed.commands.deleteColumn()
      }),
    colour: (name: string | null) =>
      withCtx((c) => {
        selectCol(g.current.colIndex)
        c.ed.commands.setCellBackground(name)
      }),
  }
  const cellActions = {
    colour: (name: string | null) =>
      withCtx((c) => c.ed.commands.setCellBackground(name)),
    merge: () => withCtx((c) => c.ed.commands.mergeCells()),
    split: () => withCtx((c) => c.ed.commands.splitCell()),
    clear: () =>
      withCtx((c) => {
        const { selection } = c.ed.state
        const positions: number[] = []
        const cells = asCellSelection(selection)
        if (cells) cells.forEachCell((_n, pos) => positions.push(pos))
        else {
          const $cell = cellAround(selection.$from)
          if ($cell) positions.push($cell.pos)
        }
        clearCells(c, positions)
      }),
  }
  const addColumnAtEnd = () =>
    withCtx((c) =>
      withColumnAdded(c, c.map.width, c.map.width - 1, () => {
        focusCell(c, cellPos(c, 0, c.map.width - 1))
        c.ed.commands.addColumnAfter()
      })
    )
  const addRowAtEnd = () =>
    withCtx((c) => {
      focusCell(c, cellPos(c, c.map.height - 1, 0))
      c.ed.commands.addRowAfter()
    })

  /* ---- hovering */
  React.useEffect(() => {
    const onMove = (e: MouseEvent) => {
      const s = self.current
      const ed = editor
      if (!ed || ed.isDestroyed || !ed.isEditable || menuOpenRef.current)
        return
      if (s.press?.active) return
      const target = e.target instanceof Element ? e.target : null
      if (!target) return
      if (layerRef.current?.contains(target)) return
      const cell = target.closest<HTMLElement>(".rte-doc td, .rte-doc th")
      if (cell) {
        s.hovering = true
        let pos: number | null = null
        try {
          const $cell = cellAround(
            ed.state.doc.resolve(ed.view.posAtDOM(cell, 0))
          )
          pos = $cell ? $cell.pos : null
        } catch {
          pos = null
        }
        if (pos === null || pos === s.hoverPos) return
        s.hoverPos = pos
        syncSelection()
        return
      }
      const t = geoRef.current.tableBox
      const near =
        t &&
        e.clientX >= t.left - 12 &&
        e.clientX <= t.left + t.width + 28 &&
        e.clientY >= t.top - 12 &&
        e.clientY <= t.top + t.height + 28
      if (near) return
      s.hovering = false
      if (s.hoverPos === null) {
        if (!isInTable(ed.state)) {
          s.wrapper = null
          s.anchorPos = null
          setGeo(EMPTY)
        }
        return
      }
      s.hoverPos = null
      syncSelection()
    }
    // the widths hold when a column's resize begins (the plugin's drag,
    // below), not when its border is only hovered: holding them is an edit
    // of the table, which a pointer passing over a border must not make
    document.addEventListener("mousemove", onMove, true)
    return () => document.removeEventListener("mousemove", onMove, true)
  }, [editor, syncSelection, holdBeforeResize])

  /* ---- subscriptions: batched on a microtask */
  React.useEffect(() => {
    let pending = false
    const schedule = () => {
      if (pending) return
      pending = true
      queueMicrotask(() => {
        pending = false
        if (!menuOpenRef.current) syncSelection()
        measure()
      })
    }
    const onTransaction = ({
      transaction,
    }: {
      transaction: { mapping: { map: (pos: number) => number } }
    }) => {
      const s = self.current
      if (s.hoverPos !== null) s.hoverPos = transaction.mapping.map(s.hoverPos)
      // a resize can begin before the hover hold has run (Safari delivers
      // the press before our move listener sees the armed handle): the
      // plugin's dragging flag is the sure signal, and the widths hold on
      // its first appearance
      const resizing = !!columnResizingPluginKey.getState(editor.state)
        ?.dragging
      if (resizing && !s.resizeHeld) {
        s.resizeHeld = true
        holdBeforeResize(editor)
      } else if (!resizing && s.resizeHeld) {
        s.resizeHeld = false
      }
      schedule()
    }
    editor.on("transaction", onTransaction)
    document.addEventListener("scroll", schedule, true)
    window.addEventListener("resize", schedule)
    return () => {
      editor.off("transaction", onTransaction)
      document.removeEventListener("scroll", schedule, true)
      window.removeEventListener("resize", schedule)
    }
  }, [editor, syncSelection, measure, holdBeforeResize])

  // a closed menu lets the pointer take over again
  const menuOpen = rowOpen || colOpen || cellOpen
  React.useEffect(() => {
    if (!menuOpen) {
      queueMicrotask(() => {
        syncSelection()
        measure()
      })
    }
  }, [menuOpen, syncSelection, measure])

  // the table's own changes of shape: resize writes widths straight into
  // the DOM with no transaction, so the handles re-measure on mutations
  const wrapper = self.current.wrapper
  React.useEffect(() => {
    const w = wrapper
    if (!w) return
    const mo = new MutationObserver((records) => {
      if (
        records.some(
          (r) =>
            !(r.target instanceof Element) ||
            !r.target.classList.contains("table-selection-box")
        )
      )
        measure()
    })
    mo.observe(w, { attributes: true, attributeFilter: ["style"], subtree: true })
    const ro = new ResizeObserver(() => measure())
    ro.observe(w)
    const table = w.querySelector("table")
    if (table) ro.observe(table)
    // the card scrolls its columns, never its rows
    const level = () => {
      if (w.scrollTop) w.scrollTop = 0
    }
    level()
    w.addEventListener("scroll", level)
    return () => {
      mo.disconnect()
      ro.disconnect()
      w.removeEventListener("scroll", level)
    }
  }, [wrapper, measure])

  /* ---- a press on a grip selects; carried 4px it drags */
  const stills = () =>
    window.matchMedia("(prefers-reduced-motion: reduce)").matches

  const canDrag = (kind: DragKind, index: number): boolean => {
    const c = ctxOf(editor)
    if (!c || index < 0) return false
    if ((kind === "row" ? c.map.height : c.map.width) < 2) return false
    let ok = true
    c.table.descendants((node) => {
      if (!ok) return false
      const name = node.type.name
      if (name !== "tableCell" && name !== "tableHeader") return true
      if (node.attrs.rowspan > 1 || (kind === "col" && node.attrs.colspan > 1))
        ok = false
      return false
    })
    return ok
  }
  const edgesOf = (w: HTMLElement, kind: DragKind): number[] => {
    if (kind === "row") {
      const rows = [...w.querySelectorAll<HTMLElement>("tr")].map((r) =>
        r.getBoundingClientRect()
      )
      if (!rows.length) return []
      return [...rows.map((r) => r.top), rows[rows.length - 1].bottom]
    }
    const cells = [...(w.querySelector("tr")?.children ?? [])].map((c) =>
      c.getBoundingClientRect()
    )
    if (!cells.length) return []
    return [...cells.map((r) => r.left), cells[cells.length - 1].right]
  }

  const aim = React.useCallback(() => {
    const s = self.current
    const p = s.press
    const w = s.wrapper
    const t = geoRef.current.tableBox
    if (!p || !p.active || p.kind === "cell" || !w || !t) return
    const edges = edgesOf(w, p.kind)
    if (!edges.length) return
    const at = p.kind === "row" ? p.lastY : p.lastX
    let to = 0
    let best = Infinity
    edges.forEach((edge, i) => {
      const d = Math.abs(edge - at)
      if (d < best) {
        best = d
        to = i
      }
    })
    const lineAt = (edge: number): Box =>
      p.kind === "row"
        ? { left: t.left + 1, top: edge - 1.5, width: t.width - 2, height: 3 }
        : { left: edge - 1.5, top: t.top + 1, width: 3, height: t.height - 2 }
    const inCard = (x: number) => x >= t.left && x <= t.left + t.width
    if (to === p.index || to === p.index + 1) {
      p.to = null
      setDropOn(false)
      if (!s.dropLine) {
        s.dropLine = lineAt(edges[to])
        setDropLine(s.dropLine)
      }
      return
    }
    p.to = to
    s.dropLine = lineAt(edges[to])
    setDropLine(s.dropLine)
    setDropOn(p.kind === "row" || inCard(edges[to]))
  }, [])

  const lift = React.useCallback(
    (p: NonNullable<(typeof self)["current"]["press"]>) => {
      const s = self.current
      const w = s.wrapper
      const table = w?.querySelector("table")
      if (!w || !table || p.kind === "cell") return
      dropGhost()
      const rows = [...w.querySelectorAll<HTMLElement>("tr")]
      const tb = table.getBoundingClientRect()
      const host = document.createElement("div")
      host.className = "rte-tc-ghost"
      const copy = document.createElement("table")
      const body = document.createElement("tbody")
      if (p.kind === "row") {
        const src = rows[p.index]
        if (!src) return
        const r = src.getBoundingClientRect()
        const cols = table.querySelector("colgroup")
        if (cols) copy.appendChild(cols.cloneNode(true))
        body.appendChild(src.cloneNode(true))
        copy.style.width = `${tb.width}px`
        s.ghostAt = { left: tb.left, top: r.top, size: r.height }
        s.grab = p.y - r.top
      } else {
        let width = 0
        rows.forEach((row) => {
          const cell = row.children[p.index] as HTMLElement | undefined
          if (!cell) return
          const r = cell.getBoundingClientRect()
          width = Math.max(width, r.width)
          const tr = document.createElement("tr")
          const td = cell.cloneNode(true) as HTMLElement
          td.style.height = `${r.height}px`
          tr.appendChild(td)
          body.appendChild(tr)
        })
        copy.style.width = `${width}px`
        const first = rows[0]?.children[p.index]?.getBoundingClientRect()
        s.ghostAt = { left: first?.left ?? tb.left, top: tb.top, size: width }
        s.grab = p.x - s.ghostAt.left
      }
      body
        .querySelectorAll(".selectedCell")
        .forEach((el) => el.classList.remove("selectedCell"))
      copy.appendChild(body)
      host.appendChild(copy)
      host.style.left = `${s.ghostAt.left}px`
      host.style.top = `${s.ghostAt.top}px`
      host.style.width = `${p.kind === "row" ? tb.width : s.ghostAt.size}px`
      document.body.appendChild(host)
      s.ghost = host
      carry(p)
      requestAnimationFrame(() => s.ghost?.classList.add("is-up"))
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  )
  const carry = (p: NonNullable<(typeof self)["current"]["press"]>) => {
    const s = self.current
    const t = geoRef.current.tableBox
    if (!s.ghost || !t || p.kind === "cell") return
    if (p.kind === "row") {
      const top = Math.min(
        Math.max(p.lastY - s.grab, t.top + 1),
        t.top + t.height - 1 - s.ghostAt.size
      )
      s.ghost.style.transform = `translate3d(0, ${top - s.ghostAt.top}px, 0)`
    } else {
      const left = Math.min(
        Math.max(p.lastX - s.grab, t.left + 1),
        t.left + t.width - 1 - s.ghostAt.size
      )
      s.ghost.style.transform = `translate3d(${left - s.ghostAt.left}px, 0, 0)`
    }
  }
  const dropGhost = () => {
    const s = self.current
    const ghost = s.ghost
    s.ghost = null
    if (!ghost) return
    ghost.classList.remove("is-up")
    const gone = () => ghost.remove()
    if (stills()) gone()
    else {
      ghost.addEventListener("transitionend", gone, { once: true })
      window.setTimeout(gone, 200)
    }
  }

  // near the scroller's edge the page scrolls on, and the line follows
  const autoScroll = React.useCallback(() => {
    const s = self.current
    s.scrollRaf = 0
    const p = s.press
    const w = s.wrapper
    if (!p || !p.active || !w) return
    let moved = false
    if (p.kind === "row") {
      const sp = scrollParentOf(w)
      if (sp) {
        const r =
          sp === document.scrollingElement
            ? { top: 0, bottom: window.innerHeight }
            : sp.getBoundingClientRect()
        let dy = 0
        if (p.lastY < r.top + SCROLL_EDGE)
          dy = -Math.ceil((r.top + SCROLL_EDGE - p.lastY) / 4)
        else if (p.lastY > r.bottom - SCROLL_EDGE)
          dy = Math.ceil((p.lastY - (r.bottom - SCROLL_EDGE)) / 4)
        if (dy) {
          const before = sp.scrollTop
          sp.scrollTop += dy
          moved = sp.scrollTop !== before
        }
      }
    } else {
      const r = w.getBoundingClientRect()
      let dx = 0
      if (p.lastX < r.left + SCROLL_EDGE)
        dx = -Math.ceil((r.left + SCROLL_EDGE - p.lastX) / 4)
      else if (p.lastX > r.right - SCROLL_EDGE)
        dx = Math.ceil((p.lastX - (r.right - SCROLL_EDGE)) / 4)
      if (dx) {
        const before = w.scrollLeft
        w.scrollLeft += dx
        moved = w.scrollLeft !== before
      }
    }
    if (moved) {
      measure()
      aim()
    }
    s.scrollRaf = requestAnimationFrame(autoScroll)
  }, [measure, aim])
  const scrollParentOf = (el: HTMLElement | null): HTMLElement | null => {
    for (let n = el?.parentElement; n; n = n.parentElement) {
      const o = getComputedStyle(n).overflowY
      if ((o === "auto" || o === "scroll") && n.scrollHeight > n.clientHeight)
        return n
    }
    return (document.scrollingElement as HTMLElement | null) ?? null
  }

  /** every cell's place, by row and column */
  const placesIn = (w: HTMLElement): DOMRect[][] =>
    [...w.querySelectorAll("tr")].map((row) =>
      [...row.children].map((cell) => cell.getBoundingClientRect())
    )
  // after the move every cell slides from where it was to where it is, the
  // moved line's ring arriving as they land. Web Animations, not styles.
  const settle = (
    w: HTMLElement,
    kind: DragKind,
    from: number,
    at: number,
    before: DOMRect[][]
  ) => {
    const n = kind === "row" ? before.length : (before[0]?.length ?? 0)
    const order = [...Array(n).keys()]
    const [moved] = order.splice(from, 1)
    order.splice(at, 0, moved)
    const rows = [...w.querySelectorAll<HTMLElement>("tr")]
    const moves: [HTMLElement, number][] = []
    rows.forEach((row, r) => {
      ;[...row.children].forEach((el, col) => {
        const was =
          kind === "row" ? before[order[r]]?.[col] : before[r]?.[order[col]]
        if (!was) return
        const now = el.getBoundingClientRect()
        const d = kind === "row" ? was.top - now.top : was.left - now.left
        if (Math.abs(d) > 0.5) moves.push([el as HTMLElement, d])
      })
    })
    if (!moves.length) return
    const axis = kind === "row" ? "translateY" : "translateX"
    moves.forEach(([el, d]) =>
      el.animate([{ transform: `${axis}(${d}px)` }, { transform: "none" }], SETTLE)
    )
    // the selection ring waits out the slide and arrives as the cells land
    window.dispatchEvent(new Event(TABLE_SETTLE))
  }

  /** the leading rows made of header cells */
  const headerRows = (c: Ctx): number => {
    let n = 0
    for (let i = 0; i < c.table.childCount; i++) {
      const row = c.table.child(i)
      let all = row.childCount > 0
      for (let j = 0; j < row.childCount; j++)
        if (row.child(j).type.name !== "tableHeader") all = false
      if (!all) break
      n++
    }
    return n
  }
  // the move: the table rebuilt with its rows (or every row's cells) in
  // the new order, and the moved line selected again
  const moveLine = (kind: DragKind, from: number, to: number) => {
    const c = ctxOf(editor)
    if (!c) return
    const at = to > from ? to - 1 : to
    if (at === from) return
    const w = self.current.wrapper
    const before = w && !stills() ? placesIn(w) : null
    const { tableCell, tableHeader } = c.ed.schema.nodes
    const header = headerRows(c)
    const rows: PMNode[] = []
    for (let i = 0; i < c.table.childCount; i++) rows.push(c.table.child(i))
    let next: PMNode[]
    if (kind === "row") {
      const order = rows.slice()
      const [row] = order.splice(from, 1)
      order.splice(at, 0, row)
      next = order.map((row, i) => {
        const type = i < header ? tableHeader : tableCell
        const cells: PMNode[] = []
        row.forEach((cell) =>
          cells.push(
            cell.type === type
              ? cell
              : type.create(cell.attrs, cell.content, cell.marks)
          )
        )
        return row.copy(Fragment.from(cells))
      })
    } else {
      next = rows.map((row) => {
        const cells: PMNode[] = []
        row.forEach((cell) => cells.push(cell))
        const [cell] = cells.splice(from, 1)
        cells.splice(at, 0, cell)
        return row.copy(Fragment.from(cells))
      })
    }
    const table = c.table.copy(Fragment.from(next))
    const tr = c.ed.state.tr.replaceWith(
      c.start - 1,
      c.start - 1 + c.table.nodeSize,
      table
    )
    const map = TableMap.get(table)
    const cell = (row: number, col: number) =>
      tr.doc.resolve(c.start + map.map[row * map.width + col])
    tr.setSelection(
      kind === "row"
        ? CellSelection.rowSelection(cell(at, 0), cell(at, map.width - 1))
        : CellSelection.colSelection(cell(0, at), cell(map.height - 1, at))
    )
    c.ed.view.dispatch(tr)
    if (w && before) settle(w, kind, from, at, before)
  }

  // The press is driven from window listeners, not pointer capture on the
  // grip: the grip is a React-rendered button in a layer that re-renders
  // as the selection and geometry move, and an unmount mid-drag would
  // take the captured pointer's events with it — the release never
  // arriving, the ghost and the drop line left standing (the stuck-drag
  // bug). Window listeners outlive any re-render.
  const pressDetach = React.useRef<(() => void) | null>(null)
  const endPress = React.useCallback(() => {
    const s = self.current
    const p = s.press
    s.press = null
    pressDetach.current?.()
    pressDetach.current = null
    if (!p) return
    setDragKind(null)
    setDropLine(null)
    setDropOn(false)
    s.dropLine = null
    dropGhost()
    document.body.classList.remove("rte-tc-dragging")
    document.removeEventListener("keydown", onDragKey, true)
    if (s.scrollRaf) cancelAnimationFrame(s.scrollRaf)
    s.scrollRaf = 0
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
  const onDragKey = React.useCallback(
    (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault()
        endPress()
      }
    },
    [endPress]
  )

  const onPressMove = (e: PointerEvent) => {
    const s = self.current
    const p = s.press
    if (!p || (p.pointerId !== -1 && p.pointerId !== e.pointerId)) return
    p.lastX = e.clientX
    p.lastY = e.clientY
    if (!p.active) {
      if (p.kind === "cell") return
      if (Math.hypot(e.clientX - p.x, e.clientY - p.y) < DRAG_START) return
      if (!canDrag(p.kind, p.index)) return
      p.active = true
      setDragKind(p.kind)
      openFor[p.kind](false)
      document.body.classList.add("rte-tc-dragging")
      document.addEventListener("keydown", onDragKey, true)
      lift(p)
      autoScroll()
    }
    aim()
    carry(p)
  }
  const onRelease = (e: PointerEvent) => {
    const p = self.current.press
    if (!p || (p.pointerId !== -1 && p.pointerId !== e.pointerId)) return
    endPress()
    if (p.active) {
      if (p.to !== null) moveLine(p.kind as DragKind, p.index, p.to)
    } else if (!p.wasOpen) {
      // after the press's trailing click has passed (opening into it reads
      // as an outside press), and through the real trigger: a bare
      // setState open carries no press reason, and Base UI's hover
      // interaction closes a reasonless menu the moment the pointer
      // brushes the popup it opened under (Chrome fires those synthetic
      // moves; the grip sits right where the popup lands)
      const kind = p.kind
      window.setTimeout(() => {
        const anchor = anchorRefs[kind].current
        if (anchor) {
          // down AND up: the up releases Base UI's press tracking, or the
          // next release over a menu item would run the item twice
          for (const type of ["mousedown", "mouseup"] as const) {
            anchor.dispatchEvent(
              new MouseEvent(type, {
                bubbles: true,
                cancelable: true,
                button: 0,
              })
            )
          }
        } else {
          openFor[kind](true)
        }
      }, 0)
    }
  }
  const onPressRef = React.useRef({ onPressMove, onRelease })
  onPressRef.current = { onPressMove, onRelease }

  const onPress = (kind: PressKind) => (e: PressEvent) => {
    const s = self.current
    if (e.button !== 0) return
    // a press that never saw its release (the pointer lost off-window)
    // yields to the new one rather than wedging every grip
    if (s.press) endPress()
    const index =
      kind === "row"
        ? geoRef.current.rowIndex
        : kind === "col"
          ? geoRef.current.colIndex
          : -1
    if (kind === "row") selectRow(index)
    else if (kind === "col") selectCol(index)
    const el = e.currentTarget as HTMLElement
    s.press = {
      kind,
      index,
      x: e.clientX,
      y: e.clientY,
      lastX: e.clientX,
      lastY: e.clientY,
      el,
      pointerId: pressPointerId(e),
      // an open menu closes on this press, and a release in place leaves
      // it closed
      wasOpen: isOpenRef.current[kind],
      active: false,
      to: null,
    }
    const move = (ev: PointerEvent) => onPressRef.current.onPressMove(ev)
    const up = (ev: PointerEvent) => onPressRef.current.onRelease(ev)
    const cancel = (ev: PointerEvent) => {
      const held = self.current.press
      if (held && (held.pointerId === -1 || held.pointerId === ev.pointerId))
        endPress()
    }
    window.addEventListener("pointermove", move)
    window.addEventListener("pointerup", up)
    window.addEventListener("pointercancel", cancel)
    pressDetach.current = () => {
      window.removeEventListener("pointermove", move)
      window.removeEventListener("pointerup", up)
      window.removeEventListener("pointercancel", cancel)
    }
    e.preventDefault()
  }

  /* ---- the menus */
  const closeMenus = () => {
    setRowOpen(false)
    setColOpen(false)
    setCellOpen(false)
  }
  const colourMenu = (apply: (name: string | null) => void) => (
    <DropdownMenuSub>
      <DropdownMenuSubTrigger>
        <CellColorIcon className="size-4" />
        Colour
      </DropdownMenuSubTrigger>
      <DropdownMenuSubContent className="w-[220px] rounded-xl p-0">
        <div className="rte-tc-swatches" role="group" aria-label="Colour">
          <button
            type="button"
            className="rte-tc-swatch"
            title="Default"
            aria-label="Default"
            onClick={() => {
              apply(null)
              closeMenus()
            }}
          >
            A
          </button>
          {PALETTE.map((name) => (
            <button
              key={name}
              type="button"
              className="rte-tc-swatch"
              style={
                {
                  "--sw": `var(--color-${hue(name)}-50)`,
                  "--sw-dark": `var(--color-${hue(name)}-900)`,
                } as React.CSSProperties
              }
              title={name}
              aria-label={name}
              onClick={() => {
                apply(name)
                closeMenus()
              }}
            />
          ))}
        </div>
      </DropdownMenuSubContent>
    </DropdownMenuSub>
  )
  const item = (
    Icon: React.ComponentType<React.SVGProps<SVGSVGElement>>,
    label: string,
    run: () => void
  ) => (
    <DropdownMenuItem
      onClick={() => {
        run()
        closeMenus()
      }}
    >
      <Icon className="size-4" />
      {label}
    </DropdownMenuItem>
  )

  // the row menu opens 4px under its row, the column menu 4px under its grip
  const rowMenuOffset = (() => {
    const r = geo.rowBox
    if (!r) return 4
    const gripBottom = r.top + r.height / 2 + 10
    return Math.round(r.top + r.height - gripBottom + 4)
  })()

  if (!mounted) return null
  const { tableBox, rowBox, colBox, cellBox } = geo
  const menuCard = "w-[220px] rounded-xl shadow-elevation-xl"

  return createPortal(
    <div
      ref={layerRef}
      data-slot="rich-text-editor-table-controls"
      className="rte-tc pointer-events-none fixed inset-0 z-40"
      aria-hidden={false}
    >
      {/* the row handle, at the left edge of the caret's row */}
      {rowBox && tableBox && geo.selKind !== "col" && (
        <>
          <DropdownMenu open={rowOpen} onOpenChange={setRowOpen}>
            <DropdownMenuTrigger
              nativeButton={false}
              render={
                <span
                  ref={rowAnchorRef}
                  className="rte-tc-anchor"
                  style={{
                    left: px(tableBox.left - 4),
                    top: px(rowBox.top + rowBox.height / 2 - 10),
                    width: px(10),
                    height: px(20),
                  }}
                  aria-hidden="true"
                />
              }
            />
            <DropdownMenuContent
              side="bottom"
              align="start"
              sideOffset={rowMenuOffset}
              className={menuCard}
            >
              {geo.rowIndex === 0 && (
                <DropdownMenuItem
                  onClick={() => {
                    rowActions.toggleHeader()
                    closeMenus()
                  }}
                >
                  <HeaderRowIcon className="size-4" />
                  Table Header
                  <span
                    aria-hidden="true"
                    className={cn(
                      "ml-auto flex h-3.5 w-6 items-center rounded-full p-0.5 transition-colors",
                      geo.isHeaderRow ? "bg-primary" : "bg-muted"
                    )}
                  >
                    <span
                      className={cn(
                        "size-2.5 rounded-full bg-white transition-transform",
                        geo.isHeaderRow && "translate-x-2.5"
                      )}
                    />
                  </span>
                </DropdownMenuItem>
              )}
              {colourMenu(rowActions.colour)}
              {item(ArrowUpIcon, "Insert above", rowActions.insertAbove)}
              {item(ArrowDownIcon, "Insert below", rowActions.insertBelow)}
              {item(DuplicateIcon, "Duplicate", rowActions.duplicate)}
              {item(SmallCloseIcon, "Clear content", rowActions.clear)}
              {item(DeleteIcon, "Delete", rowActions.remove)}
            </DropdownMenuContent>
          </DropdownMenu>
          <button
            type="button"
            className={cn(
              "rte-tc-handle is-row",
              (rowOpen || dragKind === "row") && "is-open"
            )}
            style={{
              left: px(tableBox.left - 4),
              top: px(rowBox.top + rowBox.height / 2 - 10),
            }}
            aria-label="Row options"
            title="Row options"
            aria-haspopup="menu"
            aria-expanded={rowOpen}
            {...pressHandlers(onPress("row"))}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault()
                setRowOpen(true)
              }
            }}
          >
            <span className="rte-tc-pill" aria-hidden="true" />
            <span className="rte-tc-dots" aria-hidden="true" />
          </button>
          {/* the dash, drawn as a length of the table's own left rule: the
              same edge and the same 1px border, so the browser rounds it
              onto the same device pixels at any zoom */}
          <span
            className="rte-tc-edge is-row"
            style={{
              left: px(tableBox.left + (geo.ringLeft ? 1 : 0)),
              top: px(rowBox.top + rowBox.height / 2 - 7),
            }}
            aria-hidden="true"
          />
        </>
      )}

      {/* the column handle, at the top edge of the caret's column */}
      {colBox && geo.selKind !== "row" && (
        <>
          <DropdownMenu open={colOpen} onOpenChange={setColOpen}>
            <DropdownMenuTrigger
              nativeButton={false}
              render={
                <span
                  ref={colAnchorRef}
                  className="rte-tc-anchor"
                  style={{
                    left: px(colBox.left + colBox.width / 2 - 10),
                    top: px(colBox.top - 4),
                    width: px(20),
                    height: px(10),
                  }}
                  aria-hidden="true"
                />
              }
            />
            <DropdownMenuContent
              side="bottom"
              align="start"
              sideOffset={4}
              className={menuCard}
            >
              {colourMenu(colActions.colour)}
              {item(ArrowRightIcon, "Insert right", colActions.insertRight)}
              {item(ArrowLeftIcon, "Insert left", colActions.insertLeft)}
              {item(DuplicateIcon, "Duplicate", colActions.duplicate)}
              {item(SmallCloseIcon, "Clear content", colActions.clear)}
              {item(DeleteIcon, "Delete", colActions.remove)}
            </DropdownMenuContent>
          </DropdownMenu>
          <button
            type="button"
            className={cn(
              "rte-tc-handle is-col",
              (colOpen || dragKind === "col") && "is-open"
            )}
            style={{
              left: px(colBox.left + colBox.width / 2 - 10),
              top: px(colBox.top - 4),
            }}
            aria-label="Column options"
            title="Column options"
            aria-haspopup="menu"
            aria-expanded={colOpen}
            {...pressHandlers(onPress("col"))}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault()
                setColOpen(true)
              }
            }}
          >
            <span className="rte-tc-pill" aria-hidden="true" />
            <span className="rte-tc-dots" aria-hidden="true" />
          </button>
          {/* the dash, a length of the table's own top rule, as the row's */}
          {tableBox && (
            <span
              className="rte-tc-edge is-col"
              style={{
                left: px(colBox.left + colBox.width / 2 - 7),
                top: px(tableBox.top + (geo.ringTop ? 1 : 0)),
              }}
              aria-hidden="true"
            />
          )}
        </>
      )}

      {/* the cell handle, at the right edge of the selected run: its pill
          on the ring's right line */}
      {cellBox && geo.cellKnobOn && geo.selKind === "cells" && (
        <>
          <DropdownMenu open={cellOpen} onOpenChange={setCellOpen}>
            <DropdownMenuTrigger
              nativeButton={false}
              render={
                <span
                  ref={cellAnchorRef}
                  className="rte-tc-anchor"
                  style={{
                    left: px(cellBox.left + cellBox.width - 6),
                    top: px(cellBox.top + cellBox.height / 2 - 10),
                    width: px(10),
                    height: px(20),
                  }}
                  aria-hidden="true"
                />
              }
            />
            <DropdownMenuContent
              side="right"
              align="start"
              sideOffset={4}
              className={menuCard}
            >
              {colourMenu(cellActions.colour)}
              {geo.cellCount > 1 ? (
                <>
                  {item(CellMergeIcon, "Merge cells", cellActions.merge)}
                  {item(DeleteIcon, "Delete content", cellActions.clear)}
                </>
              ) : geo.cellMerged ? (
                item(CellMergeIcon, "Split cell", cellActions.split)
              ) : null}
            </DropdownMenuContent>
          </DropdownMenu>
          <button
            type="button"
            className={cn("rte-tc-handle is-row is-cell", cellOpen && "is-open")}
            style={{
              left: px(cellBox.left + cellBox.width - 6),
              top: px(cellBox.top + cellBox.height / 2 - 10),
            }}
            aria-label="Cell options"
            title="Cell options"
            aria-haspopup="menu"
            aria-expanded={cellOpen}
            {...pressHandlers(onPress("cell"))}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault()
                setCellOpen(true)
              }
            }}
          >
            <span className="rte-tc-pill" aria-hidden="true" />
            <span className="rte-tc-dots" aria-hidden="true" />
          </button>
        </>
      )}

      {/* the line a dragged row or column will land on */}
      {dragKind && dropLine && (
        <div
          className={cn("rte-tc-drop", dropOn && "is-on")}
          style={{
            left: px(dropLine.left),
            top: px(dropLine.top),
            width: px(dropLine.width),
            height: px(dropLine.height),
          }}
          aria-hidden="true"
        />
      )}

      {/* the add strips: a column at the right, a row beneath */}
      {tableBox && (
        <>
          <button
            type="button"
            className="rte-tc-strip"
            style={{
              left: px(tableBox.left + tableBox.width + 8),
              top: px(tableBox.top),
              width: px(16),
              height: px(tableBox.height),
            }}
            aria-label="Add column"
            title="Add column"
            onClick={addColumnAtEnd}
          >
            <Add12Icon className="size-3" />
          </button>
          <button
            type="button"
            className="rte-tc-strip"
            style={{
              left: px(tableBox.left),
              top: px(tableBox.top + tableBox.height + 8),
              width: px(tableBox.width),
              height: px(16),
            }}
            aria-label="Add row"
            title="Add row"
            onClick={addRowAtEnd}
          >
            <Add12Icon className="size-3" />
          </button>
        </>
      )}
    </div>,
    document.body
  )
}
