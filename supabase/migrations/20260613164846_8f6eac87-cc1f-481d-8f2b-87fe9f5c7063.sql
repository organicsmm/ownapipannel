REVOKE ALL ON FUNCTION public.claim_user_api_run_provider(uuid, uuid, text, text, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.claim_user_api_run_provider(uuid, uuid, text, text, text) TO service_role;

REVOKE ALL ON FUNCTION public.requeue_user_api_runs_without_provider_order(integer) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.requeue_user_api_runs_without_provider_order(integer) TO service_role;