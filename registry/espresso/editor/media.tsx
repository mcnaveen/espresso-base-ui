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
    freshImages.add(src)
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
    freshImages.add(image.src)
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
        if (!node || node.type.name !== "embed") return
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
      className="rte-player flex h-[42px] w-full items-center gap-2 rounded-xl border border-border-soft bg-input px-[5px] py-0.5"
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
        className="shrink-0 text-base tabular-nums text-accent-foreground"
        aria-live="off"
      >
        {playerClock(position)} / {playerClock(duration)}
      </span>
      <div className="flex shrink-0 items-center gap-1">
        <button
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
  const { node, editor, deleteNode } = props
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

/** the pictures laid down this session: their caption field opens for
 * them, right where a caption is normally written */
export const freshImages = new Set<string>()

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

export function ImageView(props: NodeViewProps) {
  const { node, editor, selected, getPos, updateAttributes, deleteNode } =
    props
  const editable = editor.isEditable
  const src = (node.attrs.src as string) || ""
  const align = (node.attrs.align as string | null) ?? "center"
  const width = node.attrs.width as number | null
  const [menuOpen, setMenuOpen] = React.useState(false)
  // the user's explicit caption toggle; null means "use the default"
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
      : Boolean(node.attrs.caption) || (editable && freshImages.has(src))

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
    const aspect = el.offsetWidth ? el.offsetHeight / el.offsetWidth : 1
    // in a picture row the cell is the most there is; elsewhere the page
    const inRow = !!box?.closest("[data-type='columns'][data-media='true']")
    const maxWidth =
      (inRow ? box?.parentElement?.clientWidth : undefined) ||
      editor.view.dom.clientWidth
    const onMove = (ev: PointerEvent) => {
      const delta = (ev.clientX - startX) * (edge === "left" ? -1 : 1)
      const w = Math.max(50, Math.min(startWidth + delta, maxWidth))
      el.style.width = `${w}px`
      el.style.height = `${w * aspect}px`
      if (box) {
        box.style.width = `${w}px`
        box.setAttribute("data-sized", "")
      }
    }
    const onUp = () => {
      window.removeEventListener("pointermove", onMove)
      window.removeEventListener("pointerup", onUp)
      window.removeEventListener("pointercancel", onUp)
      document.body.style.cursor = ""
      document.body.classList.remove("rte-media-resizing")
      const w = el.offsetWidth
      const h = el.offsetHeight
      commitSize(w, h)
      requestAnimationFrame(() => {
        el.style.width = ""
        el.style.height = ""
      })
    }
    document.body.classList.add("rte-media-resizing")
    window.addEventListener("pointermove", onMove)
    window.addEventListener("pointerup", onUp)
    window.addEventListener("pointercancel", onUp)
    document.body.style.cursor = "ew-resize"
  }
  const resizeBy = (delta: number) => {
    const el = imgRef.current
    const current = width || el?.offsetWidth || 320
    const aspect = el?.offsetWidth ? el.offsetHeight / el.offsetWidth : 1
    const w = Math.max(50, current + delta)
    commitSize(w, w * aspect)
  }
  const resizeTo = (fraction: number) => {
    selectMedia()
    const el = imgRef.current
    const available =
      boxRef.current?.parentElement?.clientWidth || el?.offsetWidth || 320
    const aspect = el?.offsetWidth ? el.offsetHeight / el.offsetWidth : 1
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

  const chromeVisible = (selected || menuOpen) && editable
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
          "group relative isolate block max-w-full overflow-hidden rounded-lg",
          align === "center" && "mx-auto",
          align === "right" && "mr-0 ml-auto",
          align === "left" && "mr-auto ml-0",
          // the design's picture ring: a 1px ink-gray-6 line 4px outside
          selected &&
            "ring-1 ring-[color:var(--muted-foreground)] ring-offset-4 ring-offset-[var(--background)]"
        )}
        style={{ width: width ? `${width}px` : "auto" }}
        data-sized={width ? "" : undefined}
      >
        <div className="relative">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            ref={imgRef}
            className="rounded-lg"
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
              chromeVisible ? "flex" : "hidden"
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

          {/* the design's edge pills, the hand's target 14px deep */}
          {selected && editable && (
            <>
              {(["left", "right"] as const).map((edge) => (
                <button
                  key={edge}
                  type="button"
                  className={cn(
                    "absolute top-1/2 z-30 flex h-[66px] max-h-[50%] w-3.5 -translate-y-1/2 cursor-ew-resize touch-none items-center bg-transparent",
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
