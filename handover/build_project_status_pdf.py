"""
Master handover PDF — CogniBoost_Project_Status_Final.pdf

Audience: Coral Lozano (incoming owner).
Single artifact she reads top-to-bottom to understand:
  - what's live on production today
  - what's pending with effort estimates
  - how to operate
  - how ownership transfers to her
  - decisions locked + open items

Output:
  ~/Desktop/CogniBoost_Project_Status_Final.pdf
  handover/CogniBoost_Project_Status_Final.pdf (committed copy)
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

BLUE       = HexColor("#1E40AF")
BLUE_LIGHT = HexColor("#3B82F6")
SLATE      = HexColor("#334155")
SLATE_LT   = HexColor("#64748B")
AMBER      = HexColor("#D97706")
GREEN      = HexColor("#15803D")
RED        = HexColor("#B91C1C")
BG_LIGHT   = HexColor("#F8FAFC")
BORDER     = HexColor("#CBD5E1")

OUT_DESKTOP = Path.home() / "Desktop" / "CogniBoost_Project_Status_Final.pdf"
OUT_REPO    = Path("/Users/hermesventura/Desktop/Cogniboost/.claude/worktrees/charming-wilson-1044ed/handover/CogniBoost_Project_Status_Final.pdf")
OUT_REPO.parent.mkdir(parents=True, exist_ok=True)


def make_styles():
    base = getSampleStyleSheet()
    return dict(
        title=ParagraphStyle(name="TitleC", parent=base["Title"],
            fontName="Helvetica-Bold", fontSize=24, leading=28,
            textColor=BLUE, spaceAfter=4, alignment=TA_LEFT),
        subtitle=ParagraphStyle(name="Subt", parent=base["Normal"],
            fontName="Helvetica", fontSize=13, leading=17,
            textColor=SLATE, spaceAfter=10),
        meta=ParagraphStyle(name="Meta", parent=base["Normal"],
            fontName="Helvetica", fontSize=9, leading=11,
            textColor=SLATE_LT, spaceAfter=18),
        intro=ParagraphStyle(name="Intro", parent=base["Normal"],
            fontName="Helvetica", fontSize=10.5, leading=15,
            textColor=SLATE, spaceAfter=10),
        h1=ParagraphStyle(name="H1", parent=base["Heading1"],
            fontName="Helvetica-Bold", fontSize=16, leading=20,
            textColor=BLUE, spaceBefore=18, spaceAfter=6, keepWithNext=True),
        h2=ParagraphStyle(name="H2", parent=base["Heading2"],
            fontName="Helvetica-Bold", fontSize=12, leading=15,
            textColor=BLUE_LIGHT, spaceBefore=14, spaceAfter=4, keepWithNext=True),
        body=ParagraphStyle(name="Body", parent=base["Normal"],
            fontName="Helvetica", fontSize=10, leading=14,
            textColor=black, spaceAfter=6),
        small=ParagraphStyle(name="Small", parent=base["Normal"],
            fontName="Helvetica", fontSize=9, leading=12,
            textColor=SLATE_LT, spaceAfter=4),
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


def styled_table(headers, rows, widths, styles, paragraph_cells=False):
    if paragraph_cells:
        wrapped_rows = []
        for r in rows:
            wrapped_rows.append([
                Paragraph(c, styles["body"]) if isinstance(c, str) else c
                for c in r
            ])
        data = [headers] + wrapped_rows
    else:
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


styles = make_styles()
story = []

# Title page
story.append(Paragraph("CogniBoost", styles["title"]))
story.append(Paragraph("Project Status &amp; Final Handover", styles["subtitle"]))
story.append(Paragraph(
    "Engagement transitioning to <b>full handover</b>. Coral Lozano (CogniBoost ESL Academy) takes "
    "ownership of code, infrastructure, accounts, and project management.<br/><br/>"
    "Document version 1.0 &nbsp;·&nbsp; May 14, 2026 &nbsp;·&nbsp; cogniboost.co",
    styles["meta"]))
story.append(HRFlowable(width="100%", thickness=0.5, color=BORDER, spaceAfter=14))

# §1 Executive Summary
story.append(Paragraph("1. Executive Summary", styles["h1"]))
story.append(Paragraph(
    "CogniBoost is a live, revenue-generating ESL platform at <b>cogniboost.co</b>. The platform is "
    "online and serving paying students today. Over the May 2026 engagement, we shipped a foundation "
    "layer of resilience fixes followed by Phases 0 and 1 of the v2.0 Master Plan build (per your "
    "May 13 locked decisions).",
    styles["body"]))
story.append(Paragraph(
    "This document gives you a complete picture of what's live, what's pending, how to operate the "
    "platform, how ownership transfers to you, and what decisions remain open.",
    styles["body"]))
story.append(callout(
    "<b>Read this end-to-end, then <i>HANDOVER_TRANSFER_CHECKLIST.md</i> for the action plan.</b>",
    BLUE, HexColor("#EFF6FF"), styles))

# §2 What's Live (Done)
story.append(Paragraph("2. What's Live on Production (Done)", styles["h1"]))

story.append(Paragraph("2.1 Resilience baseline (PRs #1-5, May 5-6, 2026)", styles["h2"]))
story.append(Paragraph(
    "Discovered and resolved a <b>two-month silent deploy outage</b>. All deploys had been failing since "
    "2026-03-05 due to a Railway/Nixpacks behavior change; production was stuck on the March 5 build "
    "for two months. Five resilience PRs shipped:",
    styles["body"]))
story.append(styled_table(
    headers=["#", "Fix"],
    rows=[
        ["1", Paragraph("Quiz crashes — 0-question NaN, AI quiz validation, video-quiz progress refresh", styles["body"])],
        ["2", Paragraph("Stripe customer re-link (Reinilza-class) + iOS Safari cookie + duplicate-email login", styles["body"])],
        ["3", Paragraph("Stripe webhook idempotency (atomic event-ID claim)", styles["body"])],
        ["4", Paragraph("Rate limiters mounted on the correct paths (login + checkout)", styles["body"])],
        ["5", Paragraph("Railway build unblocker (<i>npm ci --include=dev</i>) — unblocked 2 months of deploys", styles["body"])],
    ],
    widths=[0.4 * inch, 6.0 * inch], styles=styles,
))

story.append(Paragraph("2.2 Phase 0 — Foundation (May 13)", styles["h2"]))
story.append(styled_table(
    headers=["Component", "Status"],
    rows=[
        ["Anthropic Claude SDK adopted",                Paragraph("Live · refuses Replit-style proxy keys", styles["body"])],
        ["ANTHROPIC_API_KEY on Railway",                Paragraph("Set · under our umbrella for v1 per Q7", styles["body"])],
        ["Models (Sonnet 4.6 grading + Opus 4.7 gen)",  "Configured"],
        ["Writing grader (5-dim CEFR rubric A1-C2)",    "Live · per Master Plan §§4 + 18 + 19"],
        ["Smoke test",                                  Paragraph("Passes · sample essay graded in ~108s, ~$0.10/essay", styles["body"])],
        ["v2.0 schema additions",                       Paragraph("Live · 10 new tables + 7 user columns, auto-applied via <i>db:push</i>", styles["body"])],
        ["Streaming + max_tokens fix (PR #9)",          "Live · resolved SDK Connection error + truncation"],
    ],
    widths=[2.8 * inch, 3.6 * inch], styles=styles,
))

story.append(Paragraph("2.3 Phase 1 — Writing-grading user loop + Lesson Library (May 14)", styles["h2"]))
story.append(Paragraph(
    "The demo loop you asked for is now live and runnable on production.",
    styles["body"]))
story.append(styled_table(
    headers=["Phase", "Shipped", "PR"],
    rows=[
        ["1.1",    Paragraph("Submission API — POST/queue/teacher-review/return endpoints with async grading", styles["body"]),     "#10"],
        ["1.2/1.3",Paragraph("Student writing editor + submission view with auto-poll + color-coded annotations + Spanish L1 callouts", styles["body"]), "#11"],
        ["1.4",    Paragraph("Teacher grading queue + submission review with score override + return-to-student", styles["body"]),  "#12"],
        ["1.4-nav",Paragraph("Sidebar nav entries (Writing for students, Grading queue + Lesson Library for teachers)", styles["body"]), "#13"],
        ["1.5",    Paragraph("Lesson Library + 17-section plan view per Master Plan §7.4 + inline JSON editor", styles["body"]),    "#14"],
    ],
    widths=[0.7 * inch, 4.8 * inch, 0.9 * inch], styles=styles,
))

story.append(Paragraph("Live demo flow (current)", styles["h2"]))
story.append(Paragraph(
    "<b>1.</b> Student → <b>Writing</b> sidebar → editor at <i>/dashboard/writing/new</i> → write essay → Submit<br/>"
    "<b>2.</b> Redirected to <i>/dashboard/submissions/:id</i> → shows \"Grading in progress…\" with animated indicator<br/>"
    "<b>3.</b> Claude grades in ~108 seconds → page auto-refreshes to show overall score, 5 dimension scores, inline annotations, strengths, improvement priorities, Spanish L1 patterns, vocabulary usage<br/>"
    "<b>4.</b> Teacher → <b>Grading queue</b> sidebar → sees the submission → opens review<br/>"
    "<b>5.</b> Teacher adjusts score (0-100), writes feedback → <b>Save review</b> → status flips to <i>teacher_reviewed</i><br/>"
    "<b>6.</b> Teacher clicks <b>Return to student</b> → status <i>returned</i> → student sees finalized grade<br/>"
    "<b>7.</b> Teacher can also browse <b>Lesson Library</b> → grouped by course → click any → see 17-section plan → edit via JSON editor",
    styles["body"]))

# §3 What's Pending
story.append(PageBreak())
story.append(Paragraph("3. What's Pending (Not Yet Built)", styles["h1"]))

story.append(Paragraph("3.1 Phase 1.6 — Conversation Labs (last Phase 1 deliverable)", styles["h2"]))
story.append(Paragraph(
    "Schema is in place from Phase 0; UI and orchestration not yet built. "
    "Effort: <b>~3-5 working days for one engineer</b> at full Claude Code productivity.",
    styles["body"]))
story.append(styled_table(
    headers=["Component"],
    rows=[
        [Paragraph("Lab Pack admin — CRUD for <i>lab_topics</i> (the reusable conversation kits)", styles["body"])],
        [Paragraph("Lab session admin — CRUD for <i>lab_sessions</i>, scheduling, recurrence", styles["body"])],
        [Paragraph("Student Lab calendar + registration UI", styles["body"])],
        [Paragraph("Lab quota enforcement per plan tier (Flex 1/mo, Basic 4/mo, Premium unlimited)", styles["body"])],
        [Paragraph("2-question feedback form auto-firing at session end, emails <i>info@cognimight.com</i>", styles["body"])],
        [Paragraph("N-min-before reminder email cron (in-process scheduler + Postgres advisory lock)", styles["body"])],
        [Paragraph("4-6 hand-authored starter Lab Packs (content work for Coral)", styles["body"])],
    ],
    widths=[6.4 * inch], styles=styles,
))

story.append(Paragraph("3.2 Phase 2 — Differentiation features (~5-8 weeks)", styles["h2"]))
story.append(Paragraph(
    "The features that meaningfully differentiate CogniBoost from Duolingo/Babbel.",
    styles["body"]))
story.append(styled_table(
    headers=["Feature", "Effort (1 eng)"],
    rows=[
        ["Reading comprehension grader (passages + mixed-question quiz)",                  "~5 days"],
        ["Listening comprehension grader (audio + hidden transcript + questions)",         "~5 days"],
        ["Vocabulary mastery system (SRS, productive-use tracking, daily review deck)",    "~7 days"],
        ["Student progress dashboard (6-axis CEFR radar, vocab counter, streak, weakness)","~5 days"],
        ["Teacher annotation tools (color-coded markup, voice notes, action buttons)",     "~5 days"],
        ["One-Click Generator — Flow 1 per-lesson (HTML upload → assessments)",            "~5 days"],
        ["One-Click Generator — Flow 2 Lab Pack (level + theme → full Lab Pack)",          "~3 days"],
        ["Three-pass review interface for content admin",                                  "~3 days"],
        ["Per-dimension teacher override + section-by-section lesson plan editor",         "~3 days"],
        [Paragraph("<b>Total Phase 2</b>", styles["body"]),
                                                                                            Paragraph("<b>~5-6 weeks (1 eng) / ~3 weeks (2 eng)</b>", styles["body"])],
    ],
    widths=[4.6 * inch, 1.8 * inch], styles=styles,
))

story.append(Paragraph("3.3 Phase 3 — Scale &amp; polish (~3-6 weeks)", styles["h2"]))
story.append(styled_table(
    headers=["Feature", "Effort (1 eng)"],
    rows=[
        ["Certification system + public verification page + QR + LinkedIn",      "~5 days"],
        ["Cohort/level analytics for teachers (risk flags, attendance heatmaps)","~5 days"],
        ["Automated nudges with mandatory teacher approval",                     "~3 days"],
        ["Mobile PWA polish (installable on home screen)",                       "~3 days"],
        ["Anthropic billing transition from our umbrella to Coral's account",    "~1 day"],
        [Paragraph("<b>Total Phase 3</b>", styles["body"]),
                                                                                  Paragraph("<b>~4 weeks (1 eng) / ~2.5 weeks (2 eng)</b>", styles["body"])],
    ],
    widths=[4.6 * inch, 1.8 * inch], styles=styles,
))

story.append(Paragraph("3.4 Quality / tech debt (parallelizable)", styles["h2"]))
story.append(styled_table(
    headers=["Item", "Severity", "Notes"],
    rows=[
        ["~20 pre-existing TypeScript errors",                "Low",    Paragraph("Production build uses esbuild (skips type check). Worth burning down.", styles["body"])],
        ["Zero automated tests",                              "Medium", Paragraph("New features should add coverage. CI only validates typescript-build.", styles["body"])],
        ["No CI smoke test for grading",                      "Low",    Paragraph("A nightly CI step could grade one essay (~$0.10/run) and alert on regressions.", styles["body"])],
        ["OpenAI legacy quiz-gen path still exists",          "Low",    Paragraph("Works fine. Deprecate when Phase 2 quiz generator lands on Claude.", styles["body"])],
        ["Email notification missing on status='returned'",   "Low",    Paragraph("Small follow-up PR.", styles["body"])],
        ["Hand-authored Lab Pack content",                    "Op",     Paragraph("Coral commits to ~30-50 Lab Packs once Flow 2 generator ships.", styles["body"])],
    ],
    widths=[2.6 * inch, 0.6 * inch, 3.2 * inch], styles=styles,
))

story.append(Paragraph("3.5 Explicitly out of scope (Coral's locked decisions)", styles["h2"]))
story.append(styled_table(
    headers=["Item", "Decision"],
    rows=[
        ["Ms. Coral mobile app",                Paragraph("Deferred · separate sprint when mobile project is staffed (Q2)", styles["body"])],
        ["Strict 8-week cohort enforcement",    Paragraph("Rejected · pure self-paced model (Q1)", styles["body"])],
        ["Rich-text writing editor",            Paragraph("v1 plain textarea · revisit if requested", styles["body"])],
    ],
    widths=[2.6 * inch, 3.8 * inch], styles=styles,
))

# §4 Coral's Locked Decisions
story.append(PageBreak())
story.append(Paragraph("4. Coral's Locked Decisions (May 13, 2026)", styles["h1"]))
story.append(styled_table(
    headers=["#", "Question", "Locked answer"],
    rows=[
        ["1", "Cohort vs self-paced",        Paragraph("<b>Fully self-paced.</b> No cohorts.", styles["body"])],
        ["2", "Ms. Coral mobile scaffolding",Paragraph("<b>Defer entirely.</b> Scope a separate sprint when mobile is staffed.", styles["body"])],
        ["3", "Certificate wording",         Paragraph("<b>Conservative.</b> \"CogniBoost B1 Completion Certificate, aligned with CEFR descriptors.\"", styles["body"])],
        ["4", "Engineer headcount",          Paragraph("<b>Pending</b> · Coral picks A (1 eng) or B (2 eng) post-handover", styles["body"])],
        ["5", "Disruption tolerance",        Paragraph("<b>Brief Sunday-evening downtime OK</b> in target-market local time", styles["body"])],
        ["6", "AI grading review",           Paragraph("<b>Teacher-review-first</b>, transition to auto-publish when override rate &lt;10% for 2 consecutive weeks", styles["body"])],
        ["7", "Anthropic billing",           Paragraph("<b>Our umbrella for v1 → Coral's account by Phase 3</b>", styles["body"])],
    ],
    widths=[0.3 * inch, 1.8 * inch, 4.3 * inch], styles=styles,
))

# §5 How to Operate
story.append(Paragraph("5. How to Operate (Reference Material)", styles["h1"]))
story.append(Paragraph(
    "Coral and her developer(s) should read these in order:",
    styles["body"]))
story.append(Paragraph(
    "<b>1.</b> <i>HANDOVER_OPERATIONS_GUIDE.md</i> — deploy pipeline, daily/weekly health checks, "
    "common-issues lookup, env-var reference, schema migration handling, lesson + audio pipeline.<br/>"
    "<b>2.</b> <i>MASTER_PLAN_REVISED.md</i> — engineering plan with file-level references.<br/>"
    "<b>3.</b> GitHub <i>creaactivai/Cogniboost</i> repo — code source of truth. PR-merge-to-main auto-deploys.",
    styles["body"]))
story.append(Paragraph("Quick reference", styles["h2"]))
story.append(styled_table(
    headers=["Where", "What"],
    rows=[
        ["cogniboost.co",                       "Live production site"],
        ["GitHub creaactivai/Cogniboost",       "Code repo, main branch"],
        ["Railway service Cogniboost",          "Backend + Postgres add-on. Variables, deployments, logs."],
        ["Vercel project cogniboost",           "Frontend"],
        ["Anthropic Console",                   "API keys + billing for grading"],
        ["Stripe Cogniboost LLC",               "Subscriptions + webhooks"],
        ["Resend",                              "Transactional email"],
        ["GCS bucket",                          "Audio MP3 + PDF storage"],
        ["info@cognimight.com",                 "Lab feedback emails land here (Phase 1.6)"],
    ],
    widths=[2.6 * inch, 3.8 * inch], styles=styles,
))

# §6 Ownership Transfer
story.append(PageBreak())
story.append(Paragraph("6. How Ownership Transfers (Action Plan)", styles["h1"]))
story.append(Paragraph(
    "Read <i>HANDOVER_TRANSFER_CHECKLIST.md</i> for the seven-phase playbook. Summary:",
    styles["body"]))
story.append(styled_table(
    headers=["Phase", "Action", "Effort"],
    rows=[
        ["0", Paragraph("Pre-handover prep — confirm everything works, decide what to retain", styles["body"]),     "~2 hours"],
        ["1", Paragraph("Account inventory — list every vendor account + decide transfer mechanism", styles["body"]),"~1 hour"],
        ["2", Paragraph("Pre-transfer decisions — Stripe, domain, OAuth recreate paths", styles["body"]),            "~1 hour"],
        ["3", Paragraph("Execution — ordered low-risk → high-risk to avoid mid-transfer outage", styles["body"]),     "5-7 days"],
        ["4", Paragraph("90-min knowledge transfer call — recorded, walks Coral through every dashboard", styles["body"]),"90 min"],
        ["5", Paragraph("Credential rotation — every secret we've ever seen, rotated post-transfer", styles["body"]),"~2 hours"],
        ["6", Paragraph("30-day post-handover support window", styles["body"]),                                       "30 days"],
        ["7", Paragraph("Final sign-off + access removal", styles["body"]),                                            "30 min"],
    ],
    widths=[0.5 * inch, 4.8 * inch, 1.1 * inch], styles=styles,
))

story.append(Paragraph("Key transfer mechanisms by vendor", styles["h2"]))
story.append(styled_table(
    headers=["Vendor", "Mechanism"],
    rows=[
        ["GitHub repo",         Paragraph("Settings → Transfer to Coral's org (or fork + archive ours)", styles["body"])],
        ["Railway project",     Paragraph("Settings → Members → invite Coral → owner → remove us", styles["body"])],
        ["Vercel project",      Paragraph("Same pattern as Railway", styles["body"])],
        ["Stripe",              Paragraph("Cannot transfer accounts. Option A: keep existing + add co-owner. Option B: new account, migrate subscribers (consult Stripe support for &gt;50)", styles["body"])],
        ["Anthropic",           Paragraph("Cannot transfer. Coral creates new account + key. Swap in Railway.", styles["body"])],
        ["Apple Developer",     Paragraph("Cannot transfer. Coral enrolls separately ($99/yr).", styles["body"])],
        ["Domain (cogniboost.co)",Paragraph("Outbound transfer at registrar to Coral's. 5-7 days.", styles["body"])],
        ["GCS / Google Cloud",  Paragraph("IAM project transfer, OR Coral creates new project + bucket and migrate files", styles["body"])],
    ],
    widths=[2.2 * inch, 4.2 * inch], styles=styles,
))

# §7 Open Items
story.append(Paragraph("7. Open Items Coral Decides (Pre-Transfer)", styles["h1"]))
story.append(styled_table(
    headers=["#", "Item", "Recommendation"],
    rows=[
        ["1", "Engineer headcount",            Paragraph("Option B (2 engineers) if launching before September matters", styles["body"])],
        ["2", "Domain transfer",                Paragraph("Transfer cogniboost.co (preserves SEO + existing URLs)", styles["body"])],
        ["3", "Stripe path",                    Paragraph("Keep existing + co-owner (fresh account loses current subscribers)", styles["body"])],
        ["4", "GCS path",                       Paragraph("Transfer project ownership (simpler, no asset migration)", styles["body"])],
        ["5", "Apple Developer membership",     Paragraph("Coral enrolls fresh ($99/yr) — required for Sign-in-with-Apple", styles["body"])],
        ["6", "Anthropic account",              Paragraph("Coral creates fresh, swap key during transfer Phase 3", styles["body"])],
        ["7", "30-day support contract",        Paragraph("Suggested: included in handover deliverable; daily ops only", styles["body"])],
    ],
    widths=[0.3 * inch, 1.7 * inch, 4.4 * inch], styles=styles,
))

# §8 Risks
story.append(Paragraph("8. Pre-Existing Risks Coral Should Know About", styles["h1"]))
story.append(styled_table(
    headers=["Risk", "Severity", "Mitigation"],
    rows=[
        ["Railway deploy-failure alerting not configured",       Paragraph("<b>High</b>", styles["body"]),
              Paragraph("Coral should enable Slack/email alerts in Railway → Settings → Notifications post-handover to prevent another silent-outage scenario.", styles["body"])],
        ["Anthropic billing brittleness",                         "Medium",
              Paragraph("Auto-recharge enabled. Monitor monthly credit balance.", styles["body"])],
        ["No automated tests",                                    "Medium",
              Paragraph("Vercel CI catches typescript errors only. Phase 2 should add coverage.", styles["body"])],
        ["Pre-existing TypeScript errors (~20)",                  "Low",
              Paragraph("All in paths esbuild ignores. Worth burning down.", styles["body"])],
        ["Duplicate-email user records",                          "Low",
              Paragraph("PR #2 mitigates via email-fallback re-link. Schema-level enforcement is a follow-up.", styles["body"])],
        ["Replit-residue env var REPLIT_CONNECTORS_HOSTNAME",     "Low",
              Paragraph("Harmless; can be deleted during transfer.", styles["body"])],
    ],
    widths=[2.4 * inch, 0.8 * inch, 3.2 * inch], styles=styles,
))

# §9 Handover Call Agenda
story.append(Paragraph("9. Suggested Handover Call Agenda (90 min)", styles["h1"]))
story.append(Paragraph(
    "Record the call. Recording becomes part of the handover artifact set.",
    styles["body"]))
story.append(styled_table(
    headers=["Time", "Topic"],
    rows=[
        ["15 min", "Walk through HANDOVER_OVERVIEW.md — what CogniBoost is, costs, what's live"],
        ["15 min", "Walk through this document — what's done, what's pending"],
        ["20 min", "Live demo of the writing-grading flow + Lesson Library on cogniboost.co"],
        ["15 min", "Live tour of Railway dashboard, Stripe dashboard, key operational surfaces"],
        ["10 min", "Common-issues lookup in HANDOVER_OPERATIONS_GUIDE.md"],
        ["15 min", "Q&A + transfer-phase decisions (§7 items)"],
    ],
    widths=[0.8 * inch, 5.6 * inch], styles=styles,
))

# §10 Sign-off
story.append(Paragraph("10. Sign-Off", styles["h1"]))
story.append(Paragraph(
    "After the 30-day post-handover support window, both parties sign:",
    styles["body"]))
story.append(Paragraph(
    "<b>•</b> A one-page sign-off acknowledging successful transfer<br/>"
    "<b>•</b> A list of all artifacts handed over (code, docs, credentials, account access)<br/>"
    "<b>•</b> Any remaining open commitments",
    styles["body"]))
story.append(Paragraph(
    "This document is part of that artifact set.",
    styles["body"]))

story.append(Spacer(1, 16))
story.append(HRFlowable(width="100%", thickness=0.5, color=BORDER, spaceAfter=10))
story.append(callout(
    "<b>Status as of 2026-05-14:</b> Platform is live, Phase 0 + Phase 1.1-1.5 shipped, Phase 1.6 "
    "(Conversation Labs) is the last item before the full demo loop is complete. Handover ready to execute.",
    GREEN, HexColor("#F0FDF4"), styles))


def add_page_number(canvas, doc):
    canvas.saveState()
    canvas.setFont("Helvetica", 8)
    canvas.setFillColor(SLATE_LT)
    canvas.drawCentredString(LETTER[0] / 2, 0.4 * inch,
        f"CogniBoost — Project Status & Final Handover    ·    Page {doc.page}")
    canvas.restoreState()


def build(path: Path):
    doc = SimpleDocTemplate(
        str(path), pagesize=LETTER,
        leftMargin=1 * inch, rightMargin=1 * inch,
        topMargin=0.8 * inch, bottomMargin=0.7 * inch,
        title="CogniBoost — Project Status & Final Handover",
        author="CogniBoost Engineering",
        subject="Full project status + ownership-transfer handover (May 14, 2026)",
    )
    doc.build(story, onFirstPage=add_page_number, onLaterPages=add_page_number)
    print(f"✓ wrote {path}")


if __name__ == "__main__":
    build(OUT_DESKTOP)
    import shutil
    shutil.copy2(OUT_DESKTOP, OUT_REPO)
    print(f"✓ copied to {OUT_REPO}")
