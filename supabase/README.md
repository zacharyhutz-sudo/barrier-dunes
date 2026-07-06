# Supabase setup for Barrier Dunes admin

1. Create a Supabase project.
2. Open SQL Editor and run `schema.sql`.
3. Create the first Auth user in Authentication → Users.
4. Copy that user's UUID and run the profile insert at the bottom of `schema.sql`.
5. Copy your Project URL and anon/publishable key into local `.env` and GitHub repository variables.
6. Visit `/barrier-dunes/admin/login`.

For GitHub Pages, use repository variables:

- `PUBLIC_SUPABASE_URL`
- `PUBLIC_SUPABASE_ANON_KEY`

The anon key is public. Do not use or commit the service role key.
