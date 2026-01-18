import { useState, useEffect, useRef } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Loader2, ChevronRight, ChevronLeft, Check, Sparkles, BookOpen, Clock, Target, Award } from "lucide-react";

// Storage key for anonymous quiz ID
const ANONYMOUS_ID_KEY = "cogniboost_anonymous_id";

const steps = [
  { id: 1, title: "Nivel", icon: BookOpen },
  { id: 2, title: "Metas", icon: Target },
  { id: 3, title: "Disponibilidad", icon: Clock },
  { id: 4, title: "Intereses", icon: Sparkles },
];

const englishLevels = [
  { value: "A1", label: "Principiante (A1)", description: "Puedo entender y usar expresiones básicas" },
  { value: "A2", label: "Elemental (A2)", description: "Puedo comunicarme en tareas simples y rutinarias" },
  { value: "B1", label: "Intermedio (B1)", description: "Puedo describir experiencias y dar opiniones breves" },
  { value: "B2", label: "Intermedio Alto (B2)", description: "Puedo interactuar con fluidez con hablantes nativos" },
  { value: "C1", label: "Avanzado (C1)", description: "Puedo expresarme con fluidez y espontaneidad" },
  { value: "C2", label: "Maestría (C2)", description: "Puedo entender y expresar todo con facilidad" },
];

const learningGoalsOptions = [
  { value: "career", label: "Avanzar en mi carrera profesional" },
  { value: "travel", label: "Viajar y comunicarme en el extranjero" },
  { value: "academic", label: "Estudios académicos o certificaciones" },
  { value: "personal", label: "Desarrollo personal y pasatiempo" },
  { value: "business", label: "Negocios internacionales" },
  { value: "immigration", label: "Emigrar a un país angloparlante" },
];

const availabilityOptions = [
  { value: "mornings", label: "Mañanas (6am - 12pm)" },
  { value: "afternoons", label: "Tardes (12pm - 6pm)" },
  { value: "evenings", label: "Noches (6pm - 10pm)" },
  { value: "weekends", label: "Fines de semana" },
  { value: "flexible", label: "Horario flexible" },
];

const weeklyHoursOptions = [
  { value: "1-3", label: "1-3 horas por semana" },
  { value: "4-6", label: "4-6 horas por semana" },
  { value: "7-10", label: "7-10 horas por semana" },
  { value: "10+", label: "Más de 10 horas por semana" },
];

const interestsOptions = [
  { value: "business", label: "Negocios" },
  { value: "technology", label: "Tecnología" },
  { value: "travel", label: "Viajes" },
  { value: "culture", label: "Cultura y Arte" },
  { value: "healthcare", label: "Salud" },
  { value: "finance", label: "Finanzas" },
  { value: "academic", label: "Académico" },
  { value: "everyday", label: "Conversación Diaria" },
];

