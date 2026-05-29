
-- 1. Create handle_new_user trigger on auth.users (auto-creates profile, wallet, user_role)
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 2. Create subscription auto-init trigger on auth.users
DROP TRIGGER IF EXISTS on_auth_user_subscription ON auth.users;
CREATE TRIGGER on_auth_user_subscription
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.create_user_subscription();

-- 3. Enable realtime on wallets table
ALTER TABLE public.wallets REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.wallets;

-- Also enable realtime for chat for live chat widget
ALTER TABLE public.chat_messages REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_messages;

ALTER TABLE public.chat_conversations REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_conversations;

-- 4. Insert default platform_settings row
INSERT INTO public.platform_settings (maintenance_mode, global_markup_percent)
SELECT false, 800
WHERE NOT EXISTS (SELECT 1 FROM public.platform_settings);
