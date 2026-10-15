"use client"

// The document editor, after the branch's RichTextEditor.vue: the full
// fixed bar over a 700px document column, the block grips, the table
// controls, the column bar and the floating selection bar — all composed
// over the editor molecule's provider and RichTextKit.
//
// Figma: espresso-2.0 › WYSIWYG editor › toolbar (30534:59617). A 36px
// bar, 4px in, ruled beneath, its controls 28px on an 8px radius:
//   + ⌄ insert · Text ⌃ block style · Inter ⌄ font · − 14 + size ·
//   B I U S · A ⌃ colour │ code quote rule │ list ⌄ align ⌄ spacing ⌄
//   to-do indent │ link table ⌄ emoji ⌄ │ image ⌄ video ⌄ audio ⌄ file ⌄ │
//   highlight comment │ ⋯
import * as React from "react"
import type { Editor as TiptapEditor } from "@tiptap/core"
import { NodeSelection, TextSelection } from "@tiptap/pm/state"
import { useEditorState } from "@tiptap/react"
import { BubbleMenu } from "@tiptap/react/menus"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  EmojiPicker,
  EmojiPickerContent,
  EmojiPickerTrigger,
} from "@/components/ui/emoji-picker"
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
  ArrowUpIcon,
  CheckCircleIcon,
  CloseIcon,
  AlignCenterIcon,
  AlignJustifyIcon,
  AlignLeftIcon,
  AlignRightIcon,
  AudioWavesIcon,
  ClearFormattingIcon,
  CodeIcon,
  Comment1Icon,
  DividerIcon,
  DotHorizontalIcon,
  FileUploadIcon,
  Grid3Icon,
  GroupIcon,
  HighlightIcon,
  ImageIcon,
  LinkIcon,
  MarkBoldIcon,
  MarkItalicIcon,
  MarkStrikeIcon,
  MarkUnderlineIcon,
  MultipleListIcon,
  NumberedListIcon,
  QuoteIcon,
  SmallDownIcon,
  SmallRightIcon,
  SubscriptIcon,
  SuperscriptIcon,
  TableViewIcon,
  TextIcon,
  TodoIcon,
  VideoIcon,
} from "@/components/ui/rich-text-editor-icons"

import { EditorContent, EditorProvider } from "./core"
import { RichTextKit } from "./kit"
import { BlockHandle } from "./block-handle"
import { ColumnResizer } from "./column-resizer"
import { LinkClickCard } from "./link-card"
import { EditorStyles } from "./styles"
import { TableControls } from "./table-controls"
import {
  activeBlockOf,
  applyBlock,
  BLOCKS,
  DEFAULT_SIZE,
  FONTS,
  highlightValue,
  hue,
  PALETTE,
  textValue,
} from "./extensions"

/* ------------------------------- colour panel ------------------------------
 * Figma: espresso-2.0 › popover (31845:36005). The colour picker's card:
 * 8px in, two sections 16 apart, each a 13px gray-500 label, 8, then the
 * swatches — 24px, 6 apart, on an 8px radius, ruled in the colour's tint.
 * A text swatch is white with the A in the colour; a background swatch is
 * the colour's wash. Default unsets.
 */
function ColorPanel({
  editor,
  onPick,
}: {
  editor: TiptapEditor
  onPick: () => void
}) {
  const active = useEditorState({
    editor,
    selector: ({ editor: ed }) => ({
      text: (ed.getAttributes("textStyle").color as string) ?? null,
      highlight: (ed.getAttributes("highlight").color as string) ?? null,
    }),
  })
  const swatches = [null, ...PALETTE]
  const style = (name: string | null) =>
    name
      ? ({
          "--sw-ink": `var(--color-${hue(name)}-600)`,
          "--sw-line": `var(--color-${hue(name)}-200)`,
          "--sw-fill": `var(--color-${hue(name)}-50)`,
          "--sw-ink-dark": `var(--color-${hue(name)}-400)`,
          "--sw-line-dark": `var(--color-${hue(name)}-700)`,
          "--sw-fill-dark": `var(--color-${hue(name)}-900)`,
        } as React.CSSProperties)
      : undefined
  const label = (name: string | null) =>
    name ? name.charAt(0).toUpperCase() + name.slice(1) : "Default"
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
      className="rte-colors flex w-[190px] flex-col gap-4 rounded-xl border border-border-soft bg-card p-2 shadow-elevation-lg"
      role="group"
      aria-label="Text and background colour"
    >
      <section className="flex flex-col gap-2">
        <div className="text-sm leading-[15px] text-accent-foreground">
          Text color
        </div>
        <div className="grid grid-cols-6 gap-1.5">
          {swatches.map((name) => (
            <button
              key={name ?? "default"}
              type="button"
              className="rte-swatch"
              style={style(name)}
              aria-label={label(name)}
              title={label(name)}
              aria-pressed={
                name ? active?.text === textValue(name) : !active?.text
              }
              onClick={() => pickText(name)}
            >
              A
            </button>
          ))}
        </div>
      </section>
      <section className="flex flex-col gap-2">
        <div className="text-sm leading-[15px] text-accent-foreground">
          Background color
        </div>
        <div className="grid grid-cols-6 gap-1.5">
          {swatches.map((name) => (
            <button
              key={name ?? "default"}
              type="button"
              className="rte-swatch rte-swatch-fill"
              style={style(name)}
              aria-label={label(name)}
              title={label(name)}
              aria-pressed={
                name
                  ? active?.highlight === highlightValue(name)
                  : !active?.highlight
              }
              onClick={() => pickHighlight(name)}
            />
          ))}
        </div>
      </section>
    </div>
  )
}

/** the library's table-size picker: sweep the grid to the size */
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
const SPACINGS = ["1", "1.15", "1.5", "1.75", "2"] as const

function BarTooltip({
  label,
  children,
}: {
  label: string
  children: React.ReactElement
}) {
  return (
    <Tooltip>
      <TooltipTrigger render={children} />
      <TooltipContent>{label}</TooltipContent>
    </Tooltip>
  )
}

/* --------------------------------- toolbar --------------------------------- */

