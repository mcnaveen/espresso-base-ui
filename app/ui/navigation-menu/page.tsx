"use client"

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
    </div>
  )
}
