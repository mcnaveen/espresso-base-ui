"use client"

import * as React from "react"
import { CreditCard, Package, ShieldCheck, Truck } from "lucide-react"
import {
  Accordion,
  AccordionItem,
  AccordionTrigger,
  AccordionContent,
} from "@/components/ui/accordion"
import { Badge } from "@/components/ui/badge"

function SectionTitle({ children }: { children: React.ReactNode }) {
  return <h2 className="text-sm font-medium text-foreground">{children}</h2>
}

export default function AccordionPage() {
  const [value, setValue] = React.useState<string[]>(["item-1"])

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

      {/* Controlled */}
      <div className="flex max-w-md flex-col gap-4">
        <SectionTitle>Controlled</SectionTitle>
        <Accordion multiple value={value} onValueChange={setValue}>
          <AccordionItem value="item-1">
            <AccordionTrigger>Shipping</AccordionTrigger>
            <AccordionContent>
              Orders ship within 2 business days.
            </AccordionContent>
          </AccordionItem>
          <AccordionItem value="item-2">
            <AccordionTrigger>Returns</AccordionTrigger>
            <AccordionContent>
              Free returns within 30 days of delivery.
            </AccordionContent>
          </AccordionItem>
          <AccordionItem value="item-3">
            <AccordionTrigger>Warranty</AccordionTrigger>
            <AccordionContent>
              Covered by a 1-year limited warranty.
            </AccordionContent>
          </AccordionItem>
        </Accordion>
        <p className="text-sm text-muted-foreground">
          Open: {value.length > 0 ? value.join(", ") : "none"}
        </p>
      </div>

      {/* With icons */}
      <div className="flex max-w-md flex-col gap-4">
        <SectionTitle>With icons</SectionTitle>
        <Accordion defaultValue={["shipping"]}>
          <AccordionItem value="shipping">
            <AccordionTrigger>
              <span className="flex items-center gap-2">
                <Truck className="size-4 text-muted-foreground" />
                Shipping details
              </span>
            </AccordionTrigger>
            <AccordionContent>
              Standard delivery in 3–5 business days.
            </AccordionContent>
          </AccordionItem>
          <AccordionItem value="payment">
            <AccordionTrigger>
              <span className="flex items-center gap-2">
                <CreditCard className="size-4 text-muted-foreground" />
                Payment methods
              </span>
            </AccordionTrigger>
            <AccordionContent>
              We accept all major cards and PayPal.
            </AccordionContent>
          </AccordionItem>
          <AccordionItem value="security">
            <AccordionTrigger>
              <span className="flex items-center gap-2">
                <ShieldCheck className="size-4 text-muted-foreground" />
                Payment security
              </span>
            </AccordionTrigger>
            <AccordionContent>
              All transactions are encrypted and PCI compliant.
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      </div>

      {/* Rich content */}
      <div className="flex max-w-md flex-col gap-4">
        <SectionTitle>Rich content</SectionTitle>
        <Accordion defaultValue={["order-1"]}>
          <AccordionItem value="order-1">
            <AccordionTrigger>
              <span className="flex flex-1 items-center justify-between pr-2">
                <span className="flex items-center gap-2">
                  <Package className="size-4 text-muted-foreground" />
                  Order #4021
                </span>
                <Badge variant="secondary">Delivered</Badge>
              </span>
            </AccordionTrigger>
            <AccordionContent>
              <div className="flex flex-col gap-1 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Placed</span>
                  <span className="text-foreground">Jul 12, 2026</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Items</span>
                  <span className="text-foreground">3</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Total</span>
                  <span className="text-foreground">$128.40</span>
                </div>
              </div>
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      </div>
    </div>
  )
}
