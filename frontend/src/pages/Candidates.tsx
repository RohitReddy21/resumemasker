
import { useState } from 'react';
import { CandidatePipeline } from '@/components/CandidatePipeline';
import { PageLayout } from '@/components/PageLayout';
import { useCandidates, useUpdateCandidate, CandidateStatus } from '@/hooks/useCandidates';
import { useJobs, useCreateJob, JobStatus } from '@/hooks/useJobs';
import { useToast } from '@/hooks/use-toast';
import { Skeleton } from '@/components/ui/skeleton';
import { AddJobDialog } from '@/components/AddJobDialog';
import { AddCandidateDialog } from '@/components/AddCandidateDialog';

const Candidates = () => {
    const [isAddJobOpen, setIsAddJobOpen] = useState(false);
    const [isAddCandidateOpen, setIsAddCandidateOpen] = useState(false);
    const { toast } = useToast();

    const { data: candidates = [], isLoading: isLoadingCandidates, refetch: refetchCandidates } = useCandidates();
    const { data: jobs = [], refetch: refetchJobs } = useJobs();
    const updateCandidate = useUpdateCandidate();
    const createJob = useCreateJob();

    const handleRefresh = () => {
        refetchCandidates();
        refetchJobs();
    };

    const handleCandidateStatusChange = async (candidateId: string, status: CandidateStatus) => {
        // ✅ HARD GUARD: Cannot update without _id
        if (!candidateId || candidateId.trim() === '') {
            toast({
                title: 'Error',
                description: '❌ Candidate must be saved before editing. Please save first.',
                variant: 'destructive'
            });
            return;
        }

        try {
            console.log(`🔄 Updating status for candidate ${candidateId} to ${status}`);
            await updateCandidate.mutateAsync({ id: candidateId, updates: { current_status: status } });
            toast({ title: 'Candidate moved', description: `✅ Status changed to ${status}` });
        } catch (error) {
            console.error('Status update failed:', error);
            toast({
                title: 'Error',
                description: `❌ Failed to update candidate. Make sure it was saved first.`,
                variant: 'destructive'
            });
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

    const transformedCandidates = candidates.map((candidate) => ({
        id: candidate.id,
        candidateId: candidate.id.slice(0, 8).toUpperCase(),
        name: candidate.name,
        email: candidate.email,
        phone: candidate.phone || '',
        skills: candidate.skills || [],
        jobId: candidate.job_id,
        currentStatus: candidate.current_status,
        availability: candidate.availability || '',
        recruiter: candidate.recruiter || '',
        currentCtc: candidate.current_ctc || '',
        expectedCtc: candidate.expected_ctc || '',
        matchScore: candidate.match_score || 0,
        experience: candidate.experience || '',
        location: candidate.location || '',
        rating: candidate.rating || 0,
        vettingStatus: candidate.vetting_status || '',
        statusHistory: candidate.status_history || [],
        interviewDate: candidate.interview_date || undefined,
        offerDate: candidate.offer_date || undefined,
        onboardingStatus: candidate.onboarding_status as 'Yes' | 'No' | 'Pending',
        joiningDate: candidate.joining_date || undefined,
        createdAt: candidate.created_at,
        masked_resume_text: candidate.masked_resume_text || null,
        masked_name: candidate.masked_name || null,
    }));

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
            isLoading={isLoadingCandidates}
        >
            <div className="space-y-6">
                <h2 className="text-2xl font-bold text-slate-800">Candidate Pipeline</h2>
                {isLoadingCandidates ? (
                    <Skeleton className="h-96 w-full" />
                ) : (
                    <CandidatePipeline
                        candidates={transformedCandidates}
                        jobs={transformedJobs}
                        onStatusChange={handleCandidateStatusChange}
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

export default Candidates;
