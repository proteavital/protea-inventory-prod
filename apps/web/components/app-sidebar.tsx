"use client"

import * as React from "react"

import { NavMain } from "@/components/nav-main"
import { NavUser } from "@/components/nav-user"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@workspace/ui/components/sidebar"
import { HugeiconsIcon } from "@hugeicons/react"
import {
  Analytics01Icon,
  BarcodeScanIcon,
  CommandIcon,
  Database01Icon,
  Factory01Icon,
  PackageAddIcon,
  PackageRemoveIcon,
  MinusSignIcon,
} from "@hugeicons/core-free-icons"

const data = {
  user: {
    name: "shadcn",
    email: "m@example.com",
    avatar: "/avatars/shadcn.jpg",
  },
  navMain: [
    {
      title: "Stocuri",
      url: "/",
      icon: <HugeiconsIcon icon={Database01Icon} strokeWidth={2} />,
    },
    {
      title: "Intrari materie prima",
      url: "/scan-material-fifo",
      icon: <HugeiconsIcon icon={BarcodeScanIcon} strokeWidth={2} />,
    },
    {
      title: "Iesiri materie prima",
      url: "/exit-material",
      icon: <HugeiconsIcon icon={MinusSignIcon} strokeWidth={2} />,
    },
    {
      title: "Productie",
      url: "/produce",
      icon: <HugeiconsIcon icon={Factory01Icon} strokeWidth={2} />,
    },
    {
      title: "Intrari produse finite",
      url: "/enter-product",
      icon: <HugeiconsIcon icon={PackageAddIcon} strokeWidth={2} />,
    },
    {
      title: "Iesiri produse finite",
      url: "/exit-product",
      icon: <HugeiconsIcon icon={PackageRemoveIcon} strokeWidth={2} />,
    },
    {
      title: "Istoric tranzactii",
      url: "/history",
      icon: <HugeiconsIcon icon={Analytics01Icon} strokeWidth={2} />,
    },
  ],
}

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  return (
    <Sidebar collapsible="offcanvas" {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              asChild
              className="data-[slot=sidebar-menu-button]:p-1.5!"
            >
              <a href="#">
                <HugeiconsIcon icon={CommandIcon} strokeWidth={2} className="size-5!" />
                <span className="text-base font-semibold">Acme Inc.</span>
              </a>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <NavMain items={data.navMain} />
      </SidebarContent>
      <SidebarFooter>
        <NavUser user={data.user} />
      </SidebarFooter>
    </Sidebar>
  )
}
