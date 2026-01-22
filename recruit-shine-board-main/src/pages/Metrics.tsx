
import { useState } from 'react';
import { FunnelChart } from '@/components/FunnelChart';
import { TATMetricsCard } from '@/components/TATMetricsCard';
import { PageLayout } from '@/components/PageLayout';
import { useFunnelMetrics, useTATMetrics } from '@/hooks/useMetrics';
import { useJobs, useCreateJob, JobStatus } from '@/hooks/useJobs';
import { useCandidates } from '@/hooks/useCandidates';
import { useToast } from '@/hooks/use-toast';
import { Skeleton } from '@/components/ui/skeleton';
import { AddJobDialog } from '@/components/AddJobDialog';
import { AddCandidateDialog } from '@/components/AddCandidateDialog';

const Metrics = () => {
    const [isAddJobOpen, setIsAddJobOpen] = useState(false);
    const [isAddCandidateOpen, setIsAddCandidateOpen] = useState(false);
    const { toast } = useToast();

    const { data: funnelMetrics = [], isLoading: isLoadingFunnel, refetch: refetchFunnel } = useFunnelMetrics();
    const { data: tatMetrics = [], isLoading: isLoadingTAT, refetch: refetchTAT } = useTATMetrics();
    const { data: jobs = [], refetch: refetchJobs } = useJobs();
    const { data: candidates = [], refetch: refetchCandidates } = useCandidates();
    const createJob = useCreateJob();

    const handleRefresh = () => {
        refetchFunnel();
        refetchTAT();
        refetchJobs();
        refetchCandidates();
    };

    const handleAddJob = async (data: { jobTitle: string; clientName: string; jobDescription: string; positions: number; status: JobStatus }) => {
        try {
            await createJob.mutateAsync({
                job_title: data.jobTitle,
                client_name: data.clientName,
                job_description: data.jobDescription,
                positions: data.positions,
                status: data.status,
            });
            toast({ title: 'Job created', description: `${data.jobTitle} has been added` });
            setIsAddJobOpen(false);
        } catch (error) {
            toast({ title: 'Error', description: 'Failed to create job', variant: 'destructive' });
        }
    };

    const transformedFunnelMetrics = funnelMetrics.map((m) => ({
        stage: m.stage,
        count: m.count,
        percentage: m.percentage,
    }));

    const transformedTATMetrics = tatMetrics.map((m) => ({
        metric: m.metric,
        avgDays: m.avgDays,
        minDays: m.minDays,
        maxDays: m.maxDays,
        count: m.count,
    }));
    
    const topSkills = (() => {
        const counts: Record<string, number> = {};
        candidates.forEach((c: any) => {
            (c.skills || []).forEach((s: string) => {
                const key = s.trim();
                if (!key) return;
                counts[key] = (counts[key] || 0) + 1;
            });
        });
        return Object.entries(counts)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 10);
    })();
    
    const topLocations = (() => {
        const counts: Record<string, number> = {};
        candidates.forEach((c: any) => {
            const loc = (c.location || '').trim();
            if (!loc || loc.toLowerCase() === 'not disclosed') return;
            counts[loc] = (counts[loc] || 0) + 1;
        });
        return Object.entries(counts)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 10);
    })();

    return (
        <PageLayout
            onAddJob={() => setIsAddJobOpen(true)}
            onAddCandidate={() => setIsAddCandidateOpen(true)}
            onRefresh={handleRefresh}
            isLoading={isLoadingFunnel || isLoadingTAT}
        >
            <div className="space-y-6">
                <h2 className="text-2xl font-bold text-slate-800">Analytical Metrics</h2>

                <div className="grid gap-6 lg:grid-cols-2">
                    {isLoadingFunnel ? (
                        <Skeleton className="h-80 w-full" />
                    ) : (
                        <FunnelChart data={transformedFunnelMetrics} />
                    )}
                    {isLoadingTAT ? (
                        <Skeleton className="h-80 w-full" />
                    ) : (
                        <TATMetricsCard metrics={transformedTATMetrics} />
                    )}
                </div>
                
                <div className="grid gap-6 lg:grid-cols-2">
                    <div className="border border-border rounded-lg p-4 bg-card">
                        <h3 className="text-lg font-semibold mb-3">Top Skills</h3>
                        <div className="flex flex-wrap gap-2">
                            {topSkills.length === 0 ? (
                                <p className="text-sm text-muted-foreground">No skills found</p>
                            ) : (
                                topSkills.map(([skill, count]) => (
                                    <span key={skill} className="px-3 py-1 bg-slate-100 text-slate-700 rounded-full text-xs font-bold border border-slate-200">
                                        {skill} <span className="opacity-60">({count})</span>
                                    </span>
                                ))
                            )}
                        </div>
                    </div>
                    <div className="border border-border rounded-lg p-4 bg-card">
                        <h3 className="text-lg font-semibold mb-3">Top Locations</h3>
                        <div className="flex flex-wrap gap-2">
                            {topLocations.length === 0 ? (
                                <p className="text-sm text-muted-foreground">No locations found</p>
                            ) : (
                                topLocations.map(([loc, count]) => (
                                    <span key={loc} className="px-3 py-1 bg-slate-100 text-slate-700 rounded-full text-xs font-bold border border-slate-200">
                                        {loc} <span className="opacity-60">({count})</span>
                                    </span>
                                ))
                            )}
                        </div>
                    </div>
                </div>
            </div>

            <AddJobDialog
                open={isAddJobOpen}
                onOpenChange={setIsAddJobOpen}
                onSubmit={handleAddJob}
            />

            <AddCandidateDialog
                open={isAddCandidateOpen}
                onOpenChange={setIsAddCandidateOpen}
                jobs={jobs}
            />
        </PageLayout>
    );
};

export default Metrics;
