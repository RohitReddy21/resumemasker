
import { Briefcase, Users, UserCheck, Calendar, Gift, CheckCircle } from 'lucide-react';
import { KPICard } from '@/components/KPICard';
import { PageLayout } from '@/components/PageLayout';
import { useDashboardMetrics } from '@/hooks/useMetrics';
import { useJobs } from '@/hooks/useJobs';
import { useCandidates } from '@/hooks/useCandidates';
import { Skeleton } from '@/components/ui/skeleton';
import { useState } from 'react';
import { AddJobDialog } from '@/components/AddJobDialog';
import { AddCandidateDialog } from '@/components/AddCandidateDialog';
import { useCreateJob } from '@/hooks/useJobs';
import { useToast } from '@/hooks/use-toast';
import { JobStatus } from '@/types/recruitment';

const Dashboard = () => {
    const [isAddJobOpen, setIsAddJobOpen] = useState(false);
    const [isAddCandidateOpen, setIsAddCandidateOpen] = useState(false);
    const { toast } = useToast();

    const { data: dashboardMetrics, isLoading: isLoadingMetrics, refetch: refetchMetrics } = useDashboardMetrics();
    const { data: jobs = [], refetch: refetchJobs } = useJobs();
    const { data: candidates = [], refetch: refetchCandidates } = useCandidates();
    const createJob = useCreateJob();

    const handleRefresh = () => {
        refetchMetrics();
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

    return (
        <PageLayout
            onAddJob={() => setIsAddJobOpen(true)}
            onAddCandidate={() => setIsAddCandidateOpen(true)}
            onRefresh={handleRefresh}
            isLoading={isLoadingMetrics}
        >
            {/* KPI Cards */}
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
                {isLoadingMetrics ? (
                    Array.from({ length: 6 }).map((_, i) => (
                        <Skeleton key={i} className="h-28" />
                    ))
                ) : (
                    <>
                        <KPICard title="Open Positions" value={dashboardMetrics?.openPositions || 0} icon={Briefcase} variant="primary" />
                        <KPICard title="Total Applicants" value={dashboardMetrics?.totalApplicants || 0} icon={Users} variant="info" />
                        <KPICard title="Shortlisted" value={dashboardMetrics?.shortlisted || 0} icon={UserCheck} variant="warning" />
                        <KPICard title="Interviews" value={dashboardMetrics?.interviewsScheduled || 0} icon={Calendar} variant="default" />
                        <KPICard title="Offers Released" value={dashboardMetrics?.offersReleased || 0} icon={Gift} variant="success" />
                        <KPICard title="Onboarded" value={dashboardMetrics?.onboarded || 0} icon={CheckCircle} variant="success" />
                    </>
                )}
            </div>

            <div className="mt-8 bg-card p-8 rounded-xl border border-dashed border-slate-200 text-center">
                <h2 className="text-xl font-bold text-slate-800">Welcome to RecruitTrack Dashboard</h2>
                <p className="text-slate-500 max-w-md mx-auto mt-2">Use the sidebar to navigate between Jobs, Candidates, and detailed analytical Metrics.</p>
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

export default Dashboard;
