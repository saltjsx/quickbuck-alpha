import ContentSection from "~/components/homepage/content";
import Footer from "~/components/homepage/footer";
import Integrations from "~/components/homepage/integrations";
import Team from "~/components/homepage/team";
import type { Route } from "./+types/home";

export function meta({}: Route.MetaArgs) {
  const title = "Quickbuck - Trading Game";
  const description =
    "Quickbuck is a multiplayer trading and business simulation game.";
  const keywords = "Trading, Game, Simulation, Quickbuck";
  const siteUrl = "https://quickbuck.xyz/";
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
    { property: "og:site_name", content: "Quickbuck" },

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
  ];
}

export default function Home({}: Route.ComponentProps) {
  return (
    <>
      <Integrations />
      <ContentSection />
      <Team />
      <Footer />
    </>
  );
}
