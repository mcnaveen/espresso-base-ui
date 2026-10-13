"use client"

// The editor molecule's extensions, after frappe-ui's src/molecules/editor:
// the palette, the document's own nodes (callout, audio, embed, columns,
// attachment), the "@" and "/" suggestion machinery, and the block/font
// tables the toolbars read. One source, so the field editor and the
// document editor never drift apart.
import * as React from "react"
import {
  Extension,
  mergeAttributes,
  Node,
  type ChainedCommands,
  type Editor as TiptapEditor,
} from "@tiptap/core"
import { Plugin, PluginKey, TextSelection } from "@tiptap/pm/state"
import { ReactRenderer } from "@tiptap/react"
import Suggestion, { type SuggestionProps } from "@tiptap/suggestion"

import { cn } from "@/lib/utils"
import {
  CodeIcon,
  DividerIcon,
  Grid2Icon,
  Grid3Icon,
  Grid4Icon,
  Heading1Icon,
  Heading2Icon,
  Heading3Icon,
  Heading4Icon,
  Heading5Icon,
  Heading6Icon,
  MultipleListIcon,
  NumberedListIcon,
  ParagraphIcon,
  QuoteIcon,
  TableViewIcon,
  TodoIcon,
} from "@/components/ui/rich-text-editor-icons"

export type View = TiptapEditor["view"]

/* ---------------------------------- limit -----------------------------------
 * A change that would carry the text past the limit is refused, and the
 * field's foot counts down what is left.
 */
export const Limit = Extension.create<{ limit: number }>({
  name: "editorLimit",
  addOptions: () => ({ limit: 450 }),
  addProseMirrorPlugins() {
    const { limit } = this.options
    return [
      new Plugin({
        filterTransaction: (tr, state) =>
          !tr.docChanged ||
          tr.doc.textContent.length <= limit ||
          tr.doc.textContent.length <= state.doc.textContent.length,
      }),
    ]
  },
})

/* --------------------------------- palette --------------------------------- */

export const PALETTE = [
  "red",
  "orange",
  "yellow",
  "green",
  "teal",
  "cyan",
  "blue",
  "indigo",
  "purple",
  "pink",
  "gray",
] as const
export const hue = (name: string) => (name === "indigo" ? "violet" : name)
export const textValue = (name: string) => `var(--color-${hue(name)}-600)`
export const highlightValue = (name: string) => `var(--color-${hue(name)}-100)`



/* ---------------------------- callout, audio, embed ------------------------ */

// a callout: gray wash, 12px in, the emoji leading its first line
export const Callout = Node.create({
  name: "callout",
  group: "block",
  content: "block+",
  defining: true,
  addAttributes() {
    return {
      emoji: {
        default: "\u{1F4A1}",
        parseHTML: (el) => el.getAttribute("data-emoji") ?? "\u{1F4A1}",
        renderHTML: (attrs) => ({ "data-emoji": attrs.emoji }),
      },
    }
  },
  parseHTML: () => [{ tag: 'div[data-type="callout"]' }],
  renderHTML: ({ HTMLAttributes }) => [
    "div",
    mergeAttributes(HTMLAttributes, { "data-type": "callout" }),
    0,
  ],
})

// the audio bar, as a plain player for the carried file
export const Audio = Node.create({
  name: "audio",
  group: "block",
  atom: true,
  draggable: true,
  addAttributes() {
    return {
      src: { default: null },
      title: { default: null },
    }
  },
  parseHTML: () => [{ tag: "audio[src]" }],
  renderHTML: ({ HTMLAttributes }) => [
    "audio",
    mergeAttributes(HTMLAttributes, { controls: "true" }),
  ],
})

// an embed: any page in a frame
export const Embed = Node.create({
  name: "embed",
  group: "block",
  atom: true,
  draggable: true,
  addAttributes() {
    return { src: { default: null } }
  },
  parseHTML: () => [{ tag: 'div[data-type="embed"]' }],
  renderHTML: ({ node, HTMLAttributes }) => [
    "div",
    mergeAttributes(HTMLAttributes, { "data-type": "embed" }),
    [
      "iframe",
      {
        src: node.attrs.src,
        allowfullscreen: "true",
        loading: "lazy",
      },
    ],
  ],
})

/* ------------------------- mentions and slash commands ---------------------
 * The "@" list offers the branch's people, each with the face the file
 * gives them; "/" offers every block the editor can insert. Both ride the
 * same popup.
 */
export const PEOPLE = [
  { id: "faris", label: "Faris" },
  { id: "gowtham", label: "Gowtham" },
  { id: "harsha", label: "Harsha" },
  { id: "jayaprakash", label: "Jayaprakash" },
  { id: "sandeep", label: "Sandeep" },
  { id: "shruti", label: "Shruti" },
].map((person) => ({
  ...person,
  image: `/images/rte-people/avatar-${person.id}.png`,
}))

