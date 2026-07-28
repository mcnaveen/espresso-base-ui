"use client"

import * as React from "react"
import {
  Copy,
  Scissors,
  Clipboard,
  Trash2,
  Pencil,
  Archive,
  Download,
} from "lucide-react"
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

      {/* Disabled and inset items */}
      <div className="flex flex-col gap-4">
        <SectionTitle>Disabled and inset items</SectionTitle>
        <ContextMenu>
          <ContextMenuTrigger className="flex h-32 w-64 items-center justify-center rounded-lg border border-dashed border-border text-sm text-muted-foreground">
            Right click here
          </ContextMenuTrigger>
          <ContextMenuContent>
            <ContextMenuItem inset>Reload</ContextMenuItem>
            <ContextMenuItem inset disabled>
              Forward
            </ContextMenuItem>
            <ContextMenuItem inset>Save as...</ContextMenuItem>
            <ContextMenuSeparator />
            <ContextMenuItem inset disabled>
              Print...
            </ContextMenuItem>
          </ContextMenuContent>
        </ContextMenu>
      </div>

      {/* File row */}
      <div className="flex flex-col gap-4">
        <SectionTitle>File row</SectionTitle>
        <ContextMenu>
          <ContextMenuTrigger className="flex w-80 items-center justify-between rounded-lg border border-border px-3 py-2 text-sm">
            <span className="text-foreground">quarterly-report.pdf</span>
            <span className="text-xs text-muted-foreground">2.4 MB</span>
          </ContextMenuTrigger>
          <ContextMenuContent>
            <ContextMenuItem>
              <Pencil />
              Rename
            </ContextMenuItem>
            <ContextMenuItem>
              <Download />
              Download
            </ContextMenuItem>
            <ContextMenuItem>
              <Archive />
              Archive
            </ContextMenuItem>
            <ContextMenuSeparator />
            <ContextMenuItem variant="destructive">
              <Trash2 />
              Move to trash
            </ContextMenuItem>
          </ContextMenuContent>
        </ContextMenu>
      </div>
    </div>
  )
}
