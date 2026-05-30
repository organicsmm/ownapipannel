
-- Recreate missing trigger on auth.users
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Backfill profiles, wallets, user_roles for existing auth users
INSERT INTO public.profiles (user_id, email, full_name)
SELECT id, email, COALESCE(raw_user_meta_data->>'full_name', raw_user_meta_data->>'name', '')
FROM auth.users
ON CONFLICT (user_id) DO NOTHING;

INSERT INTO public.wallets (user_id, balance, total_deposited, total_spent)
SELECT id, 0, 0, 0 FROM auth.users
ON CONFLICT (user_id) DO NOTHING;

INSERT INTO public.user_roles (user_id, role)
SELECT id, 'user'::app_role FROM auth.users
ON CONFLICT (user_id, role) DO NOTHING;
