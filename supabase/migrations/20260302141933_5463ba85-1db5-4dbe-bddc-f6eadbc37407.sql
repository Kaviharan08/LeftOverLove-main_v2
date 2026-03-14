
-- Drop all existing UPDATE policies on pickup_requests
DROP POLICY IF EXISTS "Donors can update requests on their listings" ON public.pickup_requests;
DROP POLICY IF EXISTS "Receivers can update their own requests" ON public.pickup_requests;
DROP POLICY IF EXISTS "Volunteers can update requests" ON public.pickup_requests;
DROP POLICY IF EXISTS "NGOs can update their own requests" ON public.pickup_requests;
DROP POLICY IF EXISTS "Volunteers can view volunteer_requested requests" ON public.pickup_requests;

-- Donors: can update any request on their listings (approve, etc.)
CREATE POLICY "Donors can update requests on their listings"
ON public.pickup_requests FOR UPDATE TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM food_listings
    WHERE food_listings.id = pickup_requests.listing_id
      AND food_listings.donor_id = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM food_listings
    WHERE food_listings.id = pickup_requests.listing_id
      AND food_listings.donor_id = auth.uid()
  )
);

-- Receivers: can update their own requests (cancel, confirm, request volunteer, self-pickup)
CREATE POLICY "Receivers can update their own requests"
ON public.pickup_requests FOR UPDATE TO authenticated
USING (auth.uid() = receiver_id AND has_role(auth.uid(), 'receiver'::app_role))
WITH CHECK (auth.uid() = receiver_id AND has_role(auth.uid(), 'receiver'::app_role));

-- NGOs: can update their own requests
CREATE POLICY "NGOs can update their own requests"
ON public.pickup_requests FOR UPDATE TO authenticated
USING (auth.uid() = receiver_id AND has_role(auth.uid(), 'ngo'::app_role))
WITH CHECK (auth.uid() = receiver_id AND has_role(auth.uid(), 'ngo'::app_role));

-- Volunteers: can accept unassigned requests or update their own assigned deliveries
CREATE POLICY "Volunteers can update requests"
ON public.pickup_requests FOR UPDATE TO authenticated
USING (
  has_role(auth.uid(), 'volunteer'::app_role)
  AND (volunteer_id IS NULL OR volunteer_id = auth.uid())
)
WITH CHECK (
  has_role(auth.uid(), 'volunteer'::app_role)
  AND (volunteer_id = auth.uid())
);

-- Volunteers: can view pending/volunteer_requested requests (to accept them)
CREATE POLICY "Volunteers can view available requests"
ON public.pickup_requests FOR SELECT TO authenticated
USING (
  has_role(auth.uid(), 'volunteer'::app_role)
  AND status IN ('pending'::request_status, 'volunteer_requested'::request_status, 'accepted'::request_status)
);

-- Admins: can update any request
CREATE POLICY "Admins can update any request"
ON public.pickup_requests FOR UPDATE TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
