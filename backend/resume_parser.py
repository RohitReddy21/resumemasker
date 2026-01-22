import re
import requests
import json
from typing import Optional, Dict, Any, List

# =========================================================
# VALIDATION CONSTANTS
# =========================================================

INVALID_NAME_WORDS = {
    "technical", "skills", "experience", "summary", "profile", "education",
    "contact", "details", "professional", "career", "objective",
    "technologies", "technology", "stack", "expertise", "knowledge",
    "company", "organization", "client", "project", "projects",
    "immediate", "joiner", "developer", "engineer", "manager",
    "architect", "consultant", "analyst", "lead", "senior", "junior",
    "full", "stack", "backend", "frontend", "software", "solution",
    "net", "core", "api", "rest", "mvc", "cloud", "azure", "aws",
    "java", "python", "react", "angular", "node", "dotnet",
    "india", "state", "country", "curriculum", "vitae", "resume", "cv", "page"
}

# =========================================================
# NAME SCORING (CRITICAL FIX)
# =========================================================

def score_name_candidate(name: str) -> int:
    """
    Scores how likely a string is a real human name.
    """
    score = 0
    parts = name.strip().split()

    if 2 <= len(parts) <= 4:
        score += 2

    if all(p[0].isupper() for p in parts):
        score += 2

    if not any(p.lower() in INVALID_NAME_WORDS for p in parts):
        score += 3

    if not re.search(r'\d|@|http', name):
        score += 2

    if len(name) <= 40:
        score += 1

    return score


def is_valid_human_name(name: Optional[str]) -> bool:
    if not name:
        return False
    return score_name_candidate(name) >= 6


# =========================================================
# OPENAI EXTRACTION (STRICT)
# =========================================================

def extract_details_with_ai(
    resume_text: str,
    job_description: Optional[str] = None,
    api_key: Optional[str] = None
) -> Optional[Dict[str, Any]]:

    if not api_key:
        return None

    prompt = f"""
You are a senior recruitment AI.

Extract ONLY factual information explicitly present in the resume.

STRICT RULES:
- "name" must be a PERSON'S NAME.
- Initials are allowed (e.g., Pavan K Reddy).
- DO NOT return section headers, skills, company names, or titles.
- If unsure, return null.

Return ONLY valid JSON:
{{
  "name": string | null,
  "location": string | null,
  "experience_years": number | null,
  "technical_skills": string[],
  "email": string | null,
  "phone": string | null,
  "match_score": number,
  "match_summary": string,
  "quality_rating": number
}}

RESUME:
{resume_text[:5000]}
"""

    try:
        response = requests.post(
            "https://api.openai.com/v1/chat/completions",
            headers={
                "Content-Type": "application/json",
                "Authorization": f"Bearer {api_key}"
            },
            json={
                "model": "gpt-4o-mini",
                "temperature": 0,
                "response_format": {"type": "json_object"},
                "messages": [{"role": "user", "content": prompt}]
            },
            timeout=30
        )

        if not response.ok:
            return None

        data = response.json()
        return json.loads(data["choices"][0]["message"]["content"])

    except Exception:
        return None


# =========================================================
# FALLBACK NAME EXTRACTION (FIXED)
# =========================================================

def extract_name_fallback(text: str) -> Optional[str]:
    """
    Extract candidate name ONLY from header with confidence scoring.
    """
    lines = [
        l.strip()
        for l in text.split("\n")
        if 2 < len(l.strip()) < 60
    ]

    candidates = []

    # Only inspect first 20 lines (Expanded from 15)
    for line in lines[:20]:
        line = line.strip()
        
        # Handle "Name:" prefix
        name_prefix_match = re.match(r"^(?:Name|Candidate Name)\s*[:\-]\s*(.*)", line, re.IGNORECASE)
        if name_prefix_match:
            potential_name = name_prefix_match.group(1).strip()
            if re.match(r"[A-Z][A-Za-z.\s\-]+", potential_name):
                 if not any(w in potential_name.lower() for w in INVALID_NAME_WORDS):
                     candidates.append(potential_name)
                     continue

        # Allow spaces, dots, and hyphens in names
        if re.fullmatch(r"[A-Z][A-Za-z.\s\-]+", line):
            if not any(w in line.lower() for w in INVALID_NAME_WORDS):
                candidates.append(line)

    if not candidates:
        return None

    scored = [(c, score_name_candidate(c)) for c in candidates]
    scored.sort(key=lambda x: x[1], reverse=True)

    best, score = scored[0]

    return best.title() if score >= 6 else None


