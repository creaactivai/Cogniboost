"""
Generates the client-facing Open Questions PDF for the CogniBoost
Master Plan kickoff decisions.

Output: ~/Desktop/CogniBoost_Open_Questions_for_Client.pdf
Also saves a copy alongside the handover docs in the project repo.
"""

from pathlib import Path
from reportlab.lib.pagesizes import LETTER
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import inch
from reportlab.lib.colors import HexColor, black, grey
from reportlab.lib.enums import TA_LEFT, TA_CENTER
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, PageBreak, Table,
    TableStyle, KeepTogether, HRFlowable,
)

# Brand-adjacent palette
BLUE       = HexColor("#1E40AF")   # primary
BLUE_LIGHT = HexColor("#3B82F6")
SLATE      = HexColor("#334155")
SLATE_LT   = HexColor("#64748B")
AMBER      = HexColor("#D97706")
GREEN      = HexColor("#15803D")
BG_LIGHT   = HexColor("#F8FAFC")
BORDER     = HexColor("#CBD5E1")

# Output paths
OUT_DESKTOP = Path.home() / "Desktop" / "CogniBoost_Open_Questions_for_Client.pdf"
OUT_REPO    = Path("/Users/hermesventura/Desktop/Cogniboost/.claude/worktrees/charming-wilson-1044ed/handover/CogniBoost_Open_Questions_for_Client.pdf")
OUT_REPO.parent.mkdir(parents=True, exist_ok=True)


def make_styles():
    base = getSampleStyleSheet()

    title = ParagraphStyle(
        name="TitleCustom", parent=base["Title"],
        fontName="Helvetica-Bold", fontSize=22, leading=26,
        textColor=BLUE, spaceAfter=4, alignment=TA_LEFT,
    )
    subtitle = ParagraphStyle(
        name="Subtitle", parent=base["Normal"],
        fontName="Helvetica", fontSize=12, leading=16,
        textColor=SLATE, spaceAfter=10,
    )
    meta = ParagraphStyle(
        name="Meta", parent=base["Normal"],
        fontName="Helvetica", fontSize=9, leading=11,
        textColor=SLATE_LT, spaceAfter=18,
    )
    intro = ParagraphStyle(
        name="Intro", parent=base["Normal"],
        fontName="Helvetica", fontSize=10.5, leading=15,
        textColor=SLATE, spaceAfter=10,
    )
    h1 = ParagraphStyle(
        name="H1", parent=base["Heading1"],
        fontName="Helvetica-Bold", fontSize=14, leading=18,
        textColor=BLUE, spaceBefore=20, spaceAfter=4, keepWithNext=True,
    )
    q_number = ParagraphStyle(
        name="QNumber", parent=base["Normal"],
        fontName="Helvetica-Bold", fontSize=10, leading=12,
        textColor=BLUE_LIGHT, spaceAfter=2,
    )
    q_title = ParagraphStyle(
        name="QTitle", parent=base["Heading2"],
        fontName="Helvetica-Bold", fontSize=14, leading=18,
        textColor=BLUE, spaceBefore=14, spaceAfter=6, keepWithNext=True,
    )
    label = ParagraphStyle(
        name="Label", parent=base["Normal"],
        fontName="Helvetica-Bold", fontSize=9.5, leading=12,
        textColor=SLATE, spaceBefore=8, spaceAfter=2, keepWithNext=True,
    )
    body = ParagraphStyle(
        name="Body", parent=base["Normal"],
        fontName="Helvetica", fontSize=10, leading=14,
        textColor=black, spaceAfter=6, alignment=TA_LEFT,
    )
    bullet = ParagraphStyle(
        name="Bullet", parent=body,
        leftIndent=14, bulletIndent=2, spaceAfter=2,
    )
    rec_box_body = ParagraphStyle(
        name="RecBoxBody", parent=base["Normal"],
        fontName="Helvetica", fontSize=10, leading=14,
        textColor=black, spaceAfter=0, alignment=TA_LEFT,
    )
    rec_label = ParagraphStyle(
        name="RecLabel", parent=base["Normal"],
        fontName="Helvetica-Bold", fontSize=9, leading=11,
        textColor=GREEN, spaceAfter=3,
    )
    response_label = ParagraphStyle(
        name="ResponseLabel", parent=base["Normal"],
        fontName="Helvetica-Bold", fontSize=9, leading=11,
        textColor=AMBER, spaceBefore=10, spaceAfter=4,
    )
    footer = ParagraphStyle(
        name="Footer", parent=base["Normal"],
        fontName="Helvetica", fontSize=8, leading=10,
        textColor=SLATE_LT, alignment=TA_CENTER,
    )
    return dict(
        title=title, subtitle=subtitle, meta=meta, intro=intro,
        h1=h1, q_number=q_number, q_title=q_title, label=label,
        body=body, bullet=bullet,
        rec_box_body=rec_box_body, rec_label=rec_label,
        response_label=response_label, footer=footer,
    )


