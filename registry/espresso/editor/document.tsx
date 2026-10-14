"use client"

// The document editor, after the branch's RichTextEditor.vue: the full
// fixed bar over a 700px document column, the block grips, the table
// controls and the floating selection bar — all composed over the editor
// molecule's provider and RichTextKit.
import * as React from "react"
import type { ChainedCommands, Editor as TiptapEditor } from "@tiptap/core"
import { NodeSelection, TextSelection } from "@tiptap/pm/state"
import { useEditorState } from "@tiptap/react"
import { BubbleMenu } from "@tiptap/react/menus"
import { createPortal } from "react-dom"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
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
  AlignCenterIcon,
  AlignJustifyIcon,
  AlignLeftIcon,
  AlignRightIcon,
  AudioWavesIcon,
  ClearFormattingIcon,
  CodeIcon,
  DividerIcon,
  DotHorizontalIcon,
  FileUploadIcon,
  GroupIcon,
  ImageIcon,
  HighlightIcon,
  LinkIcon,
  MarkBoldIcon,
  MarkItalicIcon,
  MarkStrikeIcon,
  MarkUnderlineIcon,
  MultipleListIcon,
  NumberedListIcon,
  QuoteIcon,
  SmallDownIcon,
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
  SPACINGS,
  textValue,
} from "./extensions"

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
  const videoRef = React.useRef<HTMLInputElement>(null)
  const insertVideoFile = (file: File | undefined) => {
    if (!file) return
    const reader = new FileReader()
    reader.onload = () =>
      chain()
        .insertContent({
          type: "video",
          attrs: { src: reader.result as string, title: file.name },
        })
        .run()
    reader.readAsDataURL(file)
  }
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
          <MarkBoldIcon className="size-4" />
        </Control>
        <Control label="Italic" pressed={active?.italic} disabled={disabled} onClick={() => chain().toggleItalic().run()}>
          <MarkItalicIcon className="size-4" />
        </Control>
        <Control label="Underline" pressed={active?.underline} disabled={disabled} onClick={() => chain().toggleUnderline().run()}>
          <MarkUnderlineIcon className="size-4" />
        </Control>
        <Control label="Strikethrough" pressed={active?.strike} disabled={disabled} onClick={() => chain().toggleStrike().run()}>
          <MarkStrikeIcon className="size-4" />
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
                <DropdownMenuItem
                  disabled={!editor.can().mergeCells()}
                  onClick={() => chain().mergeCells().run()}
                >
                  Merge cells
                </DropdownMenuItem>
                <DropdownMenuItem
                  disabled={!editor.can().splitCell()}
                  onClick={() => chain().splitCell().run()}
                >
                  Split cell
                </DropdownMenuItem>
                <DropdownMenuSeparator />
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
            { label: "Image", Icon: ImageIcon, items: [
              { label: "Add image", run: () => fileRef.current?.click() },
              { label: "From URL", run: () => {
                const src = window.prompt("Image URL")
                if (src) chain().setImage({ src }).run()
              } },
            ] },
            { label: "Video", Icon: VideoIcon, items: [
              { label: "Add video", run: () => videoRef.current?.click() },
              { label: "From YouTube URL", run: insertVideo },
            ] },
            { label: "Audio", Icon: AudioWavesIcon, items: [{ label: "Add audio", run: () => audioRef.current?.click() }] },
            { label: "File", Icon: FileUploadIcon, items: [{ label: "Add file", run: () => attachRef.current?.click() }] },
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
          data-slot="rte-image-input"
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(event) => {
            insertImage(event.target.files?.[0])
            event.target.value = ""
          }}
        />
        <input
          ref={videoRef}
          data-slot="rte-video-input"
          type="file"
          accept="video/*"
          className="hidden"
          onChange={(event) => {
            insertVideoFile(event.target.files?.[0])
            event.target.value = ""
          }}
        />
        <input
          ref={audioRef}
          data-slot="rte-audio-input"
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
          data-slot="rte-attach-input"
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
            className={controlClass}
          >
            <TextIcon />
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