# =========================================================
# EXPERIENCE / SKILLS FALLBACKS (UNCHANGED)
# =========================================================

def extract_experience_fallback(text: str) -> Optional[float]:
    matches = re.findall(r"(\d+(?:\.\d+)?)\s*\+?\s*(?:years|yrs)", text.lower())
    years = [float(m) for m in matches if 0 < float(m) < 50]
    return max(years) if years else None


def extract_skills_fallback(text: str) -> List[str]:
    """
    Enhanced skills extraction that works with any resume format.
    Extracts skills from dedicated sections, experience descriptions, and project details.
    """
    
    # First try to extract from dedicated skills sections
    section_skills = extract_skills_from_section(text)
    if section_skills:
        return section_skills[:25]
    
    # If no dedicated section, extract from entire resume
    skills = []
    
    # Enhanced skill patterns for better detection
    skill_patterns = [
        # Programming languages and frameworks
        r'\b(Python|Java|JavaScript|TypeScript|C\+\+|C#|PHP|Ruby|Go|Rust|Swift|Kotlin|Scala|Perl|R|MATLAB|Solidity)\b',
        # Web technologies
        r'\b(React|Angular|Vue|Next\.js|Express|Django|Flask|Spring|Laravel|Rails|FastAPI|Node\.js|\.NET|ASP\.NET)\b',
        # Databases
        r'\b(MySQL|PostgreSQL|MongoDB|Redis|Oracle|SQLite|Cassandra|DynamoDB|Elasticsearch|Firebase|SQL|NoSQL)\b',
        # Cloud and DevOps
        r'\b(AWS|Azure|GCP|Google\sCloud|Docker|Kubernetes|Jenkins|GitLab|CI/CD|Terraform|Ansible|Puppet|Chef|Linux|Unix|Nginx|Apache)\b',
        # Frontend technologies
        r'\b(HTML|CSS|SASS|LESS|Tailwind|Bootstrap|jQuery|Webpack|Vite|Redux|MobX|GraphQL|REST|SOAP)\b',
        # Mobile development
        r'\b(iOS|Android|React\sNative|Flutter|Xamarin|Swift|Kotlin|Java\sFX|Electron)\b',
        # Data Science/AI
        r'\b(TensorFlow|PyTorch|Scikit-learn|Pandas|NumPy|Matplotlib|Jupyter|Hadoop|Spark|Tableau|Power\sBI|Excel|ML|AI|Deep\sLearning)\b',
        # Testing tools
        r'\b(Selenium|Cypress|Jest|Mocha|Chai|JUnit|TestNG|Pytest|Postman|Insomnia|K6|JMeter)\b',
        # Tools and platforms
        r'\b(Git|GitHub|GitLab|Bitbucket|Jira|Confluence|Slack|Trello|Asana|Figma|Sketch|Adobe|VS\sCode|IntelliJ|Eclipse)\b',
        # Methodologies and concepts
        r'\b(Agile|Scrum|Kanban|DevOps|CI/CD|Microservices|Serverless|TDD|BDD|OOP|MVC|MVP|RESTful|API)\b',
        # Common software/tools
        r'\b(Office|Word|Excel|PowerPoint|Outlook|Teams|Zoom|Photoshop|Illustrator|Premiere|Final\sCut)\b'
    ]
    
    # Extract skills using patterns
    for pattern in skill_patterns:
        matches = re.findall(pattern, text, re.IGNORECASE)
        for match in matches:
            if isinstance(match, tuple):
                match = match[0] if match[0] else match[1]
            skill = match.strip()
            if skill and len(skill) > 1 and skill not in skills:
                skills.append(skill.title() if skill.islower() else skill)
    
    # Extract skills from experience/project descriptions
    # Look for patterns like "experienced in X", "proficient in Y", "knowledge of Z"
    exp_patterns = [
        r'(?:proficient|experienced|skilled|knowledge|expert|familiar)\s+(?:in|with|of)\s+([A-Za-z0-9\s+#/.-]{2,30})',
        r'(?:using|used|utilized|implemented|developed|built|created)\s+([A-Za-z0-9\s+#/.-]{2,30})',
        r'(?:knowledge|experience)\s+(?:in|of|with)\s+([A-Za-z0-9\s+#/.-]{2,30})'
    ]
    
    for pattern in exp_patterns:
        matches = re.findall(pattern, text, re.IGNORECASE)
        for match in matches:
            # Split the match into potential skills
            potential_skills = re.split(r'[,/and\s]+', match)
            for skill in potential_skills:
                skill = skill.strip()
                if (2 < len(skill) < 25 and 
                    not re.search(r'\d{4}', skill) and  # Remove years
                    not skill.lower() in ['the', 'with', 'for', 'from', 'that', 'this', 'were', 'been', 'have', 'had']):
                    if skill not in skills:
                        skills.append(skill.title() if skill.islower() else skill)
    
    # Extract from bullet points and lists
    bullet_lines = re.findall(r'^[•·\-\*]\s*(.+)$', text, re.MULTILINE)
    for line in bullet_lines:
        # Look for technical terms in bullet points
        tech_terms = re.findall(r'\b[A-Z][a-z]*[A-Z]*[a-z]*\b', line)
        for term in tech_terms:
            if (2 < len(term) < 20 and 
                not term.lower() in ['january', 'february', 'march', 'april', 'may', 'june', 
                                   'july', 'august', 'september', 'october', 'november', 'december',
                                   'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday',
                                   'company', 'team', 'project', 'client', 'customer', 'user', 'system']):
                if term not in skills:
                    skills.append(term)
    
    # Remove duplicates and clean up
    unique_skills = []
    seen = set()
    for skill in skills:
        clean_skill = skill.strip()
        if clean_skill and clean_skill not in seen:
            seen.add(clean_skill)
            unique_skills.append(clean_skill)
    
    return unique_skills[:25] if unique_skills else []