export default function Onboarding() {
  const { user, isLoading, isAuthenticated } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [currentStep, setCurrentStep] = useState(1);
  const [formData, setFormData] = useState({
    englishLevel: "",
    learningGoals: [] as string[],
    availability: "",
    weeklyHoursGoal: "",
    interests: [] as string[],
  });

  const claimAttemptedRef = useRef(false);
  
  // Claim anonymous quiz results when user logs in
  useEffect(() => {
    const claimAnonymousQuiz = async () => {
      if (!user || claimAttemptedRef.current) return;
      claimAttemptedRef.current = true;
      
      const anonymousId = localStorage.getItem(ANONYMOUS_ID_KEY);
      if (!anonymousId) return;
      
      try {
        const response = await apiRequest("POST", "/api/placement/claim", { anonymousId });
        const data = await response.json();
        
        if (data.claimed) {
          // Refresh user data to get the claimed placement level
          queryClient.invalidateQueries({ queryKey: ["/api/user"] });
          toast({
            title: "¡Resultados guardados!",
            description: `Tu nivel ${data.computedLevel} ha sido guardado en tu perfil.`,
          });
          // Pre-fill the level
          setFormData(prev => ({ ...prev, englishLevel: data.computedLevel }));
        }
      } catch (error) {
        console.error("Failed to claim anonymous quiz:", error);
      }
    };
    
    if (user && !user.placementLevel) {
      claimAnonymousQuiz();
    }
  }, [user, queryClient, toast]);

  // Pre-fill level from placement quiz if available
  useEffect(() => {
    if (user?.placementLevel && !formData.englishLevel) {
      setFormData(prev => ({ ...prev, englishLevel: user.placementLevel as string }));
    }
  }, [user?.placementLevel, formData.englishLevel]);

  const hasPlacementResult = !!user?.placementLevel;

  const saveOnboardingMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      const response = await apiRequest("POST", "/api/onboarding", data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/auth/me"] });
      toast({
        title: "¡Perfil completado!",
        description: "Tu experiencia de aprendizaje ha sido personalizada.",
      });
      setLocation("/dashboard");
    },
    onError: () => {
      toast({
        title: "Error",
        description: "No se pudo guardar tu perfil. Intenta de nuevo.",
        variant: "destructive",
      });
    },
  });

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!isAuthenticated) {
    window.location.href = "/api/login";
    return null;
  }

  const handleNext = () => {
    if (currentStep < 4) {
      setCurrentStep(currentStep + 1);
    } else {
      saveOnboardingMutation.mutate(formData);
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const canProceed = () => {
    switch (currentStep) {
      case 1:
        return formData.englishLevel !== "";
      case 2:
        return formData.learningGoals.length > 0;
      case 3:
        return formData.availability !== "" && formData.weeklyHoursGoal !== "";
      case 4:
        return formData.interests.length > 0;
      default:
        return false;
    }
  };

  const toggleArrayValue = (array: string[], value: string) => {
    return array.includes(value)
      ? array.filter((v) => v !== value)
      : [...array, value];
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="border-b border-border p-4">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <h1 className="font-display text-2xl text-primary uppercase">CogniBoost</h1>
          <span className="font-mono text-sm text-muted-foreground">
            Hola, {user?.firstName || "estudiante"}
          </span>
        </div>
      </header>

      <main className="flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-2xl">
          <div className="text-center mb-8">
            <h2 className="font-display text-3xl uppercase mb-2">Personaliza tu Experiencia</h2>
            <p className="font-mono text-muted-foreground">
              Cuéntanos sobre ti para recomendarte los mejores cursos
            </p>
          </div>

          <div className="flex justify-center gap-2 mb-8">
            {steps.map((step) => {
              const Icon = step.icon;
              const isActive = currentStep === step.id;
              const isCompleted = currentStep > step.id;
              return (
                <div
                  key={step.id}
                  data-testid={`step-indicator-${step.id}`}
                  className={`flex items-center gap-2 px-4 py-2 font-mono text-sm transition-colors ${
                    isActive
                      ? "bg-primary text-primary-foreground"
                      : isCompleted
                      ? "bg-primary/20 text-primary"
                      : "bg-muted text-muted-foreground"
                  }`}
                >
                  {isCompleted ? (
                    <Check className="w-4 h-4" />
                  ) : (
                    <Icon className="w-4 h-4" />
                  )}
                  <span className="hidden sm:inline">{step.title}</span>
                </div>
              );
            })}
          </div>

          <Card className="border-border">
            <CardContent className="p-6">
              {currentStep === 1 && (
                <div className="space-y-4">
                  <Label className="font-mono text-lg">¿Cuál es tu nivel actual de inglés?</Label>
                  {hasPlacementResult && (
                    <div className="flex items-center gap-2 p-3 bg-primary/10 border border-primary/30" data-testid="placement-recommendation">
                      <Award className="w-5 h-5 text-primary" />
                      <span className="font-mono text-sm">
                        Según tu examen de nivel, te recomendamos: <strong className="text-primary">{user?.placementLevel}</strong>
                      </span>
                    </div>
                  )}
                  <RadioGroup
                    value={formData.englishLevel}
                    onValueChange={(value) => setFormData({ ...formData, englishLevel: value })}
                    className="space-y-3"
                  >
                    {englishLevels.map((level) => {
                      const isRecommended = hasPlacementResult && user?.placementLevel === level.value;
                      return (
                        <div
                          key={level.value}
                          className={`flex items-start space-x-3 p-4 border cursor-pointer hover-elevate ${
                            formData.englishLevel === level.value
                              ? "border-primary bg-primary/10"
                              : "border-border"
                          }`}
                          onClick={() => setFormData({ ...formData, englishLevel: level.value })}
                          data-testid={`radio-level-${level.value}`}
                        >
                          <RadioGroupItem value={level.value} id={level.value} />
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <Label htmlFor={level.value} className="font-mono font-semibold cursor-pointer">
                                {level.label}
                              </Label>
                              {isRecommended && (
                                <Badge variant="default" className="text-xs" data-testid={`badge-recommended-${level.value}`}>
                                  <Award className="w-3 h-3 mr-1" />
                                  Recomendado
                                </Badge>
                              )}
                            </div>
                            <p className="font-mono text-sm text-muted-foreground mt-1">
                              {level.description}
                            </p>
                          </div>
                        </div>
                      );
                    })}
                  </RadioGroup>
                </div>
              )}

              {currentStep === 2 && (
                <div className="space-y-4">
                  <Label className="font-mono text-lg">¿Cuáles son tus metas de aprendizaje?</Label>
                  <p className="font-mono text-sm text-muted-foreground">
                    Selecciona todas las que apliquen
                  </p>
                  <div className="grid gap-3">
                    {learningGoalsOptions.map((goal) => (
                      <div
                        key={goal.value}
                        className={`flex items-center space-x-3 p-4 border cursor-pointer hover-elevate ${
                          formData.learningGoals.includes(goal.value)
                            ? "border-primary bg-primary/10"
                            : "border-border"
                        }`}
                        onClick={() =>
                          setFormData({
                            ...formData,
                            learningGoals: toggleArrayValue(formData.learningGoals, goal.value),
                          })
                        }
                        data-testid={`checkbox-goal-${goal.value}`}
                      >
                        <Checkbox
                          checked={formData.learningGoals.includes(goal.value)}
                          onCheckedChange={() =>
                            setFormData({
                              ...formData,
                              learningGoals: toggleArrayValue(formData.learningGoals, goal.value),
                            })
                          }
                        />
                        <Label className="font-mono cursor-pointer flex-1">{goal.label}</Label>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {currentStep === 3 && (
                <div className="space-y-6">
                  <div className="space-y-4">
                    <Label className="font-mono text-lg">¿Cuándo prefieres estudiar?</Label>
                    <RadioGroup
                      value={formData.availability}
                      onValueChange={(value) => setFormData({ ...formData, availability: value })}
                      className="grid gap-3"
                    >
                      {availabilityOptions.map((option) => (
                        <div
                          key={option.value}
                          className={`flex items-center space-x-3 p-4 border cursor-pointer hover-elevate ${
                            formData.availability === option.value
                              ? "border-primary bg-primary/10"
                              : "border-border"
                          }`}
                          onClick={() => setFormData({ ...formData, availability: option.value })}
                          data-testid={`radio-availability-${option.value}`}
                        >
                          <RadioGroupItem value={option.value} id={`avail-${option.value}`} />
                          <Label htmlFor={`avail-${option.value}`} className="font-mono cursor-pointer flex-1">
                            {option.label}
                          </Label>
                        </div>
                      ))}
                    </RadioGroup>
                  </div>

                  <div className="space-y-4">
                    <Label className="font-mono text-lg">¿Cuántas horas puedes dedicar por semana?</Label>
                    <RadioGroup
                      value={formData.weeklyHoursGoal}
                      onValueChange={(value) => setFormData({ ...formData, weeklyHoursGoal: value })}
                      className="grid gap-3"
                    >
                      {weeklyHoursOptions.map((option) => (
                        <div
                          key={option.value}
                          className={`flex items-center space-x-3 p-4 border cursor-pointer hover-elevate ${
                            formData.weeklyHoursGoal === option.value
                              ? "border-primary bg-primary/10"
                              : "border-border"
                          }`}
                          onClick={() => setFormData({ ...formData, weeklyHoursGoal: option.value })}
                          data-testid={`radio-hours-${option.value}`}
                        >
                          <RadioGroupItem value={option.value} id={`hours-${option.value}`} />
                          <Label htmlFor={`hours-${option.value}`} className="font-mono cursor-pointer flex-1">
                            {option.label}
                          </Label>
                        </div>
                      ))}
                    </RadioGroup>
                  </div>
                </div>
              )}

              {currentStep === 4 && (
                <div className="space-y-4">
                  <Label className="font-mono text-lg">¿Qué temas te interesan más?</Label>
                  <p className="font-mono text-sm text-muted-foreground">
                    Selecciona al menos uno para personalizar tus recomendaciones
                  </p>
                  <div className="grid grid-cols-2 gap-3">
                    {interestsOptions.map((interest) => (
                      <div
                        key={interest.value}
                        className={`flex items-center space-x-3 p-4 border cursor-pointer hover-elevate ${
                          formData.interests.includes(interest.value)
                            ? "border-accent bg-accent/10"
                            : "border-border"
                        }`}
                        onClick={() =>
                          setFormData({
                            ...formData,
                            interests: toggleArrayValue(formData.interests, interest.value),
                          })
                        }
                        data-testid={`checkbox-interest-${interest.value}`}
                      >
                        <Checkbox
                          checked={formData.interests.includes(interest.value)}
                          onCheckedChange={() =>
                            setFormData({
                              ...formData,
                              interests: toggleArrayValue(formData.interests, interest.value),
                            })
                          }
                        />
                        <Label className="font-mono cursor-pointer flex-1">{interest.label}</Label>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex justify-between mt-8">
                <Button
                  variant="outline"
                  onClick={handleBack}
                  disabled={currentStep === 1}
                  data-testid="button-back"
                >
                  <ChevronLeft className="w-4 h-4 mr-2" />
                  Atrás
                </Button>
                <Button
                  onClick={handleNext}
                  disabled={!canProceed() || saveOnboardingMutation.isPending}
                  data-testid="button-next"
                >
                  {saveOnboardingMutation.isPending ? (
                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                  ) : null}
                  {currentStep === 4 ? "Completar" : "Siguiente"}
                  {currentStep < 4 && <ChevronRight className="w-4 h-4 ml-2" />}
                </Button>
              </div>
            </CardContent>
          </Card>

          <p className="text-center font-mono text-sm text-muted-foreground mt-4">
            <button
              onClick={() => setLocation("/dashboard")}
              className="underline hover:text-foreground"
              data-testid="link-skip-onboarding"
            >
              Omitir por ahora
            </button>
          </p>
        </div>
      </main>
    </div>
  );
}
