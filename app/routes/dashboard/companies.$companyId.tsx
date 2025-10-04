import { useQuery, useMutation } from "convex/react";
import { useParams, Link } from "react-router";
import type { Route } from "./+types/companies.$companyId";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import { CompanyDashboard } from "~/components/game/company-dashboard";
import { Button } from "~/components/ui/button";
import { ArrowLeft, Building2, TrendingUp } from "lucide-react";
import { Badge } from "~/components/ui/badge";
import { useState } from "react";

export function meta({}: Route.MetaArgs) {
  return [
    { title: "Company Dashboard" },
    {
      name: "description",
      content: "View your company's performance dashboard",
    },
  ];
}

export default function CompanyDashboardPage() {
  const params = useParams();
  const companyId = params.companyId as Id<"companies">;

  const companies = useQuery(api.companies.getUserCompanies);
  const company = companies?.find((c: any) => c._id === companyId);
  const checkPublicStatus = useMutation(
    api.companies.checkAndUpdatePublicStatus
  );

  const [isChecking, setIsChecking] = useState(false);
  const [statusMessage, setStatusMessage] = useState("");

  const handleCheckPublicStatus = async () => {
    setIsChecking(true);
    setStatusMessage("");
    try {
      const result = await checkPublicStatus({ companyId });
      if (result.madePublic) {
        setStatusMessage(
          `🎉 Congratulations! Your company is now listed on the stock market with a balance of $${result.balance.toLocaleString()}!`
        );
      } else {
        setStatusMessage(
          `Your company has a balance of $${result.balance.toLocaleString()}. You need more than $50,000 to be listed on the stock market.`
        );
      }
    } catch (error: any) {
      setStatusMessage(`Error: ${error.message}`);
    } finally {
      setIsChecking(false);
    }
  };

  if (companies === undefined) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (!company) {
    return (
      <div className="flex flex-1 flex-col">
        <div className="@container/main flex flex-1 flex-col gap-2">
          <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
            <div className="px-4 lg:px-6">
              <div className="text-center py-12">
                <Building2 className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
                <h2 className="text-2xl font-bold mb-2">Company Not Found</h2>
                <p className="text-muted-foreground mb-4">
                  You don't have access to this company or it doesn't exist.
                </p>
                <Link to="/dashboard/companies">
                  <Button>
                    <ArrowLeft className="h-4 w-4 mr-2" />
                    Back to Companies
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col">
      <div className="@container/main flex flex-1 flex-col gap-2">
        <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
          {/* Header */}
          <div className="px-4 lg:px-6">
            <div className="mb-4">
              <Link to="/dashboard/companies">
                <Button variant="ghost" size="sm">
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back to Companies
                </Button>
              </Link>
            </div>

            <div className="flex items-start justify-between">
              <div className="flex gap-4 items-start">
                {company.logoUrl && (
                  <img
                    src={company.logoUrl}
                    alt={`${company.name} logo`}
                    className="h-20 w-20 object-contain rounded border"
                    onError={(e) => {
                      (e.target as HTMLImageElement).style.display = "none";
                    }}
                  />
                )}
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <h1 className="text-3xl font-bold flex items-center gap-2">
                      {company.name}
                    </h1>
                    <Badge variant="outline" className="font-mono">
                      {company.ticker}
                    </Badge>
                  </div>
                  {company.description && (
                    <p className="text-muted-foreground mb-2">
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
                    <Badge variant={company.isPublic ? "default" : "outline"}>
                      {company.isPublic ? "Public Company" : "Private Company"}
                    </Badge>
                    <Badge variant="secondary" className="capitalize">
                      {company.role}
                    </Badge>
                  </div>
                </div>
              </div>

              {/* Go Public Button */}
              {!company.isPublic && (
                <div className="flex flex-col gap-2">
                  <Button
                    onClick={handleCheckPublicStatus}
                    disabled={isChecking}
                    variant="default"
                    size="sm"
                  >
                    <TrendingUp className="h-4 w-4 mr-2" />
                    {isChecking ? "Checking..." : "Go Public"}
                  </Button>
                  <p className="text-xs text-muted-foreground text-right">
                    Requires $50k+ balance
                  </p>
                </div>
              )}
            </div>

            {/* Status Message */}
            {statusMessage && (
              <div
                className={`mt-4 p-3 rounded-lg ${
                  statusMessage.includes("Congratulations")
                    ? "bg-green-500/10 border border-green-500/20 text-green-600"
                    : statusMessage.includes("Error")
                    ? "bg-destructive/10 border border-destructive/20 text-destructive"
                    : "bg-blue-500/10 border border-blue-500/20 text-blue-600"
                }`}
              >
                {statusMessage}
              </div>
            )}
          </div>

          {/* Dashboard */}
          <div className="px-4 lg:px-6">
            <CompanyDashboard companyId={companyId} />
          </div>
        </div>
      </div>
    </div>
  );
}
