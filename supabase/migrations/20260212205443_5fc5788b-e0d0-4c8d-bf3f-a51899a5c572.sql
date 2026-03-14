
-- Create storage bucket for food listing images
INSERT INTO storage.buckets (id, name, public) VALUES ('food-images', 'food-images', true);

-- Allow anyone to view food images
CREATE POLICY "Food images are publicly accessible"
ON storage.objects FOR SELECT
USING (bucket_id = 'food-images');

-- Allow authenticated users to upload food images
CREATE POLICY "Authenticated users can upload food images"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'food-images' AND auth.uid() IS NOT NULL);

-- Allow users to update their own uploads
CREATE POLICY "Users can update their own food images"
ON storage.objects FOR UPDATE
USING (bucket_id = 'food-images' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Allow users to delete their own uploads
CREATE POLICY "Users can delete their own food images"
ON storage.objects FOR DELETE
USING (bucket_id = 'food-images' AND auth.uid()::text = (storage.foldername(name))[1]);
