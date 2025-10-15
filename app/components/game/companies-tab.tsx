import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "~/components/ui/card";
import { CreateCompanyDialog } from "./create-company-dialog";
import { CreateProductDialog } from "./create-product-dialog";
import { DistributeDividendDialog } from "./distribute-dividend-dialog";
import type { FunctionReturnType } from "convex/server";
import type { api } from "../../../convex/_generated/api";

type Companies = FunctionReturnType<typeof api.companies.getUserCompanies>;

interface CompaniesTabProps {
  companies: Companies | undefined;
}

export function CompaniesTab({ companies }: CompaniesTabProps) {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-base">My Companies</CardTitle>
            <CardDescription className="text-xs">Companies you own or manage</CardDescription>
          </div>
          <CreateCompanyDialog />
        </div>
      </CardHeader>
      <CardContent>
        {companies?.length === 0 ? (
          <div className="text-center py-6">
            <p className="text-muted-foreground text-sm mb-2">No companies yet</p>
            <p className="text-xs text-muted-foreground">
              Create your first company to start selling products
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {companies?.map((company: any) => (
              <div key={company._id} className="p-4 border rounded">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-base">{company.name}</h3>
                    <p className="text-xs text-muted-foreground mt-1">
                      {company.description}
                    </p>
                    <div className="mt-2 flex gap-1.5">
                      <span
                        className={`text-xs px-2 py-0.5 rounded ${
                          company.isPublic
                            ? "bg-green-100 text-green-800"
                            : "bg-gray-100 text-gray-800"
                        }`}
                      >
                        {company.isPublic ? "Public" : "Private"}
                      </span>
                      <span className="text-xs px-2 py-0.5 rounded bg-blue-100 text-blue-800 capitalize">
                        {company.role}
                      </span>
                    </div>
                  </div>
                  <div className="text-right ml-4">
                    <p className="text-lg font-bold">
                      $
                      {company.balance?.toLocaleString("en-US", {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}
                    </p>
                    {company.isPublic && (
                      <p className="text-xs text-muted-foreground">
                        ${company.sharePrice?.toFixed(2)}/share
                      </p>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  <CreateProductDialog companyId={company._id} />
                  {company.role === "owner" && company.isPublic && (
                    <DistributeDividendDialog
                      companyId={company._id}
                      companyName={company.name}
                      companyBalance={company.balance}
                      companyOwnerId={company.ownerId}
                    />
                  )}
                  {company.balance > 50000 && !company.isPublic && (
                    <p className="text-xs text-green-600 font-medium">
                      Eligible for stock market listing
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