export type SuggestItem = {
  id: string
  label: string
  image?: string
  icon?: React.ReactNode
  run?: (editor: TiptapEditor) => void
}

export type SuggestionListHandle = {
  onKeyDown: (props: { event: KeyboardEvent }) => boolean
}

export const SuggestionList = React.forwardRef<
  SuggestionListHandle,
  { items: SuggestItem[]; command: (item: SuggestItem) => void }
>(function SuggestionList({ items, command }, ref) {
  const [index, setIndex] = React.useState(0)
  React.useEffect(() => setIndex(0), [items])
  React.useImperativeHandle(
    ref,
    () => ({
      onKeyDown: ({ event }) => {
        if (event.key === "ArrowDown") {
          setIndex((i) => (i + 1) % Math.max(1, items.length))
          return true
        }
        if (event.key === "ArrowUp") {
          setIndex(
            (i) => (i - 1 + Math.max(1, items.length)) % Math.max(1, items.length)
          )
          return true
        }
        if (event.key === "Enter") {
          const item = items[index]
          if (item) command(item)
          return true
        }
        return false
      },
    }),
    [items, index, command]
  )
  if (!items.length) return null
  return (
    <div
      data-slot="rich-text-editor-suggestions"
      className="flex max-h-72 w-56 flex-col gap-0.5 overflow-y-auto rounded-xl border border-border-soft bg-card p-1 shadow-elevation-lg"
    >
      {items.map((item, i) => (
        <button
          key={item.id}
          type="button"
          onMouseEnter={() => setIndex(i)}
          onMouseDown={(event) => event.preventDefault()}
          onClick={() => command(item)}
          className={cn(
            "flex items-center gap-2 rounded-lg px-2 py-1.5 text-left text-base text-secondary-foreground",
            i === index && "bg-secondary"
          )}
        >
          {item.image ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={item.image}
              alt=""
              className="size-5 shrink-0 rounded-full object-cover"
            />
          ) : (
            item.icon
          )}
          <span className="truncate">{item.label}</span>
        </button>
      ))}
    </div>
  )
})

/** the popup both lists ride: a fixed layer under the caret */
export function suggestionPopup() {
  let component: ReactRenderer<SuggestionListHandle> | null = null
  let host: HTMLDivElement | null = null
  const place = (props: SuggestionProps<SuggestItem>) => {
    const rect = props.clientRect?.()
    if (!rect || !host) return
    host.style.left = `${rect.left}px`
    host.style.top = `${rect.bottom + 6}px`
  }
  return {
    onStart: (props: SuggestionProps<SuggestItem>) => {
      component = new ReactRenderer(SuggestionList, {
        props,
        editor: props.editor,
      })
      host = document.createElement("div")
      host.className = "fixed z-70"
      host.appendChild(component.element)
      document.body.appendChild(host)
      place(props)
    },
    onUpdate: (props: SuggestionProps<SuggestItem>) => {
      component?.updateProps(props)
      place(props)
    },
    onKeyDown: (props: { event: KeyboardEvent }) => {
      if (props.event.key === "Escape") {
        host?.remove()
        component?.destroy()
        component = null
        host = null
        return true
      }
      return component?.ref?.onKeyDown(props) ?? false
    },
    onExit: () => {
      host?.remove()
      component?.destroy()
      component = null
      host = null
    },
  }
}

export const SLASH_ITEMS: SuggestItem[] = [
  { id: "table", label: "Table", icon: <TableViewIcon className="size-4" />, run: (ed) => ed.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run() },
  { id: "quote", label: "Quote", icon: <QuoteIcon className="size-4" />, run: (ed) => ed.chain().focus().toggleBlockquote().run() },
  { id: "code", label: "Code block", icon: <CodeIcon className="size-4" />, run: (ed) => ed.chain().focus().toggleCodeBlock().run() },
  { id: "divider", label: "Divider", icon: <DividerIcon className="size-4" />, run: (ed) => ed.chain().focus().setHorizontalRule().run() },
  { id: "todo", label: "To-do list", icon: <TodoIcon className="size-4" />, run: (ed) => ed.chain().focus().toggleTaskList().run() },
  { id: "callout", label: "Callout", icon: <QuoteIcon className="size-4" />, run: (ed) => ed.chain().focus().insertContent({ type: "callout", content: [{ type: "paragraph" }] }).run() },
  { id: "details", label: "Expand / collapse", icon: <Grid2Icon className="size-4" />, run: (ed) => ed.chain().focus().setDetails().run() },
  { id: "columns2", label: "2 columns", icon: <Grid2Icon className="size-4" />, run: (ed) => ed.chain().focus().insertColumns(2).run() },
  { id: "columns3", label: "3 columns", icon: <Grid3Icon className="size-4" />, run: (ed) => ed.chain().focus().insertColumns(3).run() },
]

