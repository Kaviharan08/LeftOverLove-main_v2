-- Fix: RLS was blocking receivers/volunteers from marking food_listings as
-- completed/claimed/expired. Only donors could UPDATE food_listings, so
-- completeSelfPickup(), confirmDelivery(), createPickupRequest() etc. were
-- silently failing to update the listing status.
--
-- Solution: Add a SECURITY DEFINER function that any authenticated user can
-- call to update a listing status — but only to allowed terminal statuses,
-- and only when a valid pickup_request exists linking them to the listing.

CREATE OR REPLACE FUNCTION public.update_listing_status(
  p_listing_id UUID,
  p_new_status TEXT
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_allowed_statuses TEXT[] := ARRAY['available', 'claimed', 'completed', 'expired', 'expiring_soon'];
  v_caller_id UUID := auth.uid();
  v_has_access BOOLEAN := false;
BEGIN
  -- Validate the requested status
  IF NOT (p_new_status = ANY(v_allowed_statuses)) THEN
    RAISE EXCEPTION 'Invalid status: %', p_new_status;
  END IF;

  -- Check caller has a valid reason to update this listing:
  -- 1. Caller is the donor (owns the listing)
  -- 2. Caller is a receiver/NGO with an active pickup_request for this listing
  -- 3. Caller is a volunteer assigned to a pickup_request for this listing
  -- 4. Caller is an admin
  SELECT true INTO v_has_access
  FROM food_listings fl
  WHERE fl.id = p_listing_id
    AND (
      fl.donor_id = v_caller_id
      OR public.has_role(v_caller_id, 'admin')
      OR EXISTS (
        SELECT 1 FROM pickup_requests pr
        WHERE pr.listing_id = p_listing_id
          AND (pr.receiver_id = v_caller_id OR pr.volunteer_id = v_caller_id)
          AND pr.status NOT IN ('cancelled')
      )
    )
  LIMIT 1;

  IF NOT v_has_access THEN
    RAISE EXCEPTION 'Access denied: you are not authorized to update this listing';
  END IF;

  -- Perform the update (bypasses RLS via SECURITY DEFINER)
  UPDATE public.food_listings
  SET status = p_new_status
  WHERE id = p_listing_id;
END;
$$;

-- Grant execute to authenticated users
GRANT EXECUTE ON FUNCTION public.update_listing_status(UUID, TEXT) TO authenticated;
