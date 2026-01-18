import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useMutation, useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Clock, CheckCircle, XCircle, ArrowRight, Trophy, Target, BookOpen, User, Mail } from "lucide-react";

interface PlacementQuestion {
  text: string;
  options: string[];
  type: "multiple_choice" | "open_response";
  difficulty: string;
}

interface QuizState {
  attemptId: string;
  currentStep: number;
  totalQuestions: number;
  question: PlacementQuestion;
  expiresAt: string;
  leadId?: string;
}

interface AnswerResult {
  completed: boolean;
  currentStep?: number;
  totalQuestions?: number;
  question?: PlacementQuestion;
  previousAnswer?: {
    isCorrect: boolean;
    feedback: string;
  };
  computedLevel?: string;
  confidence?: string;
  correctAnswers?: number;
}

interface CurrentQuizResponse {
  hasActiveQuiz: boolean;
  attemptId?: string;
  currentStep?: number;
  totalQuestions?: number;
  question?: PlacementQuestion;
  expiresAt?: string;
}

interface LeadFormData {
  email: string;
  firstName: string;
  lastName: string;
  phone: string;
}

export default function PlacementQuiz() {
  const { user, isLoading: authLoading } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  const [quizState, setQuizState] = useState<QuizState | null>(null);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [lastFeedback, setLastFeedback] = useState<{ isCorrect: boolean; feedback: string } | null>(null);
  const [quizResult, setQuizResult] = useState<{
    level: string;
    confidence: string;
    correctAnswers: number;
    totalQuestions: number;
  } | null>(null);
  const [timeLeft, setTimeLeft] = useState<number>(0);
  const [leadId, setLeadId] = useState<string | null>(null);
  const [leadForm, setLeadForm] = useState<LeadFormData>({
    email: "",
    firstName: "",
    lastName: "",
    phone: "",
  });
  const [formErrors, setFormErrors] = useState<Partial<LeadFormData>>({});

  // Check for active quiz for authenticated users only
  const { data: currentQuiz, isLoading: checkingCurrent } = useQuery<CurrentQuizResponse>({
    queryKey: ["/api/placement/current"],
    enabled: !authLoading && !!user,
  });

  // Create lead mutation
  const createLeadMutation = useMutation({
    mutationFn: async (data: LeadFormData) => {
      const response = await apiRequest("POST", "/api/leads", data);
      return response.json();
    },
    onSuccess: (data) => {
      setLeadId(data.leadId);
      // Immediately start the quiz after creating lead
      startQuizMutation.mutate(data.leadId);
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "No se pudo guardar tu información",
        variant: "destructive",
      });
    },
  });

  const startQuizMutation = useMutation({
    mutationFn: async (passedLeadId?: string) => {
      const currentLeadId = passedLeadId || leadId;
      const body = user ? {} : { leadId: currentLeadId };
      const response = await apiRequest("POST", "/api/placement/start", body);
      return response.json();
    },
    onSuccess: (data) => {
      setQuizState({
        attemptId: data.attemptId,
        currentStep: data.currentStep,
        totalQuestions: data.totalQuestions,
        question: data.question,
        expiresAt: data.expiresAt,
        leadId: data.leadId,
      });
      setLastFeedback(null);
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "No se pudo iniciar el examen",
        variant: "destructive",
      });
    },
  });

  const answerMutation = useMutation({
    mutationFn: async ({ attemptId, answer }: { attemptId: string; answer: number }) => {
      const currentLeadId = quizState?.leadId || leadId;
      const body = user 
        ? { attemptId, answer }
        : { attemptId, answer, anonymousId: currentLeadId };
      const response = await apiRequest("POST", "/api/placement/answer", body);
      return response.json();
    },
    onSuccess: (data: AnswerResult) => {
      if (data.completed) {
        setQuizResult({
          level: data.computedLevel!,
          confidence: data.confidence!,
          correctAnswers: data.correctAnswers!,
          totalQuestions: data.totalQuestions!,
        });
        setQuizState(null);
      } else {
        setQuizState((prev) => prev ? {
          ...prev,
          currentStep: data.currentStep!,
          question: data.question!,
        } : null);
        setLastFeedback(data.previousAnswer || null);
      }
      setSelectedAnswer(null);
    },
    onError: () => {
      toast({
        title: "Error",
        description: "No se pudo procesar tu respuesta",
        variant: "destructive",
      });
    },
  });

  useEffect(() => {
    if (currentQuiz?.hasActiveQuiz && !quizState && currentQuiz.attemptId && currentQuiz.question && currentQuiz.expiresAt) {
      setQuizState({
        attemptId: currentQuiz.attemptId,
        currentStep: currentQuiz.currentStep || 1,
        totalQuestions: currentQuiz.totalQuestions || 8,
        question: currentQuiz.question,
        expiresAt: currentQuiz.expiresAt,
      });
    }
  }, [currentQuiz, quizState]);

  useEffect(() => {
    if (quizState?.expiresAt) {
      const updateTimer = () => {
        const remaining = Math.max(0, new Date(quizState.expiresAt).getTime() - Date.now());
        setTimeLeft(Math.floor(remaining / 1000));
      };
      updateTimer();
      const interval = setInterval(updateTimer, 1000);
      return () => clearInterval(interval);
    }
  }, [quizState?.expiresAt]);

  if (authLoading || checkingCurrent) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-primary mx-auto mb-4" />
          <p className="font-mono text-muted-foreground">Cargando...</p>
        </div>
      </div>
    );
  }

  const handleSubmitAnswer = () => {
    if (selectedAnswer === null || !quizState) return;
    answerMutation.mutate({ attemptId: quizState.attemptId, answer: selectedAnswer });
  };

  const validateLeadForm = (): boolean => {
    const errors: Partial<LeadFormData> = {};
    
    if (!leadForm.email.trim()) {
      errors.email = "El correo es requerido";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(leadForm.email)) {
      errors.email = "Ingresa un correo válido";
    }
    
    if (!leadForm.firstName.trim()) {
      errors.firstName = "El nombre es requerido";
    }
    
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleLeadFormSubmit = () => {
    if (!validateLeadForm()) return;
    createLeadMutation.mutate(leadForm);
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const getLevelDescription = (level: string) => {
    const descriptions: Record<string, string> = {
      A1: "Principiante - Puedes entender y usar expresiones básicas del día a día",
      A2: "Elemental - Puedes comunicarte en tareas simples y rutinarias",
      B1: "Intermedio - Puedes desenvolverte en situaciones de viaje y trabajo",
      B2: "Intermedio Alto - Puedes interactuar con fluidez y espontaneidad",
      C1: "Avanzado - Puedes expresarte de forma flexible y efectiva",
      C2: "Proficiente - Puedes expresarte con precisión en situaciones complejas",
    };
    return descriptions[level] || "";
  };

  const getConfidenceLabel = (confidence: string) => {
    const labels: Record<string, string> = {
      high: "Alta confianza",
      medium: "Confianza media",
      low: "Baja confianza",
    };
    return labels[confidence] || confidence;
  };

  // Results screen
  if (quizResult) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <header className="border-b border-border p-4">
          <div className="max-w-4xl mx-auto flex items-center justify-between">
            <h1 className="font-display text-2xl text-primary uppercase">CogniBoost</h1>
          </div>
        </header>

        <main className="flex-1 flex items-center justify-center p-6">
          <div className="w-full max-w-lg">
            <Card className="border-border">
              <CardHeader className="text-center pb-2">
                <Trophy className="w-16 h-16 text-primary mx-auto mb-4" />
                <CardTitle className="font-display text-2xl uppercase">¡Examen Completado!</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="text-center">
                  <div className="text-6xl font-display text-primary mb-2">{quizResult.level}</div>
                  <p className="font-mono text-muted-foreground">{getLevelDescription(quizResult.level)}</p>
                </div>

                <div className="grid grid-cols-2 gap-4 text-center">
                  <div className="p-4 bg-muted">
                    <div className="text-2xl font-display">{quizResult.correctAnswers}/{quizResult.totalQuestions}</div>
                    <p className="font-mono text-sm text-muted-foreground">Respuestas Correctas</p>
                  </div>
                  <div className="p-4 bg-muted">
                    <div className="text-lg font-mono">{getConfidenceLabel(quizResult.confidence)}</div>
                    <p className="font-mono text-sm text-muted-foreground">Nivel de Confianza</p>
                  </div>
                </div>

                <div className="p-4 bg-primary/10 border border-primary/20 text-center">
                  <Mail className="w-8 h-8 text-primary mx-auto mb-2" />
                  <p className="font-mono text-sm">
                    Te hemos enviado tus resultados por correo electrónico.
                  </p>
                </div>

                <div className="space-y-3">
                  {user ? (
                    <>
                      <Button
                        className="w-full"
                        onClick={() => setLocation("/onboarding")}
                        data-testid="button-continue-onboarding"
                      >
                        Continuar con la Personalización
                        <ArrowRight className="w-4 h-4 ml-2" />
                      </Button>
                      <Button
                        variant="outline"
                        className="w-full"
                        onClick={() => setLocation("/dashboard")}
                        data-testid="button-go-dashboard"
                      >
                        Ir al Dashboard
                      </Button>
                    </>
                  ) : (
                    <>
                      <Button
                        className="w-full"
                        onClick={() => {
                          localStorage.setItem("cogniboost_quiz_result", JSON.stringify(quizResult));
                          window.location.href = "/api/login?returnTo=/onboarding";
                        }}
                        data-testid="button-signup-after-quiz"
                      >
                        Crear Cuenta Gratis
                        <ArrowRight className="w-4 h-4 ml-2" />
                      </Button>
                      <Button
                        variant="outline"
                        className="w-full"
                        onClick={() => setLocation("/")}
                        data-testid="button-go-home"
                      >
                        Volver al Inicio
                      </Button>
                    </>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </main>
      </div>
    );
  }

  // Quiz intro + lead capture form (for non-authenticated users)
  if (!quizState) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <header className="border-b border-border p-4">
          <div className="max-w-4xl mx-auto flex items-center justify-between">
            <h1 className="font-display text-2xl text-primary uppercase">CogniBoost</h1>
          </div>
        </header>

        <main className="flex-1 flex items-center justify-center p-6">
          <div className="w-full max-w-lg">
            <Card className="border-border">
              <CardHeader className="text-center">
                <Target className="w-16 h-16 text-primary mx-auto mb-4" />
                <CardTitle className="font-display text-2xl uppercase">Examen de Nivel</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-4 font-mono text-sm">
                  <div className="flex items-start gap-3">
                    <BookOpen className="w-5 h-5 text-primary shrink-0 mt-0.5" />
                    <p>8 preguntas adaptativas que evalúan tu gramática, vocabulario y comprensión</p>
                  </div>
                  <div className="flex items-start gap-3">
                    <Clock className="w-5 h-5 text-primary shrink-0 mt-0.5" />
                    <p>Tiempo límite de 30 minutos - responde a tu ritmo</p>
                  </div>
                  <div className="flex items-start gap-3">
                    <Target className="w-5 h-5 text-primary shrink-0 mt-0.5" />
                    <p>Resultados inmediatos con tu nivel CEFR (A1-C2)</p>
                  </div>
                </div>

                {user ? (
                  <>
                    <div className="bg-muted p-4">
                      <p className="font-mono text-sm text-muted-foreground">
                        Este examen usa inteligencia artificial para adaptar las preguntas según tu desempeño y determinar tu nivel con mayor precisión.
                      </p>
                    </div>

                    <Button
                      className="w-full"
                      onClick={() => startQuizMutation.mutate(undefined)}
                      disabled={startQuizMutation.isPending}
                      data-testid="button-start-quiz"
                    >
                      {startQuizMutation.isPending ? (
                        <Loader2 className="w-4 h-4 animate-spin mr-2" />
                      ) : null}
                      Comenzar Examen
                    </Button>
                  </>
                ) : (
                  <>
                    <div className="bg-muted p-4">
                      <p className="font-mono text-sm text-muted-foreground">
                        Ingresa tu información para recibir tus resultados por correo electrónico.
                      </p>
                    </div>

                    <div className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="firstName" className="font-mono text-sm">
                            Nombre *
                          </Label>
                          <Input
                            id="firstName"
                            value={leadForm.firstName}
                            onChange={(e) => setLeadForm({ ...leadForm, firstName: e.target.value })}
                            placeholder="Tu nombre"
                            className={formErrors.firstName ? "border-destructive" : ""}
                            data-testid="input-first-name"
                          />
                          {formErrors.firstName && (
                            <p className="text-xs text-destructive font-mono">{formErrors.firstName}</p>
                          )}
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="lastName" className="font-mono text-sm">
                            Apellido
                          </Label>
                          <Input
                            id="lastName"
                            value={leadForm.lastName}
                            onChange={(e) => setLeadForm({ ...leadForm, lastName: e.target.value })}
                            placeholder="Tu apellido"
                            data-testid="input-last-name"
                          />
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="email" className="font-mono text-sm">
                          Correo electrónico *
                        </Label>
                        <Input
                          id="email"
                          type="email"
                          value={leadForm.email}
                          onChange={(e) => setLeadForm({ ...leadForm, email: e.target.value })}
                          placeholder="tu@correo.com"
                          className={formErrors.email ? "border-destructive" : ""}
                          data-testid="input-email"
                        />
                        {formErrors.email && (
                          <p className="text-xs text-destructive font-mono">{formErrors.email}</p>
                        )}
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="phone" className="font-mono text-sm">
                          Teléfono (opcional)
                        </Label>
                        <Input
                          id="phone"
                          type="tel"
                          value={leadForm.phone}
                          onChange={(e) => setLeadForm({ ...leadForm, phone: e.target.value })}
                          placeholder="+52 555 123 4567"
                          data-testid="input-phone"
                        />
                      </div>
                    </div>

                    <Button
                      className="w-full"
                      onClick={handleLeadFormSubmit}
                      disabled={createLeadMutation.isPending || startQuizMutation.isPending}
                      data-testid="button-start-quiz"
                    >
                      {(createLeadMutation.isPending || startQuizMutation.isPending) ? (
                        <Loader2 className="w-4 h-4 animate-spin mr-2" />
                      ) : null}
                      Comenzar Examen
                    </Button>
                  </>
                )}

                <Button
                  variant="ghost"
                  className="w-full"
                  onClick={() => setLocation("/")}
                  data-testid="button-back-home"
                >
                  Volver al Inicio
                </Button>
              </CardContent>
            </Card>
          </div>
        </main>
      </div>
    );
  }

  const progressPercent = ((quizState.currentStep - 1) / quizState.totalQuestions) * 100;

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="border-b border-border p-4">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <h1 className="font-display text-2xl text-primary uppercase">CogniBoost</h1>
          <div className="flex items-center gap-4 font-mono text-sm">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4" />
              <span className={timeLeft < 300 ? "text-destructive" : ""}>{formatTime(timeLeft)}</span>
            </div>
            <span className="text-muted-foreground">
              Pregunta {quizState.currentStep} de {quizState.totalQuestions}
            </span>
          </div>
        </div>
      </header>

      <div className="max-w-4xl mx-auto w-full px-4 py-2">
        <Progress value={progressPercent} className="h-2" />
      </div>

      <main className="flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-2xl">
          {lastFeedback && (
            <div
              className={`mb-4 p-4 flex items-start gap-3 ${
                lastFeedback.isCorrect ? "bg-green-500/10 border-green-500" : "bg-destructive/10 border-destructive"
              } border`}
              data-testid="feedback-banner"
            >
              {lastFeedback.isCorrect ? (
                <CheckCircle className="w-5 h-5 text-green-500 shrink-0" />
              ) : (
                <XCircle className="w-5 h-5 text-destructive shrink-0" />
              )}
              <div className="font-mono text-sm">
                <span className="font-semibold">{lastFeedback.isCorrect ? "¡Correcto!" : "Incorrecto"}</span>
                <p className="text-muted-foreground mt-1">{lastFeedback.feedback}</p>
              </div>
            </div>
          )}

          <Card className="border-border">
            <CardHeader>
              <div className="flex items-center justify-between">
                <span className="text-xs font-mono uppercase text-muted-foreground">
                  Nivel: {quizState.question.difficulty}
                </span>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              <p className="font-mono text-lg" data-testid="question-text">
                {quizState.question.text}
              </p>

              <div className="space-y-3">
                {quizState.question.options.map((option, index) => (
                  <button
                    key={index}
                    onClick={() => setSelectedAnswer(index)}
                    disabled={answerMutation.isPending}
                    className={`w-full text-left p-4 border font-mono transition-colors hover-elevate ${
                      selectedAnswer === index
                        ? "border-primary bg-primary/10"
                        : "border-border"
                    }`}
                    data-testid={`option-${index}`}
                  >
                    <span className="font-semibold mr-3">
                      {String.fromCharCode(65 + index)}.
                    </span>
                    {option}
                  </button>
                ))}
              </div>

              <Button
                className="w-full"
                onClick={handleSubmitAnswer}
                disabled={selectedAnswer === null || answerMutation.isPending}
                data-testid="button-submit-answer"
              >
                {answerMutation.isPending ? (
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                ) : null}
                {quizState.currentStep === quizState.totalQuestions ? "Finalizar Examen" : "Siguiente Pregunta"}
              </Button>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
