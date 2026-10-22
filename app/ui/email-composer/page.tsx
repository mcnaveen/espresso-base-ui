"use client"

import * as React from "react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbList,
  BreadcrumbPage,
} from "@/components/ui/breadcrumb"
import {
  EmailComposer,
  type EmailComposerPerson,
  type EmailDraft,
} from "@/components/ui/email-composer"
import { ComposeIcon } from "@/components/ui/email-composer-icons"

// The Email composer page, after the playground's EmailComposerPage.vue: a
// 48px header with the Compose button at its right end (sm, solid, the edit
// glyph before the word), and an empty stage the composer floats over,
// pinned 24 in from its bottom-right corner.

/** who can be written to — the names the file shows, with their faces */
const people: EmailComposerPerson[] = [
  "Michael Johnson",
  "Alison Samuel",
  "Jay Smith",
  "John Armstrong",
  "Sandeep Prabhakaran",
  "Joan Smith",
  "Emily Taylor",
  "Faris Ansari",
].map((name) => {
  const first = name.split(" ")[0].toLowerCase()
  return {
    label: name,
    value: `${first}@frappe.io`,
    avatar: `/images/email-composer/${first}.png`,
  }
})

export default function EmailComposerPage() {
  const [open, setOpen] = React.useState(false)
  // the ⋮ menu's two settings outlast one composer, so the page holds them
  const [fullScreen, setFullScreen] = React.useState(false)
  const [spellCheck, setSpellCheck] = React.useState(true)
  // a discarded draft, brought back by the toast's Undo
  const [draft, setDraft] = React.useState<EmailDraft | null>(null)
  // a fresh composer each time one opens
  const [key, setKey] = React.useState(0)

  const compose = (from: EmailDraft | null) => {
    setDraft(from)
    setKey((k) => k + 1)
    setOpen(true)
  }
  const closed = () => {
    setOpen(false)
    setDraft(null)
  }
  const discarded = (d: EmailDraft) =>
    toast("Draft discarded", {
      closeButton: true,
      action: { label: "Undo", onClick: () => compose(d) },
    })

  return (
    <div className="flex h-full min-h-0 flex-col">
      <header className="flex h-12 shrink-0 items-center justify-between border-b border-border-soft py-2.5 pr-5 pl-[18px]">
        <Breadcrumb size="md">
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbPage className="px-0.5 text-lg font-medium text-foreground">
                Mail
              </BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>
        <Button size="sm" onClick={() => compose(null)}>
          <ComposeIcon className="size-4" />
          Compose
        </Button>
      </header>

      {/* the stage: the composer sits in its bottom-right corner, 24 in */}
      <div className="relative min-h-0 flex-1">
        {open && (
          <EmailComposer
            key={key}
            people={people}
            initial={draft}
            fullScreenDefault={fullScreen}
            onFullScreenDefaultChange={setFullScreen}
            spellCheck={spellCheck}
            onSpellCheckChange={setSpellCheck}
            onSend={() => toast("Message sent")}
            onClose={closed}
            onDiscard={discarded}
          />
        )}
      </div>
    </div>
  )
}
