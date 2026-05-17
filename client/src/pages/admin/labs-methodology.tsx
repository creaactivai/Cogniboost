/**
 * /admin/labs/methodology — CogniBoost HABLA Method manual.
 *
 * Internal teacher-training page. Any future teacher reads this once
 * to understand the pedagogical framework every Conversation Lab
 * follows. The 5 HABLA phases are not negotiable; what changes per
 * session is the content (interest + grammar + vocab), not the
 * structure.
 */

import { AdminLayout } from "@/components/admin/admin-layout";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Heart, Brain, Lightbulb, Mic, Anchor, BookOpen, GraduationCap, Sparkles } from "lucide-react";

const PHASES = [
  {
    letter: "H",
    label: "Hook",
    duration: 5,
    icon: Heart,
    color: "from-pink-500 to-rose-500",
    bg: "bg-pink-50 dark:bg-pink-950/30",
    border: "border-pink-200 dark:border-pink-800",
    purpose: "Lower the affective filter",
    science: "Krashen (1982) — Affective Filter Hypothesis",
    description:
      "A personal question anchored in the student's interest. NEVER begins with grammar. The student is speaking before they realize they're 'learning'.",
    teacherDo: [
      "Start with a question that connects to the topic the student LOVES",
      "Make it feel like a chat, not a class",
      "Don't correct anything yet — let them feel safe",
    ],
    example: '"¿Cuál fue la última canción que escuchaste antes de entrar a esta clase?"',
  },
  {
    letter: "A",
    label: "Activate",
    duration: 10,
    icon: Brain,
    color: "from-amber-500 to-orange-500",
    bg: "bg-amber-50 dark:bg-amber-950/30",
    border: "border-amber-200 dark:border-amber-800",
    purpose: "Surface prior knowledge",
    science: "Ausubel (1968) — Meaningful Learning Theory",
    description:
      "The teacher draws out what the student ALREADY knows about the topic. The module's target vocabulary surfaces naturally in their answers — no teaching yet, just elicitation.",
    teacherDo: [
      "Ask follow-up 'how' and 'why' questions",
      "Write down (digitally) the words THEY use, even if imperfect",
      "If they hit a target vocab word, celebrate it briefly: 'Yes, that's the word!'",
    ],
    example: '"Tell me more — when did you start liking that band? How did you discover them?"',
  },
  {
    letter: "B",
    label: "Build",
    duration: 10,
    icon: Lightbulb,
    color: "from-cyan-500 to-blue-500",
    bg: "bg-cyan-50 dark:bg-cyan-950/30",
    border: "border-cyan-200 dark:border-cyan-800",
    purpose: "Comprehensible input + discovery",
    science: "Krashen — Input Hypothesis (i+1)",
    description:
      "Show 2-3 authentic mini-examples where the target grammar appears in the interest context. The student DISCOVERS the pattern — the teacher doesn't lecture it.",
    teacherDo: [
      "Show real text/audio, not textbook examples",
      "Ask: '¿Notas algo en común en estas frases?'",
      "Resist the urge to explain — let them name the pattern first",
    ],
    example:
      '"Listen: \'I LISTENED to it 100 times.\' / \'They RELEASED a new album last year.\' — ¿Qué tienen en común estos verbos?"',
  },
  {
    letter: "L",
    label: "Live",
    duration: 25,
    icon: Mic,
    color: "from-emerald-500 to-teal-500",
    bg: "bg-emerald-50 dark:bg-emerald-950/30",
    border: "border-emerald-200 dark:border-emerald-800",
    purpose: "Pushed output via real task",
    science: "Swain (1985) — Output Hypothesis · Willis & Willis — TBLT",
    description:
      "The heart of the session (25 of 60 minutes). A real task the student must complete using the grammar + vocab. NOT an exercise — a task with stakes, choice, or audience. Errors are OK; communication must succeed.",
    teacherDo: [
      "Set the task clearly with a goal (debate, convince, narrate, choose)",
      "Step back — let them struggle a bit before helping",
      "Note errors privately; only correct on the spot if meaning breaks",
      "If 2+ students, pair them; rotate to give feedback",
    ],
    example:
      '"Tu tarea: en 3 minutos, convénceme de que TU canción favorita es mejor que la mía. Usas mínimo 5 palabras del vocab y tienes que ganar el argumento."',
  },
  {
    letter: "A",
    label: "Anchor",
    duration: 10,
    icon: Anchor,
    color: "from-violet-500 to-purple-500",
    bg: "bg-violet-50 dark:bg-violet-950/30",
    border: "border-violet-200 dark:border-violet-800",
    purpose: "Cement learning + bridge to next week",
    science: "Spaced Retrieval · Self-Determination Theory (Deci & Ryan)",
    description:
      "The teacher names 3 specific successes the student had (concrete, not 'good job'). Then offers 1 takeaway phrase to use this week. Words go into the student's SRS deck automatically for spaced retrieval.",
    teacherDo: [
      "Say exactly what the student did well: 'Cuando dijiste X, eso sonó completamente natural'",
      "Mention 1-2 corrections WITHOUT making them the focus",
      "Give one phrase to use this week — something they'd actually say",
      "Let the platform send the vocab to their SRS — don't reload them",
    ],
    example:
      '"Tres cosas brillantes: usaste \'released\' perfectamente, hiciste una pregunta sin pensarlo, y dijiste \'unforgettable\' como un native. La frase que te llevas: \'The first time I heard it, I felt…\' — úsala con alguien esta semana."',
  },
];

