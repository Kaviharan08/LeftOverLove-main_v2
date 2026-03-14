
-- Update handle_new_user to block admin role self-assignment during signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  INSERT INTO public.profiles (user_id, name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'name', NEW.email));
  
  -- Insert role from metadata, but BLOCK admin self-assignment
  IF NEW.raw_user_meta_data->>'role' IS NOT NULL 
     AND NEW.raw_user_meta_data->>'role' != 'admin' THEN
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, (NEW.raw_user_meta_data->>'role')::app_role);
  ELSIF NEW.raw_user_meta_data->>'role' = 'admin' THEN
    -- Silently assign receiver role instead
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, 'receiver'::app_role);
  END IF;
  
  RETURN NEW;
END;
$function$;
