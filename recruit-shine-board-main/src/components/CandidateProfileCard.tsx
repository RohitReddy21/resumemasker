import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Progress } from '@/components/ui/progress';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Mail, Phone, MapPin, Briefcase, GraduationCap, Award, TrendingUp, Users, Calendar } from 'lucide-react';
import { cn } from '@/lib/utils';

interface CandidateProfileProps {
  candidate: {
    name: string;
    maskedName?: string;
    email: string;
    phone?: string;
    location: string;
    experience: string;
    skills: string[];
    rating: number;
    matchScore: number;
    status: string;
    currentCtc?: string;
    expectedCtc?: string;
    education?: string;
    lastCompany?: string;
    availability?: string;
    summary?: string;
    rejectionReason?: string;
    maskedResumeText?: string;
  };
  showMaskedInfo?: boolean;
}

export const CandidateProfileCard = ({ candidate, showMaskedInfo = false }: CandidateProfileProps) => {
  const displayName = showMaskedInfo && candidate.maskedName ? candidate.maskedName : candidate.name;
  const displayEmail = showMaskedInfo ? "[EMAIL REMOVED]" : candidate.email;
  const displayPhone = showMaskedInfo ? "[PHONE REMOVED]" : (candidate.phone || "Not Disclosed");

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'shortlisted':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'rejected':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'borderline':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      default:
        return 'bg-blue-100 text-blue-800 border-blue-200';
    }
  };

  const getRatingColor = (rating: number) => {
    if (rating >= 8) return 'text-green-600';
    if (rating >= 6) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getSkillLevel = (skill: string) => {
    // This could be enhanced with actual skill level detection
    const levels = ['Beginner', 'Intermediate', 'Advanced', 'Expert'];
    return levels[Math.floor(Math.random() * levels.length)];
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header Card */}
      <Card className="border-0 shadow-lg bg-gradient-to-br from-slate-50 to-white">
        <CardHeader className="pb-4">
          <div className="flex items-start justify-between">
            <div className="flex items-center space-x-4">
              <Avatar className="h-16 w-16 border-2 border-white shadow-md">
                <AvatarImage src="" />
                <AvatarFallback className="bg-gradient-to-br from-blue-500 to-purple-600 text-white text-xl font-bold">
                  {displayName.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)}
                </AvatarFallback>
              </Avatar>
              <div>
                <CardTitle className="text-2xl font-bold text-slate-800">{displayName}</CardTitle>
                <div className="flex items-center space-x-2 mt-1">
                  <MapPin className="h-4 w-4 text-slate-400" />
                  <span className="text-sm text-slate-600">{candidate.location}</span>
                </div>
              </div>
            </div>
            <div className="text-right space-y-2">
              <Badge className={cn("px-3 py-1 font-semibold", getStatusColor(candidate.status))}>
                {candidate.status}
              </Badge>
              <div className="text-center">
                <div className={cn("text-3xl font-bold tabular-nums", getRatingColor(candidate.rating))}>
                  {candidate.rating?.toFixed(1) || '0.0'}
                </div>
                <p className="text-xs text-slate-500 font-medium">Match Rating</p>
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Contact Information */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="flex items-center space-x-3 p-3 bg-slate-50 rounded-lg">
              <Mail className="h-5 w-5 text-blue-500" />
              <div>
                <p className="text-xs text-slate-500 font-medium">Email</p>
                <p className="text-sm font-semibold text-slate-700 truncate">{displayEmail}</p>
              </div>
            </div>
            <div className="flex items-center space-x-3 p-3 bg-slate-50 rounded-lg">
              <Phone className="h-5 w-5 text-green-500" />
              <div>
                <p className="text-xs text-slate-500 font-medium">Phone</p>
                <p className="text-sm font-semibold text-slate-700">{displayPhone}</p>
              </div>
            </div>
            <div className="flex items-center space-x-3 p-3 bg-slate-50 rounded-lg">
              <Briefcase className="h-5 w-5 text-purple-500" />
              <div>
                <p className="text-xs text-slate-500 font-medium">Experience</p>
                <p className="text-sm font-semibold text-slate-700">{candidate.experience || 'Not Disclosed'}</p>
              </div>
            </div>
          </div>

          {/* Match Score Progress */}
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-sm font-semibold text-slate-700">Match Score</span>
              <span className="text-sm font-bold text-slate-800">{candidate.matchScore || 0}%</span>
            </div>
            <Progress value={candidate.matchScore || 0} className="h-2" />
          </div>
        </CardContent>
      </Card>

      {/* Professional Details */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Technical Skills */}
        <Card className="shadow-md">
          <CardHeader>
            <CardTitle className="text-lg font-semibold text-slate-800 flex items-center">
              <Award className="h-5 w-5 mr-2 text-blue-500" />
              Technical Skills
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {candidate.skills?.length > 0 ? (
                candidate.skills.map((skill, index) => (
                  <Badge 
                    key={index} 
                    variant="secondary" 
                    className="px-3 py-1 bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100 transition-colors"
                  >
                    {skill}
                  </Badge>
                ))
              ) : (
                <p className="text-sm text-slate-500 italic">No skills identified</p>
              )}
            </div>
            {candidate.skills?.length > 0 && (
              <div className="mt-4 space-y-2">
                <p className="text-xs font-semibold text-slate-600 uppercase tracking-wider">Skill Distribution</p>
                <div className="space-y-1">
                  {candidate.skills.slice(0, 5).map((skill, index) => (
                    <div key={index} className="flex items-center justify-between">
                      <span className="text-xs text-slate-600">{skill}</span>
                      <div className="flex items-center space-x-2">
                        <Progress value={Math.random() * 40 + 60} className="w-20 h-1" />
                        <span className="text-xs text-slate-500">{getSkillLevel(skill)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Professional Information */}
        <Card className="shadow-md">
          <CardHeader>
            <CardTitle className="text-lg font-semibold text-slate-800 flex items-center">
              <Briefcase className="h-5 w-5 mr-2 text-green-500" />
              Professional Details
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs font-semibold text-slate-600 uppercase tracking-wider">Current CTC</p>
                <p className="text-sm font-bold text-slate-800">{candidate.currentCtc || 'Not Disclosed'}</p>
              </div>
              <div>
                <p className="text-xs font-semibold text-slate-600 uppercase tracking-wider">Expected CTC</p>
                <p className="text-sm font-bold text-slate-800">{candidate.expectedCtc || 'Not Disclosed'}</p>
              </div>
            </div>
            <Separator />
            <div>
              <p className="text-xs font-semibold text-slate-600 uppercase tracking-wider">Availability</p>
              <p className="text-sm font-semibold text-slate-800">{candidate.availability || 'Immediate'}</p>
            </div>
            {candidate.lastCompany && (
              <div>
                <p className="text-xs font-semibold text-slate-600 uppercase tracking-wider">Last Company</p>
                <p className="text-sm font-semibold text-slate-800">{candidate.lastCompany}</p>
              </div>
            )}
            {candidate.education && (
              <div>
                <p className="text-xs font-semibold text-slate-600 uppercase tracking-wider">Education</p>
                <p className="text-sm font-semibold text-slate-800">{candidate.education}</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Summary Section */}
      {candidate.summary && (
        <Card className="shadow-md">
          <CardHeader>
            <CardTitle className="text-lg font-semibold text-slate-800 flex items-center">
              <Users className="h-5 w-5 mr-2 text-purple-500" />
              Professional Summary
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-slate-700 leading-relaxed">{candidate.summary}</p>
          </CardContent>
        </Card>
      )}

      {/* Rejection Reason */}
      {candidate.status === 'Rejected' && candidate.rejectionReason && (
        <Card className="border-red-200 bg-red-50 shadow-md">
          <CardHeader>
            <CardTitle className="text-lg font-semibold text-red-800 flex items-center">
              <TrendingUp className="h-5 w-5 mr-2" />
              Rejection Analysis
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-red-700 italic">"{candidate.rejectionReason}"</p>
          </CardContent>
        </Card>
      )}

      {/* Masked Resume Preview */}
      {showMaskedInfo && candidate.maskedResumeText && (
        <Card className="shadow-md">
          <CardHeader>
            <CardTitle className="text-lg font-semibold text-slate-800 flex items-center">
              <Calendar className="h-5 w-5 mr-2 text-orange-500" />
              Masked Resume Preview
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="bg-slate-50 p-4 rounded-lg max-h-96 overflow-y-auto">
              <pre className="text-xs text-slate-600 whitespace-pre-wrap font-mono">
                {candidate.maskedResumeText}
              </pre>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