export default function LabsMethodologyPage() {
  return (
    <AdminLayout title="HABLA Method · Methodology Manual">
      <div className="max-w-4xl mx-auto p-4 space-y-6">
        {/* Hero */}
        <Card className="p-6 bg-gradient-to-br from-primary/10 via-cyan-500/5 to-violet-500/10 border-primary/20">
          <div className="flex items-start gap-4">
            <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-primary to-cyan-500 flex items-center justify-center flex-shrink-0">
              <GraduationCap className="w-7 h-7 text-white" />
            </div>
            <div className="flex-1 space-y-2">
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-3xl font-bold">The HABLA Method™</h1>
                <Badge variant="outline" className="text-xs">CogniBoost Pedagogy</Badge>
              </div>
              <p className="text-muted-foreground">
                The 5-phase framework every CogniBoost Conversation Lab follows. Designed so any
                qualified teacher delivers the same consistent, science-backed experience —
                while keeping each session creative and adapted to the student's interests.
              </p>
              <p className="text-sm italic text-foreground/80 mt-2">
                "Use lo aprendido sin darse cuenta. Hable el idioma. Pierda la timidez.
                Hable de cosas que le gusten."
              </p>
            </div>
          </div>
        </Card>

        {/* Core principles */}
        <Card className="p-5">
          <h2 className="text-lg font-bold mb-3 flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-primary" /> The 5 Core Principles
          </h2>
          <ul className="space-y-2 text-sm">
            <li className="flex gap-3">
              <span className="text-primary font-bold">01</span>
              <div>
                <strong>Communication before correction.</strong> If meaning passes,
                the utterance is a success. Corrections happen at the end (Anchor phase), not mid-flow.
              </div>
            </li>
            <li className="flex gap-3">
              <span className="text-primary font-bold">02</span>
              <div>
                <strong>Interest is non-negotiable.</strong> Every session anchors to a topic the
                student personally chose (Travel, Music, Food, etc.). Engagement is the engine.
              </div>
            </li>
            <li className="flex gap-3">
              <span className="text-primary font-bold">03</span>
              <div>
                <strong>Output 60% / Input 40%.</strong> The student SPEAKS more than the teacher.
                If the teacher is talking more than the student in the LIVE phase, something's wrong.
              </div>
            </li>
            <li className="flex gap-3">
              <span className="text-primary font-bold">04</span>
              <div>
                <strong>Drop-in friendly.</strong> Every session is self-contained. A brand-new
                student and a 1-month veteran can both join any session and gain meaningful
                learning. The Activate phase calibrates to each.
              </div>
            </li>
            <li className="flex gap-3">
              <span className="text-primary font-bold">05</span>
              <div>
                <strong>Discovery over delivery.</strong> Grammar isn't taught — it's noticed.
                The teacher shows examples; the student names the pattern. Ownership of the
                discovery cements retention.
              </div>
            </li>
          </ul>
        </Card>

        {/* HABLA phases */}
        <div>
          <h2 className="text-xl font-bold mb-3 flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-primary" /> The 5 Phases (60 minutes total)
          </h2>
          <div className="space-y-4">
            {PHASES.map((phase) => {
              const Icon = phase.icon;
              return (
                <Card
                  key={phase.letter}
                  className={`p-5 ${phase.bg} ${phase.border} border-2`}
                >
                  <div className="flex items-start gap-4">
                    <div
                      className={`w-14 h-14 rounded-xl bg-gradient-to-br ${phase.color} flex items-center justify-center flex-shrink-0 shadow-sm`}
                    >
                      <span className="text-2xl font-black text-white">{phase.letter}</span>
                    </div>
                    <div className="flex-1 min-w-0 space-y-2">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="text-xl font-bold">{phase.label}</h3>
                        <Badge variant="secondary" className="text-xs">{phase.duration} min</Badge>
                        <Badge variant="outline" className="text-xs flex items-center gap-1">
                          <Icon className="w-3 h-3" /> {phase.purpose}
                        </Badge>
                      </div>
                      <p className="text-[11px] uppercase tracking-widest text-muted-foreground font-mono">
                        {phase.science}
                      </p>
                      <p className="text-sm">{phase.description}</p>

                      <div className="mt-3">
                        <p className="text-xs uppercase tracking-widest text-muted-foreground mb-1 font-semibold">
                          Teacher does
                        </p>
                        <ul className="text-sm space-y-1">
                          {phase.teacherDo.map((d, i) => (
                            <li key={i} className="flex gap-2">
                              <span className="text-foreground/40">·</span>
                              <span>{d}</span>
                            </li>
                          ))}
                        </ul>
                      </div>

                      <div className="mt-3 p-3 rounded-lg bg-card border italic text-sm">
                        <span className="text-[10px] uppercase tracking-widest text-muted-foreground not-italic font-semibold block mb-1">
                          Example
                        </span>
                        {phase.example}
                      </div>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        </div>

        {/* References */}
        <Card className="p-5">
          <h2 className="text-lg font-bold mb-3">Scientific References</h2>
          <ul className="text-xs font-mono space-y-1 text-muted-foreground">
            <li>Ausubel, D. (1968). <em>Educational Psychology: A Cognitive View</em>.</li>
            <li>Deci, E. L., &amp; Ryan, R. M. (2000). Intrinsic and extrinsic motivations. <em>Contemporary Educational Psychology</em>, 25(1).</li>
            <li>Krashen, S. (1982). <em>Principles and Practice in Second Language Acquisition</em>.</li>
            <li>Swain, M. (1985). Communicative competence: some roles of comprehensible input and comprehensible output in its development.</li>
            <li>Willis, D., &amp; Willis, J. (2007). <em>Doing Task-Based Teaching</em>. Oxford University Press.</li>
          </ul>
        </Card>
      </div>
    </AdminLayout>
  );
}
