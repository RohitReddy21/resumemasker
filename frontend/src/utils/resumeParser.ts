import mammoth from "mammoth";
import * as pdfjsLib from "pdfjs-dist";
// @ts-ignore
import pdfWorker from "pdfjs-dist/build/pdf.worker.mjs?url";

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorker;

/* =========================================================
   TEXT EXTRACTION
========================================================= */

export const extractTextFromFile = async (file: File): Promise<string> => {
  if (file.type === "application/pdf") {
    const buffer = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: buffer }).promise;
    let text = "";

    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const content = await page.getTextContent();

      const items = (content.items as any[]).sort((a, b) => {
        const yDiff = b.transform[5] - a.transform[5];
        if (Math.abs(yDiff) > 5) return yDiff;
        return a.transform[4] - b.transform[4];
      });

      text += items.map((i: any) => i.str).join(" ") + "\n";
    }
    console.log("DEBUG: Extracted text length:", text.length);
    console.log("DEBUG: First 500 chars of text:", text.substring(0, 500));
    return text;
  }

  if (
    file.type === "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
  ) {
    const buffer = await file.arrayBuffer();
    const result = await mammoth.extractRawText({ arrayBuffer: buffer });
    return result.value;
  }

  return "";
};

/* =========================================================
   CONSTANTS
========================================================= */

const INVALID_NAME_WORDS = new Set([
  "technical", "skills", "experience", "summary", "profile", "education",
  "contact", "details", "professional", "career", "objective",
  "technologies", "technology", "stack", "expertise", "knowledge",
  "company", "organization", "project", "projects",
  "immediate", "joiner", "developer", "engineer", "manager",
  "architect", "consultant", "analyst", "lead", "senior", "junior",
  "full", "backend", "frontend", "software", "solution",
  "net", "core", "api", "rest", "mvc", "cloud", "azure", "aws",
  "java", "python", "react", "angular", "node", "dotnet"
]);

/* =========================================================
   UTILS
========================================================= */

const getHeaderBlock = (text: string, lines: number = 40): string => {
  const clean = text.split("\n").map(l => l.trim()).filter(l => l);
  return clean.slice(0, lines).join("\n");
};

const scoreNameCandidate = (name: string): number => {
  let score = 0;
  const parts = name.split(/\s+/);

  if (parts.length >= 2 && parts.length <= 4) score += 2;
  if (parts.every(p => p[0] === p[0].toUpperCase())) score += 2;
  if (!parts.some(p => INVALID_NAME_WORDS.has(p.toLowerCase()))) score += 3;
  if (!/\d|@|http/.test(name)) score += 2;
  if (name.length <= 40) score += 1;

  return score;
};

const isValidHumanName = (name?: string | null): boolean => {
  return !!name && scoreNameCandidate(name) >= 6;
};

/* =========================================================
   OPENAI EXTRACTION
========================================================= */

const extractWithAI = async (resumeText: string, apiKey: string): Promise<any> => {
  if (!apiKey) return null;

  const prompt = `
You are a senior recruitment AI.

Extract ONLY factual information present in the resume text.

STRICT RULES:
- Name must be a PERSON'S NAME (initials allowed).
- DO NOT return section headers, skills, titles, or company names.
- If unsure, return null.

Return valid JSON:
{
  "name": string | null,
  "location": string | null,
  "experience_years": number | null,
  "technical_skills": string[],
  "email": string | null,
  "phone": string | null
}

RESUME:
${resumeText.slice(0, 5000)}
`;

  try {
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        temperature: 0,
        response_format: { type: "json_object" },
        messages: [{ role: "user", content: prompt }]
      })
    });

    if (response.status === 429) {
      console.warn('OpenAI rate limit hit, using fallback analysis');
      return null;
    }

    if (!response.ok) {
      console.warn(`OpenAI API error: ${response.status}, using fallback`);
      return null;
    }

    const data = await response.json();
    return JSON.parse(data.choices[0].message.content);

  } catch (error) {
    console.warn('OpenAI API request failed:', error);
    return null;
  }
};

