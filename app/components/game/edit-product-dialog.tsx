import { useState, useEffect, type ReactNode } from "react";
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
import { Edit, Loader2 } from "lucide-react";
import { useToast } from "~/hooks/use-toast";
import { track } from "@databuddy/sdk";

interface EditProductDialogProps {
  product: {
    _id: Id<"products">;
    name: string;
    description: string;
    price: number;
    imageUrl?: string;
    tags: string[];
    isActive: boolean;
  };
  trigger?: ReactNode;
}

export function EditProductDialog({
  product,
  trigger,
}: EditProductDialogProps) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState(product.name);
  const [description, setDescription] = useState(product.description);
  const [price, setPrice] = useState(product.price.toString());
  const [imageUrl, setImageUrl] = useState(product.imageUrl || "");
  const [tags, setTags] = useState(product.tags.join(", "));
  const [isSubmitting, setIsSubmitting] = useState(false);
  const updateProduct = useMutation(api.products.updateProduct);
  const { toast } = useToast();

  // Reset form when product changes or dialog opens
  useEffect(() => {
    if (open) {
      setName(product.name);
      setDescription(product.description);
      setPrice(product.price.toString());
      setImageUrl(product.imageUrl || "");
      setTags(product.tags.join(", "));
    }
  }, [open, product]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const newPrice = parseFloat(price);
      const newTags = tags
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean);

      await updateProduct({
        productId: product._id,
        name,
        description,
        price: newPrice,
        imageUrl: imageUrl || undefined,
        tags: newTags,
      });

      // Track product update event
      await track("product_updated", {
        product_id: product._id,
        product_name: name,
        old_price: product.price,
        new_price: newPrice,
        price_changed: product.price !== newPrice,
        price_change_amount: newPrice - product.price,
        currency: "USD",
        has_image: !!imageUrl,
        tags_count: newTags.length,
        timestamp: new Date().toISOString(),
      });

      setOpen(false);
    } catch (error) {
      console.error("Failed to update product:", error);

      // Track product update failure
      await track("product_update_failed", {
        product_id: product._id,
        product_name: name,
        error_message: error instanceof Error ? error.message : "Unknown error",
        timestamp: new Date().toISOString(),
      });

      toast({
        title: "Update Failed",
        description: "Failed to update product. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger ?? (
          <Button variant="ghost" size="sm">
            <Edit className="h-4 w-4" />
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Product</DialogTitle>
          <DialogDescription>
            Update your product's information.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="edit-product-name">Product Name</Label>
            <Input
              id="edit-product-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Amazing Product"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="edit-product-description">Description</Label>
            <Textarea
              id="edit-product-description"
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
            <Label htmlFor="edit-product-price">Price ($)</Label>
            <Input
              id="edit-product-price"
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
            <Label htmlFor="edit-product-image">Image URL (Optional)</Label>
            <Input
              id="edit-product-image"
              type="url"
              value={imageUrl}
              onChange={(e) => setImageUrl(e.target.value)}
              placeholder="https://example.com/image.jpg"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="edit-product-tags">Tags (comma-separated)</Label>
            <Input
              id="edit-product-tags"
              value={tags}
              onChange={(e) => setTags(e.target.value)}
              placeholder="electronics, gadgets, trending"
            />
          </div>

          <Button type="submit" className="w-full" disabled={isSubmitting}>
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Updating...
              </>
            ) : (
              "Update Product"
            )}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
