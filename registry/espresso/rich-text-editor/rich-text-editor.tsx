"use client"

// The timeless-gowtham branch's rich text editor (espresso-2.0 › WYSIWYG
// editor, 30534:59617), on tiptap: a document editor under a 36px fixed
// bar, 4px in, ruled beneath, its controls 28px on an 8px radius —
//   + ⌄ insert · Text ⌄ block style · Inter ⌄ font · − 14 + size ·
//   B I U S · A ⌄ colour │ code quote rule │ list ⌄ align ⌄ spacing ⌄
//   to-do │ link table ⌄ emoji ⌄ │ image video ⌄ │ highlight │ ⋯
// A select is an icon (or word) and a 16px chevron; a plain control a 16px
// glyph; pressed and open ones sit on gray-100.
import * as React from "react"
import {
  Extension,
  mergeAttributes,
  Node,
  type ChainedCommands,
  type Editor as TiptapEditor,
} from "@tiptap/core"
import { NodeSelection, PluginKey, TextSelection } from "@tiptap/pm/state"
import { createPortal } from "react-dom"
import { EditorContent, ReactRenderer, useEditor, useEditorState } from "@tiptap/react"
import { BubbleMenu } from "@tiptap/react/menus"
import StarterKit from "@tiptap/starter-kit"
import { Details, DetailsContent, DetailsSummary } from "@tiptap/extension-details"
import Mention from "@tiptap/extension-mention"
import Suggestion, { type SuggestionProps } from "@tiptap/suggestion"
import Highlight from "@tiptap/extension-highlight"
import Image from "@tiptap/extension-image"
import { TaskItem, TaskList } from "@tiptap/extension-list"
import Subscript from "@tiptap/extension-subscript"
import Superscript from "@tiptap/extension-superscript"
import { TableKit } from "@tiptap/extension-table"
import TextAlign from "@tiptap/extension-text-align"
import {
  Color,
  FontFamily,
  FontSize,
  LineHeight,
  TextStyle,
} from "@tiptap/extension-text-style"
import Youtube from "@tiptap/extension-youtube"
import { Placeholder } from "@tiptap/extensions"

import { cn } from "@/lib/utils"
import {
  EmojiPicker,
  EmojiPickerContent,
  EmojiPickerTrigger,
} from "@/components/ui/emoji-picker"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Button } from "@/components/ui/button"
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
  AddEmoji1Icon,
  AddIcon,
  DragIcon,
  FileUploadIcon,
  Grid2Icon,
  GroupIcon,
  SmallDownIcon,
  Grid3Icon,
  Grid4Icon,
  AlignCenterIcon,
  AlignJustifyIcon,
  AlignLeftIcon,
  AlignRightIcon,
  AudioWavesIcon,
  ClearFormattingIcon,
  CodeIcon,
  DividerIcon,
  DotHorizontalIcon,
  Heading1Icon,
  Heading2Icon,
  Heading3Icon,
  Heading4Icon,
  Heading5Icon,
  Heading6Icon,
  ImageIcon,
  LinkIcon,
  MultipleListIcon,
  NumberedListIcon,
  ParagraphIcon,
  QuoteIcon,
  SubscriptIcon,
  SuperscriptIcon,
  TableViewIcon,
  TextIcon,
  TodoIcon,
  VideoIcon,
} from "@/components/ui/rich-text-editor-icons"

/* --------------------------------- palette --------------------------------- */