/** the floating bar over a run of text, as the file draws it: the block
 * style's select, the marks, link, colour and highlight, then the aligns */
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
  const bubbleBtn =
    "flex size-6 shrink-0 cursor-pointer items-center justify-center rounded-lg text-secondary-foreground transition-colors hover:bg-secondary aria-pressed:bg-secondary data-popup-open:bg-secondary"
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
              className={bubbleBtn}
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
    <div
      role="toolbar"
      aria-label="Text formatting"
      className="flex h-7 items-center rounded-[10px] bg-card p-0.5 shadow-elevation-md"
    >
      {/* the block style select, its 180px menu beneath */}
      <DropdownMenu>
        <DropdownMenuTrigger
          render={
            <button
              type="button"
              aria-label="Text style"
              className="flex h-6 min-w-[100px] shrink-0 cursor-pointer items-center justify-between gap-1 rounded-[6px] py-1 pr-1 pl-1.5 text-secondary-foreground transition-colors hover:bg-secondary data-popup-open:bg-secondary"
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
          className="w-[180px]"
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

      {button("Bold", active?.bold, () => chain().toggleBold().run(), <MarkBoldIcon className="size-3.5" />)}
      {button("Italic", active?.italic, () => chain().toggleItalic().run(), <MarkItalicIcon className="size-3.5" />)}
      {button("Underline", active?.underline, () => chain().toggleUnderline().run(), <MarkUnderlineIcon className="size-3.5" />)}
      {button("Strikethrough", active?.strike, () => chain().toggleStrike().run(), <MarkStrikeIcon className="size-3.5" />)}
      {button("Link", active?.link, () => {
        if (editor.isActive("link")) {
          chain().extendMarkRange("link").unsetLink().run()
          return
        }
        const href = window.prompt("Link URL")
        if (href) chain().extendMarkRange("link").setLink({ href }).run()
      }, <LinkIcon className="size-3.5" />)}

      {/* colour: the picker card on a popover */}
      <Popover open={colorOpen} onOpenChange={setColorOpen}>
        <PopoverTrigger
          className={undefined}
          render={
            <button
              type="button"
              aria-label="Text colour"
              aria-pressed={active?.coloured}
              onMouseDown={(event) => event.preventDefault()}
              className={bubbleBtn}
            >
              <TextIcon className="size-3.5" />
            </button>
          }
        />
        <PopoverContent align="start" sideOffset={6} className="w-auto p-2">
          <ColorPanel editor={editor} onPick={() => setColorOpen(false)} />
        </PopoverContent>
      </Popover>

      {/* highlight: a marker, so it reads apart from the colour's A */}
      {button("Highlight", active?.highlighted, () =>
        chain().toggleHighlight({ color: highlightValue("yellow") }).run(),
        <HighlightIcon className="size-3.5" />)}

      <span
        aria-hidden="true"
        className="mx-1 h-4 w-px shrink-0 bg-border-soft"
      />

      {button("Align left", active?.alignLeft, () => chain().setTextAlign("left").run(), <AlignLeftIcon className="size-3.5" />)}
      {button("Align centre", active?.alignCenter, () => chain().setTextAlign("center").run(), <AlignCenterIcon className="size-3.5" />)}
      {button("Align right", active?.alignRight, () => chain().setTextAlign("right").run(), <AlignRightIcon className="size-3.5" />)}
    </div>
  )
}


