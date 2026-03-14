
-- Phase 2: Food expiry and categories
-- Add expires_at column to food_listings
ALTER TABLE public.food_listings ADD COLUMN expires_at timestamptz;

-- Add expired to listing_status enum
ALTER TYPE public.listing_status ADD VALUE IF NOT EXISTS 'expired';

-- Add food_category enum
CREATE TYPE public.food_category AS ENUM ('cooked', 'raw', 'packaged', 'baked', 'beverages', 'other');

-- Add category and dietary_tags columns
ALTER TABLE public.food_listings ADD COLUMN category public.food_category;
ALTER TABLE public.food_listings ADD COLUMN dietary_tags text[] DEFAULT '{}';

-- Phase 3: Ban system
ALTER TABLE public.profiles ADD COLUMN is_banned boolean NOT NULL DEFAULT false;
ALTER TABLE public.profiles ADD COLUMN ban_reason text;

-- Phase 3: Admin audit log table
CREATE TABLE public.admin_audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id uuid NOT NULL,
  action text NOT NULL,
  target_type text NOT NULL,
  target_id uuid,
  details jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.admin_audit_log ENABLE ROW LEVEL SECURITY;

-- Only admins can view audit logs
CREATE POLICY "Admins can view audit logs"
ON public.admin_audit_log FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

-- Only admins can insert audit logs
CREATE POLICY "Admins can insert audit logs"
ON public.admin_audit_log FOR INSERT
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Create function to archive expired listings (called from frontend)
CREATE OR REPLACE FUNCTION public.archive_expired_listings()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  updated_count integer;
BEGIN
  UPDATE food_listings
  SET status = 'expired'
  WHERE expires_at IS NOT NULL
    AND expires_at < now()
    AND status = 'available';
  GET DIAGNOSTICS updated_count = ROW_COUNT;
  RETURN updated_count;
END;
$$;
