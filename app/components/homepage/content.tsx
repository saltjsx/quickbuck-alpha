import { Button } from "~/components/ui/button";
import { ChevronRight } from "lucide-react";
import { Link } from "react-router";

export default function ContentSection() {
  return (
    <section id="features" className="py-16 md:py-32">
      <div className="mx-auto max-w-5xl px-6">
        <div className="grid gap-6 md:grid-cols-2 md:gap-12">
          <h2 className="text-4xl font-medium">
            Real-Time Finance Simulation Game
          </h2>
          <div className="space-y-6">
            <p>
              Experience the thrill of building financial empires in QuickBuck,
              a real-time multiplayer game where every decision matters. Start
              with $10,000 and grow your wealth through strategic company
              management, product sales, and stock trading.
            </p>
            <p>
              <span className="font-bold">Compete globally</span> with players
              worldwide in this dynamic economy. Watch your companies go public,
              invest in stocks, and climb the leaderboards as the market evolves
              in real-time.
            </p>
            <Button
              asChild
              variant="secondary"
              size="sm"
              className="gap-1 pr-1.5"
            >
              <Link to="#how-to-play">
                <span>Learn How to Play</span>
                <ChevronRight className="size-2" />
              </Link>
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
}
