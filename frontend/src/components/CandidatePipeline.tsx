import { useState } from 'react';
import { MoreHorizontal, Mail, Phone, Search, ChevronDown, Star, Target } from 'lucide-react';
import { format } from 'date-fns';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import type { Candidate, CandidateStatus, Job } from '@/types/recruitment';
import { STATUS_COLORS, CANDIDATE_STATUSES } from '@/utils/constants';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { useDeleteCandidate, useUpdateCandidate } from '@/hooks/useCandidates';
import { FileDown } from 'lucide-react';
import * as XLSX from 'xlsx';

interface CandidatePipelineProps {
  candidates: Candidate[];
  jobs: Job[];
  onStatusChange: (candidateId: string, status: CandidateStatus) => void;
}

export function CandidatePipeline({ candidates, jobs, onStatusChange }: CandidatePipelineProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [jobFilter, setJobFilter] = useState<string>('all');
  const [expandedRow, setExpandedRow] = useState<string | null>(null);
  const [editingCell, setEditingCell] = useState<{ id: string; field: 'currentCtc' | 'expectedCtc' } | null>(null);
  const { toast } = useToast();
  const deleteCandidate = useDeleteCandidate();
  const updateCandidate = useUpdateCandidate();

  const exportToExcel = () => {
    const exportData = filteredCandidates.map(c => ({
      'Candidate Name': c.name,
      'Email': c.email,
      'Phone': c.phone,
      'Location': c.location,
      'Experience': c.experience,
      'Skills': c.skills.join(', '),
      'Current CTC': c.currentCtc,
      'Expected CTC': c.expectedCtc,
      'Status': c.currentStatus,
      'Rating': c.rating,
      'Score': c.matchScore
    }));

    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Candidates");
    XLSX.writeFile(wb, `Candidates_Pipeline_${format(new Date(), 'yyyy-MM-dd')}.xlsx`);

    toast({
      title: "Export Successful",
      description: "Candidate data has been exported to Excel."
    });
  };

  const handleInlineUpdate = async (id: string, field: string, value: string) => {
    try {
      // Map frontend field to backend field
      const backendField = field === 'currentCtc' ? 'current_ctc' :
        field === 'expectedCtc' ? 'expected_ctc' : field;

      await updateCandidate.mutateAsync({ id, updates: { [backendField]: value } });
      setEditingCell(null);
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to update candidate', variant: 'destructive' });
    }
  };

  const handleDownloadMaskedResume = (candidate: Candidate) => {
    if (!candidate.masked_resume_text) {
      toast({
        title: "No Masked Resume",
        description: "This candidate does not have a masked resume available.",
        variant: "destructive"
      });
      return;
    }

    const blob = new Blob([candidate.masked_resume_text], { type: 'text/plain' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `masked_resume_${candidate.masked_name || candidate.name || 'candidate'}.txt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);

    toast({
      title: "Download Started",
      description: "Masked resume is being downloaded."
    });
  };

  const calculateSkillsMatchScore = (candidate: Candidate, job: Job) => {
    if (!job.jobDescription || !candidate.skills || candidate.skills.length === 0) {
      return { score: 0, matchedSkills: [], missingSkills: [] };
    }

    // Extract skills from job description
    const jdSkills = new Set();
    const commonTechSkills = [
      'Python', 'Java', 'JavaScript', 'TypeScript', 'C#', 'C++', 'Go', 'Rust', 'PHP', 'Ruby', 'Swift', 'Kotlin',
      'React', 'Angular', 'Vue', 'Next.js', 'Express', 'Django', 'Flask', 'Spring', 'ASP.NET', 'Node.js', 'Laravel',
      'AWS', 'Azure', 'Google Cloud', 'GCP', 'Docker', 'Kubernetes', 'Jenkins', 'CI/CD', 'Terraform', 'Ansible',
      'MongoDB', 'PostgreSQL', 'MySQL', 'Redis', 'Oracle', 'SQLite', 'Elasticsearch', 'Firebase',
      'REST API', 'GraphQL', 'Microservices', 'SOAP', 'WebSocket', 'HTTP', 'OAuth', 'JWT',
      'Git', 'GitHub', 'GitLab', 'Jira', 'Confluence', 'Slack', 'Trello', 'Asana', 'Figma',
      'Machine Learning', 'Deep Learning', 'TensorFlow', 'PyTorch', 'Pandas', 'NumPy', 'Scikit-learn',
      'HTML', 'CSS', 'SASS', 'LESS', 'Tailwind', 'Bootstrap', 'jQuery', 'Webpack', 'Vite'
    ];

    // Add skills from JD
    const jdText = job.jobDescription.toLowerCase();
    commonTechSkills.forEach(skill => {
      if (jdText.includes(skill.toLowerCase())) {
        jdSkills.add(skill);
      }
    });

    // Check candidate skills against JD skills
    const candidateSkillsLower = candidate.skills.map(s => s.toLowerCase());
    const matchedSkills = candidate.skills.filter(skill => 
      jdSkills.has(skill) || Array.from(jdSkills).some(jdSkill => 
        (jdSkill as string).toLowerCase().includes(skill.toLowerCase()) || skill.toLowerCase().includes((jdSkill as string).toLowerCase())
      )
    );

    const missingSkills = Array.from(jdSkills).filter(jdSkill => 
      !candidateSkillsLower.some(candidateSkill => 
        candidateSkill.includes((jdSkill as string).toLowerCase()) || (jdSkill as string).toLowerCase().includes(candidateSkill)
      )
    );

    // Calculate match score
    const totalJdSkills = jdSkills.size;
    const matchCount = matchedSkills.length;
    const score = totalJdSkills > 0 ? Math.round((matchCount / totalJdSkills) * 100) : 0;

    return { score, matchedSkills, missingSkills };
  };

  const handleRateVsJD = (candidate: Candidate) => {
    const job = jobs.find(j => j.id === candidate.jobId);
    if (!job) {
      toast({
        title: "No Job Found",
        description: "This candidate is not associated with any job.",
        variant: "destructive"
      });
      return;
    }

    const { score, matchedSkills, missingSkills } = calculateSkillsMatchScore(candidate, job);
    
    // Update candidate rating based on skills match
    const newRating = Math.max(1, Math.min(10, (score / 10) + 5)); // Convert to 1-10 scale
    
    // Update the candidate with new rating
    updateCandidate.mutateAsync({
      id: candidate.id,
      updates: { 
        rating: newRating,
        match_score: score
      }
    }).then(() => {
      toast({
        title: "Skills Rating Updated",
        description: `Match Score: ${score}% | Matched: ${matchedSkills.length} skills | Missing: ${missingSkills.length} skills`,
        duration: 5000
      });
    }).catch(() => {
      toast({
        title: "Update Failed",
        description: "Failed to update candidate rating.",
        variant: "destructive"
      });
    });
  };

  const filteredCandidates = candidates.filter((candidate) => {
    const matchesSearch =
      candidate.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      candidate.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      candidate.candidateId.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'all' || candidate.currentStatus === statusFilter;
    const matchesJob = jobFilter === 'all' || candidate.jobId === jobFilter;
    return matchesSearch && matchesStatus && matchesJob;
  });

  const getJobTitle = (jobId: string) => {
    const job = jobs.find((j) => j.id === jobId);
    return job?.jobTitle || 'Unknown';
  };

  return (
    <Card className="border-border">
      <CardHeader className="pb-4">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <CardTitle className="text-lg font-semibold text-foreground">Candidate Pipeline</CardTitle>
          <div className="flex flex-col gap-2 sm:flex-row">
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                className="h-8 gap-2 border-slate-200 text-slate-600 font-bold text-[10px] uppercase tracking-widest hover:bg-slate-50"
                onClick={exportToExcel}
              >
                <FileDown className="h-3 w-3" />
                Export Excel
              </Button>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Search candidates..."
                  className="h-8 w-[200px] border-slate-200 text-xs pl-9"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
            </div>
            <Select value={jobFilter} onValueChange={setJobFilter}>
              <SelectTrigger className="w-full sm:w-[160px]">
                <SelectValue placeholder="All Jobs" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Jobs</SelectItem>
                {jobs.map((job) => (
                  <SelectItem key={job.id} value={job.id}>
                    {job.jobTitle}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full sm:w-[160px]">
                <SelectValue placeholder="All Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                {CANDIDATE_STATUSES.map((status) => (
                  <SelectItem key={status} value={status}>
                    {status}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="border-border hover:bg-transparent">
                <TableHead className="w-8"></TableHead>
                <TableHead className="text-[10px] uppercase font-black tracking-widest text-slate-400 min-w-[200px]">Candidate & Location</TableHead>
                <TableHead className="text-[10px] uppercase font-black tracking-widest text-slate-400 text-center">Vetting Info</TableHead>
                <TableHead className="text-[10px] uppercase font-black tracking-widest text-slate-400">Tech Stack</TableHead>
                <TableHead className="text-[10px] uppercase font-black tracking-widest text-slate-400">Contact & CTC</TableHead>
                <TableHead className="text-[10px] uppercase font-black tracking-widest text-slate-400 text-center">AI Assessment</TableHead>
                <TableHead className="w-8"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredCandidates.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="h-24 text-center text-muted-foreground">
                    No candidates found
                  </TableCell>
                </TableRow>
              ) : (
                filteredCandidates.map((candidate) => (
                  <Collapsible key={candidate.id} asChild>
                    <>
                      <TableRow className="border-border">
                        <TableCell>
                          <CollapsibleTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-6 w-6"
                              onClick={() =>
                                setExpandedRow(
                                  expandedRow === candidate.id ? null : candidate.id
                                )
                              }
                            >
                              <ChevronDown
                                className={cn(
                                  'h-4 w-4 transition-transform',
                                  expandedRow === candidate.id && 'rotate-180'
                                )}
                              />
                            </Button>
                          </CollapsibleTrigger>
                        </TableCell>
                        <TableCell className="min-w-[200px]">
                          <div className="font-bold text-slate-800 leading-tight mb-0.5" title={candidate.name}>{candidate.name}</div>
                          <div className="flex items-center gap-2 text-[10px] text-slate-400 font-medium">
                            <span className="font-mono">{candidate.candidateId}</span>
                            <span className="w-1 h-1 rounded-full bg-slate-300" />
                            <span>{candidate.location || 'Not Specified'}</span>
                          </div>
                        </TableCell>
                        <TableCell className="text-center">
                          <div className="text-xs font-bold text-slate-800 mb-1">{candidate.experience || '0Y'}</div>
                          <Badge
                            className={cn(
                              'px-2 py-0.5 rounded-full font-black text-[8px] border-2 shadow-sm uppercase tracking-tighter',
                              candidate.vettingStatus === 'Shortlisted' ? "bg-green-50 border-green-200 text-green-700" :
                                candidate.vettingStatus === 'Borderline' ? "bg-yellow-50 border-yellow-200 text-yellow-700" :
                                  candidate.vettingStatus === 'Overqualified' ? "bg-blue-50 border-blue-200 text-blue-700" :
                                    "bg-red-50 border-red-200 text-red-700"
                            )}
                          >
                            {candidate.vettingStatus || 'PENDING'}
                          </Badge>
                        </TableCell>
                        <TableCell className="min-w-[180px]">
                          <div className="flex flex-wrap gap-1.5 py-1">
                            {candidate.skills.slice(0, 5).map(s => (
                              <div key={s} className="w-8 h-8 rounded-full bg-slate-800 text-white text-[8px] flex items-center justify-center font-black text-center p-1 leading-none border border-slate-700 shadow-sm transition-transform hover:scale-110 cursor-default" title={s}>
                                {s.length > 3 ? s.substring(0, 3) : s}
                              </div>
                            ))}
                            {candidate.skills.length > 5 && (
                              <div className="w-8 h-8 rounded-full bg-slate-100 text-slate-500 text-[10px] flex items-center justify-center font-bold border border-slate-200">
                                +{candidate.skills.length - 5}
                              </div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="min-w-[180px]">
                          <div className="flex flex-col gap-1">
                            <div className="text-[11px] font-bold text-slate-700 truncate" title={candidate.email}>{candidate.email}</div>
                            <div className="flex items-center gap-2 text-[10px] whitespace-nowrap">
                              <span className="text-slate-400">{candidate.phone}</span>
                              <span className="w-1 h-1 rounded-full bg-slate-300" />
                              <div className="flex items-center gap-1 group">
                                <span className="text-slate-400 whitespace-nowrap flex items-center gap-0.5">
                                  C:
                                  {editingCell?.id === candidate.id && editingCell?.field === 'currentCtc' ? (
                                    <input
                                      className="w-16 h-4 bg-white border border-primary rounded px-1 outline-none text-slate-800 font-bold"
                                      autoFocus
                                      defaultValue={candidate.currentCtc || ''}
                                      onBlur={(e) => handleInlineUpdate(candidate.id, 'currentCtc', e.target.value)}
                                      onKeyDown={(e) => e.key === 'Enter' && handleInlineUpdate(candidate.id, 'currentCtc', (e.target as HTMLInputElement).value)}
                                    />
                                  ) : (
                                    <span
                                      className="text-slate-700 font-bold cursor-pointer hover:underline decoration-dotted"
                                      onClick={() => setEditingCell({ id: candidate.id, field: 'currentCtc' })}
                                    >
                                      {candidate.currentCtc || '-'}
                                    </span>
                                  )}
                                </span>
                                <span className="text-primary/70 whitespace-nowrap flex items-center gap-0.5">
                                  E:
                                  {editingCell?.id === candidate.id && editingCell?.field === 'expectedCtc' ? (
                                    <input
                                      className="w-16 h-4 bg-white border border-primary rounded px-1 outline-none text-primary font-black"
                                      autoFocus
                                      defaultValue={candidate.expectedCtc || ''}
                                      onBlur={(e) => handleInlineUpdate(candidate.id, 'expectedCtc', e.target.value)}
                                      onKeyDown={(e) => e.key === 'Enter' && handleInlineUpdate(candidate.id, 'expectedCtc', (e.target as HTMLInputElement).value)}
                                    />
                                  ) : (
                                    <span
                                      className="text-primary font-black cursor-pointer hover:underline decoration-dotted"
                                      onClick={() => setEditingCell({ id: candidate.id, field: 'expectedCtc' })}
                                    >
                                      {candidate.expectedCtc || '-'}
                                    </span>
                                  )}
                                </span>
                              </div>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="text-center min-w-[120px]">
                          <div className="space-y-1">
                            <div className={cn(
                              "font-black text-lg tabular-nums leading-none",
                              (candidate.rating || 0) >= 8 ? "text-green-600" : (candidate.rating || 0) >= 6 ? "text-yellow-600" : "text-red-600"
                            )}>
                              {(candidate.rating || 0).toFixed(1)}<span className="text-[10px] font-bold opacity-40 ml-0.5">/10</span>
                            </div>
                            <div className="text-[8px] font-black uppercase tracking-widest text-slate-400">Rating</div>
                            <div className={cn(
                              "font-bold text-sm tabular-nums leading-none",
                              (candidate.matchScore || 0) >= 80 ? "text-green-600" : (candidate.matchScore || 0) >= 50 ? "text-yellow-600" : "text-red-600"
                            )}>
                              {(candidate.matchScore || 0)}%<span className="text-[8px] font-bold opacity-40 ml-0.5">match</span>
                            </div>
                            <div className="text-[8px] font-black uppercase tracking-widest text-slate-400">Skills Match</div>
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-slate-100 rounded-full">
                                <MoreHorizontal className="h-4 w-4 text-slate-400" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-[200px] rounded-xl shadow-xl border-slate-200 max-h-[400px] overflow-y-auto">
                              <DropdownMenuItem className="py-2.5 font-medium" onClick={() => toast({ title: "Edit Mode", description: "Inline editing is active. Simple click on CTC to edit." })}>
                                Edit Candidate Details
                              </DropdownMenuItem>
                              <DropdownMenuItem className="py-2.5 font-medium text-red-600 focus:text-red-700 focus:bg-red-50" onClick={() => deleteCandidate.mutate(candidate.id)}>
                                Delete Candidate
                              </DropdownMenuItem>
                              <DropdownMenuItem className="py-2.5 font-medium" onClick={() => handleDownloadMaskedResume(candidate)}>
                                <FileDown className="mr-2 h-4 w-4" />
                                Download Masked Resume
                              </DropdownMenuItem>
                              <DropdownMenuItem className="py-2.5 font-medium text-blue-600 focus:text-blue-700 focus:bg-blue-50" onClick={() => handleRateVsJD(candidate)}>
                                <Target className="mr-2 h-4 w-4" />
                                Rate vs JD
                              </DropdownMenuItem>
                              <div className="h-px bg-slate-100 my-1" />
                              {CANDIDATE_STATUSES.filter((s) => s !== candidate.currentStatus).map(
                                (status) => (
                                  <DropdownMenuItem
                                    key={status}
                                    className="py-2.5 text-xs font-semibold uppercase tracking-wider text-slate-500"
                                    onClick={() => onStatusChange(candidate.id, status)}
                                  >
                                    Move to {status}
                                  </DropdownMenuItem>
                                )
                              )}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                      <CollapsibleContent asChild>
                        {expandedRow === candidate.id && (
                          <TableRow className="border-border bg-slate-50/50">
                            <TableCell colSpan={7} className="p-6">
                              <div className="grid gap-4 md:grid-cols-3">
                                <div>
                                  <p className="text-xs font-medium text-muted-foreground mb-1">
                                    Contact Details
                                  </p>
                                  <div className="space-y-1 text-sm">
                                    <p className="flex items-center gap-2">
                                      <Mail className="h-3 w-3" /> {candidate.email}
                                    </p>
                                    <p className="flex items-center gap-2">
                                      <Phone className="h-3 w-3" /> {candidate.phone}
                                    </p>
                                    <p className="text-xs text-muted-foreground mt-2">
                                      Location: {candidate.location || 'N/A'}
                                    </p>
                                  </div>
                                </div>
                                <div>
                                  <p className="text-xs font-medium text-muted-foreground mb-1">
                                    Skills & Tech Stack
                                  </p>
                                  <div className="flex flex-wrap gap-1">
                                    {candidate.skills.map((skill) => (
                                      <Badge key={skill} variant="secondary" className="text-xs">
                                        {skill}
                                      </Badge>
                                    ))}
                                  </div>
                                </div>
                                <div>
                                  <p className="text-xs font-medium text-muted-foreground mb-1">
                                    Vetting Summary
                                  </p>
                                  <div className="space-y-1 text-sm text-muted-foreground">
                                    <p className="font-bold text-foreground">Rating: {candidate.rating?.toFixed(1)}/10</p>
                                    <p>Exp: {candidate.experience}</p>
                                    <p>Recruiter: {candidate.recruiter || 'N/A'}</p>
                                  </div>
                                </div>
                              </div>
                            </TableCell>
                          </TableRow>
                        )}
                      </CollapsibleContent>
                    </>
                  </Collapsible>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        {/* REJECTION LIST SECTION */}
        {filteredCandidates.some(c => c.vettingStatus === 'Rejected') && (
          <div className="mt-8 border-t pt-6 px-6 pb-6 bg-red-50/30">
            <h3 className="text-sm font-bold text-red-800 uppercase tracking-wider mb-4">Rejection List (Strict Vetting)</h3>
            <div className="space-y-3">
              {filteredCandidates.filter(c => c.vettingStatus === 'Rejected').map(candidate => (
                <div key={candidate.id} className="flex items-start justify-between p-3 bg-white border border-red-100 rounded-lg shadow-sm">
                  <div>
                    <div className="font-bold text-red-900">{candidate.name}</div>
                    <div className="text-xs text-red-600 mt-1">Reason: Primary tech stack mismatch or insufficient core experience according to JD rules.</div>
                  </div>
                  <Badge variant="outline" className="border-red-200 text-red-600 bg-red-50 text-[10px]">REJECTED</Badge>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