/* =========================================================
   FALLBACKS (SAFE)
========================================================= */

const extractNameFallback = (text: string): string | null => {
  const lines = text
    .split("\n")
    .map(l => l.trim())
    .filter(l => l.length > 2 && l.length < 60);

  const candidates: string[] = [];

  for (const line of lines.slice(0, 8)) {
    if (/^[A-Z][A-Za-z.\s]+$/.test(line)) {
      const words = line.toLowerCase().split(/\s+/);
      if (!words.some(w => INVALID_NAME_WORDS.has(w))) {
        candidates.push(line);
      }
    }
  }

  if (candidates.length === 0) return null;

  const scored = candidates.map(c => ({
    name: c,
    score: scoreNameCandidate(c)
  }));

  scored.sort((a, b) => b.score - a.score);

  const best = scored[0];
  return best.score >= 6 ? best.name : null;
};

const extractExperienceFallback = (text: string): number | null => {
  const matches = Array.from(text.toLowerCase().matchAll(/(\d+(?:\.\d+)?)\s*\+?\s*(?:years|yrs)/g));
  const years = matches
    .map(m => parseFloat(m[1]))
    .filter(y => y > 0 && y < 50);

  return years.length > 0 ? Math.max(...years) : null;
};

const extractEmail = (text: string): string | null => {
  const match = text.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/);
  return match ? match[0] : null;
};

const extractPhone = (text: string): string | null => {
  const match = text.match(/\b[6-9]\d{9}\b/);
  return match ? match[0] : null;
};

const extractNameFromEmail = (email: string): string | null => {
  const match = email.match(/^([a-zA-Z0-9._%+-]+)@/);
  if (!match) return null;

  const localPart = match[1];
  // Split by dots, underscores, numbers
  const parts = localPart.split(/[._0-9]+/).filter(p => p.length > 1);

  if (parts.length === 0) return null;

  // Take first 2 parts and capitalize
  const name = parts.slice(0, 2)
    .map(p => p.charAt(0).toUpperCase() + p.slice(1).toLowerCase())
    .join(' ');

  return name.length > 2 ? name : null;
};

const extractLocation = (text: string): string | null => {
  const MAJOR_CITIES = [
    "Mumbai", "Delhi", "Bangalore", "Bengaluru", "Hyderabad", "Ahmedabad",
    "Chennai", "Kolkata", "Pune", "Jaipur", "Lucknow", "Kanpur", "Nagpur",
    "Indore", "Thane", "Bhopal", "Visakhapatnam", "Patna", "Vadodara",
    "Ghaziabad", "Ludhiana", "Agra", "Nashik", "Faridabad", "Meerut",
    "Rajkot", "Varanasi", "Srinagar", "Aurangabad", "Dhanbad", "Amritsar",
    "Navi Mumbai", "Allahabad", "Prayagraj", "Ranchi", "Howrah", "Coimbatore",
    "Jabalpur", "Gwalior", "Vijayawada", "Jodhpur", "Madurai", "Raipur",
    "Kota", "Guwahati", "Chandigarh", "Solapur", "Noida", "Gurugram", "Gurgaon"
  ];

  const lowerText = text.toLowerCase();

  for (const city of MAJOR_CITIES) {
    const regex = new RegExp(`\\b${city.toLowerCase()}\\b`, 'i');
    if (regex.test(lowerText)) {
      return city;
    }
  }

  return null;
};

/* =========================================================
   MAIN ANALYSIS (TWO-PASS AI)
========================================================= */

