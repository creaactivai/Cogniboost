"""
Q4 response PDF — answer to Coral's pending question on engineer headcount.

Three numbers she asked for:
  1. Time with ONE engineer + aggressive Claude Code productivity
  2. Time with TWO engineers + aggressive Claude Code productivity
  3. Approximate monthly cost for each option

Time estimates are concrete. Cost is left as [TO BE FILLED] placeholders so
Hermes can plug in his rate model before sending.

Output:
  ~/Desktop/CogniBoost_Q4_Engineer_Headcount_Response.pdf
  handover/CogniBoost_Q4_Engineer_Headcount_Response.pdf (committed copy)

Re-render with:
  python3 handover/build_q4_response_pdf.py
"""

from pathlib import Path
from reportlab.lib.pagesizes import LETTER
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import inch
from reportlab.lib.colors import HexColor, black
from reportlab.lib.enums import TA_LEFT, TA_CENTER
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, PageBreak, Table,
    TableStyle, HRFlowable,
)

# Palette (matches Open Questions PDF)
BLUE       = HexColor("#1E40AF")
BLUE_LIGHT = HexColor("#3B82F6")
SLATE      = HexColor("#334155")
SLATE_LT   = HexColor("#64748B")
AMBER      = HexColor("#D97706")
GREEN      = HexColor("#15803D")
BG_LIGHT   = HexColor("#F8FAFC")
BORDER     = HexColor("#CBD5E1")

OUT_DESKTOP = Path.home() / "Desktop" / "CogniBoost_Q4_Engineer_Headcount_Response.pdf"
OUT_REPO    = Path("/Users/hermesventura/Desktop/Cogniboost/.claude/worktrees/charming-wilson-1044ed/handover/CogniBoost_Q4_Engineer_Headcount_Response.pdf")
OUT_REPO.parent.mkdir(parents=True, exist_ok=True)


def make_styles():
    base = getSampleStyleSheet()
    return dict(
        title = ParagraphStyle(name="TitleC", parent=base["Title"],
            fontName="Helvetica-Bold", fontSize=22, leading=26,
            textColor=BLUE, spaceAfter=4, alignment=TA_LEFT),
        subtitle = ParagraphStyle(name="Subt", parent=base["Normal"],
            fontName="Helvetica", fontSize=12, leading=16,
            textColor=SLATE, spaceAfter=10),
        meta = ParagraphStyle(name="Meta", parent=base["Normal"],
            fontName="Helvetica", fontSize=9, leading=11,
            textColor=SLATE_LT, spaceAfter=18),
        intro = ParagraphStyle(name="Intro", parent=base["Normal"],
            fontName="Helvetica", fontSize=10.5, leading=15,
            textColor=SLATE, spaceAfter=10),
        h1 = ParagraphStyle(name="H1", parent=base["Heading1"],
            fontName="Helvetica-Bold", fontSize=14, leading=18,
            textColor=BLUE, spaceBefore=18, spaceAfter=6, keepWithNext=True),
        h2 = ParagraphStyle(name="H2", parent=base["Heading2"],
            fontName="Helvetica-Bold", fontSize=12, leading=15,
            textColor=BLUE_LIGHT, spaceBefore=12, spaceAfter=4, keepWithNext=True),
        body = ParagraphStyle(name="Body", parent=base["Normal"],
            fontName="Helvetica", fontSize=10, leading=14,
            textColor=black, spaceAfter=6),
        small = ParagraphStyle(name="Small", parent=base["Normal"],
            fontName="Helvetica", fontSize=9, leading=12,
            textColor=SLATE_LT, spaceAfter=4),
        rec_label = ParagraphStyle(name="RecL", parent=base["Normal"],
            fontName="Helvetica-Bold", fontSize=9, leading=11,
            textColor=GREEN, spaceAfter=3),
        tbf_label = ParagraphStyle(name="TBF", parent=base["Normal"],
            fontName="Helvetica-Bold", fontSize=9, leading=11,
            textColor=AMBER, spaceAfter=3),
        footer = ParagraphStyle(name="Foot", parent=base["Normal"],
            fontName="Helvetica", fontSize=8, leading=10,
            textColor=SLATE_LT, alignment=TA_CENTER),
    )


def callout(text, color, bg, styles):
    body = Paragraph(text, styles["body"])
    tbl = Table([[body]], colWidths=[6.4 * inch])
    tbl.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, -1), bg),
        ("BOX",        (0, 0), (-1, -1), 0.75, color),
        ("LEFTPADDING",(0, 0), (-1, -1), 12),
        ("RIGHTPADDING",(0, 0),(-1, -1), 12),
        ("TOPPADDING", (0, 0), (-1, -1), 8),
        ("BOTTOMPADDING",(0,0),(-1, -1), 8),
    ]))
    return tbl


