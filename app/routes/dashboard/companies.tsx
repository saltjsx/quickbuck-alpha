import { useMutation, useQuery } from "convex/react";
import { Link } from "react-router";
import { api } from "../../../convex/_generated/api";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "~/components/ui/card";
import { Button } from "~/components/ui/button";
import {
  Building2,
  Edit,
  Globe,
  LayoutDashboard,
  Plus,
  Trash2,
  TrendingUp,
} from "lucide-react";
import { useState } from "react";
import type { Route } from "./+types/companies";
import { Spinner } from "~/components/ui/spinner";
import type { Id } from "../../../convex/_generated/dataModel";
import { CreateCompanyDialog } from "~/components/game/create-company-dialog";
import { CreateProductDialog } from "~/components/game/create-product-dialog";
import { EditCompanyDialog } from "~/components/game/edit-company-dialog";
import { DeleteCompanyDialog } from "~/components/game/delete-company-dialog";
import { DistributeDividendDialog } from "~/components/game/distribute-dividend-dialog";
import { CompanyCard } from "~/components/game/company-card";
import { useToast } from "~/hooks/use-toast";

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
  const checkPublicStatus = useMutation(
    api.companies.checkAndUpdatePublicStatus
  );
  const { toast } = useToast();
  const [checkingCompanyId, setCheckingCompanyId] =
    useState<Id<"companies"> | null>(null);

  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 2,
    }).format(amount);

  const handleGoPublic = async (
    companyId: Id<"companies">,
    companyName: string
  ) => {
    setCheckingCompanyId(companyId);
    try {
      const result = await checkPublicStatus({ companyId });

      if (result.madePublic) {
        toast({
          title: "Company Listed!",
          description: `${companyName} is now public at ${formatCurrency(
            result.ipoPrice ?? 0
          )} per share.`,
        });
      } else {
        toast({
          title: "Not Eligible Yet",
          description: `${companyName} needs a balance above ${formatCurrency(
            50000
          )}. Current balance: ${formatCurrency(result.balance ?? 0)}.`,
        });
      }
    } catch (error: any) {
      toast({
        title: "Go Public Failed",
        description:
          error?.message || "Unable to check public status right now.",
        variant: "destructive",
      });
    } finally {
      setCheckingCompanyId(null);
    }
  };

  if (companies === undefined) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <Spinner size="xl" className="text-gray-900 mx-auto" />
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
                    {companies?.map((company: any) => {
                      const addProductAction = (
                        <CreateProductDialog
                          companyId={company._id}
                          trigger={
                            <Button size="sm" className="w-full justify-center">
                              <Plus className="w-4 h-4 mr-1.5" />
                              Add Product
                            </Button>
                          }
                        />
                      );

                      const dashboardAction = (
                        <Link
                          to={`/dashboard/companies/${company._id}`}
                          className="w-full"
                        >
                          <Button
                            variant="outline"
                            size="sm"
                            className="w-full justify-center bg-transparent"
                          >
                            <LayoutDashboard className="w-4 h-4 mr-1.5" />
                            Dashboard
                          </Button>
                        </Link>
                      );

                      const dividendsAction =
                        company.role === "owner" && company.isPublic ? (
                          <DistributeDividendDialog
                            companyId={company._id}
                            companyName={company.name}
                            companyBalance={company.balance ?? 0}
                            companyOwnerId={company.ownerId}
                            trigger={
                              <Button
                                variant="outline"
                                size="sm"
                                className="w-full justify-center bg-transparent"
                              >
                                <TrendingUp className="w-4 h-4 mr-1.5" />
                                Dividends
                              </Button>
                            }
                          />
                        ) : undefined;

                      const editAction = (
                        <EditCompanyDialog
                          company={{
                            _id: company._id,
                            name: company.name,
                            description: company.description,
                            tags: company.tags ?? [],
                            ticker: company.ticker,
                            logoUrl: company.logoUrl,
                          }}
                          trigger={
                            <Button
                              variant="outline"
                              size="sm"
                              className="h-9 w-9 p-0 bg-transparent"
                              aria-label={`Edit ${company.name}`}
                            >
                              <Edit className="w-4 h-4" />
                            </Button>
                          }
                        />
                      );

                      const deleteAction = (
                        <DeleteCompanyDialog
                          companyId={company._id}
                          companyName={company.name}
                          balance={company.balance ?? 0}
                          trigger={
                            <Button
                              variant="outline"
                              size="sm"
                              className="h-9 w-9 p-0 bg-transparent text-destructive border-destructive/40 hover:bg-destructive/10"
                              aria-label={`Delete ${company.name}`}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          }
                        />
                      );

                      const goPublicAction =
                        company.role === "owner" && !company.isPublic ? (
                          <Button
                            size="sm"
                            variant="outline"
                            className="flex-shrink-0 bg-transparent"
                            onClick={() =>
                              handleGoPublic(company._id, company.name)
                            }
                            disabled={checkingCompanyId === company._id}
                          >
                            <Globe className="w-4 h-4 mr-1.5" />
                            {checkingCompanyId === company._id
                              ? "Checking..."
                              : "Go Public"}
                          </Button>
                        ) : undefined;

                      const footerContent =
                        company.role === "owner" &&
                        company.balance > 50000 &&
                        !company.isPublic ? (
                          <p className="text-sm text-green-600">
                            ✨ Eligible for stock market listing!
                          </p>
                        ) : undefined;

                      return (
                        <CompanyCard
                          key={company._id}
                          company={{
                            logoUrl: company.logoUrl,
                            name: company.name,
                            ticker: company.ticker,
                            tags: company.tags ?? [],
                            description: company.description,
                            balance: company.balance ?? 0,
                            sharePrice: company.sharePrice ?? 0,
                            isPublic: company.isPublic,
                            role: company.role,
                          }}
                          goPublicAction={goPublicAction}
                          actions={{
                            addProduct: addProductAction,
                            dashboard: dashboardAction,
                            dividends: dividendsAction,
                            edit: editAction,
                            delete: deleteAction,
                          }}
                          footerContent={footerContent}
                        />
                      );
                    })}
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
