"use client"

import * as React from "react"
import { NavigationMenu as NavigationMenuPrimitive } from "@base-ui/react/navigation-menu"
import { ChevronDownIcon } from "lucide-react"
import { cva } from "class-variance-authority"

import { cn } from "@/lib/utils"

function NavigationMenu({
  className,
  children,
  ...props
}: NavigationMenuPrimitive.Root.Props) {
  return (
    <NavigationMenuPrimitive.Root
      data-slot="navigation-menu"
      className={cn("relative flex w-max max-w-full flex-1 items-center justify-center", className)}
      {...props}
    >
      {children}
      <NavigationMenuViewport />
    </NavigationMenuPrimitive.Root>
  )
}

function NavigationMenuList({
  className,
  ...props
}: NavigationMenuPrimitive.List.Props) {
  return (
    <NavigationMenuPrimitive.List
      data-slot="navigation-menu-list"
      className={cn(
        "group flex flex-1 list-none items-center justify-center gap-1",
        className
      )}
      {...props}
    />
  )
}

function NavigationMenuItem({
  className,
  ...props
}: NavigationMenuPrimitive.Item.Props) {
  return (
    <NavigationMenuPrimitive.Item
      data-slot="navigation-menu-item"
      className={cn("relative", className)}
      {...props}
    />
  )
}

const navigationMenuTriggerVariants = cva(
  "group inline-flex h-8 w-max items-center justify-center gap-1.5 rounded-md bg-transparent px-2.5 text-base leading-base font-medium tracking-normal text-secondary-foreground outline-none transition-colors hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring/50 data-popup-open:bg-muted disabled:pointer-events-none disabled:opacity-50"
)

function NavigationMenuTrigger({
  className,
  children,
  ...props
}: NavigationMenuPrimitive.Trigger.Props) {
  return (
    <NavigationMenuPrimitive.Trigger
      data-slot="navigation-menu-trigger"
      className={cn(navigationMenuTriggerVariants(), className)}
      {...props}
    >
      {children}
      <ChevronDownIcon className="size-3.5 text-muted-foreground transition-transform duration-200 group-data-popup-open:rotate-180" />
    </NavigationMenuPrimitive.Trigger>
  )
}

function NavigationMenuContent({
  className,
  ...props
}: NavigationMenuPrimitive.Content.Props) {
  return (
    <NavigationMenuPrimitive.Content
      data-slot="navigation-menu-content"
      className={cn(
        "w-full p-2 duration-100 data-[activation-direction=left]:slide-in-from-left-12 data-[activation-direction=right]:slide-in-from-right-12 data-ending-style:opacity-0 data-starting-style:opacity-0",
        className
      )}
      {...props}
    />
  )
}

function NavigationMenuLink({
  className,
  ...props
}: NavigationMenuPrimitive.Link.Props) {
  return (
    <NavigationMenuPrimitive.Link
      data-slot="navigation-menu-link"
      className={cn(
        "flex flex-col gap-1 rounded-md p-2 text-sm outline-none transition-colors hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring/50 data-active:bg-secondary",
        className
      )}
      {...props}
    />
  )
}

function NavigationMenuPortal({
  ...props
}: NavigationMenuPrimitive.Portal.Props) {
  return (
    <NavigationMenuPrimitive.Portal
      data-slot="navigation-menu-portal"
      {...props}
    />
  )
}

function NavigationMenuViewport({
  className,
  ...props
}: NavigationMenuPrimitive.Viewport.Props) {
  return (
    <NavigationMenuPrimitive.Portal>
      <NavigationMenuPrimitive.Positioner
        className="isolate z-50"
        collisionPadding={16}
      >
        <NavigationMenuPrimitive.Popup
          data-slot="navigation-menu-popup"
          className="relative h-(--popup-height) w-(--popup-width) origin-(--transform-origin) overflow-hidden rounded-xl bg-popover text-popover-foreground shadow-5xs duration-150 data-ending-style:opacity-0 data-starting-style:opacity-0"
        >
          <NavigationMenuPrimitive.Viewport
            data-slot="navigation-menu-viewport"
            className={cn("relative h-full w-full", className)}
            {...props}
          />
        </NavigationMenuPrimitive.Popup>
      </NavigationMenuPrimitive.Positioner>
    </NavigationMenuPrimitive.Portal>
  )
}

export {
  NavigationMenu,
  NavigationMenuContent,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
  NavigationMenuPortal,
  NavigationMenuTrigger,
  navigationMenuTriggerVariants,
  NavigationMenuViewport,
}
