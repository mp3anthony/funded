"use client";

import React, { useState, useRef } from "react";
import { Upload, Trash2, Loader2 } from "lucide-react";
import { uploadAvatar, deleteAvatar } from "@/lib/storage";
import Button from "@/components/ui/Button";
import ConfirmDialog from "@/components/ui/ConfirmDialog";
import AvatarCropModal from "./AvatarCropModal";

// Generous pre-crop ceiling to guard canvas memory; rejects only absurd files.
const MAX_PRECROP_BYTES = 30 * 1024 * 1024;

interface AvatarUploadProps {
  currentAvatarUrl: string | null;
  memberName: string;
  userId: string;
  onAvatarChange: (url: string | null) => void;
}

export default function AvatarUpload({
  currentAvatarUrl,
  memberName,
  userId,
  onAvatarChange,
}: AvatarUploadProps) {
  const [loading, setLoading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [cropSrc, setCropSrc] = useState<string | null>(null);
  const [confirmRemoveOpen, setConfirmRemoveOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    // Allow re-picking the same file later.
    e.target.value = "";
    if (!file) return;

    // Validate type
    const validTypes = ["image/jpeg", "image/png", "image/webp"];
    if (!validTypes.includes(file.type)) {
      setError("Invalid file type. Only JPEG, PNG, and WebP are allowed.");
      return;
    }

    // Pre-crop sanity ceiling (guards canvas memory on very large files).
    if (file.size > MAX_PRECROP_BYTES) {
      setError("That image is too large. Please choose one under 30MB.");
      return;
    }

    setError(null);
    // Open the crop modal; upload happens once the user confirms.
    setCropSrc(URL.createObjectURL(file));
  };

  const closeCropModal = () => {
    setCropSrc((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return null;
    });
  };

  const handleCropComplete = async (blob: Blob) => {
    closeCropModal();

    const processedFile = new File([blob], `${userId}-${Date.now()}.jpg`, {
      type: "image/jpeg",
    });

    setPreviewUrl(URL.createObjectURL(processedFile));
    setLoading(true);

    try {
      // If there's an existing avatar, delete it from storage first
      if (currentAvatarUrl) {
        try {
          await deleteAvatar(userId, currentAvatarUrl);
        } catch (delErr) {
          console.warn("Could not delete old avatar from storage:", delErr);
        }
      }

      const publicUrl = await uploadAvatar(userId, processedFile);
      onAvatarChange(publicUrl);
    } catch (err: any) {
      console.error("Avatar upload failed:", err);
      setError(err.message || "Failed to upload avatar.");
      setPreviewUrl(null);
    } finally {
      setLoading(false);
    }
  };

  const handleRemove = async () => {
    if (!currentAvatarUrl) return;

    setLoading(true);
    setError(null);
    try {
      await deleteAvatar(userId, currentAvatarUrl);
      onAvatarChange(null);
      setPreviewUrl(null);
    } catch (err: any) {
      console.error("Failed to remove avatar:", err);
      setError(err.message || "Failed to remove avatar.");
    } finally {
      setLoading(false);
    }
  };

  const triggerFileInput = () => {
    fileInputRef.current?.click();
  };

  const activeAvatar = previewUrl || currentAvatarUrl;

  return (
    <>
    <div className="flex flex-col sm:flex-row items-center gap-5 p-4 bg-surface border border-border rounded-card">
      {/* Avatar Display wrapper */}
      <div className="relative h-20 w-20 rounded-full overflow-hidden bg-surface-raised border border-border shrink-0 shadow-inner">
        {activeAvatar ? (
          <img
            src={activeAvatar}
            alt={memberName}
            className="h-full w-full object-cover"
            onError={() => {
              setError("Failed to load avatar image.");
              setPreviewUrl(null);
            }}
          />
        ) : (
          <div className="h-full w-full bg-gradient-to-tr from-primary to-emerald-500 flex items-center justify-center text-foreground font-bold text-2xl">
            {memberName.charAt(0).toUpperCase() || "?"}
          </div>
        )}

        {loading && (
          <div className="absolute inset-0 bg-foreground/20 dark:bg-foreground/20 dark:bg-black/80 flex items-center justify-center">
            <Loader2 className="h-6 w-6 text-primary-ink animate-spin" />
          </div>
        )}
      </div>

      {/* Control Buttons */}
      <div className="flex flex-col space-y-2 w-full sm:w-auto">
        <div className="flex items-center gap-2">
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            accept="image/jpeg,image/png,image/webp"
            className="hidden"
          />
          <Button
            onClick={triggerFileInput}
            disabled={loading}
            className="px-4"
          >
            <Upload size={14} />
            <span>Upload photo</span>
          </Button>

          {currentAvatarUrl && (
            <Button
              variant="ghost"
              onClick={() => setConfirmRemoveOpen(true)}
              disabled={loading}
              className="px-4"
            >
              <Trash2 size={14} />
              <span>Remove</span>
            </Button>
          )}
        </div>

        {/* Hints and Error messages */}
        <div className="space-y-1">
          <p className="text-[10px] text-muted">
            Allowed formats: JPEG, PNG, WebP. Photos are automatically cropped
            and resized.
          </p>
          {error && (
            <p className="text-[10px] text-destructive-ink font-semibold uppercase tracking-wider animate-shake">
              {error}
            </p>
          )}
        </div>
      </div>
    </div>

    <ConfirmDialog
      open={confirmRemoveOpen}
      title="Remove photo?"
      message="Are you sure you want to remove your profile photo?"
      confirmLabel="Remove"
      busyLabel="Removing…"
      onConfirm={handleRemove}
      onCancel={() => setConfirmRemoveOpen(false)}
    />

    {cropSrc && (
      <AvatarCropModal
        imageSrc={cropSrc}
        onCancel={closeCropModal}
        onComplete={handleCropComplete}
      />
    )}
    </>
  );
}