export const SlashCommands = Extension.create({
  name: "slashCommands",
  addProseMirrorPlugins() {
    return [
      Suggestion<SuggestItem>({
        editor: this.editor,
        char: "/",
        pluginKey: new PluginKey("slashCommands"),
        items: ({ query }) =>
          SLASH_ITEMS.filter((item) =>
            item.label.toLowerCase().includes(query.toLowerCase())
          ),
        command: ({ editor, range, props }) => {
          editor.chain().focus().deleteRange(range).run()
          props.run?.(editor)
        },
        render: suggestionPopup,
      }),
    ]
  },
})

/* ---------------------------------- columns --------------------------------
 * Two to four blocks side by side, each a column of blocks — the branch's
 * multi-column layout. `setColumns` re-counts the row the selection is in
 * (columns added empty, or the extra ones folded into the last kept), or
 * lays a fresh row.
 */
declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    columns: {
      insertColumns: (count?: number) => ReturnType
      setColumns: (count?: number) => ReturnType
    }
  }
}

export const Column = Node.create({
  name: "column",
  content: "block+",
  isolating: true,
  parseHTML: () => [{ tag: 'div[data-type="column"]' }],
  renderHTML: ({ HTMLAttributes }) => [
    "div",
    mergeAttributes(HTMLAttributes, { "data-type": "column" }),
    0,
  ],
})

export const Columns = Node.create({
  name: "columns",
  group: "block",
  content: "column{2,4}",
  defining: true,
  addAttributes() {
    return {
      count: {
        default: 2,
        parseHTML: (el) => Number(el.getAttribute("data-count") ?? 2),
        renderHTML: (attrs) => ({ "data-count": attrs.count }),
      },
    }
  },
  parseHTML: () => [{ tag: 'div[data-type="columns"]' }],
  renderHTML: ({ HTMLAttributes }) => [
    "div",
    mergeAttributes(HTMLAttributes, { "data-type": "columns" }),
    0,
  ],
  addCommands() {
    return {
      insertColumns:
        (count = 2) =>
        ({ commands }) =>
          commands.insertContent({
            type: this.name,
            attrs: { count },
            content: Array.from({ length: count }, () => ({
              type: "column",
              content: [{ type: "paragraph" }],
            })),
          }),
      setColumns:
        (count = 2) =>
        ({ state, tr, dispatch, commands }) => {
          const { $from } = state.selection
          let depth = 0
          for (let d = $from.depth; d > 0; d--)
            if ($from.node(d).type.name === "columns") {
              depth = d
              break
            }
          if (!depth) return commands.insertColumns(count)

          const row = $from.node(depth)
          if (row.childCount === count) return true
          if (!dispatch) return true

          const column = state.schema.nodes.column
          const columns = row.content.content.slice(0, count)
          if (count > row.childCount) {
            // grown: the new columns stand empty on the right
            for (let i = row.childCount; i < count; i++)
              columns.push(column.createAndFill()!)
          } else {
            // shrunk: what the dropped columns held goes to the end of the
            // last column kept, in order, so nothing is lost
            const last = columns[count - 1]
            let content = last.content
            for (let i = count; i < row.childCount; i++)
              content = content.append(row.child(i).content)
            columns[count - 1] = last.copy(content)
          }

          const from = $from.before(depth)
          const next = row.type.create({ ...row.attrs, count }, columns)
          tr.replaceWith(from, from + row.nodeSize, next)

          // the caret stays on its text: untouched in a kept column, and
          // carried along with the text folded into the last one
          const index = $from.index(depth)
          let pos = $from.pos
          if (index >= count) {
            let start = from + 1
            for (let i = 0; i < count - 1; i++) start += row.child(i).nodeSize
            let before = row.child(count - 1).content.size
            for (let i = count; i < index; i++)
              before += row.child(i).content.size
            pos = start + 1 + before + ($from.pos - $from.start(depth + 1))
          }
          tr.setSelection(TextSelection.near(tr.doc.resolve(pos)))
          return true
        },
    }
  },
})


/* -------------------------------- attachment -------------------------------
 * The branch's attachment block: a file chip — the document glyph, the
 * file's name — carrying the name, size and mime type as attributes, and
 * round-tripping the source's `a[data-attachment]` markup.
 */
