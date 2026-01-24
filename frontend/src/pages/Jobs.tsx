
import { useState } from 'react';
import { JobTable } from '@/components/JobTable';
import { PageLayout } from '@/components/PageLayout';
import { useJobs, useCreateJob, useUpdateJobStatus, JobStatus } from '@/hooks/useJobs';
import { useCandidates } from '@/hooks/useCandidates';
import { useToast } from '@/hooks/use-toast';
import { Skeleton } from '@/components/ui/skeleton';
import { AddJobDialog } from '@/components/AddJobDialog';
import { AddCandidateDialog } from '@/components/AddCandidateDialog';

interface JobTodo {
  id: string;
  text: string;
  completed: boolean;
  priority: 'high' | 'medium' | 'low';
  createdAt: string;
}

const Jobs = () => {
    const [isAddJobOpen, setIsAddJobOpen] = useState(false);
    const [isAddCandidateOpen, setIsAddCandidateOpen] = useState(false);
    const { toast } = useToast();

    const { data: jobs = [], isLoading: isLoadingJobs, refetch: refetchJobs } = useJobs();
    const { data: candidates = [], refetch: refetchCandidates } = useCandidates();
    const createJob = useCreateJob();
    const updateJobStatus = useUpdateJobStatus();

    const handleTodoUpdate = (jobId: string, todos: JobTodo[]) => {
        console.log('Updated todos for job', jobId, todos);
        toast({
            title: 'Todos Updated',
            description: `Job todos have been updated`,
        });
    };

    const handleRefresh = () => {
        refetchJobs();
        refetchCandidates();
    };

    const handleJobStatusChange = async (jobId: string, status: JobStatus) => {
        try {
            await updateJobStatus.mutateAsync({ id: jobId, status });
            toast({ title: 'Job status updated', description: `Status changed to ${status}` });
        } catch (error) {
            toast({ title: 'Error', description: 'Failed to update job status', variant: 'destructive' });
        }
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

    const transformedJobs = jobs.map((job) => ({
        id: job.id,
        jobId: job.id.slice(0, 8).toUpperCase(),
        jobTitle: job.job_title,
        clientName: job.client_name,
        jobDescription: job.job_description || '',
        positions: job.positions,
        status: job.status as 'Open' | 'On Hold' | 'Closed',
        createdAt: job.created_at,
        updatedAt: job.updated_at,
        statusHistory: job.status_history || [],
    }));

    return (
        <PageLayout
            onAddJob={() => setIsAddJobOpen(true)}
            onAddCandidate={() => setIsAddCandidateOpen(true)}
            onRefresh={handleRefresh}
            isLoading={isLoadingJobs}
        >
            <div className="space-y-6">
                <h2 className="text-2xl font-bold text-slate-800">Job Tracker</h2>
                {isLoadingJobs ? (
                    <Skeleton className="h-96 w-full" />
                ) : (
                    <JobTable
                        jobs={transformedJobs}
                        onStatusChange={handleJobStatusChange}
                        onViewCandidates={(jobId) => console.log('View candidates for', jobId)}
                        onTodoUpdate={handleTodoUpdate}
                    />
                )}
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

export default Jobs;
