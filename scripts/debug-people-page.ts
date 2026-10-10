import { createAdminClient } from '../src/lib/supabase/admin';
import { getWorkspacePeople, getWorkspaceMemberProjectsAndActivitiesMaps } from '../src/lib/people/queries';
import { getWorkspaceDepartments } from '../src/lib/department/queries';
import { getWorkspaceJobOpenings, getWorkspaceCandidates, getWorkspaceInterviews, getRecruitmentStats } from '../src/lib/recruitment/queries';
import { getWorkspaceInvitations } from '../src/lib/invitations/queries';

async function diagnose() {
  try {
    const admin = createAdminClient();
    const { data: ws, error: wsErr } = await admin.from('workspaces').select('id, name').limit(1).maybeSingle();
    console.log('Resolved Workspace:', ws?.id, ws?.name, wsErr);
    const wsId = ws?.id || 'demo-workspace';

    console.log('\n--- 1. Testing getWorkspacePeople ---');
    try {
      const p = await getWorkspacePeople(wsId);
      console.log('getWorkspacePeople OK, count:', p.length);
    } catch (e: any) {
      console.error('getWorkspacePeople FAILED:', e.message, e.stack);
    }

    console.log('\n--- 2. Testing getWorkspaceDepartments ---');
    try {
      const d = await getWorkspaceDepartments(wsId);
      console.log('getWorkspaceDepartments OK, count:', d.length);
    } catch (e: any) {
      console.error('getWorkspaceDepartments FAILED:', e.message, e.stack);
    }

    console.log('\n--- 3. Testing getWorkspaceInvitations ---');
    try {
      const i = await getWorkspaceInvitations(wsId);
      console.log('getWorkspaceInvitations OK, count:', i.length);
    } catch (e: any) {
      console.error('getWorkspaceInvitations FAILED:', e.message, e.stack);
    }

    console.log('\n--- 4. Testing getWorkspaceJobOpenings ---');
    try {
      const j = await getWorkspaceJobOpenings(wsId);
      console.log('getWorkspaceJobOpenings OK, count:', j.length);
    } catch (e: any) {
      console.error('getWorkspaceJobOpenings FAILED:', e.message, e.stack);
    }

    console.log('\n--- 5. Testing getWorkspaceCandidates ---');
    try {
      const c = await getWorkspaceCandidates(wsId);
      console.log('getWorkspaceCandidates OK, count:', c.length);
    } catch (e: any) {
      console.error('getWorkspaceCandidates FAILED:', e.message, e.stack);
    }

    console.log('\n--- 6. Testing getWorkspaceInterviews ---');
    try {
      const iv = await getWorkspaceInterviews(wsId);
      console.log('getWorkspaceInterviews OK, count:', iv.length);
    } catch (e: any) {
      console.error('getWorkspaceInterviews FAILED:', e.message, e.stack);
    }

    console.log('\n--- 7. Testing getRecruitmentStats ---');
    try {
      const s = await getRecruitmentStats(wsId);
      console.log('getRecruitmentStats OK:', s);
    } catch (e: any) {
      console.error('getRecruitmentStats FAILED:', e.message, e.stack);
    }

    console.log('\n--- 8. Testing getWorkspaceMemberProjectsAndActivitiesMaps ---');
    try {
      const m = await getWorkspaceMemberProjectsAndActivitiesMaps(wsId);
      console.log('getWorkspaceMemberProjectsAndActivitiesMaps OK');
    } catch (e: any) {
      console.error('getWorkspaceMemberProjectsAndActivitiesMaps FAILED:', e.message, e.stack);
    }

  } catch (globalErr: any) {
    console.error('DIAGNOSIS FAILED GLOBALLY:', globalErr.message, globalErr.stack);
  }
}

diagnose();