def styled_table(headers, rows, widths, styles):
    data = [headers] + rows
    tbl = Table(data, colWidths=widths)
    tbl.setStyle(TableStyle([
        ("FONTNAME",      (0, 0), (-1, 0), "Helvetica-Bold"),
        ("FONTSIZE",      (0, 0), (-1, 0), 9.5),
        ("TEXTCOLOR",     (0, 0), (-1, 0), HexColor("#FFFFFF")),
        ("BACKGROUND",    (0, 0), (-1, 0), BLUE),
        ("FONTNAME",      (0, 1), (-1, -1), "Helvetica"),
        ("FONTSIZE",      (0, 1), (-1, -1), 9.5),
        ("TEXTCOLOR",     (0, 1), (-1, -1), SLATE),
        ("VALIGN",        (0, 0), (-1, -1), "TOP"),
        ("LEFTPADDING",   (0, 0), (-1, -1), 8),
        ("RIGHTPADDING",  (0, 0), (-1, -1), 8),
        ("TOPPADDING",    (0, 0), (-1, -1), 7),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 7),
        ("ROWBACKGROUNDS",(0, 1), (-1, -1), [HexColor("#FFFFFF"), BG_LIGHT]),
        ("LINEBELOW",     (0, 0), (-1, -1), 0.25, BORDER),
    ]))
    return tbl


# --- Build ----------------------------------------------------------------

styles = make_styles()
story = []

story.append(Paragraph("CogniBoost — Master Plan", styles["title"]))
story.append(Paragraph("Question 4 Response: Engineer Headcount &amp; Timeline", styles["subtitle"]))
story.append(Paragraph(
    "From CogniBoost engineering team to Coral Lozano &nbsp;·&nbsp; May 13, 2026 &nbsp;·&nbsp; cogniboost.co",
    styles["meta"]))
story.append(HRFlowable(width="100%", thickness=0.5, color=BORDER, spaceAfter=14))

# Intro
story.append(Paragraph(
    "You asked for three numbers before deciding on engineer headcount: "
    "(1) time to complete the full v2.0 scope with <b>one engineer + aggressive Claude Code productivity</b>, "
    "(2) time with <b>two engineers + aggressive Claude Code productivity</b>, "
    "and (3) approximate <b>monthly cost</b> for each option, with a target to launch <b>before September</b>.",
    styles["intro"]))
story.append(Paragraph(
    "<b>Status update:</b> Phase 0 (the one-week foundation week) is already shipped. The Claude API "
    "integration, the writing-grader module with the full CEFR rubric A1–C2, the v2.0 schema additions "
    "(<i>submissions, vocabulary, vocabulary_mastery, lab_topics, lab_sessions, lab_registrations, "
    "lab_feedback, listening_assessments, reading_passages, certificates</i>), and the smoke test are all "
    "in production on cogniboost.co as of May 13, 2026 (PR #7). Below is the full remaining plan and the "
    "two paths to ship it.",
    styles["intro"]))

story.append(Spacer(1, 8))
story.append(HRFlowable(width="100%", thickness=0.5, color=BORDER, spaceAfter=8))

# Phase recap
story.append(Paragraph("Remaining Scope (post-Phase 0)", styles["h1"]))
story.append(Paragraph(
    "The work that still needs to ship to call v2.0 launched. All sized as net-new engineering hours; "
    "Phase 0 is excluded.",
    styles["body"]))

story.append(styled_table(
    headers=["Phase", "Deliverables", "Standard est.", "With Claude Code"],
    rows=[
        ["1", Paragraph("Submission API · writing editor · teacher dashboard skeleton · Lesson Library · Lab sessions + feedback form", styles["small"]),
              "~8 weeks", "~5–6 weeks"],
        ["2", Paragraph("Reading + Listening graders · Vocab mastery (SRS) · Student progress dashboard · Annotation tools · One-Click Lesson + Lab Pack generators", styles["small"]),
              "~8 weeks", "~5–6 weeks"],
        ["3", Paragraph("Certification system + public verify · cohort/level analytics · automated nudges · PWA polish · Anthropic billing transition", styles["small"]),
              "~6 weeks", "~4 weeks"],
        [Paragraph("<b>Total</b>", styles["small"]),
              "Complete v2.0 platform",
              Paragraph("<b>~22 weeks</b>", styles["small"]),
              Paragraph("<b>~14–16 weeks</b>", styles["small"])],
    ],
    widths=[0.55 * inch, 3.45 * inch, 1.2 * inch, 1.2 * inch],
    styles=styles,
))
story.append(Paragraph(
    "<i>The compression with aggressive Claude Code productivity is 30–35% — driven by schema scaffolding, "
    "boilerplate API endpoints, React-component scaffolding via shadcn/ui, and prompt-engineering iteration. "
    "Testing and integration time compress less.</i>",
    styles["small"]))

