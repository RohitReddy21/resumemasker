import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Progress } from '@/components/ui/progress';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { 
  Mail, Phone, MapPin, Briefcase, GraduationCap, Award, TrendingUp, 
  Users, Calendar, ArrowLeft, Eye, EyeOff, Download, Edit, Share2, Loader2
} from 'lucide-react';
import { useCandidate } from '@/hooks/useCandidates';
import { CandidateProfileCard } from './CandidateProfileCard';
import { cn } from '@/lib/utils';

export const CandidateDetailPage = () => {
  const { candidateId } = useParams<{ candidateId: string }>();
  const navigate = useNavigate();
  const { data: candidate, isLoading, error } = useCandidate(candidateId || '');
  const [showMaskedInfo, setShowMaskedInfo] = useState(false);
  const [viewMode, setViewMode] = useState<'profile' | 'raw'>('profile');
  const [isDownloading, setIsDownloading] = useState(false);

  const handleDownloadMaskedResume = async () => {
    if (!candidateId) return;
    
    try {
      setIsDownloading(true);
      const response = await fetch(`/api/candidates/${candidateId}/download-masked-resume`);
      
      if (!response.ok) {
        throw new Error('Failed to download resume');
      }
      
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `Candidate_${(candidate as any)?.candidate_id || 'Unknown'}_Resume.pdf`;
      document.body.appendChild(link);
      link.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(link);
    } catch (error) {
      console.error('Error downloading resume:', error);
      alert('Failed to download resume. Please try again.');
    } finally {
      setIsDownloading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-2 text-sm text-slate-600">Loading candidate details...</p>
        </div>
      </div>
    );
  }

  if (error || !candidate) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <Card className="w-96">
          <CardContent className="p-6 text-center">
            <p className="text-red-600 mb-4">Failed to load candidate details</p>
            <Button onClick={() => navigate('/candidates')}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Candidates
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const candidateData = {
    name: candidate.name || "Unknown",
    maskedName: candidate.masked_name,
    email: candidate.email || "Not Disclosed",
    phone: candidate.phone,
    location: candidate.location || "Not Disclosed",
    experience: candidate.experience || "Not Disclosed",
    skills: Array.isArray(candidate.skills) ? candidate.skills : [],
    rating: candidate.rating || 0,
    matchScore: candidate.match_score || 0,
    status: candidate.current_status || 'Applied',
    currentCtc: candidate.current_ctc,
    expectedCtc: candidate.expected_ctc,
    maskedResumeText: candidate.masked_resume_text,
    availability: candidate.availability,
    lastCompany: candidate.last_company,
  };

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <div className="bg-white border-b border-slate-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-4">
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => navigate('/candidates')}
                className="flex items-center space-x-2"
              >
                <ArrowLeft className="h-4 w-4" />
                <span>Back</span>
              </Button>
              <div className="h-6 w-px bg-slate-300"></div>
              <div>
                <h1 className="text-lg font-semibold text-slate-900">
                  {showMaskedInfo && candidateData.maskedName ? candidateData.maskedName : candidateData.name}
                </h1>
                <p className="text-sm text-slate-500">Candidate Profile</p>
              </div>
            </div>
            
            <div className="flex items-center space-x-3">
              {/* View Mode Toggle */}
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
                  variant={viewMode === 'raw' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setViewMode('raw')}
                  className="text-xs font-semibold"
                >
                  Raw Data
                </Button>
              </div>
              
              {/* Mask Toggle */}
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowMaskedInfo(!showMaskedInfo)}
                className="flex items-center space-x-2"
              >
                {showMaskedInfo ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                <span>{showMaskedInfo ? 'Show Original' : 'Show Masked'}</span>
              </Button>
              
              {/* Action Buttons */}
              <Button variant="outline" size="sm">
                <Edit className="h-4 w-4 mr-2" />
                Edit
              </Button>
              <Button variant="outline" size="sm">
                <Share2 className="h-4 w-4 mr-2" />
                Share
              </Button>
              <Button 
                variant="outline" 
                size="sm"
                onClick={handleDownloadMaskedResume}
                disabled={isDownloading}
              >
                {isDownloading ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Download className="h-4 w-4 mr-2" />
                )}
                {isDownloading ? 'Downloading...' : 'Download PDF'}
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {viewMode === 'profile' ? (
          <CandidateProfileCard 
            candidate={candidateData}
            showMaskedInfo={showMaskedInfo}
          />
        ) : (
          <Card className="shadow-lg">
            <CardHeader>
              <CardTitle className="text-xl font-semibold text-slate-800">
                Raw Candidate Data
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="bg-slate-50 p-6 rounded-lg">
                <pre className="text-sm text-slate-700 whitespace-pre-wrap font-mono overflow-x-auto">
                  {JSON.stringify(candidate, null, 2)}
                </pre>
              </div>
            </CardContent>
          </Card>
        )}
        
        {/* Additional Information Section */}
        <div className="mt-8 grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Activity Timeline */}
          <Card className="shadow-md">
            <CardHeader>
              <CardTitle className="text-lg font-semibold text-slate-800 flex items-center">
                <Calendar className="h-5 w-5 mr-2 text-blue-500" />
                Activity Timeline
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {candidate.status_history?.map((entry: any, index: number) => (
                  <div key={index} className="flex items-start space-x-3">
                    <div className="w-2 h-2 bg-blue-500 rounded-full mt-2"></div>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-slate-800">{entry.status}</p>
                      <p className="text-xs text-slate-500">
                        {new Date(entry.changedAt).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                )) || (
                  <p className="text-sm text-slate-500 italic">No activity recorded</p>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Quick Stats */}
          <Card className="shadow-md">
            <CardHeader>
              <CardTitle className="text-lg font-semibold text-slate-800 flex items-center">
                <TrendingUp className="h-5 w-5 mr-2 text-green-500" />
                Quick Stats
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-sm text-slate-600">Match Score</span>
                <span className="text-sm font-bold text-slate-800">{candidateData.matchScore}%</span>
              </div>
              <Progress value={candidateData.matchScore} className="h-2" />
              
              <div className="flex justify-between items-center">
                <span className="text-sm text-slate-600">Skills Count</span>
                <span className="text-sm font-bold text-slate-800">{candidateData.skills.length}</span>
              </div>
              
              <div className="flex justify-between items-center">
                <span className="text-sm text-slate-600">Rating</span>
                <span className={cn(
                  "text-sm font-bold",
                  candidateData.rating >= 8 ? "text-green-600" :
                  candidateData.rating >= 6 ? "text-yellow-600" : "text-red-600"
                )}>
                  {candidateData.rating.toFixed(1)}
                </span>
              </div>
            </CardContent>
          </Card>

          {/* Contact Actions */}
          <Card className="shadow-md">
            <CardHeader>
              <CardTitle className="text-lg font-semibold text-slate-800 flex items-center">
                <Users className="h-5 w-5 mr-2 text-purple-500" />
                Quick Actions
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Button className="w-full" size="sm">
                <Mail className="h-4 w-4 mr-2" />
                Send Email
              </Button>
              <Button variant="outline" className="w-full" size="sm">
                <Phone className="h-4 w-4 mr-2" />
                Schedule Call
              </Button>
              <Button variant="outline" className="w-full" size="sm">
                <Calendar className="h-4 w-4 mr-2" />
                Schedule Interview
              </Button>
              <Button variant="outline" className="w-full" size="sm">
                <Download className="h-4 w-4 mr-2" />
                Download Resume
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};
