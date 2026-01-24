from fastapi import FastAPI, HTTPException, Body, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
from pydantic import BaseModel, Field
from typing import List, Optional
from datetime import datetime
import uuid
import os
from io import BytesIO
from resume_parser import analyze_resume, mask_resume_text
from PyPDF2 import PdfReader
from docx import Document

app = FastAPI(title="Recruitment Board API")

# CORS setup
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://localhost:8080",
        "https://resumemasker.vercel.app",
        "*"
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# MongoDB connection
import os
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()

# Use environment variable if available, otherwise fallback to localhost
MONGO_URL = os.getenv("MONGODB_URI", "mongodb://localhost:27017")
print(f"🔗 Connecting to MongoDB at: {MONGO_URL}")
client = AsyncIOMotorClient(MONGO_URL)
db = client["recruit_shine"]

# Candidate ID counter
async def get_next_candidate_id() -> int:
    """Get the next candidate ID for masking"""
    counter = await db.counters.find_one_and_update(
        {"_id": "candidate_id"},
        {"$inc": {"sequence_value": 1}},
        upsert=True,
        return_document=True
    )
    return counter["sequence_value"]

# Models
class StatusHistoryEntry(BaseModel):
    status: str
    changedAt: datetime = Field(default_factory=datetime.utcnow)

