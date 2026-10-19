"use client";

import { useState, useEffect } from "react";
import type { Fund } from "@/context/AppContext";
import Dialog, { DialogButton } from "@/components/ui/Dialog";

interface AddAmountModalProps {
  isOpen: boolean;
  onClose: () => void;
  goal: Fund | null;
  onConfirm: (amount: number) => void;
}

export default function AddAmountModal({
  isOpen,
  onClose,
  goal,
  onConfirm,
}: AddAmountModalProps) {
  const [amountStr, setAmountStr] = useState("");

  useEffect(() => {
    if (isOpen) {
      setAmountStr("");
    }
  }, [isOpen]);

  if (!isOpen || !goal) return null;

  const handleInputChange = (val: string) => {
    let raw = val;
    if (raw.startsWith("$")) {
      raw = raw.substring(1);
    }
    // Only allow digits and one decimal point
    const parts = raw.split(".");
    let numeric = parts[0].replace(/[^0-9]/g, "");
    if (parts.length > 1) {
      numeric += "." + parts[1].replace(/[^0-9]/g, "").substring(0, 2);
    }
    setAmountStr(numeric);
  };

  const handleConfirm = () => {
    const numericAmt = parseFloat(amountStr);
    if (!isNaN(numericAmt) && numericAmt > 0) {
      onConfirm(numericAmt);
      onClose();
    }
  };

  const isValid = !isNaN(parseFloat(amountStr)) && parseFloat(amountStr) > 0;

  return (
    <Dialog
      open={isOpen}
      onClose={onClose}
      title={`Add to ${goal.name}`}
      maxWidthClass="max-w-sm"
      footer={
        <>
          <DialogButton variant="ghost" onClick={onClose}>
            Cancel
          </DialogButton>
          <DialogButton variant="primary" onClick={handleConfirm} disabled={!isValid}>
            Confirm
          </DialogButton>
        </>
      }
    >
      {/* Input Field */}
      <div className="space-y-3">
            <input
              type="text"
              placeholder="$0.00"
              value={amountStr ? `$${amountStr}` : ""}
              onChange={(e) => handleInputChange(e.target.value)}
              className="w-full bg-background border border-border rounded-[2px] px-4 py-3 text-center text-xl text-foreground focus:outline-none focus:ring-1 focus:ring-primary/50 placeholder:text-muted"
              autoFocus
            />

            {/* Quick-Add Options */}
            <div className="grid grid-cols-4 gap-2">
              {[10, 25, 50, 100].map((amt) => (
                <button
                  key={amt}
                  type="button"
                  onClick={() => setAmountStr(amt.toFixed(2))}
                  className="rounded-[2px] border border-border bg-white/5 py-2 text-xs text-foreground hover:bg-white/10 active:scale-95 transition-all"
                >
                  +${amt}
                </button>
              ))}
            </div>
      </div>
    </Dialog>
  );
}
