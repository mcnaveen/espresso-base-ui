"use client"

/**
 * Faces overlapping by 4, the first on top. Past `max`, the group keeps
 * `keep` of them and a last disc says how many more there are.
 */
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { cn } from "@/lib/utils"

import { portraitOf } from "./sample-events"

const THEME_FILL: Record<string, string> = {
  gray: "oklch(0.964 0 0)",
  blue: "oklch(0.96 0.021 241.348)",
  green: "oklch(0.965 0.03 155.987)",
  amber: "oklch(0.967 0.045 91.733)",
  red: "oklch(0.947 0.026 17.626)",
  violet: "oklch(0.943 0.031 297.722)",
  pink: "oklch(0.952 0.028 340.005)",
  cyan: "oklch(0.96 0.029 218.179)",
}
const THEME_INK: Record<string, string> = {
  gray: "oklch(0.439 0 0)",
  blue: "oklch(0.587 0.174 252.167)",
  green: "oklch(0.57 0.119 158.092)",
  amber: "oklch(0.659 0.142 67.548)",
  red: "oklch(0.556 0.198 26.552)",
  violet: "oklch(0.545 0.18 287.523)",
  pink: "oklch(0.597 0.205 347.195)",
  cyan: "oklch(0.597 0.104 223.923)",
}

export function AvatarStack({
  names,
  size = "md",
  max = 3,
  keep,
}: {
  names: string[]
  /** md is the header's 24px; sm the 20px a 32px row can hold. */
  size?: "md" | "sm"
  max?: number
  keep?: number
}) {
  const faces = names.length > max ? names.slice(0, keep ?? max) : names
  const more = names.length - faces.length
  const sizeClass = size === "sm" ? "size-5" : "size-6"

  return (
    <div className="flex items-center -space-x-1">
      {faces.map((name, i) => {
        const portrait = portraitOf(name)
        return (
          <Avatar
            key={name}
            size={size === "sm" ? "sm" : "default"}
            className={cn(
              sizeClass,
              "ring-2 ring-[var(--stack-ring,var(--ec-surface-base,var(--background)))]"
            )}
            style={{ zIndex: faces.length + 1 - i }}
          >
            {portrait.image ? <AvatarImage src={portrait.image} alt={name} /> : null}
            <AvatarFallback
              className="text-[10px]"
              style={{
                backgroundColor: THEME_FILL[portrait.theme] ?? THEME_FILL.gray,
                color: THEME_INK[portrait.theme] ?? THEME_INK.gray,
              }}
            >
              {name
                .split(" ")
                .map((part) => part[0])
                .slice(0, 1)
                .join("")}
            </AvatarFallback>
          </Avatar>
        )
      })}
      {more ? (
        <span
          title={`${more} more`}
          className={cn(
            "inline-flex shrink-0 items-center justify-center rounded-full bg-[color:var(--ec-surface-gray-3,var(--secondary))] text-[12px] text-[color:var(--ec-ink-gray-7,var(--secondary-foreground))] ring-2 ring-[var(--stack-ring,var(--ec-surface-base,var(--background)))]",
            sizeClass
          )}
        >
          {more}
        </span>
      ) : null}
    </div>
  )
}
