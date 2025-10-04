import { useQuery } from "convex/react";
import { Link } from "react-router";
import { api } from "../../../convex/_generated/api";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "~/components/ui/card";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import { Building2, ChevronDown, ChevronUp, ExternalLink } from "lucide-react";
import { CreateCompanyDialog } from "~/components/game/create-company-dialog";
import { CreateProductDialog } from "~/components/game/create-product-dialog";
import { CompanyDashboard } from "~/components/game/company-dashboard";
import { useState } from "react";
import type { Route } from "./+types/companies";

export function meta({}: Route.MetaArgs) {
  return [
    { title: "My Companies - QuickBuck" },
    {
      name: "description",
      content:
        "Manage your companies, create new businesses, and list products in the QuickBuck finance simulation game.",
    },
  ];
}

export default function CompaniesPage() {
  const companies = useQuery(api.companies.getUserCompanies);
  const [expandedCompany, setExpandedCompany] = useState<string | null>(null);

  if (companies === undefined) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading companies...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col">
      <div className="@container/main flex flex-1 flex-col gap-2">
        <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
          <div className="px-4 lg:px-6 flex items-start justify-between">
            <div>
              <h1 className="text-3xl font-bold flex items-center gap-2">
                <Building2 className="h-8 w-8" />
                My Companies
              </h1>
              <p className="text-muted-foreground mt-1">
                Companies you own or manage
              </p>
            </div>
            <CreateCompanyDialog />
          </div>

          <div className="px-4 lg:px-6">
            <Card>
              <CardHeader>
                <CardTitle>Your Businesses</CardTitle>
                <CardDescription>
                  Create companies, list products, and grow your empire
                </CardDescription>
              </CardHeader>
              <CardContent>
                {companies?.length === 0 ? (
                  <div className="text-center py-8">
                    <p className="text-muted-foreground mb-4">
                      No companies yet
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Create your first company to start selling products!
                    </p>
                  </div>
                ) : (
                  <div className="space-y-6">
                    {companies?.map((company: any) => (
                      <div
                        key={company._id}
                        className="border rounded-lg overflow-hidden"
                      >
                        <div className="p-4">
                          <div className="flex items-start justify-between mb-4">
                            <div className="flex gap-4 flex-1">
                              {company.logoUrl && (
                                <div className="flex-shrink-0">
                                  <img
                                    src={company.logoUrl}
                                    alt={`${company.name} logo`}
                                    className="h-16 w-16 object-contain rounded border"
                                    onError={(e) => {
                                      (
                                        e.target as HTMLImageElement
                                      ).style.display = "none";
                                    }}
                                  />
                                </div>
                              )}
                              <div className="flex-1">
                                <div className="flex items-center gap-2 mb-1">
                                  <h3 className="font-semibold text-lg">
                                    {company.name}
                                  </h3>
                                  <Badge
                                    variant="outline"
                                    className="font-mono text-xs"
                                  >
                                    {company.ticker}
                                  </Badge>
                                </div>
                                {company.description && (
                                  <p className="text-sm text-muted-foreground mb-2">
                                    {company.description}
                                  </p>
                                )}
                                {company.tags && company.tags.length > 0 && (
                                  <div className="flex flex-wrap gap-1 mb-2">
                                    {company.tags.map((tag: string) => (
                                      <Badge
                                        key={tag}
                                        variant="secondary"
                                        className="text-xs"
                                      >
                                        {tag}
                                      </Badge>
                                    ))}
                                  </div>
                                )}
                                <div className="flex gap-2">
                                  <Badge
                                    variant={
                                      company.isPublic ? "default" : "outline"
                                    }
                                  >
                                    {company.isPublic ? "Public" : "Private"}
                                  </Badge>
                                  <Badge
                                    variant="secondary"
                                    className="capitalize"
                                  >
                                    {company.role}
                                  </Badge>
                                </div>
                              </div>
                            </div>
                            <div className="text-right">
                              <p className="text-xl font-bold">
                                $
                                {company.balance?.toLocaleString("en-US", {
                                  minimumFractionDigits: 2,
                                  maximumFractionDigits: 2,
                                })}
                              </p>
                              {company.isPublic && (
                                <p className="text-sm text-muted-foreground">
                                  ${company.sharePrice?.toFixed(2)}/share
                                </p>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <CreateProductDialog companyId={company._id} />
                            <Link to={`/dashboard/companies/${company._id}`}>
                              <Button variant="outline" size="sm">
                                <ExternalLink className="h-4 w-4 mr-1" />
                                Full Dashboard
                              </Button>
                            </Link>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() =>
                                setExpandedCompany(
                                  expandedCompany === company._id
                                    ? null
                                    : company._id
                                )
                              }
                            >
                              {expandedCompany === company._id ? (
                                <>
                                  <ChevronUp className="h-4 w-4 mr-1" />
                                  Hide Preview
                                </>
                              ) : (
                                <>
                                  <ChevronDown className="h-4 w-4 mr-1" />
                                  Quick Preview
                                </>
                              )}
                            </Button>
                            {company.balance > 50000 && !company.isPublic && (
                              <p className="text-sm text-green-600">
                                ✨ Eligible for stock market listing!
                              </p>
                            )}
                          </div>
                        </div>

                        {/* Dashboard Section */}
                        {expandedCompany === company._id && (
                          <div className="border-t bg-muted/30 p-6">
                            <CompanyDashboard companyId={company._id} />
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