def recommendation_box(text, styles):
    """Green-tinted call-out for the recommendation."""
    label = Paragraph("RECOMMENDED PATH", styles["rec_label"])
    body  = Paragraph(text, styles["rec_box_body"])
    tbl = Table([[label], [body]], colWidths=[6.4 * inch])
    tbl.setStyle(TableStyle([
        ("BACKGROUND",  (0, 0), (-1, -1), HexColor("#F0FDF4")),
        ("BOX",         (0, 0), (-1, -1), 0.75, GREEN),
        ("LEFTPADDING", (0, 0), (-1, -1), 12),
        ("RIGHTPADDING",(0, 0), (-1, -1), 12),
        ("TOPPADDING",  (0, 0), (-1, -1), 8),
        ("BOTTOMPADDING",(0, 0),(-1, -1), 8),
    ]))
    return tbl


def response_block(styles, lines=2):
    """A bordered area for the client to write their decision."""
    height = 0.45 * inch * lines
    cells = [[""]] * lines
    tbl = Table(cells, colWidths=[6.4 * inch], rowHeights=[0.45 * inch] * lines)
    tbl.setStyle(TableStyle([
        ("BACKGROUND",  (0, 0), (-1, -1), BG_LIGHT),
        ("LINEBELOW",   (0, 0), (-1, -1), 0.5, BORDER),
        ("BOX",         (0, 0), (-1, -1), 0.5, BORDER),
        ("LEFTPADDING", (0, 0), (-1, -1), 8),
        ("TOPPADDING",  (0, 0), (-1, -1), 4),
        ("BOTTOMPADDING",(0, 0), (-1, -1), 4),
    ]))
    return tbl


def options_table(rows, styles):
    """Pipe-style options table: Option label | description."""
    data = []
    for opt, desc in rows:
        opt_p  = Paragraph(f"<b>{opt}</b>", styles["body"])
        desc_p = Paragraph(desc, styles["body"])
        data.append([opt_p, desc_p])
    tbl = Table(data, colWidths=[1.4 * inch, 5.0 * inch])
    tbl.setStyle(TableStyle([
        ("VALIGN",      (0, 0), (-1, -1), "TOP"),
        ("LEFTPADDING", (0, 0), (-1, -1), 6),
        ("RIGHTPADDING",(0, 0), (-1, -1), 6),
        ("TOPPADDING",  (0, 0), (-1, -1), 6),
        ("BOTTOMPADDING",(0, 0),(-1, -1), 6),
        ("LINEBELOW",   (0, 0), (-1, -2), 0.25, BORDER),
        ("BACKGROUND",  (0, 0), (0, -1), BG_LIGHT),
    ]))
    return tbl


# --- Build the document ----------------------------------------------------

styles = make_styles()

story = []

# Header / title
story.append(Paragraph("CogniBoost — Master Plan", styles["title"]))
story.append(Paragraph(
    "Open Questions for the Client",
    styles["subtitle"],
))
story.append(Paragraph(
    "Pre-kickoff decisions required before Phase 0 engineering begins<br/>"
    "Document version 1.0 &nbsp;·&nbsp; May 8, 2026 &nbsp;·&nbsp; cogniboost.co",
    styles["meta"],
))
story.append(HRFlowable(width="100%", thickness=0.5, color=BORDER, spaceAfter=14))

# Intro
story.append(Paragraph(
    "We have reviewed the <b>Master Engineering &amp; Content Plan v1.0</b> (May 2026) "
    "in full. The plan is sound. Before engineering work begins, seven decisions are required from your side. "
    "These are not engineering preferences — they are product, business, and operational choices that determine "
    "scope, timeline, and cost. We've documented our recommendation for each, with reasoning, so the discussion is short.",
    styles["intro"],
))
story.append(Paragraph(
    "Please review and either confirm the recommendation or note any adjustment in the response field below each question. "
    "Once all seven are locked, we begin Phase 0 (week 1) immediately.",
    styles["intro"],
))

story.append(Spacer(1, 12))
story.append(HRFlowable(width="100%", thickness=0.5, color=BORDER, spaceAfter=10))