def extract_skills_from_section(text: str) -> List[str]:
    """Extract skills from a specific 'Skills' section in the resume."""
    headers = [
        r'Technical Skills', r'Skills', r'Technologies', r'Tech Stack', r'Core Competencies',
        r'Technical Expertise', r'Key Skills', r'Software Skills', r'IT Skills', r'Programming Languages',
        r'Frameworks', r'Tools', r'Platforms', r'Databases', r'Languages'
    ]
    
    # More flexible header pattern - look for headers followed by newline or colon
    header_pattern = r'(?:^|\n)\s*(' + '|'.join(headers) + r')\s*[:\-\s]*\s*[\n\r]'
    match = re.search(header_pattern, text, re.IGNORECASE)
    if not match:
        # Try alternative pattern - just look for the header line
        for header in headers:
            pattern = r'(?:^|\n)\s*' + header + r'\s*[:\-\s]*\s*[\n\r]'
            if re.search(pattern, text, re.IGNORECASE):
                match = re.search(pattern, text, re.IGNORECASE)
                break
    
    if not match:
        return []
    
    start_index = match.end()
    remaining_text = text[start_index:]
    lines = remaining_text.split('\n')
    skill_lines = []
    
    for line in lines:
        line = line.strip()
        if not line:
            continue
        # Stop if we hit another major section
        if re.match(r'^(?:Experience|Education|Projects|Work History|Employment|Summary|Objective|Professional)', line, re.IGNORECASE):
            break
        skill_lines.append(line)
        if len(skill_lines) > 20: # Limit to avoid reading whole resume
            break
    
    # Join all skill lines and extract skills
    section_text = ", ".join(skill_lines)
    
    # First try to extract bullet point skills
    bullet_skills = []
    bullet_pattern = r'^[\s]*[-•·]\s*(.+)$'
    for line in skill_lines:
        bullet_match = re.match(bullet_pattern, line)
        if bullet_match:
            bullet_skills.append(bullet_match.group(1).strip())
    
    if bullet_skills:
        return bullet_skills[:25]
    
    # If no bullet points, split by common delimiters
    raw_skills = re.split(r'[,|•·\n\t]', section_text)
    
    cleaned_skills = []
    for s in raw_skills:
        clean = re.sub(r'^[\W\d\-\s]+', '', s.strip()) # Remove bullet points/numbers and extra spaces
        clean = clean.strip()
        
        # Handle sub-headers (e.g., "Programming Languages: Python")
        if ':' in clean:
            sub_parts = clean.split(':')
            if len(sub_parts) > 1 and len(sub_parts[1].strip()) > 1:
                clean = sub_parts[1].strip()
        
        if 1 < len(clean) < 30:
            # Remove common non-skill words
            if not re.search(r'^(and|or|the|with|for|in|at|on|by|to|of|from|as|is|are|was|were|be|been|have|has|had|do|does|did|will|would|could|should|may|might|can|must|shall|should|ought)$', clean.lower()):
                cleaned_skills.append(clean.title() if clean.islower() else clean)
    
    return cleaned_skills[:25]


