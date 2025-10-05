import { getAuth } from "@clerk/react-router/ssr.server";
import ContentSection from "~/components/homepage/content";
import Footer from "~/components/homepage/footer";
import GameFeaturesSection from "~/components/homepage/team";
import Integrations from "~/components/homepage/integrations";
import type { Route } from "./+types/home";
import { track } from "@databuddy/sdk";
import { useEffect } from "react";

export function meta({}: Route.MetaArgs) {
  const title = "QuickBuck";
  const description =
    "Build financial empires in this real-time multiplayer finance simulation game. Create companies, sell products, trade stocks, and compete with players worldwide.";
  const keywords =
    "finance game, multiplayer, stocks, companies, simulation, real-time";
  const siteUrl = "https://www.quickbuck.game/";
  const imageUrl =
    "https://jdj14ctwppwprnqu.public.blob.vercel-storage.com/rsk-image-FcUcfBMBgsjNLo99j3NhKV64GT2bQl.png";

  return [
    { title },
    {
      name: "description",
      content: description,
    },

    // Open Graph / Facebook
    { property: "og:type", content: "website" },
    { property: "og:title", content: title },
    { property: "og:description", content: description },
    { property: "og:image", content: imageUrl },
    { property: "og:image:width", content: "1200" },
    { property: "og:image:height", content: "630" },
    { property: "og:url", content: siteUrl },
    { property: "og:site_name", content: "QuickBuck" },
    { property: "og:image", content: imageUrl },

    // Twitter Card
    { name: "twitter:card", content: "summary_large_image" },
    { name: "twitter:title", content: title },
    {
      name: "twitter:description",
      content: description,
    },
    { name: "twitter:image", content: imageUrl },
    {
      name: "keywords",
      content: keywords,
    },
    { name: "author", content: "QuickBuck Team" },
    { name: "favicon", content: imageUrl },
  ];
}

export async function loader(args: Route.LoaderArgs) {
  const { userId } = await getAuth(args);

  return {
    isSignedIn: !!userId,
  };
}

export default function Home({ loaderData }: Route.ComponentProps) {
  useEffect(() => {
    track("homepage_viewed", {
      user_signed_in: loaderData.isSignedIn,
      timestamp: new Date().toISOString(),
    });
  }, [loaderData.isSignedIn]);

  return (
    <>
      <Integrations loaderData={loaderData} />
      <ContentSection />
      <GameFeaturesSection />
      <Footer />
    </>
  );
}
