"use client"

import {
  Carousel,
  CarouselContent,
  CarouselDots,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel"
import { Card, CardContent } from "@/components/ui/card"

function SectionTitle({ children }: { children: React.ReactNode }) {
  return <h2 className="text-sm font-medium text-foreground">{children}</h2>
}

function Slide({ children }: { children: React.ReactNode }) {
  return (
    <Card className="flex aspect-video items-center justify-center">
      <CardContent className="text-4xl font-semibold text-muted-foreground">
        {children}
      </CardContent>
    </Card>
  )
}

const PHOTO_IDS = [1015, 1025, 1035, 1045, 1055]

export default function CarouselPage() {
  return (
    <div className="flex flex-col gap-12 p-8">
      {/* Images */}
      <div className="flex flex-col gap-4">
        <SectionTitle>Images</SectionTitle>
        <Carousel opts={{ loop: true }} className="w-full max-w-md">
          <CarouselContent>
            {PHOTO_IDS.map((id) => (
              <CarouselItem key={id}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={`https://picsum.photos/id/${id}/800/450`}
                  alt=""
                  className="aspect-video w-full rounded-xl object-cover"
                />
              </CarouselItem>
            ))}
          </CarouselContent>
          <CarouselPrevious />
          <CarouselNext />
          <div className="mt-4">
            <CarouselDots />
          </div>
        </Carousel>
      </div>

      {/* Basic */}
      <div className="flex flex-col gap-4">
        <SectionTitle>Basic</SectionTitle>
        <Carousel className="w-full max-w-xs">
          <CarouselContent>
            {Array.from({ length: 5 }).map((_, i) => (
              <CarouselItem key={i}>
                <Slide>{i + 1}</Slide>
              </CarouselItem>
            ))}
          </CarouselContent>
          <CarouselPrevious />
          <CarouselNext />
        </Carousel>
      </div>

      {/* Multiple items per view */}
      <div className="flex flex-col gap-4">
        <SectionTitle>Multiple items</SectionTitle>
        <Carousel
          opts={{ align: "start" }}
          className="w-full max-w-sm"
        >
          <CarouselContent>
            {Array.from({ length: 8 }).map((_, i) => (
              <CarouselItem key={i} className="basis-1/3">
                <Slide>{i + 1}</Slide>
              </CarouselItem>
            ))}
          </CarouselContent>
          <CarouselPrevious />
          <CarouselNext />
        </Carousel>
      </div>

      {/* With dots */}
      <div className="flex flex-col gap-4">
        <SectionTitle>With dots</SectionTitle>
        <Carousel className="w-full max-w-xs">
          <CarouselContent>
            {Array.from({ length: 4 }).map((_, i) => (
              <CarouselItem key={i}>
                <Slide>{i + 1}</Slide>
              </CarouselItem>
            ))}
          </CarouselContent>
          <div className="mt-4">
            <CarouselDots />
          </div>
        </Carousel>
      </div>

      {/* Vertical */}
      <div className="flex flex-col gap-4">
        <SectionTitle>Vertical</SectionTitle>
        <Carousel
          orientation="vertical"
          opts={{ align: "start" }}
          className="w-full max-w-xs"
        >
          <CarouselContent className="h-64">
            {Array.from({ length: 4 }).map((_, i) => (
              <CarouselItem key={i} className="basis-1/2">
                <Slide>{i + 1}</Slide>
              </CarouselItem>
            ))}
          </CarouselContent>
          <CarouselPrevious />
          <CarouselNext />
        </Carousel>
      </div>

      {/* Loop */}
      <div className="flex flex-col gap-4">
        <SectionTitle>Loop</SectionTitle>
        <Carousel opts={{ loop: true }} className="w-full max-w-xs">
          <CarouselContent>
            {Array.from({ length: 5 }).map((_, i) => (
              <CarouselItem key={i}>
                <Slide>{i + 1}</Slide>
              </CarouselItem>
            ))}
          </CarouselContent>
          <CarouselPrevious />
          <CarouselNext />
        </Carousel>
      </div>
    </div>
  )
}
