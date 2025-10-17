import {
  IconBuilding,
  IconChartLine,
  IconDashboard,
  IconHistory,
  IconMedal,
  IconSend,
  IconShoppingBag,
  IconTrendingUp,
  IconWallet,
  IconDice5,
  IconCurrencyDollar,
  IconBolt,
} from "@tabler/icons-react";
import { Link } from "react-router";
import { NavGrouped, type NavGroup } from "./nav-grouped";
import { UserButton } from "@clerk/react-router";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuItem,
} from "~/components/ui/sidebar";
import { LogoIcon } from "~/components/logo";

const groupedNav: NavGroup[] = [
  {
    label: "Overview",
    items: [
      { title: "Dashboard", url: "/dashboard", icon: IconDashboard },
      { title: "Leaderboard", url: "/dashboard/leaderboard", icon: IconMedal },
    ],
  },
  {
    label: "Money",
    items: [
      { title: "Accounts", url: "/dashboard/accounts", icon: IconWallet },
      { title: "Send Money", url: "/dashboard/transactions", icon: IconSend },
      { title: "History", url: "/dashboard/history", icon: IconHistory },
      { title: "Loans", url: "/dashboard/loans", icon: IconCurrencyDollar },
    ],
  },
  {
    label: "Companies",
    items: [
      {
        title: "My Companies",
        url: "/dashboard/companies",
        icon: IconBuilding,
      },
      {
        title: "Company Sales",
        url: "/dashboard/company-sales",
        icon: IconBuilding,
      },
    ],
  },
  {
    label: "Market",
    items: [
      {
        title: "Marketplace",
        url: "/dashboard/marketplace",
        icon: IconShoppingBag,
      },
      { title: "Stock Market", url: "/dashboard/stocks", icon: IconChartLine },
      { title: "Portfolio", url: "/dashboard/portfolio", icon: IconTrendingUp },
      { title: "Gamble", url: "/dashboard/gamble", icon: IconDice5 },
      { title: "Upgrades", url: "/dashboard/upgrades", icon: IconBolt },
    ],
  },
];

export function AppSidebar({
  variant,
  user,
}: {
  variant: "sidebar" | "floating" | "inset";
  user: any;
}) {
  return (
    <Sidebar collapsible="offcanvas" variant={variant}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <Link
              to="/"
              prefetch="viewport"
              className="flex items-center gap-2"
            >
              <LogoIcon className="h-8 w-8" />
              <span className="font-logo lowercase text-base font-semibold">
                quickbuck
              </span>
            </Link>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <NavGrouped groups={groupedNav} />
      </SidebarContent>
      <SidebarFooter>
        {user && (
          <div className="p-2">
            <UserButton
              appearance={{
                elements: {
                  avatarBox: "h-10 w-10",
                },
              }}
            />
          </div>
        )}
      </SidebarFooter>
    </Sidebar>
  );
}