# ---------- QUESTION 1 ----------
story.append(Paragraph("QUESTION 1 OF 7", styles["q_number"]))
story.append(Paragraph("Cohort model vs self-paced", styles["q_title"]))
story.append(Paragraph(
    "The Master Plan structures the entire student experience around <b>8-week cohorts</b>: students enrolled "
    "in Week 3 of B1 all work on the same lesson at the same time, with synchronous Conversation Labs. "
    "CogniBoost today is <b>self-paced</b> — students enroll and progress at their own speed.",
    styles["body"],
))
story.append(Paragraph(
    "This is the most strategically important question. It affects schema, marketing, and operational rhythm.",
    styles["body"],
))

story.append(Paragraph("OPTIONS", styles["label"]))
story.append(options_table([
    ("A — Strict cohort",
     "Replace self-paced with cohort-only. Sharpest marketing story (\"Certified at B1 in 8 weeks\"). "
     "Adds operational overhead — admin must run weekly or monthly enrollment cohorts, and each cohort requires "
     "a teacher commitment for the full 8 weeks. Higher friction on signups."),
    ("B — Self-paced only",
     "Keep current model. Existing students unaffected. Live Labs become less coherent because students are on "
     "different material. Certification stays loose."),
    ("C — Cohort-aware, optional <i>(recommended)</i>",
     "Add nullable <i>cohort_id</i> to the user record. Cohort members get the synchronized weekly rhythm and "
     "structured Labs; non-cohort users keep self-paced. Marketing can gradually shift toward cohort-first as "
     "the content library matures."),
], styles))

story.append(recommendation_box(
    "<b>Option C — Cohort-aware, optional.</b> Lets you preserve the existing self-paced student base while "
    "introducing cohort cohorts as the premium track. No forced migration, no marketing-funnel friction during "
    "the rollout. Migrate marketing toward cohort-first over the next 12 months as content depth justifies it.",
    styles,
))
story.append(Paragraph("YOUR DECISION", styles["response_label"]))
story.append(response_block(styles, lines=2))


# ---------- QUESTION 2 ----------
story.append(PageBreak())
story.append(Paragraph("QUESTION 2 OF 7", styles["q_number"]))
story.append(Paragraph("Ms. Coral mobile app — build scaffolding now, or defer?", styles["q_title"]))
story.append(Paragraph(
    "The Master Plan repeatedly references <b>Ms. Coral</b> — a separate mobile speaking-practice app — and "
    "proposes building the integration scaffolding inside CogniBoost now (deep links, feature flag, "
    "<i>speaking_sessions</i> table) with everything pending until the mobile app launches.",
    styles["body"],
))
story.append(Paragraph(
    "Reality check: the Ms. Coral mobile app is not built. It needs its own codebase (React Native or native), "
    "its own developer or team, and roughly 3–6 months of focused work for a v1. Until that project is staffed, "
    "scaffolding inside CogniBoost generates code that decays.",
    styles["body"],
))

story.append(Paragraph("OPTIONS", styles["label"]))
story.append(options_table([
    ("A — Build scaffolding now",
     "Add <i>speaking_sessions</i> table, deep-link buttons (feature-flagged off), waitlist email capture. "
     "Code sits idle until Ms. Coral launches. Acceptable only if a parallel mobile-app build is staffed and timed."),
    ("B — Defer scaffolding <i>(recommended)</i>",
     "Don't add Ms. Coral code until the mobile project actually starts. When it kicks off, add the integration "
     "scaffolding in parallel with the mobile build. Avoids ~2 weeks of dead code in the curriculum platform."),
    ("C — Scope Ms. Coral as a parallel project",
     "Treat mobile app as a separate engagement with its own developer, budget, and timeline. CogniBoost engineering "
     "stays focused on curriculum platform. Coordinate launch dates."),
], styles))

story.append(recommendation_box(
    "<b>Option B — Defer scaffolding</b>, unless the Ms. Coral mobile app is being built in parallel by another team. "
    "If a mobile developer is starting now, we can scope Option A — but we need to know that today before Phase 0.",
    styles,
))
story.append(Paragraph("YOUR DECISION", styles["response_label"]))
story.append(response_block(styles, lines=2))


