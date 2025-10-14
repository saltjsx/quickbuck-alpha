import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "~/components/ui/card";
import { CreateCompanyDialog } from "./create-company-dialog";
import { CompanyView } from "./company-view";
import type { FunctionReturnType } from "convex/server";
import { api } from "../../../convex/_generated/api";
import { useNavigate } from "react-router";
import { useMutation } from "convex/react";
import { toast } from "sonner";
import { CreateProductDialog } from "./create-product-dialog";
import { EditCompanyDialog } from "./edit-company-dialog";
import { DeleteCompanyDialog } from "./delete-company-dialog";
import { DistributeDividendDialog } from "./distribute-dividend-dialog";
import { useRef } from "react";

type Companies = FunctionReturnType<typeof api.companies.getUserCompanies>;

interface CompaniesTabProps {
  companies: Companies | undefined;
}

export function CompaniesTab({ companies }: CompaniesTabProps) {
  const navigate = useNavigate();
  const checkPublicStatus = useMutation(
    api.companies.checkAndUpdatePublicStatus
  );
  const triggerRefs = useRef<Record<string, any>>({});

  const handleGoPublic = async (companyId: string, companyName: string) => {
    try {
      const result = await checkPublicStatus({ companyId: companyId as any });
      if (result.madePublic) {
        toast.success(
          `🎉 ${companyName} is now public with IPO price of $${result.ipoPrice?.toFixed(
            2
          )}!`
        );
      } else {
        toast.info(
          `${companyName} has $${result.balance.toLocaleString()} balance. Need $50,000+ to go public.`
        );
      }
    } catch (error: any) {
      toast.error(`Failed to update status: ${error.message}`);
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>My Companies</CardTitle>
            <CardDescription>Companies you own or manage</CardDescription>
          </div>
          <CreateCompanyDialog />
        </div>
      </CardHeader>
      <CardContent>
        {companies?.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-muted-foreground mb-4">No companies yet</p>
            <p className="text-sm text-muted-foreground">
              Create your first company to start selling products!
            </p>
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-1 lg:grid-cols-2">
            {companies?.map((company: any) => (
              <div key={company._id}>
                <CompanyView
                  company={company}
                  onAddProduct={() =>
                    triggerRefs.current[`product-${company._id}`]?.click()
                  }
                  onEditCompany={() =>
                    triggerRefs.current[`edit-${company._id}`]?.click()
                  }
                  onDeleteCompany={() =>
                    triggerRefs.current[`delete-${company._id}`]?.click()
                  }
                  onDashboard={() =>
                    navigate(`/dashboard/companies/${company._id}`)
                  }
                  onDividends={() =>
                    triggerRefs.current[`dividend-${company._id}`]?.click()
                  }
                  onGoPublic={() => handleGoPublic(company._id, company.name)}
                />

                {/* Hidden dialog components with their own triggers */}
                <div className="sr-only">
                  <div
                    ref={(el) => {
                      if (el)
                        triggerRefs.current[`product-${company._id}`] = el;
                    }}
                  >
                    <CreateProductDialog companyId={company._id} />
                  </div>
                  {company.role === "owner" && (
                    <>
                      <div
                        ref={(el) => {
                          if (el)
                            triggerRefs.current[`edit-${company._id}`] = el;
                        }}
                      >
                        <EditCompanyDialog company={company} />
                      </div>
                      <div
                        ref={(el) => {
                          if (el)
                            triggerRefs.current[`delete-${company._id}`] = el;
                        }}
                      >
                        <DeleteCompanyDialog
                          companyId={company._id}
                          companyName={company.name}
                          balance={company.balance}
                        />
                      </div>
                    </>
                  )}
                  {company.isPublic && company.role === "owner" && (
                    <div
                      ref={(el) => {
                        if (el)
                          triggerRefs.current[`dividend-${company._id}`] = el;
                      }}
                    >
                      <DistributeDividendDialog
                        companyId={company._id}
                        companyName={company.name}
                        companyBalance={company.balance}
                        companyOwnerId={company.ownerId}
                      />
                    </div>
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