def extract_email(text: str) -> Optional[str]:
    m = re.search(r"[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}", text)
    return m.group(0) if m else None


def extract_phone(text: str) -> Optional[str]:
    m = re.search(r"\b[6-9]\d{9}\b", text)
    return m.group(0) if m else None


def extract_name_from_email(email: str) -> Optional[str]:
    """Extract name from email address as last resort."""
    match = re.match(r"^([a-zA-Z0-9._%+-]+)@", email)
    if not match:
        return None
    
    local_part = match.group(1)
    # Split by dots, underscores, numbers
    parts = [p for p in re.split(r"[._0-9]+", local_part) if len(p) > 1]
    
    if not parts:
        return None
    
    # Take first 2 parts and capitalize
    name = " ".join(parts[:2]).title()
    
    return name if len(name) > 2 else None


def extract_location(text: str) -> Optional[str]:
    """Extract location from resume text - flexible extraction from any location mention."""
    
    # Major cities list (expanded)
    MAJOR_CITIES = [
        "Mumbai", "Delhi", "Bangalore", "Bengaluru", "Hyderabad", "Ahmedabad",
        "Chennai", "Kolkata", "Pune", "Jaipur", "Lucknow", "Kanpur", "Nagpur",
        "Indore", "Thane", "Bhopal", "Visakhapatnam", "Patna", "Vadodara",
        "Ghaziabad", "Ludhiana", "Agra", "Nashik", "Faridabad", "Meerut",
        "Rajkot", "Varanasi", "Srinagar", "Aurangabad", "Dhanbad", "Amritsar",
        "Navi Mumbai", "Allahabad", "Prayagraj", "Ranchi", "Howrah", "Coimbatore",
        "Jabalpur", "Gwalior", "Vijayawada", "Jodhpur", "Madurai", "Raipur",
        "Kota", "Guwahati", "Chandigarh", "Solapur", "Noida", "Gurugram", "Gurgaon",
        # International cities
        "New York", "Los Angeles", "Chicago", "Houston", "Phoenix", "Philadelphia",
        "San Antonio", "San Diego", "Dallas", "San Jose", "Austin", "Jacksonville",
        "London", "Manchester", "Birmingham", "Glasgow", "Liverpool", "Leeds",
        "Singapore", "Dubai", "Abu Dhabi", "Doha", "Riyadh", "Kuwait City",
        "Toronto", "Vancouver", "Montreal", "Calgary", "Ottawa", "Edmonton",
        "Sydney", "Melbourne", "Brisbane", "Perth", "Adelaide", "Canberra"
    ]
    
    # Common location patterns
    location_patterns = [
        r'(?:Location|Located in|Based in|Living in|Residing in|Address|City|State|Country)\s*[:\-]?\s*([A-Za-z\s,\.]+)',
        r'([A-Za-z\s,]+),\s*[A-Z]{2,3}\s*\d{5}',  # City, State ZIP
        r'([A-Za-z\s,]+),\s*[A-Z]{2,3}',  # City, State
        r'([A-Za-z\s,]+)\s*\d{6}',  # City with PIN code
    ]
    
    # First try major cities
    lower_text = text.lower()
    for city in MAJOR_CITIES:
        if re.search(rf'\b{city.lower()}\b', lower_text, re.IGNORECASE):
            return city
    
    # Try location patterns
    for pattern in location_patterns:
        matches = re.findall(pattern, text, re.IGNORECASE)
        for match in matches:
            location = match.strip()
            if (2 < len(location) < 50 and 
                not re.search(r'\d{4}', location) and  # Remove years
                not location.lower() in ['email', 'phone', 'contact', 'address', 'street', 'road', 'lane']):
                return location
    
    # Look for standalone city names (capitalized words that might be locations)
    lines = text.split('\n')
    for i, line in enumerate(lines[:10]):  # Check first 10 lines
        words = re.findall(r'\b[A-Z][a-z]+\b', line)
        for word in words:
            if (3 < len(word) < 20 and 
                word not in ['Experience', 'Education', 'Skills', 'Projects', 'Summary', 'Objective', 'Profile']):
                # Check if this appears to be a location by looking for context
                context = text[max(0, i-1):i+2]  # Previous and next lines
                if any(loc_word in context.lower() for loc_word in ['location', 'based', 'located', 'city', 'address']):
                    return word
    
    # Extract country/state mentions
    country_patterns = [
        r'\b(India|USA|United States|UK|United Kingdom|Canada|Australia|Germany|France|Singapore|UAE|Dubai)\b',
        r'\b(California|Texas|New York|Florida|Illinois|Pennsylvania|Ohio|Georgia|North Carolina|Michigan)\b',
        r'\b(Karnataka|Maharashtra|Tamil Nadu|Uttar Pradesh|West Bengal|Gujarat|Rajasthan|Andhra Pradesh)\b'
    ]
    
    for pattern in country_patterns:
        match = re.search(pattern, text, re.IGNORECASE)
        if match:
            return match.group(1)
    
    return "Not Disclosed"