# ---------- QUESTION 3 ----------
story.append(Paragraph("QUESTION 3 OF 7", styles["q_number"]))
story.append(Paragraph("Certification — wording and accreditation aspiration", styles["q_title"]))
story.append(Paragraph(
    "The Master Plan specifies real certificates with a public verification page "
    "(<i>cogniboost.co/verify/[code]</i>), QR codes, and LinkedIn integration. If issued certificates use language "
    "like &ldquo;CEFR B1 Certified,&rdquo; we are implicitly making claims about CEFR equivalence — claims that need "
    "to be defensible if challenged by an employer or accreditation body.",
    styles["body"],
))

story.append(Paragraph("OPTIONS", styles["label"]))
story.append(options_table([
    ("A — Conservative wording <i>(recommended)</i>",
     "&ldquo;CogniBoost B1 Completion Certificate, aligned with CEFR descriptors.&rdquo; Safe, honest, "
     "no accreditation body required. Easiest to defend."),
    ("B — Stronger wording, no accreditation",
     "&ldquo;CEFR B1 Certified&rdquo; or similar. Higher marketing impact but exposes us to legal risk if challenged. "
     "Some students or employers may dispute equivalence."),
    ("C — Pursue real accreditation",
     "Apply for recognition through a CEFR-aligned body (Cambridge English Profile, CEFR-J, or a local accreditation "
     "agency in the target country). Adds months of regulatory work and ongoing compliance cost, but legitimizes the "
     "strongest wording."),
], styles))

story.append(recommendation_box(
    "<b>Option A — Conservative wording for v1.</b> Build the full verification infrastructure (page, QR, LinkedIn) "
    "but phrase certificates as <i>aligned with</i> CEFR rather than <i>certified at</i>. If international "
    "recognition becomes a strategic priority later, Option C can be pursued without changing the codebase.",
    styles,
))
story.append(Paragraph("YOUR DECISION", styles["response_label"]))
story.append(response_block(styles, lines=2))


# ---------- QUESTION 4 ----------
story.append(PageBreak())
story.append(Paragraph("QUESTION 4 OF 7", styles["q_number"]))
story.append(Paragraph("One engineer or two?", styles["q_title"]))
story.append(Paragraph(
    "The plan estimates 5–7 months solo or 3–4 months with two engineers. Our revised timeline confirms this: "
    "<b>23 weeks (~5.5 months) solo</b> or <b>~3.5 months with two engineers</b> working in parallel "
    "(one on schema + backend, one on frontend + dashboards).",
    styles["body"],
))

story.append(Paragraph("OPTIONS", styles["label"]))
story.append(options_table([
    ("A — One engineer",
     "Sequential delivery. Lower monthly burn. Phase 1 ready ~Week 9 (~2 months), Phase 2 ~Week 17 (~4 months), "
     "Phase 3 ~Week 23 (~5.5 months total)."),
    ("B — Two engineers <i>(recommended if budget allows)</i>",
     "Parallel delivery. Roughly 2x monthly burn. Phase 1 ready ~Week 5, Phase 2 ~Week 10, Phase 3 ~Week 14 "
     "(~3.5 months total). Ships about 2 months earlier."),
], styles))

story.append(recommendation_box(
    "<b>Option B — Two engineers</b> if your launch timeline is tied to a back-to-school or quarterly marketing window. "
    "<b>Option A — One engineer</b> if cash flow is the constraint or there is no hard deadline. Either path delivers "
    "the same scope.",
    styles,
))
story.append(Paragraph("YOUR DECISION", styles["response_label"]))
story.append(response_block(styles, lines=2))


# ---------- QUESTION 5 ----------
story.append(Paragraph("QUESTION 5 OF 7", styles["q_number"]))
story.append(Paragraph("Tolerance for brief disruption during refactors", styles["q_title"]))
story.append(Paragraph(
    "Some schema changes (e.g., adding <i>submissions</i> table) are purely additive and zero-risk. Others "
    "(e.g., adjusting how the <i>users</i> table represents student state) could cause existing logged-in "
    "users to be briefly logged out — typically 30 seconds during the deploy window — or require a one-time data backfill.",
    styles["body"],
))

story.append(Paragraph("OPTIONS", styles["label"]))
story.append(options_table([
    ("A — Brief disruption OK <i>(recommended)</i>",
     "Schedule any disruptive deploys for low-traffic windows (Sundays, late evenings, target-market local time). "
     "Communicate to active users in advance. Faster engineering, simpler code paths."),
    ("B — Zero-downtime required",
     "Every change must be split into multiple deploys with backward-compatible intermediate states. Adds "
     "~20% engineering time. Justified only if you have enterprise contracts with strict SLAs."),
], styles))

