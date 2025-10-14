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
import {
  CreateProductDialog,
  type CreateProductDialogRef,
} from "./create-product-dialog";
import { EditCompanyDialog } from "./edit-company-dialog";
import { DeleteCompanyDialog } from "./delete-company-dialog";
import {
  DistributeDividendDialog,
  type DistributeDividendDialogRef,
} from "./distribute-dividend-dialog";
import { useRef } from "react";

type Companies = FunctionReturnType<typeof api.companies.getUserCompanies>;

interface CompaniesTabProps {
  companies: Companies | undefined;
}

interface CompanyItemProps {
  company: any;
  onGoPublic: (companyId: string, companyName: string) => void;
}

function CompanyItem({ company, onGoPublic }: CompanyItemProps) {
  const navigate = useNavigate();
  const productDialogRef = useRef<CreateProductDialogRef>(null);
  const dividendDialogRef = useRef<DistributeDividendDialogRef>(null);
  const editTriggerRef = useRef<HTMLButtonElement>(null);
  const deleteTriggerRef = useRef<HTMLButtonElement>(null);

  return (
    <div>
      <CompanyView
        company={company}
        onAddProduct={() => productDialogRef.current?.triggerRef?.click()}
        onEditCompany={() => editTriggerRef.current?.click()}
        onDeleteCompany={() => deleteTriggerRef.current?.click()}
        onDashboard={() => navigate(`/dashboard/companies/${company._id}`)}
        onDividends={() => dividendDialogRef.current?.triggerRef?.click()}
        onGoPublic={() => onGoPublic(company._id, company.name)}
      />

      {/* Hidden dialog components with their own triggers */}
      <CreateProductDialog
        ref={productDialogRef}
        companyId={company._id}
        hiddenTrigger
      />
      {company.role === "owner" && (
        <>
          <EditCompanyDialog
            company={company}
            trigger={
              <button
                ref={editTriggerRef}
                type="button"
                className="sr-only"
                aria-label="Edit company"
              />
            }
          />
          <DeleteCompanyDialog
            companyId={company._id}
            companyName={company.name}
            balance={company.balance}
            trigger={
              <button
                ref={deleteTriggerRef}
                type="button"
                className="sr-only"
                aria-label="Delete company"
              />
            }
          />
        </>
      )}
      {company.isPublic && company.role === "owner" && (
        <DistributeDividendDialog
          ref={dividendDialogRef}
          companyId={company._id}
          companyName={company.name}
          companyBalance={company.balance}
          companyOwnerId={company.ownerId}
          hiddenTrigger
        />
      )}
    </div>
  );
}

export function CompaniesTab({ companies }: CompaniesTabProps) {
  const checkPublicStatus = useMutation(
    api.companies.checkAndUpdatePublicStatus
  );

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
              <CompanyItem
                key={company._id}
                company={company}
                onGoPublic={handleGoPublic}
              />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
