
-- Add expiring_soon to listing_status enum
ALTER TYPE public.listing_status ADD VALUE IF NOT EXISTS 'expiring_soon' AFTER 'available';

-- Update archive_expired_listings to handle both expiring_soon and expired
CREATE OR REPLACE FUNCTION public.archive_expired_listings()
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  updated_count integer;
  total_count integer := 0;
BEGIN
  -- Set expiring_soon for listings expiring within 2 hours
  UPDATE food_listings
  SET status = 'expiring_soon'
  WHERE expires_at IS NOT NULL
    AND expires_at > now()
    AND expires_at <= now() + interval '2 hours'
    AND status = 'available';
  GET DIAGNOSTICS updated_count = ROW_COUNT;
  total_count := total_count + updated_count;

  -- Set expired for listings past expiry
  UPDATE food_listings
  SET status = 'expired'
  WHERE expires_at IS NOT NULL
    AND expires_at < now()
    AND status IN ('available', 'expiring_soon');
  GET DIAGNOSTICS updated_count = ROW_COUNT;
  total_count := total_count + updated_count;

  RETURN total_count;
END;
$function$;

-- Create cleanup function to delete expired listings older than 24 hours
CREATE OR REPLACE FUNCTION public.cleanup_old_expired_listings()
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  deleted_count integer;
BEGIN
  DELETE FROM food_listings
  WHERE status = 'expired'
    AND expires_at IS NOT NULL
    AND expires_at < now() - interval '24 hours';
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$function$;
