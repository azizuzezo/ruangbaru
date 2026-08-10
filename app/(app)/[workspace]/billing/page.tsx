'use client';

import { useWorkspaceStore } from '@/lib/stores/workspace-store';
import { useState, useEffect } from 'react';
import {
  CreditCard, CheckCircle2, ArrowUpRight, Loader2, Video, Crown,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { createClient } from '@/lib/supabase/client';
import { toast } from 'sonner';
import type { WorkspacePlan } from '@/types';
import { useT } from '@/lib/i18n/useT';

// Plan quotas. Higher tiers are effectively unlimited (represented as null).
const PLAN_LIMITS: Record<WorkspacePlan, { members: number | null; projects: number | null }> = {
  free: { members: 5, projects: 3 },
  pro: { members: 25, projects: null },
  business: { members: null, projects: null },
  enterprise: { members: null, projects: null },
};

export default function BillingPage() {
  const t = useT('billing');
  const { currentWorkspace } = useWorkspaceStore();
  const supabase = createClient();
  const [usage, setUsage] = useState({ members: 0, projects: 0 });
  const [loading, setLoading] = useState(true);

  const plan = (currentWorkspace?.plan || 'free') as WorkspacePlan;
  const limits = PLAN_LIMITS[plan];

  useEffect(() => {
    if (!currentWorkspace) return;
    (async () => {
      setLoading(true);
      const [{ count: members }, { count: projects }] = await Promise.all([
        supabase.from('workspace_members').select('*', { count: 'exact', head: true }).eq('workspace_id', currentWorkspace.id),
        supabase.from('projects').select('*', { count: 'exact', head: true }).eq('workspace_id', currentWorkspace.id).neq('status', 'archived'),
      ]);
      setUsage({ members: members || 0, projects: projects || 0 });
      setLoading(false);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentWorkspace]);

  const pct = (used: number, limit: number | null) => (limit === null ? 0 : Math.min(100, Math.round((used / limit) * 100)));
  const label = (used: number, limit: number | null, unit: string) => (limit === null ? `${used} ${t('unlimitedSuffix')}` : `${used} / ${limit} ${unit}`);

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h1 className="font-display text-2xl font-semibold text-foreground tracking-tight sm:text-3xl">
          {t('billingPageTitle')}
        </h1>
        <p className="text-xs text-muted-foreground mt-1">
          {t('billingPageSubtitle')}
        </p>
      </div>

      <div className="space-y-6">
        <Card className="border border-border/85 bg-card/60 backdrop-blur-sm relative overflow-hidden">
          <div className="absolute top-0 right-0 h-32 w-32 bg-primary/10 rounded-full blur-2xl -z-10" />
          <CardHeader className="pb-3 border-b border-border">
            <CardTitle className="text-sm font-bold text-foreground flex items-center gap-2">
              <CreditCard className="h-4 w-4 text-primary" /> {t('currentPlanLabel')}{' '}
              <span className="capitalize text-primary font-semibold">{plan}</span>
            </CardTitle>
            <CardDescription className="text-[11px]">{t('currentPlanCardDescription')}</CardDescription>
          </CardHeader>
          <CardContent className="p-6 space-y-5">
            {loading ? (
              <div className="space-y-4">
                <div className="h-8 rounded bg-muted/40 animate-pulse" />
                <div className="h-8 rounded bg-muted/40 animate-pulse" />
              </div>
            ) : (
              <div className="space-y-4">
                <div className="space-y-1.5">
                  <div className="flex justify-between text-xs font-bold">
                    <span>{t('teamMembersLabel')}</span>
                    <span className="text-muted-foreground">{label(usage.members, limits.members, t('membersUnit'))}</span>
                  </div>
                  <Progress value={pct(usage.members, limits.members)} className="h-2" />
                </div>
                <div className="space-y-1.5">
                  <div className="flex justify-between text-xs font-bold">
                    <span>{t('activeProjectsLabel')}</span>
                    <span className="text-muted-foreground">{label(usage.projects, limits.projects, t('projectsUnit'))}</span>
                  </div>
                  <Progress value={pct(usage.projects, limits.projects)} className="h-2" />
                </div>
              </div>
            )}

            <div className="pt-4 border-t border-border flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div className="text-[10px] text-muted-foreground leading-relaxed max-w-md">
                {plan === 'free' ? t('freePlanUpsell') : t('paidPlanThanks')}
              </div>
              <Button
                size="sm"
                variant="gradient"
                className="gap-1 text-xs whitespace-nowrap shrink-0"
                onClick={() =>
                  toast.info(t('paymentComingSoonToast'), {
                    description: t('paymentComingSoonDescription'),
                  })
                }
              >
                {t('upgradeButton')} <ArrowUpRight className="h-3.5 w-3.5" />
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card className="border border-border/80 bg-card/40">
          <CardHeader className="pb-3 border-b border-border">
            <CardTitle className="text-sm font-bold text-foreground">{t('bestPlanCardTitle')}</CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="border border-border rounded-xl p-5 space-y-4 bg-background/50">
                <h3 className="font-display font-bold text-sm text-foreground">{t('professionalPlanTitle')}</h3>
                <p className="text-xs text-muted-foreground">{t('professionalPlanPrice')}</p>
                <ul className="space-y-2 pt-2 border-t border-border/50">
                  {[
                    'professionalFeatureWorkspaces',
                    'professionalFeatureTasks',
                    'professionalFeatureStorage',
                    'professionalFeatureInvites',
                    'professionalFeatureSupport',
                  ].map((key) => (
                    <li key={key} className="flex items-center gap-2 text-xs text-muted-foreground">
                      <CheckCircle2 className="h-4 w-4 text-primary shrink-0" />
                      <span>{t(key)}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="border border-border rounded-xl p-5 space-y-4 bg-background/50">
                <h3 className="font-display font-bold text-sm text-foreground">{t('businessPlanTitle')}</h3>
                <p className="text-xs text-muted-foreground">{t('businessPlanPrice')}</p>
                <ul className="space-y-2 pt-2 border-t border-border/50">
                  {[
                    'businessFeatureAllPro',
                    'businessFeatureAccountManager',
                    'businessFeatureSSO',
                    'businessFeatureSLA',
                    'businessFeatureTechSupport',
                  ].map((key) => (
                    <li key={key} className="flex items-center gap-2 text-xs text-muted-foreground">
                      <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
                      <span>{t(key)}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            {/* Enterprise highlight */}
            <div className="mt-6 rounded-xl border border-amber-200 bg-amber-50 p-5 space-y-3">
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-100 text-amber-600">
                  <Crown className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="font-display font-bold text-sm text-amber-900">{t('enterprisePlanTitle')}</h3>
                  <p className="text-[11px] text-amber-700">{t('enterprisePlanPriceLine')}</p>
                </div>
              </div>
              <p className="text-xs text-amber-800 leading-relaxed">
                {t('enterpriseIntro')}
              </p>
              <ul className="space-y-2 pt-1 border-t border-amber-200">
                {[
                  { icon: Video, key: 'enterpriseFeatureVideoMeetings' },
                  { icon: CheckCircle2, key: 'enterpriseFeatureScheduleRecord' },
                  { icon: CheckCircle2, key: 'enterpriseFeatureRealtimeAccess' },
                  { icon: CheckCircle2, key: 'enterpriseFeatureUnlimited' },
                  { icon: CheckCircle2, key: 'enterpriseFeatureOnboarding' },
                ].map(({ icon: Icon, key }) => (
                  <li key={key} className="flex items-start gap-2 text-xs text-amber-800">
                    <Icon className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
                    <span>{t(key)}</span>
                  </li>
                ))}
              </ul>
              <Button
                size="sm"
                className="w-full sm:w-auto gap-1.5 bg-amber-600 hover:bg-amber-700 text-white mt-1"
                onClick={() =>
                  toast.info(t('enterpriseContactToastTitle'), {
                    description: t('enterpriseContactToastDescription'),
                    duration: 6000,
                  })
                }
              >
                <Crown className="h-3.5 w-3.5" /> {t('enterpriseCTAButton')}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
