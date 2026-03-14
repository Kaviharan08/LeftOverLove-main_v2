
-- Allow NGOs to create pickup requests (like receivers)
CREATE POLICY "NGOs can create pickup requests"
  ON public.pickup_requests FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = receiver_id AND has_role(auth.uid(), 'ngo'::app_role));

-- Allow NGOs to cancel their pending requests
CREATE POLICY "NGOs can cancel their pending requests"
  ON public.pickup_requests FOR UPDATE
  TO authenticated
  USING (auth.uid() = receiver_id AND status = 'pending'::request_status AND has_role(auth.uid(), 'ngo'::app_role));

-- Allow NGOs to view their own requests
CREATE POLICY "NGOs can view their own requests"
  ON public.pickup_requests FOR SELECT
  TO authenticated
  USING (auth.uid() = receiver_id AND has_role(auth.uid(), 'ngo'::app_role));