export const Attachment = Node.create({
  name: "attachment",
  group: "block",
  atom: true,
  draggable: true,
  addAttributes() {
    return {
      href: { default: "#" },
      fileName: {
        default: "",
        parseHTML: (el) => el.getAttribute("data-file-name") ?? el.textContent,
        renderHTML: (attrs) => ({ "data-file-name": attrs.fileName }),
      },
      fileSize: {
        default: 0,
        parseHTML: (el) => Number(el.getAttribute("data-file-size") ?? 0),
        renderHTML: (attrs) => ({ "data-file-size": attrs.fileSize }),
      },
      mimeType: {
        default: "",
        parseHTML: (el) => el.getAttribute("data-mime-type") ?? "",
        renderHTML: (attrs) => ({ "data-mime-type": attrs.mimeType }),
      },
    }
  },
  // ahead of the Link mark's own a[href] rule, which would otherwise
  // swallow the chip as an inline link
  parseHTML: () => [{ tag: "a[data-attachment]", priority: 100 }],
  renderHTML({ node, HTMLAttributes }) {
    return [
      "a",
      mergeAttributes(HTMLAttributes, {
        "data-attachment": "",
        href: node.attrs.href,
      }),
      String(node.attrs.fileName ?? ""),
    ]
  },
})

/* ---------------------------------- blocks ---------------------------------
 * The block styles the "Text" select offers: what the cursor's block is,
 * and how to make it another. (The source also lists toggle lists and
 * column layouts, which ride on its own extensions.)
 */
export const BLOCKS = [
  { value: "paragraph", label: "Text", Icon: ParagraphIcon },
  { value: "h1", label: "Heading 1", Icon: Heading1Icon },
  { value: "h2", label: "Heading 2", Icon: Heading2Icon },
  { value: "h3", label: "Heading 3", Icon: Heading3Icon },
  { value: "h4", label: "Heading 4", Icon: Heading4Icon },
  { value: "h5", label: "Heading 5", Icon: Heading5Icon },
  { value: "h6", label: "Heading 6", Icon: Heading6Icon },
  { value: "bulletList", label: "Bulleted list", Icon: MultipleListIcon },
  { value: "orderedList", label: "Numbered list", Icon: NumberedListIcon },
  { value: "taskList", label: "To-do list", Icon: TodoIcon },
  { value: "codeBlock", label: "Code", Icon: CodeIcon },
  { value: "blockquote", label: "Quote", Icon: QuoteIcon },
  { value: "columns2", label: "2 columns", Icon: Grid2Icon },
  { value: "columns3", label: "3 columns", Icon: Grid3Icon },
  { value: "columns4", label: "4 columns", Icon: Grid4Icon },
] as const
export type BlockValue = (typeof BLOCKS)[number]["value"]

/** how many columns the row around the selection has — none, if no row */
export function columnsAround(ed: TiptapEditor): number {
  const { $from } = ed.state.selection
  for (let d = $from.depth; d > 0; d--)
    if ($from.node(d).type.name === "columns") return $from.node(d).childCount
  return 0
}

export function activeBlockOf(ed: TiptapEditor): BlockValue {
  for (const level of [1, 2, 3, 4, 5, 6] as const)
    if (ed.isActive("heading", { level })) return `h${level}` as BlockValue
  if (ed.isActive("codeBlock")) return "codeBlock"
  if (ed.isActive("taskList")) return "taskList"
  if (ed.isActive("bulletList")) return "bulletList"
  if (ed.isActive("orderedList")) return "orderedList"
  if (ed.isActive("blockquote")) return "blockquote"
  const columns = columnsAround(ed)
  if (columns) return `columns${columns}` as BlockValue
  return "paragraph"
}

export function applyBlock(chain: ChainedCommands, value: BlockValue) {
  if (value === "paragraph") chain.setParagraph().run()
  else if (value.startsWith("h"))
    chain
      .toggleHeading({ level: Number(value[1]) as 1 | 2 | 3 | 4 | 5 | 6 })
      .run()
  else if (value === "bulletList") chain.toggleBulletList().run()
  else if (value === "orderedList") chain.toggleOrderedList().run()
  else if (value === "taskList") chain.toggleTaskList().run()
  else if (value === "codeBlock") chain.toggleCodeBlock().run()
  else if (value === "blockquote") chain.toggleBlockquote().run()
  // a row the selection is already in is re-counted; elsewhere a row is laid
  else if (value === "columns2") chain.setColumns(2).run()
  else if (value === "columns3") chain.setColumns(3).run()
  else if (value === "columns4") chain.setColumns(4).run()
}

/* ------------------------------ fonts and sizes ----------------------------- */

export const FONTS = [
  { label: "Inter", value: null },
  { label: "Serif", value: 'Georgia, "Times New Roman", serif' },
  { label: "Mono", value: 'ui-monospace, "SF Mono", Menlo, monospace' },
] as const
export const DEFAULT_SIZE = 14
export const SPACINGS = ["1", "1.15", "1.5", "2"] as const
