REVOKE ALL ON TABLE public.provider_accounts FROM anon;
REVOKE ALL ON TABLE public.provider_accounts FROM PUBLIC;
REVOKE ALL ON TABLE public.service_provider_mapping FROM anon;
REVOKE ALL ON TABLE public.service_provider_mapping FROM PUBLIC;

GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.provider_accounts TO authenticated;
GRANT ALL ON TABLE public.provider_accounts TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.service_provider_mapping TO authenticated;
GRANT ALL ON TABLE public.service_provider_mapping TO service_role;

DROP POLICY IF EXISTS "Admin only provider_accounts" ON public.provider_accounts;
DROP POLICY IF EXISTS "Admin only service_provider_mapping" ON public.service_provider_mapping;

CREATE POLICY "Admins can view provider accounts"
  ON public.provider_accounts
  FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::public.app_role));

CREATE POLICY "Admins can insert provider accounts"
  ON public.provider_accounts
  FOR INSERT
  TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));

CREATE POLICY "Admins can update provider accounts"
  ON public.provider_accounts
  FOR UPDATE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::public.app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));

CREATE POLICY "Admins can delete provider accounts"
  ON public.provider_accounts
  FOR DELETE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::public.app_role));

CREATE POLICY "Admins can view service provider mappings"
  ON public.service_provider_mapping
  FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::public.app_role));

CREATE POLICY "Admins can insert service provider mappings"
  ON public.service_provider_mapping
  FOR INSERT
  TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));

CREATE POLICY "Admins can update service provider mappings"
  ON public.service_provider_mapping
  FOR UPDATE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::public.app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));

CREATE POLICY "Admins can delete service provider mappings"
  ON public.service_provider_mapping
  FOR DELETE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::public.app_role));