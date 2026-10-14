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
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { AddIcon } from "@/components/ui/rich-text-editor-icons"
import { hue, PALETTE, type View } from "./extensions"

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
  // a release that ends a drag is not a click: the menu stays shut
  const justDraggedRef = React.useRef(false)
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
    ghost: HTMLElement | null
    grab: { dx: number; dy: number }
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
  const setColour = (kind: "row" | "col", name: string | null) => {
    focusCell()
    const { state } = editor.view
    const table = state.doc.nodeAt(info.tablePos)
    if (!table) return
    const value = name ? `var(--color-${hue(name)}-100)` : null
    const tr = state.tr
    let rowPos = info.tablePos + 1
    table.forEach((row, _offset, i) => {
      let cellPos = rowPos + 1
      row.forEach((c, _o, j) => {
        if (
          (kind === "row" && i === rowIndex) ||
          (kind === "col" && j === colIndex)
        )
          tr.setNodeMarkup(cellPos, undefined, {
            ...c.attrs,
            backgroundColor: value,
          })
        cellPos += c.nodeSize
      })
      rowPos += row.nodeSize
    })
    editor.view.dispatch(tr)
    setMenuOpen(null)
  }
  const colourMenu = (kind: "row" | "col") => (
    <DropdownMenuSub>
      <DropdownMenuSubTrigger>Colour</DropdownMenuSubTrigger>
      <DropdownMenuSubContent>
        <DropdownMenuItem onClick={() => setColour(kind, null)}>
          <span className="size-3.5 rounded-sm border border-border-soft bg-background" />
          Default
        </DropdownMenuItem>
        {PALETTE.map((name) => (
          <DropdownMenuItem key={name} onClick={() => setColour(kind, name)}>
            <span
              className="size-3.5 rounded-sm border"
              style={{
                backgroundColor: `var(--color-${hue(name)}-100)`,
                borderColor: `var(--color-${hue(name)}-200)`,
              }}
            />
            {name.charAt(0).toUpperCase() + name.slice(1)}
          </DropdownMenuItem>
        ))}
      </DropdownMenuSubContent>
    </DropdownMenuSub>
  )
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
    // the press is ours alone: the menu opens on a clean click (release
    // without a drag), never on the way down
    event.preventDefault()
    event.stopPropagation()
    dragRef.current = {
      kind,
      index: kind === "row" ? rowIndex : colIndex,
      started: false,
      startX: event.clientX,
      startY: event.clientY,
      line: null,
      ghost: null,
      grab: { dx: 0, dy: 0 },
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
        // whatever menu the pointerdown opened steps aside: this press is
        // a drag
        setMenuOpen(null)
        // the landing line: 3px rounded gray-900, easing to each new edge
        const line = document.createElement("div")
        line.className =
          "pointer-events-none fixed z-75 rounded-full bg-border-stronger opacity-0"
        line.style.transition =
          "top 120ms cubic-bezier(0.2, 0, 0, 1), left 120ms cubic-bezier(0.2, 0, 0, 1), opacity 120ms"
        document.body.appendChild(line)
        d.line = line
        // the ghost: the row or column lifted onto the card's surface
        // under the lg shadow, following the pointer at the grab offset
        const ghost = document.createElement("div")
        ghost.className =
          "pointer-events-none fixed top-0 left-0 z-70 overflow-hidden rounded-md border border-border-soft bg-card opacity-0 shadow-elevation-lg transition-opacity duration-150 will-change-transform"
        const ghostTable = document.createElement("table")
        ghostTable.style.borderCollapse = "separate"
        ghostTable.style.borderSpacing = "0"
        ghostTable.style.margin = "0"
        const cloneCell = (cell: HTMLTableCellElement, last: boolean) => {
          const copy = cell.cloneNode(true) as HTMLTableCellElement
          const r = cell.getBoundingClientRect()
          const cs = getComputedStyle(cell)
          copy.style.width = `${r.width}px`
          copy.style.height = `${r.height}px`
          copy.style.border = "0"
          if (!last)
            copy.style[d.kind === "row" ? "borderRight" : "borderBottom"] =
              "1px solid var(--border-soft)"
          copy.style.padding = cs.padding
          copy.style.fontFamily = cs.fontFamily
          copy.style.fontSize = cs.fontSize
          copy.style.fontWeight = cs.fontWeight
          copy.style.lineHeight = cs.lineHeight
          copy.style.color = cs.color
          copy.style.textAlign = cs.textAlign
          copy.style.verticalAlign = cs.verticalAlign
          copy.style.backgroundColor = "transparent"
          // the inner paragraphs lose the document's styles outside the
          // editor: carry each one's own type with it
          const sourceParagraphs = cell.querySelectorAll("p")
          copy.querySelectorAll("p").forEach((paragraph, i) => {
            const source = sourceParagraphs[i]
            if (!source) return
            const ps = getComputedStyle(source)
            paragraph.style.fontFamily = ps.fontFamily
            paragraph.style.fontSize = ps.fontSize
            paragraph.style.fontWeight = ps.fontWeight
            paragraph.style.lineHeight = ps.lineHeight
            paragraph.style.color = ps.color
            paragraph.style.margin = "0"
          })
          return copy
        }
        if (d.kind === "row") {
          const sourceRow = tableEl.rows[d.index]
          const rr = sourceRow.getBoundingClientRect()
          const tr = document.createElement("tr")
          const cells = [...sourceRow.cells]
          cells.forEach((cell, i) =>
            tr.appendChild(cloneCell(cell, i === cells.length - 1))
          )
          ghostTable.appendChild(tr)
          d.grab = { dx: d.startX - rr.left, dy: d.startY - rr.top }
        } else {
          const rows = [...tableEl.rows]
          rows.forEach((row, i) => {
            const cell = row.cells[d.index]
            if (!cell) return
            const tr = document.createElement("tr")
            tr.appendChild(cloneCell(cell, i === rows.length - 1))
            ghostTable.appendChild(tr)
          })
          const cr = tableEl.rows[0].cells[d.index].getBoundingClientRect()
          d.grab = {
            dx: d.startX - cr.left,
            dy: d.startY - tableEl.getBoundingClientRect().top,
          }
        }
        ghost.appendChild(ghostTable)
        document.body.appendChild(ghost)
        requestAnimationFrame(() => {
          ghost.classList.remove("opacity-0")
          ghost.classList.add("opacity-85")
        })
        d.ghost = ghost
        document.body.classList.add("select-none!", "cursor-grabbing!")
      }
      if (d.ghost)
        d.ghost.style.transform = `translate(${m.clientX - d.grab.dx}px, ${
          m.clientY - d.grab.dy
        }px)`
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
          d.line.style.opacity = "1"
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
          d.line.style.opacity = "1"
        }
      }
    }
    const onPointerUp = (up: PointerEvent) => {
      const d = dragRef.current
      dragRef.current = null
      document.removeEventListener("pointermove", onPointerMove)
      document.removeEventListener("pointerup", onPointerUp)
      document.body.classList.remove("select-none!", "cursor-grabbing!")
      if (!d) return
      d.line?.remove()
      d.ghost?.remove()
      if (!d.started) {
        // a clean click: the menu opens here
        setMenuOpen(kind)
        return
      }
      justDraggedRef.current = true
      setTimeout(() => {
        justDraggedRef.current = false
      }, 0)
      // the move rebuilds the table's DOM: whatever menu the pointerdown
      // opened closes, and the cell under the pointer is read afresh so
      // the grips come straight back
      setMenuOpen(null)
      setTimeout(() => {
        const el =
          (document
            .elementFromPoint(up.clientX, up.clientY)
            ?.closest("td, th") as HTMLElement | null) ?? null
        cellRef.current = el
        setCell(el)
      }, 0)
      // a drop past the source means one slot less once it leaves
      let to = d.target
      if (to > d.index) to -= 1
      const tr =
        d.kind === "row"
          ? moveRowTr(editor.view.state, info.tablePos, d.index, to)
          : moveColumnTr(editor.view.state, info.tablePos, d.index, to)
      // dispatched as is: a scroll-into-view here would carry the page
      // off to wherever the caret last was
      if (tr) editor.view.dispatch(tr)
    }
    document.addEventListener("pointermove", onPointerMove)
    document.addEventListener("pointerup", onPointerUp)
  }

  const gripClass =
    "group pointer-events-auto fixed z-56 cursor-grab rounded-[4px] border border-transparent transition-colors hover:bg-border-strong data-popup-open:bg-border-strong active:cursor-grabbing"
  const dashClass =
    "absolute rounded-full bg-foreground shadow-[0_0_0_2px_var(--background)] group-hover:hidden group-data-popup-open:hidden"
  const dotsClass =
    "absolute -inset-px hidden group-hover:block group-data-popup-open:block"
  const ROW_DOTS =
    "radial-gradient(circle at 5px 5px, #fff 1.5px, transparent 1.75px), radial-gradient(circle at 5px 10px, #fff 1.5px, transparent 1.75px), radial-gradient(circle at 5px 15px, #fff 1.5px, transparent 1.75px)"
  const COL_DOTS =
    "radial-gradient(circle at 5px 5px, #fff 1.5px, transparent 1.75px), radial-gradient(circle at 10px 5px, #fff 1.5px, transparent 1.75px), radial-gradient(circle at 15px 5px, #fff 1.5px, transparent 1.75px)"

  return createPortal(
    <div
      ref={layerRef}
      data-slot="rich-text-editor-table-controls"
      className="pointer-events-none fixed inset-0 z-55"
    >
      {/* the row's grip, at the left edge of the row */}
      <DropdownMenu
        open={menuOpen === "row"}
        onOpenChange={(open) => {
          if (open && (justDraggedRef.current || dragRef.current?.started))
            return
          setMenuOpen(open ? "row" : null)
        }}
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
              className={cn(gripClass, "h-5 w-[10px]")}
            >
              <span
                aria-hidden="true"
                className={dashClass}
                style={{ left: 3, top: 2, width: 1, height: 14 }}
              />
              <span
                aria-hidden="true"
                className={dotsClass}
                style={{ backgroundImage: ROW_DOTS }}
              />
            </button>
          }
        />
        <DropdownMenuContent align="start" sideOffset={4} className="w-[220px]">
          {rowIndex === 0 && (
            <DropdownMenuItem onClick={() => run((c) => c.toggleHeaderRow())}>
              Header row
            </DropdownMenuItem>
          )}
          {colourMenu("row")}
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
        onOpenChange={(open) => {
          if (open && (justDraggedRef.current || dragRef.current?.started))
            return
          setMenuOpen(open ? "col" : null)
        }}
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
              className={cn(gripClass, "h-[10px] w-5")}
            >
              <span
                aria-hidden="true"
                className={dashClass}
                style={{ left: 2, top: 3, width: 14, height: 1 }}
              />
              <span
                aria-hidden="true"
                className={dotsClass}
                style={{ backgroundImage: COL_DOTS }}
              />
            </button>
          }
        />
        <DropdownMenuContent align="start" sideOffset={4} className="w-[220px]">
          {colourMenu("col")}
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
        className="pointer-events-auto fixed z-56 flex w-4 items-center justify-center text-card-foreground transition-colors hover:text-secondary-foreground"
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
        className="pointer-events-auto fixed z-56 flex h-4 items-center justify-center text-card-foreground transition-colors hover:text-secondary-foreground"
      >
        <AddIcon className="size-3.5" />
      </button>
    </div>,
    document.body
  )
}


