-- Add CTC fields to candidates table
ALTER TABLE public.candidates ADD COLUMN current_ctc TEXT;
ALTER TABLE public.candidates ADD COLUMN expected_ctc TEXT;
