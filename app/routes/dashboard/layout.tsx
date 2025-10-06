import { getAuth } from "@clerk/react-router/ssr.server";
import { redirect, useLoaderData } from "react-router";
import { AppSidebar } from "~/components/dashboard/app-sidebar";
import { SiteHeader } from "~/components/dashboard/site-header";
import { SidebarInset, SidebarProvider } from "~/components/ui/sidebar";
import type { Route } from "./+types/layout";
import { createClerkClient } from "@clerk/react-router/api.server";
import { Outlet } from "react-router";
import { useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { useEffect, useState } from "react";
import { Spinner } from "~/components/ui/spinner";

export function meta({}: Route.MetaArgs) {
  return [
    { title: "QuickBuck Dashboard - Build Your Financial Empire" },
    {
      name: "description",
      content:
        "Manage your companies, trade stocks, and build your fortune in the QuickBuck finance simulation game.",
    },
  ];
}

export async function loader(args: Route.LoaderArgs) {
  const { userId } = await getAuth(args);

  // Redirect to sign-in if not authenticated
  if (!userId) {
    throw redirect("/sign-in");
  }

  const user = await createClerkClient({
    secretKey: process.env.CLERK_SECRET_KEY,
  }).users.getUser(userId);

  return { user };
}

export default function DashboardLayout() {
  const { user } = useLoaderData();
  const upsertUser = useMutation(api.users.upsertUser);
  const initializeAccount = useMutation(api.accounts.initializeAccount);
  const [isInitialized, setIsInitialized] = useState(false);

  // Ensure user exists in Convex database and has an account
  useEffect(() => {
    const initUser = async () => {
      try {
        // First, ensure user record exists
        await upsertUser();
        // Then initialize their account if needed
        await initializeAccount({});
        setIsInitialized(true);
      } catch (error) {
        console.error("Error initializing user:", error);
        // Set initialized anyway to avoid infinite loading
        setIsInitialized(true);
      }
    };
    initUser();
  }, [upsertUser, initializeAccount]);

  return (
    <SidebarProvider
      style={
        {
          "--sidebar-width": "calc(var(--spacing) * 72)",
          "--header-height": "calc(var(--spacing) * 12)",
        } as React.CSSProperties
      }
    >
      <AppSidebar variant="sidebar" user={user} />
      <SidebarInset>
        <SiteHeader />
        {isInitialized ? (
          <Outlet />
        ) : (
          <div className="flex items-center justify-center min-h-screen">
            <div className="text-center">
              <Spinner size="xl" className="text-gray-900 mx-auto" />
              <p className="mt-4 text-gray-600">Setting up your account...</p>
            </div>
          </div>
        )}
      </SidebarInset>
    </SidebarProvider>
  );
}
