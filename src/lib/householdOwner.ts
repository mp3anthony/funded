// R28 (#415). An RLS-blocked UPDATE changes 0 rows and returns no error, so
// callers ask for the changed rows back (`.select('id')`) and assert here.
export function assertRowUpdated(rows: unknown[] | null | undefined, message: string): void {
  if (!rows || rows.length === 0) throw new Error(message);
}
