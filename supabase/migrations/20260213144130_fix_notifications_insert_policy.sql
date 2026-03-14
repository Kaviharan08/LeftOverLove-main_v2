
-- Replace the overly permissive notifications INSERT policy with a more targeted one
DROP POLICY "System can create notifications" ON public.notifications;

-- Allow any authenticated user to create notifications (needed for sending notifications to others)
CREATE POLICY "Authenticated users can create notifications"
  ON public.notifications FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);
