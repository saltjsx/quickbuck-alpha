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
import { Plus } from "lucide-react";
import { useToast } from "~/hooks/use-toast";
import { track } from "@databuddy/sdk";

interface CreateProductDialogProps {
  companyId: Id<"companies">;
}

export function CreateProductDialog({ companyId }: CreateProductDialogProps) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [tags, setTags] = useState("");
  const createProduct = useMutation(api.products.createProduct);
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const productPrice = parseFloat(price);
      const productTags = tags
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean);

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
        <Button size="sm">
          <Plus className="h-4 w-4 mr-2" />
          Add Product
        </Button>
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
}