# =========================================================
# RESUME MASKING FUNCTIONALITY
# =========================================================

def mask_resume_text(resume_text: str, candidate_id: int) -> str:
    """
    Masks personal identifiable information from resume text while preserving work experience.
    
    Args:
        resume_text: Original resume text
        candidate_id: Unique ID for this candidate (used for replacement)
    
    Returns:
        Masked resume text with PII removed
    """
    masked_text = resume_text
    
    # Replace name with "Candidate {ID}"
    # First, try to extract and replace names in the header/first few lines
    lines = masked_text.split('\n')
    for i, line in enumerate(lines[:10]):  # Check first 10 lines for name
        line = line.strip()
        if 2 < len(line) < 60 and re.fullmatch(r"[A-Z][A-Za-z.\s]+", line):
            if not any(w in line.lower() for w in INVALID_NAME_WORDS):
                lines[i] = f"Candidate {candidate_id}"
                break
    
    masked_text = '\n'.join(lines)
    
    # Mask email addresses
    email_pattern = r'[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}'
    masked_text = re.sub(email_pattern, '[EMAIL REMOVED]', masked_text)
    
    # Mask phone numbers (Indian and international formats)
    phone_patterns = [
        r'\b[6-9]\d{9}\b',  # Indian mobile numbers
        r'\+?\d{1,3}[-.\s]?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}',  # International format
        r'\b\d{3}[-.\s]?\d{3}[-.\s]?\d{4}\b'  # US format
    ]
    for pattern in phone_patterns:
        masked_text = re.sub(pattern, '[PHONE REMOVED]', masked_text)
    
    # Mask last work company name (preserve other company names in work experience)
    # This is tricky - we'll try to identify the most recent company and mask it
    # Look for patterns like "Current Company:", "Present:", "Recent:" etc.
    current_company_patterns = [
        r'(?:Current|Present|Recent|Latest)(?:\s+(?:Company|Work|Employer|Job|Role|Position))?[\s:]+([A-Z][A-Za-z0-9\s&\-\.]+?)(?:\n|$)',
        r'(?:Working at|Currently at|Employed at)[\s:]+([A-Z][A-Za-z0-9\s&\-\.]+?)(?:\n|$)',
        r'([A-Z][A-Za-z0-9\s&\-\.]+?)\s*\(\s*(?:Current|Present|Recent|Latest)\s*\)'
    ]
    
    for pattern in current_company_patterns:
        matches = re.findall(pattern, masked_text, re.IGNORECASE)
        for match in matches:
            company_name = match.strip()
            if len(company_name) > 2 and len(company_name) < 50:
                # Only replace if it looks like a company name (has capital letters)
                if any(c.isupper() for c in company_name):
                    masked_text = masked_text.replace(company_name, '[COMPANY NAME REMOVED]')
    
    # Mask address information
    address_patterns = [
        r'\d+\s+[\w\s]+,\s*[\w\s]+,\s*[A-Za-z\s]+,\s*\d{6}',  # Indian address format
        r'\d+\s+[\w\s]+,\s*[\w\s]+,\s*[A-Za-z\s]+\s+\d{5}',  # US address format
        r'Pin:\s*\d{6}',  # PIN code
        r'Postal Code:\s*\d{5,6}'  # Postal code
    ]
    
    for pattern in address_patterns:
        masked_text = re.sub(pattern, '[ADDRESS REMOVED]', masked_text)
    
    # Mask LinkedIn, GitHub, and other social media profiles
    social_patterns = [
        r'linkedin\.com/in/[a-zA-Z0-9\-_]+',
        r'github\.com/[a-zA-Z0-9\-_]+',
        r'twitter\.com/[a-zA-Z0-9\-_]+',
        r'facebook\.com/[a-zA-Z0-9\-_]+',
        r'instagram\.com/[a-zA-Z0-9\-_]+',
        r'behance\.net/[a-zA-Z0-9\-_]+',
        r'dribbble\.com/[a-zA-Z0-9\-_]+'
    ]
    
    for pattern in social_patterns:
        masked_text = re.sub(pattern, '[SOCIAL PROFILE REMOVED]', masked_text)
    
    # Mask personal website/portfolio URLs
    url_pattern = r'https?://[a-zA-Z0-9\-\.]+\.[a-zA-Z]{2,}(?:/[^\s]*)?'
    # Exclude well-known job portals and company websites
    job_portals = ['linkedin', 'naukri', 'indeed', 'monster', 'glassdoor']
    def should_mask_url(match):
        url = match.group(0).lower()
        return not any(portal in url for portal in job_portals)
    
    masked_text = re.sub(url_pattern, lambda m: '[WEBSITE REMOVED]' if should_mask_url(m) else m.group(0), masked_text)
    
    return masked_text


