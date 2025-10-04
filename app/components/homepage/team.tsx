const features = [
  {
    title: "🏦 Bank Account System",
    description:
      "Start with $10,000 and manage multiple accounts for your companies. All transactions are tracked in real-time.",
    icon: "🏦",
  },
  {
    title: "🏢 Company Management",
    description:
      "Create unlimited companies, grant access to other players, and watch them go public when they reach $50,000.",
    icon: "🏢",
  },
  {
    title: "🛍️ Product Marketplace",
    description:
      "List products with custom pricing and watch them sell automatically every 2 minutes through the game's economy.",
    icon: "🛍️",
  },
  {
    title: "📈 Stock Market",
    description:
      "Invest in public companies, track your portfolio performance, and buy/sell shares in real-time.",
    icon: "📈",
  },
];

export default function GameFeaturesSection() {
  return (
    <section id="how-to-play" className="py-12 md:py-32">
      <div className="mx-auto max-w-3xl px-8 lg:px-0">
        <h2 className="mb-8 text-4xl font-bold md:mb-16 lg:text-5xl">
          Game Features
        </h2>

        <div className="grid gap-8 md:grid-cols-2">
          {features.map((feature, index) => (
            <div key={index} className="space-y-4">
              <div className="text-4xl">{feature.icon}</div>
              <h3 className="text-xl font-semibold">{feature.title}</h3>
              <p className="text-muted-foreground">{feature.description}</p>
            </div>
          ))}
        </div>

        <div className="mt-12 text-center">
          <h3 className="mb-4 text-2xl font-semibold">
            Ready to Build Your Empire?
          </h3>
          <p className="text-muted-foreground mb-6">
            Join thousands of players in this exciting finance simulation game.
          </p>
          <a
            href="/sign-up"
            className="inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 bg-primary text-primary-foreground hover:bg-primary/90 h-10 px-4 py-2"
          >
            Start Playing Now
          </a>
        </div>
      </div>
    </section>
  );
}
