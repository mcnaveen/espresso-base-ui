import { Accordion as AccordionPrimitive } from "@base-ui/react/accordion"
import { cn } from "@/lib/utils"
import { ChevronDownIcon } from "lucide-react"

// frappe-ui's Accordion (espresso): items ruled apart in outline-gray-1, a
// 14px medium title on a 12 / 8 row, the chevron at its end turned up when
// open, and the panel's 14px / 1.5 text 8 in. The panel opens to the height
// base-ui measures into --accordion-panel-height, in CSS alone.

function Accordion({ className, ...props }: AccordionPrimitive.Root.Props) {
  return (
    <AccordionPrimitive.Root
      data-slot="accordion"
      className={cn("flex w-full flex-col divide-y divide-border-soft", className)}
      {...props}
    />
  )
}

function AccordionItem({ className, ...props }: AccordionPrimitive.Item.Props) {
  return (
    <AccordionPrimitive.Item
      data-slot="accordion-item"
      className={className}
      {...props}
    />
  )
}

function AccordionTrigger({
  className,
  children,
  ...props
}: AccordionPrimitive.Trigger.Props) {
  return (
    <AccordionPrimitive.Header className="m-0 flex">
      <AccordionPrimitive.Trigger
        data-slot="accordion-trigger"
        className={cn(
          "group/accordion-trigger flex flex-1 items-center gap-2 rounded-2xs px-2 py-3 text-left text-base leading-[1.35] font-medium tracking-[0.02em] text-foreground outline-none select-none transition-colors duration-150 active:transform-none! data-pressed:transform-none! focus-visible:ring-2 focus-visible:ring-border-normal focus-visible:ring-inset data-disabled:cursor-not-allowed data-disabled:text-card-foreground",
          className
        )}
        {...props}
      >
        {/* the title, a leading icon in ink-gray-6 before it */}
        <span
          data-slot="accordion-trigger-label"
          className="flex min-w-0 flex-1 items-center gap-2 [&>svg]:size-4 [&>svg]:shrink-0 [&>svg]:text-muted-foreground"
        >
          {typeof children === "string" ? (
            <span className="truncate">{children}</span>
          ) : (
            children
          )}
        </span>
        <ChevronDownIcon
          data-slot="accordion-trigger-icon"
          aria-hidden="true"
          className="pointer-events-none size-4 shrink-0 text-accent-foreground transition-[rotate,color] duration-200 ease-[cubic-bezier(0.23,1,0.32,1)] group-[:hover:not([data-disabled])]/accordion-trigger:text-foreground group-data-disabled/accordion-trigger:text-card-foreground group-data-disabled/accordion-trigger:opacity-60 group-data-panel-open/accordion-trigger:rotate-180 motion-reduce:transition-none"
        />
      </AccordionPrimitive.Trigger>
    </AccordionPrimitive.Header>
  )
}

function AccordionContent({
  className,
  children,
  ...props
}: AccordionPrimitive.Panel.Props) {
  return (
    <AccordionPrimitive.Panel
      data-slot="accordion-content"
      className="h-(--accordion-panel-height) overflow-hidden transition-[height,opacity] duration-200 ease-[cubic-bezier(0.23,1,0.32,1)] data-ending-style:h-0 data-ending-style:opacity-0 data-starting-style:h-0 data-starting-style:opacity-0 motion-reduce:transition-none"
      {...props}
    >
      <div
        className={cn(
          "px-2 pb-3 text-base leading-[1.5] tracking-[0.02em] text-muted-foreground [&_a]:underline [&_a]:underline-offset-3 [&_a]:hover:text-foreground [&_p:not(:last-child)]:mb-4",
          className
        )}
      >
        {children}
      </div>
    </AccordionPrimitive.Panel>
  )
}

export { Accordion, AccordionItem, AccordionTrigger, AccordionContent }
