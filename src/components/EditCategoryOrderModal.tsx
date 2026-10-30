import { useState } from "react";
import { ArrowUp, ArrowDown, GripVertical } from "lucide-react";
import IconCircle from "@/components/ui/IconCircle";
import SingleCard from "@/components/ui/SingleCard";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  categories: string[];
  onSave: (newOrder: string[]) => void;
}

export default function EditCategoryOrderModal({ isOpen, onClose, categories, onSave }: Props) {
  const [order, setOrder] = useState<string[]>(categories);

  // Start from the current order each time the card opens, and only then:
  // a parent re-render while open must not undo a reorder in progress.
  // Derived-state reset in render (same pattern as SingleCard), no effect.
  const [prevOpen, setPrevOpen] = useState(isOpen);
  if (isOpen !== prevOpen) {
    setPrevOpen(isOpen);
    if (isOpen) setOrder(categories);
  }

  const swap = (a: number, b: number) => {
    if (b < 0 || b >= order.length) return;
    const next = [...order];
    [next[a], next[b]] = [next[b], next[a]];
    setOrder(next);
  };

  return (
    <SingleCard
      open={isOpen}
      onClose={onClose}
      title="Category order"
      submitLabel="Save order"
      onSubmit={() => onSave(order)}
    >
      <div className="flex flex-col gap-2">
        {order.map((cat, i) => (
          <div
            key={cat}
            className="flex items-center justify-between rounded-card border border-border-strong bg-surface-raised py-1 pl-4 pr-1"
          >
            <div className="flex min-w-0 items-center gap-3">
              <GripVertical className="h-4 w-4 shrink-0 text-muted/50" aria-hidden="true" />
              <span className="truncate text-sm font-semibold text-foreground">{cat}</span>
            </div>
            <div className="flex items-center">
              <IconCircle
                type="button"
                label={`Move ${cat} up`}
                onClick={() => swap(i, i - 1)}
                disabled={i === 0}
              >
                <ArrowUp className="h-4 w-4" />
              </IconCircle>
              <IconCircle
                type="button"
                label={`Move ${cat} down`}
                onClick={() => swap(i, i + 1)}
                disabled={i === order.length - 1}
              >
                <ArrowDown className="h-4 w-4" />
              </IconCircle>
            </div>
          </div>
        ))}
      </div>
    </SingleCard>
  );
}
