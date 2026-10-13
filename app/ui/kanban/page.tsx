"use client"

import { useState } from "react"
import {
  Calendar,
  Mail,
  MoreHorizontal,
  Phone,
  Plus,
  UserRound,
} from "lucide-react"

import {
  KanbanBoard,
  KanbanCard,
  KanbanCards,
  KanbanHeader,
  KanbanProvider,
} from "@/components/kibo-ui/kanban"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"

// The deals board from the timeless-gowtham branch (espresso-2.0 › Core
// screens › deals-kanban): five stages, each a column of deal cards.
interface Deal {
  org: string
  date: string
  email: string
  initial: string
  agent: string
  phone: string
  logo: string
}

interface Stage {
  name: string
  /** the stage glyph's colour, as the CRM board tints each stage */
  tone: string
  deals: Deal[]
}

const STAGES: Stage[] = [
  {
    name: "Qualification",
    tone: "text-gray-400",
    deals: [
      {
        org: "Gumroad",
        date: "16 May, 2025",
        email: "sandeep@gumroad.com",
        initial: "S",
        agent: "sandeep@gumroad.com",
        phone: "+91 9526883323",
        logo: "logo-gumroad.png",
      },
      {
        org: "Github",
        date: "16 May, 2025",
        email: "Johnmonroe@github.com",
        initial: "J",
        agent: "John Monroe",
        phone: "+91 7845728889",
        logo: "logo-github.png",
      },
      {
        org: "Evergreen",
        date: "16 May, 2025",
        email: "dave@evergreen.com",
        initial: "J",
        agent: "John Monroe",
        phone: "+91 7845728889",
        logo: "logo-evergreen.png",
      },
    ],
  },
  {
    name: "Demo",
    tone: "text-blue-500",
    deals: [
      {
        org: "Figma",
        date: "17 May, 2025",
        email: "designer@figma.com",
        initial: "D",
        agent: "Designer Name",
        phone: "+91 9123456789",
        logo: "logo-figma.png",
      },
      {
        org: "Spotify",
        date: "18 May, 2025",
        email: "team@spotify.com",
        initial: "T",
        agent: "Team Leader",
        phone: "+91 9876543210",
        logo: "logo-spotify.png",
      },
      {
        org: "Google",
        date: "19 May, 2025",
        email: "admin@google.com",
        initial: "A",
        agent: "Admin User",
        phone: "+91 9988776655",
        logo: "logo-google.png",
      },
      {
        org: "Adobe",
        date: "20 May, 2025",
        email: "support@adobe.com",
        initial: "S",
        agent: "Software Engineer",
        phone: "+91 9456123456",
        logo: "logo-adobe.png",
      },
      {
        org: "Github",
        date: "21 May, 2025",
        email: "contact@github.com",
        initial: "M",
        agent: "Marketing Specialist",
        phone: "+91 9988112233",
        logo: "logo-github.png",
      },
    ],
  },
  {
    name: "Proposal",
    tone: "text-amber-500",
    deals: [
      {
        org: "Miro",
        date: "17 May, 2025",
        email: "designer@miro.com",
        initial: "D",
        agent: "Admin",
        phone: "+91 9123456789",
        logo: "logo-miro.png",
      },
      {
        org: "Zapier",
        date: "18 May, 2025",
        email: "team@spotify.com",
        initial: "T",
        agent: "Team Leader",
        phone: "+91 9876543210",
        logo: "logo-zapier.png",
      },
    ],
  },
  {
    name: "Negotiation",
    tone: "text-pink-500",
    deals: [
      {
        org: "Telegram",
        date: "17 May, 2025",
        email: "designer@telegram.com",
        initial: "J",
        agent: "John",
        phone: "+91 9123456789",
        logo: "logo-telegram.png",
      },
      {
        org: "Squarespace",
        date: "18 May, 2025",
        email: "team@squarespace.com",
        initial: "T",
        agent: "Team Leader",
        phone: "+91 9876543210",
        logo: "logo-squarespace.png",
      },
      {
        org: "Chatgpt",
        date: "19 May, 2025",
        email: "design@chatgpt.com",
        initial: "A",
        agent: "Alice",
        phone: "+91 9988776655",
        logo: "logo-chatgpt.png",
      },
      {
        org: "Outlook",
        date: "20 May, 2025",
        email: "creative@outlook.com",
        initial: "M",
        agent: "Mark",
        phone: "+91 8899776655",
        logo: "logo-outlook.png",
      },
      {
        org: "Hourglass",
        date: "21 May, 2025",
        email: "support@hourglass.com",
        initial: "K",
        agent: "Katherine",
        phone: "+91 7766554433",
        logo: "logo-hourglass.png",
      },
      {
        org: "InVision",
        date: "22 May, 2025",
        email: "info@invisionapp.com",
        initial: "D",
        agent: "Daniel",
        phone: "+91 6655443322",
        logo: "logo-invision.png",
      },
    ],
  },
  {
    name: "Read to close",
    tone: "text-violet-500",
    deals: [
      {
        org: "Stripe",
        date: "17 May, 2025",
        email: "designer@telegram.com",
        initial: "J",
        agent: "John",
        phone: "+91 9123456789",
        logo: "logo-stripe.png",
      },
      {
        org: "Facebook",
        date: "18 May, 2025",
        email: "team@squarespace.com",
        initial: "T",
        agent: "Team Leader",
        phone: "+91 9876543210",
        logo: "logo-facebook.png",
      },
      {
        org: "Zoom",
        date: "22 May, 2025",
        email: "info@invisionapp.com",
        initial: "D",
        agent: "Daniel",
        phone: "+91 6655443322",
        logo: "logo-zoom.png",
      },
    ],
  },
]

