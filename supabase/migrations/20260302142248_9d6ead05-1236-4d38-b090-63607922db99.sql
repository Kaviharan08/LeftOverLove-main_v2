
-- Just add columns (realtime already enabled)
ALTER TABLE public.pickup_requests
  ADD COLUMN IF NOT EXISTS volunteer_lat double precision,
  ADD COLUMN IF NOT EXISTS volunteer_lng double precision;