story.append(recommendation_box(
    "<b>Option A — Brief disruption OK.</b> CogniBoost is consumer-grade SaaS; a 30-second blip during a Sunday "
    "evening deploy is fully acceptable and saves meaningful engineering effort. If enterprise SLAs are signed "
    "later, we revisit.",
    styles,
))
story.append(Paragraph("YOUR DECISION", styles["response_label"]))
story.append(response_block(styles, lines=2))


# ---------- QUESTION 6 ----------
story.append(PageBreak())
story.append(Paragraph("QUESTION 6 OF 7", styles["q_number"]))
story.append(Paragraph("AI grading — auto-publish, or teacher-review-first?", styles["q_title"]))
story.append(Paragraph(
    "When AI grades a student's writing or open-ended reading response, the grade can either appear to the student "
    "<b>immediately</b> (with a &lsquo;Flag this grade&rsquo; button for disputes) or be held in a "
    "<b>teacher review queue</b> until a human approves.",
    styles["body"],
))
story.append(Paragraph(
    "The original plan explicitly recommends teacher-review-first for the first 60 days of operation to identify "
    "and fix prompt issues before students see grading inconsistencies.",
    styles["body"],
))

story.append(Paragraph("OPTIONS", styles["label"]))
story.append(options_table([
    ("A — Teacher-review-first for 60 days, then auto-publish <i>(recommended)</i>",
     "Build both modes from day one. Default to teacher-review for the first 60 days. After teacher overrides "
     "stabilize (i.e., teachers rarely change AI grades), flip to auto-publish with optional teacher spot-check."),
    ("B — Always teacher-review-first",
     "Highest quality bar, slowest student feedback loop. Acceptable if teachers can review within 24 hours; "
     "frustrating if turnaround is longer."),
    ("C — Always auto-publish",
     "Fastest student feedback. Higher risk during the first 60 days when AI grading prompts are still being tuned. "
     "Students may lose trust if early grades are visibly off."),
], styles))

story.append(recommendation_box(
    "<b>Option A — Teacher-review-first for 60 days, then auto-publish.</b> Matches the original plan and gives us a "
    "window to calibrate the grading prompts using real teacher overrides as training signal.",
    styles,
))
story.append(Paragraph("YOUR DECISION", styles["response_label"]))
story.append(response_block(styles, lines=2))


# ---------- QUESTION 7 ----------
story.append(Paragraph("QUESTION 7 OF 7", styles["q_number"]))
story.append(Paragraph("Anthropic API billing — your account, or under our umbrella?", styles["q_title"]))
story.append(Paragraph(
    "The Master Plan correctly identifies Anthropic's Claude API as the right grading and content-generation engine. "
    "Estimated cost at projected v1 volumes: <b>$20–50 / month</b> (cheap by infrastructure standards, but a "
    "recurring expense someone has to own).",
    styles["body"],
))

story.append(Paragraph("OPTIONS", styles["label"]))
story.append(options_table([
    ("A — Client's own Anthropic account",
     "You create the account, add a payment method, set a monthly budget cap. We add the API key to Railway env vars. "
     "Direct cost transparency, no markup, full ownership."),
    ("B — Under our existing umbrella (passthrough)",
     "We bill API usage to our existing Anthropic account and pass through actual cost (+0% markup) on a monthly invoice. "
     "Simpler for you operationally; you don't deal with Anthropic billing. Suitable for v1."),
    ("C — Hybrid: ours for v1, yours by Phase 3",
     "Start under our umbrella, migrate to your account during Phase 3 polish. Lets the engineering team validate "
     "usage patterns before you commit to your own account setup."),
], styles))

story.append(recommendation_box(
    "<b>Option B for v1, then Option C by Phase 3.</b> Removes one operational decision from the kickoff so we don't "
    "block on payment-method setup. By Phase 3 you'll have actual usage numbers to size your own account correctly.",
    styles,
))
story.append(Paragraph("YOUR DECISION", styles["response_label"]))
story.append(response_block(styles, lines=2))


# ---------- Final page: summary + next steps ----------
story.append(PageBreak())
story.append(Paragraph("Decision Summary", styles["h1"]))
story.append(Spacer(1, 8))

