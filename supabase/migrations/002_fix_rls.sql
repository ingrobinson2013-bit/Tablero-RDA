-- Fix RLS policies para permitir INSERT/UPDATE con anon key
-- Ejecutar en Supabase SQL Editor

-- Borrar politicas existentes
DROP POLICY IF EXISTS "acceso_autenticados" ON dropi_orders;
DROP POLICY IF EXISTS "acceso_anonimo" ON dropi_orders;

-- Recrear con WITH CHECK para INSERT/UPDATE
CREATE POLICY "allow_all_anon" ON dropi_orders
  FOR ALL TO anon
  USING (true)
  WITH CHECK (true);

CREATE POLICY "allow_all_authenticated" ON dropi_orders
  FOR ALL TO authenticated
  USING (true)
  WITH CHECK (true);
