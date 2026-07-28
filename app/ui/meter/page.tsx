"use client"

import { cn } from "@/lib/utils"
import { Meter, MeterLabel, MeterValue } from "@/components/ui/meter"

function SectionTitle({ children }: { children: React.ReactNode }) {
  return <h2 className="text-sm font-medium text-foreground">{children}</h2>
}

function meterColorClass(value: number, max: number) {
  const percent = (value / max) * 100
  if (percent >= 90) return "[&_[data-slot=meter-indicator]]:bg-destructive"
  if (percent >= 70) return "[&_[data-slot=meter-indicator]]:bg-yellow-500"
  return ""
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

      {/* Semantic colors */}
      <div className="flex flex-col gap-4">
        <SectionTitle>Semantic colors</SectionTitle>
        <div className="flex w-80 flex-col gap-3">
          <Meter value={45} className={meterColorClass(45, 100)}>
            <MeterLabel>CPU</MeterLabel>
            <MeterValue />
          </Meter>
          <Meter value={78} className={meterColorClass(78, 100)}>
            <MeterLabel>Memory</MeterLabel>
            <MeterValue />
          </Meter>
          <Meter value={96} className={meterColorClass(96, 100)}>
            <MeterLabel>Disk</MeterLabel>
            <MeterValue />
          </Meter>
        </div>
      </div>

      {/* Formatted value */}
      <div className="flex flex-col gap-4">
        <SectionTitle>Formatted value</SectionTitle>
        <Meter
          value={1240}
          min={0}
          max={2000}
          format={{ style: "currency", currency: "USD" }}
          className="w-80"
        >
          <MeterLabel>Monthly budget</MeterLabel>
          <MeterValue />
        </Meter>
      </div>

      {/* Dashboard */}
      <div className="flex flex-col gap-4">
        <SectionTitle>Dashboard</SectionTitle>
        <div className={cn("flex w-80 flex-col gap-4 rounded-xl border border-border p-4")}>
          <Meter value={62} className={meterColorClass(62, 100)}>
            <MeterLabel>API requests</MeterLabel>
            <MeterValue />
          </Meter>
          <Meter value={31} className={meterColorClass(31, 100)}>
            <MeterLabel>Bandwidth</MeterLabel>
            <MeterValue />
          </Meter>
          <Meter value={88} className={meterColorClass(88, 100)}>
            <MeterLabel>Storage</MeterLabel>
            <MeterValue />
          </Meter>
        </div>
      </div>
    </div>
  )
}
