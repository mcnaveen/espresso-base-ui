"use client"

import {
  Accordion,
  AccordionItem,
  AccordionTrigger,
  AccordionContent,
} from "@/components/ui/accordion"

function SectionTitle({ children }: { children: React.ReactNode }) {
  return <h2 className="text-sm font-medium text-foreground">{children}</h2>
}

export default function AccordionPage() {
  return (
    <div className="flex flex-col gap-12 p-8">
      {/* Single */}
      <div className="flex max-w-md flex-col gap-4">
        <SectionTitle>Single</SectionTitle>
        <Accordion defaultValue={["item-1"]}>
          <AccordionItem value="item-1">
            <AccordionTrigger>What is Espresso UI?</AccordionTrigger>
            <AccordionContent>
              A component library built on Base UI, styled with Tailwind.
            </AccordionContent>
          </AccordionItem>
          <AccordionItem value="item-2">
            <AccordionTrigger>Is it accessible?</AccordionTrigger>
            <AccordionContent>
              Yes, primitives come from Base UI and follow WAI-ARIA patterns.
            </AccordionContent>
          </AccordionItem>
          <AccordionItem value="item-3">
            <AccordionTrigger>Can I customize the styles?</AccordionTrigger>
            <AccordionContent>
              Every class is editable since you own the component source.
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      </div>

      {/* Multiple */}
      <div className="flex max-w-md flex-col gap-4">
        <SectionTitle>Multiple</SectionTitle>
        <Accordion multiple defaultValue={["item-1", "item-2"]}>
          <AccordionItem value="item-1">
            <AccordionTrigger>First section</AccordionTrigger>
            <AccordionContent>Both sections can stay open.</AccordionContent>
          </AccordionItem>
          <AccordionItem value="item-2">
            <AccordionTrigger>Second section</AccordionTrigger>
            <AccordionContent>
              Toggling one doesn&apos;t close the other.
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      </div>

      {/* Disabled item */}
      <div className="flex max-w-md flex-col gap-4">
        <SectionTitle>Disabled item</SectionTitle>
        <Accordion defaultValue={["item-1"]}>
          <AccordionItem value="item-1">
            <AccordionTrigger>Available section</AccordionTrigger>
            <AccordionContent>This one works as usual.</AccordionContent>
          </AccordionItem>
          <AccordionItem value="item-2" disabled>
            <AccordionTrigger>Disabled section</AccordionTrigger>
            <AccordionContent>You shouldn&apos;t see this.</AccordionContent>
          </AccordionItem>
        </Accordion>
      </div>
    </div>
  )
}
