import { useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "~/components/ui/dialog";
import { Button } from "~/components/ui/button";
import { Trash2 } from "lucide-react";
import { useToast } from "~/hooks/use-toast";
import { useNavigate } from "react-router";

interface DeleteCompanyDialogProps {
  companyId: Id<"companies">;
  companyName: string;
  balance: number;
}

export function DeleteCompanyDialog({
  companyId,
  companyName,
  balance,
}: DeleteCompanyDialogProps) {
  const [open, setOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const deleteCompany = useMutation(api.companies.deleteCompany);
  const { toast } = useToast();
  const navigate = useNavigate();

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      const result = await deleteCompany({ companyId });

      toast({
        title: "Company Deleted",
        description:
          result.fundsReturned > 0
            ? `${companyName} has been deleted. $${result.fundsReturned.toFixed(
                2
              )} returned to your personal account.`
            : `${companyName} has been deleted.`,
      });

      setOpen(false);
      // Navigate back to companies page
      navigate("/dashboard/companies");
    } catch (error: any) {
      console.error("Failed to delete company:", error);
      toast({
        title: "Deletion Failed",
        description:
          error.message || "Failed to delete company. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="destructive" size="sm">
          <Trash2 className="h-4 w-4 mr-2" />
          Delete Company
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Are you absolutely sure?</DialogTitle>
          <DialogDescription className="space-y-2">
            <p>
              This action cannot be undone. This will permanently delete{" "}
              <span className="font-semibold">{companyName}</span> and all
              associated data including:
            </p>
            <ul className="list-disc list-inside space-y-1 text-sm">
              <li>All products (will be deactivated)</li>
              <li>Company account and transaction history</li>
              <li>Stock market listings (if public)</li>
              <li>All stock holdings</li>
            </ul>
            {balance > 0 && (
              <p className="font-semibold text-green-600 mt-3">
                $
                {balance.toLocaleString("en-US", {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}{" "}
                will be transferred to your personal account.
              </p>
            )}
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="gap-2">
          <Button
            variant="outline"
            onClick={() => setOpen(false)}
            disabled={isDeleting}
          >
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={handleDelete}
            disabled={isDeleting}
          >
            {isDeleting ? "Deleting..." : "Delete Company"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
