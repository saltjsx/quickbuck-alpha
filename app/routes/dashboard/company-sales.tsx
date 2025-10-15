import { Building2 } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "~/components/ui/card";
import { CompanySaleOffersTab } from "~/components/game/company-sale-offers-tab";

export function meta() {
  return [
    { title: "Company Sales - QuickBuck" },
    {
      name: "description",
      content:
        "Browse and purchase companies for sale from other players in the QuickBuck finance simulation game.",
    },
  ];
}

export default function CompanySalesPage() {
  return (
    <div className="flex flex-1 flex-col">
      <div className="@container/main flex flex-1 flex-col gap-2">
        <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
          <div className="px-4 lg:px-6 flex items-start justify-between">
            <div>
              <h1 className="text-3xl font-bold flex items-center gap-2">
                <Building2 className="h-8 w-8" />
                Company Sales
              </h1>
              <p className="text-muted-foreground mt-1">
                Browse and purchase companies from other players
              </p>
            </div>
          </div>

          <div className="px-4 lg:px-6">
            <Card>
              <CardHeader>
                <CardTitle>Available Companies</CardTitle>
                <CardDescription>
                  Companies currently listed for sale by other players
                </CardDescription>
              </CardHeader>
              <CardContent>
                <CompanySaleOffersTab />
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
