"use client"

import * as React from "react"
import { Lightbox, type LightboxImage } from "@/components/ui/lightbox"
import { Button } from "@/components/ui/button"

function SectionTitle({ children }: { children: React.ReactNode }) {
  return <h2 className="text-sm font-medium text-foreground">{children}</h2>
}

const PHOTO_IDS = [1015, 1025, 1035, 1045, 1055, 1062, 1074, 1080]

const images: LightboxImage[] = PHOTO_IDS.map((id) => ({
  src: `https://picsum.photos/id/${id}/1200/800`,
  alt: `Photo ${id}`,
}))

function PhotoGrid({
  ids,
  onOpen,
}: {
  ids: number[]
  onOpen: (index: number) => void
}) {
  return (
    <div className="grid grid-cols-4 gap-2">
      {ids.map((id, i) => (
        <button
          key={id}
          type="button"
          onClick={() => onOpen(i)}
          className="overflow-hidden rounded-lg"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={`https://picsum.photos/id/${id}/300/300`}
            alt=""
            className="aspect-square w-full object-cover transition-opacity hover:opacity-80"
          />
        </button>
      ))}
    </div>
  )
}

function GalleryDemo() {
  const [open, setOpen] = React.useState(false)
  const [index, setIndex] = React.useState(0)

  return (
    <div className="w-full max-w-md">
      <PhotoGrid
        ids={PHOTO_IDS}
        onOpen={(i) => {
          setIndex(i)
          setOpen(true)
        }}
      />
      <Lightbox
        images={images}
        open={open}
        onOpenChange={setOpen}
        index={index}
        onIndexChange={setIndex}
      />
    </div>
  )
}

function SingleImageDemo() {
  const [open, setOpen] = React.useState(false)

  return (
    <>
      <Button variant="outline" onClick={() => setOpen(true)}>
        Open image
      </Button>
      <Lightbox
        images={[images[0]]}
        open={open}
        onOpenChange={setOpen}
        showThumbnails={false}
      />
    </>
  )
}

export default function LightboxPage() {
  return (
    <div className="flex flex-col gap-12 p-8">
      {/* Gallery */}
      <div className="flex flex-col gap-4">
        <SectionTitle>Gallery</SectionTitle>
        <p className="text-sm text-muted-foreground">
          Click a thumbnail to open it at that index. Use arrow keys or the
          on-screen controls to navigate.
        </p>
        <GalleryDemo />
      </div>

      {/* Single image */}
      <div className="flex flex-col gap-4">
        <SectionTitle>Single image</SectionTitle>
        <SingleImageDemo />
      </div>
    </div>
  )
}
