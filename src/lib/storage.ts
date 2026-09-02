import { supabase } from "./supabase";

/**
 * Uploads a user avatar to Supabase Storage and returns the public CDN URL.
 */
export async function uploadAvatar(userId: string, file: File): Promise<string> {
  // Prefer the MIME type for the extension; fall back to the file name only
  // when the type is unknown. Keeps paths clean now that avatars are
  // re-encoded to JPEG regardless of the original file name.
  const mimeExtMap: Record<string, string> = {
    "image/jpeg": "jpg",
    "image/png": "png",
    "image/webp": "webp",
  };
  const fileExt =
    mimeExtMap[file.type] || file.name.split(".").pop() || "jpg";
  const timestamp = Date.now();
  const fileName = `avatars/${userId}/${timestamp}.${fileExt}`;

  const { data, error } = await supabase.storage
    .from("avatars")
    .upload(fileName, file, {
      cacheControl: "3600",
      upsert: true,
    });

  if (error) {
    throw error;
  }

  const { data: publicUrlData } = supabase.storage
    .from("avatars")
    .getPublicUrl(fileName);

  return publicUrlData.publicUrl;
}

/**
 * Deletes a user avatar from Supabase Storage.
 */
export async function deleteAvatar(userId: string, imageUrl: string): Promise<void> {
  const bucketName = "avatars";
  const marker = `/${bucketName}/`;
  const index = imageUrl.indexOf(marker);
  if (index === -1) return;

  const filePath = imageUrl.substring(index + marker.length);

  const { error } = await supabase.storage
    .from(bucketName)
    .remove([filePath]);

  if (error) {
    throw error;
  }
}

/**
 * Uploads a bug-report screenshot to Supabase Storage and returns the
 * public CDN URL (Slice 15, #114). Bucket is public-read, authenticated-
 * write only — see supabase/migrations/20260903000000_bug_report_screenshots_bucket.sql.
 */
export async function uploadBugReportScreenshot(userId: string, file: File): Promise<string> {
  const mimeExtMap: Record<string, string> = {
    "image/jpeg": "jpg",
    "image/png": "png",
    "image/webp": "webp",
  };
  const fileExt = mimeExtMap[file.type] || file.name.split(".").pop() || "jpg";
  const timestamp = Date.now();
  const fileName = `screenshots/${userId}/${timestamp}.${fileExt}`;

  const { error } = await supabase.storage
    .from("bug-report-screenshots")
    .upload(fileName, file, {
      cacheControl: "3600",
      upsert: false,
    });

  if (error) {
    throw error;
  }

  const { data: publicUrlData } = supabase.storage
    .from("bug-report-screenshots")
    .getPublicUrl(fileName);

  return publicUrlData.publicUrl;
}

/**
 * Retrieves the latest avatar image url.
 */
export async function getAvatarUrl(userId: string): Promise<string | null> {
  const { data, error } = await supabase.storage
    .from("avatars")
    .list(`avatars/${userId}`, {
      limit: 1,
      sortBy: { column: "name", order: "desc" },
    });

  if (error || !data || data.length === 0) {
    return null;
  }

  const filePath = `avatars/${userId}/${data[0].name}`;
  const { data: publicUrlData } = supabase.storage
    .from("avatars")
    .getPublicUrl(filePath);

  return publicUrlData.publicUrl;
}
