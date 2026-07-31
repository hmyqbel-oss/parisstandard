
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.current_org_id() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.cycle_is_editable(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.cycle_visible(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated;
GRANT EXECUTE ON FUNCTION public.current_org_id() TO authenticated;
GRANT EXECUTE ON FUNCTION public.cycle_is_editable(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.cycle_visible(uuid) TO authenticated;
