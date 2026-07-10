# Barrier Dunes Admin Workspace Patch

## Install from a MacBook Air

1. In Supabase, open **SQL Editor → New query**.
2. Paste and run the full SQL provided by ChatGPT. The same SQL is also stored at:
   `supabase/migrations/20260710_admin_workspace_history.sql`
3. Unzip this patch.
4. Open the unzipped folder and upload **its contents** to the root of the `barrier-dunes` GitHub repository.
5. Choose **Replace** for files that already exist.
6. Commit the changes. GitHub Pages will deploy automatically.

Do not upload the outer patch folder as a nested folder. `package.json`, `src`, and `supabase` should remain at the repository root.

## What this patch adds

- Removes the overlapping sticky Quick Update panel.
- Adds a selected-unit record grid with current status, completion date, due date, notes, and history.
- Adds direct Resolve, Record Again, Edit, and Reopen workflows.
- Adds recurring event history for paint, dues, insurance, inspections, paperwork, and maintenance.
- Adds overdue and due-soon calculations and dashboard summary filters.
- Adds batch updates for multiple units.
- Adds CSV exports for current status and unit history.
- Moves the map into a secondary workspace tab.
- Moves unit administration into an Admin Tools dialog.
- Adds item-type settings, including natural-language action/date labels and default recurrence intervals.
- Adds president-only role and activation management for existing Supabase Auth users.
- Adds database-generated audit logging.
- Removes the unused deprecated `lucide-astro` package.

## Verification completed

- `npm ci` completed successfully.
- `npm run build` completed successfully.
- JavaScript syntax checks passed.
- All JavaScript data selectors were matched to dashboard markup.
- PostgreSQL DDL parsed successfully.
- The lockfile contains no private package-registry URLs.