export const analyzeResume = async (resumeText: string, jobDescription?: string) => {
  console.log("DEBUG: Running Ranking Analysis...");

  const apiKey = import.meta.env.VITE_OPENAI_API_KEY;

  // -------- PASS 1: HEADER (IDENTITY) --------
  const headerText = getHeaderBlock(resumeText);
  const aiIdentity = await extractWithAI(headerText, apiKey);

  // -------- PASS 2: FULL RESUME --------
  const aiFull = await extractWithAI(resumeText, apiKey);

  // -------- CONTACT (Extract early for email-based name fallback) --------
  const email = (aiIdentity?.email)
    ? aiIdentity.email
    : extractEmail(resumeText) || "Not Disclosed";

  const phone = (aiIdentity?.phone)
    ? aiIdentity.phone
    : extractPhone(resumeText) || "Not Disclosed";

  // -------- NAME --------
  let name: string | null = null;
  if (aiIdentity && isValidHumanName(aiIdentity.name)) {
    name = aiIdentity.name;
  } else {
    name = extractNameFallback(resumeText);
  }

  // Final fallback: extract from email
  if (!name && email !== "Not Disclosed") {
    name = extractNameFromEmail(email);
  }

  if (!name) {
    name = "Name Not Identified";
  }

  // -------- EXPERIENCE --------
  let exp: number | null = null;
  if (aiFull && typeof aiFull.experience_years === "number") {
    exp = aiFull.experience_years;
  } else {
    exp = extractExperienceFallback(resumeText);
  }

  // -------- SKILLS --------
  const skills: string[] = (aiFull && Array.isArray(aiFull.technical_skills))
    ? aiFull.technical_skills
    : [];

  // -------- RATING (QUALITY, NOT MATCH) --------
  let rating = 6.5;
  if (exp) {
    rating += Math.min(exp, 5) * 0.3;
  }
  rating = Math.round(Math.min(rating, 9.5) * 10) / 10;

  // -------- LOCATION --------
  const location = aiIdentity?.location || extractLocation(resumeText) || "Not Disclosed";

  return {
    name,
    location,
    yearsOfExperience: exp !== null ? `${exp}+ yrs` : "Not Disclosed",
    email,
    phone,
    currentCtc: "",
    expectedCtc: "",
    technicalSkills: skills,
    coreSkills: skills,
    resumeRating: rating,
    rating: rating,
    status: "Available" as const,
    matchScore: 0,
    rejectionReason: null,
    availability: "Immediate",
    summary: `${name} has ${exp ?? "undisclosed"} years of experience.`,
    match_summary: "Parsed successfully."
  };
};

/* =========================================================
   BACKEND ANALYSIS (PYTHON)
========================================================= */

export const analyzeResumeWithBackend = async (file: File, jobId: string, jobDescription?: string) => {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('job_id', jobId);
  if (jobDescription) {
    formData.append('job_description', jobDescription);
  }

  const response = await fetch('http://localhost:8001/upload-resume', {
    method: 'POST',
    body: formData,
  });

  if (!response.ok) {
    throw new Error('Backend analysis failed');
  }

  const data = await response.json();
  
  const candidate = data.candidate || {};

  // Transform backend response to match frontend expectations
  return {
    name: candidate.name || "Name Not Identified",
    maskedName: candidate.maskedName || `Candidate ${Math.floor(Math.random() * 1000)}`,
    location: candidate.location || "Not Disclosed",
    yearsOfExperience: candidate.experience || "Not Disclosed",
    email: candidate.email || "Not Disclosed",
    phone: candidate.phone || "Not Disclosed",
    currentCtc: "",
    expectedCtc: "",
    technicalSkills: candidate.skills || [],
    coreSkills: candidate.skills || [],
    resumeRating: candidate.rating || 6.5,
    rating: candidate.rating || 6.5,
    status: candidate.status || "Available",
    matchScore: candidate.matchScore || 0,
    rejectionReason: null,
    availability: "Immediate",
    summary: `${candidate.name || "Candidate"} has ${candidate.experience || "undisclosed"} experience.`,
    match_summary: "Parsed successfully.",
    // Extra fields
    socialLinks: candidate.socialLinks || [],
    lastCompany: candidate.lastCompany || null,
    maskedResumeText: candidate.maskedResumeText || null,
    existingId: data.candidateId || null
  };
};
