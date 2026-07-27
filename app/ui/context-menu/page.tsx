"use client"

import * as React from "react"
import { Copy, Scissors, Clipboard, Trash2 } from "lucide-react"
import {
  ContextMenu,
  ContextMenuCheckboxItem,
  ContextMenuContent,
  ContextMenuGroup,
  ContextMenuItem,
  ContextMenuLabel,
  ContextMenuRadioGroup,
  ContextMenuRadioItem,
  ContextMenuSeparator,
  ContextMenuShortcut,
  ContextMenuSub,
  ContextMenuSubContent,
  ContextMenuSubTrigger,
  ContextMenuTrigger,
} from "@/components/ui/context-menu"

function SectionTitle({ children }: { children: React.ReactNode }) {
  return <h2 className="text-sm font-medium text-foreground">{children}</h2>
}

export default function ContextMenuPage() {
  const [showGrid, setShowGrid] = React.useState(true)
  const [showRulers, setShowRulers] = React.useState(false)
  const [zoom, setZoom] = React.useState("100")

  return (
    <div className="flex flex-col gap-12 p-8">
      {/* Basic */}
      <div className="flex flex-col gap-4">
        <SectionTitle>Basic</SectionTitle>
        <ContextMenu>
          <ContextMenuTrigger className="flex h-32 w-64 items-center justify-center rounded-lg border border-dashed border-border text-sm text-muted-foreground">
            Right click here
          </ContextMenuTrigger>
          <ContextMenuContent>
            <ContextMenuItem>
              <Copy />
              Copy
              <ContextMenuShortcut>⌘C</ContextMenuShortcut>
            </ContextMenuItem>
            <ContextMenuItem>
              <Scissors />
              Cut
              <ContextMenuShortcut>⌘X</ContextMenuShortcut>
            </ContextMenuItem>
            <ContextMenuItem>
              <Clipboard />
              Paste
              <ContextMenuShortcut>⌘V</ContextMenuShortcut>
            </ContextMenuItem>
            <ContextMenuSeparator />
            <ContextMenuItem variant="destructive">
              <Trash2 />
              Delete
            </ContextMenuItem>
          </ContextMenuContent>
        </ContextMenu>
      </div>

      {/* With checkboxes, radio group, and submenu */}
      <div className="flex flex-col gap-4">
        <SectionTitle>Checkboxes, radio group, and submenu</SectionTitle>
        <ContextMenu>
          <ContextMenuTrigger className="flex h-32 w-64 items-center justify-center rounded-lg border border-dashed border-border text-sm text-muted-foreground">
            Right click here
          </ContextMenuTrigger>
          <ContextMenuContent>
            <ContextMenuGroup>
              <ContextMenuLabel>View</ContextMenuLabel>
              <ContextMenuCheckboxItem
                checked={showGrid}
                onCheckedChange={setShowGrid}
              >
                Show grid
              </ContextMenuCheckboxItem>
              <ContextMenuCheckboxItem
                checked={showRulers}
                onCheckedChange={setShowRulers}
              >
                Show rulers
              </ContextMenuCheckboxItem>
            </ContextMenuGroup>
            <ContextMenuSeparator />
            <ContextMenuRadioGroup value={zoom} onValueChange={setZoom}>
              <ContextMenuLabel>Zoom</ContextMenuLabel>
              <ContextMenuRadioItem value="50">50%</ContextMenuRadioItem>
              <ContextMenuRadioItem value="100">100%</ContextMenuRadioItem>
              <ContextMenuRadioItem value="150">150%</ContextMenuRadioItem>
            </ContextMenuRadioGroup>
            <ContextMenuSeparator />
            <ContextMenuSub>
              <ContextMenuSubTrigger>More tools</ContextMenuSubTrigger>
              <ContextMenuSubContent>
                <ContextMenuItem>Save page as...</ContextMenuItem>
                <ContextMenuItem>Create shortcut...</ContextMenuItem>
                <ContextMenuItem>Inspect</ContextMenuItem>
              </ContextMenuSubContent>
            </ContextMenuSub>
          </ContextMenuContent>
        </ContextMenu>
      </div>
    </div>
  )
}
