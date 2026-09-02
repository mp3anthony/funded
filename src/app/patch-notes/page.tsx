import PatchNotesClient from "./patch-notes-client";

export const unstable_instant = {
  prefetch: "static",
  unstable_disableValidation: true,
};

export default function Page() {
  return <PatchNotesClient />;
}
