-- Widen the `bug-report-screenshots` bucket's allowed MIME types (#163,
-- closes #159). iPhone camera roll defaults to HEIC/HEIF, and GIF is a
-- common screen-recording/annotation export — both were previously
-- rejected by the bucket policy even though nothing in the client UI
-- explained why. Adds to the original JPEG/PNG/WebP set from
-- 20260903000000_bug_report_screenshots_bucket.sql rather than editing it.
update storage.buckets
set allowed_mime_types = array['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif', 'image/gif']
where id = 'bug-report-screenshots';
