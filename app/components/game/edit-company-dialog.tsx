import { useState } from "react";
import { useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "~/components/ui/dialog";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { Textarea } from "~/components/ui/textarea";
import { Badge } from "~/components/ui/badge";
import { Pencil, X } from "lucide-react";
import { useToast } from "~/hooks/use-toast";
import { Filter } from "bad-words";

interface EditCompanyDialogProps {
  company: {
    _id: Id<"companies">;
    name: string;
    description?: string;
    tags: string[];
    ticker: string;
    logoUrl?: string;
  };
  trigger?: React.ReactNode;
}

export function EditCompanyDialog({
  company,
  trigger,
}: EditCompanyDialogProps) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState(company.name);
  const [description, setDescription] = useState(company.description || "");
  const [tags, setTags] = useState<string[]>(company.tags);
  const [tagInput, setTagInput] = useState("");
  const [ticker, setTicker] = useState(company.ticker);
  const [logoUrl, setLogoUrl] = useState(company.logoUrl || "");
  const updateCompany = useMutation(api.companies.updateCompany);
  const { toast } = useToast();
  const filter = new Filter();

  // Helper function to extract filename from URL
  const getFilenameFromUrl = (url: string): string => {
    try {
      const urlObj = new URL(url);
      return urlObj.pathname.split("/").pop() || "";
    } catch {
      return url;
    }
  };

  const handleAddTag = () => {
    if (tagInput.trim() && !tags.includes(tagInput.trim())) {
      if (filter.isProfane(tagInput.trim().toLowerCase())) {
        toast({
          title: "Profanity Detected",
          description:
            "Tag contains inappropriate content. Please choose a different tag.",
          variant: "destructive",
        });
        return;
      }
      setTags([...tags, tagInput.trim()]);
      setTagInput("");
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    setTags(tags.filter((tag) => tag !== tagToRemove));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Profanity checks (lowercase everything for consistent checking)
    if (filter.isProfane(name.toLowerCase())) {
      toast({
        title: "Profanity Detected",
        description:
          "Company name contains inappropriate content. Please choose a different name.",
        variant: "destructive",
      });
      return;
    }

    if (filter.isProfane(description.toLowerCase())) {
      toast({
        title: "Profanity Detected",
        description:
          "Company description contains inappropriate content. Please revise your description.",
        variant: "destructive",
      });
      return;
    }

    if (filter.isProfane(ticker.toLowerCase())) {
      toast({
        title: "Profanity Detected",
        description:
          "Ticker symbol contains inappropriate content. Please choose a different ticker.",
        variant: "destructive",
      });
      return;
    }

    // Check tags for profanity
    const profaneTag = tags.find((tag) => filter.isProfane(tag.toLowerCase()));
    if (profaneTag) {
      toast({
        title: "Profanity Detected",
        description: `Tag "${profaneTag}" contains inappropriate content. Please remove or modify this tag.`,
        variant: "destructive",
      });
      return;
    }

    // Check logo URL and filename for profanity
    if (logoUrl) {
      if (filter.isProfane(logoUrl.toLowerCase())) {
        toast({
          title: "Profanity Detected",
          description:
            "Logo URL contains inappropriate content. Please use a different URL.",
          variant: "destructive",
        });
        return;
      }

      const filename = getFilenameFromUrl(logoUrl);
      if (filter.isProfane(filename.toLowerCase())) {
        toast({
          title: "Profanity Detected",
          description:
            "Logo filename contains inappropriate content. Please use a different image.",
          variant: "destructive",
        });
        return;
      }
    }

    if (!ticker.trim()) {
      toast({
        title: "Validation Error",
        description: "Ticker symbol is required",
        variant: "destructive",
      });
      return;
    }

    if (ticker.length > 5) {
      toast({
        title: "Validation Error",
        description: "Ticker symbol must be 5 characters or less",
        variant: "destructive",
      });
      return;
    }

    try {
      await updateCompany({
        companyId: company._id,
        name: name !== company.name ? name : undefined,
        description:
          description !== company.description
            ? description || undefined
            : undefined,
        tags:
          JSON.stringify(tags) !== JSON.stringify(company.tags)
            ? tags
            : undefined,
        ticker: ticker !== company.ticker ? ticker.toUpperCase() : undefined,
        logoUrl: logoUrl !== company.logoUrl ? logoUrl || undefined : undefined,
      });

      toast({
        title: "Company Updated",
        description: "Your company details have been updated successfully!",
      });
      setOpen(false);
    } catch (error: any) {
      console.error("Failed to update company:", error);
      toast({
        title: "Update Failed",
        description:
          error.message || "Failed to update company. Please try again.",
        variant: "destructive",
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger ?? (
          <Button variant="outline" size="sm">
            <Pencil className="h-4 w-4 mr-2" />
            Edit Company
          </Button>
        )}
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit Company Details</DialogTitle>
          <DialogDescription>
            Update your company information. Changes will be reflected
            immediately.
          </DialogDescription>
        </DialogHeader>
        <form
          onSubmit={handleSubmit}
          className="space-y-4 max-h-[70vh] overflow-y-auto px-1"
        >
          <div className="space-y-2">
            <Label htmlFor="name">Company Name *</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="My Amazing Company"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="ticker">Ticker Symbol *</Label>
            <Input
              id="ticker"
              value={ticker}
              onChange={(e) => setTicker(e.target.value.toUpperCase())}
              placeholder="MACO"
              maxLength={5}
              required
              className="uppercase"
            />
            <p className="text-xs text-muted-foreground">
              1-5 characters (e.g., AAPL, TSLA, GOOG)
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
                setDescription(e.target.value)
              }
              placeholder="What does your company do?"
              rows={3}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="tags">Tags</Label>
            <div className="flex gap-2">
              <Input
                id="tags"
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    handleAddTag();
                  }
                }}
                placeholder="e.g., Technology, Finance, Healthcare"
              />
              <Button type="button" onClick={handleAddTag} size="sm">
                Add
              </Button>
            </div>
            {tags.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-2">
                {tags.map((tag) => (
                  <Badge key={tag} variant="secondary" className="gap-1">
                    {tag}
                    <X
                      className="h-3 w-3 cursor-pointer"
                      onClick={() => handleRemoveTag(tag)}
                    />
                  </Badge>
                ))}
              </div>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="logoUrl">Logo Image URL</Label>
            <Input
              id="logoUrl"
              value={logoUrl}
              onChange={(e) => setLogoUrl(e.target.value)}
              placeholder="https://example.com/logo.png"
              type="url"
            />
            {logoUrl && (
              <div className="mt-2 border rounded-lg p-2 flex items-center justify-center bg-muted">
                <img
                  src={logoUrl}
                  alt="Company logo preview"
                  className="max-h-16 max-w-full object-contain"
                  onError={(e) => {
                    (e.target as HTMLImageElement).style.display = "none";
                  }}
                />
              </div>
            )}
          </div>

          <Button type="submit" className="w-full">
            Update Company
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
