import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { 
  User, 
  Mail, 
  Phone, 
  MapPin, 
  Briefcase, 
  GraduationCap,
  Award,
  Download,
  Eye,
  EyeOff,
  FileText,
  Shield
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface MaskedResumeProps {
  candidate: {
    name: string;
    maskedName?: string;
    email: string;
    phone: string;
    location: string;
    experience: string;
    skills: string[];
    rating: number;
    matchScore: number;
    summary?: string;
    maskedResumeText?: string;
  };
  showMasked: boolean;
  onToggleMask: () => void;
  onDownload: () => void;
}

export function MaskedResume({ candidate, showMasked, onToggleMask, onDownload }: MaskedResumeProps) {
  const displayInfo = showMasked ? {
    name: candidate.maskedName || candidate.name,
    email: '[EMAIL PROTECTED]',
    phone: '[PHONE PROTECTED]',
    location: candidate.location,
  } : {
    name: candidate.name,
    email: candidate.email,
    phone: candidate.phone,
    location: candidate.location,
  };

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="bg-white rounded-2xl shadow-lg border border-slate-200">
        <div className="p-8">
          {/* Header with controls */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <Shield className="h-6 w-6 text-slate-400" />
                <div>
                  <h1 className="text-2xl font-bold text-slate-900">
                    {displayInfo.name}
                  </h1>
                  <p className="text-sm text-slate-600 mt-1">
                    {candidate.experience} • {candidate.location}
                  </p>
                </div>
              </div>
            </div>
            
            <div className="flex items-center space-x-4">
              <Button
                variant="outline"
                size="sm"
                onClick={onToggleMask}
                className="flex items-center space-x-2"
              >
                {showMasked ? (
                  <>
                    <Eye className="h-4 w-4" />
                    Show Original
                  </>
                ) : (
                  <>
                    <EyeOff className="h-4 w-4" />
                    Show Masked
                  </>
                )}
              </Button>
              
              <Button
                variant="default"
                size="sm"
                onClick={onDownload}
                className="flex items-center space-x-2"
              >
                <Download className="h-4 w-4" />
                Download Resume
              </Button>
            </div>
          </div>

          <Separator className="my-6" />

          {/* Professional Summary */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-slate-800 flex items-center">
                <Briefcase className="h-5 w-5 mr-2" />
                Professional Summary
              </h3>
              <div className="bg-slate-50 rounded-lg p-4">
                <p className="text-slate-700 leading-relaxed">
                  {candidate.summary || `${displayInfo.name} is a skilled professional with ${candidate.experience} of experience in ${candidate.location || 'your location'}.`}
                </p>
              </div>
            </div>

            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-slate-800 flex items-center">
                <GraduationCap className="h-5 w-5 mr-2" />
                Experience
              </h3>
              <div className="bg-slate-50 rounded-lg p-4">
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-sm font-medium text-slate-600">Years of Experience</span>
                    <span className="text-lg font-bold text-slate-900">{candidate.experience}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm font-medium text-slate-600">Location</span>
                    <span className="text-lg font-bold text-slate-900">{candidate.location || 'Not Specified'}</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-slate-800 flex items-center">
                <Award className="h-5 w-5 mr-2" />
                Assessment
              </h3>
              <div className="bg-slate-50 rounded-lg p-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-slate-600 mb-2">AI Rating</p>
                    <div className="flex items-center space-x-2">
                      <div className="text-3xl font-bold text-slate-900">
                        {candidate.rating?.toFixed(1) || 'N/A'}
                      </div>
                      <span className="text-sm text-slate-500">/10</span>
                    </div>
                  </div>
                  <div>
                    <p className="text-sm text-slate-600 mb-2">Skills Match</p>
                    <div className="flex items-center space-x-2">
                      <div className="text-3xl font-bold text-slate-900">
                        {candidate.matchScore || 0}%
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <Separator className="my-6" />

          {/* Contact Information */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-slate-800 flex items-center">
                <Mail className="h-5 w-5 mr-2" />
                Contact Information
              </h3>
              <div className="bg-slate-50 rounded-lg p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-slate-600">Email Address</span>
                  <span className="text-slate-900 font-mono">{displayInfo.email}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-slate-600">Phone Number</span>
                  <span className="text-slate-900 font-mono">{displayInfo.phone}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-slate-600">Location</span>
                  <span className="text-slate-900">{displayInfo.location}</span>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-slate-800 flex items-center">
                <MapPin className="h-5 w-5 mr-2" />
                Location Details
              </h3>
              <div className="bg-slate-50 rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-slate-600">Current Location</span>
                  <span className="text-slate-900">{candidate.location || 'Not Specified'}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-slate-600">Availability</span>
                  <span className="text-slate-900">Immediate</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-slate-600">Relocation</span>
                  <span className="text-slate-900">Open to opportunities</span>
                </div>
              </div>
            </div>
          </div>

          <Separator className="my-6" />

          {/* Technical Skills */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-slate-800 flex items-center">
              <Award className="h-5 w-5 mr-2" />
              Technical Skills
            </h3>
            <div className="bg-slate-50 rounded-lg p-4">
              <div className="flex flex-wrap gap-2">
                {candidate.skills.map((skill, index) => (
                  <Badge 
                    key={index}
                    variant="secondary" 
                    className="px-3 py-2 text-sm font-medium bg-slate-100 text-slate-800 border-slate-200"
                  >
                    {skill}
                  </Badge>
                ))}
              </div>
            </div>
          </div>

          {/* Resume Text */}
          {candidate.maskedResumeText && (
            <>
              <Separator className="my-6" />
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-slate-800 flex items-center">
                  <FileText className="h-5 w-5 mr-2" />
                  Resume Text
                </h3>
                <div className="bg-slate-50 rounded-lg p-4">
                  <div className="max-h-96 overflow-y-auto">
                    <pre className="text-xs text-slate-700 whitespace-pre-wrap font-mono bg-white p-4 rounded border border-slate-200">
                      {showMasked ? candidate.maskedResumeText : 'Original resume text is hidden in masked view'}
                    </pre>
                  </div>
                </div>
              </div>
            </>
          )}

          {/* Footer */}
          <div className="mt-8 pt-6 border-t border-slate-200">
            <div className="flex items-center justify-between text-sm text-slate-600">
              <div className="flex items-center space-x-2">
                <Shield className="h-4 w-4" />
                <span>Confidential - Protected Information</span>
              </div>
              <div className="text-xs">
                Generated on {new Date().toLocaleDateString()} • ID: {candidate.name?.split(' ')[1] || 'Unknown'}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
