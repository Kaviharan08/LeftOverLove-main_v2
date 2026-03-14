-- Fix: Allow receivers and volunteers to update food_listings status
-- when they have an active pickup_request for that listing.
-- This is needed because completeSelfPickup(), confirmDelivery(), and
-- createPickupRequest() all update food_listings from a non-donor context.

-- Add policy: receivers/volunteers can update listing status if they have a request for it
CREATE POLICY "Receivers and volunteers can update listing status via request"
  ON public.food_listings FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.pickup_requests pr
      WHERE pr.listing_id = food_listings.id
        AND (pr.receiver_id = auth.uid() OR pr.volunteer_id = auth.uid())
        AND pr.status NOT IN ('cancelled')
    )
  )
  WITH CHECK (
    -- Only allow updating to these statuses (not title, description, etc.)
    status IN ('available', 'claimed', 'completed', 'expired', 'expiring_soon')
  );

-- Also create the SECURITY DEFINER function as a more reliable alternative
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
  IF NOT (p_new_status = ANY(v_allowed_statuses)) THEN
    RAISE EXCEPTION 'Invalid status: %', p_new_status;
  END IF;

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
    RAISE EXCEPTION 'Access denied';
  END IF;

  UPDATE public.food_listings
  SET status = p_new_status
  WHERE id = p_listing_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.update_listing_status(UUID, TEXT) TO authenticated;
