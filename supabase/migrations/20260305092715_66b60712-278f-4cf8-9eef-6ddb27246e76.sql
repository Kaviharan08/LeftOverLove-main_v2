ALTER TABLE public.food_listings ADD COLUMN IF NOT EXISTS quantity integer DEFAULT NULL;
ALTER TABLE public.food_listings ADD COLUMN IF NOT EXISTS weight_kg numeric DEFAULT NULL;