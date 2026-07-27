"use client"

import { Meter, MeterLabel, MeterValue } from "@/components/ui/meter"

function SectionTitle({ children }: { children: React.ReactNode }) {
  return <h2 className="text-sm font-medium text-foreground">{children}</h2>
}

export default function MeterPage() {
  return (
    <div className="flex flex-col gap-12 p-8">
      {/* Default */}
      <div className="flex flex-col gap-4">
        <SectionTitle>Default</SectionTitle>
        <Meter value={60} className="w-80" />
      </div>

      {/* With Label */}
      <div className="flex flex-col gap-4">
        <SectionTitle>With Label</SectionTitle>
        <Meter value={45} className="w-80">
          <MeterLabel>Storage used</MeterLabel>
        </Meter>
      </div>

      {/* With Label and Value */}
      <div className="flex flex-col gap-4">
        <SectionTitle>With Label and Value</SectionTitle>
        <Meter value={7.2} min={0} max={10} className="w-80">
          <MeterLabel>Battery</MeterLabel>
          <MeterValue />
        </Meter>
      </div>

      {/* Sizes */}
      <div className="flex flex-col gap-4">
        <SectionTitle>Sizes</SectionTitle>
        <div className="flex w-80 flex-col gap-3">
          <Meter value={60} size="sm" />
          <Meter value={60} size="default" />
          <Meter value={60} size="lg" />
          <Meter value={60} size="xl" />
        </div>
      </div>

      {/* Custom range */}
      <div className="flex flex-col gap-4">
        <SectionTitle>Custom range</SectionTitle>
        <Meter value={340} min={0} max={500} className="w-80">
          <MeterLabel>Disk usage</MeterLabel>
          <MeterValue />
        </Meter>
      </div>
    </div>
  )
}
