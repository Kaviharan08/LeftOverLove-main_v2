
-- Create pickup request status enum
CREATE TYPE public.request_status AS ENUM ('pending', 'accepted', 'picked_up', 'delivered', 'cancelled');

-- Create pickup_requests table
CREATE TABLE public.pickup_requests (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  listing_id UUID NOT NULL REFERENCES public.food_listings(id) ON DELETE CASCADE,
  receiver_id UUID NOT NULL,
  volunteer_id UUID,
  status public.request_status NOT NULL DEFAULT 'pending',
  note TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.pickup_requests ENABLE ROW LEVEL SECURITY;

-- Receivers can create requests
CREATE POLICY "Receivers can create pickup requests"
ON public.pickup_requests FOR INSERT
WITH CHECK (auth.uid() = receiver_id AND has_role(auth.uid(), 'receiver'::app_role));

-- Users can view requests related to them
CREATE POLICY "Users can view their own requests"
ON public.pickup_requests FOR SELECT
USING (
  auth.uid() = receiver_id 
  OR auth.uid() = volunteer_id 
  OR auth.uid() IN (SELECT donor_id FROM public.food_listings WHERE id = listing_id)
  OR has_role(auth.uid(), 'admin'::app_role)
);

-- Volunteers can view all pending requests
CREATE POLICY "Volunteers can view pending requests"
ON public.pickup_requests FOR SELECT
USING (has_role(auth.uid(), 'volunteer'::app_role) AND status = 'pending');

-- Volunteers can accept pending requests (update volunteer_id and status)
CREATE POLICY "Volunteers can update requests they accepted"
ON public.pickup_requests FOR UPDATE
USING (
  (has_role(auth.uid(), 'volunteer'::app_role) AND (volunteer_id = auth.uid() OR (volunteer_id IS NULL AND status = 'pending')))
  OR has_role(auth.uid(), 'admin'::app_role)
);

-- Receivers can cancel their own pending requests
CREATE POLICY "Receivers can cancel their pending requests"
ON public.pickup_requests FOR UPDATE
USING (auth.uid() = receiver_id AND status = 'pending');

-- Trigger for updated_at
CREATE TRIGGER update_pickup_requests_updated_at
BEFORE UPDATE ON public.pickup_requests
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
