import { useState, useRef } from 'react';
import {
  Dialog, DialogContent, DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useCreateCandidate, useUpdateCandidate, CandidateStatus } from '@/hooks/useCandidates';
import { Job } from '@/hooks/useJobs';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Upload, FileText, CheckCircle2, Eye, EyeOff } from 'lucide-react';
import { CANDIDATE_STATUSES } from '@/utils/constants';
import { extractTextFromFile, analyzeResume, analyzeResumeWithBackend } from '@/utils/resumeParser';
import { CandidateProfileCard } from './CandidateProfileCard';
import { cn } from '@/lib/utils';

interface AddCandidateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  jobs: Job[];
}

export const AddCandidateDialog = ({ open, onOpenChange, jobs }: AddCandidateDialogProps) => {
  const [jobId, setJobId] = useState('');
  const [status, setStatus] = useState<CandidateStatus>('Applied');
  const [recruiter, setRecruiter] = useState('');

  // Bulk state
  const [processedCandidates, setProcessedCandidates] = useState<any[]>([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [showMaskedInfo, setShowMaskedInfo] = useState(false);
  const [viewMode, setViewMode] = useState<'edit' | 'profile'>('profile');

  const fileInputRef = useRef<HTMLInputElement>(null);
  const createCandidate = useCreateCandidate();
  const updateCandidate = useUpdateCandidate();
  const { toast } = useToast();

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    if (!jobId) {
      toast({
        title: "Select Job First",
        description: "Please select a job position before uploading resumes.",
        variant: "destructive"
      });
      return;
    }

    const selectedJob = jobs.find(j => j.id === jobId);
    if (!selectedJob) return;

    setIsAnalyzing(true);
    const newResults: any[] = [];

    for (const file of files) {
      try {
        // Try backend analysis first for better results & masking
        let analysis;
        try {
            analysis = await analyzeResumeWithBackend(file, jobId, selectedJob.job_description || '');
        } catch (backendError) {
            console.warn("Backend analysis failed, falling back to local analysis:", backendError);
            const text = await extractTextFromFile(file);
            analysis = await analyzeResume(text, selectedJob.job_description || '');
        }

        newResults.push({
          ...analysis,
          file_name: file.name,
          saved: false,
          error: false
        });
      } catch (error) {
        console.error(`Failed to parse ${file.name}:`, error);
        newResults.push({
          file_name: file.name,
          name: "Failed to parse",
          error: true,
          saved: false
        });
      }
    }

    setProcessedCandidates(prev => [...prev, ...newResults]);
    if (newResults.length > 0 && selectedIndex === null) {
      setSelectedIndex(0);
    }

    setIsAnalyzing(false);
    toast({
      title: "Analysis Complete",
      description: `Processed ${files.length} resumes.`,
    });
  };

  const updateCandidateField = (index: number, field: string, value: any) => {
    const updated = [...processedCandidates];
    updated[index] = { ...updated[index], [field]: value };
    setProcessedCandidates(updated);
  };

  const handleSaveAll = async () => {
    const unsaved = processedCandidates.filter(c => !c.saved && !c.error);
    if (unsaved.length === 0) return;

    let successCount = 0;
    for (let i = 0; i < processedCandidates.length; i++) {
      const c = processedCandidates[i];
      if (c.saved || c.error) continue;

      try {
        if (c.existingId) {
            // Update existing candidate (already created by backend analysis)
            await updateCandidate.mutateAsync({
                id: c.existingId,
                updates: {
                    name: c.name,
                    email: c.email,
                    phone: c.phone || undefined,
                    skills: Array.isArray(c.coreSkills) ? c.coreSkills : (c.coreSkills || "").split(',').map((s: string) => s.trim()),
                    job_id: jobId,
                    current_status: status,
                    availability: c.availability || undefined,
                    recruiter: recruiter || undefined,
                    current_ctc: c.currentCtc,
                    expected_ctc: c.expectedCtc,
                    match_score: c.matchScore,
                    experience: c.yearsOfExperience,
                    location: c.location,
                    rating: c.rating || undefined,
                    vetting_status: c.status,
                    social_links: c.socialLinks,
                    last_company: c.lastCompany,
                }
            });
        } else {
            // Create new candidate
            await createCandidate.mutateAsync({
                name: c.name,
                email: c.email,
                phone: c.phone || undefined,
                skills: Array.isArray(c.coreSkills) ? c.coreSkills : (c.coreSkills || "").split(',').map((s: string) => s.trim()),
                job_id: jobId,
                current_status: status,
                availability: c.availability || undefined,
                recruiter: recruiter || undefined,
                current_ctc: c.currentCtc,
                expected_ctc: c.expectedCtc,
                match_score: c.matchScore,
                experience: c.yearsOfExperience,
                location: c.location,
                rating: c.rating || undefined,
                vetting_status: c.status,
                social_links: c.socialLinks,
                last_company: c.lastCompany,
                masked_resume_text: c.maskedResumeText,
                masked_name: c.maskedName,
            });
        }

        const updated = [...processedCandidates];
        updated[i].saved = true;
        setProcessedCandidates([...updated]);
        successCount++;
      } catch (err) {
        console.error(`Failed to save ${c.name}:`, err);
      }
    }

    toast({
      title: "Bulk Save Complete",
      description: `Successfully added ${successCount} candidates.`,
    });

    if (processedCandidates.every(c => c.saved || c.error)) {
      // All done, can close or clear
      // setProcessedCandidates([]);
      // onOpenChange(false);
    }
  };

  const removeCandidate = (index: number) => {
    const updated = processedCandidates.filter((_, i) => i !== index);
    setProcessedCandidates(updated);
    if (selectedIndex === index) {
      setSelectedIndex(updated.length > 0 ? 0 : null);
    } else if (selectedIndex !== null && selectedIndex > index) {
      setSelectedIndex(selectedIndex - 1);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col p-0 gap-0">
        <div className="p-6 border-b border-border">
          <DialogHeader>
            <DialogTitle>Bulk Analyze & Add Candidates</DialogTitle>
            <DialogDescription>
              Select multiple resumes (PDF/DOCX) to automatically extract details and vet them for the selected job.
            </DialogDescription>
          </DialogHeader>
        </div>

        <div className="flex-1 overflow-hidden flex flex-col md:flex-row">
          {/* LEFT: Upload & List */}
          <div className="w-full md:w-80 border-r border-border bg-slate-50/50 flex flex-col overflow-hidden">
            <div className="p-4 space-y-4 border-b border-border bg-white">
              <div className="space-y-2">
                <Label htmlFor="job" className="text-[10px] uppercase font-bold text-slate-500">Target Job Position *</Label>
                <Select value={jobId} onValueChange={setJobId} required>
                  <SelectTrigger className="h-9">
                    <SelectValue placeholder="Select target job" />
                  </SelectTrigger>
                  <SelectContent>
                    {jobs.map((job) => (
                      <SelectItem key={job.id} value={job.id}>
                        {job.job_title}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div
                className="py-6 border-2 border-dashed rounded-lg border-primary/20 bg-primary/5 hover:bg-primary/10 transition-all cursor-pointer text-center group"
                onClick={() => fileInputRef.current?.click()}
              >
                {isAnalyzing ? (
                  <Loader2 className="h-6 w-6 animate-spin text-primary mx-auto mb-2" />
                ) : (
                  <Upload className="h-6 w-6 text-primary mx-auto mb-2 group-hover:scale-110 transition-transform" />
                )}
                <p className="text-xs font-bold text-primary">Upload Resumes</p>
                <input
                  type="file"
                  ref={fileInputRef}
                  className="hidden"
                  accept=".pdf,.docx,.txt"
                  multiple
                  onChange={handleFileUpload}
                  disabled={isAnalyzing}
                />
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-2 space-y-2">
              <p className="text-[10px] uppercase font-black text-slate-400 px-2 py-1">Analysed Results ({processedCandidates.length})</p>
              {processedCandidates.map((c, idx) => (
                <div
                  key={idx}
                  onClick={() => setSelectedIndex(idx)}
                  className={cn(
                    "p-3 rounded-xl border flex items-center justify-between cursor-pointer transition-all",
                    selectedIndex === idx ? "bg-white border-primary shadow-sm ring-1 ring-primary/20" : "bg-transparent border-transparent hover:bg-white/50",
                    c.saved && "opacity-60 bg-green-50/50"
                  )}
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 mb-0.5">
                      <p className="text-xs font-bold truncate text-slate-800">{c.name || "Processing..."}</p>
                      {c.saved && <CheckCircle2 className="h-3 w-3 text-green-600" />}
                    </div>
                    <div className="flex items-center gap-1.5 text-[9px] font-black uppercase tracking-widest text-slate-400">
                      <span className={cn(
                        c.status === 'Rejected' ? "text-red-500" : "text-green-500"
                      )}>{c.status || "IDLE"}</span>
                      <span>•</span>
                      <span>Score: {c.rating ? (c.rating).toFixed(1) : '-'}</span>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 text-slate-300 hover:text-red-500"
                    onClick={(e) => { e.stopPropagation(); removeCandidate(idx); }}
                  >
                    <Upload className="h-3 w-3 rotate-45" />
                  </Button>
                </div>
              ))}
            </div>
          </div>

          {/* RIGHT: Detailed Review / Edit */}
          <div className="flex-1 bg-white overflow-y-auto">
            {selectedIndex !== null ? (
              <div className="animate-in fade-in slide-in-from-right-4 duration-300">
                {/* View Mode Toggle */}
                <div className="sticky top-0 z-10 bg-white border-b border-slate-200 p-4 flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <div className="flex items-center space-x-2 bg-slate-100 rounded-lg p-1">
                      <Button
                        variant={viewMode === 'profile' ? 'default' : 'ghost'}
                        size="sm"
                        onClick={() => setViewMode('profile')}
                        className="text-xs font-semibold"
                      >
                        Profile View
                      </Button>
                      <Button
                        variant={viewMode === 'edit' ? 'default' : 'ghost'}
                        size="sm"
                        onClick={() => setViewMode('edit')}
                        className="text-xs font-semibold"
                      >
                        Edit Mode
                      </Button>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setShowMaskedInfo(!showMaskedInfo)}
                        className="flex items-center space-x-2 text-xs"
                      >
                        {showMaskedInfo ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
                        <span>{showMaskedInfo ? 'Show Original' : 'Show Masked'}</span>
                      </Button>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className={cn(
                      "text-2xl font-bold tabular-nums",
                      processedCandidates[selectedIndex].rating >= 8 ? "text-green-600" :
                        processedCandidates[selectedIndex].rating >= 6 ? "text-yellow-600" : "text-red-600"
                    )}>
                      {processedCandidates[selectedIndex].rating ? (processedCandidates[selectedIndex].rating).toFixed(1) : '0.0'}
                    </div>
                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-300">Match Rating</p>
                  </div>
                </div>

                {/* Content based on view mode */}
                {viewMode === 'profile' ? (
                  <div className="p-6">
                    <CandidateProfileCard 
                      candidate={{
                        name: processedCandidates[selectedIndex].name || "Unknown",
                        maskedName: processedCandidates[selectedIndex].maskedName,
                        email: processedCandidates[selectedIndex].email || "Not Disclosed",
                        phone: processedCandidates[selectedIndex].phone,
                        location: processedCandidates[selectedIndex].location || "Not Disclosed",
                        experience: processedCandidates[selectedIndex].yearsOfExperience || "Not Disclosed",
                        skills: Array.isArray(processedCandidates[selectedIndex].coreSkills) 
                          ? processedCandidates[selectedIndex].coreSkills 
                          : (processedCandidates[selectedIndex].coreSkills || "").split(',').map((s: string) => s.trim()).filter(Boolean),
                        rating: processedCandidates[selectedIndex].rating || 0,
                        matchScore: processedCandidates[selectedIndex].matchScore || 0,
                        status: processedCandidates[selectedIndex].status || 'Applied',
                        currentCtc: processedCandidates[selectedIndex].currentCtc,
                        expectedCtc: processedCandidates[selectedIndex].expectedCtc,
                        summary: processedCandidates[selectedIndex].summary,
                        rejectionReason: processedCandidates[selectedIndex].rejectionReason,
                        maskedResumeText: processedCandidates[selectedIndex].maskedResumeText,
                      }}
                      showMaskedInfo={showMaskedInfo}
                    />
                  </div>
                ) : (
                  <div className="p-8">
                    <div className="max-w-xl mx-auto space-y-8">
                      <div className="flex items-center justify-between">
                        <div>
                          <h3 className="text-2xl font-black text-slate-800 tracking-tight">Edit Candidate Details</h3>
                          <p className="text-xs text-slate-400 font-medium">Full analysis for {processedCandidates[selectedIndex].file_name}</p>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-6 pb-8 border-b border-slate-100">
                        <div className="space-y-1.5">
                          <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Candidate Name</Label>
                          <Input
                            value={processedCandidates[selectedIndex].name}
                            onChange={e => updateCandidateField(selectedIndex, 'name', e.target.value)}
                            className="h-9 border-slate-200 font-bold text-slate-700"
                          />
                        </div>
                        <div className="space-y-1.5">
                          <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Location</Label>
                          <Input
                            value={processedCandidates[selectedIndex].location}
                            onChange={e => updateCandidateField(selectedIndex, 'location', e.target.value)}
                            className="h-9 border-slate-200"
                          />
                        </div>
                        <div className="space-y-1.5">
                          <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Experience</Label>
                          <Input
                            value={processedCandidates[selectedIndex].yearsOfExperience}
                            onChange={e => updateCandidateField(selectedIndex, 'yearsOfExperience', e.target.value)}
                            className="h-9 border-slate-200"
                          />
                        </div>
                        <div className="space-y-1.5">
                          <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Email Address</Label>
                          <Input
                            value={processedCandidates[selectedIndex].email}
                            onChange={e => updateCandidateField(selectedIndex, 'email', e.target.value)}
                            className="h-9 border-slate-200"
                          />
                        </div>
                        <div className="space-y-1.5">
                          <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Current CTC</Label>
                          <Input
                            value={processedCandidates[selectedIndex].currentCtc}
                            onChange={e => updateCandidateField(selectedIndex, 'currentCtc', e.target.value)}
                            className="h-9 border-slate-200"
                          />
                        </div>
                        <div className="space-y-1.5">
                          <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Expected CTC</Label>
                          <Input
                            value={processedCandidates[selectedIndex].expectedCtc}
                            onChange={e => updateCandidateField(selectedIndex, 'expectedCtc', e.target.value)}
                            className="h-9 border-slate-200"
                          />
                        </div>
                      </div>

                      <div className="space-y-4">
                        <h4 className="text-sm font-black text-slate-800 uppercase tracking-wider">Technical Tech Stack</h4>
                        <div className="flex flex-wrap gap-2">
                          {processedCandidates[selectedIndex].coreSkills?.map((s: string) => (
                            <span key={s} className="px-3 py-1 bg-slate-100 text-slate-600 rounded-full text-[10px] font-black border border-slate-200">
                              {s}
                            </span>
                          ))}
                        </div>
                      </div>

                      {processedCandidates[selectedIndex].status === 'Rejected' && (
                        <div className="p-4 bg-red-50 border border-red-100 rounded-xl">
                          <p className="text-[10px] font-black text-red-800 uppercase mb-1">Strict Rejection Reason</p>
                          <p className="text-sm text-red-700 font-medium italic">"{processedCandidates[selectedIndex].rejectionReason}"</p>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-center space-y-4 opacity-40">
                <FileText className="h-16 w-16 text-slate-200" />
                <div>
                  <p className="text-lg font-black text-slate-400">No Resumes Selected</p>
                  <p className="text-xs font-medium text-slate-400">Upload multiple resumes to begin bulk vetting.</p>
                </div>
              </div>
            )}
          </div>
        </div>

        <DialogFooter className="p-6 border-t border-border bg-slate-50 flex items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="space-y-0.5 min-w-[120px]">
              <Label className="text-[9px] font-black uppercase text-slate-400">Status for all</Label>
              <Select value={status} onValueChange={(v) => setStatus(v as CandidateStatus)}>
                <SelectTrigger className="h-8 text-xs bg-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CANDIDATE_STATUSES.map((s) => (
                    <SelectItem key={s} value={s}>{s}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-0.5 min-w-[140px]">
              <Label className="text-[9px] font-black uppercase text-slate-400">Recruiter</Label>
              <Input
                placeholder="Recruiter name"
                className="h-8 text-xs bg-white"
                value={recruiter}
                onChange={e => setRecruiter(e.target.value)}
              />
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Button variant="outline" onClick={() => onOpenChange(false)}>Close</Button>
            <Button
              className="px-8 font-black uppercase tracking-widest text-[11px]"
              disabled={processedCandidates.filter(c => !c.saved && !c.error).length === 0}
              onClick={handleSaveAll}
            >
              {createCandidate.isPending ? <Loader2 className="animate-spin h-4 w-4 mr-2" /> : null}
              Add All to Pipeline ({processedCandidates.filter(c => !c.saved && !c.error).length})
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
