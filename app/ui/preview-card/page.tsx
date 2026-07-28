"use client"

import {
  PreviewCard,
  PreviewCardContent,
  PreviewCardTrigger,
} from "@/components/ui/preview-card"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"

function SectionTitle({ children }: { children: React.ReactNode }) {
  return <h2 className="text-sm font-medium text-foreground">{children}</h2>
}

export default function PreviewCardPage() {
  return (
    <div className="flex flex-col gap-12 p-8">
      {/* Basic */}
      <div className="flex flex-col gap-4">
        <SectionTitle>Basic</SectionTitle>
        <p className="max-w-md text-sm text-muted-foreground">
          Follow{" "}
          <PreviewCard>
            <PreviewCardTrigger href="#">@espressoui</PreviewCardTrigger>
            <PreviewCardContent>
              <div className="flex items-center gap-3">
                <Avatar className="size-10">
                  <AvatarFallback>EU</AvatarFallback>
                </Avatar>
                <div>
                  <p className="font-medium text-foreground">Espresso UI</p>
                  <p className="text-sm text-muted-foreground">@espressoui</p>
                </div>
              </div>
              <p className="mt-3 text-sm text-secondary-foreground">
                A component library built on Base UI, styled with Tailwind.
              </p>
            </PreviewCardContent>
          </PreviewCard>{" "}
          for updates.
        </p>
      </div>

      {/* User mention */}
      <div className="flex flex-col gap-4">
        <SectionTitle>User mention</SectionTitle>
        <p className="max-w-md text-sm text-muted-foreground">
          Reviewed by{" "}
          <PreviewCard>
            <PreviewCardTrigger href="#">Ravi Kumar</PreviewCardTrigger>
            <PreviewCardContent className="w-64">
              <div className="flex items-center gap-3">
                <Avatar className="size-10">
                  <AvatarImage src="https://i.pravatar.cc/80?img=12" />
                  <AvatarFallback>RK</AvatarFallback>
                </Avatar>
                <div>
                  <p className="font-medium text-foreground">Ravi Kumar</p>
                  <p className="text-sm text-muted-foreground">
                    Senior Engineer
                  </p>
                </div>
              </div>
              <div className="mt-3 flex gap-4 text-sm">
                <span className="text-foreground">
                  128{" "}
                  <span className="text-muted-foreground">reviews</span>
                </span>
                <span className="text-foreground">
                  4.9 <span className="text-muted-foreground">rating</span>
                </span>
              </div>
            </PreviewCardContent>
          </PreviewCard>{" "}
          on Jul 22.
        </p>
      </div>

      {/* Custom delay */}
      <div className="flex flex-col gap-4">
        <SectionTitle>Custom delay</SectionTitle>
        <p className="max-w-md text-sm text-muted-foreground">
          Opens almost instantly:{" "}
          <PreviewCard>
            <PreviewCardTrigger href="#" delay={50} closeDelay={0}>
              hover me
            </PreviewCardTrigger>
            <PreviewCardContent className="w-56">
              <p className="text-sm text-secondary-foreground">
                No 600ms wait — good for frequently-scanned lists.
              </p>
            </PreviewCardContent>
          </PreviewCard>
        </p>
      </div>

      {/* On a button */}
      <div className="flex flex-col gap-4">
        <SectionTitle>On a non-link trigger</SectionTitle>
        <PreviewCard>
          <PreviewCardTrigger
            render={<Button variant="outline">Pricing plan</Button>}
          />
          <PreviewCardContent className="w-64">
            <p className="font-medium text-foreground">Pro plan</p>
            <p className="mt-1 text-sm text-secondary-foreground">
              $20/month · Unlimited projects, priority support, and advanced
              analytics.
            </p>
          </PreviewCardContent>
        </PreviewCard>
      </div>

      {/* Placement */}
      <div className="flex flex-col gap-4">
        <SectionTitle>Placement</SectionTitle>
        <div className="flex flex-wrap items-center gap-6 text-sm text-muted-foreground">
          {(["top", "right", "bottom", "left"] as const).map((side) => (
            <PreviewCard key={side}>
              <PreviewCardTrigger href="#" className="capitalize">
                {side}
              </PreviewCardTrigger>
              <PreviewCardContent side={side} className="w-48">
                <p className="text-sm text-secondary-foreground">
                  Positioned on the {side}.
                </p>
              </PreviewCardContent>
            </PreviewCard>
          ))}
        </div>
      </div>
    </div>
  )
}