class Job(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    job_title: str
    client_name: str
    job_description: Optional[str] = None
    positions: int
    status: str = "Open"
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    status_history: List[StatusHistoryEntry] = []

class Candidate(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    email: str
    phone: Optional[str] = None
    skills: List[str] = []
    job_id: str
    current_status: str = "Applied"
    availability: Optional[str] = "Immediate"
    recruiter: Optional[str] = None
    current_ctc: Optional[str] = None
    expected_ctc: Optional[str] = None
    match_score: Optional[float] = 0.0
    experience: Optional[str] = None
    location: Optional[str] = None
    rating: Optional[float] = 0.0
    vetting_status: Optional[str] = "Applied"
    status_history: List[StatusHistoryEntry] = []
    created_at: datetime = Field(default_factory=datetime.utcnow)
    # New fields for masking
    candidate_id: Optional[int] = None  # For "Candidate 1", "Candidate 2", etc.
    masked_name: Optional[str] = None
    original_resume_text: Optional[str] = None
    masked_resume_text: Optional[str] = None

# Routes

# Health check endpoint
@app.get("/")
async def health_check():
    return {"status": "ok", "message": "Recruitment Board API is running"}

@app.get("/health")
async def health():
    try:
        # Check database connection
        await db.command("ping")
        return {"status": "healthy", "database": "connected"}
    except Exception as e:
        return {"status": "unhealthy", "database": "disconnected", "error": str(e)}

@app.get("/jobs", response_model=List[Job])
async def get_jobs():
    jobs = await db.jobs.find().to_list(1000)
    for job in jobs:
        job["id"] = str(job.get("_id", job.get("id")))
    return jobs

@app.post("/jobs", response_model=Job)
async def create_job(job: Job):
    job_dict = job.dict()
    job_dict["status_history"] = [{"status": job.status, "changedAt": datetime.utcnow()}]
    await db.jobs.insert_one(job_dict)
    return job_dict

@app.get("/jobs/{job_id}", response_model=Job)
async def get_job(job_id: str):
    job = await db.jobs.find_one({"id": job_id})
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    job["id"] = str(job.get("_id", job.get("id")))
    return job

@app.patch("/jobs/{job_id}/status")
async def update_job_status(job_id: str, status_update: dict = Body(...)):
    status = status_update.get("status")
    if not status:
        raise HTTPException(status_code=400, detail="Status is required")
    result = await db.jobs.update_one(
        {"id": job_id},
        {
            "$set": {"status": status, "updated_at": datetime.utcnow()},
            "$push": {"status_history": {"status": status, "changedAt": datetime.utcnow()}}
        }
    )
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Job not found")
    updated = await db.jobs.find_one({"id": job_id})
    updated["id"] = str(updated.get("_id", updated.get("id")))
    return updated

@app.delete("/jobs/{job_id}")
async def delete_job(job_id: str):
    result = await db.jobs.delete_one({"id": job_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Job not found")
    return {"message": "Job deleted successfully"}

@app.get("/candidates", response_model=List[Candidate])
async def get_candidates(jobId: Optional[str] = None):
    try:
        print(f"Getting candidates for jobId: {jobId}")
        query = {"job_id": jobId} if jobId else {}
        candidates = await db.candidates.find(query).to_list(1000)
        
        print(f"Found {len(candidates)} candidates")
        
        for c in candidates:
            # CRITICAL FIX: Use MongoDB _id as the primary identifier
            # Convert ObjectId to string and use as both _id and id
            object_id_str = str(c.get("_id"))
            c["_id"] = object_id_str
            c["id"] = object_id_str  # Use same value for both fields
            
        return candidates
    except Exception as e:
        print(f"Get candidates error: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to get candidates: {str(e)}")

@app.post("/candidates", response_model=Candidate)
async def create_candidate(candidate: Candidate):
    try:
        print(f"Creating candidate: {candidate.name}")
        
        c_dict = candidate.dict()
        
        # Generate a proper ID for the candidate
        import uuid
        candidate_id = str(uuid.uuid4())
        c_dict["id"] = candidate_id
        
        # Initialize status history
        c_dict["status_history"] = [{"status": candidate.current_status, "changedAt": datetime.utcnow()}]
        
        print(f"Inserting candidate with ID: {candidate_id}")
        result = await db.candidates.insert_one(c_dict)
        print(f"Insert result: {result.inserted_id}")
        
        # Return the created candidate with proper ID
        c_dict["id"] = candidate_id
        return c_dict
        
    except Exception as e:
        print(f"Create candidate error: {str(e)}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Failed to create candidate: {str(e)}")

@app.get("/candidates/{candidate_id}", response_model=Candidate)
async def get_candidate(candidate_id: str):
    try:
        print(f"Getting candidate with ID: {candidate_id}")
        # CRITICAL FIX: Query by both _id and id fields
        candidate = await db.candidates.find_one({
            "$or": [
                {"_id": candidate_id},
                {"id": candidate_id}
            ]
        })
        if not candidate:
            print(f"Candidate with ID {candidate_id} not found")
            raise HTTPException(status_code=404, detail="Candidate not found")
        
        # CRITICAL FIX: Use consistent ID for both fields
        object_id_str = str(candidate.get("_id"))
        candidate["_id"] = object_id_str
        candidate["id"] = object_id_str
            
        print(f"Returning candidate: {candidate.get('name', 'Unknown')} with ID: {candidate.get('id')}")
        return candidate
    except HTTPException:
        raise
    except Exception as e:
        print(f"Get candidate error: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to get candidate: {str(e)}")

@app.patch("/candidates/{candidate_id}/status")
async def update_candidate_status(candidate_id: str, status_update: dict = Body(...)):
    status = status_update.get("status")
    if not status:
        raise HTTPException(status_code=400, detail="Status is required")
    
    result = await db.candidates.update_one(
        {"id": candidate_id},
        {
            "$set": {"current_status": status},
            "$push": {"status_history": {"status": status, "changedAt": datetime.utcnow()}}
        }
    )
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Candidate not found")
    return {"message": "Status updated"}

@app.patch("/candidates/{candidate_id}")
async def update_candidate(candidate_id: str, updates: dict = Body(...)):
    """Update candidate fields"""
    try:
        print(f"🔄 PATCH: Updating candidate with ID: {candidate_id}")
        print(f"🔄 PATCH: Updates received: {updates}")
        
        # Remove fields that shouldn't be updated directly
        allowed_updates = {k: v for k, v in updates.items() if k not in ['id', 'candidateId', 'status_history', 'created_at', '_id']}
        
        if not allowed_updates:
            raise HTTPException(status_code=400, detail="No valid fields to update")
        
        # CRITICAL DEBUG: Check what exists in database
        # Convert string ID to ObjectId if it looks like an ObjectId
        from bson import ObjectId
        try:
            object_id = ObjectId(candidate_id)
            query = {"_id": object_id}
        except:
            # If not a valid ObjectId, use as string
            query = {
                "$or": [
                    {"_id": candidate_id},
                    {"id": candidate_id}
                ]
            }
        
        existing_candidate = await db.candidates.find_one(query)
        print(f"🔍 PATCH: Query used: {query}")
        print(f"🔍 PATCH: Existing candidate found: {existing_candidate is not None}")
        if existing_candidate:
            print(f"🔍 PATCH: Existing _id: {existing_candidate.get('_id')}")
            print(f"🔍 PATCH: Existing id: {existing_candidate.get('id')}")
        
        if not existing_candidate:
            print(f"❌ PATCH: Candidate with ID {candidate_id} not found")
            raise HTTPException(status_code=404, detail="Candidate not found")
        
        # Add timestamp to status history if status is being updated
        if 'current_status' in allowed_updates:
            # Get current candidate to preserve existing status history
            status_history = existing_candidate.get("status_history", [])
            status_history.append({
                "status": allowed_updates['current_status'], 
                "changedAt": datetime.utcnow()
            })
            allowed_updates['status_history'] = status_history
        
        print(f"🔄 PATCH: Final updates: {allowed_updates}")
        
        result = await db.candidates.update_one(query, {"$set": allowed_updates})
        
        print(f"🔄 PATCH: Update result: {result.modified_count} documents modified")
        
        if result.modified_count == 0:
            print(f"❌ PATCH: No documents modified for ID {candidate_id}")
            raise HTTPException(status_code=404, detail="Candidate not found")
        
        # Return updated candidate with proper ID conversion
        updated_candidate = await db.candidates.find_one(query)
        if updated_candidate:
            # CRITICAL FIX: Use consistent ID for both fields
            object_id_str = str(updated_candidate.get("_id"))
            updated_candidate["_id"] = object_id_str
            updated_candidate["id"] = object_id_str
        
        print(f"✅ PATCH: Returning updated candidate: {updated_candidate.get('name', 'Unknown')} with ID: {updated_candidate.get('id')}")
        return updated_candidate
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"❌ PATCH: Update error: {str(e)}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Update failed: {str(e)}")

@app.delete("/candidates/{candidate_id}")
async def delete_candidate(candidate_id: str):
    """Delete a candidate by ID"""
    try:
        print(f"Attempting to delete candidate with ID: {candidate_id}")
        print(f"Database connection: {db is not None}")
        
        # First check if candidate exists
        # Convert string ID to ObjectId if it looks like an ObjectId
        from bson import ObjectId
        try:
            object_id = ObjectId(candidate_id)
            query = {"_id": object_id}
        except:
            # If not a valid ObjectId, use as string
            query = {
                "$or": [
                    {"_id": candidate_id},
                    {"id": candidate_id}
                ]
            }
        
        candidate = await db.candidates.find_one(query)
        if not candidate:
            print(f"Candidate with ID {candidate_id} not found")
            raise HTTPException(status_code=404, detail="Candidate not found")
        
        print(f"Found candidate: {candidate.get('name', 'Unknown')}")
        
        result = await db.candidates.delete_one(query)
        print(f"Delete result: {result.deleted_count} documents deleted")
        
        if result.deleted_count == 0:
            print("No documents were deleted")
            raise HTTPException(status_code=404, detail="Candidate not found")
        
        print("Candidate deleted successfully")
        return {"message": "Candidate deleted successfully"}
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"Delete failed with error: {str(e)}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Delete failed: {str(e)}")

@app.get("/metrics/dashboard")
async def get_dashboard_metrics():
    total_jobs = await db.jobs.count_documents({})
    total_candidates = await db.candidates.count_documents({})
    shortlisted = await db.candidates.count_documents({"current_status": "Shortlisted"})
    
    return {
        "openPositions": total_jobs,
        "totalApplicants": total_candidates,
        "shortlisted": shortlisted,
        "interviewsScheduled": 0,
        "offersReleased": 0,
        "onboarded": 0
    }

@app.get("/metrics/funnel")
async def get_funnel_metrics():
    stages = [
        "Applied",
        "Available",
        "Submitted to Client",
        "Shortlisted",
        "Interview Scheduled",
        "Interviewed",
        "Approved",
        "Rejected",
        "Offer Released",
        "Onboarded",
    ]
    total = await db.candidates.count_documents({})
    results = []
    for stage in stages:
        count = await db.candidates.count_documents({"current_status": stage})
        percentage = round((count / total * 100) if total else 0, 2)
        results.append({"stage": stage, "count": count, "percentage": percentage})
    return results

@app.get("/metrics/tat")
async def get_tat_metrics():
    metrics = [
        "JD to First Resume",
        "Resume to Shortlist",
        "Shortlist to Interview",
        "Interview to Offer",
        "Offer to Onboard",
    ]
    agg = {
        "JD to First Resume": [],
        "Resume to Shortlist": [],
        "Shortlist to Interview": [],
        "Interview to Offer": [],
        "Offer to Onboard": [],
    }
    cursor = db.candidates.find({}, {"status_history": 1, "_id": 0})
    async for doc in cursor:
        hist = doc.get("status_history", [])
        if not hist or len(hist) < 2:
            continue
        hist_sorted = sorted(hist, key=lambda x: x.get("changedAt"))
        def days_between(a, b):
            try:
                return max(0, (b - a).days)
            except Exception:
                return 0
        if len(hist_sorted) >= 2:
            agg["JD to First Resume"].append(days_between(hist_sorted[0]["changedAt"], hist_sorted[1]["changedAt"]))
        statuses = [h["status"] for h in hist_sorted]
        def time_of(status):
            for h in hist_sorted:
                if h.get("status") == status:
                    return h.get("changedAt")
            return None
        r = time_of("Applied")
        s = time_of("Shortlisted")
        i = time_of("Interview Scheduled") or time_of("Interviewed")
        o = time_of("Offer Released")
        ob = time_of("Onboarded")
        if r and s:
            agg["Resume to Shortlist"].append(days_between(r, s))
        if s and i:
            agg["Shortlist to Interview"].append(days_between(s, i))
        if i and o:
            agg["Interview to Offer"].append(days_between(i, o))
        if o and ob:
            agg["Offer to Onboard"].append(days_between(o, ob))
    out = []
    for name in metrics:
        values = agg.get(name, [])
        count = len(values)
        avg = sum(values) / count if count else 0
        mx = max(values) if values else 0
        mn = min(values) if values else 0
        out.append({"metric": name, "avgDays": round(avg, 1), "minDays": mn, "maxDays": mx, "count": count})
    return out

# Resume Parsing Endpoint
def extract_text_from_pdf(file_bytes: bytes) -> str:
    """Extract text from PDF file"""
    pdf_reader = PdfReader(BytesIO(file_bytes))
    text = ""
    for page in pdf_reader.pages:
        text += page.extract_text() or ""
    return text

def extract_text_from_docx(file_bytes: bytes) -> str:
    """Extract text from DOCX file"""
    doc = Document(BytesIO(file_bytes))
    text = ""
    for para in doc.paragraphs:
        text += para.text + "\n"
    return text

@app.post("/upload-resume")
async def upload_resume(
    file: UploadFile = File(...),
    job_id: Optional[str] = None,
    job_description: Optional[str] = None
):
    """
    Upload and parse resume file (PDF or DOCX).
    Extracts name, email, phone, skills, experience, and location.
    Masks personal information for privacy.
    """
    try:
        print(f"Processing file: {file.filename}")
        file_bytes = await file.read()
        print(f"File size: {len(file_bytes)} bytes")
        
        # Extract text based on file type
        if file.filename.endswith(".pdf"):
            try:
                resume_text = extract_text_from_pdf(file_bytes)
            except Exception as pdf_error:
                print(f"Error extracting PDF: {pdf_error}")
                # For testing, if PDF extraction fails, treat as text
                resume_text = file_bytes.decode('utf-8', errors='ignore')
        elif file.filename.endswith((".docx", ".doc")):
            try:
                resume_text = extract_text_from_docx(file_bytes)
            except Exception as docx_error:
                print(f"Error extracting DOCX: {docx_error}")
                # For testing, if DOCX extraction fails, treat as text
                resume_text = file_bytes.decode('utf-8', errors='ignore')
        elif file.filename.endswith(".txt"):
            # Handle text files for testing
            resume_text = file_bytes.decode('utf-8', errors='ignore')
        else:
            raise HTTPException(status_code=400, detail="Only PDF, DOCX, and TXT files are supported")
        
        print(f"Extracted text length: {len(resume_text)}")
        
        # Get next candidate ID for masking
        try:
            candidate_id_num = await get_next_candidate_id()
            print(f"Generated candidate ID: {candidate_id_num}")
        except Exception as id_error:
            print(f"Error generating candidate ID: {id_error}")
            candidate_id_num = int(datetime.utcnow().timestamp()) % 10000  # Fallback ID
        
        # Mask the resume text
        try:
            masked_text = mask_resume_text(resume_text, candidate_id_num)
            print("Resume masking completed successfully")
        except Exception as mask_error:
            print(f"Error masking resume: {mask_error}")
            masked_text = resume_text  # Fallback to original text
        
        # Get OpenAI API key from environment
        openai_api_key = os.getenv("OPENAI_API_KEY") or os.getenv("VITE_OPENAI_API_KEY")
        
        # Analyze resume using original text (for better extraction)
        try:
            parsed_data = analyze_resume(
                resume_text,
                job_description=job_description,
                openai_api_key=openai_api_key
            )
            print("Resume analysis completed successfully")
        except Exception as analysis_error:
            print(f"Error analyzing resume: {analysis_error}")
            # Fallback to basic extraction
            parsed_data = {
                "name": "Name Not Identified",
                "location": "Not Disclosed",
                "yearsOfExperience": "Not Disclosed",
                "email": "Not Disclosed",
                "phone": "Not Disclosed",
                "technicalSkills": [],
                "resumeRating": 5.0,
                "matchScore": 50,
                "status": "Applied"
            }
        
        # Create masked name
        masked_name = f"Candidate {candidate_id_num}"
        
        # Create candidate from parsed resume
        candidate = Candidate(
            name=parsed_data.get("name", "Name Not Identified"),
            email=parsed_data.get("email", "Not Disclosed"),
            phone=parsed_data.get("phone", "Not Disclosed"),
            skills=parsed_data.get("technicalSkills", []),
            job_id=job_id or "unassigned",
            current_status=parsed_data.get("status", "Applied"),
            availability="Immediate",
            location=parsed_data.get("location", "Not Disclosed"),
            experience=parsed_data.get("yearsOfExperience", "Not Disclosed"),
            match_score=parsed_data.get("matchScore", 50),
            rating=parsed_data.get("resumeRating", 6.5),
            vetting_status=parsed_data.get("status", "Applied"),
            # New masking fields
            candidate_id=candidate_id_num,
            masked_name=masked_name,
            original_resume_text=resume_text,
            masked_resume_text=masked_text
        )
        
        # Save to database
        try:
            c_dict = candidate.dict()
            c_dict["status_history"] = [{"status": candidate.current_status, "changedAt": datetime.utcnow()}]
            result = await db.candidates.insert_one(c_dict)
            print(f"Candidate saved to database with ID: {result.inserted_id}")
        except Exception as db_error:
            print(f"Error saving to database: {db_error}")
            raise HTTPException(status_code=500, detail=f"Database error: {str(db_error)}")
        
        return {
            "success": True,
            "candidateId": str(result.inserted_id),
            "candidate": {
                "name": parsed_data.get("name"),  # Return original name
                "maskedName": masked_name,  # Also return masked name for frontend toggle
                "email": parsed_data.get("email"),  # Return original email
                "phone": parsed_data.get("phone"),  # Return original phone
                "skills": parsed_data.get("technicalSkills", []),
                "experience": parsed_data.get("yearsOfExperience"),
                "location": parsed_data.get("location"),
                "matchScore": parsed_data.get("matchScore"),
                "rating": parsed_data.get("resumeRating"),
                "status": parsed_data.get("status"),
                "maskedResumeText": masked_text  # Include masked resume text
            }
        }
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"Unexpected error in upload_resume: {e}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Error processing resume: {str(e)}")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8001)