/** the popup over a clicked link: open it, change it, or take it off */
function LinkClickPopup({ editor }: { editor: TiptapEditor }) {
  const [panel, setPanel] = React.useState<{
    x: number
    y: number
    href: string
    pos: number
  } | null>(null)
  React.useEffect(() => {
    const dom = editor.view.dom
    const onClick = (event: MouseEvent) => {
      const target = event.target instanceof Element ? event.target : null
      const link = target?.closest?.("a[href]:not([data-attachment])")
      if (!link || !dom.contains(link)) {
        setPanel(null)
        return
      }
      event.preventDefault()
      const rect = link.getBoundingClientRect()
      let pos: number | null = null
      try {
        pos = editor.view.posAtDOM(link, 0)
      } catch {
        pos = null
      }
      if (pos === null) return
      setPanel({
        x: rect.left,
        y: rect.bottom + 6,
        href: link.getAttribute("href") ?? "",
        pos,
      })
    }
    dom.addEventListener("click", onClick)
    return () => dom.removeEventListener("click", onClick)
  }, [editor])
  React.useEffect(() => {
    if (!panel) return
    const close = (event: KeyboardEvent) => {
      if (event.key === "Escape") setPanel(null)
    }
    window.addEventListener("keydown", close)
    return () => window.removeEventListener("keydown", close)
  }, [panel])
  if (!panel) return null
  const onLink = (edit: (chain: ChainedCommands) => ChainedCommands) => {
    const tr = editor.view.state.tr.setSelection(
      TextSelection.create(editor.view.state.doc, panel.pos + 1)
    )
    editor.view.dispatch(tr)
    edit(editor.chain().focus().extendMarkRange("link")).run()
    setPanel(null)
  }
  return createPortal(
    <div
      data-slot="rich-text-editor-link-popup"
      className="fixed z-70 flex max-w-96 items-center gap-1 rounded-xl border border-border-soft bg-card p-1.5 shadow-elevation-lg"
      style={{ left: panel.x, top: panel.y }}
    >
      <span className="min-w-0 flex-1 truncate px-1 text-sm text-secondary-foreground">
        {panel.href}
      </span>
      <Button
        size="xs"
        variant="ghost"
        onClick={() => window.open(panel.href, "_blank", "noopener")}
      >
        Open
      </Button>
      <Button
        size="xs"
        variant="ghost"
        onClick={() => {
          const href = window.prompt("Link URL", panel.href)
          if (href) onLink((chain) => chain.setLink({ href }))
        }}
      >
        Edit
      </Button>
      <Button
        size="xs"
        variant="ghost"
        onClick={() => onLink((chain) => chain.unsetLink())}
      >
        Remove
      </Button>
    </div>,
    document.body
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
  // tables as the file draws them: the card is the table's viewport — a
  // 1px rule on a 12px radius, a table grown past it scrolls inside it —
  // and inside, a gray-100 grid whose outer rules the card draws
  "[&_.ProseMirror_.tableWrapper]:my-4 [&_.ProseMirror_.tableWrapper]:overflow-x-auto [&_.ProseMirror_.tableWrapper]:overflow-y-hidden [&_.ProseMirror_.tableWrapper]:rounded-xl [&_.ProseMirror_.tableWrapper]:border [&_.ProseMirror_.tableWrapper]:border-border-soft",
  "[&_.ProseMirror_table]:m-0 [&_.ProseMirror_table]:w-full [&_.ProseMirror_table]:min-w-full [&_.ProseMirror_table]:border-separate [&_.ProseMirror_table]:border-spacing-0 [&_.ProseMirror_table]:text-base [&_.ProseMirror_table]:leading-[21px]",
  "[&_.ProseMirror_td]:h-10 [&_.ProseMirror_td]:border-0 [&_.ProseMirror_td]:border-r [&_.ProseMirror_td]:border-b [&_.ProseMirror_td]:border-border-soft [&_.ProseMirror_td]:bg-transparent [&_.ProseMirror_td]:px-2 [&_.ProseMirror_td]:py-1.5 [&_.ProseMirror_td]:text-left [&_.ProseMirror_td]:align-middle",
  "[&_.ProseMirror_th]:h-8 [&_.ProseMirror_th]:border-0 [&_.ProseMirror_th]:border-r [&_.ProseMirror_th]:border-b [&_.ProseMirror_th]:border-border-soft [&_.ProseMirror_th]:bg-transparent [&_.ProseMirror_th]:px-2 [&_.ProseMirror_th]:py-1.5 [&_.ProseMirror_th]:text-left [&_.ProseMirror_th]:align-middle [&_.ProseMirror_th]:font-normal",
  "[&_.ProseMirror_tr>*:last-child]:border-r-0 [&_.ProseMirror_tr:last-child>*]:border-b-0",
  "[&_.ProseMirror_td_p]:text-base [&_.ProseMirror_td_p]:leading-[21px] [&_.ProseMirror_td_p]:text-secondary-foreground [&_.ProseMirror_th_p]:text-[13px] [&_.ProseMirror_th_p]:leading-[15px] [&_.ProseMirror_th_p]:text-muted-foreground",
  "[&_.ProseMirror_.selectedCell]:bg-blue-50 dark:[&_.ProseMirror_.selectedCell]:bg-blue-900/30",
  // a block picked up by its grip, or selected by a click on it: a
  // gray-100 ground 4px past its edges
  "[&_.ProseMirror_.ProseMirror-selectednode:not(img)]:rounded-[4px] [&_.ProseMirror_.ProseMirror-selectednode:not(img)]:bg-secondary [&_.ProseMirror_.ProseMirror-selectednode:not(img)]:shadow-[0_0_0_4px_var(--secondary)]",
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
  "[&_.ProseMirror_video]:my-2 [&_.ProseMirror_video]:w-full [&_.ProseMirror_video]:rounded-lg [&_.ProseMirror_audio]:my-2 [&_.ProseMirror_audio]:w-full [&_.ProseMirror_div[data-type=embed]]:my-2 [&_.ProseMirror_div[data-type=embed]_iframe]:aspect-video [&_.ProseMirror_div[data-type=embed]_iframe]:w-full [&_.ProseMirror_div[data-type=embed]_iframe]:rounded-lg [&_.ProseMirror_div[data-type=embed]_iframe]:border [&_.ProseMirror_div[data-type=embed]_iframe]:border-border-soft",
  // expand/collapse: the summary row with its turning chevron
  "[&_.ProseMirror_[data-type=details]]:my-1 [&_.ProseMirror_[data-type=details]]:flex [&_.ProseMirror_[data-type=details]]:gap-1 [&_.ProseMirror_[data-type=details]>button]:mt-1 [&_.ProseMirror_[data-type=details]>button]:flex [&_.ProseMirror_[data-type=details]>button]:size-5 [&_.ProseMirror_[data-type=details]>button]:shrink-0 [&_.ProseMirror_[data-type=details]>button]:cursor-pointer [&_.ProseMirror_[data-type=details]>button]:items-center [&_.ProseMirror_[data-type=details]>button]:justify-center [&_.ProseMirror_[data-type=details]>button]:rounded-sm [&_.ProseMirror_[data-type=details]>button]:text-muted-foreground [&_.ProseMirror_[data-type=details]>button:hover]:bg-secondary [&_.ProseMirror_[data-type=details]>button]:before:transition-transform [&_.ProseMirror_[data-type=details]>button]:before:content-['▸'] [&_.ProseMirror_[data-type=details][open]>button]:before:rotate-90",
  "[&_.ProseMirror_[data-type=details]>div]:min-w-0 [&_.ProseMirror_[data-type=details]>div]:flex-1 [&_.ProseMirror_[data-type=details]_summary]:cursor-pointer [&_.ProseMirror_[data-type=details]_summary]:list-none [&_.ProseMirror_[data-type=details]_summary]:font-medium [&_.ProseMirror_[data-type=details]_summary]:text-foreground [&_.ProseMirror_[data-type=details]_summary::-webkit-details-marker]:hidden"
)

export interface RichTextEditorProps {
  /** what it opens with */
  content?: string
  editable?: boolean
  placeholder?: string
  className?: string
  onChange?: (html: string) => void
}

export function RichTextEditor({
  content = "",
  editable = true,
  placeholder = "Type something, or press + for commands...",
  className,
  onChange,
}: RichTextEditorProps) {
  return (
    <EditorProvider
      extensions={[RichTextKit.configure({ placeholder: { placeholder } })]}
      content={content}
      editable={editable}
      onUpdate={onChange}
      deps={[placeholder]}
    >
      {(editor) => (
        <div
          data-slot="rich-text-editor"
          {...(!editable && { "data-readonly": "" })}
          className={cn(
            "flex min-h-0 w-fit max-w-full min-w-0 flex-col overflow-hidden rounded-2xl border border-border-soft bg-background",
            className
          )}
        >
          {editor && editable && <RichTextToolbar editor={editor} />}
          {editor && editable && <BlockHandle editor={editor} />}
          {editor && editable && <TableControls editor={editor} />}
          {editor && editable && <LinkClickPopup editor={editor} />}
          {editor && editable && (
            <BubbleMenu
              editor={editor}
              options={{ placement: "top", offset: 10 }}
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
            <EditorContent
              editor={editor}
              className={cn(
                "mx-auto w-full max-w-[700px] px-4 py-8 sm:px-0",
                docClassName
              )}
            />
          </div>
        </div>
      )}
    </EditorProvider>
  )
}