function RichTextToolbar({
  editor,
  disabled,
  onComment,
}: {
  editor: TiptapEditor
  disabled?: boolean
  onComment?: () => void
}) {
  // The editor opens with its caret at the top of the document, in the
  // title, which would name the style select "Heading 1" before anyone had
  // clicked into the page. Until the editor has been focused or its caret
  // moved, the select reads "Text".
  const [engaged, setEngaged] = React.useState(false)
  React.useEffect(() => {
    if (editor.isFocused) setEngaged(true)
    const engage = () => setEngaged(true)
    editor.on("focus", engage)
    editor.on("selectionUpdate", engage)
    return () => {
      editor.off("focus", engage)
      editor.off("selectionUpdate", engage)
    }
  }, [editor])

  const active = useEditorState({
    editor,
    selector: ({ editor: ed }) => ({
      block: activeBlockOf(ed),
      font:
        FONTS.find((f) => f.value === ed.getAttributes("textStyle").fontFamily)
          ?.label ?? "Inter",
      size: (() => {
        const raw = ed.getAttributes("textStyle").fontSize as
          | string
          | undefined
        const n = raw ? parseInt(raw, 10) : NaN
        return Number.isFinite(n) ? n : DEFAULT_SIZE
      })(),
      spacing:
        (ed.getAttributes("textStyle").lineHeight as string | undefined) ??
        null,
      bold: ed.isActive("bold"),
      italic: ed.isActive("italic"),
      underline: ed.isActive("underline"),
      strike: ed.isActive("strike"),
      code: ed.isActive("code"),
      quote: ed.isActive("blockquote"),
      bullet: ed.isActive("bulletList"),
      ordered: ed.isActive("orderedList"),
      todo: ed.isActive("taskList"),
      link: ed.isActive("link"),
      highlight: ed.isActive("highlight"),
      subscript: ed.isActive("subscript"),
      superscript: ed.isActive("superscript"),
      aligns: ALIGNS.map((a) => ed.isActive({ textAlign: a.value })),
      canIndent:
        ed.can().sinkListItem("listItem") || ed.can().sinkListItem("taskItem"),
    }),
  })
  // an insert with a node selected (a just-placed block) would be refused
  // by the toggles — step the caret past the node first
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

  const activeBlockLabel = engaged
    ? (BLOCKS.find((b) => b.value === active?.block)?.label ?? "Text")
    : "Text"

  const audioRef = React.useRef<HTMLInputElement>(null)
  const videoRef = React.useRef<HTMLInputElement>(null)
  const attachRef = React.useRef<HTMLInputElement>(null)

  // ---- media by URL: the modal with its title, the field, the action
  type UrlKind = "video" | "audio" | "file"
  const URL_TITLES: Record<UrlKind, string> = {
    video: "Insert video",
    audio: "Insert audio",
    file: "Attach file",
  }
  const [urlDialog, setUrlDialog] = React.useState<{
    kind: UrlKind
    url: string
    name: string
  } | null>(null)
  const insertUrl = () => {
    const d = urlDialog
    if (!d) return
    const url = d.url.trim()
    if (!url) return
    const c = chain()
    if (d.kind === "video") {
      if (/youtube\.com|youtu\.be/.test(url)) c.setYoutubeVideo({ src: url }).run()
      else c.insertContent({ type: "video", attrs: { src: url } }).run()
    } else if (d.kind === "audio")
      c.insertContent({ type: "audio", attrs: { src: url } }).run()
    else
      c
        .insertContent({
          type: "attachment",
          attrs: {
            href: url,
            fileName: d.name.trim() || url.split("/").pop() || "file",
          },
        })
        .run()
    setUrlDialog(null)
  }

  const takeFile =
    (insert: (file: File) => void) =>
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0]
      if (file) insert(file)
      event.target.value = ""
    }
  const asDataURL = (file: File, use: (src: string) => void) => {
    const reader = new FileReader()
    reader.onload = () => use(reader.result as string)
    reader.readAsDataURL(file)
  }

  const mediaMenu = (
    label: string,
    Icon: React.ComponentType<React.SVGProps<SVGSVGElement>>,
    kind: UrlKind,
    fromDisk: () => void
  ) => (
    <DropdownMenu>
      <DropdownMenuTrigger
        disabled={disabled}
        render={
          <button type="button" className="rte-select" aria-label={label}>
            <Icon className="size-4" />
            <SmallDownIcon className="size-4" />
          </button>
        }
      />
      <DropdownMenuContent align="start" sideOffset={4}>
        <DropdownMenuItem onClick={fromDisk}>
          Insert from computer
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => setUrlDialog({ kind, url: "", name: "" })}
        >
          Insert via URL
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )

  const imageColumnsItems = (close?: boolean) =>
    [1, 2, 3].map((n) => (
      <DropdownMenuItem
        key={n}
        onClick={() => chain().insertImageColumns(n).run()}
      >
        {n === 1 ? "1 column" : `${n} columns`}
      </DropdownMenuItem>
    ))

  const [tableMenuOpen, setTableMenuOpen] = React.useState(false)

  return (
    <TooltipProvider>
      <div
        role="toolbar"
        aria-label="Formatting"
        aria-disabled={disabled || undefined}
        data-slot="rich-text-editor-toolbar"
        className="rte-toolbar sticky top-0 z-10 flex h-9 shrink-0 items-center overflow-x-auto overflow-y-hidden border-b border-border-soft bg-background px-1"
      >
        {/* + insert */}
        <DropdownMenu>
          <DropdownMenuTrigger
            disabled={disabled}
            render={
              <button type="button" className="rte-select" aria-label="Insert">
                <AddIcon className="size-4" />
                <SmallDownIcon className="size-4" />
              </button>
            }
          />
          <DropdownMenuContent align="start" sideOffset={4}>
            <DropdownMenuGroup>
            <DropdownMenuLabel>Media</DropdownMenuLabel>
            <DropdownMenuItem onClick={() => chain().insertImageSlot().run()}>
              <ImageIcon className="size-4" /> Image
            </DropdownMenuItem>
            <DropdownMenuSub>
              <DropdownMenuSubTrigger>
                <Grid3Icon className="size-4" /> Image columns
              </DropdownMenuSubTrigger>
              <DropdownMenuSubContent>
                {imageColumnsItems()}
              </DropdownMenuSubContent>
            </DropdownMenuSub>
            <DropdownMenuItem onClick={() => videoRef.current?.click()}>
              <VideoIcon className="size-4" /> Video
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => audioRef.current?.click()}>
              <AudioWavesIcon className="size-4" /> Audio
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => attachRef.current?.click()}>
              <FileUploadIcon className="size-4" /> File
            </DropdownMenuItem>
            {/* the file's embed card, as /embed raises it — once the menu
                has shut: shutting, it hands focus back to its trigger, and
                the card, raised already, would take that as a press outside */}
            <DropdownMenuItem
              onClick={() =>
                setTimeout(() => chain().insertEmbedSlot().run(), 200)
              }
            >
              <GroupIcon className="size-4" /> Embed
            </DropdownMenuItem>
            </DropdownMenuGroup>
            <DropdownMenuSeparator />
            <DropdownMenuGroup>
            <DropdownMenuLabel>Blocks</DropdownMenuLabel>
            <DropdownMenuItem
              onClick={() =>
                chain()
                  .insertTable({ rows: 3, cols: 3, withHeaderRow: true })
                  .run()
              }
            >
              <TableViewIcon className="size-4" /> Table
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => chain().toggleCodeBlock().run()}>
              <CodeIcon className="size-4" /> Code block
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => chain().toggleBlockquote().run()}>
              <QuoteIcon className="size-4" /> Quote
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => chain().setHorizontalRule().run()}>
              <DividerIcon className="size-4" /> Divider
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => chain().setCallout().run()}>
              <QuoteIcon className="size-4" /> Callout
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => applyBlock(chain(), "details")}>
              <SmallRightIcon className="size-4" /> Toggle list
            </DropdownMenuItem>
            </DropdownMenuGroup>
            <DropdownMenuSeparator />
            <DropdownMenuGroup>
            <DropdownMenuLabel>Layout</DropdownMenuLabel>
            <DropdownMenuSub>
              <DropdownMenuSubTrigger>
                <Grid3Icon className="size-4" /> Columns
              </DropdownMenuSubTrigger>
              <DropdownMenuSubContent>
                {[2, 3, 4].map((n) => (
                  <DropdownMenuItem
                    key={n}
                    onClick={() => chain().insertColumns(n).run()}
                  >
                    {n} columns
                  </DropdownMenuItem>
                ))}
              </DropdownMenuSubContent>
            </DropdownMenuSub>
            </DropdownMenuGroup>
          </DropdownMenuContent>
        </DropdownMenu>

        {/* block style */}
        <DropdownMenu>
          <DropdownMenuTrigger
            disabled={disabled}
            render={
              <button
                type="button"
                className="rte-select"
                aria-label="Text style"
              >
                {/* every style's name laid in one cell, the others unseen,
                    so the select is as wide as the longest and the controls
                    after it hold still as the caret moves */}
                <span className="grid justify-items-start text-left text-base leading-4">
                  {BLOCKS.map((item) => (
                    <span
                      key={item.value}
                      aria-hidden={item.label !== activeBlockLabel || undefined}
                      className={cn(
                        "col-start-1 row-start-1 whitespace-nowrap",
                        item.label !== activeBlockLabel && "invisible"
                      )}
                    >
                      {item.label}
                    </span>
                  ))}
                </span>
                <SmallDownIcon className="size-4" />
              </button>
            }
          />
          <DropdownMenuContent align="start" sideOffset={4}>
            {BLOCKS.map((item) => (
              <DropdownMenuItem
                key={item.value}
                data-selected={
                  (engaged && active?.block === item.value) || undefined
                }
                className="data-selected:bg-secondary"
                onClick={() => applyBlock(chain(), item.value)}
              >
                <item.Icon className="size-4" />
                {item.label}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>

        {/* font */}
        <DropdownMenu>
          <DropdownMenuTrigger
            disabled={disabled}
            render={
              <button type="button" className="rte-select" aria-label="Font">
                <span className="grid justify-items-start text-left text-base leading-4">
                  {FONTS.map((font) => (
                    <span
                      key={font.label}
                      aria-hidden={font.label !== active?.font || undefined}
                      className={cn(
                        "col-start-1 row-start-1 whitespace-nowrap",
                        font.label !== active?.font && "invisible"
                      )}
                    >
                      {font.label}
                    </span>
                  ))}
                </span>
                <SmallDownIcon className="size-4" />
              </button>
            }
          />
          <DropdownMenuContent align="start" sideOffset={4}>
            {FONTS.map((font) => (
              <DropdownMenuItem
                key={font.label}
                data-selected={active?.font === font.label || undefined}
                className="data-selected:bg-secondary"
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
        <div
          className="flex h-7 shrink-0 items-center gap-1 p-0.5"
          aria-label="Font size"
        >
          <BarTooltip label="Smaller">
            <button
              type="button"
              className="rte-step"
              aria-label="Smaller text"
              disabled={disabled}
              onClick={() => {
                const next = Math.min(
                  72,
                  Math.max(8, (active?.size ?? DEFAULT_SIZE) - 1)
                )
                if (next === DEFAULT_SIZE) chain().unsetFontSize().run()
                else chain().setFontSize(`${next}px`).run()
              }}
            >
              <DividerIcon className="size-3.5" />
            </button>
          </BarTooltip>
          <span className="w-6 text-center text-base leading-4 text-secondary-foreground tabular-nums">
            {active?.size ?? DEFAULT_SIZE}
          </span>
          <BarTooltip label="Larger">
            <button
              type="button"
              className="rte-step"
              aria-label="Larger text"
              disabled={disabled}
              onClick={() => {
                const next = Math.min(
                  72,
                  Math.max(8, (active?.size ?? DEFAULT_SIZE) + 1)
                )
                if (next === DEFAULT_SIZE) chain().unsetFontSize().run()
                else chain().setFontSize(`${next}px`).run()
              }}
            >
              <AddIcon className="size-3.5" />
            </button>
          </BarTooltip>
        </div>

        {/* B I U S */}
        {(
          [
            ["Bold", MarkBoldIcon, active?.bold, () => chain().toggleBold()],
            [
              "Italic",
              MarkItalicIcon,
              active?.italic,
              () => chain().toggleItalic(),
            ],
            [
              "Underline",
              MarkUnderlineIcon,
              active?.underline,
              () => chain().toggleUnderline(),
            ],
            [
              "Strikethrough",
              MarkStrikeIcon,
              active?.strike,
              () => chain().toggleStrike(),
            ],
          ] as const
        ).map(([label, Icon, pressed, run]) => (
          <BarTooltip key={label} label={label}>
            <button
              type="button"
              className="rte-btn"
              aria-pressed={pressed}
              aria-label={label}
              disabled={disabled}
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => run().run()}
            >
              <Icon className="size-4" />
            </button>
          </BarTooltip>
        ))}

        {/* text colour: the A in a 24px outlined box, the chevron beside */}
        <ColorSelect editor={editor} disabled={disabled} />

        <span className="rte-tb-divider" aria-hidden="true" />

        {(
          [
            ["Code", CodeIcon, active?.code, () => chain().toggleCode()],
            [
              "Quote",
              QuoteIcon,
              active?.quote,
              () => chain().toggleBlockquote(),
            ],
            [
              "Divider",
              DividerIcon,
              false,
              () => chain().setHorizontalRule(),
            ],
          ] as const
        ).map(([label, Icon, pressed, run]) => (
          <BarTooltip key={label} label={label}>
            <button
              type="button"
              className="rte-btn"
              aria-pressed={pressed || undefined}
              aria-label={label}
              disabled={disabled}
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => run().run()}
            >
              <Icon className="size-4" />
            </button>
          </BarTooltip>
        ))}

        <span className="rte-tb-divider" aria-hidden="true" />

        {/* lists */}
        <DropdownMenu>
          <DropdownMenuTrigger
            disabled={disabled}
            render={
              <button type="button" className="rte-select" aria-label="Lists">
                <NumberedListIcon className="size-4" />
                <SmallDownIcon className="size-4" />
              </button>
            }
          />
          <DropdownMenuContent align="start" sideOffset={4}>
            <DropdownMenuItem
              data-selected={active?.bullet || undefined}
              className="data-selected:bg-secondary"
              onClick={() => chain().toggleBulletList().run()}
            >
              <MultipleListIcon className="size-4" /> Bulleted list
            </DropdownMenuItem>
            <DropdownMenuItem
              data-selected={active?.ordered || undefined}
              className="data-selected:bg-secondary"
              onClick={() => chain().toggleOrderedList().run()}
            >
              <NumberedListIcon className="size-4" /> Numbered list
            </DropdownMenuItem>
            <DropdownMenuItem
              data-selected={active?.todo || undefined}
              className="data-selected:bg-secondary"
              onClick={() => chain().toggleTaskList().run()}
            >
              <TodoIcon className="size-4" /> To-do list
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
        {/* alignment */}
        <DropdownMenu>
          <DropdownMenuTrigger
            disabled={disabled}
            render={
              <button
                type="button"
                className="rte-select"
                aria-label="Alignment"
              >
                <AlignLeftIcon className="size-4" />
                <SmallDownIcon className="size-4" />
              </button>
            }
          />
          <DropdownMenuContent align="start" sideOffset={4}>
            {ALIGNS.map((item, i) => (
              <DropdownMenuItem
                key={item.value}
                data-selected={active?.aligns[i] || undefined}
                className="data-selected:bg-secondary"
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
            render={
              <button
                type="button"
                className="rte-select"
                aria-label="Line spacing"
              >
                <AlignJustifyIcon className="size-4" />
                <SmallDownIcon className="size-4" />
              </button>
            }
          />
          <DropdownMenuContent align="start" sideOffset={4}>
            <DropdownMenuItem
              data-selected={!active?.spacing || undefined}
              className="data-selected:bg-secondary"
              onClick={() => chain().unsetLineHeight().run()}
            >
              Default
            </DropdownMenuItem>
            {SPACINGS.map((spacing) => (
              <DropdownMenuItem
                key={spacing}
                data-selected={active?.spacing === spacing || undefined}
                className="data-selected:bg-secondary"
                onClick={() => chain().setLineHeight(spacing).run()}
              >
                {spacing}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
        <BarTooltip label="To-do list">
          <button
            type="button"
            className="rte-btn"
            aria-pressed={active?.todo}
            aria-label="To-do list"
            disabled={disabled}
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => chain().toggleTaskList().run()}
          >
            <TodoIcon className="size-4" />
          </button>
        </BarTooltip>
        <BarTooltip label="Indent">
          <button
            type="button"
            className="rte-btn"
            aria-label="Indent"
            disabled={disabled || !active?.canIndent}
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => {
              if (!chain().sinkListItem("listItem").run())
                chain().sinkListItem("taskItem").run()
            }}
          >
            <GroupIcon className="size-4" />
          </button>
        </BarTooltip>

        <span className="rte-tb-divider" aria-hidden="true" />

        <BarTooltip label="Link">
          <button
            type="button"
            className="rte-btn"
            aria-pressed={active?.link}
            aria-label="Link"
            disabled={disabled}
            onClick={() => editor.commands.openLinkEditor()}
          >
            <LinkIcon className="size-4" />
          </button>
        </BarTooltip>
        {/* table */}
        <DropdownMenu open={tableMenuOpen} onOpenChange={setTableMenuOpen}>
          <DropdownMenuTrigger
            disabled={disabled}
            render={
              <button type="button" className="rte-select" aria-label="Table">
                <TableViewIcon className="size-4" />
                <SmallDownIcon className="size-4" />
              </button>
            }
          />
          <DropdownMenuContent align="start" sideOffset={4}>
            <TableSizeGrid
              onPick={(rows, cols) => {
                chain().insertTable({ rows, cols, withHeaderRow: true }).run()
                setTableMenuOpen(false)
              }}
            />
          </DropdownMenuContent>
        </DropdownMenu>
        {/* emoji */}
        <EmojiPicker
          onValueChange={(emoji) => chain().insertContent(emoji).run()}
        >
          <EmojiPickerTrigger
            render={
              <button
                type="button"
                aria-label="Emoji"
                disabled={disabled}
                className="rte-select"
              >
                <AddEmoji1Icon className="size-4" />
                <SmallDownIcon className="size-4" />
              </button>
            }
          />
          <EmojiPickerContent />
        </EmojiPicker>

        <span className="rte-tb-divider" aria-hidden="true" />

        {/* image: the slot, and the rows of slots */}
        <DropdownMenu>
          <DropdownMenuTrigger
            disabled={disabled}
            render={
              <button type="button" className="rte-select" aria-label="Image">
                <ImageIcon className="size-4" />
                <SmallDownIcon className="size-4" />
              </button>
            }
          />
          <DropdownMenuContent align="start" sideOffset={4}>
            <DropdownMenuItem onClick={() => chain().insertImageSlot().run()}>
              <ImageIcon className="size-4" /> Add image
            </DropdownMenuItem>
            <DropdownMenuSub>
              <DropdownMenuSubTrigger>
                <Grid3Icon className="size-4" /> Image columns
              </DropdownMenuSubTrigger>
              <DropdownMenuSubContent>
                {imageColumnsItems()}
              </DropdownMenuSubContent>
            </DropdownMenuSub>
          </DropdownMenuContent>
        </DropdownMenu>
        {mediaMenu("Video", VideoIcon, "video", () =>
          videoRef.current?.click()
        )}
        {mediaMenu("Audio", AudioWavesIcon, "audio", () =>
          audioRef.current?.click()
        )}
        {mediaMenu("File", FileUploadIcon, "file", () =>
          attachRef.current?.click()
        )}

        <span className="rte-tb-divider" aria-hidden="true" />

        <BarTooltip label="Highlight">
          <button
            type="button"
            className="rte-btn"
            aria-pressed={active?.highlight}
            aria-label="Highlight"
            disabled={disabled}
            onMouseDown={(e) => e.preventDefault()}
            onClick={() =>
              chain().toggleHighlight({ color: highlightValue("yellow") }).run()
            }
          >
            <HighlightIcon className="size-4" />
          </button>
        </BarTooltip>
        <BarTooltip label="Comment">
          <button
            type="button"
            className="rte-btn"
            aria-label="Comment"
            disabled={disabled}
            onClick={() => onComment?.()}
          >
            <Comment1Icon className="size-4" />
          </button>
        </BarTooltip>

        <span className="rte-tb-divider" aria-hidden="true" />

        {/* ⋯ overflow */}
        <DropdownMenu>
          <DropdownMenuTrigger
            disabled={disabled}
            render={
              <button type="button" aria-label="More" className="rte-btn">
                <DotHorizontalIcon className="size-4" />
              </button>
            }
          />
          <DropdownMenuContent align="end" sideOffset={4}>
            <DropdownMenuItem
              data-selected={active?.superscript || undefined}
              className="data-selected:bg-secondary"
              onClick={() => chain().toggleSuperscript().run()}
            >
              <SuperscriptIcon className="size-4" /> Superscript
            </DropdownMenuItem>
            <DropdownMenuItem
              data-selected={active?.subscript || undefined}
              className="data-selected:bg-secondary"
              onClick={() => chain().toggleSubscript().run()}
            >
              <SubscriptIcon className="size-4" /> Subscript
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => chain().unsetAllMarks().clearNodes().run()}
            >
              <ClearFormattingIcon className="size-4" /> Clear formatting
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        <input
          ref={videoRef}
          data-slot="rte-video-input"
          type="file"
          accept="video/*"
          className="hidden"
          onChange={takeFile((file) =>
            asDataURL(file, (src) =>
              chain()
                .insertContent({
                  type: "video",
                  attrs: { src, title: file.name },
                })
                .run()
            )
          )}
        />
        <input
          ref={audioRef}
          data-slot="rte-audio-input"
          type="file"
          accept="audio/*"
          className="hidden"
          onChange={takeFile((file) =>
            chain()
              .insertContent({
                type: "audio",
                attrs: { src: URL.createObjectURL(file), title: file.name },
              })
              .run()
          )}
        />
        <input
          ref={attachRef}
          data-slot="rte-attach-input"
          type="file"
          className="hidden"
          onChange={takeFile((file) =>
            asDataURL(file, (src) =>
              chain()
                .insertContent({
                  type: "attachment",
                  attrs: {
                    href: src,
                    fileName: file.name,
                    fileSize: file.size,
                    mimeType: file.type,
                  },
                })
                .run()
            )
          )}
        />

        {/* by URL: the modal with its title, the field, and the action */}
        <Dialog
          open={!!urlDialog}
          onOpenChange={(open) => !open && setUrlDialog(null)}
        >
          <DialogContent className="w-[360px]">
            <DialogHeader>
              <DialogTitle>
                {urlDialog ? URL_TITLES[urlDialog.kind] : ""}
              </DialogTitle>
            </DialogHeader>
            {urlDialog && (
              <form
                className="flex flex-col gap-3"
                onSubmit={(e) => {
                  e.preventDefault()
                  insertUrl()
                }}
              >
                <Input
                  autoFocus
                  placeholder="https://"
                  aria-label="URL"
                  value={urlDialog.url}
                  onChange={(e) =>
                    setUrlDialog({ ...urlDialog, url: e.target.value })
                  }
                />
                {urlDialog.kind === "file" && (
                  <Input
                    placeholder="report.pdf"
                    aria-label="File name"
                    value={urlDialog.name}
                    onChange={(e) =>
                      setUrlDialog({ ...urlDialog, name: e.target.value })
                    }
                  />
                )}
              </form>
            )}
            <DialogFooter>
              <Button
                className="w-full"
                disabled={!urlDialog?.url.trim()}
                onClick={insertUrl}
              >
                {urlDialog?.kind === "file" ? "Attach" : "Insert"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </TooltipProvider>
  )
}

/** the toolbar's colour select: the 24px outlined A, the chevron beside */
function ColorSelect({
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
        render={
          <button
            type="button"
            aria-label="Text colour"
            title="Text colour"
            onMouseDown={(event) => event.preventDefault()}
            className={cn("rte-select rte-select-tight", open && "is-open")}
          >
            <span>
              <TextIcon className="size-3.5" />
            </span>
            <SmallDownIcon className="size-4" />
          </button>
        }
      />
      <PopoverContent
        align="start"
        sideOffset={6}
        initialFocus={false}
        className="w-auto rounded-xl border-none bg-transparent p-0 shadow-none"
      >
        <ColorPanel editor={editor} onPick={() => setOpen(false)} />
      </PopoverContent>
    </Popover>
  )
}

/** the floating bar over a run of text, as the file draws it (35728:87337) */
function SelectionBar({ editor }: { editor: TiptapEditor }) {
  const active = useEditorState({
    editor,
    selector: ({ editor: ed }) => ({
      block: activeBlockOf(ed),
      bold: ed.isActive("bold"),
      italic: ed.isActive("italic"),
      underline: ed.isActive("underline"),
      strike: ed.isActive("strike"),
      link: ed.isActive("link"),
      coloured: !!ed.getAttributes("textStyle").color,
      highlighted: ed.isActive("highlight"),
      alignLeft: ed.isActive({ textAlign: "left" }),
      alignCenter: ed.isActive({ textAlign: "center" }),
      alignRight: ed.isActive({ textAlign: "right" }),
    }),
  })
  const [colorOpen, setColorOpen] = React.useState(false)
  const chain = () => editor.chain().focus()
  const block = BLOCKS.find((b) => b.value === active?.block) ?? BLOCKS[0]
  const button = (
    label: string,
    pressed: boolean | undefined,
    onClick: () => void,
    child: React.ReactNode
  ) => (
    <TooltipProvider key={label}>
      <Tooltip>
        <TooltipTrigger
          render={
            <button
              type="button"
              aria-label={label}
              aria-pressed={pressed}
              onMouseDown={(event) => event.preventDefault()}
              onClick={onClick}
              className="rte-bubble-btn"
            >
              {child}
            </button>
          }
        />
        <TooltipContent>{label}</TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
  return (
    <div className="rte-bubble" role="toolbar" aria-label="Text formatting">
      {/* the block style select: "Text ⌄", its 180px menu 10px beneath,
          flush with the bar's left edge */}
      <DropdownMenu>
        <DropdownMenuTrigger
          render={
            <button
              type="button"
              aria-label="Text style"
              className="rte-bubble-select"
            >
              <span className="text-sm leading-[15px] whitespace-nowrap">
                {block.label}
              </span>
              <SmallDownIcon className="size-3.5 shrink-0" />
            </button>
          }
        />
        <DropdownMenuContent
          align="start"
          sideOffset={10}
          className="w-[180px] rounded-[10px] shadow-elevation-xl"
        >
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

      {button("Bold", active?.bold, () => chain().toggleBold().run(), (
        <MarkBoldIcon className="size-3.5" />
      ))}
      {button("Italic", active?.italic, () => chain().toggleItalic().run(), (
        <MarkItalicIcon className="size-3.5" />
      ))}
      {button(
        "Underline",
        active?.underline,
        () => chain().toggleUnderline().run(),
        <MarkUnderlineIcon className="size-3.5" />
      )}
      {button(
        "Strikethrough",
        active?.strike,
        () => chain().toggleStrike().run(),
        <MarkStrikeIcon className="size-3.5" />
      )}
      {button("Link", active?.link, () => editor.commands.openLinkEditor(), (
        <LinkIcon className="size-3.5" />
      ))}

      {/* colour: the picker card on a popover */}
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger
            render={
              <span className="flex">
                <Popover open={colorOpen} onOpenChange={setColorOpen}>
                  <PopoverTrigger
                    render={
                      <button
                        type="button"
                        aria-label="Text colour"
                        aria-pressed={active?.coloured}
                        onMouseDown={(event) => event.preventDefault()}
                        className={cn("rte-bubble-btn", colorOpen && "is-open")}
                      >
                        <TextIcon className="size-3.5" />
                      </button>
                    }
                  />
                  <PopoverContent
                    align="start"
                    sideOffset={6}
                    initialFocus={false}
                    className="w-auto rounded-xl border-none bg-transparent p-0 shadow-none"
                  >
                    <ColorPanel
                      editor={editor}
                      onPick={() => setColorOpen(false)}
                    />
                  </PopoverContent>
                </Popover>
              </span>
            }
          />
          <TooltipContent>Text colour</TooltipContent>
        </Tooltip>
      </TooltipProvider>

      {/* highlight: a marker, so it reads apart from the colour's A */}
      {button(
        "Highlight",
        active?.highlighted,
        () =>
          chain().toggleHighlight({ color: highlightValue("yellow") }).run(),
        <HighlightIcon className="size-3.5" />
      )}

      <span className="rte-bubble-divider" aria-hidden="true" />

      {button(
        "Align left",
        active?.alignLeft,
        () => chain().setTextAlign("left").run(),
        <AlignLeftIcon className="size-3.5" />
      )}
      {button(
        "Align centre",
        active?.alignCenter,
        () => chain().setTextAlign("center").run(),
        <AlignCenterIcon className="size-3.5" />
      )}
      {button(
        "Align right",
        active?.alignRight,
        () => chain().setTextAlign("right").run(),
        <AlignRightIcon className="size-3.5" />
      )}
    </div>
  )
}

/* ---------------------------------- editor --------------------------------- */

// the document's typography: the prose at 15/1.6 and the file's headings —
// what the injected stylesheet (styles.tsx) does not already carry
const docClassName = cn(
  "[&_.ProseMirror]:min-h-60 [&_.ProseMirror]:text-[15px] [&_.ProseMirror]:leading-[1.6] [&_.ProseMirror]:whitespace-pre-wrap [&_.ProseMirror]:outline-none [&_.ProseMirror]:text-secondary-foreground",
  // placeholder
  "[&_.ProseMirror_p.is-editor-empty:first-child]:before:pointer-events-none [&_.ProseMirror_p.is-editor-empty:first-child]:before:float-left [&_.ProseMirror_p.is-editor-empty:first-child]:before:h-0 [&_.ProseMirror_p.is-editor-empty:first-child]:before:text-card-foreground [&_.ProseMirror_p.is-editor-empty:first-child]:before:content-[attr(data-placeholder)]",
  // headings: 28 down to 15 semibold
  "[&_.ProseMirror_h1]:mt-0 [&_.ProseMirror_h1]:mb-3 [&_.ProseMirror_h1]:text-[28px] [&_.ProseMirror_h1]:leading-[1.3] [&_.ProseMirror_h1]:font-semibold [&_.ProseMirror_h1]:text-foreground",
  "[&_.ProseMirror_h2]:mt-6 [&_.ProseMirror_h2]:mb-2 [&_.ProseMirror_h2]:text-2xl [&_.ProseMirror_h2]:leading-[1.3] [&_.ProseMirror_h2]:font-semibold [&_.ProseMirror_h2]:text-foreground",
  "[&_.ProseMirror_h3]:mt-6 [&_.ProseMirror_h3]:mb-2 [&_.ProseMirror_h3]:text-xl [&_.ProseMirror_h3]:leading-[1.35] [&_.ProseMirror_h3]:font-semibold [&_.ProseMirror_h3]:text-foreground",
  "[&_.ProseMirror_h4]:mt-6 [&_.ProseMirror_h4]:mb-2 [&_.ProseMirror_h4]:text-lg [&_.ProseMirror_h4]:leading-[1.35] [&_.ProseMirror_h4]:font-semibold [&_.ProseMirror_h4]:text-foreground",
  "[&_.ProseMirror_h5]:mt-6 [&_.ProseMirror_h5]:mb-2 [&_.ProseMirror_h5]:text-base [&_.ProseMirror_h5]:leading-[1.4] [&_.ProseMirror_h5]:font-semibold [&_.ProseMirror_h5]:text-foreground",
  "[&_.ProseMirror_h6]:mt-6 [&_.ProseMirror_h6]:mb-2 [&_.ProseMirror_h6]:text-[15px] [&_.ProseMirror_h6]:leading-[1.4] [&_.ProseMirror_h6]:font-semibold [&_.ProseMirror_h6]:text-foreground",
  // blocks
  "[&_.ProseMirror_ul:not([data-type=taskList])]:list-disc [&_.ProseMirror_ul]:my-1 [&_.ProseMirror_ul:not([data-type=taskList])]:pl-6 [&_.ProseMirror_ol]:my-1 [&_.ProseMirror_ol]:list-decimal [&_.ProseMirror_ol]:pl-6",
  "[&_.ProseMirror_blockquote]:my-2 [&_.ProseMirror_blockquote]:border-l-2 [&_.ProseMirror_blockquote]:border-border [&_.ProseMirror_blockquote]:pl-3 [&_.ProseMirror_blockquote]:text-muted-foreground",
  "[&_.ProseMirror_pre]:my-2 [&_.ProseMirror_pre]:rounded-lg [&_.ProseMirror_pre]:bg-input [&_.ProseMirror_pre]:p-3 [&_.ProseMirror_pre]:font-mono [&_.ProseMirror_pre]:text-sm [&_.ProseMirror_pre]:whitespace-pre-wrap [&_.ProseMirror_pre]:text-secondary-foreground",
  "[&_.ProseMirror_code:not(pre_code)]:rounded-sm [&_.ProseMirror_code:not(pre_code)]:bg-secondary [&_.ProseMirror_code:not(pre_code)]:px-1 [&_.ProseMirror_code:not(pre_code)]:py-0.5 [&_.ProseMirror_code:not(pre_code)]:font-mono [&_.ProseMirror_code:not(pre_code)]:text-[0.9em]",
  "[&_.ProseMirror_hr]:my-6 [&_.ProseMirror_hr]:w-full [&_.ProseMirror_hr]:border-border-soft",
  "[&_.ProseMirror_img]:max-w-full [&_.ProseMirror_img]:rounded-lg",
  "[&_.ProseMirror_iframe]:my-2 [&_.ProseMirror_iframe]:aspect-video [&_.ProseMirror_iframe]:w-full [&_.ProseMirror_iframe]:rounded-lg",
  // the to-do list drawn with the espresso Checkbox's own look
  "[&_.ProseMirror_ul[data-type=taskList]]:pl-0 [&_.ProseMirror_ul[data-type=taskList]_li]:flex [&_.ProseMirror_ul[data-type=taskList]_li]:items-start [&_.ProseMirror_ul[data-type=taskList]_li]:gap-2 [&_.ProseMirror_ul[data-type=taskList]_li>label]:mt-1 [&_.ProseMirror_ul[data-type=taskList]_li>div]:min-w-0 [&_.ProseMirror_ul[data-type=taskList]_li>div]:flex-1",
  "[&_.ProseMirror_ul[data-type=taskList]_input]:size-4 [&_.ProseMirror_ul[data-type=taskList]_input]:cursor-pointer [&_.ProseMirror_ul[data-type=taskList]_input]:appearance-none [&_.ProseMirror_ul[data-type=taskList]_input]:rounded-2xs [&_.ProseMirror_ul[data-type=taskList]_input]:border [&_.ProseMirror_ul[data-type=taskList]_input]:border-card-foreground [&_.ProseMirror_ul[data-type=taskList]_input]:bg-background [&_.ProseMirror_ul[data-type=taskList]_input]:transition-all [&_.ProseMirror_ul[data-type=taskList]_input]:duration-[250ms] [&_.ProseMirror_ul[data-type=taskList]_input:not(:checked):hover]:border-accent-foreground [&_.ProseMirror_ul[data-type=taskList]_input:not(:checked):hover]:shadow-elevation-sm [&_.ProseMirror_ul[data-type=taskList]_input:active]:scale-[0.97]",
  "[&_.ProseMirror_ul[data-type=taskList]_input:checked]:border-transparent [&_.ProseMirror_ul[data-type=taskList]_input:checked]:bg-primary [&_.ProseMirror_ul[data-type=taskList]_input:checked]:bg-[url('data:image/svg+xml;utf8,%3Csvg%20xmlns=%22http://www.w3.org/2000/svg%22%20viewBox=%220%200%2024%2024%22%20fill=%22none%22%20stroke=%22%23FFFFFF%22%20stroke-width=%223.5%22%20stroke-linecap=%22round%22%20stroke-linejoin=%22round%22%3E%3Cpath%20d=%22M20%206%209%2017l-5-5%22/%3E%3C/svg%3E')] [&_.ProseMirror_ul[data-type=taskList]_input:checked]:bg-size-[12px] [&_.ProseMirror_ul[data-type=taskList]_input:checked]:bg-center [&_.ProseMirror_ul[data-type=taskList]_input:checked]:bg-no-repeat [&_.ProseMirror_ul[data-type=taskList]_input:checked:hover]:bg-primary/86",
  "dark:[&_.ProseMirror_ul[data-type=taskList]_input:checked]:bg-[url('data:image/svg+xml;utf8,%3Csvg%20xmlns=%22http://www.w3.org/2000/svg%22%20viewBox=%220%200%2024%2024%22%20fill=%22none%22%20stroke=%22%23171717%22%20stroke-width=%223.5%22%20stroke-linecap=%22round%22%20stroke-linejoin=%22round%22%3E%3Cpath%20d=%22M20%206%209%2017l-5-5%22/%3E%3C/svg%3E')]",
  // an embed: its frame in the platform's shape
  "[&_.ProseMirror_div[data-type=embed]]:my-2 [&_.ProseMirror_div[data-type=embed]_iframe]:aspect-video [&_.ProseMirror_div[data-type=embed]_iframe]:w-full [&_.ProseMirror_div[data-type=embed]_iframe]:rounded-lg [&_.ProseMirror_div[data-type=embed]_iframe]:border [&_.ProseMirror_div[data-type=embed]_iframe]:border-border-soft",
  "[&_.ProseMirror_video]:my-2 [&_.ProseMirror_video]:w-full [&_.ProseMirror_video]:rounded-lg"
)

export interface CommentReply {
  who: string
  image?: string
  when: string
  text: string
}
export interface CommentThread {
  id: string
  replies: CommentReply[]
}

export interface RichTextEditorProps {
  /** what it opens with */
  content?: string
  editable?: boolean
  placeholder?: string
  className?: string
  onChange?: (html: string) => void
  /** the threads the document opens with, one per amber comment run */
  initialComments?: CommentThread[]
  /** who a sent reply is from */
  commenter?: { who: string; image?: string }
}

export function RichTextEditor({
  content = "",
  editable = true,
  placeholder = "Type / for blocks, @ to mention...",
  className,
  onChange,
  initialComments,
  commenter,
}: RichTextEditorProps) {
  // ---- comments: a thread per amber run, shown beside the selection
  const [threads, setThreads] = React.useState<CommentThread[]>(
    () => initialComments ?? []
  )
  const [openThread, setOpenThread] = React.useState<string | null>(null)
  const [threadTop, setThreadTop] = React.useState(0)
  const [reply, setReply] = React.useState("")
  const stageRef = React.useRef<HTMLDivElement>(null)
  const editorRef = React.useRef<TiptapEditor | null>(null)

  const show = React.useCallback((id: string) => {
    setOpenThread(id)
    requestAnimationFrame(() => {
      const stage = stageRef.current
      const el = stage?.querySelector<HTMLElement>(`[data-comment="${id}"]`)
      const box = stage?.getBoundingClientRect()
      if (el && box)
        setThreadTop(el.getBoundingClientRect().top - box.top)
    })
  }, [])
  const comment = React.useCallback(() => {
    const ed = editorRef.current
    if (!ed) return
    const existing = ed.getAttributes("comment").id as string | undefined
    if (existing) {
      show(existing)
      return
    }
    if (ed.state.selection.empty) return
    const id = `c${Date.now()}`
    ed.chain().focus().setComment(id).run()
    setThreads((t) => [...t, { id, replies: [] }])
    show(id)
  }, [show])
  const onEditorClick = (e: React.MouseEvent) => {
    const run = (e.target as HTMLElement).closest<HTMLElement>(
      "[data-comment]"
    )
    if (run && run.dataset.comment) show(run.dataset.comment)
    else setOpenThread(null)
  }
  const current = threads.find((t) => t.id === openThread)
  const send = () => {
    const text = reply.trim()
    if (!current || !text) return
    setThreads((all) =>
      all.map((t) =>
        t.id === current.id
          ? {
              ...t,
              replies: [
                ...t.replies,
                {
                  who: commenter?.who ?? "You",
                  image: commenter?.image,
                  when: "now",
                  text,
                },
              ],
            }
          : t
      )
    )
    setReply("")
  }
  const resolve = () => {
    const ed = editorRef.current
    if (!current || !ed) return
    // the run goes with the thread
    ed.state.doc.descendants((node, pos) => {
      const mark = node.marks.find(
        (m) => m.type.name === "comment" && m.attrs.id === current.id
      )
      if (mark)
        ed.chain()
          .setTextSelection({ from: pos, to: pos + node.nodeSize })
          .unsetComment()
          .run()
    })
    setThreads((all) => all.filter((x) => x.id !== current.id))
    setOpenThread(null)
  }

  return (
    <EditorProvider
      extensions={[RichTextKit.configure({ placeholder: { placeholder } })]}
      content={content}
      editable={editable}
      onUpdate={onChange}
      deps={[placeholder]}
    >
      {(editor) => {
        editorRef.current = editor
        return (
          <div
            ref={stageRef}
            data-slot="rich-text-editor"
            {...(!editable && { "data-readonly": "" })}
            className={cn(
              "rte relative flex min-h-0 w-full max-w-[1300px] min-w-0 flex-col overflow-hidden rounded-2xl border border-border-soft bg-background",
              !editable && "is-readonly",
              className
            )}
          >
            <EditorStyles />
            {editor && editable && (
              <RichTextToolbar editor={editor} onComment={comment} />
            )}
            {editor && editable && <BlockHandle editor={editor} />}
            {editor && editable && <TableControls editor={editor} />}
            {editor && editable && <ColumnResizer editor={editor} />}
            {editor && editable && <LinkClickCard editor={editor} />}
            {editor && editable && (
              <BubbleMenu
                editor={editor}
                options={{ placement: "top" }}
                shouldShow={({ editor: ed, state, from, to }) => {
                  const { selection } = state
                  if (selection.empty || "node" in selection || !ed.isEditable)
                    return false
                  // a selected row, column or run of cells has the table's
                  // own menus
                  if ("$anchorCell" in selection) return false
                  return state.doc.textBetween(from, to).length > 0
                }}
                className="z-60"
              >
                <SelectionBar editor={editor} />
              </BubbleMenu>
            )}
            <div className="min-h-0 flex-1 overflow-y-auto">
              <div className="px-4 py-8 sm:px-8" onClick={onEditorClick}>
                <EditorContent
                  editor={editor}
                  className={cn(
                    "rte-doc mx-auto w-full max-w-[700px]",
                    docClassName
                  )}
                />
              </div>
            </div>

            {/* the thread beside the run: the file's comment card —
                300px on a 12px radius under the xl shadow, a 32px header
                ruled beneath, a reply per 24px avatar, the reply field */}
            {current && (
              <div
                className="rte-thread absolute right-6 z-20 flex w-[300px] flex-col gap-3.5 rounded-xl bg-card pb-2.5 shadow-elevation-xl dark:[--background:var(--card)]"
                style={{ top: Math.max(48, threadTop - 8) }}
                role="dialog"
                aria-label="Comment thread"
              >
                {/* 32px: 10 in, the title, three 24px controls, 4 out */}
                <div className="rte-thread-head flex h-8 items-center py-1 pr-1 pl-2.5">
                  <span className="flex-1 text-sm leading-4 font-medium text-accent-foreground">
                    Comment
                  </span>
                  <button
                    type="button"
                    className="rte-thread-btn"
                    aria-label="More"
                    title="More"
                  >
                    <DotHorizontalIcon className="size-3.5" />
                  </button>
                  <button
                    type="button"
                    className="rte-thread-btn"
                    aria-label="Resolve"
                    title="Resolve"
                    onClick={resolve}
                  >
                    <CheckCircleIcon className="size-3.5" />
                  </button>
                  <button
                    type="button"
                    className="rte-thread-btn"
                    aria-label="Close"
                    title="Close"
                    onClick={() => setOpenThread(null)}
                  >
                    <CloseIcon className="size-3.5" />
                  </button>
                </div>

                <div className="flex flex-col gap-2.5 px-2.5">
                  <div className="flex flex-col gap-3.5">
                    {/* a reply: the avatar, 8, name · when over the text */}
                    {current.replies.map((r, i) => (
                      <div key={i} className="flex items-start gap-2">
                        {r.image ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={r.image}
                            alt=""
                            className="size-6 shrink-0 rounded-full object-cover"
                          />
                        ) : (
                          <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-secondary text-[10px] font-medium text-secondary-foreground">
                            {r.who.charAt(0)}
                          </span>
                        )}
                        <div className="flex min-w-0 flex-1 flex-col gap-1">
                          <p className="flex items-baseline gap-1">
                            <span className="truncate text-sm leading-4 font-medium text-secondary-foreground">
                              {r.who}
                            </span>
                            <span className="shrink-0 text-sm leading-[15px] text-accent-foreground">
                              · {r.when}
                            </span>
                          </p>
                          <p className="text-base text-muted-foreground">
                            {r.text}
                          </p>
                        </div>
                        <button
                          type="button"
                          className="flex size-4 shrink-0 items-center justify-center text-accent-foreground"
                          aria-label="More"
                          title="More"
                        >
                          <DotHorizontalIcon className="size-4" />
                        </button>
                      </div>
                    ))}
                    {!current.replies.length && (
                      <p className="text-base text-accent-foreground">
                        Start the thread.
                      </p>
                    )}
                  </div>

                  {/* the reply field: 24px avatar, 8, the subtle input */}
                  <form
                    className="flex items-center gap-2"
                    onSubmit={(e) => {
                      e.preventDefault()
                      send()
                    }}
                  >
                    {commenter?.image ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={commenter.image}
                        alt=""
                        className="size-6 shrink-0 rounded-full object-cover"
                      />
                    ) : (
                      <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-secondary text-[10px] font-medium text-secondary-foreground">
                        {(commenter?.who ?? "You").charAt(0)}
                      </span>
                    )}
                    <div className="relative min-w-0 flex-1">
                      <Input
                        size="sm"
                        variant="subtle"
                        className="w-full pr-7"
                        placeholder="Reply"
                        aria-label="Reply"
                        value={reply}
                        onChange={(e) => setReply(e.target.value)}
                      />
                      <button
                        type="submit"
                        className="absolute top-1/2 right-1.5 flex size-4 -translate-y-1/2 items-center justify-center text-secondary-foreground"
                        aria-label="Send"
                      >
                        <ArrowUpIcon className="size-4" />
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            )}
          </div>
        )
      }}
    </EditorProvider>
  )
}
