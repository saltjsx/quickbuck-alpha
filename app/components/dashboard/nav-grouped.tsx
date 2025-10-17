import { memo, useMemo, useState } from "react";
import { type Icon } from "@tabler/icons-react";
import { IconChevronDown } from "@tabler/icons-react";
import { Link, useLocation } from "react-router";

import {
  SidebarGroup,
  SidebarGroupAction,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "~/components/ui/sidebar";

export type GroupedNavItem = {
  title: string;
  url: string;
  icon?: Icon;
};

export type NavGroup = {
  label: string;
  items: GroupedNavItem[];
  defaultOpen?: boolean;
};

export const NavGrouped = memo(({ groups }: { groups: NavGroup[] }) => {
  const location = useLocation();

  const computed = useMemo(() => {
    return groups.map((group) => ({
      ...group,
      items: group.items.map((item) => ({
        ...item,
        isActive:
          location.pathname === item.url ||
          (item.url !== "/" && location.pathname.startsWith(item.url)),
      })),
    }));
  }, [groups, location.pathname]);

  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>(() => {
    const init: Record<string, boolean> = {};
    for (const g of groups) init[g.label] = g.defaultOpen ?? true;
    return init;
  });

  return (
    <div className="flex flex-col gap-2">
      {computed.map((group) => {
        const isOpen = openGroups[group.label] ?? true;
        const anyActive = group.items.some((i) => i.isActive);

        return (
          <SidebarGroup key={group.label}>
            <SidebarGroupLabel className="flex items-center justify-between pr-7">
              <span>{group.label}</span>
            </SidebarGroupLabel>
            <SidebarGroupAction
              aria-label={isOpen ? "Collapse" : "Expand"}
              onClick={() =>
                setOpenGroups((s) => ({ ...s, [group.label]: !isOpen }))
              }
              className={
                anyActive ? "text-sidebar-accent-foreground" : undefined
              }
            >
              <IconChevronDown
                className={`transition-transform ${
                  isOpen ? "rotate-0" : "-rotate-90"
                }`}
              />
            </SidebarGroupAction>
            {isOpen && (
              <SidebarGroupContent className="flex flex-col gap-2">
                <SidebarMenu>
                  {group.items.map((item) => (
                    <SidebarMenuItem key={`${group.label}-${item.title}`}>
                      <SidebarMenuButton
                        tooltip={item.title}
                        isActive={item.isActive}
                        asChild
                      >
                        <Link to={item.url} prefetch="intent">
                          {item.icon && <item.icon />}
                          <span>{item.title}</span>
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  ))}
                </SidebarMenu>
              </SidebarGroupContent>
            )}
          </SidebarGroup>
        );
      })}
    </div>
  );
});