# =========================================================
# NEW EXTRACTION FUNCTIONS
# =========================================================

def extract_social_links(text: str) -> List[str]:
    """Extract social media profile links."""
    social_patterns = [
        r'linkedin\.com/in/[a-zA-Z0-9\-_]+',
        r'github\.com/[a-zA-Z0-9\-_]+',
        r'twitter\.com/[a-zA-Z0-9\-_]+',
        r'facebook\.com/[a-zA-Z0-9\-_]+',
        r'instagram\.com/[a-zA-Z0-9\-_]+',
        r'behance\.net/[a-zA-Z0-9\-_]+',
        r'dribbble\.com/[a-zA-Z0-9\-_]+'
    ]
    
    links = []
    for pattern in social_patterns:
        matches = re.findall(pattern, text, re.IGNORECASE)
        links.extend(matches)
        
    return list(set(links))  # Remove duplicates


def extract_last_company(text: str) -> Optional[str]:
    """Extract the most recent company name."""
    # Look for patterns like "Current Company:", "Present:", "Recent:" etc.
    current_company_patterns = [
        r'(?:Current|Present|Recent|Latest)(?:\s+(?:Company|Work|Employer|Job|Role|Position))?[\s:]+([A-Z][A-Za-z0-9\s&\-\.]+?)(?:\n|$)',
        r'(?:Working at|Currently at|Employed at)[\s:]+([A-Z][A-Za-z0-9\s&\-\.]+?)(?:\n|$)',
        r'([A-Z][A-Za-z0-9\s&\-\.]+?)\s*\(\s*(?:Current|Present|Recent|Latest)\s*\)'
    ]
    
    for pattern in current_company_patterns:
        matches = re.findall(pattern, text, re.IGNORECASE)
        for match in matches:
            company_name = match.strip()
            if len(company_name) > 2 and len(company_name) < 50:
                # Only return if it looks like a company name (has capital letters)
                if any(c.isupper() for c in company_name):
                    return company_name
    return None


