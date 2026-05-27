/**
 * CanDoStatements — Phase 1.1 of ESL Roadmap
 *
 * Surfaces the OFFICIAL CEFR Global Scale descriptors as concrete
 * "I can..." statements per level. Pedagogical purpose:
 *  - Make abstract levels (A1/A2/B1/B2/C1/C2) FEEL CONCRETE
 *  - Show students what they CAN actually do (self-efficacy)
 *  - Hint at what's coming next (motivation toward next level)
 *
 * Bilingual by default — English + Spanish side-by-side helps the student
 * connect the descriptor (concept) with the language (real CEFR statement
 * exposure). Adult learners need both.
 *
 * Source: Council of Europe — Common European Framework of Reference for
 * Languages (Global Scale + skill-specific Can-Do statements).
 *
 * MVP scope: read-only display. Future: track which descriptors the
 * student has DEMONSTRATED via submissions (tick them off as evidence
 * accrues).
 */

import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, ChevronDown, ChevronUp } from "lucide-react";

interface CanDoStatement {
  en: string;
  es: string;
}

interface LevelCanDos {
  label: string;
  labelEs: string;
  globalScale: { en: string; es: string };
  statements: CanDoStatement[];
}

// Official-style CEFR descriptors (Council of Europe, Global Scale + skill
// descriptors). Adapted to first-person to feel like *I* can-do, not 3rd
// person. Kept short and concrete — adults skim, not read.
const CAN_DO_BY_LEVEL: Record<string, LevelCanDos> = {
  A1: {
    label: "Beginner",
    labelEs: "Principiante",
    globalScale: {
      en: "I can understand and use familiar everyday expressions and very basic phrases.",
      es: "Puedo entender y usar expresiones cotidianas familiares y frases muy básicas.",
    },
    statements: [
      { en: "Introduce myself and ask simple questions about people I know.", es: "Presentarme y hacer preguntas simples sobre personas que conozco." },
      { en: "Order food, ask for directions, and book a room.", es: "Pedir comida, pedir direcciones y reservar un cuarto." },
      { en: "Use TO BE in present (I am, he is, they are) confidently.", es: "Usar el verbo TO BE en presente (I am, he is, they are) con seguridad." },
      { en: "Talk about my family, job, and daily routine using simple sentences.", es: "Hablar de mi familia, trabajo y rutina diaria con oraciones simples." },
      { en: "Understand someone speaking slowly and clearly about familiar topics.", es: "Entender a alguien que habla despacio y claro sobre temas familiares." },
    ],
  },
  A2: {
    label: "Elementary",
    labelEs: "Básico",
    globalScale: {
      en: "I can communicate in simple, routine tasks on familiar topics.",
      es: "Puedo comunicarme en tareas simples y rutinarias sobre temas familiares.",
    },
    statements: [
      { en: "Describe my background, immediate environment, and basic needs.", es: "Describir mi formación, entorno inmediato y necesidades básicas." },
      { en: "Handle short social exchanges (small talk, greetings, farewells).", es: "Manejar intercambios sociales cortos (small talk, saludos, despedidas)." },
      { en: "Use past simple to talk about events in my life.", es: "Usar past simple para hablar de eventos en mi vida." },
      { en: "Read short, simple texts and emails on familiar topics.", es: "Leer textos cortos y simples y correos sobre temas familiares." },
      { en: "Write short notes and personal messages.", es: "Escribir notas cortas y mensajes personales." },
    ],
  },
  B1: {
    label: "Intermediate",
    labelEs: "Intermedio",
    globalScale: {
      en: "I can deal with most situations likely to arise while traveling in an English-speaking area.",
      es: "Puedo lidiar con la mayoría de situaciones que surgen al viajar a un país de habla inglesa.",
    },
    statements: [
      { en: "Produce simple connected text on familiar topics.", es: "Producir textos sencillos y conectados sobre temas familiares." },
      { en: "Describe experiences, dreams, hopes, and ambitions.", es: "Describir experiencias, sueños, esperanzas y ambiciones." },
      { en: "Give reasons and explanations for opinions and plans.", es: "Dar razones y explicaciones de mis opiniones y planes." },
      { en: "Use present perfect to connect past and present (I have lived here for 3 years).", es: "Usar present perfect para conectar pasado y presente (I have lived here for 3 years)." },
      { en: "Understand the main points of clear standard input on familiar matters.", es: "Entender los puntos principales de un texto claro sobre asuntos familiares." },
    ],
  },
  B2: {
    label: "Upper Intermediate",
    labelEs: "Intermedio Alto",
    globalScale: {
      en: "I can interact with native speakers without strain for either party.",
      es: "Puedo interactuar con hablantes nativos sin esfuerzo para ninguna de las dos partes.",
    },
    statements: [
      { en: "Understand the main ideas of complex text on concrete and abstract topics.", es: "Entender ideas principales de textos complejos sobre temas concretos y abstractos." },
      { en: "Produce clear, detailed text on a wide range of subjects.", es: "Producir textos claros y detallados sobre una amplia gama de temas." },
      { en: "Explain a viewpoint on a topical issue with pros and cons.", es: "Explicar un punto de vista sobre un tema actual con pros y contras." },
      { en: "Use conditionals (if/then) to discuss hypothetical situations.", es: "Usar condicionales (if/then) para discutir situaciones hipotéticas." },
      { en: "Follow extended speech in fast native conversations.", es: "Seguir discursos largos en conversaciones rápidas entre nativos." },
    ],
  },
  C1: {
    label: "Advanced",
    labelEs: "Avanzado",
    globalScale: {
      en: "I can express ideas fluently and spontaneously without much obvious searching.",
      es: "Puedo expresar ideas con fluidez y espontaneidad sin búsqueda obvia de palabras.",
    },
    statements: [
      { en: "Understand demanding, longer texts and recognize implicit meaning.", es: "Entender textos largos y demandantes, reconociendo significado implícito." },
      { en: "Use language flexibly for social, academic, and professional purposes.", es: "Usar el idioma con flexibilidad para fines sociales, académicos y profesionales." },
      { en: "Produce clear, well-structured text on complex subjects.", es: "Producir textos claros y bien estructurados sobre temas complejos." },
      { en: "Use idioms and phrasal verbs naturally in conversation.", es: "Usar modismos y phrasal verbs con naturalidad en conversación." },
      { en: "Understand films, podcasts, and news without subtitles.", es: "Entender películas, podcasts y noticias sin subtítulos." },
    ],
  },
  C2: {
    label: "Mastery",
    labelEs: "Maestría",
    globalScale: {
      en: "I can understand virtually everything heard or read.",
      es: "Puedo entender prácticamente todo lo que escucho o leo.",
    },
    statements: [
      { en: "Summarize information from different sources coherently.", es: "Resumir información de diferentes fuentes de forma coherente." },
      { en: "Express myself spontaneously, very fluently, and precisely.", es: "Expresarme espontáneamente, con mucha fluidez y precisión." },
      { en: "Differentiate finer shades of meaning even in complex situations.", es: "Diferenciar matices finos de significado incluso en situaciones complejas." },
      { en: "Use complex grammar (subjunctive, inversion, cleft) effortlessly.", es: "Usar gramática compleja (subjuntivo, inversión, cleft) sin esfuerzo." },
      { en: "Function in English as well as in my native language.", es: "Funcionar en inglés tan bien como en mi lengua materna." },
    ],
  },
};

