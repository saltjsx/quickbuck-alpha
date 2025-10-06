"use client";

import * as React from "react";
import { Check, ChevronsUpDown, X } from "lucide-react";
import { cn } from "~/lib/utils";
import { Button } from "~/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "~/components/ui/dropdown-menu";
import { Badge } from "~/components/ui/badge";
import { Input } from "~/components/ui/input";

export interface MultiSelectProps {
  options: string[];
  selected: Set<string>;
  onChange: (selected: Set<string>) => void;
  placeholder?: string;
  className?: string;
}

export function MultiSelect({
  options,
  selected,
  onChange,
  placeholder = "Select items...",
  className,
}: MultiSelectProps) {
  const [open, setOpen] = React.useState(false);
  const [search, setSearch] = React.useState("");

  const filteredOptions = React.useMemo(() => {
    if (!search) return options;
    return options.filter((option) =>
      option.toLowerCase().includes(search.toLowerCase())
    );
  }, [options, search]);

  const handleSelect = (option: string) => {
    const newSelected = new Set(selected);
    if (newSelected.has(option)) {
      newSelected.delete(option);
    } else {
      newSelected.add(option);
    }
    onChange(newSelected);
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange(new Set());
  };

  const handleRemove = (option: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const newSelected = new Set(selected);
    newSelected.delete(option);
    onChange(newSelected);
  };

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={cn(
            "w-full justify-between min-h-9 h-auto py-2",
            className
          )}
        >
          <div className="flex flex-wrap gap-1 flex-1 items-center">
            {selected.size === 0 ? (
              <span className="text-muted-foreground text-sm">
                {placeholder}
              </span>
            ) : (
              <>
                {Array.from(selected).map((item) => (
                  <Badge
                    key={item}
                    variant="secondary"
                    className="mr-1 hover:bg-secondary"
                  >
                    {item}
                    <button
                      className="ml-1 rounded-full outline-none hover:bg-secondary-foreground/20"
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          handleRemove(item, e as any);
                        }
                      }}
                      onMouseDown={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                      }}
                      onClick={(e) => handleRemove(item, e)}
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                ))}
              </>
            )}
          </div>
          <div className="flex items-center gap-1 ml-2">
            {selected.size > 0 && (
              <button
                className="rounded-full outline-none hover:bg-accent p-0.5"
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    handleClear(e as any);
                  }
                }}
                onMouseDown={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                }}
                onClick={handleClear}
              >
                <X className="h-4 w-4 opacity-50" />
              </button>
            )}
            <ChevronsUpDown className="h-4 w-4 shrink-0 opacity-50" />
          </div>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        className="w-[var(--radix-dropdown-menu-trigger-width)] p-0"
        align="start"
      >
        <div className="p-2 border-b">
          <Input
            placeholder="Search..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-8"
          />
        </div>
        <div className="max-h-64 overflow-y-auto p-1">
          {filteredOptions.length === 0 ? (
            <div className="py-6 text-center text-sm text-muted-foreground">
              No results found
            </div>
          ) : (
            filteredOptions.map((option) => (
              <DropdownMenuCheckboxItem
                key={option}
                checked={selected.has(option)}
                onCheckedChange={() => handleSelect(option)}
                onSelect={(e) => e.preventDefault()}
              >
                {option}
              </DropdownMenuCheckboxItem>
            ))
          )}
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
