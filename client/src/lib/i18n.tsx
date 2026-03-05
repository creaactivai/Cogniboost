import { createContext, useContext, useState, useCallback, type ReactNode } from "react";

export type Locale = "en" | "es";

const STORAGE_KEY = "cogniboost_locale";

const translations: Record<Locale, Record<string, string>> = {
  en: {
    // Dashboard — Help & Support
    "help.title": "Help & Support",
    "help.subtitle": "Get help with your learning journey",
    "help.faq": "Frequently Asked Questions",
    "help.faqDesc": "Find answers to common questions about courses, labs, and your account.",
    "help.contact": "Contact Support",
    "help.contactDesc": "Email us at support@cogniboost.co for personalized assistance.",
    "help.community": "Community",
    "help.communityDesc": "Join our Discord community to connect with other students.",

    // Common
    "loading": "Loading...",
    "redirecting": "Redirecting...",
    "redirectingDashboard": "Redirecting to dashboard...",
    "error": "Error",
    "processing": "Processing...",

    // Choose Plan
    "plan.title": "Choose Your Plan",
    "plan.subtitle": "Hi, {name}! To access all CogniBoost content, select the plan that best fits your needs.",
    "plan.mostPopular": "Most Popular",
    "plan.perMonth": "/month",
    "plan.choose": "Choose {name}",
    "plan.guarantee": "All plans include a 7-day satisfaction guarantee",
    "plan.continueFree": "Continue with Free Plan",
    "plan.backHome": "Back to home",
    "plan.freeIncludes": "The free plan includes the first 3 lessons of Module 1",
    "plan.errorProcessing": "Error processing",
    "plan.errorPayment": "Could not start payment process",
    "plan.errorFree": "Could not select free plan",
    "plan.signOut": "Sign Out",

    // Plan descriptions
    "plan.flex.desc": "Learn at your own pace",
    "plan.basic.desc": "The most popular option",
    "plan.premium.desc": "For accelerated results",

    // Plan features
    "plan.feature.courseLibrary": "Complete course library",
    "plan.feature.allModules": "All modules and lessons",
    "plan.feature.tracking": "Advanced progress tracking",
    "plan.feature.certificate": "Downloadable certificate",
    "plan.feature.noLabs": "No access to Conversation Labs",
    "plan.feature.2labs": "2 Conversation Labs per week",
    "plan.feature.liveClasses": "Live classes by level (A1-C2)",
    "plan.feature.unlimitedLabs": "UNLIMITED Conversation Labs",
    "plan.feature.priority": "Priority lab scheduling",
    "plan.feature.prioritySupport": "Priority support",
    "plan.feature.linkedinCerts": "LinkedIn certificates",

    // Course Viewer
    "lesson.completed": "Lesson Complete!",
    "lesson.completedDesc": "You've successfully completed this lesson.",
    "lesson.completedError": "Could not mark lesson as complete.",
    "lesson.locked": "Lesson Locked",
    "lesson.lockedDesc": "Complete previous lessons to unlock this one.",
    "lesson.select": "Select a Lesson",
    "lesson.loadingProgress": "Loading progress...",
    "lesson.adminPreview": "Viewing this course as a student. All lessons are unlocked.",
    "lesson.lockedCount": "{count} lessons locked. Upgrade to access all content.",

    // Quiz
    "quiz.title": "Lesson Quiz",
    "quiz.congrats": "Congratulations!",
    "quiz.tryAgain": "Try again",
    "quiz.submitError": "Could not submit quiz. Please try again.",
    "quiz.backToLesson": "Back to Lesson",
    "quiz.completed": "Lesson Completed",

    // Language toggle
    "language": "Language",
    "language.en": "English",
    "language.es": "Español",
  },
  es: {
    // Dashboard — Help & Support
    "help.title": "Ayuda y Soporte",
    "help.subtitle": "Obtén ayuda con tu camino de aprendizaje",
    "help.faq": "Preguntas Frecuentes",
    "help.faqDesc": "Encuentra respuestas a preguntas comunes sobre cursos, labs y tu cuenta.",
    "help.contact": "Contactar Soporte",
    "help.contactDesc": "Escríbenos a support@cogniboost.co para asistencia personalizada.",
    "help.community": "Comunidad",
    "help.communityDesc": "Únete a nuestra comunidad de Discord para conectar con otros estudiantes.",

    // Common
    "loading": "Cargando...",
    "redirecting": "Redirigiendo...",
    "redirectingDashboard": "Redirigiendo al dashboard...",
    "error": "Error",
    "processing": "Procesando...",

    // Choose Plan
    "plan.title": "Elige tu Plan",
    "plan.subtitle": "¡Hola, {name}! Para acceder a todo el contenido de CogniBoost, selecciona el plan que mejor se adapte a tus necesidades.",
    "plan.mostPopular": "Más Popular",
    "plan.perMonth": "/mes",
    "plan.choose": "Elegir {name}",
    "plan.guarantee": "Todos los planes incluyen garantía de satisfacción de 7 días",
    "plan.continueFree": "Continuar con Plan Gratis",
    "plan.backHome": "Volver al inicio",
    "plan.freeIncludes": "El plan gratis incluye las primeras 3 lecciones del Módulo 1",
    "plan.errorProcessing": "Error al procesar",
    "plan.errorPayment": "No se pudo iniciar el proceso de pago",
    "plan.errorFree": "No se pudo seleccionar el plan gratis",
    "plan.signOut": "Cerrar Sesión",

    // Plan descriptions
    "plan.flex.desc": "Para aprendizaje a tu ritmo",
    "plan.basic.desc": "La opción más popular",
    "plan.premium.desc": "Para resultados acelerados",

    // Plan features
    "plan.feature.courseLibrary": "Biblioteca completa de cursos",
    "plan.feature.allModules": "Todos los módulos y lecciones",
    "plan.feature.tracking": "Seguimiento avanzado",
    "plan.feature.certificate": "Certificado descargable",
    "plan.feature.noLabs": "Sin acceso a Conversation Labs",
    "plan.feature.2labs": "2 Conversation Labs por semana",
    "plan.feature.liveClasses": "Clases en vivo por nivel (A1-C2)",
    "plan.feature.unlimitedLabs": "Conversation Labs ILIMITADOS",
    "plan.feature.priority": "Prioridad de agenda en labs",
    "plan.feature.prioritySupport": "Soporte prioritario",
    "plan.feature.linkedinCerts": "Certificados para LinkedIn",

    // Course Viewer
    "lesson.completed": "¡Lección completada!",
    "lesson.completedDesc": "Has completado esta lección exitosamente.",
    "lesson.completedError": "No se pudo marcar la lección como completada.",
    "lesson.locked": "Lección bloqueada",
    "lesson.lockedDesc": "Completa las lecciones anteriores para desbloquear esta.",
    "lesson.select": "Selecciona una Lección",
    "lesson.loadingProgress": "Cargando progreso...",
    "lesson.adminPreview": "Viendo el curso como un estudiante. Todas las lecciones están desbloqueadas.",
    "lesson.lockedCount": "{count} lecciones bloqueadas. Actualiza para acceder a todo el contenido.",

    // Quiz
    "quiz.title": "Quiz de la Lección",
    "quiz.congrats": "¡Felicidades!",
    "quiz.tryAgain": "Inténtalo de nuevo",
    "quiz.submitError": "No se pudo enviar el quiz. Inténtalo de nuevo.",
    "quiz.backToLesson": "Volver a la Lección",
    "quiz.completed": "Lección Completada",

    // Language toggle
    "language": "Idioma",
    "language.en": "English",
    "language.es": "Español",
  },
};

interface I18nContextType {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  t: (key: string, params?: Record<string, string | number>) => string;
}

const I18nContext = createContext<I18nContextType | null>(null);

export function I18nProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>(() => {
    if (typeof window !== "undefined") {
      return (localStorage.getItem(STORAGE_KEY) as Locale) || "en";
    }
    return "en";
  });

  const setLocale = useCallback((newLocale: Locale) => {
    setLocaleState(newLocale);
    localStorage.setItem(STORAGE_KEY, newLocale);
  }, []);

  const t = useCallback(
    (key: string, params?: Record<string, string | number>) => {
      let value = translations[locale][key] || translations.en[key] || key;
      if (params) {
        Object.entries(params).forEach(([k, v]) => {
          value = value.replace(`{${k}}`, String(v));
        });
      }
      return value;
    },
    [locale]
  );

  return (
    <I18nContext.Provider value={{ locale, setLocale, t }}>
      {children}
    </I18nContext.Provider>
  );
}

export function useTranslation() {
  const context = useContext(I18nContext);
  if (!context) {
    throw new Error("useTranslation must be used within I18nProvider");
  }
  return context;
}
