"use client"

import * as React from "react"
import { Dialog as DialogPrimitive } from "@base-ui/react/dialog"
import { ChevronLeftIcon, ChevronRightIcon, XIcon } from "lucide-react"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"

type LightboxImage = {
  src: string
  alt?: string
}

function Lightbox({
  images,
  index,
  defaultIndex = 0,
  onIndexChange,
  open,
  defaultOpen,
  onOpenChange,
  showThumbnails = true,
}: {
  images: LightboxImage[]
  index?: number
  defaultIndex?: number
  onIndexChange?: (index: number) => void
  open?: boolean
  defaultOpen?: boolean
  onOpenChange?: (open: boolean) => void
  showThumbnails?: boolean
}) {
  const [internalIndex, setInternalIndex] = React.useState(defaultIndex)
  const current = index ?? internalIndex

  const setIndex = React.useCallback(
    (next: number) => {
      setInternalIndex(next)
      onIndexChange?.(next)
    },
    [onIndexChange]
  )

  const goPrev = React.useCallback(
    () => setIndex((current - 1 + images.length) % images.length),
    [current, images.length, setIndex]
  )
  const goNext = React.useCallback(
    () => setIndex((current + 1) % images.length),
    [current, images.length, setIndex]
  )

  const handleKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === "ArrowLeft") goPrev()
    if (event.key === "ArrowRight") goNext()
  }

  const image = images[current]

  return (
    <DialogPrimitive.Root
      open={open}
      defaultOpen={defaultOpen}
      onOpenChange={onOpenChange}
    >
      <DialogPrimitive.Portal>
        <DialogPrimitive.Backdrop
          data-slot="lightbox-backdrop"
          className="fixed inset-0 z-50 bg-black/90 duration-150 data-open:animate-in data-open:fade-in-0 data-closed:animate-out data-closed:fade-out-0"
        />
        <DialogPrimitive.Popup
          data-slot="lightbox-content"
          onKeyDown={handleKeyDown}
          className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-4 p-4 outline-none duration-150 data-open:animate-in data-open:fade-in-0 data-open:zoom-in-95 data-closed:animate-out data-closed:fade-out-0 data-closed:zoom-out-95"
        >
          <DialogPrimitive.Close
            render={
              <Button
                variant="ghost"
                size="icon"
                className="absolute top-4 right-4 text-white hover:bg-white/10 hover:text-white"
              />
            }
          >
            <XIcon />
            <span className="sr-only">Close</span>
          </DialogPrimitive.Close>

          {images.length > 1 && (
            <span className="absolute top-4 left-4 text-sm tabular-nums text-white/70">
              {current + 1} / {images.length}
            </span>
          )}

          {images.length > 1 && (
            <Button
              variant="ghost"
              size="icon"
              onClick={goPrev}
              aria-label="Previous image"
              className="absolute top-1/2 left-4 -translate-y-1/2 text-white hover:bg-white/10 hover:text-white"
            >
              <ChevronLeftIcon className="size-6" />
            </Button>
          )}

          {image && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={image.src}
              alt={image.alt ?? ""}
              className="max-h-[85vh] max-w-[90vw] rounded-lg object-contain"
            />
          )}

          {images.length > 1 && (
            <Button
              variant="ghost"
              size="icon"
              onClick={goNext}
              aria-label="Next image"
              className="absolute top-1/2 right-4 -translate-y-1/2 text-white hover:bg-white/10 hover:text-white"
            >
              <ChevronRightIcon className="size-6" />
            </Button>
          )}

          {showThumbnails && images.length > 1 && (
            <div className="flex max-w-full gap-2 overflow-x-auto px-4">
              {images.map((img, i) => (
                <button
                  key={img.src}
                  type="button"
                  onClick={() => setIndex(i)}
                  className="size-14 shrink-0 overflow-hidden rounded-md ring-2 ring-transparent transition-all data-[active=true]:ring-white"
                  data-active={i === current}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={img.src}
                    alt=""
                    className={cn(
                      "h-full w-full object-cover opacity-50 transition-opacity hover:opacity-100",
                      i === current && "opacity-100"
                    )}
                  />
                </button>
              ))}
            </div>
          )}
        </DialogPrimitive.Popup>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  )
}

export { Lightbox, type LightboxImage }
