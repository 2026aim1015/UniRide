-- OPTIONAL. Only allow @iitrpr.ac.in emails to sign up (enforced inside Supabase).
CREATE OR REPLACE FUNCTION public.only_iitrpr_emails()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.email NOT ILIKE '%@iitrpr.ac.in' THEN
    RAISE EXCEPTION 'Only @iitrpr.ac.in email addresses can sign up';
  END IF;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS only_iitrpr_emails_trigger ON auth.users;
CREATE TRIGGER only_iitrpr_emails_trigger
BEFORE INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.only_iitrpr_emails();