# Option A — one engineer
story.append(Paragraph("Option A — One Engineer + Aggressive Claude Code", styles["h1"]))
story.append(styled_table(
    headers=["Phase", "Duration", "Cumulative", "Calendar (from May 13)"],
    rows=[
        ["1", "~5–6 weeks", "Weeks 1–6",  "May 13 → mid-June"],
        ["2", "~5–6 weeks", "Weeks 7–12", "mid-June → late July"],
        ["3", "~4 weeks",   "Weeks 13–16","late July → late August"],
        [Paragraph("<b>Total</b>", styles["small"]), Paragraph("<b>~14–16 weeks</b>", styles["small"]),
              Paragraph("<b>~3.5–4 months</b>", styles["small"]),
              Paragraph("<b>Launch ~late August</b>", styles["small"])],
    ],
    widths=[0.55 * inch, 1.4 * inch, 1.55 * inch, 2.9 * inch],
    styles=styles,
))
story.append(callout(
    "<b>Verdict — barely makes September.</b> If anything slips by even a week (scope creep on Lesson "
    "Library, AI-grader prompt tuning takes longer to settle, a third-party dependency surprise), launch "
    "moves into September. Doable, but tight. Best for a launch-readiness target of <b>September 1</b>.",
    AMBER, HexColor("#FFFBEB"), styles))

# Option B — two engineers
story.append(Paragraph("Option B — Two Engineers + Aggressive Claude Code", styles["h1"]))
story.append(Paragraph(
    "Two engineers in parallel. One owns backend + schema + AI grading; the other owns frontend + dashboards "
    "+ teacher portal. Coordination overhead at ~15% (PR reviews, schema alignment), so the speedup is not 2×.",
    styles["body"]))
story.append(styled_table(
    headers=["Phase", "Duration", "Cumulative", "Calendar (from May 13)"],
    rows=[
        ["1", "~3 weeks",   "Weeks 1–3",  "May 13 → early June"],
        ["2", "~3 weeks",   "Weeks 4–6",  "early June → late June"],
        ["3", "~2.5 weeks", "Weeks 7–9",  "late June → mid-July"],
        [Paragraph("<b>Total</b>", styles["small"]), Paragraph("<b>~8–9 weeks</b>", styles["small"]),
              Paragraph("<b>~2 months</b>", styles["small"]),
              Paragraph("<b>Launch ~mid-July</b>", styles["small"])],
    ],
    widths=[0.55 * inch, 1.4 * inch, 1.55 * inch, 2.9 * inch],
    styles=styles,
))
story.append(callout(
    "<b>Verdict — comfortably beats September.</b> Mid-July launch leaves ~6 weeks of buffer for soft-launch, "
    "Coral content production, and customer onboarding before the September window. Recommended if budget "
    "permits and the September deadline matters.",
    GREEN, HexColor("#F0FDF4"), styles))

# Cost
story.append(Paragraph("Approximate Monthly Cost", styles["h1"]))
story.append(Paragraph(
    "Cost depends on the engagement model. The numbers below use a placeholder hourly rate so you can pick "
    "the structure that works for you; final pricing is at your discretion and is not yet committed.",
    styles["body"]))

story.append(Paragraph("Engineering effort + Anthropic API + infra", styles["h2"]))
story.append(styled_table(
    headers=["Item", "Option A (1 eng)", "Option B (2 eng)"],
    rows=[
        ["Engineering hours / month",                "~160 hrs/mo",   "~320 hrs/mo (split across 2)"],
        ["Engineering cost / month [TO BE FILLED]",  "$X / month",    "$2X / month"],
        ["Anthropic Claude API (Sonnet + Opus)",      "$30–60",        "$30–60"],
        ["Existing infra (Railway, Vercel, GCS, Stripe fees, Resend, Sentry)", "~$50",          "~$50"],
        [Paragraph("<b>Total monthly burn</b>", styles["small"]),
                                                     Paragraph("<b>$X + ~$100</b>", styles["small"]),
                                                     Paragraph("<b>$2X + ~$100</b>", styles["small"])],
    ],
    widths=[3.1 * inch, 1.65 * inch, 1.65 * inch],
    styles=styles,
))

