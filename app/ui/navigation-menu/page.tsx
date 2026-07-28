"use client"

import {
  BarChart3,
  BookOpen,
  CreditCard,
  Home,
  Layers,
  Settings,
  Sparkles,
} from "lucide-react"
import {
  NavigationMenu,
  NavigationMenuContent,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
  NavigationMenuTrigger,
} from "@/components/ui/navigation-menu"

function SectionTitle({ children }: { children: React.ReactNode }) {
  return <h2 className="text-sm font-medium text-foreground">{children}</h2>
}

export default function NavigationMenuPage() {
  return (
    <div className="flex flex-col gap-12 p-8">
      {/* Basic */}
      <div className="flex flex-col gap-4">
        <SectionTitle>Basic</SectionTitle>
        <NavigationMenu>
          <NavigationMenuList>
            <NavigationMenuItem>
              <NavigationMenuTrigger>Products</NavigationMenuTrigger>
              <NavigationMenuContent>
                <ul className="grid w-[300px] gap-1">
                  <li>
                    <NavigationMenuLink href="#">
                      <span className="font-medium text-foreground">
                        Analytics
                      </span>
                      <span className="text-muted-foreground">
                        Track events and traffic in real time.
                      </span>
                    </NavigationMenuLink>
                  </li>
                  <li>
                    <NavigationMenuLink href="#">
                      <span className="font-medium text-foreground">
                        Billing
                      </span>
                      <span className="text-muted-foreground">
                        Manage plans, invoices, and usage.
                      </span>
                    </NavigationMenuLink>
                  </li>
                  <li>
                    <NavigationMenuLink href="#">
                      <span className="font-medium text-foreground">
                        Notifications
                      </span>
                      <span className="text-muted-foreground">
                        Configure alerts and digests.
                      </span>
                    </NavigationMenuLink>
                  </li>
                </ul>
              </NavigationMenuContent>
            </NavigationMenuItem>

            <NavigationMenuItem>
              <NavigationMenuTrigger>Resources</NavigationMenuTrigger>
              <NavigationMenuContent>
                <ul className="grid w-[260px] gap-1">
                  <li>
                    <NavigationMenuLink href="#">
                      <span className="font-medium text-foreground">
                        Documentation
                      </span>
                    </NavigationMenuLink>
                  </li>
                  <li>
                    <NavigationMenuLink href="#">
                      <span className="font-medium text-foreground">
                        Changelog
                      </span>
                    </NavigationMenuLink>
                  </li>
                </ul>
              </NavigationMenuContent>
            </NavigationMenuItem>

            <NavigationMenuItem>
              <NavigationMenuLink
                href="#"
                className="h-8 justify-center rounded-md px-2.5 hover:bg-muted"
              >
                Pricing
              </NavigationMenuLink>
            </NavigationMenuItem>
          </NavigationMenuList>
        </NavigationMenu>
      </div>

      {/* Active link */}
      <div className="flex flex-col gap-4">
        <SectionTitle>Active link</SectionTitle>
        <NavigationMenu>
          <NavigationMenuList>
            <NavigationMenuItem>
              <NavigationMenuLink
                href="#"
                active
                className="h-8 justify-center rounded-md px-2.5 hover:bg-muted"
              >
                Overview
              </NavigationMenuLink>
            </NavigationMenuItem>
            <NavigationMenuItem>
              <NavigationMenuLink
                href="#"
                className="h-8 justify-center rounded-md px-2.5 hover:bg-muted"
              >
                Reports
              </NavigationMenuLink>
            </NavigationMenuItem>
            <NavigationMenuItem>
              <NavigationMenuLink
                href="#"
                className="h-8 justify-center rounded-md px-2.5 hover:bg-muted"
              >
                Settings
              </NavigationMenuLink>
            </NavigationMenuItem>
          </NavigationMenuList>
        </NavigationMenu>
      </div>

      {/* With icons */}
      <div className="flex flex-col gap-4">
        <SectionTitle>With icons</SectionTitle>
        <NavigationMenu>
          <NavigationMenuList>
            <NavigationMenuItem>
              <NavigationMenuLink
                href="#"
                className="h-8 justify-center rounded-md px-2.5 hover:bg-muted"
              >
                <Home className="size-4" />
                Home
              </NavigationMenuLink>
            </NavigationMenuItem>
            <NavigationMenuItem>
              <NavigationMenuLink
                href="#"
                className="h-8 justify-center rounded-md px-2.5 hover:bg-muted"
              >
                <BarChart3 className="size-4" />
                Analytics
              </NavigationMenuLink>
            </NavigationMenuItem>
            <NavigationMenuItem>
              <NavigationMenuLink
                href="#"
                className="h-8 justify-center rounded-md px-2.5 hover:bg-muted"
              >
                <Settings className="size-4" />
                Settings
              </NavigationMenuLink>
            </NavigationMenuItem>
          </NavigationMenuList>
        </NavigationMenu>
      </div>

      {/* Two-column content with featured link */}
      <div className="flex flex-col gap-4">
        <SectionTitle>Two-column content</SectionTitle>
        <NavigationMenu>
          <NavigationMenuList>
            <NavigationMenuItem>
              <NavigationMenuTrigger>Platform</NavigationMenuTrigger>
              <NavigationMenuContent>
                <div className="grid w-[480px] grid-cols-2 gap-1">
                  <NavigationMenuLink
                    href="#"
                    className="row-span-3 flex-col justify-end gap-2 bg-secondary p-3"
                  >
                    <Sparkles className="size-5 text-foreground" />
                    <span className="font-medium text-foreground">
                      Espresso UI
                    </span>
                    <span className="text-muted-foreground">
                      A component library built on Base UI.
                    </span>
                  </NavigationMenuLink>
                  <li className="list-none">
                    <NavigationMenuLink href="#">
                      <span className="flex items-center gap-2 font-medium text-foreground">
                        <Layers className="size-4" />
                        Components
                      </span>
                      <span className="text-muted-foreground">
                        50+ accessible, themeable primitives.
                      </span>
                    </NavigationMenuLink>
                  </li>
                  <li className="list-none">
                    <NavigationMenuLink href="#">
                      <span className="flex items-center gap-2 font-medium text-foreground">
                        <BookOpen className="size-4" />
                        Documentation
                      </span>
                      <span className="text-muted-foreground">
                        Guides, API reference, and examples.
                      </span>
                    </NavigationMenuLink>
                  </li>
                  <li className="list-none">
                    <NavigationMenuLink href="#">
                      <span className="flex items-center gap-2 font-medium text-foreground">
                        <CreditCard className="size-4" />
                        Pricing
                      </span>
                      <span className="text-muted-foreground">
                        Free and open source, MIT licensed.
                      </span>
                    </NavigationMenuLink>
                  </li>
                </div>
              </NavigationMenuContent>
            </NavigationMenuItem>
          </NavigationMenuList>
        </NavigationMenu>
      </div>

      {/* Vertical */}
      <div className="flex flex-col gap-4">
        <SectionTitle>Vertical</SectionTitle>
        <NavigationMenu orientation="vertical" className="items-start">
          <NavigationMenuList className="flex-col items-start">
            <NavigationMenuItem>
              <NavigationMenuTrigger>Products</NavigationMenuTrigger>
              <NavigationMenuContent>
                <ul className="grid w-[240px] gap-1">
                  <li>
                    <NavigationMenuLink href="#">
                      <span className="font-medium text-foreground">
                        Analytics
                      </span>
                    </NavigationMenuLink>
                  </li>
                  <li>
                    <NavigationMenuLink href="#">
                      <span className="font-medium text-foreground">
                        Billing
                      </span>
                    </NavigationMenuLink>
                  </li>
                </ul>
              </NavigationMenuContent>
            </NavigationMenuItem>
            <NavigationMenuItem>
              <NavigationMenuLink
                href="#"
                className="h-8 w-full justify-start rounded-md px-2.5 hover:bg-muted"
              >
                Pricing
              </NavigationMenuLink>
            </NavigationMenuItem>
          </NavigationMenuList>
        </NavigationMenu>
      </div>
    </div>
  )
}
