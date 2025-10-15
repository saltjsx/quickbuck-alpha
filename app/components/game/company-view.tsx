"use client";

import { useState } from "react";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import { Card } from "~/components/ui/card";
import {
  Building2,
  Plus,
  Edit,
  Trash2,
  LayoutDashboard,
  TrendingUp,
  Globe,
} from "lucide-react";

interface CompanyViewProps {
  company: {
    _id: string;
    logoUrl?: string;
    name: string;
    ticker: string;
    tags: string[];
    description?: string;
    balance: number;
    sharePrice: number;
    isPublic: boolean;
    role: string;
    ownerId: string;
  };
  onAddProduct?: () => void;
  onEditCompany?: () => void;
  onDeleteCompany?: () => void;
  onDashboard?: () => void;
  onDividends?: () => void;
  onGoPublic?: () => void;
}

export function CompanyView({
  company,
  onAddProduct,
  onEditCompany,
  onDeleteCompany,
  onDashboard,
  onDividends,
  onGoPublic,
}: CompanyViewProps) {
  const [imgError, setImgError] = useState(false);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 2,
    }).format(amount);
  };

  return (
    <Card className="p-4 space-y-4 max-w-2xl">
      {/* Header Section */}
      <div className="flex items-start gap-4">
        {/* Logo */}
        <div className="flex-shrink-0">
          {company.logoUrl && !imgError ? (
            <img
              src={company.logoUrl}
              alt={`${company.name} logo`}
              className="w-16 h-16 rounded-lg object-cover border border-border"
              onError={() => setImgError(true)}
            />
          ) : (
            <div className="w-16 h-16 rounded-lg bg-muted flex items-center justify-center border border-border">
              <Building2 className="w-8 h-8 text-muted-foreground" />
            </div>
          )}
        </div>

        {/* Company Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1 min-w-0">
              <h3 className="text-lg font-semibold text-foreground truncate">
                {company.name}
              </h3>
              <p className="text-sm text-muted-foreground font-mono">
                {company.ticker}
              </p>
            </div>
            {!company.isPublic && onGoPublic && company.role === "owner" && (
              <Button
                size="sm"
                variant="outline"
                onClick={onGoPublic}
                className="flex-shrink-0 bg-transparent"
              >
                <Globe className="w-4 h-4 mr-1.5" />
                Go Public
              </Button>
            )}
          </div>

          {/* Tags */}
          {company.tags && company.tags.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mt-2">
              {company.tags.map((tag, index) => (
                <Badge key={index} variant="secondary" className="text-xs">
                  {tag}
                </Badge>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Description */}
      {company.description && (
        <p className="text-sm text-muted-foreground leading-relaxed">
          {company.description}
        </p>
      )}

      {/* Financial Metrics */}
      <div className="grid grid-cols-2 gap-3 py-3 border-y border-border">
        <div>
          <p className="text-xs text-muted-foreground mb-1">Balance</p>
          <p className="text-lg font-semibold text-foreground">
            {formatCurrency(company.balance)}
          </p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground mb-1">Stock Price</p>
          <p className="text-lg font-semibold text-foreground">
            {formatCurrency(company.sharePrice)}
          </p>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex flex-wrap gap-2">
        <Button
          size="sm"
          onClick={onAddProduct}
          className="flex-1 min-w-[120px]"
        >
          <Plus className="w-4 h-4 mr-1.5" />
          Add Product
        </Button>
        <Button
          size="sm"
          variant="outline"
          onClick={onDashboard}
          className="flex-1 min-w-[120px] bg-transparent"
        >
          <LayoutDashboard className="w-4 h-4 mr-1.5" />
          Dashboard
        </Button>
        {company.isPublic && company.role === "owner" && onDividends && (
          <Button
            size="sm"
            variant="outline"
            onClick={onDividends}
            className="flex-1 min-w-[120px] bg-transparent"
          >
            <TrendingUp className="w-4 h-4 mr-1.5" />
            Dividends
          </Button>
        )}
        {company.role === "owner" && (
          <>
            <Button size="sm" variant="outline" onClick={onEditCompany}>
              <Edit className="w-4 h-4" />
            </Button>
            <Button size="sm" variant="outline" onClick={onDeleteCompany}>
              <Trash2 className="w-4 h-4" />
            </Button>
          </>
        )}
      </div>
    </Card>
  );
}
