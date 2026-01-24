from reportlab.lib.pagesizes import letter, A4
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import inch
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, PageBreak, Table, TableStyle
from reportlab.lib import colors
from reportlab.lib.enums import TA_LEFT, TA_CENTER, TA_JUSTIFY
from io import BytesIO
from datetime import datetime
import re

def create_masked_resume_pdf(masked_text: str, candidate_id: int) -> BytesIO:
    """
    Creates a professional PDF resume from masked resume text.
    
    Args:
        masked_text: The masked resume text
        candidate_id: The candidate ID number
    
    Returns:
        BytesIO object containing the PDF
    """
    
    # Create PDF in memory
    pdf_buffer = BytesIO()
    doc = SimpleDocTemplate(pdf_buffer, pagesize=letter, topMargin=0.5*inch, bottomMargin=0.5*inch)
    
    # Define styles
    styles = getSampleStyleSheet()
    
    # Custom styles for professional resume
    header_style = ParagraphStyle(
        'CustomHeader',
        parent=styles['Heading1'],
        fontSize=18,
        textColor=colors.HexColor('#1F4788'),
        spaceAfter=6,
        alignment=TA_CENTER,
        fontName='Helvetica-Bold'
    )
    
    subheader_style = ParagraphStyle(
        'CustomSubHeader',
        parent=styles['Heading2'],
        fontSize=11,
        textColor=colors.HexColor('#2E5C8A'),
        spaceAfter=8,
        spaceBefore=8,
        fontName='Helvetica-Bold',
        borderPadding=2
    )
    
    body_style = ParagraphStyle(
        'CustomBody',
        parent=styles['Normal'],
        fontSize=10,
        alignment=TA_JUSTIFY,
        spaceAfter=6,
        leading=12
    )
    
    # Build document content
    content = []
    
    # Header with candidate name
    header_text = f"<b>Candidate {candidate_id}</b>"
    content.append(Paragraph(header_text, header_style))
    content.append(Spacer(1, 0.15*inch))
    
    # Add a horizontal line
    line_data = [['_' * 80]]
    line_table = Table(line_data)
    line_table.setStyle(TableStyle([
        ('TEXTCOLOR', (0, 0), (-1, -1), colors.HexColor('#2E5C8A')),
        ('FONTNAME', (0, 0), (-1, -1), 'Helvetica'),
        ('FONTSIZE', (0, 0), (-1, -1), 10),
    ]))
    content.append(line_table)
    content.append(Spacer(1, 0.1*inch))
    
    # Parse and format the resume content
    sections = parse_resume_sections(masked_text)
    
    for section_title, section_content in sections.items():
        if section_content.strip():
            # Add section header
            content.append(Paragraph(f"<b>{section_title.upper()}</b>", subheader_style))
            
            # Add section content
            formatted_content = format_section_content(section_content, section_title)
            content.append(Paragraph(formatted_content, body_style))
            
            content.append(Spacer(1, 0.08*inch))
    
    # Build PDF
    doc.build(content)
    pdf_buffer.seek(0)
    
    return pdf_buffer


def parse_resume_sections(resume_text: str) -> dict:
    """
    Parse resume text into sections.
    
    Args:
        resume_text: The masked resume text
    
    Returns:
        Dictionary with section titles as keys and content as values
    """
    sections = {}
    
    # Common section headers to look for
    section_patterns = {
        'SUMMARY': r'(SUMMARY|PROFILE|OBJECTIVE|PROFESSIONAL SUMMARY)',
        'EXPERIENCE': r'(EXPERIENCE|WORK EXPERIENCE|PROFESSIONAL EXPERIENCE|EMPLOYMENT)',
        'EDUCATION': r'(EDUCATION|ACADEMIC|QUALIFICATIONS)',
        'SKILLS': r'(SKILLS|TECHNICAL SKILLS|CORE SKILLS|COMPETENCIES)',
        'CERTIFICATIONS': r'(CERTIFICATIONS|CERTIFICATIONS & AWARDS|AWARDS|LICENSES)',
        'PROJECTS': r'(PROJECTS|KEY PROJECTS)',
    }
    
    lines = resume_text.split('\n')
    current_section = None
    current_content = []
    
    for line in lines:
        # Check if this line starts a new section
        found_section = False
        for section_name, pattern in section_patterns.items():
            if re.match(pattern, line.strip().upper()):
                # Save previous section
                if current_section and current_content:
                    sections[current_section] = '\n'.join(current_content).strip()
                
                current_section = section_name
                current_content = []
                found_section = True
                break
        
        # If not a section header, add to current section
        if not found_section and current_section:
            if line.strip():  # Skip empty lines
                current_content.append(line)
    
    # Save the last section
    if current_section and current_content:
        sections[current_section] = '\n'.join(current_content).strip()
    
    return sections


def format_section_content(content: str, section_type: str) -> str:
    """
    Format section content for professional display.
    
    Args:
        content: Raw section content
        section_type: Type of section (EXPERIENCE, EDUCATION, etc.)
    
    Returns:
        Formatted HTML string
    """
    lines = [line.strip() for line in content.split('\n') if line.strip()]
    
    # Remove placeholders added during masking
    formatted_lines = []
    for line in lines:
        # Skip lines that are just removed markers
        if line in ['[EMAIL REMOVED]', '[PHONE REMOVED]', '[COMPANY REMOVED]']:
            continue
        formatted_lines.append(line)
    
    # Join with proper formatting
    formatted = '<br/>'.join(formatted_lines)
    
    # Escape special HTML characters
    formatted = formatted.replace('&', '&amp;').replace('<', '&lt;').replace('>', '&gt;')
    formatted = formatted.replace('&amp;lt;br/&amp;gt;', '<br/>')
    
    return formatted
