import { Link } from "react-router";
import { Button } from "~/components/ui/button";
import { Navbar } from "./navbar";

export default function IntegrationsSection({
  loaderData,
}: {
  loaderData?: { isSignedIn: boolean };
}) {
  return (
    <section id="hero">
      <Navbar loaderData={loaderData} />
      <div className="bg-muted dark:bg-background py-24 md:py-32">
        <div className="mx-auto max-w-5xl px-6 mt-[2rem]">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-balance text-3xl font-semibold md:text-4xl">
              Build Financial Empires in QuickBuck
            </h2>
            <p className="text-muted-foreground mt-6">
              Real-time multiplayer finance simulation game. Create companies,
              sell products, trade stocks, and compete with players worldwide to
              build your fortune.
            </p>

            <div className="flex justify-center gap-3 mt-8">
              <Button size="sm" asChild>
                <Link
                  to={loaderData?.isSignedIn ? "/dashboard" : "/sign-up"}
                  prefetch="viewport"
                >
                  {loaderData?.isSignedIn ? "Play Now" : "Start Playing"}
                </Link>
              </Button>
              <Button variant="outline" size="sm" asChild>
                <Link
                  to="https://github.com/saltjsx/quickbuck"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  ⭐️ View on GitHub
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
