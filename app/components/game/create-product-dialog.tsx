import { useState, type ReactNode } from "react";
import {
  useState,
  useRef,
  useImperativeHandle,
  forwardRef,
  type ReactNode,
} from "react";
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
import { Plus } from "lucide-react";
import { useToast } from "~/hooks/use-toast";
import { track } from "@databuddy/sdk";
import { Filter } from "bad-words";

interface CreateProductDialogProps {
  companyId: Id<"companies">;
  trigger?: ReactNode;
}

export function CreateProductDialog({
  companyId,
  trigger,
}: CreateProductDialogProps) {
  hiddenTrigger?: boolean;
}

export interface CreateProductDialogRef {
  triggerRef: HTMLButtonElement | null;
}

export const CreateProductDialog = forwardRef<
  CreateProductDialogRef,
  CreateProductDialogProps
>(({ companyId, trigger, hiddenTrigger = false }, ref) => {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [tags, setTags] = useState("");
  const createProduct = useMutation(api.products.createProduct);
  const { toast } = useToast();
  const filter = new Filter();
  const triggerRef = useRef<HTMLButtonElement>(null);

  useImperativeHandle(ref, () => ({
    triggerRef: triggerRef.current,
  }));

  // Helper function to extract filename from URL
  const getFilenameFromUrl = (url: string): string => {
    try {
      const urlObj = new URL(url);
      return urlObj.pathname.split("/").pop() || "";
    } catch {
      return url;
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Profanity checks (lowercase everything for consistent checking)
    if (filter.isProfane(name.toLowerCase())) {
      toast({
        title: "Profanity Detected",
        description:
          "Product name contains inappropriate content. Please choose a different name.",
        variant: "destructive",
      });
      return;
    }

    if (filter.isProfane(description.toLowerCase())) {
      toast({
        title: "Profanity Detected",
        description:
          "Product description contains inappropriate content. Please revise your description.",
        variant: "destructive",
      });
      return;
    }

    // Check image URL and filename for profanity
    if (imageUrl) {
      if (filter.isProfane(imageUrl.toLowerCase())) {
        toast({
          title: "Profanity Detected",
          description:
            "Image URL contains inappropriate content. Please use a different URL.",
          variant: "destructive",
        });
        return;
      }

      const filename = getFilenameFromUrl(imageUrl);
      if (filter.isProfane(filename.toLowerCase())) {
        toast({
          title: "Profanity Detected",
          description:
            "Image filename contains inappropriate content. Please use a different image.",
          variant: "destructive",
        });
        return;
      }
    }

    // Check tags for profanity
    const productTags = tags
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean);

    const profaneTag = productTags.find((tag) =>
      filter.isProfane(tag.toLowerCase())
    );
    if (profaneTag) {
      toast({
        title: "Profanity Detected",
        description: `Tag "${profaneTag}" contains inappropriate content. Please remove or modify this tag.`,
        variant: "destructive",
      });
      return;
    }

    try {
      const productPrice = parseFloat(price);

      await createProduct({
        name,
        description,
        price: productPrice,
        imageUrl: imageUrl || undefined,
        tags: productTags,
        companyId,
      });

      // Track product creation event
      await track("product_created", {
        product_name: name,
        price: productPrice,
        currency: "USD",
        has_image: !!imageUrl,
        tags_count: productTags.length,
        tags: productTags.join(", "),
        description_length: description.length,
        timestamp: new Date().toISOString(),
      });

      setName("");
      setDescription("");
      setPrice("");
      setImageUrl("");
      setTags("");
      setOpen(false);
    } catch (error) {
      console.error("Failed to create product:", error);

      // Track product creation failure
      await track("product_creation_failed", {
        product_name: name,
        price: parseFloat(price),
        error_message: error instanceof Error ? error.message : "Unknown error",
        timestamp: new Date().toISOString(),
      });

      toast({
        title: "Error",
        description: "Failed to create product. Please try again.",
        variant: "destructive",
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button size="sm">
            <Plus className="h-4 w-4 mr-2" />
            Add Product
          </Button>
        {hiddenTrigger ? (
          <button
            ref={triggerRef}
            type="button"
            className="sr-only"
            aria-label="Open create product dialog"
          />
        ) : (
          trigger ?? (
            <Button size="sm">
              <Plus className="h-4 w-4 mr-2" />
              Add Product
            </Button>
          )
        )}
      </DialogTrigger>
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create New Product</DialogTitle>
          <DialogDescription>
            Add a new product to your company's catalog.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="product-name">Product Name</Label>
            <Input
              id="product-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Amazing Product"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="product-description">Description</Label>
            <Textarea
              id="product-description"
              value={description}
              onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
                setDescription(e.target.value)
              }
              placeholder="Describe your product..."
              rows={3}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="product-price">Price ($)</Label>
            <Input
              id="product-price"
              type="number"
              step="0.01"
              min="0.01"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              placeholder="99.99"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="product-image">Image URL (Optional)</Label>
            <Input
              id="product-image"
              type="url"
              value={imageUrl}
              onChange={(e) => setImageUrl(e.target.value)}
              placeholder="https://example.com/image.jpg"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="product-tags">Tags (comma-separated)</Label>
            <Input
              id="product-tags"
              value={tags}
              onChange={(e) => setTags(e.target.value)}
              placeholder="electronics, gadgets, trending"
            />
          </div>

          <Button type="submit" className="w-full">
            Create Product
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
});

CreateProductDialog.displayName = "CreateProductDialog";
