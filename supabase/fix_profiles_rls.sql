-- ============================================================
-- CORREÇÃO RLS profiles — Cole no SQL Editor do Supabase
-- Execute ESTE script separadamente (não precisa recriar tudo)
-- ============================================================

-- 1. Função SECURITY DEFINER: cria o perfil automaticamente
--    quando um usuário é criado no Supabase Auth.
--    Lê name e role dos metadados passados no signUp().
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER           -- executa como superuser, ignorando RLS
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, name, email, role)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'name',  split_part(NEW.email, '@', 1)),
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'role', 'vendedor')::user_role
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

-- 2. Trigger que dispara após INSERT em auth.users
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 3. Garante que authenticated users podem LER todos os profiles
--    (necessário para o loadProfile funcionar)
DROP POLICY IF EXISTS "profiles: own read"    ON profiles;
DROP POLICY IF EXISTS "profiles: other read"  ON profiles;
DROP POLICY IF EXISTS "profiles: own update"  ON profiles;

CREATE POLICY "profiles: authenticated read"
  ON profiles FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "profiles: own update"
  ON profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = id);

-- ============================================================
-- FIM — Agora o cadastro cria o perfil via trigger automaticamente.
-- O frontend NÃO precisa mais fazer INSERT em profiles.
-- ============================================================
