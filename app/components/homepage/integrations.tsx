import { memo } from "react";
import { Link } from "react-router";
import { LogoIcon } from "~/components/logo";
import {
  Convex,
  ReactIcon,
  ReactRouter,
  TailwindIcon,
  Typescript,
} from "~/components/logos";
import { Button } from "~/components/ui/button";
import { cn } from "~/lib/utils";
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
          <div className="grid items-center sm:grid-cols-2">
            <div className="dark:bg-muted/50 relative mx-auto w-fit">
              <div className="bg-radial to-muted dark:to-background absolute inset-0 z-10 from-transparent to-75%"></div>
              <div className="mx-auto mb-2 flex w-fit justify-center gap-2">
                <IntegrationCard>
                  <ReactRouter />
                </IntegrationCard>
                <IntegrationCard>
                  <Convex />
                </IntegrationCard>
              </div>
              <div className="mx-auto my-2 flex w-fit justify-center gap-2">
                <IntegrationCard>
                  <ReactIcon />
                </IntegrationCard>
                <IntegrationCard
                  borderClassName="shadow-black-950/10 shadow-xl border-black/25 dark:border-white/25"
                  className="dark:bg-white/10"
                >
                  <LogoIcon />
                </IntegrationCard>
                <IntegrationCard>
                  <TailwindIcon />
                </IntegrationCard>
              </div>

              <div className="mx-auto flex w-fit justify-center gap-2">
                <IntegrationCard>
                  <Typescript />
                </IntegrationCard>
              </div>
            </div>
            <div className="mx-auto mt-6 max-w-lg space-y-6 text-center sm:mt-0 sm:text-left">
              <h2 className="text-balance text-3xl font-semibold md:text-4xl">
                Build Financial Empires in QuickBuck
              </h2>
              <p className="text-muted-foreground">
                Real-time multiplayer finance simulation game. Create companies,
                sell products, trade stocks, and compete with players worldwide
                to build your fortune.
              </p>

              <div className="flex gap-3">
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
      </div>
    </section>
  );
}

const IntegrationCard = memo(
  ({
    children,
    className,
    borderClassName,
  }: {
    children: React.ReactNode;
    className?: string;
    borderClassName?: string;
  }) => {
    return (
      <div
        className={cn(
          "bg-background relative flex size-20 rounded-xl dark:bg-transparent",
          className
        )}
      >
        <div
          role="presentation"
          className={cn(
            "absolute inset-0 rounded-xl border border-black/20 dark:border-white/25",
            borderClassName
          )}
        />
        <div className="relative z-20 m-auto size-fit *:size-8">{children}</div>
      </div>
    );
  }
);