const LEVEL_ORDER = ["A1", "A2", "B1", "B2", "C1", "C2"];

interface CanDoStatementsProps {
  /** Student's current CEFR level (A1 | A2 | B1 | B2 | C1 | C2). */
  currentLevel: string;
}

export function CanDoStatements({ currentLevel }: CanDoStatementsProps) {
  const safeLevel = LEVEL_ORDER.includes(currentLevel) ? currentLevel : "A1";
  const currentData = CAN_DO_BY_LEVEL[safeLevel];
  // A1 students get bilingual support (English bold + Spanish italic).
  // A2+ students get English-only — immersion is the goal.
  const showSpanish = safeLevel === "A1";
  const [expanded, setExpanded] = useState(false);

  return (
    <div data-testid="can-do-statements">
      {/* Current Level — collapsible */}
      <Card className="border-border rounded-2xl overflow-hidden">
        {/* Always-visible header (collapsible trigger) */}
        <button
          type="button"
          onClick={() => setExpanded(!expanded)}
          className="w-full text-left p-5 hover:bg-muted/30 transition-colors"
          aria-expanded={expanded}
          data-testid="button-cando-toggle"
        >
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center flex-shrink-0">
              <CheckCircle2 className="w-5 h-5 text-emerald-600" />
            </div>
            <div className="flex-1 min-w-0">
              <h2 className="text-lg font-display uppercase tracking-tight mb-1">
                What I can already do
              </h2>
              <p className="text-sm text-muted-foreground leading-snug">
                {currentData.globalScale.en}
              </p>
              <div className="flex items-center gap-2 mt-2.5">
                <Badge variant="outline" className="font-mono text-xs">
                  {safeLevel} · {currentData.label}
                </Badge>
                <Badge variant="secondary" className="font-mono text-xs">
                  {currentData.statements.length} abilities
                </Badge>
              </div>
            </div>
            <div className="flex-shrink-0 mt-1">
              {expanded ? (
                <ChevronUp className="w-5 h-5 text-muted-foreground" />
              ) : (
                <ChevronDown className="w-5 h-5 text-muted-foreground" />
              )}
            </div>
          </div>
        </button>

        {/* Expandable detail */}
        {expanded && (
          <div className="px-5 pb-5 pt-0 border-t border-border">
            {/* A1 only: Spanish translation of global scale headline */}
            {showSpanish && (
              <div className="p-3 mt-4 mb-4 bg-emerald-50/50 border border-emerald-100 rounded-lg">
                <p className="text-xs italic text-emerald-900 leading-relaxed">
                  {currentData.globalScale.es}
                </p>
              </div>
            )}

            <ul className={`space-y-2.5 ${showSpanish ? "" : "mt-4"}`}>
              {currentData.statements.map((stmt, idx) => (
                <li
                  key={idx}
                  className="flex gap-3 items-start"
                  data-testid={`cando-statement-${idx}`}
                >
                  <CheckCircle2 className="w-4 h-4 text-emerald-500 mt-0.5 flex-shrink-0" />
                  <div className="flex-1">
                    <p className="text-sm font-bold text-foreground leading-snug">
                      {stmt.en}
                    </p>
                    {/* A1 only: Spanish in italic UNDER the English bold */}
                    {showSpanish && (
                      <p className="text-xs italic text-muted-foreground leading-snug mt-0.5">
                        {stmt.es}
                      </p>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          </div>
        )}
      </Card>
    </div>
  );
}
