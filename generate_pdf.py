import os
import sys
from fpdf import FPDF

# Define Color Palette (RGB)
PRIMARY = (24, 43, 73)      # Dark Navy
SECONDARY = (70, 130, 180)  # Muted Blue
ACCENT = (38, 166, 154)     # Teal
WARNING = (198, 40, 40)     # Crimson
TEXT_DARK = (33, 37, 41)    # Charcoal
BG_LIGHT = (248, 249, 250)  # Light Warm Grey
BORDER = (220, 224, 230)    # Light Grey
WHITE = (255, 255, 255)

class WorkflowPDF(FPDF):
    def header(self):
        if self.page_no() > 1:
            # Header title
            self.set_text_color(*PRIMARY)
            self.set_font("Helvetica", "B", 8)
            self.cell(100, 5, "VOICECARE AI - SAFE GROWTH ENGINE")
            
            # Header subtitle right-aligned
            self.set_text_color(120, 130, 140)
            self.set_font("Helvetica", "I", 8)
            self.cell(0, 5, "Workflow and Architecture Guide", align="R", new_x="LMARGIN", new_y="NEXT")
            
            # Horizontal rule
            self.set_draw_color(*BORDER)
            self.set_line_width(0.3)
            self.line(20, 17, 190, 17)
            self.ln(4)

    def footer(self):
        if self.page_no() > 1:
            # Footer rule
            self.set_draw_color(*BORDER)
            self.set_line_width(0.3)
            self.line(20, 280, 190, 280)
            
            # Footer text
            self.set_y(-15)
            self.set_text_color(120, 130, 140)
            self.set_font("Helvetica", "I", 8)
            self.cell(100, 10, "Confidential - Internal Use Only")
            
            # Page number
            page_text = f"Page {self.page_no()} of {{nb}}"
            self.cell(0, 10, page_text, align="R", new_x="LMARGIN", new_y="NEXT")

    def chapter_title(self, title_text, num_str):
        self.set_text_color(*PRIMARY)
        self.set_font("Helvetica", "B", 14)
        self.cell(0, 8, f"{num_str}. {title_text}", new_x="LMARGIN", new_y="NEXT")
        
        # Sub line under section header
        self.set_draw_color(*SECONDARY)
        self.set_line_width(0.5)
        current_y = self.get_y()
        self.line(20, current_y, 80, current_y)
        self.ln(4)

    def paragraph(self, text, style="", size=10):
        self.set_text_color(*TEXT_DARK)
        self.set_font("Helvetica", style, size)
        self.multi_cell(0, 5, text, new_x="LMARGIN", new_y="NEXT")
        self.ln(2.5)

    def bullet(self, title, desc, bullet_char="-"):
        self.set_text_color(*PRIMARY)
        self.set_font("Helvetica", "B", 10)
        self.cell(6, 5, f" {bullet_char} ")
        self.cell(45, 5, f"{title}:")
        
        self.set_text_color(*TEXT_DARK)
        self.set_font("Helvetica", "", 10)
        self.multi_cell(0, 5, desc, new_x="LMARGIN", new_y="NEXT")
        self.ln(1.5)

