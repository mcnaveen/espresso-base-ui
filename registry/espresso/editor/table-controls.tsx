"use client"

// The table's controls, ported from the branch's RteTableControls: row and
// column grips on the cell under the pointer that open a menu or, dragged,
// carry their row or column under a drop line; and two strips off the
// table's edges that add a column or a row at the end.
import * as React from "react"
import { createPortal } from "react-dom"
import type { ChainedCommands, Editor as TiptapEditor } from "@tiptap/core"
import { TextSelection } from "@tiptap/pm/state"

import { cn } from "@/lib/utils"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { AddIcon, DragIcon } from "@/components/ui/rich-text-editor-icons"
import { type View } from "./extensions"

function tableInfoOf(view: View, cellEl: HTMLElement) {
  let p: number
  try {
    p = view.posAtDOM(cellEl, 0)
  } catch {
    return null
  }
  const $p = view.state.doc.resolve(p)
  for (let d = $p.depth; d > 0; d--) {
    if ($p.node(d).type.name === "table") {
      return { tablePos: $p.before(d), table: $p.node(d) }
    }
  }
  return null
}

/** simple tables only: a merged cell makes index arithmetic lie */
function hasMergedCells(table: import("@tiptap/pm/model").Node) {
  let merged = false
  table.descendants((n) => {
    if (
      (n.type.name === "tableCell" || n.type.name === "tableHeader") &&
      (n.attrs.colspan > 1 || n.attrs.rowspan > 1)
    )
      merged = true
    return !merged
  })
  return merged
}

function moveRowTr(
  state: View["state"],
  tablePos: number,
  from: number,
  to: number
) {
  const table = state.doc.nodeAt(tablePos)
  if (!table || from === to) return null
  const rows: import("@tiptap/pm/model").Node[] = []
  table.forEach((r) => rows.push(r))
  if (from < 0 || from >= rows.length || to < 0 || to >= rows.length)
    return null
  const [moved] = rows.splice(from, 1)
  rows.splice(to, 0, moved)
  // the first row stays a header row, whichever row lands there
  const th = state.schema.nodes.tableHeader
  const td = state.schema.nodes.tableCell
  const hasHeader = table.child(0).child(0).type === th
  const fixed = rows.map((row, i) => {
    const want = hasHeader && i === 0 ? th : td
    let changed = false
    const cells: import("@tiptap/pm/model").Node[] = []
    row.forEach((c) => {
      if (c.type !== want) {
        changed = true
        cells.push(want.create(c.attrs, c.content, c.marks))
      } else cells.push(c)
    })
    return changed ? row.type.create(row.attrs, cells) : row
  })
  const next = table.type.create(table.attrs, fixed)
  return state.tr.replaceWith(tablePos, tablePos + table.nodeSize, next)
}

function moveColumnTr(
  state: View["state"],
  tablePos: number,
  from: number,
  to: number
) {
  const table = state.doc.nodeAt(tablePos)
  if (!table || from === to || hasMergedCells(table)) return null
  const rows: import("@tiptap/pm/model").Node[] = []
  let ok = true
  table.forEach((row) => {
    const cells: import("@tiptap/pm/model").Node[] = []
    row.forEach((c) => cells.push(c))
    if (from >= cells.length || to >= cells.length) {
      ok = false
      return
    }
    const [moved] = cells.splice(from, 1)
    cells.splice(to, 0, moved)
    rows.push(row.type.create(row.attrs, cells))
  })
  if (!ok) return null
  const next = table.type.create(table.attrs, rows)
  return state.tr.replaceWith(tablePos, tablePos + table.nodeSize, next)
}

