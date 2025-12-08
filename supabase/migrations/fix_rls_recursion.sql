-- Fix RLS Infinite Recursion by using a SECURITY DEFINER function

-- 1. Create a helper function to check role safely
CREATE OR REPLACE FUNCTION public.get_user_role(user_id uuid)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER -- This bypasses RLS
AS $$
BEGIN
  RETURN (SELECT role FROM public.usuarios WHERE auth_id = user_id);
END;
$$;

-- 2. Drop the recursive policies
DROP POLICY IF EXISTS "Admins and Guestores can view all profiles" ON public.usuarios;
DROP POLICY IF EXISTS "Admins can update any profile" ON public.usuarios;

-- 3. Recreate policies using the secure function
CREATE POLICY "Admins and Guestores can view all profiles" 
ON public.usuarios 
FOR SELECT 
TO authenticated 
USING (
  (get_user_role(auth.uid()) IN ('admin', 'gestor'))
  OR 
  (auth_id = auth.uid()) -- Users can always see themselves (included in logic or separate, keeping logical OR for safety)
);

CREATE POLICY "Admins can update any profile" 
ON public.usuarios 
FOR UPDATE
TO authenticated 
USING (
  get_user_role(auth.uid()) = 'admin'
);
