import { LoansTab } from "~/components/game/loans-tab";
import type { Route } from "./+types/loans";

export function meta({}: Route.MetaArgs) {
  return [
    { title: "Loans - QuickBuck" },
    {
      name: "description",
      content: "Take high-risk loans to grow your business",
    },
  ];
}

export default function LoansPage() {
  return (
    <div className="flex flex-1 flex-col gap-4 p-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Loans</h1>
          <p className="text-muted-foreground">
            High-risk, high-interest loans. Borrow up to $500,000 instantly.
          </p>
        </div>
      </div>
      <div className="flex-1">
        <LoansTab />
      </div>
    </div>
  );
}
