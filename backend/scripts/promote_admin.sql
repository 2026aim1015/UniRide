-- Run only from a trusted database/admin session after the target user has signed up.
-- Replace the UUID with the matching Supabase Auth user UUID.
UPDATE profiles
SET role = 'admin'
WHERE id = '00000000-0000-0000-0000-000000000000';
