"use client"

import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  ComposedChart,
  Line,
  LineChart,
  Pie,
  PieChart,
  XAxis,
} from "recharts"
import {
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart"

function SectionTitle({ children }: { children: React.ReactNode }) {
  return <h2 className="text-sm font-medium text-foreground">{children}</h2>
}

const revenueData = [
  { month: "Jan", revenue: 4200, target: 3800 },
  { month: "Feb", revenue: 3800, target: 4600 },
  { month: "Mar", revenue: 5100, target: 4000 },
  { month: "Apr", revenue: 4600, target: 5400 },
  { month: "May", revenue: 6200, target: 5100 },
  { month: "Jun", revenue: 4400, target: 5900 },
  { month: "Jul", revenue: 6800, target: 5300 },
]

const revenueConfig = {
  revenue: {
    label: "Revenue",
    color: "var(--chart-1)",
  },
  target: {
    label: "Target",
    color: "var(--chart-3)",
  },
} satisfies ChartConfig

const visitorsData = [
  { day: "Mon", desktop: 186, mobile: 120 },
  { day: "Tue", desktop: 205, mobile: 140 },
  { day: "Wed", desktop: 237, mobile: 155 },
  { day: "Thu", desktop: 173, mobile: 130 },
  { day: "Fri", desktop: 209, mobile: 165 },
  { day: "Sat", desktop: 142, mobile: 190 },
  { day: "Sun", desktop: 118, mobile: 175 },
]

const visitorsConfig = {
  desktop: {
    label: "Desktop",
    color: "var(--chart-1)",
  },
  mobile: {
    label: "Mobile",
    color: "var(--chart-2)",
  },
} satisfies ChartConfig

const signupsData = [
  { month: "Jan", signups: 240 },
  { month: "Feb", signups: 310 },
  { month: "Mar", signups: 280 },
  { month: "Apr", signups: 390 },
  { month: "May", signups: 420 },
  { month: "Jun", signups: 510 },
]

const signupsConfig = {
  signups: {
    label: "Signups",
    color: "var(--chart-2)",
  },
} satisfies ChartConfig

const planData = [
  { plan: "free", users: 820, fill: "var(--chart-1)" },
  { plan: "pro", users: 340, fill: "var(--chart-2)" },
  { plan: "team", users: 145, fill: "var(--chart-3)" },
  { plan: "enterprise", users: 42, fill: "var(--chart-4)" },
]

const planConfig = {
  users: { label: "Users" },
  free: { label: "Free", color: "var(--chart-1)" },
  pro: { label: "Pro", color: "var(--chart-2)" },
  team: { label: "Team", color: "var(--chart-3)" },
  enterprise: { label: "Enterprise", color: "var(--chart-4)" },
} satisfies ChartConfig

export default function ChartPage() {
  return (
    <div className="flex flex-col gap-12 p-8">
      {/* Area */}
      <div className="flex flex-col gap-4">
        <SectionTitle>Area</SectionTitle>
        <ChartContainer
          config={visitorsConfig}
          className="max-h-72 w-full max-w-xl"
        >
          <AreaChart data={visitorsData}>
            <CartesianGrid vertical={false} />
            <XAxis
              dataKey="day"
              tickLine={false}
              axisLine={false}
              tickMargin={8}
            />
            <ChartTooltip content={<ChartTooltipContent />} />
            <ChartLegend content={<ChartLegendContent />} />
            <defs>
              <linearGradient id="fillDesktop" x1="0" y1="0" x2="0" y2="1">
                <stop
                  offset="5%"
                  stopColor="var(--color-desktop)"
                  stopOpacity={0.4}
                />
                <stop
                  offset="95%"
                  stopColor="var(--color-desktop)"
                  stopOpacity={0.05}
                />
              </linearGradient>
              <linearGradient id="fillMobile" x1="0" y1="0" x2="0" y2="1">
                <stop
                  offset="5%"
                  stopColor="var(--color-mobile)"
                  stopOpacity={0.4}
                />
                <stop
                  offset="95%"
                  stopColor="var(--color-mobile)"
                  stopOpacity={0.05}
                />
              </linearGradient>
            </defs>
            <Area
              type="monotone"
              dataKey="mobile"
              stroke="var(--color-mobile)"
              fill="url(#fillMobile)"
              strokeWidth={2}
              stackId="a"
            />
            <Area
              type="monotone"
              dataKey="desktop"
              stroke="var(--color-desktop)"
              fill="url(#fillDesktop)"
              strokeWidth={2}
              stackId="a"
            />
          </AreaChart>
        </ChartContainer>
      </div>

      {/* Bar */}
      <div className="flex flex-col gap-4">
        <SectionTitle>Bar</SectionTitle>
        <ChartContainer
          config={visitorsConfig}
          className="max-h-72 w-full max-w-xl"
        >
          <BarChart data={visitorsData}>
            <CartesianGrid vertical={false} />
            <XAxis
              dataKey="day"
              tickLine={false}
              axisLine={false}
              tickMargin={8}
            />
            <ChartTooltip content={<ChartTooltipContent />} />
            <ChartLegend content={<ChartLegendContent />} />
            <Bar dataKey="desktop" fill="var(--color-desktop)" radius={4} />
            <Bar dataKey="mobile" fill="var(--color-mobile)" radius={4} />
          </BarChart>
        </ChartContainer>
      </div>

      {/* Combined bar and area */}
      <div className="flex flex-col gap-4">
        <SectionTitle>Combined bar and area</SectionTitle>
        <ChartContainer config={revenueConfig} className="max-h-80 w-full max-w-2xl">
          <ComposedChart data={revenueData}>
            <CartesianGrid vertical={false} />
            <XAxis
              dataKey="month"
              tickLine={false}
              axisLine={false}
              tickMargin={8}
            />
            <ChartTooltip content={<ChartTooltipContent />} />
            <ChartLegend content={<ChartLegendContent />} />
            <defs>
              <linearGradient id="fillTarget" x1="0" y1="0" x2="0" y2="1">
                <stop
                  offset="5%"
                  stopColor="var(--color-target)"
                  stopOpacity={0.3}
                />
                <stop
                  offset="95%"
                  stopColor="var(--color-target)"
                  stopOpacity={0.02}
                />
              </linearGradient>
            </defs>
            <Bar dataKey="revenue" fill="var(--color-revenue)" radius={4} />
            <Area
              type="monotone"
              dataKey="target"
              stroke="var(--color-target)"
              fill="url(#fillTarget)"
              strokeWidth={2}
            />
          </ComposedChart>
        </ChartContainer>
      </div>

      {/* Line */}
      <div className="flex flex-col gap-4">
        <SectionTitle>Line</SectionTitle>
        <ChartContainer
          config={signupsConfig}
          className="max-h-72 w-full max-w-xl"
        >
          <LineChart data={signupsData}>
            <CartesianGrid vertical={false} />
            <XAxis
              dataKey="month"
              tickLine={false}
              axisLine={false}
              tickMargin={8}
            />
            <ChartTooltip content={<ChartTooltipContent hideLabel={false} />} />
            <Line
              type="monotone"
              dataKey="signups"
              stroke="var(--color-signups)"
              strokeWidth={2}
              dot={false}
            />
          </LineChart>
        </ChartContainer>
      </div>

      {/* Donut */}
      <div className="flex flex-col gap-4">
        <SectionTitle>Donut</SectionTitle>
        <ChartContainer
          config={planConfig}
          className="mx-auto aspect-square max-h-72 w-full max-w-xs"
        >
          <PieChart>
            <ChartTooltip content={<ChartTooltipContent nameKey="plan" hideLabel />} />
            <Pie
              data={planData}
              dataKey="users"
              nameKey="plan"
              innerRadius={60}
              strokeWidth={4}
            />
            <ChartLegend
              content={<ChartLegendContent nameKey="plan" />}
              verticalAlign="bottom"
            />
          </PieChart>
        </ChartContainer>
      </div>
    </div>
  )
}