# =========================================================
# MAIN ANALYSIS FUNCTION (FINAL)
# =========================================================

def analyze_resume(
    resume_text: str,
    job_description: Optional[str] = None,
    openai_api_key: Optional[str] = None
) -> Dict[str, Any]:

    ai = extract_details_with_ai(resume_text, job_description, openai_api_key)

    # ---------- CONTACT (Extract early for email-based name fallback) ----------
    email = ai.get("email") if ai and ai.get("email") else extract_email(resume_text) or "Not Disclosed"
    phone = ai.get("phone") if ai and ai.get("phone") else extract_phone(resume_text) or "Not Disclosed"

    # ---------- SOCIALS & COMPANY ----------
    social_links = extract_social_links(resume_text)
    last_company = extract_last_company(resume_text)

    # ---------- NAME ----------
    name = None
    if ai and is_valid_human_name(ai.get("name")):
        name = ai["name"]
    else:
        name = extract_name_fallback(resume_text)

    # Final fallback: extract from email
    if not name and email != "Not Disclosed":
        name = extract_name_from_email(email)
    
    # Specific fix for "India" prefix being incorrectly attached
    if name and name.lower().startswith("india") and len(name) > 5:
        # Check if "India" is followed by another name part
        # e.g. "Indiamahendra" or "India Mahendra"
        without_india = re.sub(r"^India\s*", "", name, flags=re.IGNORECASE)
        
        # If the remaining part looks like a valid name, use it
        if len(without_india) > 2:
             name = without_india.title()

    if not name:
        name = "Name Not Identified"

    # ---------- EXPERIENCE ----------
    exp = ai.get("experience_years") if ai else None
    if not isinstance(exp, (int, float)):
        exp = extract_experience_fallback(resume_text)

    # ---------- SKILLS ----------
    skills = []
    # Try AI first if available
    if ai and ai.get("technical_skills"):
        skills = ai.get("technical_skills", [])
    
    # If AI didn't return skills, use fallback
    if not skills or len(skills) == 0:
        # Try dynamic section extraction first
        dynamic_skills = extract_skills_from_section(resume_text)
        if dynamic_skills:
            skills = dynamic_skills
        else:
            skills = extract_skills_fallback(resume_text)
    
    # Ensure skills is always a list
    if not isinstance(skills, list):
        skills = [skills] if skills else []


    # ---------- RATING ----------
    rating = ai.get("quality_rating") if ai else 6.5
    match_score = ai.get("match_score") if ai else 50

    # ---------- LOCATION ----------
    location = ai.get("location") if ai and ai.get("location") else extract_location(resume_text) or "Not Disclosed"

    return {
        "name": name,
        "location": location,
        "yearsOfExperience": f"{exp}+ yrs" if exp else "Not Disclosed",
        "email": email,
        "phone": phone,
        "socialLinks": social_links,
        "lastCompany": last_company or "Not Disclosed",
        "technicalSkills": skills,
        "resumeRating": rating,
        "matchScore": match_score,
        "status": (
            "Shortlisted" if match_score >= 75 else
            "Rejected" if match_score < 40 else
            "Borderline"
        ),
        "summary": f"{name} has {exp if exp else 'undisclosed'} years of experience."
    }
