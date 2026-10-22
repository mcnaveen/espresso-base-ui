"use client"

// The media surfaces, ported from the branch's playground: the image and
// embed slots (RteImageSlot, RteEmbedSlot) with the cards they raise
// (RteImageSource, RteEmbedSource), the popups that hang those cards
// beside media already in the document, the Remove Embed modal, the audio
// player bar (AudioNodeView) and the attachment row (AttachmentNodeView).
import * as React from "react"
import { createRoot } from "react-dom/client"
import type { Editor as TiptapEditor } from "@tiptap/core"
import { NodeSelection, type Transaction } from "@tiptap/pm/state"
import {
  NodeViewWrapper,
  type NodeViewProps,
} from "@tiptap/react"

import { getEmbedUrlFromYoutubeUrl } from "@tiptap/extension-youtube"
import {
  AlignCenterIcon,
  AlignLeftIcon,
  AlignRightIcon,
  CaptionsIcon,
  CircleAlertIcon,
  CopyPlusIcon,
  ExternalLinkIcon,
  PencilIcon,
  RefreshCwIcon,
  RepeatIcon,
  Settings2Icon,
  Trash2Icon,
  VolumeXIcon,
} from "lucide-react"

import { pressHandlers, type PressEvent } from "./press"
import { freshEmbedSlot } from "./extensions"
import {
  ANY_HOST,
  calculateAspectRatio,
  IFRAME_ALLOWLIST,
  processEmbedUrl,
  unsupportedImageMessage,
  validateIframeUrl,
} from "./embed-utils"
import { isSafeUrl } from "./url-safety"

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
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { Slider } from "@/components/ui/slider"
import {
  Tabs,
  TabsIndicator,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs"
import {
  DotHorizontalIcon,
  FileIcon,
  GroupIcon,
  ImageIcon,
  PauseIcon,
  PlayIcon,
  SmallCloseIcon,
  VolumeMinIcon,
  VolumeOffIcon,
} from "@/components/ui/rich-text-editor-icons"

/* --------------------------------- helpers --------------------------------- */

/** a file off the disk, through a one-shot hidden input */
export function pickFiles(options: { accept?: string } = {}): Promise<File[]> {
  return new Promise((resolve) => {
    const input = document.createElement("input")
    input.type = "file"
    if (options.accept) input.accept = options.accept
    input.style.display = "none"
    input.onchange = () => {
      resolve([...(input.files ?? [])])
      input.remove()
    }
    input.oncancel = () => {
      resolve([])
      input.remove()
    }
    document.body.appendChild(input)
    input.click()
  })
}

const readAsDataURL = (file: File) =>
  new Promise<string>((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = () => reject(reader.error)
    reader.readAsDataURL(file)
  })

function probeImageDimensions(
  src: string
): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () =>
      resolve({ width: img.naturalWidth, height: img.naturalHeight })
    img.onerror = () => reject(new Error("not an image"))
    img.src = src
  })
}

/* ------------------------------- source cards ------------------------------
 * Figma: espresso-2.0 › Popover › embed link (30878:37810, 32354:128789):
 * 380 across on a 12px radius under the xl shadow, 8px over its tab row
 * and 14 under its last line, 16 between, 16 in from either side. The
 * tabs are the library's underline tabs, their line sliding over the rule
 * the row ends on; the close an xs ghost button 4px from the corner.
 */

