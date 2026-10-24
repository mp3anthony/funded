"use client";

import React from "react";
import { WifiOff, RefreshCw } from "lucide-react";
import AuthScreen, { AuthIcon } from "@/components/AuthScreen";
import Button from "@/components/ui/Button";

export default function OfflinePage() {
  const handleRetry = () => {
    window.location.reload();
  };

  return (
    <AuthScreen
      embedded
      title="You are Offline"
      icon={
        <AuthIcon>
          <WifiOff className="h-8 w-8" aria-hidden="true" />
        </AuthIcon>
      }
    >
      <div className="space-y-5 text-center">
        <p className="text-sm leading-relaxed text-muted">
          It looks like your internet connection is unavailable right now. Don&apos;t worry—your cached data remains accessible. Connect to a network to sync your changes.
        </p>
        <Button fullWidth onClick={handleRetry}>
          <RefreshCw size={16} aria-hidden="true" />
          Check Connection
        </Button>
      </div>
    </AuthScreen>
  );
}