const PALETTE = [
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
const hue = (name: string) => (name === "indigo" ? "violet" : name)
const textValue = (name: string) => `var(--color-${hue(name)}-600)`
const highlightValue = (name: string) => `var(--color-${hue(name)}-100)`



/* ---------------------------- callout, audio, embed ------------------------ */

// a callout: gray wash, 12px in, the emoji leading its first line
const Callout = Node.create({
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
const Audio = Node.create({
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
const Embed = Node.create({
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
const PEOPLE = [
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

type SuggestItem = {
  id: string
  label: string
  image?: string
  icon?: React.ReactNode
  run?: (editor: TiptapEditor) => void
}

type SuggestionListHandle = {
  onKeyDown: (props: { event: KeyboardEvent }) => boolean
}

const SuggestionList = React.forwardRef<
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
function suggestionPopup() {
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

const SLASH_ITEMS: SuggestItem[] = [
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

const SlashCommands = Extension.create({
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

const Column = Node.create({
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

const Columns = Node.create({
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
const Attachment = Node.create({
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
const BLOCKS = [
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
type BlockValue = (typeof BLOCKS)[number]["value"]

/** how many columns the row around the selection has — none, if no row */
function columnsAround(ed: TiptapEditor): number {
  const { $from } = ed.state.selection
  for (let d = $from.depth; d > 0; d--)
    if ($from.node(d).type.name === "columns") return $from.node(d).childCount
  return 0
}

function activeBlockOf(ed: TiptapEditor): BlockValue {
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

function applyBlock(chain: ChainedCommands, value: BlockValue) {
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

const FONTS = [
  { label: "Inter", value: null },
  { label: "Serif", value: 'Georgia, "Times New Roman", serif' },
  { label: "Mono", value: 'ui-monospace, "SF Mono", Menlo, monospace' },
] as const
const DEFAULT_SIZE = 14
const SPACINGS = ["1", "1.15", "1.5", "2"] as const

/* --------------------------------- controls -------------------------------- */

const controlClass =
  "flex h-7 min-w-7 shrink-0 items-center justify-center gap-0.5 rounded-md px-1 text-secondary-foreground transition-colors not-disabled:hover:bg-secondary aria-pressed:bg-secondary disabled:cursor-default disabled:opacity-50 data-popup-open:bg-secondary [&>svg]:size-4"

function Control({
  label,
  pressed,
  disabled,
  onClick,
  className,
  children,
}: {
  label: string
  pressed?: boolean
  disabled?: boolean
  onClick?: () => void
  className?: string
  children: React.ReactNode
}) {
  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <button
            type="button"
            aria-label={label}
            aria-pressed={pressed}
            disabled={disabled}
            onMouseDown={(event) => event.preventDefault()}
            onClick={onClick}
            className={cn(controlClass, className)}
          >
            {children}
          </button>
        }
      />
      <TooltipContent>{label}</TooltipContent>
    </Tooltip>
  )
}

function BarDivider() {
  return <span aria-hidden="true" className="mx-1 h-5 w-px shrink-0 bg-muted" />
}

function ColorPanel({
  editor,
  onPick,
}: {
  editor: TiptapEditor
  onPick: () => void
}) {
  const swatches = [null, ...PALETTE]
  const swatchClass =
    "flex size-6 items-center justify-center rounded-md border bg-card text-base leading-none transition-shadow hover:shadow-[0_0_0_1px_var(--sw-line)] focus-visible:shadow-[0_0_0_1px_var(--sw-line)] focus-visible:outline-none"
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
  return (
    <div
      role="group"
      aria-label="Text and background colour"
      className="flex w-[190px] flex-col gap-4"
    >
      {(
        [
          ["Text color", pickText, false],
          ["Background color", pickHighlight, true],
        ] as const
      ).map(([title, pick, fill]) => (
        <section key={title} className="flex flex-col gap-2">
          <div className="text-sm leading-[15px] text-muted-foreground">
            {title}
          </div>
          <div className="grid grid-cols-6 gap-1.5">
            {swatches.map((name) => (
              <button
                key={name ?? "default"}
                type="button"
                title={name ?? "Default"}
                aria-label={name ?? "Default"}
                onClick={() => pick(name)}
                className={swatchClass}
                style={
                  name
                    ? ({
                        color: textValue(name),
                        backgroundColor: fill
                          ? `var(--color-${hue(name)}-50)`
                          : undefined,
                        borderColor: `var(--color-${hue(name)}-200)`,
                        "--sw-line": `var(--color-${hue(name)}-200)`,
                      } as React.CSSProperties)
                    : ({
                        color: "var(--foreground)",
                        borderColor: "var(--border)",
                        "--sw-line": "var(--border)",
                      } as React.CSSProperties)
                }
              >
                {fill ? "" : "A"}
              </button>
            ))}
          </div>
        </section>
      ))}
    </div>
  )
}


/** the library's table-size picker: sweep the grid to the size, as the
 * source's InsertTable draws it */
function TableSizeGrid({
  onPick,
}: {
  onPick: (rows: number, cols: number) => void
}) {
  const COLS = 8
  const ROWS = 6
  const [hover, setHover] = React.useState<{ r: number; c: number }>({
    r: 3,
    c: 3,
  })
  return (
    <div className="flex flex-col items-center gap-2 p-1.5">
      <div
        className="grid gap-1"
        style={{ gridTemplateColumns: `repeat(${COLS}, minmax(0, 1fr))` }}
      >
        {Array.from({ length: ROWS * COLS }, (_, i) => {
          const r = Math.floor(i / COLS) + 1
          const c = (i % COLS) + 1
          const lit = r <= hover.r && c <= hover.c
          return (
            <button
              key={i}
              type="button"
              aria-label={`${c} × ${r}`}
              onMouseEnter={() => setHover({ r, c })}
              onFocus={() => setHover({ r, c })}
              onClick={() => onPick(r, c)}
              className={cn(
                "size-6 rounded-[5px] border transition-colors",
                lit
                  ? "border-border-normal bg-secondary"
                  : "border-border-soft bg-input"
              )}
            />
          )
        })}
      </div>
      <p className="pb-0.5 text-sm text-secondary-foreground">
        {hover.c} × {hover.r}
      </p>
    </div>
  )
}

const ALIGNS = [
  { value: "left", label: "Left", Icon: AlignLeftIcon },
  { value: "center", label: "Center", Icon: AlignCenterIcon },
  { value: "right", label: "Right", Icon: AlignRightIcon },
  { value: "justify", label: "Justify", Icon: AlignJustifyIcon },
] as const

/* --------------------------------- toolbar --------------------------------- */

function RichTextToolbar({
  editor,
  disabled,
}: {
  editor: TiptapEditor
  disabled?: boolean
}) {
  const active = useEditorState({
    editor,
    selector: ({ editor: ed }) => ({
      block: activeBlockOf(ed),
      font:
        FONTS.find(
          (f) => f.value === ed.getAttributes("textStyle").fontFamily
        )?.label ?? "Inter",
      size: (() => {
        const raw = ed.getAttributes("textStyle").fontSize as
          | string
          | undefined
        const n = raw ? parseInt(raw, 10) : NaN
        return Number.isFinite(n) ? n : DEFAULT_SIZE
      })(),
      bold: ed.isActive("bold"),
      italic: ed.isActive("italic"),
      underline: ed.isActive("underline"),
      strike: ed.isActive("strike"),
      code: ed.isActive("code"),
      quote: ed.isActive("blockquote"),
      todo: ed.isActive("taskList"),
      link: ed.isActive("link"),
      highlight: ed.isActive("highlight"),
      subscript: ed.isActive("subscript"),
      superscript: ed.isActive("superscript"),
      align:
        ALIGNS.find((a) => ed.isActive({ textAlign: a.value })) ?? ALIGNS[0],
      table: ed.isActive("table"),
      canIndent:
        ed.can().sinkListItem("listItem") || ed.can().sinkListItem("taskItem"),
    }),
  })
  // an insert with a node selected (a just-placed video or image) would be
  // refused by the toggles — step the caret past the node first
  const chain = () => {
    const { selection, doc } = editor.state
    if (selection instanceof NodeSelection) {
      editor.view.dispatch(
        editor.state.tr.setSelection(
          TextSelection.near(doc.resolve(selection.to))
        )
      )
    }
    return editor.chain().focus()
  }

  const block = BLOCKS.find((b) => b.value === active?.block) ?? BLOCKS[0]

  // the link panel, under the selection — the source's picker, not the
  // browser's prompt
  const [linkPanel, setLinkPanel] = React.useState<{
    x: number
    y: number
    href: string
  } | null>(null)
  const setLink = () => {
    const { from } = editor.state.selection
    const coords = editor.view.coordsAtPos(from)
    setLinkPanel({
      x: coords.left,
      y: coords.bottom + 8,
      href: (editor.getAttributes("link").href as string) ?? "",
    })
  }
  const applyLink = () => {
    if (!linkPanel) return
    const href = linkPanel.href.trim()
    if (href) chain().extendMarkRange("link").setLink({ href }).run()
    else chain().extendMarkRange("link").unsetLink().run()
    setLinkPanel(null)
  }
  const fileRef = React.useRef<HTMLInputElement>(null)
  const attachRef = React.useRef<HTMLInputElement>(null)
  const audioRef = React.useRef<HTMLInputElement>(null)
  const insertAudio = (file: File | undefined) => {
    if (!file) return
    const reader = new FileReader()
    reader.onload = () =>
      chain()
        .insertContent({
          type: "audio",
          attrs: { src: reader.result as string, title: file.name },
        })
        .run()
    reader.readAsDataURL(file)
  }
  const insertEmbed = () => {
    const src = window.prompt("Embed URL")
    if (src) chain().insertContent({ type: "embed", attrs: { src } }).run()
  }
  const insertAttachment = (file: File | undefined) => {
    if (!file) return
    const reader = new FileReader()
    reader.onload = () =>
      chain()
        .insertContent({
          type: "attachment",
          attrs: {
            href: reader.result as string,
            fileName: file.name,
            fileSize: file.size,
            mimeType: file.type,
          },
        })
        .run()
    reader.readAsDataURL(file)
  }
  const insertImage = (file: File | undefined) => {
    if (!file) return
    const reader = new FileReader()
    reader.onload = () =>
      chain().setImage({ src: reader.result as string }).run()
    reader.readAsDataURL(file)
  }
  const insertVideo = () => {
    const src = window.prompt("YouTube URL")
    if (src) chain().setYoutubeVideo({ src }).run()
  }

  const stepSize = (delta: number) => {
    const next = Math.min(72, Math.max(8, (active?.size ?? DEFAULT_SIZE) + delta))
    if (next === DEFAULT_SIZE) chain().unsetFontSize().run()
    else chain().setFontSize(`${next}px`).run()
  }

  const selectTrigger = (label: string, child: React.ReactNode) => (
    <button
      type="button"
      aria-label={label}
      disabled={disabled}
      className={controlClass}
    >
      {child}
      <SmallDownIcon className="size-4! text-muted-foreground" />
    </button>
  )

  const AlignIcon = active?.align.Icon ?? AlignLeftIcon
  const [tableMenuOpen, setTableMenuOpen] = React.useState(false)

  return (
    <TooltipProvider>
      <div
        role="toolbar"
        aria-label="Formatting"
        aria-disabled={disabled || undefined}
        data-slot="rich-text-editor-toolbar"
        className="sticky top-0 z-10 flex h-9 shrink-0 items-center overflow-x-auto border-b border-border-soft bg-background px-1"
      >
        {/* + insert */}
        <DropdownMenu>
          <DropdownMenuTrigger
            disabled={disabled}
            render={selectTrigger("Insert", <AddIcon />)}
          />
          <DropdownMenuContent align="start" sideOffset={4}>
            <DropdownMenuItem onClick={() => fileRef.current?.click()}>
              <ImageIcon className="size-4" /> Image
            </DropdownMenuItem>
            <DropdownMenuItem onClick={insertVideo}>
              <VideoIcon className="size-4" /> Video
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() =>
                chain()
                  .insertTable({ rows: 3, cols: 3, withHeaderRow: true })
                  .run()
              }
            >
              <TableViewIcon className="size-4" /> Table
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => chain().setHorizontalRule().run()}>
              <DividerIcon className="size-4" /> Divider
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => chain().toggleTaskList().run()}>
              <TodoIcon className="size-4" /> To-do list
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => chain().toggleCodeBlock().run()}>
              <CodeIcon className="size-4" /> Code block
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => audioRef.current?.click()}>
              <AudioWavesIcon className="size-4" /> Audio
            </DropdownMenuItem>
            <DropdownMenuItem onClick={insertEmbed}>
              <GroupIcon className="size-4" /> Embed
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() =>
                chain()
                  .insertContent({
                    type: "callout",
                    content: [{ type: "paragraph" }],
                  })
                  .run()
              }
            >
              <QuoteIcon className="size-4" /> Callout
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => chain().setDetails().run()}>
              <SmallDownIcon className="size-4" /> Expand / collapse
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        {/* block style */}
        <DropdownMenu>
          <DropdownMenuTrigger
            disabled={disabled}
            render={selectTrigger(
              "Block style",
              <span className="grid px-0.5 text-left text-sm">
                {BLOCKS.map((item) => (
                  <span
                    key={item.value}
                    aria-hidden={item.value !== block.value || undefined}
                    className={cn(
                      "col-start-1 row-start-1 whitespace-nowrap",
                      item.value !== block.value && "invisible"
                    )}
                  >
                    {item.label}
                  </span>
                ))}
              </span>
            )}
          />
          <DropdownMenuContent align="start" sideOffset={4}>
            {BLOCKS.map((item) => (
              <DropdownMenuItem
                key={item.value}
                data-selected={active?.block === item.value || undefined}
                className="data-selected:bg-secondary"
                onClick={() => applyBlock(chain(), item.value)}
              >
                <item.Icon className="size-4" />
                {item.label}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>

        {/* font family */}
        <DropdownMenu>
          <DropdownMenuTrigger
            disabled={disabled}
            render={selectTrigger(
              "Font",
              <span className="px-0.5 text-sm whitespace-nowrap">
                {active?.font ?? "Inter"}
              </span>
            )}
          />
          <DropdownMenuContent align="start" sideOffset={4}>
            {FONTS.map((font) => (
              <DropdownMenuItem
                key={font.label}
                onClick={() =>
                  font.value
                    ? chain().setFontFamily(font.value).run()
                    : chain().unsetFontFamily().run()
                }
              >
                {font.label}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>

        {/* size: − 14 + */}
        <div className="flex h-7 shrink-0 items-center gap-1 p-0.5" aria-label="Font size">
          <Control label="Smaller" disabled={disabled} className="size-6 min-w-6 rounded-lg bg-secondary not-disabled:hover:bg-muted" onClick={() => stepSize(-1)}>
            <DividerIcon className="size-3.5!" />
          </Control>
          <span className="w-6 text-center text-base leading-4 tabular-nums text-secondary-foreground">
            {active?.size ?? DEFAULT_SIZE}
          </span>
          <Control label="Larger" disabled={disabled} className="size-6 min-w-6 rounded-lg bg-secondary not-disabled:hover:bg-muted" onClick={() => stepSize(1)}>
            <AddIcon className="size-3.5!" />
          </Control>
        </div>

        {/* marks */}
        <Control label="Bold" pressed={active?.bold} disabled={disabled} onClick={() => chain().toggleBold().run()}>
          <span className="text-sm font-bold">B</span>
        </Control>
        <Control label="Italic" pressed={active?.italic} disabled={disabled} onClick={() => chain().toggleItalic().run()}>
          <span className="font-serif text-sm italic">I</span>
        </Control>
        <Control label="Underline" pressed={active?.underline} disabled={disabled} onClick={() => chain().toggleUnderline().run()}>
          <span className="text-sm underline">U</span>
        </Control>
        <Control label="Strikethrough" pressed={active?.strike} disabled={disabled} onClick={() => chain().toggleStrike().run()}>
          <span className="text-sm line-through">S</span>
        </Control>

        {/* colour */}
        <ColorPopover editor={editor} disabled={disabled} />

        <BarDivider />
        <Control label="Inline code" pressed={active?.code} disabled={disabled} onClick={() => chain().toggleCode().run()}>
          <CodeIcon />
        </Control>
        <Control label="Quote" pressed={active?.quote} disabled={disabled} onClick={() => chain().toggleBlockquote().run()}>
          <QuoteIcon />
        </Control>
        <Control label="Divider" disabled={disabled} onClick={() => chain().setHorizontalRule().run()}>
          <DividerIcon />
        </Control>

        <BarDivider />
        {/* lists */}
        <DropdownMenu>
          <DropdownMenuTrigger
            disabled={disabled}
            render={selectTrigger("Lists", <NumberedListIcon />)}
          />
          <DropdownMenuContent align="start" sideOffset={4}>
            <DropdownMenuItem onClick={() => chain().toggleBulletList().run()}>
              <MultipleListIcon className="size-4" /> Bulleted list
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => chain().toggleOrderedList().run()}>
              <NumberedListIcon className="size-4" /> Numbered list
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
        {/* alignment */}
        <DropdownMenu>
          <DropdownMenuTrigger
            disabled={disabled}
            render={selectTrigger("Alignment", <AlignIcon />)}
          />
          <DropdownMenuContent align="start" sideOffset={4}>
            {ALIGNS.map((item) => (
              <DropdownMenuItem
                key={item.value}
                onClick={() => chain().setTextAlign(item.value).run()}
              >
                <item.Icon className="size-4" />
                {item.label}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
        {/* line spacing */}
        <DropdownMenu>
          <DropdownMenuTrigger
            disabled={disabled}
            render={selectTrigger("Line spacing", <AudioWavesIcon className="rotate-90" />)}
          />
          <DropdownMenuContent align="start" sideOffset={4}>
            <DropdownMenuItem onClick={() => chain().unsetLineHeight().run()}>
              Default
            </DropdownMenuItem>
            {SPACINGS.map((spacing) => (
              <DropdownMenuItem
                key={spacing}
                onClick={() => chain().setLineHeight(spacing).run()}
              >
                {spacing}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
        <Control label="To-do list" pressed={active?.todo} disabled={disabled} onClick={() => chain().toggleTaskList().run()}>
          <TodoIcon />
        </Control>
        <Control
          label="Indent"
          disabled={disabled || !active?.canIndent}
          onClick={() => {
            if (!chain().sinkListItem("listItem").run())
              chain().sinkListItem("taskItem").run()
          }}
        >
          <GroupIcon />
        </Control>

        <BarDivider />
        <Control label="Link" pressed={active?.link} disabled={disabled} onClick={setLink}>
          <LinkIcon />
        </Control>
        {/* table */}
        <DropdownMenu
          open={tableMenuOpen}
          onOpenChange={setTableMenuOpen}
        >
          <DropdownMenuTrigger
            disabled={disabled}
            render={selectTrigger("Table", <TableViewIcon />)}
          />
          <DropdownMenuContent align="start" sideOffset={4}>
            <TableSizeGrid
              onPick={(rows, cols) => {
                chain().insertTable({ rows, cols, withHeaderRow: true }).run()
                setTableMenuOpen(false)
              }}
            />
            {active?.table && (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => chain().addRowAfter().run()}>
                  Add row below
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => chain().addColumnAfter().run()}>
                  Add column right
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => chain().deleteRow().run()}>
                  Delete row
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => chain().deleteColumn().run()}>
                  Delete column
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => chain().deleteTable().run()}>
                  Delete table
                </DropdownMenuItem>
              </>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
        {/* emoji — the espresso emoji picker on a bar control */}
        <EmojiPicker
          onValueChange={(emoji) => chain().insertContent(emoji).run()}
        >
          <EmojiPickerTrigger
            render={
              <button
                type="button"
                aria-label="Emoji"
                disabled={disabled}
                className={controlClass}
              >
                <AddEmoji1Icon />
                <SmallDownIcon className="size-4! text-muted-foreground" />
              </button>
            }
          />
          <EmojiPickerContent />
        </EmojiPicker>

        <BarDivider />
        {(
          [
            { label: "Image", Icon: ImageIcon, items: [{ label: "Upload image", run: () => fileRef.current?.click() }] },
            { label: "Video", Icon: VideoIcon, items: [{ label: "From YouTube URL", run: insertVideo }] },
            { label: "Audio", Icon: AudioWavesIcon, items: [{ label: "Upload audio", run: () => audioRef.current?.click() }] },
            { label: "File", Icon: FileUploadIcon, items: [{ label: "Upload file", run: () => attachRef.current?.click() }] },
          ] as const
        ).map((media) => (
          <DropdownMenu key={media.label}>
            <DropdownMenuTrigger
              disabled={disabled}
              render={selectTrigger(media.label, <media.Icon />)}
            />
            <DropdownMenuContent align="start" sideOffset={4}>
              {media.items.map((item) => (
                <DropdownMenuItem key={item.label} onClick={item.run}>
                  {item.label}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        ))}

        <BarDivider />
        {/* highlighter: the default wash, yellow */}
        <Control
          label="Highlight"
          pressed={active?.highlight}
          disabled={disabled}
          onClick={() =>
            chain().toggleHighlight({ color: highlightValue("yellow") }).run()
          }
        >
          <svg viewBox="0 0 32 32" className="size-4" aria-hidden="true">
            <path
              d="M7 25h18M11 20l8.5-8.5a2.4 2.4 0 0 1 3.4 0l.6.6a2.4 2.4 0 0 1 0 3.4L15 24h-4v-4Z"
              stroke="currentColor"
              strokeWidth="2.2"
              strokeLinecap="round"
              strokeLinejoin="round"
              fill="none"
            />
          </svg>
        </Control>

        {/* ⋯ more */}
        <DropdownMenu>
          <DropdownMenuTrigger
            disabled={disabled}
            render={
              <button
                type="button"
                aria-label="More"
                className={controlClass}
              >
                <DotHorizontalIcon />
              </button>
            }
          />
          <DropdownMenuContent align="end" sideOffset={4}>
            <DropdownMenuItem onClick={() => chain().undo().run()}>
              Undo
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => chain().redo().run()}>
              Redo
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => chain().toggleSubscript().run()}>
              <SubscriptIcon className="size-4" /> Subscript
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => chain().toggleSuperscript().run()}>
              <SuperscriptIcon className="size-4" /> Superscript
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={() => chain().clearNodes().unsetAllMarks().run()}
            >
              <ClearFormattingIcon className="size-4" /> Clear formatting
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        {linkPanel &&
          createPortal(
            <div
              data-slot="rich-text-editor-link-panel"
              className="fixed z-70 flex w-80 items-center gap-1.5 rounded-xl border border-border-soft bg-card p-1.5 shadow-elevation-lg"
              style={{ left: linkPanel.x, top: linkPanel.y }}
            >
              <Input
                autoFocus
                size="sm"
                variant="subtle"
                placeholder="Paste a link"
                value={linkPanel.href}
                onChange={(event) =>
                  setLinkPanel({ ...linkPanel, href: event.target.value })
                }
                onKeyDown={(event) => {
                  if (event.key === "Enter") applyLink()
                  if (event.key === "Escape") setLinkPanel(null)
                }}
              />
              <Button size="xs" onClick={applyLink}>
                Apply
              </Button>
              {editor.isActive("link") && (
                <Button
                  size="xs"
                  variant="ghost"
                  onClick={() => {
                    chain().extendMarkRange("link").unsetLink().run()
                    setLinkPanel(null)
                  }}
                >
                  Remove
                </Button>
              )}
            </div>,
            document.body
          )}
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(event) => {
            insertImage(event.target.files?.[0])
            event.target.value = ""
          }}
        />
        <input
          ref={audioRef}
          type="file"
          accept="audio/*"
          className="hidden"
          onChange={(event) => {
            insertAudio(event.target.files?.[0])
            event.target.value = ""
          }}
        />
        <input
          ref={attachRef}
          type="file"
          className="hidden"
          onChange={(event) => {
            insertAttachment(event.target.files?.[0])
            event.target.value = ""
          }}
        />
      </div>
    </TooltipProvider>
  )
}

function ColorPopover({
  editor,
  disabled,
}: {
  editor: TiptapEditor
  disabled?: boolean
}) {
  const [open, setOpen] = React.useState(false)
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        disabled={disabled}
        className={undefined}
        render={
          <button
            type="button"
            aria-label="Text colour"
            onMouseDown={(event) => event.preventDefault()}
            className={cn(
              controlClass,
              "group gap-0.5 px-0.5 not-disabled:hover:bg-transparent data-popup-open:bg-transparent"
            )}
          >
            <span className="flex size-6 items-center justify-center rounded-lg border border-border transition-colors group-hover:border-border-normal group-data-popup-open:border-border-normal">
              <TextIcon className="size-4" />
            </span>
            <SmallDownIcon className="size-4! text-muted-foreground" />
          </button>
        }
      />
      <PopoverContent align="start" sideOffset={6} className="w-auto p-2">
        <ColorPanel editor={editor} onPick={() => setOpen(false)} />
      </PopoverContent>
    </Popover>
  )
}


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

type View = TiptapEditor["view"]

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

function BlockHandle({ editor }: { editor: TiptapEditor }) {
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
    const sel = selectBlock()
    if (!el || !sel || !event.dataTransfer) {
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
    d.dragging = true
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


/* ------------------------------ table controls -----------------------------
 * The table's controls, as the source draws them over the document on a
 * fixed layer: handles on the row and column of the cell under the
 * pointer that open a menu (insert, duplicate, clear, delete, and the
 * header row toggle) or, dragged, carry their row or column — a 3px line
 * marks the edge it will land on, and the first row stays a header row,
 * whichever row lands there. Two strips off the table's right and bottom
 * edges add a column or a row at the end.
 */
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

function TableControls({ editor }: { editor: TiptapEditor }) {
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
                left: rowRect.left - 14,
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
                top: tableRect.top - 14,
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


/** the bar that rises over a run of selected text */
function SelectionBar({ editor }: { editor: TiptapEditor }) {
  const active = useEditorState({
    editor,
    selector: ({ editor: ed }) => ({
      bold: ed.isActive("bold"),
      italic: ed.isActive("italic"),
      underline: ed.isActive("underline"),
      strike: ed.isActive("strike"),
      link: ed.isActive("link"),
    }),
  })
  const chain = () => editor.chain().focus()
  const button = (
    label: string,
    pressed: boolean | undefined,
    onClick: () => void,
    child: React.ReactNode
  ) => (
    <button
      type="button"
      aria-label={label}
      aria-pressed={pressed}
      onMouseDown={(event) => event.preventDefault()}
      onClick={onClick}
      className={controlClass}
    >
      {child}
    </button>
  )
  return (
    <div className="flex h-9 items-center gap-0.5 rounded-[10px] border border-border-soft bg-card p-1 shadow-elevation-lg">
      {button("Bold", active?.bold, () => chain().toggleBold().run(), <span className="text-sm font-bold">B</span>)}
      {button("Italic", active?.italic, () => chain().toggleItalic().run(), <span className="font-serif text-sm italic">I</span>)}
      {button("Underline", active?.underline, () => chain().toggleUnderline().run(), <span className="text-sm underline">U</span>)}
      {button("Strikethrough", active?.strike, () => chain().toggleStrike().run(), <span className="text-sm line-through">S</span>)}
      <span aria-hidden="true" className="mx-1 h-4 w-px shrink-0 bg-muted" />
      {button("Link", active?.link, () => {
        if (editor.isActive("link")) {
          chain().extendMarkRange("link").unsetLink().run()
          return
        }
        const href = window.prompt("Link URL")
        if (href) chain().extendMarkRange("link").setLink({ href }).run()
      }, <LinkIcon className="size-3.5" />)}
    </div>
  )
}

/* ---------------------------------- editor --------------------------------- */

// the document's typography: the prose at 14/1.7, the file's headings,
// and enough of every block the bar can make to draw it properly
const docClassName = cn(
  "[&_.ProseMirror]:min-h-60 [&_.ProseMirror]:text-[15px] [&_.ProseMirror]:leading-[1.6] [&_.ProseMirror]:whitespace-pre-wrap [&_.ProseMirror]:outline-none [&_.ProseMirror]:text-secondary-foreground",
  // placeholder
  "[&_.ProseMirror_p.is-editor-empty:first-child]:before:pointer-events-none [&_.ProseMirror_p.is-editor-empty:first-child]:before:float-left [&_.ProseMirror_p.is-editor-empty:first-child]:before:h-0 [&_.ProseMirror_p.is-editor-empty:first-child]:before:text-muted-foreground [&_.ProseMirror_p.is-editor-empty:first-child]:before:content-[attr(data-placeholder)]",
  // headings
  "[&_.ProseMirror_h1]:mt-0 [&_.ProseMirror_h1]:mb-3 [&_.ProseMirror_h1]:text-[28px] [&_.ProseMirror_h1]:leading-[1.3] [&_.ProseMirror_h1]:font-semibold [&_.ProseMirror_h1]:text-foreground",
  "[&_.ProseMirror_h2]:mt-6 [&_.ProseMirror_h2]:mb-2 [&_.ProseMirror_h2]:text-2xl [&_.ProseMirror_h2]:leading-[1.3] [&_.ProseMirror_h2]:font-semibold [&_.ProseMirror_h2]:text-foreground",
  "[&_.ProseMirror_h3]:mt-6 [&_.ProseMirror_h3]:mb-2 [&_.ProseMirror_h3]:text-xl [&_.ProseMirror_h3]:leading-[1.35] [&_.ProseMirror_h3]:font-semibold [&_.ProseMirror_h3]:text-foreground",
  "[&_.ProseMirror_h4]:mt-6 [&_.ProseMirror_h4]:mb-2 [&_.ProseMirror_h4]:text-lg [&_.ProseMirror_h4]:leading-[1.35] [&_.ProseMirror_h4]:font-semibold [&_.ProseMirror_h4]:text-foreground",
  "[&_.ProseMirror_h5]:mt-6 [&_.ProseMirror_h5]:mb-2 [&_.ProseMirror_h5]:text-base [&_.ProseMirror_h5]:leading-[1.4] [&_.ProseMirror_h5]:font-semibold [&_.ProseMirror_h5]:text-foreground",
  "[&_.ProseMirror_h6]:mt-6 [&_.ProseMirror_h6]:mb-2 [&_.ProseMirror_h6]:text-[15px] [&_.ProseMirror_h6]:leading-[1.4] [&_.ProseMirror_h6]:font-semibold [&_.ProseMirror_h6]:text-foreground",
  // blocks
  "[&_.ProseMirror_ul:not([data-type=taskList])]:list-disc [&_.ProseMirror_ul]:my-1 [&_.ProseMirror_ul:not([data-type=taskList])]:pl-6 [&_.ProseMirror_ol]:my-1 [&_.ProseMirror_ol]:list-decimal [&_.ProseMirror_ol]:pl-6",
  "[&_.ProseMirror_blockquote]:my-2 [&_.ProseMirror_blockquote]:border-l-2 [&_.ProseMirror_blockquote]:border-border [&_.ProseMirror_blockquote]:pl-3 [&_.ProseMirror_blockquote]:text-muted-foreground",
  "[&_.ProseMirror_pre]:my-2 [&_.ProseMirror_pre]:rounded-lg [&_.ProseMirror_pre]:bg-secondary [&_.ProseMirror_pre]:p-3 [&_.ProseMirror_pre]:font-mono [&_.ProseMirror_pre]:text-sm [&_.ProseMirror_pre]:whitespace-pre-wrap",
  "[&_.ProseMirror_code:not(pre_code)]:rounded-sm [&_.ProseMirror_code:not(pre_code)]:bg-secondary [&_.ProseMirror_code:not(pre_code)]:px-1 [&_.ProseMirror_code:not(pre_code)]:py-0.5 [&_.ProseMirror_code:not(pre_code)]:font-mono [&_.ProseMirror_code:not(pre_code)]:text-[0.9em]",
  "[&_.ProseMirror_hr]:my-6 [&_.ProseMirror_hr]:w-full [&_.ProseMirror_hr]:border-border-soft",
  "[&_.ProseMirror_a]:text-blue-600 [&_.ProseMirror_a]:underline [&_.ProseMirror_a]:underline-offset-2",
  "[&_.ProseMirror_img]:my-2 [&_.ProseMirror_img]:max-w-full [&_.ProseMirror_img]:rounded-lg",
  "[&_.ProseMirror_iframe]:my-2 [&_.ProseMirror_iframe]:aspect-video [&_.ProseMirror_iframe]:w-full [&_.ProseMirror_iframe]:rounded-lg",
  // task list
  // the to-do list drawn with the espresso Checkbox's own look
  "[&_.ProseMirror_ul[data-type=taskList]]:pl-0 [&_.ProseMirror_ul[data-type=taskList]_li]:flex [&_.ProseMirror_ul[data-type=taskList]_li]:items-start [&_.ProseMirror_ul[data-type=taskList]_li]:gap-2 [&_.ProseMirror_ul[data-type=taskList]_li>label]:mt-1 [&_.ProseMirror_ul[data-type=taskList]_li>div]:min-w-0 [&_.ProseMirror_ul[data-type=taskList]_li>div]:flex-1",
  "[&_.ProseMirror_ul[data-type=taskList]_input]:size-4 [&_.ProseMirror_ul[data-type=taskList]_input]:cursor-pointer [&_.ProseMirror_ul[data-type=taskList]_input]:appearance-none [&_.ProseMirror_ul[data-type=taskList]_input]:rounded-2xs [&_.ProseMirror_ul[data-type=taskList]_input]:border [&_.ProseMirror_ul[data-type=taskList]_input]:border-card-foreground [&_.ProseMirror_ul[data-type=taskList]_input]:bg-background [&_.ProseMirror_ul[data-type=taskList]_input]:transition-all [&_.ProseMirror_ul[data-type=taskList]_input]:duration-[250ms] [&_.ProseMirror_ul[data-type=taskList]_input:not(:checked):hover]:border-accent-foreground [&_.ProseMirror_ul[data-type=taskList]_input:not(:checked):hover]:shadow-elevation-sm [&_.ProseMirror_ul[data-type=taskList]_input:active]:scale-[0.97]",
  "[&_.ProseMirror_ul[data-type=taskList]_input:checked]:border-transparent [&_.ProseMirror_ul[data-type=taskList]_input:checked]:bg-primary [&_.ProseMirror_ul[data-type=taskList]_input:checked]:bg-[url('data:image/svg+xml;utf8,%3Csvg%20xmlns=%22http://www.w3.org/2000/svg%22%20viewBox=%220%200%2024%2024%22%20fill=%22none%22%20stroke=%22%23FFFFFF%22%20stroke-width=%223.5%22%20stroke-linecap=%22round%22%20stroke-linejoin=%22round%22%3E%3Cpath%20d=%22M20%206%209%2017l-5-5%22/%3E%3C/svg%3E')] [&_.ProseMirror_ul[data-type=taskList]_input:checked]:bg-size-[12px] [&_.ProseMirror_ul[data-type=taskList]_input:checked]:bg-center [&_.ProseMirror_ul[data-type=taskList]_input:checked]:bg-no-repeat [&_.ProseMirror_ul[data-type=taskList]_input:checked:hover]:bg-primary/86",
  "dark:[&_.ProseMirror_ul[data-type=taskList]_input:checked]:bg-[url('data:image/svg+xml;utf8,%3Csvg%20xmlns=%22http://www.w3.org/2000/svg%22%20viewBox=%220%200%2024%2024%22%20fill=%22none%22%20stroke=%22%23171717%22%20stroke-width=%223.5%22%20stroke-linecap=%22round%22%20stroke-linejoin=%22round%22%3E%3Cpath%20d=%22M20%206%209%2017l-5-5%22/%3E%3C/svg%3E')]",
  // table
  "[&_.ProseMirror_table]:my-2 [&_.ProseMirror_table]:w-full [&_.ProseMirror_table]:border-collapse [&_.ProseMirror_td]:border [&_.ProseMirror_td]:border-border-soft [&_.ProseMirror_td]:px-2.5 [&_.ProseMirror_td]:py-1.5 [&_.ProseMirror_th]:border [&_.ProseMirror_th]:border-border-soft [&_.ProseMirror_th]:bg-transparent [&_.ProseMirror_th]:px-2.5 [&_.ProseMirror_th]:py-1.5 [&_.ProseMirror_th]:text-left [&_.ProseMirror_th]:font-normal [&_.ProseMirror_th]:text-muted-foreground",
  "[&_.ProseMirror_.selectedCell]:bg-blue-50 dark:[&_.ProseMirror_.selectedCell]:bg-blue-900/30",
  // columns: side by side on a 24px gutter, a hairline between
  "[&_.ProseMirror_div[data-type=columns]]:my-2 [&_.ProseMirror_div[data-type=columns]]:grid [&_.ProseMirror_div[data-type=columns]]:gap-6",
  "[&_.ProseMirror_div[data-type=columns][data-count='2']]:grid-cols-2 [&_.ProseMirror_div[data-type=columns][data-count='3']]:grid-cols-3 [&_.ProseMirror_div[data-type=columns][data-count='4']]:grid-cols-4",
  "[&_.ProseMirror_div[data-type=column]]:min-w-0 [&_.ProseMirror_div[data-type=column]]:border-l [&_.ProseMirror_div[data-type=column]]:border-border [&_.ProseMirror_div[data-type=column]]:pl-3 [&_.ProseMirror_div[data-type=column]:first-child]:border-l-0 [&_.ProseMirror_div[data-type=column]:first-child]:pl-0",
  "[&_.ProseMirror_div[data-type=column]>*:first-child]:mt-0 [&_.ProseMirror_div[data-type=column]>*:last-child]:mb-0",
  "max-sm:[&_.ProseMirror_div[data-type=columns]]:grid-cols-1! max-sm:[&_.ProseMirror_div[data-type=column]]:border-l-0 max-sm:[&_.ProseMirror_div[data-type=column]]:pl-0",
  // attachments: a file chip a row each
  "[&_.ProseMirror_a[data-attachment]]:my-2 [&_.ProseMirror_a[data-attachment]]:flex [&_.ProseMirror_a[data-attachment]]:w-fit [&_.ProseMirror_a[data-attachment]]:cursor-default [&_.ProseMirror_a[data-attachment]]:items-center [&_.ProseMirror_a[data-attachment]]:gap-2.5 [&_.ProseMirror_a[data-attachment]]:text-foreground [&_.ProseMirror_a[data-attachment]]:no-underline [&_.ProseMirror_a[data-attachment]]:before:size-4 [&_.ProseMirror_a[data-attachment]]:before:shrink-0 [&_.ProseMirror_a[data-attachment]]:before:bg-current [&_.ProseMirror_a[data-attachment]]:before:[mask-image:url('data:image/svg+xml;utf8,%3Csvg%20xmlns=%22http://www.w3.org/2000/svg%22%20viewBox=%220%200%2024%2024%22%20fill=%22none%22%20stroke=%22black%22%20stroke-width=%222%22%20stroke-linecap=%22round%22%20stroke-linejoin=%22round%22%3E%3Cpath%20d=%22M15%202H6a2%202%200%200%200-2%202v16a2%202%200%200%200%202%202h12a2%202%200%200%200%202-2V7Z%22/%3E%3Cpath%20d=%22M14%202v4a2%202%200%200%200%202%202h4%22/%3E%3C/svg%3E')] [&_.ProseMirror_a[data-attachment]]:before:[mask-size:contain] [&_.ProseMirror_a[data-attachment]]:before:[mask-repeat:no-repeat] [&_.ProseMirror_a[data-attachment]]:before:content-['']",
  "[&_.ProseMirror_a[data-attachment].ProseMirror-selectednode]:rounded-md [&_.ProseMirror_a[data-attachment].ProseMirror-selectednode]:bg-secondary",
  // a callout: gray wash, 12px in, the emoji leading its first line
  "[&_.ProseMirror_div[data-type=callout]]:relative [&_.ProseMirror_div[data-type=callout]]:my-2 [&_.ProseMirror_div[data-type=callout]]:rounded-lg [&_.ProseMirror_div[data-type=callout]]:bg-input [&_.ProseMirror_div[data-type=callout]]:p-3 [&_.ProseMirror_div[data-type=callout]]:pl-11 [&_.ProseMirror_div[data-type=callout]]:before:absolute [&_.ProseMirror_div[data-type=callout]]:before:top-3 [&_.ProseMirror_div[data-type=callout]]:before:left-3 [&_.ProseMirror_div[data-type=callout]]:before:content-[attr(data-emoji)]",
  // a mention: gray chip, as the file marks a person
  "[&_.ProseMirror_.mention]:rounded-[4px] [&_.ProseMirror_.mention]:bg-secondary [&_.ProseMirror_.mention]:px-[3px] [&_.ProseMirror_.mention]:text-foreground",
  // audio and embeds
  "[&_.ProseMirror_audio]:my-2 [&_.ProseMirror_audio]:w-full [&_.ProseMirror_div[data-type=embed]]:my-2 [&_.ProseMirror_div[data-type=embed]_iframe]:aspect-video [&_.ProseMirror_div[data-type=embed]_iframe]:w-full [&_.ProseMirror_div[data-type=embed]_iframe]:rounded-lg [&_.ProseMirror_div[data-type=embed]_iframe]:border [&_.ProseMirror_div[data-type=embed]_iframe]:border-border-soft",
  // expand/collapse: the summary row with its turning chevron
  "[&_.ProseMirror_[data-type=details]]:my-1 [&_.ProseMirror_[data-type=details]]:flex [&_.ProseMirror_[data-type=details]]:gap-1 [&_.ProseMirror_[data-type=details]>button]:mt-1 [&_.ProseMirror_[data-type=details]>button]:flex [&_.ProseMirror_[data-type=details]>button]:size-5 [&_.ProseMirror_[data-type=details]>button]:shrink-0 [&_.ProseMirror_[data-type=details]>button]:cursor-pointer [&_.ProseMirror_[data-type=details]>button]:items-center [&_.ProseMirror_[data-type=details]>button]:justify-center [&_.ProseMirror_[data-type=details]>button]:rounded-sm [&_.ProseMirror_[data-type=details]>button]:text-muted-foreground [&_.ProseMirror_[data-type=details]>button:hover]:bg-secondary [&_.ProseMirror_[data-type=details]>button]:before:transition-transform [&_.ProseMirror_[data-type=details]>button]:before:content-['▸'] [&_.ProseMirror_[data-type=details][open]>button]:before:rotate-90",
  "[&_.ProseMirror_[data-type=details]>div]:min-w-0 [&_.ProseMirror_[data-type=details]>div]:flex-1 [&_.ProseMirror_[data-type=details]_summary]:cursor-pointer [&_.ProseMirror_[data-type=details]_summary]:list-none [&_.ProseMirror_[data-type=details]_summary]:font-medium [&_.ProseMirror_[data-type=details]_summary]:text-foreground [&_.ProseMirror_[data-type=details]_summary::-webkit-details-marker]:hidden"
)

interface RichTextEditorProps {
  /** what it opens with */
  content?: string
  editable?: boolean
  placeholder?: string
  className?: string
  onChange?: (html: string) => void
}

function RichTextEditor({
  content = "",
  editable = true,
  placeholder = "Type something, or press + for commands...",
  className,
  onChange,
}: RichTextEditorProps) {
  const editor = useEditor({
    immediatelyRender: false,
    editable,
    content,
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2, 3, 4, 5, 6] },
        link: { openOnClick: false },
      }),
      TextStyle,
      Color,
      FontFamily,
      FontSize,
      LineHeight,
      Highlight.configure({ multicolor: true }),
      Image,
      TaskList,
      TaskItem.configure({ nested: true }),
      TableKit.configure({ table: { resizable: true } }),
      TextAlign.configure({ types: ["paragraph", "heading"] }),
      Subscript,
      Superscript,
      Youtube.configure({ nocookie: true }),
      Columns,
      Column,
      Attachment,
      Callout,
      Audio,
      Embed,
      Details,
      DetailsSummary,
      // the source writes its content as div[data-type="details-content"]
      DetailsContent.extend({
        parseHTML() {
          return [
            { tag: 'div[data-type="details-content"]' },
            { tag: 'div[data-type="detailsContent"]' },
          ]
        },
      }),
      Mention.configure({
        HTMLAttributes: { class: "mention" },
        renderText: ({ node }) => `@${node.attrs.label ?? node.attrs.id}`,
        suggestion: {
          items: ({ query }) =>
            PEOPLE.filter((person) =>
              person.label.toLowerCase().startsWith(query.toLowerCase())
            ),
          command: ({ editor: ed, range, props }) =>
            ed
              .chain()
              .focus()
              .insertContentAt(range, [
                {
                  type: "mention",
                  attrs: { id: props.id, label: props.label },
                },
                { type: "text", text: " " },
              ])
              .run(),
          render: suggestionPopup,
        },
      }),
      SlashCommands,
      Placeholder.configure({ placeholder, showOnlyWhenEditable: false }),
    ],
    onUpdate: ({ editor: ed }) => onChange?.(ed.getHTML()),
  })

  React.useEffect(() => {
    editor?.setEditable(editable)
  }, [editor, editable])
  // only when the caller swaps the content in later — the first run would
  // re-set what the editor opened with, and leave the caret at the end of
  // the document instead of its start
  const contentSettled = React.useRef(false)
  React.useEffect(() => {
    if (!editor) return
    if (!contentSettled.current) {
      contentSettled.current = true
      return
    }
    if (content !== editor.getHTML()) {
      editor.commands.setContent(content)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [content, editor])

  return (
    <div
      data-slot="rich-text-editor"
      {...(!editable && { "data-readonly": "" })}
      className={cn(
        "mx-auto flex min-h-0 w-full max-w-[1300px] flex-col overflow-hidden rounded-2xl border border-border-soft bg-background",
        className
      )}
    >
      {editor && editable && <RichTextToolbar editor={editor} />}
      {editor && editable && <BlockHandle editor={editor} />}
      {editor && editable && <TableControls editor={editor} />}
      {editor && editable && (
        <BubbleMenu
          editor={editor}
          options={{ placement: "top", offset: 10 }}
          shouldShow={({ editor: ed, state, from, to }) => {
            const { selection } = state
            if (selection.empty || "node" in selection || !ed.isEditable)
              return false
            return state.doc.textBetween(from, to).length > 0
          }}
          className="z-60"
        >
          <SelectionBar editor={editor} />
        </BubbleMenu>
      )}
      <div className="min-h-0 flex-1 overflow-y-auto">
        <EditorContent
          editor={editor}
          className={cn(
            "mx-auto w-full max-w-[700px] px-4 py-8 sm:px-0",
            docClassName
          )}
        />
      </div>
    </div>
  )
}

export { RichTextEditor, type RichTextEditorProps }