const columns = STAGES.map((stage, index) => ({
  id: `stage-${index}`,
  name: stage.name,
  tone: stage.tone,
}))

const exampleDeals = STAGES.flatMap((stage, stageIndex) =>
  stage.deals.map((deal, dealIndex) => ({
    ...deal,
    id: `deal-${stageIndex}-${dealIndex}`,
    name: deal.org,
    column: `stage-${stageIndex}`,
  }))
)

function DealRow({
  icon,
  children,
}: {
  icon: React.ReactNode
  children: React.ReactNode
}) {
  return (
    <p className="flex h-4 items-center gap-2">
      {icon}
      {children}
    </p>
  )
}

export default function KanbanPage() {
  const [deals, setDeals] = useState(exampleDeals)
  // the column the dragged card is currently over — kibo's own isOver only
  // covers the column's empty space, so hovering its cards would flicker
  const [overColumn, setOverColumn] = useState<string | null>(null)

  return (
    <div className="flex h-full flex-col overflow-x-auto p-6 [&_[data-slot=scroll-area-scrollbar]]:hidden [&_[data-slot=scroll-area-viewport]]:scroll-fade-y [&_[data-slot=scroll-area-viewport]]:scroll-fade-6 [&_[data-slot=scroll-area-viewport]]:[--scroll-fade-reveal:24px]">
      {/* the stable id keeps dnd-kit's generated aria ids identical between
          server and client render, which otherwise mismatch on hydration */}
      <KanbanProvider
        id="deals-board"
        className="flex w-max gap-0"
        columns={columns}
        data={deals}
        onDataChange={setDeals}
        onDragOver={(event) => {
          const overId = event.over?.id
          setOverColumn(
            overId == null
              ? null
              : (columns.find((c) => c.id === overId)?.id ??
                  deals.find((d) => d.id === overId)?.column ??
                  null)
          )
        }}
        onDragEnd={() => setOverColumn(null)}
        onDragCancel={() => setOverColumn(null)}
      >
        {(column) => (
          <KanbanBoard
            id={column.id}
            key={column.id}
            className={`relative isolate w-[284px] shrink-0 gap-2.5 pt-2 pb-2 rounded-2xl border-none bg-transparent shadow-none divide-y-0 ring-0 before:absolute before:inset-0 before:-z-10 before:rounded-2xl before:bg-linear-to-b before:from-(--input) before:to-background before:opacity-0 before:transition-opacity before:duration-150 hover:before:opacity-100 ${
              overColumn === column.id ? "before:opacity-100" : ""
            }`}
          >
            <KanbanHeader className="flex h-7 shrink-0 items-center gap-2 p-0 pr-2 pl-3.5 font-normal">
              {/* the branch's StageRing svg: a 12px ring with a 3px stroke
                  in a 16px box, its hole left open so the wash shows through */}
              <svg
                viewBox="0 0 32 32"
                className={`size-4 shrink-0 ${column.tone as string}`}
                aria-hidden="true"
              >
                <circle
                  cx="16"
                  cy="16"
                  r="9"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="6"
                />
              </svg>
              <h3 className="min-w-0 flex-1 truncate text-base text-foreground">
                {column.name}
              </h3>
              <span className="flex shrink-0 items-center gap-1">
                <Button variant="ghost" size="icon-xs" aria-label="More">
                  <MoreHorizontal />
                </Button>
                <Button variant="ghost" size="icon-xs" aria-label="Add deal">
                  <Plus />
                </Button>
              </span>
            </KanbanHeader>
            <KanbanCards id={column.id} className="gap-2.5 px-2 pt-0 pb-1">
              {(deal: (typeof deals)[number]) => (
                <KanbanCard
                  column={column.id}
                  id={deal.id}
                  key={deal.id}
                  name={deal.name}
                  className="gap-2.5 rounded-2xl border-none p-0 py-0 pb-3 shadow-[0_1px_3px_rgba(0,0,0,0.14),0_0_1px_rgba(0,0,0,0.14)] ring-0"
                >
                  <header className="flex h-11 items-center gap-2 border-b border-border-soft px-3.5">
                    <img
                      src={`/images/kanban/${deal.logo}`}
                      alt=""
                      className="size-5 shrink-0 rounded-[5px] object-cover"
                    />
                    <p className="min-w-0 flex-1 truncate text-base leading-4 font-medium text-foreground">
                      {deal.org}
                    </p>
                  </header>
                  <div className="flex flex-col gap-3.5 px-4 text-base leading-4 text-secondary-foreground">
                    <DealRow
                      icon={<Calendar className="size-4 shrink-0" />}
                    >
                      <span className="min-w-0 truncate">{deal.date}</span>
                    </DealRow>
                    <DealRow icon={<Mail className="size-4 shrink-0" />}>
                      <span className="min-w-0 truncate">{deal.email}</span>
                    </DealRow>
                    <DealRow
                      icon={<UserRound className="size-4 shrink-0" />}
                    >
                      <Avatar className="size-4 shrink-0">
                        <AvatarFallback className="bg-secondary text-[9px] leading-none">
                          {deal.initial}
                        </AvatarFallback>
                      </Avatar>
                      <span className="min-w-0 truncate">{deal.agent}</span>
                    </DealRow>
                    <DealRow icon={<Phone className="size-4 shrink-0" />}>
                      <span className="min-w-0 truncate">{deal.phone}</span>
                    </DealRow>
                  </div>
                </KanbanCard>
              )}
            </KanbanCards>
          </KanbanBoard>
        )}
      </KanbanProvider>
    </div>
  )
}