export function TableControls({ editor }: { editor: TiptapEditor }) {
  const [cell, setCell] = React.useState<HTMLElement | null>(null)
  const [menuOpen, setMenuOpen] = React.useState<"row" | "col" | null>(null)
  const [, bump] = React.useReducer((n: number) => n + 1, 0)
  const layerRef = React.useRef<HTMLDivElement>(null)
  const cellRef = React.useRef<HTMLElement | null>(null)
  const dragRef = React.useRef<{
    kind: "row" | "col"
    index: number
    started: boolean
    startX: number
    startY: number
    line: HTMLElement | null
    target: number
  } | null>(null)
  const [mounted, setMounted] = React.useState(false)
  React.useEffect(() => setMounted(true), [])

  React.useEffect(() => {
    const onMove = (event: MouseEvent) => {
      if (dragRef.current || menuOpen) return
      const t = event.target instanceof Element ? event.target : null
      if (t && layerRef.current?.contains(t)) return
      const el =
        t && editor.view.dom.contains(t)
          ? (t.closest("td, th") as HTMLElement | null)
          : null
      // off the cells but still beside the table: the grips and the add
      // strips live just outside its edges, and the pointer must be able
      // to reach them without the controls vanishing underneath it
      if (!el && cellRef.current) {
        const table = cellRef.current.closest("table")
        if (table) {
          const r = table.getBoundingClientRect()
          if (
            event.clientX >= r.left - 32 &&
            event.clientX <= r.right + 32 &&
            event.clientY >= r.top - 32 &&
            event.clientY <= r.bottom + 32
          )
            return
        }
      }
      if (el !== cellRef.current) {
        cellRef.current = el
        setCell(el)
      }
    }
    const settle = () => bump()
    editor.on("transaction", settle)
    document.addEventListener("mousemove", onMove, true)
    document.addEventListener("scroll", settle, true)
    window.addEventListener("resize", settle)
    return () => {
      editor.off("transaction", settle)
      document.removeEventListener("mousemove", onMove, true)
      document.removeEventListener("scroll", settle, true)
      window.removeEventListener("resize", settle)
    }
  }, [editor, menuOpen])

  if (!mounted) return null
  const live = cell && cell.isConnected ? cell : null
  if (!live) return null
  const rowEl = live.closest("tr")
  const tableEl = live.closest("table")
  if (!rowEl || !tableEl) return null
  const rowIndex = (rowEl as HTMLTableRowElement).rowIndex
  const colIndex = (live as HTMLTableCellElement).cellIndex
  const info = tableInfoOf(editor.view, live)
  if (!info) return null
  const cellRect = live.getBoundingClientRect()
  const rowRect = rowEl.getBoundingClientRect()
  const tableRect = tableEl.getBoundingClientRect()
  const rowCount = tableEl.rows.length
  const colCount = tableEl.rows[0]?.cells.length ?? 0

  const focusCell = () => {
    const pos = (() => {
      try {
        const p = editor.view.posAtDOM(live, 0)
        return p
      } catch {
        return null
      }
    })()
    if (pos !== null) {
      const tr = editor.view.state.tr.setSelection(
        TextSelection.near(editor.view.state.doc.resolve(pos))
      )
      editor.view.dispatch(tr)
    }
    editor.view.focus()
  }
  const run = (fn: (chain: ChainedCommands) => ChainedCommands) => {
    focusCell()
    fn(editor.chain().focus()).run()
    setMenuOpen(null)
  }
  const duplicate = (kind: "row" | "col") => {
    focusCell()
    const { state } = editor.view
    const table = state.doc.nodeAt(info.tablePos)
    if (!table) return
    if (kind === "row") {
      // the copy lands under its row, never as a second header
      let pos = info.tablePos + 1
      const rows: import("@tiptap/pm/model").Node[] = []
      table.forEach((r) => rows.push(r))
      for (let i = 0; i < rowIndex; i++) pos += rows[i].nodeSize
      const row = rows[rowIndex]
      const td = state.schema.nodes.tableCell
      const cells: import("@tiptap/pm/model").Node[] = []
      row.forEach((c) =>
        cells.push(
          c.type === td ? c : td.create(c.attrs, c.content, c.marks)
        )
      )
      editor.view.dispatch(
        state.tr.insert(pos + row.nodeSize, row.type.create(row.attrs, cells))
      )
    } else {
      if (hasMergedCells(table)) return
      const rows: import("@tiptap/pm/model").Node[] = []
      table.forEach((row) => {
        const cells: import("@tiptap/pm/model").Node[] = []
        row.forEach((c) => cells.push(c))
        cells.splice(colIndex + 1, 0, cells[colIndex])
        rows.push(row.type.create(row.attrs, cells))
      })
      const next = table.type.create(table.attrs, rows)
      editor.view.dispatch(
        state.tr.replaceWith(
          info.tablePos,
          info.tablePos + table.nodeSize,
          next
        )
      )
    }
    setMenuOpen(null)
  }
  const clearContent = (kind: "row" | "col") => {
    focusCell()
    const { state } = editor.view
    const table = state.doc.nodeAt(info.tablePos)
    if (!table) return
    const paragraph = state.schema.nodes.paragraph
    const tr = state.tr
    const edits: { from: number; to: number }[] = []
    let rowPos = info.tablePos + 1
    table.forEach((row, _offset, i) => {
      let cellPos = rowPos + 1
      row.forEach((c, _o, j) => {
        if ((kind === "row" && i === rowIndex) || (kind === "col" && j === colIndex))
          edits.push({ from: cellPos + 1, to: cellPos + c.nodeSize - 1 })
        cellPos += c.nodeSize
      })
      rowPos += row.nodeSize
    })
    for (const e of edits.reverse())
      tr.replaceWith(e.from, e.to, paragraph.create())
    editor.view.dispatch(tr)
    setMenuOpen(null)
  }

  // ---- a grip dragged carries its row or column
  const startDrag = (kind: "row" | "col") => (event: React.PointerEvent) => {
    if (event.button !== 0) return
    dragRef.current = {
      kind,
      index: kind === "row" ? rowIndex : colIndex,
      started: false,
      startX: event.clientX,
      startY: event.clientY,
      line: null,
      target: kind === "row" ? rowIndex : colIndex,
    }
    const onPointerMove = (m: PointerEvent) => {
      const d = dragRef.current
      if (!d) return
      if (
        !d.started &&
        Math.hypot(m.clientX - d.startX, m.clientY - d.startY) < 4
      )
        return
      if (!d.started) {
        d.started = true
        const line = document.createElement("div")
        line.className =
          "pointer-events-none fixed z-65 rounded-full bg-border-stronger"
        document.body.appendChild(line)
        d.line = line
        document.body.classList.add("select-none!")
      }
      const rect = tableEl.getBoundingClientRect()
      if (d.kind === "row") {
        const rows = [...tableEl.rows]
        let target = rows.length - 1
        let edge = rows[rows.length - 1].getBoundingClientRect().bottom
        for (let i = 0; i < rows.length; i++) {
          const r = rows[i].getBoundingClientRect()
          if (m.clientY < r.top + r.height / 2) {
            target = i
            edge = r.top
            break
          }
        }
        d.target = target
        if (d.line) {
          d.line.style.left = `${rect.left}px`
          d.line.style.width = `${rect.width}px`
          d.line.style.height = "3px"
          d.line.style.top = `${edge - 1.5}px`
        }
      } else {
        const cells = [...tableEl.rows[0].cells]
        let target = cells.length - 1
        let edge = cells[cells.length - 1].getBoundingClientRect().right
        for (let i = 0; i < cells.length; i++) {
          const r = cells[i].getBoundingClientRect()
          if (m.clientX < r.left + r.width / 2) {
            target = i
            edge = r.left
            break
          }
        }
        d.target = target
        if (d.line) {
          d.line.style.top = `${rect.top}px`
          d.line.style.height = `${rect.height}px`
          d.line.style.width = "3px"
          d.line.style.left = `${edge - 1.5}px`
        }
      }
    }
    const onPointerUp = () => {
      const d = dragRef.current
      dragRef.current = null
      document.removeEventListener("pointermove", onPointerMove)
      document.removeEventListener("pointerup", onPointerUp)
      document.body.classList.remove("select-none!")
      if (!d) return
      d.line?.remove()
      if (!d.started) return
      // a drop past the source means one slot less once it leaves
      let to = d.target
      if (to > d.index) to -= 1
      const tr =
        d.kind === "row"
          ? moveRowTr(editor.view.state, info.tablePos, d.index, to)
          : moveColumnTr(editor.view.state, info.tablePos, d.index, to)
      if (tr) {
        editor.view.dispatch(tr.scrollIntoView())
        editor.view.focus()
      }
    }
    document.addEventListener("pointermove", onPointerMove)
    document.addEventListener("pointerup", onPointerUp)
  }

  const gripClass =
    "pointer-events-auto fixed z-56 flex items-center justify-center rounded-full border border-background bg-border-normal text-background opacity-90 transition-colors hover:bg-border-strong data-popup-open:bg-border-strong"

  return createPortal(
    <div
      ref={layerRef}
      data-slot="rich-text-editor-table-controls"
      className="pointer-events-none fixed inset-0 z-55"
    >
      {/* the row's grip, at the left edge of the row */}
      <DropdownMenu
        open={menuOpen === "row"}
        onOpenChange={(open) => setMenuOpen(open ? "row" : null)}
      >
        <DropdownMenuTrigger
          render={
            <button
              type="button"
              aria-label="Row options"
              onPointerDown={startDrag("row")}
              style={{
                left: rowRect.left - 5,
                top: rowRect.top + rowRect.height / 2 - 10,
              }}
              className={cn(gripClass, "h-5 w-2.5 cursor-grab active:cursor-grabbing")}
            >
              <DragIcon className="size-3" />
            </button>
          }
        />
        <DropdownMenuContent align="start" sideOffset={4}>
          {rowIndex === 0 && (
            <DropdownMenuItem onClick={() => run((c) => c.toggleHeaderRow())}>
              Header row
            </DropdownMenuItem>
          )}
          <DropdownMenuItem onClick={() => run((c) => c.addRowBefore())}>
            Insert above
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => run((c) => c.addRowAfter())}>
            Insert below
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => duplicate("row")}>
            Duplicate
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => clearContent("row")}>
            Clear content
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={() => run((c) => c.deleteRow())}>
            Delete row
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* the column's grip, at the top edge of the column */}
      <DropdownMenu
        open={menuOpen === "col"}
        onOpenChange={(open) => setMenuOpen(open ? "col" : null)}
      >
        <DropdownMenuTrigger
          render={
            <button
              type="button"
              aria-label="Column options"
              onPointerDown={startDrag("col")}
              style={{
                left: cellRect.left + cellRect.width / 2 - 10,
                top: tableRect.top - 5,
              }}
              className={cn(gripClass, "h-2.5 w-5 cursor-grab active:cursor-grabbing")}
            >
              <DragIcon className="size-3 rotate-90" />
            </button>
          }
        />
        <DropdownMenuContent align="start" sideOffset={4}>
          <DropdownMenuItem onClick={() => run((c) => c.addColumnBefore())}>
            Insert left
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => run((c) => c.addColumnAfter())}>
            Insert right
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => duplicate("col")}>
            Duplicate
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => clearContent("col")}>
            Clear content
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={() => run((c) => c.deleteColumn())}>
            Delete column
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* the strips off the table's right and bottom edges add a column or
          a row at the end */}
      <button
        type="button"
        aria-label="Add column"
        onClick={() => {
          const last = tableEl.rows[Math.min(rowIndex, rowCount - 1)]
            ?.cells[colCount - 1]
          if (last) {
            cellRef.current = last as HTMLElement
            setCell(last as HTMLElement)
          }
          const pos = last ? editor.view.posAtDOM(last, 0) : null
          if (pos !== null) {
            editor.view.dispatch(
              editor.view.state.tr.setSelection(
                TextSelection.near(editor.view.state.doc.resolve(pos))
              )
            )
            editor.chain().focus().addColumnAfter().run()
          }
        }}
        style={{
          left: tableRect.right + 6,
          top: tableRect.top,
          height: tableRect.height,
        }}
        className="pointer-events-auto fixed z-56 flex w-4 items-center justify-center rounded-md text-muted-foreground opacity-0 transition-opacity hover:bg-secondary hover:opacity-100 [[data-slot=rich-text-editor-table-controls]:hover_&]:opacity-60"
      >
        <AddIcon className="size-3.5" />
      </button>
      <button
        type="button"
        aria-label="Add row"
        onClick={() => {
          const last = tableEl.rows[rowCount - 1]?.cells[0]
          const pos = last ? editor.view.posAtDOM(last, 0) : null
          if (pos !== null) {
            editor.view.dispatch(
              editor.view.state.tr.setSelection(
                TextSelection.near(editor.view.state.doc.resolve(pos))
              )
            )
            editor.chain().focus().addRowAfter().run()
          }
        }}
        style={{
          left: tableRect.left,
          top: tableRect.bottom + 6,
          width: tableRect.width,
        }}
        className="pointer-events-auto fixed z-56 flex h-4 items-center justify-center rounded-md text-muted-foreground opacity-0 transition-opacity hover:bg-secondary hover:opacity-100 [[data-slot=rich-text-editor-table-controls]:hover_&]:opacity-60"
      >
        <AddIcon className="size-3.5" />
      </button>
    </div>,
    document.body
  )
}


