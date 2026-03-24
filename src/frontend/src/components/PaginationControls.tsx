import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight } from "lucide-react";

interface PaginationControlsProps {
  page: number;
  totalPages: number;
  totalItems: number;
  startIndex: number;
  endIndex: number;
  hasNext: boolean;
  hasPrev: boolean;
  goNext: () => void;
  goPrev: () => void;
  label?: string;
}

export default function PaginationControls({
  page,
  totalPages,
  totalItems,
  startIndex,
  endIndex,
  hasNext,
  hasPrev,
  goNext,
  goPrev,
  label = "items",
}: PaginationControlsProps) {
  if (totalPages <= 1) return null;

  return (
    <div className="flex items-center justify-between px-4 py-3 border-t">
      <p className="text-xs text-muted-foreground">
        Showing {startIndex + 1}–{endIndex} of {totalItems} {label}
      </p>
      <div className="flex items-center gap-1">
        <Button
          variant="outline"
          size="icon"
          className="h-7 w-7"
          disabled={!hasPrev}
          onClick={goPrev}
        >
          <ChevronLeft size={14} />
        </Button>
        <span className="text-xs text-muted-foreground px-2">
          {page + 1} / {totalPages}
        </span>
        <Button
          variant="outline"
          size="icon"
          className="h-7 w-7"
          disabled={!hasNext}
          onClick={goNext}
        >
          <ChevronRight size={14} />
        </Button>
      </div>
    </div>
  );
}