def build_pdf():
    # A4 dimensions: 210 x 297 mm
    pdf = WorkflowPDF(orientation="P", unit="mm", format="A4")
    pdf.set_margins(20, 20, 20)
    pdf.alias_nb_pages()
    
    # ==========================================
    # COVER PAGE
    # ==========================================
    pdf.add_page()
    
    # Geometric Accent Top
    pdf.set_fill_color(*PRIMARY)
    pdf.rect(0, 0, 210, 45, "F")
    
    # White Text on Navy Header
    pdf.set_text_color(*WHITE)
    pdf.set_font("Helvetica", "B", 24)
    pdf.set_y(15)
    pdf.cell(0, 10, "VOICECARE AI", align="C", new_x="LMARGIN", new_y="NEXT")
    pdf.set_font("Helvetica", "", 12) # Muted/Normal font weight
    pdf.cell(0, 6, "Safe Growth Operating System", align="C", new_x="LMARGIN", new_y="NEXT")
    
    # Title Block
    pdf.set_y(80)
    pdf.set_text_color(*PRIMARY)
    pdf.set_font("Helvetica", "B", 28)
    pdf.multi_cell(0, 12, "Workflow and Technical\nArchitecture Guide", align="L", new_x="LMARGIN", new_y="NEXT")
    
    pdf.ln(5)
    pdf.set_text_color(*SECONDARY)
    pdf.set_font("Helvetica", "B", 14)
    pdf.cell(0, 8, "Sequential Multi-Agent Framework for Safe Brand Scaling", new_x="LMARGIN", new_y="NEXT")
    
    # Colored Divider
    pdf.ln(4)
    pdf.set_draw_color(*ACCENT)
    pdf.set_line_width(1.5)
    pdf.line(20, pdf.get_y(), 120, pdf.get_y())
    pdf.ln(12)
    
    # Description
    pdf.set_text_color(*TEXT_DARK)
    pdf.set_font("Helvetica", "", 11)
    desc = (
        "A technical deep dive into the 6-agent sequential pipeline engineered to "
        "accelerate LinkedIn follower growth, capture category share-of-voice, and optimize "
        "AI engine visibility (GEO/AEO/ASO) while adhering to strict healthcare "
        "compliance (PHI protection) and platform anti-spam boundaries."
    )
    pdf.multi_cell(0, 6, desc, new_x="LMARGIN", new_y="NEXT")
    
    # Metadata Block at Bottom
    pdf.set_y(220)
    pdf.set_draw_color(*BORDER)
    pdf.set_line_width(0.3)
    pdf.line(20, 220, 190, 220)
    pdf.ln(5)
    
    pdf.set_font("Helvetica", "B", 9)
    pdf.set_text_color(*PRIMARY)
    pdf.cell(45, 5, "Document Scope:")
    pdf.set_font("Helvetica", "", 9)
    pdf.set_text_color(*TEXT_DARK)
    pdf.cell(0, 5, "Prototype & Architecture Specification", new_x="LMARGIN", new_y="NEXT")
    
    pdf.set_font("Helvetica", "B", 9)
    pdf.set_text_color(*PRIMARY)
    pdf.cell(45, 5, "Release Version:")
    pdf.set_font("Helvetica", "", 9)
    pdf.set_text_color(*TEXT_DARK)
    pdf.cell(0, 5, "v1.3.0", new_x="LMARGIN", new_y="NEXT")
    
    pdf.set_font("Helvetica", "B", 9)
    pdf.set_text_color(*PRIMARY)
    pdf.cell(45, 5, "Target Follower Goal:")
    pdf.set_font("Helvetica", "", 9)
    pdf.set_text_color(*TEXT_DARK)
    pdf.cell(0, 5, "2,900 to 10,000 Followers in 90 Days (~590 net-new/week)", new_x="LMARGIN", new_y="NEXT")
    
    pdf.set_font("Helvetica", "B", 9)
    pdf.set_text_color(*PRIMARY)
    pdf.cell(45, 5, "Core Technologies:")
    pdf.set_font("Helvetica", "", 9)
    pdf.set_text_color(*TEXT_DARK)
    pdf.cell(0, 5, "HTML5, CSS3, ES Modules, Vercel Serverless, Groq API", new_x="LMARGIN", new_y="NEXT")
    
    pdf.set_font("Helvetica", "B", 9)
    pdf.set_text_color(*PRIMARY)
    pdf.cell(45, 5, "Safety Posture:")
    pdf.set_font("Helvetica", "B", 9)
    pdf.set_text_color(*WARNING)
    pdf.cell(0, 5, "100% Pure Research & Drafting (Human-in-the-Loop Required)", new_x="LMARGIN", new_y="NEXT")
    
    # ==========================================
    # PAGE 2: EXECUTIVE SUMMARY & TECH STACK
    # ==========================================
    pdf.add_page()
    pdf.ln(5)
    
    pdf.chapter_title("Executive Summary", "1")
    pdf.paragraph(
        "The VoiceCare AI Safe Growth Engine is an operating console designed to scale B2B marketing "
        "and brand visibility. Traditionally, rapid social scaling relies on automated bots, scrapers, "
        "or bought leads - tactics that lead to severe platform penalties, profile bans, and brand erosion. "
        "In healthcare, these risks are compounded by the necessity to safeguard patient data and protect "
        "private health histories under strict HIPAA frameworks."
    )
    pdf.paragraph(
        "This platform acts as an administrative cockpit. It utilizes a sequential chain of six "
        "domain-specific AI sub-agents to analyze competitors, draft tailored content, audit SEO blogs, "
        "calculate growth velocities, compile third-party authority citation lists, and map assets to conversion "
        "funnels. The core architectural boundary is simple: the AI researches and drafts, but never executes "
        "external API actions. Humans review, verify, and post everything manually."
    )
    
    pdf.ln(5)
    pdf.chapter_title("Technical Stack Architecture", "2")
    pdf.paragraph(
        "The application is structured to minimize client-side dependencies, reduce payload weights, "
        "and securely isolate sensitive credentials. The stack components are:"
    )
    
    pdf.bullet(
        "HTML5 UI",
        "A single-page, responsive console layout utilizing semantic elements. The workspace is divided "
        "into a Company Profile input panel, an Orchestration Control bar (for single-agent or full sprint execution), "
        "and a grid of six agent output cards."
    )
    pdf.bullet(
        "Vanilla CSS3",
        "A custom, responsive design system engineered using CSS Grid and Flexbox. Features CSS variables "
        "for light/dark themes, scroll-safe code blocks, and dynamic agent state status lights."
    )
    pdf.bullet(
        "Vanilla JS & ES Modules",
        "Handles form state retrieval, coordinates DOM renders, parses JSON payloads, and runs sequential "
        "orchestration pipelines using browser-native async fetch handlers (no Webpack or Babel required)."
    )
    pdf.bullet(
        "Vercel Serverless Function",
        "All model routing and data gathering run securely inside `/api/agent.js`. Groq, OpenRouter, and Jina "
        "keys are kept strictly on Vercel's server environment, preventing credential leakage to the browser."
    )
    pdf.bullet(
        "Jina AI Web Grounding",
        "Used for real-time internet data gathering. Jina Search (`s.jina.ai`) queries public indexers and returns "
        "clean results, while Jina Reader (`r.jina.ai`) scrapes raw body copy from blog URLs and source assets."
    )
    pdf.bullet(
        "Groq & OpenRouter APIs",
        "High-velocity LLM inference. To prevent rate-limit failures, the backend implements a sequential OpenRouter "
        "fallback chain (Gemini Free -> GPT-OSS-120B -> Nemotron 3 Nano) to resolve requests when Groq fails."
    )

    # ==========================================
    # PAGE 3: SEQUENTIAL WORKFLOW & AGENTS
    # ==========================================
    pdf.add_page()
    pdf.ln(5)
    
    pdf.chapter_title("Sequential Multi-Agent Workflow", "3")
    pdf.paragraph(
        "A key design pattern of the Safe Growth Engine is context propagation. Rather than treating each "
        "agent as an isolated query, the system runs a sequential sprint where findings from upstream "
        "intelligence agents are structured and forwarded into downstream creative and planning agents."
    )
    
    # Text-Based ASCII Diagram Box
    pdf.set_fill_color(*BG_LIGHT)
    pdf.set_draw_color(*BORDER)
    pdf.rect(20, pdf.get_y(), 170, 42, "DF")
    
    pdf.set_text_color(*PRIMARY)
    pdf.set_font("Helvetica", "B", 9)
    pdf.set_y(pdf.get_y() + 3)
    pdf.cell(170, 4, "  CONTEXT PROPAGATION FLOW CHART", align="C", new_x="LMARGIN", new_y="NEXT")
    pdf.set_font("Courier", "", 8)
    pdf.set_text_color(*TEXT_DARK)
    pdf.ln(1)
    
    flow_lines = [
        "  [Input Profile] -> AGENT 01 (Market Intelligence) -> Extracts Gaps & Narrative",
        "                                                           |",
        "             +---------------------------------------------+",
        "             v                                             v",
        "  AGENT 02 (LinkedIn Content)                     AGENT 03 (GEO Blog Audit)",
        "  Outputs: Founder & Page Posts                   Outputs: Audits & Content Briefs",
        "             |                                             |",
        "             +----------------------+----------------------+",
        "                                    v",
        "  [Agents 04, 05, 06] -> Weekly Forecasting, Citation Building, & Conversion Mapping"
    ]
    for line in flow_lines:
        pdf.cell(170, 3, line, new_x="LMARGIN", new_y="NEXT")
        
    pdf.set_y(pdf.get_y() + 6)
    
    pdf.paragraph(
        "In a Full Sprint execution, the browser coordinates this sequence automatically:"
    )
    
    pdf.bullet(
        "Step 1: Market Analysis",
        "Agent 01 (Market Intelligence) executes first. It reads the company profile and competitors, "
        "compiles a competitive snapshot and a Share-of-Voice (SOV) scorecard, and identifies the Top 5 Content Gaps."
    )
    pdf.bullet(
        "Step 2: Context Extraction",
        "The JavaScript orchestrator extracts the generated 'Top 5 Content & Category Gaps' and 'Category Narrative' "
        "sections from Agent 01's response using clean header boundary parsers."
    )
    pdf.bullet(
        "Step 3: Creative & SEO Directives",
        "The extracted content is injected as competitive context variables into the payloads for "
        "Agent 02 (LinkedIn Content) and Agent 03 (GEO Visibility), ensuring the generated post drafts and blog briefs "
        "directly target competitor weaknesses."
    )
    pdf.bullet(
        "Step 4: Continuous Pipelines",
        "The remaining agents (Agent 04 Growth, Agent 05 Citations, Agent 06 Conversion) consume metrics, directory lists, "
        "and source assets to complete the comprehensive growth sprint pack, which is saved as a single unified document."
    )
    
    pdf.ln(3)
    pdf.paragraph("Targeting & Audience Personas:")
    pdf.bullet(
        "Ideal Customer Profile (ICP)",
        "Configures the company's B2B target market segment. Upstream and downstream agents use this profile to filter directory recommendations and align search terms."
    )
    pdf.bullet(
        "Target Persona",
        "Defines the job role or executive title targeted (e.g. CFOs, Practice Managers). Post drafts, carousel outlines, and hook angles are written to address this audience directly."
    )
    pdf.bullet(
        "Brand Tone",
        "Enforces verbal constraints (e.g. analytical, expert, direct) to ensure all drafted outputs match your company's brand identity."
    )
    
    pdf.ln(3)
    pdf.paragraph("Data Grounding & Anti-Hallucination Guardrails:")
    pdf.bullet(
        "Parallel Search Gathering",
        "To satisfy Vercel's strict 10s budget, the backend triggers Jina searches concurrently. In Market Intel, Jina "
        "runs parallel queries for each competitor (e.g. 'competitor linkedin content topics OR authority news OR citation directories') alongside the "
        "main category query. This gathers complete grounding data in a single turn before LLM execution."
    )
    pdf.bullet(
        "Hallucination Prevention",
        "If specific details are missing from Jina's search results (such as LinkedIn content pillars or citation sources), "
        "hardened system instructions force the LLM to output 'Not found in search' or 'Not publicly indexed' "
        "rather than fabricating mock placeholder figures."
    )

    # ==========================================
    # PAGE 4: DETAILED AGENT PROFILES
    # ==========================================
    pdf.add_page()
    pdf.ln(5)
    
    pdf.chapter_title("Detailed Agent Profiles", "4")
    pdf.paragraph(
        "Each agent runs under strict operational constraints defined in its system prompt configuration. "
        "The tables below specify the core parameters, system behaviors, and required markdown outputs."
    )
    
    # We will build standard tables or clean blocks. Since cell rendering is clean, let's write structured blocks.
    # Block for Agent 1
    def draw_agent_block(pdf, title, primary_model, fallback, temp, tokens, behavior, sections):
        pdf.set_fill_color(*BG_LIGHT)
        pdf.set_draw_color(*BORDER)
        pdf.rect(20, pdf.get_y(), 170, 34, "DF")
        
        # Header inside block
        current_y = pdf.get_y()
        pdf.set_y(current_y + 2)
        pdf.set_font("Helvetica", "B", 10)
        pdf.set_text_color(*PRIMARY)
        pdf.cell(100, 4, title)
        
        pdf.set_font("Helvetica", "I", 8)
        pdf.set_text_color(*SECONDARY)
        pdf.cell(0, 4, f"Temp: {temp} | Max Tokens: {tokens}", align="R", new_x="LMARGIN", new_y="NEXT")
        
        pdf.ln(1)
        pdf.set_font("Helvetica", "B", 8)
        pdf.set_text_color(*PRIMARY)
        pdf.cell(20, 3.5, "Models:")
        pdf.set_font("Helvetica", "", 8)
        pdf.set_text_color(*TEXT_DARK)
        pdf.cell(0, 3.5, f"Primary: {primary_model}  |  Fallback: {fallback}", new_x="LMARGIN", new_y="NEXT")
        
        pdf.set_font("Helvetica", "B", 8)
        pdf.set_text_color(*PRIMARY)
        pdf.cell(20, 3.5, "Behavior:")
        pdf.set_font("Helvetica", "", 8)
        pdf.set_text_color(*TEXT_DARK)
        pdf.multi_cell(0, 3.5, behavior, new_x="LMARGIN", new_y="NEXT")
        
        pdf.set_font("Helvetica", "B", 8)
        pdf.set_text_color(*PRIMARY)
        pdf.cell(20, 3.5, "Outputs:")
        pdf.set_font("Helvetica", "I", 8)
        pdf.set_text_color(*TEXT_DARK)
        pdf.cell(0, 3.5, sections, new_x="LMARGIN", new_y="NEXT")
        
        pdf.set_y(current_y + 34)
        pdf.ln(4)

    draw_agent_block(
        pdf,
        "Agent 01 - Market Intelligence + Share of Voice",
        "groq/compound", "llama-3.3-70b-versatile", 0.4, 2200,
        "Identifies market gaps, catalogs competitor positioning, and builds SOV matrices.",
        "Competitor Snapshot, Competitor Scorecard, Top 5 Gaps, Differentiation Angles, Category Narrative, Safe Actions"
    )
    
    draw_agent_block(
        pdf,
        "Agent 02 - LinkedIn Content + Founder Growth",
        "llama-3.3-70b-versatile", "llama-3.1-8b-instant", 0.7, 2400,
        "Drafts LinkedIn posts for company and leadership, outline slides, comments, and amplification kits.",
        "Company Posts, Founder Posts, Employee Advocacy, Carousel Outline, Comments, Amplification Kit, Repurposing Plan"
    )
    
    draw_agent_block(
        pdf,
        "Agent 03 - AI Search / GEO-AEO-ASO Audit",
        "groq/compound", "llama-3.3-70b-versatile", 0.4, 2600,
        "Conducts existing blog audits and structures GEO content briefs to capture AI engine citations.",
        "Existing Blog Audit, Content Brief, Citation Testing Protocol, Content Gap Summary, Safe Actions"
    )
    
    draw_agent_block(
        pdf,
        "Agent 04 - Growth Measurement + Forecasting",
        "llama-3.3-70b-versatile", "llama-3.1-8b-instant", 0.3, 1900,
        "Performs follower growth pace arithmetic and tracks visibility indices against goal pacing.",
        "Pace-to-Goal Calculation, Reverse Follower Model, Visibility Scorecard, Metrics Observations, Next Experiments"
    )

    # ==========================================
    # PAGE 5: REMAINING AGENTS & SAFETY GUARDRAILS
    # ==========================================
    pdf.add_page()
    pdf.ln(5)
    
    pdf.chapter_title("Detailed Agent Profiles (Cont.)", "4")
    pdf.ln(2)
    
    draw_agent_block(
        pdf,
        "Agent 05 - Third-Party Citation + Authority",
        "groq/compound", "llama-3.3-70b-versatile", 0.4, 2200,
        "Discovers authoritative third-party directories, earned media opportunities, and compliance pages.",
        "Citation Opportunity List, Priority Targets, 5 Pitch Angles, Trust Asset Requirements, Safe Actions"
    )
    
    draw_agent_block(
        pdf,
        "Agent 06 - Conversion Asset + Repurposing",
        "llama-3.3-70b-versatile", "llama-3.1-8b-instant", 0.6, 2400,
        "Maps user attention to conversion funnels (demos/webinars) and repurposes assets into multi-channel content.",
        "Conversion Asset Map, CTA Mapping, Repurposing Matrix, Original Benchmark Asset Ideas, Safe Actions"
    )
    
    pdf.chapter_title("Safety Boundaries & Compliance", "5")
    pdf.paragraph(
        "To ensure corporate safety, protect user accounts, and prevent regulatory issues, a shared safety core is "
        "interpolated into the system prompt of every agent. These eight rules override any user request or agent "
        "inference behavior."
    )
    
    # Colored callout box for safety rules
    pdf.set_fill_color(255, 235, 235)  # Soft red background
    pdf.set_draw_color(*WARNING)       # Crimson borders
    
    # Calculate box height based on contents
    rules_text = (
        "1. NO AUTOMATION: The agent only writes drafts; it has no access to post or edit social media.\n"
        "2. NO SCRAPING: The agent only uses public information or manually provided analytics.\n"
        "3. NO FABRICATION: The agent never invents names, numbers, or claims; missing details use placeholders.\n"
        "4. NO AUTO-ENGAGEMENT: No browser automation, proxy networks, fake accounts, or pods.\n"
        "5. ZERO PHI INGESTION: The agent never accepts or references Protected Health Information.\n"
        "6. COMPLIANCE GUARDRAILS: No clinical, medical, or security claims without explicit verification.\n"
        "7. ASO STANDARDS: Focus ASO entirely on AI Search Optimization / Answer Search Optimization.\n"
        "8. MARKDOWN ONLY: The agent must output clean, raw Markdown structures with no meta preambles."
    )
    
    # Draw box
    pdf.rect(20, pdf.get_y(), 170, 52, "DF")
    
    # Write safety title
    current_y = pdf.get_y()
    pdf.set_y(current_y + 3)
    pdf.set_text_color(*WARNING)
    pdf.set_font("Helvetica", "B", 10)
    pdf.cell(170, 4, "SHARED COMPLIANCE BOUNDARY RULES (SAFETY_CORE)", align="C", new_x="LMARGIN", new_y="NEXT")
    pdf.ln(1)
    
    # Write rules
    pdf.set_text_color(*TEXT_DARK)
    pdf.set_font("Helvetica", "", 8.5)
    pdf.multi_cell(160, 4.2, rules_text, new_x="LMARGIN", new_y="NEXT")
    
    # Bottom margin spacing
    pdf.set_y(current_y + 52)
    pdf.ln(5)
    pdf.paragraph(
        "By enforcing these guardrails at the prompt level and maintaining a strict Human-in-the-Loop "
        "checkpoint, VoiceCare AI scales its LinkedIn reach and improves search citations while keeping "
        "its digital presence 100% compliant and threat-free."
    )
    
    # Save PDF
    pdf.output("growth_engine_workflow.pdf")
    print("PDF compilation completed successfully!")

if __name__ == "__main__":
    build_pdf()
