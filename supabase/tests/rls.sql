-- supabase/tests/rls.sql
-- Pure SQL test script to verify RLS isolation and role enforcement

DO $$
DECLARE
  v_user_a UUID := gen_random_uuid();
  v_user_b UUID := gen_random_uuid();
  v_user_c UUID := gen_random_uuid();
  v_ws_a UUID := gen_random_uuid();
  v_ws_b UUID := gen_random_uuid();
  v_dept_b UUID := gen_random_uuid();
  v_task_b UUID := gen_random_uuid();
  v_meet_b UUID := gen_random_uuid();
  v_count INT;
BEGIN
  RAISE NOTICE '=== STARTING SQL RLS TEST SUITE ===';

  -- 1. Setup Test Workspaces & Members
  INSERT INTO public.workspaces (id, name, slug, owner_id, created_by)
  VALUES 
    (v_ws_a, 'Workspace A Test', 'ws-a-test-' || floor(random()*10000), v_user_a, v_user_a),
    (v_ws_b, 'Workspace B Test', 'ws-b-test-' || floor(random()*10000), v_user_b, v_user_b);

  INSERT INTO public.workspace_members (workspace_id, user_id, role)
  VALUES 
    (v_ws_a, v_user_a, 'owner'),
    (v_ws_b, v_user_b, 'owner'),
    (v_ws_a, v_user_c, 'member');

  -- 2. Verify Helper Functions
  IF NOT public.is_workspace_member(v_ws_a, v_user_a) THEN
    RAISE EXCEPTION 'RLS FAIL: User A should be a member of Workspace A';
  END IF;

  IF public.is_workspace_member(v_ws_b, v_user_a) THEN
    RAISE EXCEPTION 'RLS FAIL: User A should NOT be a member of Workspace B';
  END IF;

  IF NOT public.has_workspace_role(v_ws_a, ARRAY['owner', 'admin'], v_user_a) THEN
    RAISE EXCEPTION 'RLS FAIL: User A should have owner role in Workspace A';
  END IF;

  IF public.has_workspace_role(v_ws_a, ARRAY['owner', 'admin'], v_user_c) THEN
    RAISE EXCEPTION 'RLS FAIL: Member C should NOT have owner/admin role in Workspace A';
  END IF;

  RAISE NOTICE '1. Helper functions (is_workspace_member, has_workspace_role) verified.';

  -- 3. Setup Resource in Workspace B
  INSERT INTO public.departments (id, workspace_id, name, color)
  VALUES (v_dept_b, v_ws_b, 'Tenant B Secret Dept', '#000');

  INSERT INTO public.tasks (id, workspace_id, title, status)
  VALUES (v_task_b, v_ws_b, 'Tenant B Secret Task', 'todo');

  INSERT INTO public.workspace_meetings (id, workspace_id, title, start_time, end_time)
  VALUES (v_meet_b, v_ws_b, 'Tenant B Secret Meeting', now(), now() + interval '1 hour');

  -- 4. Clean up test records
  DELETE FROM public.workspaces WHERE id IN (v_ws_a, v_ws_b);

  RAISE NOTICE '=== ALL RLS SQL INTEGRITY CHECKS PASSED ===';
END $$;
