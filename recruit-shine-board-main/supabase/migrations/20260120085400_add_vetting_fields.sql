-- Add location and rating columns to candidates table
ALTER TABLE public.candidates ADD COLUMN location TEXT;
ALTER TABLE public.candidates ADD COLUMN rating DECIMAL(3,1);
ALTER TABLE public.candidates ADD COLUMN vetting_status TEXT; -- Shortlisted / Borderline / Overqualified / Rejected
