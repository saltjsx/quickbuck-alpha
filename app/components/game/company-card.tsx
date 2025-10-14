import { type ReactNode, useMemo } from "react";
import { Card } from "~/components/ui/card";
import { Badge } from "~/components/ui/badge";
import { Building2 } from "lucide-react";

interface CompanyCardProps {
  company: {
    logoUrl?: string | null;
    name: string;
    ticker: string;
    tags?: string[];
    description?: string | null;
    balance: number;
    sharePrice?: number | null;
    isPublic: boolean;
    role?: string | null;
  };
  goPublicAction?: ReactNode;
  actions: {
    addProduct: ReactNode;
    dashboard: ReactNode;
    dividends?: ReactNode;
    edit: ReactNode;
    delete: ReactNode;
  };
  footerContent?: ReactNode;
}

export function CompanyCard({
  company,
  goPublicAction,
  actions,
  footerContent,
}: CompanyCardProps) {
  const tags = company.tags?.filter(Boolean) ?? [];

  const [formattedBalance, formattedSharePrice] = useMemo(() => {
    const formatCurrency = (amount: number) =>
      new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: "USD",
        minimumFractionDigits: 2,
      }).format(amount);

    const balanceValue =
      typeof company.balance === "number" ? company.balance : 0;
    const sharePriceValue =
      typeof company.sharePrice === "number" &&
      !Number.isNaN(company.sharePrice)
        ? company.sharePrice
        : 0;

    return [formatCurrency(balanceValue), formatCurrency(sharePriceValue)];
  }, [company.balance, company.sharePrice]);

  return (
    <Card className="flex h-[26rem] w-[40rem] flex-col p-4">
      <div className="flex-1 space-y-3">
        <div className="flex items-start gap-4">
          <div className="flex-shrink-0">
            {company.logoUrl ? (
              <img
                src={company.logoUrl}
                alt={`${company.name} logo`}
                className="h-16 w-16 rounded-lg object-cover border border-border"
                onError={(event) => {
                  (event.target as HTMLImageElement).style.display = "none";
                }}
              />
            ) : (
              <div className="flex h-16 w-16 items-center justify-center rounded-lg border border-border bg-muted">
                <Building2 className="h-8 w-8 text-muted-foreground" />
              </div>
            )}
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0 flex-1 space-y-1">
                <h3 className="truncate text-lg font-semibold text-foreground">
                  {company.name}
                </h3>
                <div className="flex flex-wrap items-center gap-2 text-sm font-mono text-muted-foreground">
                  <span>{company.ticker}</span>
                  <Badge variant={company.isPublic ? "default" : "outline"}>
                    {company.isPublic ? "Public" : "Private"}
                  </Badge>
                  {company.role && (
                    <Badge
                      variant="secondary"
                      className="capitalize text-xs font-normal"
                    >
                      {company.role}
                    </Badge>
                  )}
                </div>
              </div>
              {goPublicAction}
            </div>

            {tags.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-1.5">
                {tags.map((tag) => (
                  <Badge key={tag} variant="secondary" className="text-xs">
                    {tag}
                  </Badge>
                ))}
              </div>
            )}
          </div>
        </div>

        {company.description && (
          <p className="text-sm leading-relaxed text-muted-foreground">
            {company.description}
          </p>
        )}

        <div className="grid grid-cols-2 gap-3 border-y border-border py-2">
          <div>
            <p className="mb-1 text-xs text-muted-foreground">Balance</p>
            <p className="text-lg font-semibold text-foreground">
              {formattedBalance}
            </p>
          </div>
          <div>
            <p className="mb-1 text-xs text-muted-foreground">Stock Price</p>
            <p className="text-lg font-semibold text-foreground">
              {formattedSharePrice}
            </p>
          </div>
        </div>
      </div>

      <div className="mt-2 space-y-2">
        <div className="flex flex-wrap gap-2">
          <div className="flex-1 min-w-[120px]">{actions.addProduct}</div>
          <div className="flex-1 min-w-[120px]">{actions.dashboard}</div>
          {actions.dividends && (
            <div className="flex-1 min-w-[120px]">{actions.dividends}</div>
          )}
          <div>{actions.edit}</div>
          <div>{actions.delete}</div>
        </div>

        {footerContent}
      </div>
    </Card>
  );
}