summary_data = [
    ["#", "Question", "Our recommendation"],
    ["1", "Cohort vs self-paced",                 "Cohort-aware, optional (Option C)"],
    ["2", "Ms. Coral mobile scaffolding",          "Defer (Option B)"],
    ["3", "Certificate wording",                   "Conservative — \"CEFR-aligned\" (Option A)"],
    ["4", "Engineer headcount",                    "Two engineers if budget permits (Option B)"],
    ["5", "Refactor disruption tolerance",         "Brief downtime OK (Option A)"],
    ["6", "AI grading visibility",                 "Teacher-review for 60 days (Option A)"],
    ["7", "Anthropic billing",                     "Our umbrella for v1 → yours by Phase 3 (B → C)"],
]
tbl = Table(summary_data, colWidths=[0.4*inch, 2.6*inch, 3.4*inch])
tbl.setStyle(TableStyle([
    ("FONTNAME",    (0, 0), (-1, 0), "Helvetica-Bold"),
    ("FONTSIZE",    (0, 0), (-1, 0), 10),
    ("TEXTCOLOR",   (0, 0), (-1, 0), HexColor("#FFFFFF")),
    ("BACKGROUND",  (0, 0), (-1, 0), BLUE),
    ("FONTNAME",    (0, 1), (-1, -1), "Helvetica"),
    ("FONTSIZE",    (0, 1), (-1, -1), 9.5),
    ("TEXTCOLOR",   (0, 1), (-1, -1), SLATE),
    ("ALIGN",       (0, 0), (0, -1), "CENTER"),
    ("VALIGN",      (0, 0), (-1, -1), "MIDDLE"),
    ("LEFTPADDING", (0, 0), (-1, -1), 6),
    ("RIGHTPADDING",(0, 0), (-1, -1), 6),
    ("TOPPADDING",  (0, 0), (-1, -1), 8),
    ("BOTTOMPADDING",(0, 0),(-1, -1), 8),
    ("ROWBACKGROUNDS",(0, 1),(-1, -1), [HexColor("#FFFFFF"), BG_LIGHT]),
    ("LINEBELOW",   (0, 0), (-1, -1), 0.25, BORDER),
]))
story.append(tbl)

story.append(Paragraph("Next steps", styles["h1"]))
story.append(Paragraph(
    "<b>1.</b> Schedule a 60-minute call to walk through these seven decisions together. "
    "We'll discuss the reasoning behind each recommendation and answer any clarifying questions.",
    styles["body"],
))
story.append(Paragraph(
    "<b>2.</b> Confirm each decision in writing (this document, or by email). The lock state for all seven gates Phase 0 kickoff.",
    styles["body"],
))
story.append(Paragraph(
    "<b>3.</b> Phase 0 begins: stack adjustments (adopt Claude, merge schema additions, smoke-test the writing grading "
    "prompt end-to-end with one essay). One week.",
    styles["body"],
))
story.append(Paragraph(
    "<b>4.</b> Phase 1 begins: AI-graded writing system + teacher dashboard + Lesson Library + Lab feedback form. "
    "Eight weeks.",
    styles["body"],
))

story.append(Spacer(1, 18))
story.append(HRFlowable(width="100%", thickness=0.5, color=BORDER, spaceAfter=10))
story.append(Paragraph(
    "This document is internal between CogniBoost and its engineering partner. "
    "It accompanies the Master Engineering &amp; Content Plan v1.0 (May 2026) and the revised execution plan "
    "(<i>MASTER_PLAN_REVISED.md</i>) in the project repository.",
    styles["meta"],
))


# --- Page numbering --------------------------------------------------------

def add_page_number(canvas, doc):
    canvas.saveState()
    canvas.setFont("Helvetica", 8)
    canvas.setFillColor(SLATE_LT)
    page_text = f"CogniBoost — Open Questions for the Client    ·    Page {doc.page}"
    canvas.drawCentredString(LETTER[0] / 2, 0.4 * inch, page_text)
    canvas.restoreState()


# --- Render ----------------------------------------------------------------

def build(path: Path):
    doc = SimpleDocTemplate(
        str(path), pagesize=LETTER,
        leftMargin=1 * inch, rightMargin=1 * inch,
        topMargin=0.8 * inch, bottomMargin=0.7 * inch,
        title="CogniBoost — Open Questions for the Client",
        author="CogniBoost Engineering",
        subject="Pre-kickoff decisions for the Master Engineering Plan",
    )
    doc.build(story, onFirstPage=add_page_number, onLaterPages=add_page_number)
    print(f"✓ wrote {path}")


if __name__ == "__main__":
    build(OUT_DESKTOP)
    # Reset the story for the second build (Platypus consumes it)
    # Re-run by re-importing this script is ugly; just copy the file instead
    import shutil
    shutil.copy2(OUT_DESKTOP, OUT_REPO)
    print(f"✓ copied to {OUT_REPO}")
