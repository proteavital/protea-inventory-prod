"use client"

import * as React from "react"
import Image from "next/image"
import { useUser } from "@clerk/nextjs"

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
  Database01Icon,
  Factory01Icon,
  PackageAddIcon,
  PackageRemoveIcon,
  MinusSignIcon,
} from "@hugeicons/core-free-icons"

const navMain = [
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
]

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const { user } = useUser()

  const userData = {
    name: user?.fullName ?? user?.firstName ?? "User",
    email: user?.primaryEmailAddress?.emailAddress ?? "",
    avatar: user?.imageUrl ?? "",
  }

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
                <Image
                  src="/Protea-Vital_Logo2.png"
                  alt="Protea Vital"
                  width={24}
                  height={24}
                  className="size-6 object-contain"
                />
                <span className="text-base font-semibold">Protea Vital</span>
              </a>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <NavMain items={navMain} />
      </SidebarContent>
      <SidebarFooter>
        <NavUser user={userData} />
      </SidebarFooter>
    </Sidebar>
  )
}
