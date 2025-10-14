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
    <Card className="p-4 space-y-4 w-96 h-80">
      <div className="flex items-start gap-4">
        <div className="flex-shrink-0">
          {company.logoUrl ? (
            <img
              src={company.logoUrl}
              alt={`${company.name} logo`}
              className="w-16 h-16 rounded-lg object-cover border border-border"
              onError={(event) => {
                (event.target as HTMLImageElement).style.display = "none";
              }}
            />
          ) : (
            <div className="w-16 h-16 rounded-lg bg-muted flex items-center justify-center border border-border">
              <Building2 className="w-8 h-8 text-muted-foreground" />
            </div>
          )}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1 min-w-0 space-y-1">
              <h3 className="text-lg font-semibold text-foreground truncate">
                {company.name}
              </h3>
              <div className="flex items-center gap-2 flex-wrap text-sm text-muted-foreground font-mono">
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
            <div className="flex flex-wrap gap-1.5 mt-2">
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
        <p className="text-sm text-muted-foreground leading-relaxed">
          {company.description}
        </p>
      )}

      <div className="grid grid-cols-2 gap-3 py-3 border-y border-border">
        <div>
          <p className="text-xs text-muted-foreground mb-1">Balance</p>
          <p className="text-lg font-semibold text-foreground">
            {formattedBalance}
          </p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground mb-1">Stock Price</p>
          <p className="text-lg font-semibold text-foreground">
            {formattedSharePrice}
          </p>
        </div>
      </div>

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
    </Card>
  );
}
