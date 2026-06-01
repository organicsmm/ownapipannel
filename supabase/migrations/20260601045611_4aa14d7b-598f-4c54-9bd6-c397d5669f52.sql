REVOKE ALL ON FUNCTION public.claim_user_api_run_provider(uuid, uuid, text, text, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.claim_user_api_run_provider(uuid, uuid, text, text, text) FROM anon;
REVOKE ALL ON FUNCTION public.claim_user_api_run_provider(uuid, uuid, text, text, text) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.claim_user_api_run_provider(uuid, uuid, text, text, text) TO service_role;