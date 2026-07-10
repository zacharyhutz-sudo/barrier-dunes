BARRIER DUNES — ADD UNIT UI PATCH

What this patch changes
-----------------------
- Adds a prominent “+ Add Unit” button beside the Units heading.
- Adds an “Add the first unit” button when the property has no units yet.
- Opens a dedicated, simple Add Unit dialog instead of burying creation in Admin Tools.
- Requires only the unit number; display name defaults to “Unit <number>”.
- Keeps building, notes, and map coordinates optional.
- Checks for duplicate unit numbers, including archived units.
- Preserves entered values when Supabase returns an error.
- Disables the submit button while saving.
- Automatically selects the new unit and opens its Unit Record after saving.
- Keeps Admin Tools focused on editing the selected unit.

Install from a Mac
------------------
1. Unzip this file.
2. Open your Barrier Dunes repository folder.
3. Drag the included src folder into the repository root.
4. Choose Merge/Replace when Finder asks.
5. Commit and push the two changed files:
   - src/pages/admin/index.astro
   - src/scripts/adminDashboard.js

No Supabase SQL is required for this patch.

Verification
------------
- JavaScript syntax checked.
- Applied over a clean copy of the prior admin-workspace repository.
- npm ci completed successfully.
- Astro production build completed successfully with all 8 routes.