story.append(Paragraph("Total project cost (engineering only)", styles["h2"]))
story.append(styled_table(
    headers=["Option", "Duration", "Eng hours total", "Eng cost total [TO BE FILLED]"],
    rows=[
        ["A — 1 engineer",  "~3.5–4 months",  "~600 hrs",  "$X × 600 hrs"],
        ["B — 2 engineers", "~2 months",      "~640 hrs",  "$X × 640 hrs"],
    ],
    widths=[1.4 * inch, 1.4 * inch, 1.45 * inch, 2.15 * inch],
    styles=styles,
))
story.append(Paragraph(
    "<b>Note:</b> total engineering hours are roughly comparable across both options — two engineers in "
    "parallel save calendar time, not total hours. The choice is between <i>longer engagement at lower "
    "monthly burn</i> (Option A) vs <i>shorter engagement at higher monthly burn but earlier launch</i> "
    "(Option B). Anthropic API usage is the same in both.",
    styles["small"]))

# Recommendation
story.append(Paragraph("Recommendation", styles["h1"]))
story.append(callout(
    "<b>Option B — Two engineers</b>, if the September launch target matters. The ~$X/month additional "
    "monthly cost buys ~6 weeks of de-risking buffer before the deadline, plus parallel work means a "
    "frontend engineer can polish UX while the backend engineer optimizes grading throughput. "
    "<br/><br/>"
    "<b>Option A — One engineer</b> is acceptable if the September date is soft and lower monthly burn is "
    "the priority. The August finish is real but fragile — any one-week slip pushes into September.",
    GREEN, HexColor("#F0FDF4"), styles))

# Decision
story.append(Paragraph("Decision Request", styles["h1"]))
story.append(Paragraph(
    "Pick one. We can kick off Phase 1 immediately on confirmation.",
    styles["body"]))
story.append(styled_table(
    headers=["", "Choice"],
    rows=[
        ["☐", "Option A — One engineer + aggressive Claude Code (launch ~late August, fragile)"],
        ["☐", "Option B — Two engineers + aggressive Claude Code (launch ~mid-July, recommended)"],
        ["☐", "Other (free text — please describe)"],
    ],
    widths=[0.4 * inch, 6.0 * inch],
    styles=styles,
))

# Next step
story.append(Paragraph("Next Step", styles["h1"]))
story.append(Paragraph(
    "<b>1.</b> You confirm Option A or B and we lock the kickoff cadence.",
    styles["body"]))
story.append(Paragraph(
    "<b>2.</b> First Phase 1 deliverable is the Submission API + writing editor — end-to-end visible "
    "on cogniboost.co within 5 working days.",
    styles["body"]))
story.append(Paragraph(
    "<b>3.</b> If you want a fixed-fee structure rather than hourly, we can quote that off this scope. "
    "Range of acceptable risk on a fixed fee is wider — we'd ask for a +20% buffer to absorb the inherent "
    "uncertainty in v2.0 features that haven't been built before (Lab Packs, vocabulary-mastery SRS, "
    "Spanish L1 grading patterns).",
    styles["body"]))

story.append(Spacer(1, 12))
story.append(HRFlowable(width="100%", thickness=0.5, color=BORDER, spaceAfter=10))
story.append(Paragraph(
    "This document accompanies the revised <i>MASTER_PLAN_REVISED.md</i> in the project repo "
    "(reflecting Coral's locked decisions Q1, Q2, Q3, Q5, Q6, Q7 + v2.0 academic-model updates). "
    "Question 4 is the last gating decision before Phase 1 kickoff.",
    styles["meta"]))


# Footer
def add_page_number(canvas, doc):
    canvas.saveState()
    canvas.setFont("Helvetica", 8)
    canvas.setFillColor(SLATE_LT)
    canvas.drawCentredString(LETTER[0] / 2, 0.4 * inch,
        f"CogniBoost — Q4 Response: Engineer Headcount &amp; Timeline    ·    Page {doc.page}")
    canvas.restoreState()


def build(path: Path):
    doc = SimpleDocTemplate(
        str(path), pagesize=LETTER,
        leftMargin=1 * inch, rightMargin=1 * inch,
        topMargin=0.8 * inch, bottomMargin=0.7 * inch,
        title="CogniBoost — Q4 Response",
        author="CogniBoost Engineering",
        subject="Engineer headcount + timeline + cost (response to Coral)",
    )
    doc.build(story, onFirstPage=add_page_number, onLaterPages=add_page_number)
    print(f"✓ wrote {path}")


if __name__ == "__main__":
    build(OUT_DESKTOP)
    import shutil
    shutil.copy2(OUT_DESKTOP, OUT_REPO)
    print(f"✓ copied to {OUT_REPO}")