function SourceCard({
  label,
  tabs,
  tab,
  onTab,
  onClose,
  children,
}: {
  label: string
  tabs: { key: string; label: string }[]
  tab: string
  onTab: (tab: string) => void
  onClose: () => void
  children: React.ReactNode
}) {
  return (
    <div className="relative flex w-[380px] flex-col gap-4 rounded-xl bg-card pt-2 pb-3.5 shadow-elevation-xl">
      <div className="flex h-7 items-end border-b border-border-soft px-4">
        <Tabs value={tab} onValueChange={(v) => onTab(String(v))}>
          {/* the card's own rule carries the row end to end; the list's
              would stop short at its last tab, doubling the line */}
          <TabsList
            variant="line"
            size="sm"
            className="h-7 gap-4 border-b-0! px-0"
            aria-label={label}
          >
            <TabsIndicator />
            {tabs.map((t) => (
              <TabsTrigger key={t.key} value={t.key} className="flex-none">
                {t.label}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
        <Button
          variant="ghost"
          size="icon-xs"
          aria-label="Close"
          className="absolute top-1 right-1"
          onClick={onClose}
        >
          <SmallCloseIcon className="size-3.5 text-secondary-foreground" />
        </Button>
      </div>
      {children}
    </div>
  )
}

const hintClass = (error: string) =>
  cn(
    "text-center text-[13px] leading-5 tracking-[0.015em]",
    error ? "text-red-500" : "text-muted-foreground"
  )

export function ImageSourceCard({
  onFile,
  onLink,
  onClose,
}: {
  onFile: (file: File) => void
  onLink: (image: { src: string; width: number; height: number }) => void
  onClose: () => void
}) {
  const [tab, setTab] = React.useState("upload")
  const [url, setUrl] = React.useState("")
  const [checking, setChecking] = React.useState(false)
  const [error, setError] = React.useState("")

  const chooseFile = async () => {
    const [file] = await pickFiles({ accept: "image/*" })
    if (!file) return
    // a file the browser cannot draw is turned away at the door
    const unsupported = unsupportedImageMessage(file)
    if (unsupported) {
      setError(unsupported)
      return
    }
    onFile(file)
  }

  const embed = async () => {
    const src = url.trim()
    if (!src || checking) return
    if (!isSafeUrl(src, { base: window.location.origin })) {
      setError("That link is not a web address the editor can take")
      return
    }
    setChecking(true)
    setError("")
    try {
      const { width, height } = await probeImageDimensions(src)
      onLink({ src, width, height })
    } catch {
      setError("That link did not load as an image")
    } finally {
      setChecking(false)
    }
  }

  return (
    <SourceCard
      label="Add an image from"
      tabs={[
        { key: "upload", label: "Upload" },
        { key: "link", label: "Link" },
      ]}
      tab={tab}
      onTab={(t) => {
        setTab(t)
        setError("")
      }}
      onClose={onClose}
    >
      {tab === "upload" ? (
        <div className="flex flex-col gap-2 px-4">
          <Button size="sm" className="w-full" onClick={chooseFile}>
            Upload file
          </Button>
          {error && (
            <p className={hintClass(error)} role="alert">
              {error}
            </p>
          )}
        </div>
      ) : (
        <form
          className="px-4"
          onSubmit={(e) => {
            e.preventDefault()
            void embed()
          }}
        >
          <div className="flex flex-col gap-4">
            <Input
              autoFocus
              size="sm"
              type="url"
              placeholder="Paste image link"
              aria-label="Image link"
              value={url}
              onChange={(e) => {
                setUrl(e.target.value)
                setError("")
              }}
            />
            <Button
              type="button"
              size="sm"
              className="w-full"
              disabled={checking}
              onClick={() => void embed()}
            >
              Embed image
            </Button>
          </div>
          <p
            className={cn("mt-2", hintClass(error))}
            role={error ? "alert" : undefined}
          >
            {error || "Works with any image from the web"}
          </p>
        </form>
      )}
    </SourceCard>
  )
}

export function EmbedSourceCard({
  initial,
  onLink,
  onClose,
}: {
  initial?: string
  onLink: (embed: { src: string; aspectRatio: number }) => void
  onClose: () => void
}) {
  const [tab, setTab] = React.useState("link")
  const [url, setUrl] = React.useState(initial ?? "")
  const [uploading, setUploading] = React.useState(false)
  const [error, setError] = React.useState("")

  const HINT =
    "Works with links of PDFs, Google Drive, Google Maps, Codepen, Figma, Notion etc."

  // the file embeds a website as readily as a player, so every host —
  // but a link must still be a whole http(s) address (validateIframeUrl)
  const take = (raw: string) => {
    const src = processEmbedUrl(raw)
    if (
      !validateIframeUrl(src, { allowlist: [...IFRAME_ALLOWLIST, ANY_HOST] })
    ) {
      setError("That link is not one the editor can embed")
      return
    }
    setError("")
    const info = calculateAspectRatio(src)
    // the node draws CSS aspect-ratio, width over height
    onLink({ src, aspectRatio: info.width / info.height })
  }

  const embed = () => {
    const raw = url.trim()
    if (!raw) return
    take(raw)
  }

  const chooseFile = async () => {
    if (uploading) return
    const [file] = await pickFiles({ accept: "application/pdf,.pdf" })
    if (!file) return
    setUploading(true)
    setError("")
    try {
      const src = await readAsDataURL(file)
      setError("")
      onLink({ src, aspectRatio: 8.5 / 11 })
    } catch {
      setError("The upload failed")
    } finally {
      setUploading(false)
    }
  }

  return (
    <SourceCard
      label="Embed from"
      tabs={[
        { key: "link", label: "Embed link" },
        { key: "upload", label: "Upload" },
        { key: "library", label: "Library" },
      ]}
      tab={tab}
      onTab={(t) => {
        setTab(t)
        setError("")
      }}
      onClose={onClose}
    >
      {tab === "link" ? (
        <form
          className="flex flex-col gap-4 px-4"
          onSubmit={(e) => {
            e.preventDefault()
            embed()
          }}
        >
          <Input
            placeholder="Paste in https://"
            aria-label="Embed link"
            value={url}
            onChange={(e) => {
              setUrl(e.target.value)
              setError("")
            }}
          />
          <div className="flex flex-col gap-2">
            <Button
              type="button"
              size="sm"
              className="w-full"
              onClick={embed}
            >
              Embed link
            </Button>
            <p className={hintClass(error)} role={error ? "alert" : undefined}>
              {error || HINT}
            </p>
          </div>
        </form>
      ) : tab === "upload" ? (
        <div className="flex flex-col gap-2 px-4">
          <Button
            size="sm"
            className="w-full"
            disabled={uploading}
            onClick={chooseFile}
          >
            Upload file
          </Button>
          <p className={hintClass(error)} role={error ? "alert" : undefined}>
            {error || "A PDF off your disk, shown in the page"}
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-2 px-2">
          <p className={cn("px-2 py-3", hintClass(error))}>
            {error || "Nothing uploaded yet"}
          </p>
        </div>
      )}
    </SourceCard>
  )
}

/* --------------------------------- the slots ------------------------------- */

const slotPopoverClass =
  "w-auto rounded-xl border-none bg-transparent p-0 shadow-none"

export function ImageSlotView(props: NodeViewProps) {
  const { editor, node, getPos } = props
  const editable = editor.isEditable
  const [open, setOpen] = React.useState(false)

  const range = () => {
    const pos = getPos()
    if (typeof pos !== "number") return null
    return { from: pos, to: pos + node.nodeSize }
  }

  const takeFile = async (file: File) => {
    const src = await readAsDataURL(file)
    const r = range()
    if (!r) return
    const { width, height } = await probeImageDimensions(src).catch(() => ({
      width: 0,
      height: 0,
    }))
    editor
      .chain()
      .focus()
      .insertContentAt(r, {
        type: "image",
        attrs: { src, ...(width ? { width, height } : {}) },
      })
      .run()
  }

  const takeLink = (image: { src: string; width: number; height: number }) => {
    const r = range()
    if (!r) return
    editor
      .chain()
      .focus()
      .insertContentAt(r, { type: "image", attrs: image })
      .run()
  }

  return (
    <NodeViewWrapper
      as="div"
      className="rte-slot"
      data-type="image-slot"
      contentEditable={false}
    >
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger
          render={
            <button
              type="button"
              className={cn("rte-slot-face", open && "is-open")}
              disabled={!editable}
            >
              <ImageIcon className="size-4 shrink-0" />
              <span>Add Image</span>
            </button>
          }
        />
        <PopoverContent
          side="bottom"
          align="start"
          sideOffset={6}
          initialFocus={false}
          className={slotPopoverClass}
        >
          <ImageSourceCard
            onFile={(f) => {
              setOpen(false)
              void takeFile(f)
            }}
            onLink={(i) => {
              setOpen(false)
              takeLink(i)
            }}
            onClose={() => setOpen(false)}
          />
        </PopoverContent>
      </Popover>
    </NodeViewWrapper>
  )
}

export function EmbedSlotView(props: NodeViewProps) {
  const { editor, node, getPos } = props
  const editable = editor.isEditable
  const [open, setOpen] = React.useState(false)

  // just laid down: its card comes up with it
  React.useEffect(() => {
    if (!freshEmbedSlot.pending || !editable) return
    freshEmbedSlot.pending = false
    setOpen(true)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const takeLink = (embed: { src: string; aspectRatio: number }) => {
    const pos = getPos()
    if (typeof pos !== "number") return
    editor
      .chain()
      .focus()
      .insertContentAt(
        { from: pos, to: pos + node.nodeSize },
        { type: "embed", attrs: embed }
      )
      .run()
  }

  return (
    <NodeViewWrapper
      as="div"
      className="rte-slot"
      data-type="embed-slot"
      contentEditable={false}
    >
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger
          render={
            <button
              type="button"
              className={cn("rte-slot-face", open && "is-open")}
              disabled={!editable}
            >
              <GroupIcon className="size-4 shrink-0" />
              <span>Embed any link</span>
            </button>
          }
        />
        <PopoverContent
          side="bottom"
          align="start"
          sideOffset={6}
          initialFocus={false}
          className={slotPopoverClass}
        >
          <EmbedSourceCard
            onLink={(e) => {
              setOpen(false)
              takeLink(e)
            }}
            onClose={() => setOpen(false)}
          />
        </PopoverContent>
      </Popover>
    </NodeViewWrapper>
  )
}

/* ------------------------------ floating popups ----------------------------
 * The cards hung beside media already in the document: the position is
 * carried through every transaction while the card is up, since the
 * document may move underneath it.
 */

function mountFloating(
  editor: TiptapEditor,
  pos: number,
  render: (close: () => void, at: () => number) => React.ReactNode,
  place: (host: HTMLElement, rect: DOMRect) => void
) {
  let at = pos
  const track = ({ transaction }: { transaction: Transaction }) => {
    at = transaction.mapping.map(at)
  }
  editor.on("transaction", track)

  const host = document.createElement("div")
  host.className = "fixed z-70"
  document.body.appendChild(host)
  const root = createRoot(host)

  const rectOf = () => {
    const el = editor.isDestroyed ? null : editor.view.nodeDOM(at)
    return el instanceof HTMLElement
      ? el.getBoundingClientRect()
      : editor.view.dom.getBoundingClientRect()
  }

  let settled = false
  const close = () => {
    if (settled) return
    settled = true
    editor.off("transaction", track)
    document.removeEventListener("pointerdown", onDown, true)
    document.removeEventListener("keydown", onKey, true)
    window.removeEventListener("scroll", position, true)
    window.removeEventListener("resize", position)
    root.unmount()
    host.remove()
  }
  const onDown = (e: PointerEvent) => {
    if (e.target instanceof Node && host.contains(e.target)) return
    close()
  }
  const onKey = (e: KeyboardEvent) => {
    if (e.key === "Escape") close()
  }
  const position = () => {
    if (settled) return
    place(host, rectOf())
  }
  document.addEventListener("pointerdown", onDown, true)
  document.addEventListener("keydown", onKey, true)
  window.addEventListener("scroll", position, true)
  window.addEventListener("resize", position)

  root.render(render(close, () => at))
  position()
  requestAnimationFrame(position)
}

/** the image card under the picture, flipped above when there is no room */
export function openImageSourcePopup(
  editor: TiptapEditor,
  pos: number,
  take: (
    pos: number,
    image: { src: string; width?: number; height?: number }
  ) => void
) {
  mountFloating(
    editor,
    pos,
    (close, at) => (
      <ImageSourceCard
        onFile={(file) => {
          const target = at()
          close()
          void readAsDataURL(file).then((src) => take(target, { src }))
        }}
        onLink={(image) => {
          const target = at()
          close()
          take(target, image)
        }}
        onClose={close}
      />
    ),
    (host, rect) => {
      const height = host.firstElementChild?.getBoundingClientRect().height ?? 0
      const below = rect.bottom + 8
      const top =
        height && below + height > window.innerHeight
          ? Math.max(8, rect.top - 8 - height)
          : below
      host.style.left = `${Math.max(8, rect.left)}px`
      host.style.top = `${top}px`
    }
  )
}

/** where the chrome sits in a frame: 28px square, 10px in from the top right */
const CHROME_INSET = 10
const CHROME_SIZE = 28

/** the embed card hung from the frame's top-right chrome */
export function openEmbedSourcePopup(
  editor: TiptapEditor,
  pos: number,
  take: (pos: number, embed: { src: string; aspectRatio: number }) => void
) {
  const initial = (editor.state.doc.nodeAt(pos)?.attrs.src as string) ?? ""
  mountFloating(
    editor,
    pos,
    (close, at) => (
      <EmbedSourceCard
        initial={initial}
        onLink={(embed) => {
          const target = at()
          close()
          take(target, embed)
        }}
        onClose={close}
      />
    ),
    (host, rect) => {
      const box = host.firstElementChild?.getBoundingClientRect()
      const right = rect.right - CHROME_INSET
      const below = rect.top + CHROME_INSET + CHROME_SIZE + 8
      const top =
        box && below + box.height > window.innerHeight
          ? Math.max(8, rect.top + CHROME_INSET - 8 - box.height)
          : below
      host.style.left = `${Math.max(8, right - (box?.width ?? 380))}px`
      host.style.top = `${top}px`
    }
  )
}

/* ------------------------------ remove embed -------------------------------
 * Figma: espresso-2.0 › Embed › "modal new" (32480:13935): the 360px card,
 * the 20px red badge with the 14px trash before the title, the body, the
 * sm buttons on the right. The word before the deed.
 */

function RemoveEmbedModal({
  onConfirm,
  onDone,
}: {
  onConfirm: () => void
  onDone: () => void
}) {
  const [open, setOpen] = React.useState(true)
  return (
    <Dialog
      open={open}
      onOpenChange={(value) => {
        setOpen(value)
        if (!value) setTimeout(onDone, 200)
      }}
    >
      <DialogContent className="w-[360px] gap-3 shadow-elevation-xl">
        <DialogHeader className="flex-row items-center gap-2 space-y-0">
          <span className="flex size-5 shrink-0 items-center justify-center rounded-[4px] bg-red-100 dark:bg-red-900">
            <svg
              viewBox="0 0 24 24"
              className="size-3.5 text-red-600"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M10 11v6M14 11v6" />
            </svg>
          </span>
          <DialogTitle className="text-lg font-semibold">
            Remove Embed
          </DialogTitle>
        </DialogHeader>
        <p className="text-base leading-[1.5] text-muted-foreground">
          This embedded content will be removed from the document.
        </p>
        <DialogFooter>
          <Button variant="secondary" size="sm" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button
            variant="destructive"
            size="sm"
            onClick={() => {
              onConfirm()
              setOpen(false)
            }}
          >
            Delete
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

/** the nodes drawn as embeds: the embed card's own and a YouTube video */
export const EMBED_TYPES = new Set(["embed", "youtube"])

export function openRemoveEmbedModal(editor: TiptapEditor, pos: number) {
  const host = document.createElement("div")
  document.body.appendChild(host)
  const root = createRoot(host)
  const done = () => {
    root.unmount()
    host.remove()
  }
  root.render(
    <RemoveEmbedModal
      onConfirm={() => {
        const node = editor.isDestroyed ? null : editor.state.doc.nodeAt(pos)
        if (!node || !EMBED_TYPES.has(node.type.name)) return
        editor.view.dispatch(editor.state.tr.delete(pos, pos + node.nodeSize))
      }}
      onDone={done}
    />
  )
}

/* ------------------------------- audio player ------------------------------
 * Figma: espresso-2.0 › Recording (31403:45371). A 42px bar on gray-50,
 * ruled and on a 12px radius, 2px/5px in: a 28px ghost play button, an 8px
 * gap, the slider, the time as 0:15 / 32:48 in 14px gray-500, then volume
 * and ⋯ as two more 28px ghost buttons 4px apart. The icons a step
 * lighter than the ghost button's own: the file's ink/gray-7.
 */

// 0:15, and 1:02:03 past the hour
function playerClock(seconds: number) {
  const s = Math.max(0, Math.floor(seconds || 0))
  const h = Math.floor(s / 3600)
  const m = Math.floor((s % 3600) / 60)
  const ss = String(s % 60).padStart(2, "0")
  return h ? `${h}:${String(m).padStart(2, "0")}:${ss}` : `${m}:${ss}`
}

const RATES = [0.5, 1, 1.5, 2]

export function AudioView(props: NodeViewProps) {
  const { node, deleteNode } = props
  const audioRef = React.useRef<HTMLAudioElement | null>(null)
  const [playing, setPlaying] = React.useState(false)
  const [muted, setMuted] = React.useState(false)
  const [duration, setDuration] = React.useState(0)
  const [current, setCurrent] = React.useState(0)
  const [rate, setRate] = React.useState(1)
  // the slider holds the position while a drag is under way
  const scrubbing = React.useRef(false)
  const [position, setPosition] = React.useState(0)
  const frame = React.useRef(0)

  React.useEffect(() => {
    if (!scrubbing.current) setPosition(current)
  }, [current])

  // the clip's own `timeupdate` comes only four or so times a second;
  // while the clip plays, the position is read every frame instead
  const tick = React.useCallback(() => {
    const el = audioRef.current
    if (!el || el.paused) {
      frame.current = 0
      return
    }
    setCurrent(el.currentTime)
    frame.current = requestAnimationFrame(tick)
  }, [])

  React.useEffect(
    () => () => {
      cancelAnimationFrame(frame.current)
      audioRef.current?.pause()
    },
    []
  )

  const toggle = () => {
    const el = audioRef.current
    if (!el) return
    if (el.paused) void el.play()
    else el.pause()
  }
  const toggleMute = () => {
    const el = audioRef.current
    if (!el) return
    el.muted = !el.muted
    setMuted(el.muted)
  }
  const seek = (t: number) => {
    const el = audioRef.current
    if (!el) return
    el.currentTime = t
    setCurrent(t)
  }

  const playerBtn =
    "flex size-7 shrink-0 items-center justify-center rounded-md text-secondary-foreground transition-colors hover:bg-secondary data-popup-open:bg-muted [&>svg]:size-4"

  return (
    <NodeViewWrapper
      as="div"
      className="rte-player flex h-[42px] w-full items-center gap-2 rounded-xl bg-input px-[5px] py-0.5"
      data-type="audio"
      aria-label={node.attrs.title || "Audio"}
    >
      <audio
        ref={audioRef}
        src={node.attrs.src ?? undefined}
        preload="metadata"
        onLoadedMetadata={() => setDuration(audioRef.current?.duration ?? 0)}
        onDurationChange={() => setDuration(audioRef.current?.duration ?? 0)}
        onTimeUpdate={() => setCurrent(audioRef.current?.currentTime ?? 0)}
        onPlay={() => {
          setPlaying(true)
          if (!frame.current) frame.current = requestAnimationFrame(tick)
        }}
        onPause={() => {
          setPlaying(false)
          cancelAnimationFrame(frame.current)
          frame.current = 0
          setCurrent(audioRef.current?.currentTime ?? 0)
        }}
        onEnded={() => {
          setPlaying(false)
          cancelAnimationFrame(frame.current)
          frame.current = 0
        }}
      />
      {/* 38px for the 28px button, so the knob's 14px clears the button */}
      <div className="flex w-[38px] shrink-0 justify-center">
        <button
          type="button"
          aria-label={playing ? "Pause" : "Play"}
          className={playerBtn}
          onClick={toggle}
        >
          {playing ? <PauseIcon /> : <PlayIcon />}
        </button>
      </div>
      <Slider
        value={[position]}
        min={0}
        max={duration || 1}
        step={0.1}
        size="sm"
        className="rte-player-slider min-w-0 flex-1 [&_[data-slot=slider-range]]:bg-foreground [&_[data-slot=slider-thumb]]:size-3.5 [&_[data-slot=slider-track]]:bg-muted"
        aria-label="Position"
        onValueChange={(value) => {
          scrubbing.current = true
          setPosition(Array.isArray(value) ? value[0] : value)
        }}
        onValueCommitted={(value) => {
          scrubbing.current = false
          seek(Array.isArray(value) ? value[0] : value)
        }}
      />
      <span
        className="rte-player-time shrink-0 text-base tabular-nums text-accent-foreground"
        aria-live="off"
      >
        {playerClock(position)} / {playerClock(duration)}
      </span>
      <div data-player-end="" className="flex shrink-0 items-center gap-1">
        <button
          data-player-mute=""
          type="button"
          aria-label={muted ? "Unmute" : "Mute"}
          aria-pressed={muted}
          className={playerBtn}
          onClick={toggleMute}
        >
          {muted ? <VolumeOffIcon /> : <VolumeMinIcon />}
        </button>
        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <button type="button" aria-label="More" className={playerBtn}>
                <DotHorizontalIcon />
              </button>
            }
          />
          <DropdownMenuContent align="end" sideOffset={4}>
            <DropdownMenuGroup>
            <DropdownMenuLabel>Speed</DropdownMenuLabel>
            {RATES.map((r) => (
              <DropdownMenuItem
                key={r}
                data-selected={rate === r || undefined}
                className="data-selected:bg-secondary"
                onClick={() => {
                  setRate(r)
                  if (audioRef.current) audioRef.current.playbackRate = r
                }}
              >
                {r}×
              </DropdownMenuItem>
            ))}
            </DropdownMenuGroup>
            <DropdownMenuSeparator />
            <DropdownMenuGroup>
            <DropdownMenuLabel>Clip</DropdownMenuLabel>
            <DropdownMenuItem
              onClick={() => {
                const a = document.createElement("a")
                a.href = node.attrs.src
                a.download = node.attrs.title || "audio"
                a.click()
              }}
            >
              Download
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => deleteNode()}>
              Remove
            </DropdownMenuItem>
            </DropdownMenuGroup>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </NodeViewWrapper>
  )
}

/* ------------------------------ attachment row -----------------------------
 * Figma: espresso-2.0 › 31457:33634. An attachment is a row: a 28px ghost
 * button across the column, the file glyph before the name and, while the
 * pointer is on it, a small close at its end — 8px in, 8px between, on an
 * 8px radius. The row is the link to the file; the close takes it out.
 */

export function AttachmentView(props: NodeViewProps) {
  const { node, editor, deleteNode, getPos } = props
  const editable = editor.isEditable
  const fileName = (node.attrs.fileName as string) || "Attachment"
  const href = (node.attrs.href as string) || undefined

  return (
    <NodeViewWrapper
      as="div"
      className="rte-attachment relative flex"
      data-type="attachment"
    >
      <a
        href={href}
        download={fileName}
        data-attachment=""
        contentEditable={false}
        draggable={false}
        onDragStart={(e) => e.preventDefault()}
        // a press on the row chooses the file block, the keys kept on the
        // page, so Backspace or Delete next takes it away; the click
        // still opens the file
        onMouseDown={(e) => {
          if (!editable || e.button !== 0) return
          if ((e.target as HTMLElement).closest(".rte-attachment-close")) return
          const pos = getPos()
          if (typeof pos !== "number") return
          e.preventDefault()
          editor.view.dispatch(
            editor.view.state.tr.setSelection(
              NodeSelection.create(editor.view.state.doc, pos)
            )
          )
          editor.view.focus()
        }}
        className="flex h-7 w-full items-center gap-2 rounded-lg px-2 text-base text-secondary-foreground no-underline transition-colors hover:bg-secondary"
        onClick={(e) => {
          const target = e.target as HTMLElement
          if (!target.closest(".rte-attachment-close")) return
          e.preventDefault()
          e.stopPropagation()
          deleteNode()
        }}
      >
        <FileIcon className="size-4 shrink-0" />
        <span className="truncate">{fileName}</span>
        {editable && (
          <span
            role="button"
            aria-label="Remove"
            className="rte-attachment-close flex size-4 shrink-0 items-center justify-center"
          >
            <SmallCloseIcon className="size-3.5" />
          </span>
        )}
      </a>
    </NodeViewWrapper>
  )
}

/* ------------------------------- image chrome ------------------------------
 * The picture's node view, ported from the kit's MediaNodeView: the one
 * 28px chrome button 10px in from the top-right corner with every action
 * in the menu behind it — Caption (a check while it shows), Align with
 * checks, Resize (Full width / Large / Medium / Small), Replace image,
 * Duplicate, Open link / Copy image / Download, Delete — the edge resize
 * pills (3×66 on full corners, 4px in, a dark gray in a 1px white halo),
 * the 1px ink-gray-6 selection ring 4px outside the picture, and the
 * caption field centred beneath.
 */

const MEDIA_CHROME_BUTTON =
  "flex size-7 items-center justify-center rounded-lg bg-black/35 text-white transition-colors hover:bg-black/50 active:bg-black/60 data-popup-open:bg-black/60"

const MenuCheck = () => (
  <svg
    viewBox="0 0 24 24"
    className="ml-auto size-4 shrink-0 text-secondary-foreground"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    <path d="M20 6 9 17l-5-5" />
  </svg>
)

async function copyImageToClipboard(src: string) {
  try {
    const img = new Image()
    img.crossOrigin = "anonymous"
    await new Promise((resolve, reject) => {
      img.onload = resolve
      img.onerror = reject
      img.src = src
    })
    const canvas = document.createElement("canvas")
    canvas.width = img.naturalWidth
    canvas.height = img.naturalHeight
    canvas.getContext("2d")!.drawImage(img, 0, 0)
    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, "image/png")
    )
    if (!blob) throw new Error("no blob")
    await navigator.clipboard.write([
      new ClipboardItem({ "image/png": blob }),
    ])
  } catch {
    // a cross-origin picture cannot be read back: the address will do
    await navigator.clipboard.writeText(src).catch(() => {})
  }
}

async function downloadMedia(src: string) {
  try {
    const response = await fetch(src)
    const blob = await response.blob()
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = src.split("/").pop()?.split("?")[0] || "image"
    a.click()
    URL.revokeObjectURL(url)
  } catch {
    const a = document.createElement("a")
    a.href = src
    a.download = "image"
    a.click()
  }
}

const SIZE_OPTIONS = [
  { value: 1, label: "Full width" },
  { value: 0.75, label: "Large" },
  { value: 0.5, label: "Medium" },
  { value: 0.25, label: "Small" },
]
const ALIGN_OPTIONS = [
  { value: "left", label: "Left" },
  { value: "center", label: "Center" },
  { value: "right", label: "Right" },
] as const

const MEDIA_MIN = 50
/** how tall a clipped picture stands: past it, it is cropped to fill */
const MEDIA_CLIP_HEIGHT = 480
/** a picture clipped or let out glides to its new height */
const MEDIA_CLIP_MS = 300
// the most a pull past the bound stretches the picture, however far it goes
const MEDIA_STRETCH = 36
const MEDIA_SPRING_MS = 320
// a touch past the bound on the way back, then home
const MEDIA_SPRING = `width ${MEDIA_SPRING_MS}ms cubic-bezier(0.3, 1.35, 0.5, 1), height ${MEDIA_SPRING_MS}ms cubic-bezier(0.3, 1.35, 0.5, 1)`
// the band's give: the first pixels past the bound show about half, then
// each counts for less, and it never reaches `limit`
const stretch = (over: number, limit: number) =>
  limit * (1 - 1 / ((over * 0.55) / limit + 1))
const reducedMotion = () =>
  window.matchMedia("(prefers-reduced-motion: reduce)").matches

/** a picture's height over its width, from the file itself: a clipped
 * picture's box is cut short of it */
const aspectOf = (el: HTMLImageElement | null) =>
  el?.naturalWidth
    ? el.naturalHeight / el.naturalWidth
    : el?.offsetWidth
      ? el.offsetHeight / el.offsetWidth
      : 1

export function ImageView(props: NodeViewProps) {
  const { node, editor, getPos, updateAttributes, deleteNode } = props
  const editable = editor.isEditable
  const src = (node.attrs.src as string) || ""
  const align = (node.attrs.align as string | null) ?? "center"
  const width = node.attrs.width as number | null
  const clip = node.attrs.clip !== false
  // the file's own width: a clipped picture keeps it (or the room it
  // stands in) rather than narrowing to keep its shape under the cap
  const [natural, setNatural] = React.useState<number | null>(null)
  const [menuOpen, setMenuOpen] = React.useState(false)
  // the user's explicit caption toggle; null means "use the default": a
  // caption shows only once one is written, Caption in the menu adds one
  const [captionToggle, setCaptionToggle] = React.useState<boolean | null>(
    null
  )
  const [caption, setCaption] = React.useState(
    (node.attrs.caption as string) || ""
  )
  const imgRef = React.useRef<HTMLImageElement | null>(null)
  const boxRef = React.useRef<HTMLDivElement | null>(null)

  // re-sync when the attr changes elsewhere, without clobbering typing
  const attrCaption = (node.attrs.caption as string) || ""
  const lastAttr = React.useRef(attrCaption)
  React.useEffect(() => {
    if (attrCaption !== lastAttr.current) {
      lastAttr.current = attrCaption
      setCaption(attrCaption)
    }
  }, [attrCaption])

  const showCaption =
    captionToggle !== null
      ? captionToggle
      : Boolean(node.attrs.caption)

  const selectMedia = React.useCallback(() => {
    const pos = getPos()
    if (typeof pos !== "number") return
    try {
      editor.view.dispatch(
        editor.view.state.tr.setSelection(
          NodeSelection.create(editor.view.state.doc, pos)
        )
      )
    } catch {
      // the node moved out from underneath
    }
  }, [editor, getPos])

  /* ---- the ratio-locked edge drag, after the kit's useNodeViewResize */
  const commitSize = (w: number, h: number) => {
    updateAttributes({ width: Math.round(w), height: Math.round(h) })
    // a node selection maps off a replaced node: selected again, so the
    // pills and the menu survive every resize
    requestAnimationFrame(selectMedia)
  }
  const startResize = (event: PressEvent, edge: "left" | "right") => {
    if (!editable) return
    event.preventDefault()
    selectMedia()
    const el = imgRef.current
    if (!el) return
    const box = boxRef.current
    const startX = event.clientX
    const startWidth = el.offsetWidth
    const aspect = aspectOf(el)
    // the picture grows to the room it stands in — its column, its cell, or
    // the page — and no further
    const maxWidth =
      box?.parentElement?.clientWidth || editor.view.dom.clientWidth
    const size = (w: number) => {
      el.style.width = `${w}px`
      el.style.height = `${w * aspect}px`
      if (box) {
        box.style.width = `${w}px`
        box.setAttribute("data-sized", "")
      }
    }
    // a pull past either bound stretches it a little, ever harder, as a
    // rubber band does; let go, and it springs back to the bound
    let raw = startWidth
    const onMove = (ev: PointerEvent) => {
      const delta = (ev.clientX - startX) * (edge === "left" ? -1 : 1)
      raw = startWidth + delta
      if (box) box.style.maxWidth = "none"
      size(
        raw > maxWidth
          ? maxWidth + stretch(raw - maxWidth, MEDIA_STRETCH)
          : raw < MEDIA_MIN
            ? MEDIA_MIN - stretch(MEDIA_MIN - raw, MEDIA_MIN / 3)
            : raw
      )
    }
    const onUp = () => {
      window.removeEventListener("pointermove", onMove)
      window.removeEventListener("pointerup", onUp)
      window.removeEventListener("pointercancel", onUp)
      document.body.style.cursor = ""
      document.body.classList.remove("rte-media-resizing")
      const w = Math.max(MEDIA_MIN, Math.min(raw, maxWidth))
      const settle = () => {
        if (box) {
          box.style.maxWidth = ""
          box.removeAttribute("data-resizing")
        }
        commitSize(w, w * aspect)
        requestAnimationFrame(() => {
          el.style.width = ""
          el.style.height = ""
        })
      }
      const banded = Math.abs(el.offsetWidth - w) > 0.5
      if (!banded || !box || reducedMotion()) return settle()
      const springs = [el, box]
      for (const s of springs) s.style.transition = MEDIA_SPRING
      size(w)
      let done = false
      const end = () => {
        if (done) return
        done = true
        for (const s of springs) s.style.transition = ""
        settle()
      }
      box.addEventListener("transitionend", end, { once: true })
      window.setTimeout(end, MEDIA_SPRING_MS + 60)
    }
    box?.setAttribute("data-resizing", "")
    document.body.classList.add("rte-media-resizing")
    window.addEventListener("pointermove", onMove)
    window.addEventListener("pointerup", onUp)
    window.addEventListener("pointercancel", onUp)
    document.body.style.cursor = "ew-resize"
  }
  const resizeBy = (delta: number) => {
    const el = imgRef.current
    const current = width || el?.offsetWidth || 320
    const aspect = aspectOf(el)
    const w = Math.max(MEDIA_MIN, current + delta)
    commitSize(w, w * aspect)
  }
  const resizeTo = (fraction: number) => {
    selectMedia()
    const el = imgRef.current
    const available =
      boxRef.current?.parentElement?.clientWidth || el?.offsetWidth || 320
    const aspect = aspectOf(el)
    const w = Math.max(50, Math.round(available * fraction))
    commitSize(w, w * aspect)
  }

  /* ---- actions */
  const duplicate = () => {
    const pos = getPos()
    if (typeof pos !== "number") return
    const live = editor.state.doc.nodeAt(pos)
    if (!live) return
    editor.view.dispatch(editor.state.tr.insert(pos + live.nodeSize, live))
  }
  // Clip on or off: the picture's real height glides from the one to the
  // other, so the blocks after it move with it. It is cropped to fill the
  // whole way, the file's shape never squashed while it changes.
  const toggleClip = () => {
    const el = imgRef.current
    updateAttributes({ clip: !clip })
    if (!el || reducedMotion()) return
    const box = el.getBoundingClientRect()
    const whole = box.width * aspectOf(el)
    const to = clip ? whole : Math.min(whole, MEDIA_CLIP_HEIGHT)
    if (Math.abs(to - box.height) < 1) return
    const frame = { maxHeight: "none", objectFit: "cover" }
    el.animate(
      [
        { ...frame, height: `${box.height}px` },
        { ...frame, height: `${to}px` },
      ],
      { duration: MEDIA_CLIP_MS, easing: "cubic-bezier(0.2, 0, 0, 1)" }
    )
  }
  const toggleCaption = () => {
    const next = !showCaption
    setCaptionToggle(next)
    if (!next) {
      setCaption("")
      if (node.attrs.caption) updateAttributes({ caption: null })
    }
  }
  const commitCaption = () => {
    if (((node.attrs.caption as string) || "") === caption) return
    lastAttr.current = caption
    updateAttributes({ caption: caption || null })
  }

  const chromeVisible = menuOpen && editable
  const menuItem = (
    label: string,
    run: () => void,
    checked?: boolean
  ) => (
    <DropdownMenuItem key={label} onClick={run}>
      {label}
      {checked && <MenuCheck />}
    </DropdownMenuItem>
  )

  return (
    <NodeViewWrapper as="div" className="rte-media" data-drag-handle>
      <div
        ref={boxRef}
        className={cn(
          "group/image relative isolate block max-w-full overflow-hidden rounded-lg",
          align === "center" && "mx-auto",
          align === "right" && "mr-0 ml-auto",
          align === "left" && "mr-auto ml-0"
        )}
        style={{ width: width ? `${width}px` : "auto" }}
        data-sized={width ? "" : undefined}
      >
        <div className="relative">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            ref={imgRef}
            className={cn("rounded-lg", clip && "object-cover")}
            style={
              clip
                ? {
                    maxHeight: MEDIA_CLIP_HEIGHT,
                    width:
                      !width && natural ? `min(100%, ${natural}px)` : undefined,
                  }
                : undefined
            }
            onLoad={(e) => setNatural(e.currentTarget.naturalWidth || null)}
            src={src}
            alt={(node.attrs.alt as string) || ""}
            width={width ?? undefined}
            height={(node.attrs.height as number | null) ?? undefined}
            onClick={(e) => {
              e.stopPropagation()
              if (editable) selectMedia()
            }}
          />

          {/* the one chrome button, every action in the menu behind it */}
          <div
            className={cn(
              "absolute top-2.5 right-2.5 z-20 items-center gap-1.5",
              chromeVisible
                ? "flex"
                : editable
                  ? "hidden group-hover/image:flex group-data-resizing/image:flex"
                  : "hidden"
            )}
          >
            <DropdownMenu
              open={menuOpen}
              onOpenChange={setMenuOpen}
              modal={false}
            >
              <DropdownMenuTrigger
                render={
                  <button
                    type="button"
                    className={MEDIA_CHROME_BUTTON}
                    aria-label="Media options"
                    onPointerDown={(e) => e.stopPropagation()}
                    onMouseDown={(e) => {
                      e.preventDefault()
                      e.stopPropagation()
                    }}
                    onClick={(e) => e.stopPropagation()}
                  >
                    <DotHorizontalIcon className="size-4" />
                  </button>
                }
              />
              <DropdownMenuContent align="end" sideOffset={4}>
                <DropdownMenuGroup>
                  {menuItem("Caption", toggleCaption, showCaption)}
                  {menuItem("Clip", toggleClip, clip)}
                </DropdownMenuGroup>
                <DropdownMenuSeparator />
                <DropdownMenuGroup>
                  <DropdownMenuLabel>Align</DropdownMenuLabel>
                  {ALIGN_OPTIONS.map((option) =>
                    menuItem(
                      option.label,
                      () => updateAttributes({ align: option.value }),
                      align === option.value
                    )
                  )}
                </DropdownMenuGroup>
                <DropdownMenuSeparator />
                <DropdownMenuGroup>
                  <DropdownMenuSub>
                    <DropdownMenuSubTrigger>Resize</DropdownMenuSubTrigger>
                    <DropdownMenuSubContent>
                      {SIZE_OPTIONS.map((size) =>
                        menuItem(size.label, () => resizeTo(size.value))
                      )}
                    </DropdownMenuSubContent>
                  </DropdownMenuSub>
                </DropdownMenuGroup>
                <DropdownMenuSeparator />
                <DropdownMenuGroup>
                  {menuItem("Replace image", () => {
                    const pos = getPos()
                    if (typeof pos === "number")
                      editor.commands.replaceImage(pos)
                  })}
                  {menuItem("Duplicate", duplicate)}
                </DropdownMenuGroup>
                <DropdownMenuSeparator />
                <DropdownMenuGroup>
                  {menuItem("Open link", () => {
                    if (src) window.open(src, "_blank", "noopener")
                  })}
                  {menuItem("Copy image", () => void copyImageToClipboard(src))}
                  {menuItem("Download", () => void downloadMedia(src))}
                </DropdownMenuGroup>
                <DropdownMenuSeparator />
                <DropdownMenuGroup>
                  {menuItem("Delete", () => deleteNode())}
                </DropdownMenuGroup>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          {/* the design's edge pills, the hand's target 14px deep: they
              show while the pointer is on the picture, and stay through a
              resize the pointer has carried off it */}
          {editable && (
            <>
              {(["left", "right"] as const).map((edge) => (
                <button
                  key={edge}
                  type="button"
                  className={cn(
                    "absolute top-1/2 z-30 hidden h-[66px] max-h-[50%] w-3.5 -translate-y-1/2 cursor-ew-resize touch-none items-center bg-transparent group-hover/image:flex group-data-resizing/image:flex",
                    edge === "left"
                      ? "left-0 justify-start pl-1"
                      : "right-0 justify-end pr-1"
                  )}
                  aria-label={`Resize media from ${edge} edge`}
                  {...pressHandlers((e) => startResize(e, edge))}
                  onKeyDown={(e) => {
                    if (e.key === "ArrowLeft" || e.key === "ArrowUp") {
                      e.preventDefault()
                      resizeBy(-20)
                    } else if (
                      e.key === "ArrowRight" ||
                      e.key === "ArrowDown"
                    ) {
                      e.preventDefault()
                      resizeBy(20)
                    }
                  }}
                >
                  <span className="pointer-events-none h-full w-[3px] rounded-full bg-[#383838] ring-1 ring-white" />
                </button>
              ))}
            </>
          )}
        </div>

        {/* the caption: a centred field while editing, plain text read */}
        {editable && showCaption ? (
          <div
            data-media-text-field
            draggable={false}
            className="w-full pt-1.5"
            onPointerDown={(e) => e.stopPropagation()}
            onMouseDown={(e) => e.stopPropagation()}
            onDragStart={(e) => {
              e.preventDefault()
              e.stopPropagation()
            }}
            onCopy={(e) => e.stopPropagation()}
            onCut={(e) => e.stopPropagation()}
            onPaste={(e) => e.stopPropagation()}
          >
            <input
              value={caption}
              draggable={false}
              className="h-7 w-full border-none bg-transparent text-center text-[13px] leading-[1.5] tracking-[0.015em] text-accent-foreground outline-none placeholder:text-card-foreground"
              placeholder="Add a caption"
              aria-label="Caption"
              onChange={(e) => setCaption(e.target.value)}
              onBlur={commitCaption}
              onKeyDown={(e) => {
                if (e.key === "Escape") {
                  e.preventDefault()
                  ;(e.target as HTMLInputElement).blur()
                  return
                }
                if (e.key !== "Enter") return
                // Enter writes the caption and starts the line after the
                // picture, as the kit's caption field does
                e.preventDefault()
                commitCaption()
                const pos = getPos()
                if (typeof pos !== "number") return
                requestAnimationFrame(() => {
                  const live = editor.state.doc.nodeAt(pos)
                  if (!live) return
                  const after = pos + live.nodeSize
                  const paragraph = editor.state.schema.nodes.paragraph
                  const next = editor.state.doc.nodeAt(after)
                  const chainTo = editor.chain().focus(undefined, {
                    scrollIntoView: false,
                  })
                  if (next?.isTextblock) {
                    chainTo.setTextSelection(after + 1).run()
                  } else {
                    editor.view.dispatch(
                      editor.state.tr.insert(after, paragraph.create())
                    )
                    editor
                      .chain()
                      .focus(undefined, { scrollIntoView: false })
                      .setTextSelection(after + 1)
                      .run()
                  }
                })
              }}
            />
          </div>
        ) : node.attrs.caption ? (
          <div className="w-full px-1 pt-2.5 text-center text-[13px] leading-[1.5] tracking-[0.015em] text-accent-foreground">
            {node.attrs.caption as string}
          </div>
        ) : null}
      </div>
    </NodeViewWrapper>
  )
}

/* ------------------------------- the embed ---------------------------------
 * An embedded frame (a YouTube video, or any link the embed card took), as
 * the branch's IframeNodeView draws it: the column's width on its
 * platform's ratio unless resized, the picture's ring when selected, and
 * the media chrome over its top-right corner, the pencil (a new link) and
 * ⋯ with the embed's six rows: Captions, Replace, Open in Browser, Align,
 * Duplicate, Delete. The chrome comes with the pointer; a click on the
 * frame is the player's, and plays it at once; a press on the pencil, ⋯ or
 * a pill chooses the embed. A frame that never loads gives way to the
 * design's "Preview failed" box.
 */
const EMBED_MIN_WIDTH = 200
const EMBED_LOAD_TIMEOUT = 15000

/** the address the frame shows: a YouTube node keeps the video's link */
function frameSrcOf(node: NodeViewProps["node"]): string {
  const src = (node.attrs.src as string) || ""
  if (node.type.name !== "youtube") return src
  return (
    getEmbedUrlFromYoutubeUrl({
      url: src,
      nocookie: true,
      startAt: (node.attrs.start as number) || 0,
    }) ?? src
  )
}

/** the page the video is watched on, for Open in Browser */
function browserSrcOf(node: NodeViewProps["node"]): string {
  const src = (node.attrs.src as string) || ""
  const m = src.match(/youtube(?:-nocookie)?\.com\/embed\/([\w-]{6,})/)
  return m ? `https://www.youtube.com/watch?v=${m[1]}` : src
}

export function EmbedView(props: NodeViewProps) {
  const { node, editor, getPos, updateAttributes } = props
  const editable = editor.isEditable
  const src = (node.attrs.src as string) || ""
  const frameSrc = frameSrcOf(node)
  const align = (node.attrs.align as string | null) ?? "center"
  const width = node.attrs.frameWidth as number | null
  // stored as the CSS ratio, width over height; the video's 16:9 otherwise
  const ratio = (node.attrs.aspectRatio as number | null) ?? 16 / 9
  const title = (node.attrs.title as string | null) ?? ""
  const [menuOpen, setMenuOpen] = React.useState(false)
  const [showCaption, setShowCaption] = React.useState(Boolean(title))
  const [caption, setCaption] = React.useState(title)
  const [attempt, setAttempt] = React.useState(0)
  const timer = React.useRef<ReturnType<typeof setTimeout> | undefined>(
    undefined
  )

  // the caption follows the attribute when it changes elsewhere (undo)
  const [syncedTitle, setSyncedTitle] = React.useState(title)
  if (title !== syncedTitle) {
    setSyncedTitle(title)
    setCaption(title)
    if (title) setShowCaption(true)
  }

  // a frame silent for a good while is given up on: the verdict belongs to
  // the address and the attempt it was reached for, so a new one starts clean
  const loadKey = `${attempt}|${frameSrc}`
  const [failedKey, setFailedKey] = React.useState<string | null>(null)
  React.useEffect(() => {
    if (!frameSrc) return
    timer.current = setTimeout(() => setFailedKey(loadKey), EMBED_LOAD_TIMEOUT)
    return () => clearTimeout(timer.current)
  }, [frameSrc, loadKey])
  const showFailed = failedKey === loadKey || !frameSrc

  const at = () => {
    const pos = getPos()
    return typeof pos === "number" ? pos : null
  }
  const selectEmbed = React.useCallback(() => {
    const pos = getPos()
    if (typeof pos !== "number") return
    try {
      editor.view.dispatch(
        editor.view.state.tr.setSelection(
          NodeSelection.create(editor.view.state.doc, pos)
        )
      )
    } catch {
      // the node moved out from underneath
    }
  }, [editor, getPos])

  /* ---- the ratio-locked edge drag: the width moves, the height follows */
  const commitWidth = (w: number) => {
    updateAttributes({ frameWidth: Math.round(w) })
    requestAnimationFrame(selectEmbed)
  }
  // the frame is found from the pressed pill, not held: the press is
  // where the drag begins
  const frameOf = (el: EventTarget | null) =>
    el instanceof Element
      ? el.closest<HTMLElement>("[data-embed-box]")
      : null
  const maxWidthOf = (box: HTMLElement | null) =>
    box?.parentElement?.clientWidth || editor.view.dom.clientWidth
  const startResize = (event: PressEvent, edge: "left" | "right") => {
    if (!editable) return
    event.preventDefault()
    selectEmbed()
    const box = frameOf(event.currentTarget)
    if (!box) return
    const startX = event.clientX
    const startWidth = box.offsetWidth
    const most = maxWidthOf(box)
    const onMove = (ev: PointerEvent) => {
      const delta = (ev.clientX - startX) * (edge === "left" ? -1 : 1)
      const w = Math.max(EMBED_MIN_WIDTH, Math.min(startWidth + delta, most))
      box.style.width = `${w}px`
    }
    const onUp = () => {
      window.removeEventListener("pointermove", onMove)
      window.removeEventListener("pointerup", onUp)
      window.removeEventListener("pointercancel", onUp)
      document.body.classList.remove("rte-media-resizing")
      box.removeAttribute("data-resizing")
      commitWidth(box.offsetWidth)
    }
    window.addEventListener("pointermove", onMove)
    window.addEventListener("pointerup", onUp)
    window.addEventListener("pointercancel", onUp)
    // the class carries the resize cursor over the whole page
    box.setAttribute("data-resizing", "")
    document.body.classList.add("rte-media-resizing")
  }
  const resizeBy = (target: EventTarget | null, delta: number) => {
    const box = frameOf(target)
    const current = width ?? box?.offsetWidth ?? EMBED_MIN_WIDTH * 3
    commitWidth(
      Math.max(EMBED_MIN_WIDTH, Math.min(current + delta, maxWidthOf(box)))
    )
  }

  /* ---- actions */
  const changeLink = () => {
    const pos = at()
    if (pos !== null) editor.commands.replaceEmbed(pos)
  }
  const duplicate = () => {
    const pos = at()
    if (pos === null) return
    const live = editor.state.doc.nodeAt(pos)
    if (live)
      editor.view.dispatch(editor.state.tr.insert(pos + live.nodeSize, live))
  }
  const remove = () => {
    const pos = at()
    if (pos !== null) editor.commands.removeEmbed(pos)
  }
  const toggleCaption = () => {
    const next = !showCaption
    setShowCaption(next)
    if (!next) {
      setCaption("")
      if (title) updateAttributes({ title: null })
    }
  }
  const commitCaption = () => {
    if (caption === title) return
    updateAttributes({ title: caption || null })
  }

  const chromeVisible = menuOpen && editable
  const item = (
    Icon: React.ComponentType<{ className?: string }>,
    label: string,
    run: () => void,
    checked?: boolean
  ) => (
    <DropdownMenuItem key={label} onClick={run}>
      <Icon className="size-4" />
      {label}
      {checked && <MenuCheck />}
    </DropdownMenuItem>
  )
  const keepPress = {
    onPointerDown: (e: React.PointerEvent) => e.stopPropagation(),
    onMouseDown: (e: React.MouseEvent) => {
      e.preventDefault()
      e.stopPropagation()
      // the chrome's press chooses the embed, so its actions act on it
      editor.view.focus()
      selectEmbed()
    },
  }

  return (
    <NodeViewWrapper as="div" className="rte-media rte-embed" data-drag-handle>
      <div
        data-embed-box
        className={cn(
          "relative isolate block max-w-full rounded-lg",
          align === "center" && "mx-auto",
          align === "right" && "mr-0 ml-auto",
          align === "left" && "mr-auto ml-0"
        )}
        style={{ width: width ? `${width}px` : "100%" }}
        data-sized={width ? "" : undefined}
      >
        <div className="group/embed relative overflow-hidden rounded-lg">
          {!showFailed ? (
            <>
              <iframe
                key={attempt}
                className="block w-full rounded-lg border-0"
                src={frameSrc}
                // the document's own iframe margin would gap the frame
                style={{ aspectRatio: String(ratio), margin: 0 }}
                title={title || "Embedded content"}
                allowFullScreen
                loading="lazy"
                referrerPolicy="strict-origin-when-cross-origin"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                onLoad={() => clearTimeout(timer.current)}
              />
            </>
          ) : (
            <div
              role="status"
              className="flex w-full flex-col items-center justify-center gap-1.5 rounded-lg border border-border-soft bg-background px-6"
              style={{ aspectRatio: String(ratio) }}
              onClick={(e) => {
                e.stopPropagation()
                if (editable) selectEmbed()
              }}
            >
              <CircleAlertIcon className="size-5 text-secondary-foreground" />
              <p className="max-w-[300px] text-center text-sm leading-[1.5] tracking-[0.02em] text-secondary-foreground">
                We couldn’t load a preview for this content.
                <br />
                Check the link or try again.
              </p>
              {editable && (
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  className="mt-2"
                  onClick={(e) => {
                    e.stopPropagation()
                    if (!frameSrc) changeLink()
                    else setAttempt((n) => n + 1)
                  }}
                >
                  Try again
                </Button>
              )}
            </div>
          )}

          {/* the media chrome: the pencil, then everything behind ⋯ */}
          {/* the chrome comes with the pointer, and stays while its menu is open */}
          <div
            className={cn(
              "absolute top-2.5 right-2.5 z-20 items-center gap-1.5",
              chromeVisible
                ? "flex"
                : editable
                  ? "hidden group-hover/embed:flex"
                  : "hidden"
            )}
          >
            <button
              type="button"
              className={MEDIA_CHROME_BUTTON}
              aria-label="Change link"
              title="Change link"
              {...keepPress}
              onClick={(e) => {
                e.stopPropagation()
                changeLink()
              }}
            >
              <PencilIcon className="size-4" />
            </button>
            <DropdownMenu
              open={menuOpen}
              onOpenChange={(open) => {
                setMenuOpen(open)
                if (!open && editor.isEditable)
                  setTimeout(() => {
                    if (!editor.isDestroyed) editor.view.focus()
                  }, 0)
              }}
              modal={false}
            >
              <DropdownMenuTrigger
                render={
                  <button
                    type="button"
                    className={MEDIA_CHROME_BUTTON}
                    aria-label="Media options"
                    {...keepPress}
                    onClick={(e) => e.stopPropagation()}
                  >
                    <DotHorizontalIcon className="size-4" />
                  </button>
                }
              />
              <DropdownMenuContent align="end" sideOffset={4}>
                {item(CaptionsIcon, "Captions", toggleCaption, showCaption)}
                {item(RefreshCwIcon, "Replace", changeLink)}
                {item(ExternalLinkIcon, "Open in Browser", () => {
                  const href = browserSrcOf(node)
                  if (href) window.open(href, "_blank", "noopener,noreferrer")
                })}
                <DropdownMenuSub>
                  <DropdownMenuSubTrigger>
                    <AlignLeftIcon className="size-4" />
                    Align
                  </DropdownMenuSubTrigger>
                  <DropdownMenuSubContent>
                    {ALIGN_OPTIONS.map((option) =>
                      item(
                        option.value === "left"
                          ? AlignLeftIcon
                          : option.value === "center"
                            ? AlignCenterIcon
                            : AlignRightIcon,
                        option.label,
                        () => updateAttributes({ align: option.value }),
                        align === option.value
                      )
                    )}
                  </DropdownMenuSubContent>
                </DropdownMenuSub>
                {item(CopyPlusIcon, "Duplicate", duplicate)}
                {item(Trash2Icon, "Delete", remove)}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          {/* the edge pills, as on a picture */}
          {editable && !showFailed && (
            <>
              {(["left", "right"] as const).map((edge) => (
                <button
                  key={edge}
                  type="button"
                  className={cn(
                    "absolute top-1/2 z-30 h-[66px] max-h-[50%] w-3.5 -translate-y-1/2 cursor-ew-resize touch-none items-center bg-transparent",
                    edge === "left"
                      ? "left-0 justify-start pl-1"
                      : "right-0 justify-end pr-1",
                    // with the pointer, and through a resize carried off it
                    "hidden group-hover/embed:flex [[data-resizing]_&]:flex"
                  )}
                  aria-label={`Resize embed from ${edge} edge`}
                  {...pressHandlers((e) => startResize(e, edge))}
                  onKeyDown={(e) => {
                    if (e.key === "ArrowLeft" || e.key === "ArrowUp") {
                      e.preventDefault()
                      e.stopPropagation()
                      resizeBy(e.currentTarget, -20)
                    } else if (e.key === "ArrowRight" || e.key === "ArrowDown") {
                      e.preventDefault()
                      e.stopPropagation()
                      resizeBy(e.currentTarget, 20)
                    }
                  }}
                >
                  <span className="pointer-events-none h-full w-[3px] rounded-full bg-[#383838] ring-1 ring-white" />
                </button>
              ))}
            </>
          )}
        </div>

        {/* the caption: a centred field while editing, plain text read */}
        {editable && showCaption && src ? (
          <div
            data-media-text-field
            draggable={false}
            className="w-full pt-1.5"
            onPointerDown={(e) => e.stopPropagation()}
            onMouseDown={(e) => e.stopPropagation()}
            onDragStart={(e) => {
              e.preventDefault()
              e.stopPropagation()
            }}
          >
            <input
              value={caption}
              draggable={false}
              className="h-7 w-full border-none bg-transparent text-center text-[13px] leading-[1.5] tracking-[0.015em] text-accent-foreground outline-none placeholder:text-card-foreground"
              placeholder="Add a caption"
              aria-label="Caption"
              onChange={(e) => setCaption(e.target.value)}
              onBlur={commitCaption}
              onKeyDown={(e) => {
                if (e.key === "Escape") {
                  e.preventDefault()
                  ;(e.target as HTMLInputElement).blur()
                  return
                }
                if (e.key !== "Enter") return
                // Enter writes the caption and starts the line after
                e.preventDefault()
                commitCaption()
                const pos = at()
                if (pos === null) return
                requestAnimationFrame(() => {
                  const live = editor.state.doc.nodeAt(pos)
                  if (!live) return
                  const after = pos + live.nodeSize
                  const next = editor.state.doc.nodeAt(after)
                  if (!next?.isTextblock)
                    editor.view.dispatch(
                      editor.state.tr.insert(
                        after,
                        editor.state.schema.nodes.paragraph.create()
                      )
                    )
                  editor
                    .chain()
                    .focus(undefined, { scrollIntoView: false })
                    .setTextSelection(after + 1)
                    .run()
                })
              }}
            />
          </div>
        ) : !editable && title ? (
          <div className="rte-media-caption">{title}</div>
        ) : null}
      </div>
    </NodeViewWrapper>
  )
}

/* -------------------------------- the video --------------------------------
 * An uploaded video, with the media chrome a picture and an embed carry:
 * the ring when selected, the edge pills, ⋯ with the video's six rows as
 * the branch's MediaToolbar orders them (Caption, Replace, Align, Video
 * settings: Autoplay, Loop, Muted; Duplicate, Delete) and the caption field
 * beneath. The chrome comes with the pointer; a click on the video is the
 * player's, and plays it at once. Pressing ⋯ or a pill chooses the video.
 */
const VIDEO_MIN_WIDTH = 160

/**
 * An upload is kept in the document as its data, and a player handed that
 * string (megabytes of it) decodes slowly in Safari and holds the whole of
 * it again. The player plays a blob made from it once instead, shared by
 * every copy of the same video; the document keeps the data.
 */
const playableUrls = new Map<string, Promise<string>>()
/** the blobs already made: a player drawn again (moved, undone) has its own
 * at once, with no frame of black while it is looked up */
const madeUrls = new Map<string, string>()
function playableUrl(src: string): Promise<string> {
  if (!src.startsWith("data:")) return Promise.resolve(src)
  let url = playableUrls.get(src)
  if (!url) {
    url = fetch(src)
      .then((r) => r.blob())
      .then((blob) => {
        const made = URL.createObjectURL(blob)
        madeUrls.set(src, made)
        return made
      })
      .catch(() => src)
    playableUrls.set(src, url)
  }
  return url
}
function usePlayableSrc(src: string): string | undefined {
  const [ready, setReady] = React.useState<{ src: string; url: string } | null>(
    () => {
      if (!src) return null
      if (!src.startsWith("data:")) return { src, url: src }
      const made = madeUrls.get(src)
      return made ? { src, url: made } : null
    }
  )
  React.useEffect(() => {
    if (!src) return
    let live = true
    void playableUrl(src).then((url) => {
      if (live) setReady({ src, url })
    })
    return () => {
      live = false
    }
  }, [src])
  return ready && ready.src === src ? ready.url : undefined
}

export function VideoView(props: NodeViewProps) {
  const { node, editor, getPos, updateAttributes, deleteNode } = props
  const editable = editor.isEditable
  const src = (node.attrs.src as string) || ""
  const playable = usePlayableSrc(src)
  const align = (node.attrs.align as string | null) ?? "center"
  const width = node.attrs.frameWidth as number | null
  const autoplay = Boolean(node.attrs.autoplay)
  const loop = Boolean(node.attrs.loop)
  const muted = Boolean(node.attrs.muted)
  const stored = (node.attrs.caption as string | null) ?? ""
  const [menuOpen, setMenuOpen] = React.useState(false)
  const [showCaption, setShowCaption] = React.useState(Boolean(stored))
  const [caption, setCaption] = React.useState(stored)
  const [syncedCaption, setSyncedCaption] = React.useState(stored)
  if (stored !== syncedCaption) {
    setSyncedCaption(stored)
    setCaption(stored)
    if (stored) setShowCaption(true)
  }

  const at = () => {
    const pos = getPos()
    return typeof pos === "number" ? pos : null
  }
  const selectVideo = React.useCallback(() => {
    const pos = getPos()
    if (typeof pos !== "number") return
    try {
      editor.view.dispatch(
        editor.view.state.tr.setSelection(
          NodeSelection.create(editor.view.state.doc, pos)
        )
      )
    } catch {
      // the node moved out from underneath
    }
  }, [editor, getPos])

  /* ---- the edge drag: the width moves, the player keeps its own shape */
  const frameOf = (el: EventTarget | null) =>
    el instanceof Element ? el.closest<HTMLElement>("[data-video-box]") : null
  const maxWidthOf = (box: HTMLElement | null) =>
    box?.parentElement?.clientWidth || editor.view.dom.clientWidth
  const commitWidth = (w: number) => {
    updateAttributes({ frameWidth: Math.round(w) })
    requestAnimationFrame(selectVideo)
  }
  const startResize = (event: PressEvent, edge: "left" | "right") => {
    if (!editable) return
    event.preventDefault()
    selectVideo()
    const box = frameOf(event.currentTarget)
    if (!box) return
    const startX = event.clientX
    const startWidth = box.offsetWidth
    const most = maxWidthOf(box)
    const onMove = (ev: PointerEvent) => {
      const delta = (ev.clientX - startX) * (edge === "left" ? -1 : 1)
      box.style.width = `${Math.max(VIDEO_MIN_WIDTH, Math.min(startWidth + delta, most))}px`
    }
    const onUp = () => {
      window.removeEventListener("pointermove", onMove)
      window.removeEventListener("pointerup", onUp)
      window.removeEventListener("pointercancel", onUp)
      document.body.classList.remove("rte-media-resizing")
      box.removeAttribute("data-resizing")
      commitWidth(box.offsetWidth)
    }
    window.addEventListener("pointermove", onMove)
    window.addEventListener("pointerup", onUp)
    window.addEventListener("pointercancel", onUp)
    box.setAttribute("data-resizing", "")
    document.body.classList.add("rte-media-resizing")
  }
  const resizeBy = (target: EventTarget | null, delta: number) => {
    const box = frameOf(target)
    const current = width ?? box?.offsetWidth ?? VIDEO_MIN_WIDTH * 3
    commitWidth(
      Math.max(VIDEO_MIN_WIDTH, Math.min(current + delta, maxWidthOf(box)))
    )
  }

  /* ---- actions */
  const replace = async () => {
    const [file] = await pickFiles({ accept: "video/*" })
    if (!file) return
    const next = await readAsDataURL(file)
    updateAttributes({ src: next, title: file.name })
  }
  const duplicate = () => {
    const pos = at()
    if (pos === null) return
    const live = editor.state.doc.nodeAt(pos)
    if (live)
      editor.view.dispatch(editor.state.tr.insert(pos + live.nodeSize, live))
  }
  const toggleCaption = () => {
    const next = !showCaption
    setShowCaption(next)
    if (!next) {
      setCaption("")
      if (stored) updateAttributes({ caption: null })
    }
  }
  const commitCaption = () => {
    if (caption === stored) return
    updateAttributes({ caption: caption || null })
  }

  const chromeVisible = menuOpen && editable
  const item = (
    Icon: React.ComponentType<{ className?: string }>,
    label: string,
    run: () => void,
    checked?: boolean
  ) => (
    <DropdownMenuItem key={label} onClick={run}>
      <Icon className="size-4" />
      {label}
      {checked && <MenuCheck />}
    </DropdownMenuItem>
  )

  return (
    <NodeViewWrapper as="div" className="rte-media rte-video" data-drag-handle>
      <div
        data-video-box
        className={cn(
          "relative isolate block max-w-full rounded-lg",
          align === "center" && "mx-auto",
          align === "right" && "mr-0 ml-auto",
          align === "left" && "mr-auto ml-0"
        )}
        style={{ width: width ? `${width}px` : "100%" }}
        data-sized={width ? "" : undefined}
      >
        <div className="group/video relative overflow-hidden rounded-lg">
          <video
            className="block w-full rounded-lg bg-black"
            // the document's own media margin would gap the frame
            style={{ margin: 0, aspectRatio: playable ? undefined : "16 / 9" }}
            src={playable}
            title={(node.attrs.title as string | null) ?? undefined}
            controls
            playsInline
            preload="metadata"
            autoPlay={autoplay}
            loop={loop}
            muted={muted}
          />
          {/* the chrome comes with the pointer, and stays while its menu is open */}
          <div
            className={cn(
              "absolute top-2.5 right-2.5 z-20 items-center gap-1.5",
              chromeVisible
                ? "flex"
                : editable
                  ? "hidden group-hover/video:flex"
                  : "hidden"
            )}
          >
            <DropdownMenu
              open={menuOpen}
              onOpenChange={(open) => {
                setMenuOpen(open)
                // closed, the keys go back to the document, not the button
                if (!open && editor.isEditable)
                  setTimeout(() => {
                    if (!editor.isDestroyed) editor.view.focus()
                  }, 0)
              }}
              modal={false}
            >
              <DropdownMenuTrigger
                render={
                  <button
                    type="button"
                    className={MEDIA_CHROME_BUTTON}
                    aria-label="Media options"
                    onPointerDown={(e) => e.stopPropagation()}
                    onMouseDown={(e) => {
                      e.preventDefault()
                      e.stopPropagation()
                      editor.view.focus()
                      selectVideo()
                    }}
                    onClick={(e) => e.stopPropagation()}
                  >
                    <DotHorizontalIcon className="size-4" />
                  </button>
                }
              />
              <DropdownMenuContent align="end" sideOffset={4}>
                {item(CaptionsIcon, "Caption", toggleCaption, showCaption)}
                {item(RefreshCwIcon, "Replace", () => void replace())}
                <DropdownMenuSub>
                  <DropdownMenuSubTrigger>
                    <AlignLeftIcon className="size-4" />
                    Align
                  </DropdownMenuSubTrigger>
                  <DropdownMenuSubContent>
                    {ALIGN_OPTIONS.map((option) =>
                      item(
                        option.value === "left"
                          ? AlignLeftIcon
                          : option.value === "center"
                            ? AlignCenterIcon
                            : AlignRightIcon,
                        option.label,
                        () => updateAttributes({ align: option.value }),
                        align === option.value
                      )
                    )}
                  </DropdownMenuSubContent>
                </DropdownMenuSub>
                <DropdownMenuSub>
                  <DropdownMenuSubTrigger>
                    <Settings2Icon className="size-4" />
                    Video settings
                  </DropdownMenuSubTrigger>
                  <DropdownMenuSubContent>
                    {item(PlayIcon, "Autoplay", () => updateAttributes({ autoplay: !autoplay }), autoplay)}
                    {item(RepeatIcon, "Loop", () => updateAttributes({ loop: !loop }), loop)}
                    {item(VolumeXIcon, "Muted", () => updateAttributes({ muted: !muted }), muted)}
                  </DropdownMenuSubContent>
                </DropdownMenuSub>
                {item(CopyPlusIcon, "Duplicate", duplicate)}
                {item(Trash2Icon, "Delete", () => deleteNode())}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          {editable && (
            <>
              {(["left", "right"] as const).map((edge) => (
                <button
                  key={edge}
                  type="button"
                  className={cn(
                    "absolute top-1/2 z-30 h-[66px] max-h-[50%] w-3.5 -translate-y-1/2 cursor-ew-resize touch-none items-center bg-transparent",
                    edge === "left"
                      ? "left-0 justify-start pl-1"
                      : "right-0 justify-end pr-1",
                    "hidden group-hover/video:flex [[data-resizing]_&]:flex"
                  )}
                  aria-label={`Resize video from ${edge} edge`}
                  {...pressHandlers((e) => startResize(e, edge))}
                  onKeyDown={(e) => {
                    if (e.key === "ArrowLeft" || e.key === "ArrowUp") {
                      e.preventDefault()
                      e.stopPropagation()
                      resizeBy(e.currentTarget, -20)
                    } else if (e.key === "ArrowRight" || e.key === "ArrowDown") {
                      e.preventDefault()
                      e.stopPropagation()
                      resizeBy(e.currentTarget, 20)
                    }
                  }}
                >
                  <span className="pointer-events-none h-full w-[3px] rounded-full bg-[#383838] ring-1 ring-white" />
                </button>
              ))}
            </>
          )}
        </div>

        {editable && showCaption ? (
          <div
            data-media-text-field
            draggable={false}
            className="w-full pt-1.5"
            onPointerDown={(e) => e.stopPropagation()}
            onMouseDown={(e) => e.stopPropagation()}
            onDragStart={(e) => {
              e.preventDefault()
              e.stopPropagation()
            }}
          >
            <input
              value={caption}
              draggable={false}
              className="h-7 w-full border-none bg-transparent text-center text-[13px] leading-[1.5] tracking-[0.015em] text-accent-foreground outline-none placeholder:text-card-foreground"
              placeholder="Add a caption"
              aria-label="Caption"
              onChange={(e) => setCaption(e.target.value)}
              onBlur={commitCaption}
              onKeyDown={(e) => {
                if (e.key === "Escape") {
                  e.preventDefault()
                  ;(e.target as HTMLInputElement).blur()
                  return
                }
                if (e.key !== "Enter") return
                e.preventDefault()
                commitCaption()
                const pos = at()
                if (pos === null) return
                requestAnimationFrame(() => {
                  const live = editor.state.doc.nodeAt(pos)
                  if (!live) return
                  const after = pos + live.nodeSize
                  const next = editor.state.doc.nodeAt(after)
                  if (!next?.isTextblock)
                    editor.view.dispatch(
                      editor.state.tr.insert(
                        after,
                        editor.state.schema.nodes.paragraph.create()
                      )
                    )
                  editor
                    .chain()
                    .focus(undefined, { scrollIntoView: false })
                    .setTextSelection(after + 1)
                    .run()
                })
              }}
            />
          </div>
        ) : !editable && stored ? (
          <div className="rte-media-caption">{stored}</div>
        ) : null}
      </div>
    </NodeViewWrapper>
  )
}
