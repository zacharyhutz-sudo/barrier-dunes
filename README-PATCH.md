# Barrier Dunes Supabase Admin Patch

Drag these files into the root of your Barrier Dunes repo, preserving folders.

Then run:

```bash
npm install
npm run dev
```

Important: this patch changes `package.json` to add `@supabase/supabase-js`. It intentionally does not include `package-lock.json`; let `npm install` update it on your machine.

Admin routes added:

- `/barrier-dunes/admin/login`
- `/barrier-dunes/admin`

Supabase setup SQL is in:

- `supabase/schema.sql`

GitHub Pages deploy environment variables are added to `.github/workflows/deploy.yml`.
