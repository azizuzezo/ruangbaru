import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';

// Entry point after login / OAuth. Resolves the user's workspace and forwards
// to the real slug-scoped dashboard route, or to onboarding if they have none.
export const dynamic = 'force-dynamic';

export default async function DashboardEntry() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect('/login');

  const { data } = await supabase
    .from('workspace_members')
    .select('joined_at, workspaces(slug)')
    .eq('user_id', user.id)
    .order('joined_at', { ascending: true })
    .limit(1);

  const slug = (data?.[0] as { workspaces?: { slug?: string } } | undefined)?.workspaces?.slug;

  if (slug) redirect(`/${slug}/dashboard`);
  redirect('/welcome');
}
