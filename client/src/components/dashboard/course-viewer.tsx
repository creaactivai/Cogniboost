import { useState, useEffect, useRef } from "react";
import { useParams, Link, useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import {
  ArrowLeft,
  Play,
  CheckCircle,
  XCircle,
  Clock,
  FileText,
  ClipboardList,
  Trophy,
  RotateCcw,
  ChevronDown,
  ChevronRight,
  Lock,
  Unlock,
  Loader2,
} from "lucide-react";
import type { Course, Lesson, Quiz, QuizQuestion } from "@shared/schema";

interface QuizWithQuestions extends Quiz {
  questions: Array<{
    id: string;
    question: string;
    options: string[];
    orderIndex: number;
  }>;
}

interface QuizResult {
  attempt: any;
  results: Array<{
    questionId: string;
    question: string;
    userAnswer: number;
    correctAnswer: number;
    isCorrect: boolean;
    explanation?: string;
  }>;
  score: number;
  isPassed: boolean;
  passingScore: number;
}

interface LessonProgressItem {
  id: string;
  title: string;
  orderIndex: number;
  isOpen: boolean;
  isPreview: boolean;
  isCompleted: boolean;
  quizPassed: boolean;
  hasQuiz: boolean;
  isUnlocked: boolean;
  isLockedBySubscription: boolean;
}

interface CourseProgress {
  lessons: LessonProgressItem[];
  overallProgress: number;
  userSubscriptionTier: string;
}

export function CourseViewer() {
  const params = useParams<{ courseId: string; lessonId?: string }>();
  const { courseId, lessonId } = params;
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const hasSubmittedRef = useRef(false);
  
  const [selectedLessonId, setSelectedLessonId] = useState<string | null>(lessonId || null);
  const [showQuiz, setShowQuiz] = useState(false);
  const [quizAnswers, setQuizAnswers] = useState<Record<string, number>>({});
  const [quizResult, setQuizResult] = useState<QuizResult | null>(null);
  const [timeLeft, setTimeLeft] = useState<number | null>(null);

  useEffect(() => {
    if (lessonId && lessonId !== selectedLessonId) {
      setSelectedLessonId(lessonId);
      setShowQuiz(false);
      setQuizResult(null);
    }
  }, [lessonId]);

  const { data: course, isLoading: courseLoading } = useQuery<Course>({
    queryKey: ["/api/courses", courseId],
    enabled: !!courseId,
  });

  const { data: lessons, isLoading: lessonsLoading } = useQuery<Lesson[]>({
    queryKey: ["/api/courses", courseId, "lessons"],
    enabled: !!courseId,
  });

  const { data: courseProgress, refetch: refetchProgress, isLoading: isLoadingProgress } = useQuery<CourseProgress>({
    queryKey: ["/api/courses", courseId, "progress"],
    enabled: !!courseId,
  });

  // Create a map for quick lookup of lesson unlock status
  const lessonProgressMap = new Map(
    courseProgress?.lessons.map(l => [l.id, l]) || []
  );

  const selectedLesson = lessons?.find(l => l.id === selectedLessonId);

  const { data: quiz, isLoading: quizLoading, refetch: refetchQuiz } = useQuery<QuizWithQuestions>({
    queryKey: ["/api/lessons", selectedLessonId, "quiz"],
    enabled: !!selectedLessonId && showQuiz,
  });

  const markCompleteMutation = useMutation({
    mutationFn: async (lessonId: string) => {
      const response = await apiRequest("POST", `/api/lessons/${lessonId}/complete`, {});
      return response.json();
    },
    onSuccess: () => {
      refetchProgress();
      toast({
        title: "¡Lección completada!",
        description: "Has completado esta lección exitosamente.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "No se pudo marcar la lección como completada.",
        variant: "destructive",
      });
    },
  });

  const submitQuizMutation = useMutation({
    mutationFn: async (answers: number[]) => {
      const response = await apiRequest("POST", `/api/quizzes/${quiz?.id}/attempt`, { answers });
      return response.json();
    },
    onSuccess: (result: QuizResult) => {
      setQuizResult(result);
      setTimeLeft(null);
      // Refetch progress to update unlock status if quiz passed
      if (result.isPassed) {
        refetchProgress();
      }
      toast({
        title: result.isPassed ? "¡Felicidades!" : "Inténtalo de nuevo",
        description: result.isPassed 
          ? `Aprobaste con ${result.score}%`
          : `Obtuviste ${result.score}%. Necesitas ${result.passingScore}% para aprobar.`,
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "No se pudo enviar el quiz. Inténtalo de nuevo.",
        variant: "destructive",
      });
    },
  });

  useEffect(() => {
    if (quiz?.timeLimit && showQuiz && !quizResult && timeLeft === null) {
      setTimeLeft(quiz.timeLimit * 60);
    }
  }, [quiz, showQuiz, quizResult, timeLeft]);

  const sortedQuestions = quiz?.questions?.slice().sort((a, b) => a.orderIndex - b.orderIndex) || [];

  useEffect(() => {
    if (timeLeft !== null && timeLeft > 0) {
      const timer = setTimeout(() => setTimeLeft(timeLeft - 1), 1000);
      return () => clearTimeout(timer);
    } else if (timeLeft === 0 && !hasSubmittedRef.current) {
      handleSubmitQuiz();
    }
  }, [timeLeft]);

  const handleSubmitQuiz = () => {
    if (!quiz || hasSubmittedRef.current || submitQuizMutation.isPending) return;
    hasSubmittedRef.current = true;
    const answers = sortedQuestions.map((q) => quizAnswers[q.id] ?? -1);
    submitQuizMutation.mutate(answers);
  };

  const resetQuiz = () => {
    setQuizAnswers({});
    setQuizResult(null);
    setTimeLeft(null);
    hasSubmittedRef.current = false;
    refetchQuiz();
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const allQuestionsAnswered = sortedQuestions.length > 0 && sortedQuestions.every((q) => quizAnswers[q.id] !== undefined);

  if (courseLoading || lessonsLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent animate-spin" style={{ borderRadius: 0 }} />
      </div>
    );
  }

  if (!course) {
    return (
      <div className="text-center py-12">
        <p className="font-mono text-muted-foreground">Curso no encontrado</p>
        <Link href="/dashboard/courses">
          <Button className="mt-4" variant="outline">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Volver a Cursos
          </Button>
        </Link>
      </div>
    );
  }

  const userTier = courseProgress?.userSubscriptionTier || 'free';
  const isFreeUser = userTier === 'free';
  const lockedLessonsCount = courseProgress?.lessons.filter(l => l.isLockedBySubscription).length || 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/dashboard/courses">
          <Button variant="ghost" size="icon" data-testid="button-back-courses">
            <ArrowLeft className="w-5 h-5" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-display uppercase">{course.title}</h1>
          <p className="text-sm font-mono text-muted-foreground">
            {course.level} · {lessons?.length || 0} lecciones
          </p>
        </div>
      </div>

      {isFreeUser && lockedLessonsCount > 0 && (
        <Card className="p-4 bg-gradient-to-r from-primary/10 to-primary/5 border-primary/20" data-testid="card-upgrade-banner">
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-primary/20 flex items-center justify-center">
                <Lock className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="font-mono font-semibold text-sm">Plan Gratuito</p>
                <p className="text-xs text-muted-foreground">
                  {lockedLessonsCount} lecciones bloqueadas. Actualiza para acceder a todo el contenido.
                </p>
              </div>
            </div>
            <Link href="/#pricing">
              <Button size="sm" data-testid="button-upgrade-plan">
                <Unlock className="w-4 h-4 mr-2" />
                Actualizar Plan
              </Button>
            </Link>
          </div>
        </Card>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1 space-y-2">
          <h2 className="font-mono font-semibold mb-3 text-sm uppercase tracking-wider text-muted-foreground">
            Contenido del Curso
          </h2>
          {isLoadingProgress && (
            <div className="text-center py-4">
              <Loader2 className="w-5 h-5 animate-spin mx-auto text-muted-foreground" />
              <p className="text-xs text-muted-foreground mt-2">Cargando progreso...</p>
            </div>
          )}
          {lessons?.sort((a, b) => a.orderIndex - b.orderIndex).map((lesson, index) => {
            const progress = lessonProgressMap.get(lesson.id);
            // Use strict server-side unlock status only - never fallback to client-side logic
            // Default to locked if progress data is missing to prevent bypass
            const isUnlocked = isLoadingProgress 
              ? false // While loading, treat all lessons as locked to prevent bypass
              : (progress?.isUnlocked ?? false); // Default to locked when no progress data
            const isCompleted = progress?.isCompleted ?? false;
            // Default to locked by subscription when no progress data (secure by default)
            const isLockedBySubscription = progress?.isLockedBySubscription ?? (index >= 3);
            
            return (
              <Card
                key={lesson.id}
                className={`p-3 ${isUnlocked ? 'cursor-pointer hover-elevate' : 'opacity-60 cursor-not-allowed'} ${
                  selectedLessonId === lesson.id ? 'border-primary bg-primary/5' : ''
                } ${isLockedBySubscription ? 'bg-gradient-to-r from-muted/50 to-muted/30' : ''}`}
                onClick={() => {
                  if (isLockedBySubscription) {
                    toast({
                      title: "Contenido Premium",
                      description: "Actualiza tu plan para acceder a todas las lecciones.",
                      variant: "default",
                    });
                    return;
                  }
                  if (!isUnlocked) {
                    toast({
                      title: "Lección bloqueada",
                      description: "Completa las lecciones anteriores para desbloquear esta.",
                      variant: "destructive",
                    });
                    return;
                  }
                  setSelectedLessonId(lesson.id);
                  setShowQuiz(false);
                  setQuizResult(null);
                  setLocation(`/dashboard/courses/${courseId}/lessons/${lesson.id}`);
                }}
                data-testid={`card-lesson-select-${lesson.id}`}
              >
                <div className="flex items-center gap-3">
                  <div
                    className="w-8 h-8 flex items-center justify-center text-xs font-mono"
                    style={{ 
                      backgroundColor: isCompleted ? '#33CBFB' : (selectedLessonId === lesson.id ? '#33CBFB' : (isLockedBySubscription ? '#667EEA' : '#e5e5e5')),
                      color: isCompleted || selectedLessonId === lesson.id || isLockedBySubscription ? 'white' : 'inherit'
                    }}
                  >
                    {isLockedBySubscription ? <Lock className="w-4 h-4" /> : (isCompleted ? <CheckCircle className="w-4 h-4" /> : index + 1)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={`font-mono text-sm truncate ${isLockedBySubscription ? 'blur-[2px]' : ''}`}>{lesson.title}</p>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      {lesson.duration > 0 && (
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {lesson.duration} min
                        </span>
                      )}
                      {lesson.isOpen && (
                        <Badge variant="outline" className="text-[10px] px-1 py-0">Abierta</Badge>
                      )}
                      {isLockedBySubscription && (
                        <Badge className="text-[10px] px-1.5 py-0 bg-primary text-primary-foreground">Premium</Badge>
                      )}
                    </div>
                  </div>
                  {isLockedBySubscription ? (
                    <Lock className="w-4 h-4 text-primary" />
                  ) : !isUnlocked ? (
                    <Lock className="w-4 h-4 text-muted-foreground" />
                  ) : selectedLessonId === lesson.id ? (
                    <ChevronDown className="w-4 h-4 text-primary" />
                  ) : (
                    <ChevronRight className="w-4 h-4 text-muted-foreground" />
                  )}
                </div>
              </Card>
            );
          })}
        </div>

        <div className="lg:col-span-2">
          {selectedLesson ? (
            <div className="space-y-6">
              {!showQuiz ? (
                <>
                  <Card className="p-6">
                    <h2 className="text-xl font-display uppercase mb-2">{selectedLesson.title}</h2>
                    <p className="font-mono text-muted-foreground mb-4">{selectedLesson.description}</p>

                    {selectedLesson.vimeoId && (
                      <div className="aspect-video bg-black mb-4">
                        <iframe
                          src={`https://player.vimeo.com/video/${selectedLesson.vimeoId}`}
                          className="w-full h-full"
                          allow="autoplay; fullscreen; picture-in-picture"
                          allowFullScreen
                        />
                      </div>
                    )}

                    {selectedLesson.htmlContent && (
                      <div 
                        className="lesson-html-content mb-6"
                        data-testid="lesson-html-content"
                      >
                        <iframe
                          srcDoc={selectedLesson.htmlContent}
                          className="w-full border-0 rounded-lg bg-white"
                          style={{ minHeight: "800px", height: "auto" }}
                          title={selectedLesson.title}
                          sandbox="allow-scripts"
                        />
                      </div>
                    )}

                    {selectedLesson.pdfMaterials && selectedLesson.pdfMaterials.length > 0 && (
                      <div className="space-y-2">
                        <h3 className="font-mono font-semibold text-sm uppercase tracking-wider text-muted-foreground">
                          Materiales
                        </h3>
                        {selectedLesson.pdfMaterials.map((url, index) => (
                          <a
                            key={index}
                            href={url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-2 p-2 border hover-elevate"
                            data-testid={`link-pdf-${index}`}
                          >
                            <FileText className="w-4 h-4 text-primary" />
                            <span className="font-mono text-sm">Material {index + 1}</span>
                          </a>
                        ))}
                      </div>
                    )}

                    {/* Mark as Complete Button */}
                    {(() => {
                      const lessonProgress = lessonProgressMap.get(selectedLesson.id);
                      const isCompleted = lessonProgress?.isCompleted ?? false;
                      const hasQuiz = lessonProgress?.hasQuiz ?? false;
                      
                      // Only show complete button if lesson has no quiz (lessons with quiz are completed via quiz)
                      if (!hasQuiz) {
                        return (
                          <div className="mt-4 pt-4 border-t">
                            <Button
                              onClick={() => markCompleteMutation.mutate(selectedLesson.id)}
                              disabled={isCompleted || markCompleteMutation.isPending}
                              className="w-full"
                              variant={isCompleted ? "outline" : "default"}
                              data-testid="button-mark-complete"
                            >
                              {isCompleted ? (
                                <>
                                  <CheckCircle className="w-4 h-4 mr-2" />
                                  Lección Completada
                                </>
                              ) : (
                                <>
                                  <Play className="w-4 h-4 mr-2" />
                                  Marcar como Completada
                                </>
                              )}
                            </Button>
                          </div>
                        );
                      }
                      return null;
                    })()}
                  </Card>

                  <Card className="p-6">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 flex items-center justify-center" style={{ backgroundColor: '#FD335A' }}>
                          <ClipboardList className="w-5 h-5 text-white" />
                        </div>
                        <div>
                          <h3 className="font-mono font-semibold">Quiz de la Lección</h3>
                          <p className="text-sm font-mono text-muted-foreground">
                            Evalúa tu comprensión del contenido
                          </p>
                        </div>
                      </div>
                      <Button
                        onClick={() => setShowQuiz(true)}
                        data-testid="button-start-quiz"
                      >
                        <Play className="w-4 h-4 mr-2" />
                        Iniciar Quiz
                      </Button>
                    </div>
                  </Card>
                </>
              ) : (
                <Card className="p-6">
                  {quizLoading ? (
                    <div className="flex items-center justify-center h-32">
                      <div className="w-8 h-8 border-2 border-primary border-t-transparent animate-spin" />
                    </div>
                  ) : !quiz ? (
                    <div className="text-center py-8">
                      <ClipboardList className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                      <p className="font-mono text-muted-foreground">
                        No hay quiz disponible para esta lección
                      </p>
                      <Button
                        variant="outline"
                        className="mt-4"
                        onClick={() => setShowQuiz(false)}
                      >
                        Volver a la Lección
                      </Button>
                    </div>
                  ) : quizResult ? (
                    <div className="space-y-6">
                      <div className="text-center py-6">
                        <div
                          className="w-20 h-20 mx-auto mb-4 flex items-center justify-center"
                          style={{ backgroundColor: quizResult.isPassed ? '#33CBFB' : '#FD335A' }}
                        >
                          {quizResult.isPassed ? (
                            <Trophy className="w-10 h-10 text-white" />
                          ) : (
                            <XCircle className="w-10 h-10 text-white" />
                          )}
                        </div>
                        <h2 className="text-2xl font-display uppercase mb-2">
                          {quizResult.isPassed ? '¡Aprobaste!' : 'No Aprobaste'}
                        </h2>
                        <p className="font-mono text-3xl font-bold" style={{ color: quizResult.isPassed ? '#33CBFB' : '#FD335A' }}>
                          {quizResult.score}%
                        </p>
                        <p className="font-mono text-sm text-muted-foreground mt-2">
                          Puntaje mínimo: {quizResult.passingScore}%
                        </p>
                      </div>

                      <div className="space-y-4">
                        <h3 className="font-mono font-semibold text-sm uppercase tracking-wider">
                          Revisión de Respuestas
                        </h3>
                        {quizResult.results.map((result, index) => {
                          const matchingQuestion = sortedQuestions.find(q => q.id === result.questionId);
                          return (
                            <div
                              key={result.questionId}
                              className={`p-4 border ${result.isCorrect ? 'border-green-500/30 bg-green-500/5' : 'border-red-500/30 bg-red-500/5'}`}
                            >
                              <div className="flex items-start gap-3">
                                {result.isCorrect ? (
                                  <CheckCircle className="w-5 h-5 text-green-500 mt-0.5" />
                                ) : (
                                  <XCircle className="w-5 h-5 text-red-500 mt-0.5" />
                                )}
                                <div className="flex-1">
                                  <p className="font-mono font-semibold mb-2">
                                    {index + 1}. {result.question}
                                  </p>
                                  {!result.isCorrect && matchingQuestion && (
                                    <p className="font-mono text-sm text-green-600 dark:text-green-400">
                                      Respuesta correcta: {matchingQuestion.options[result.correctAnswer]}
                                    </p>
                                  )}
                                  {result.explanation && (
                                    <p className="font-mono text-sm text-muted-foreground mt-2">
                                      {result.explanation}
                                    </p>
                                  )}
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>

                      <div className="flex gap-3">
                        <Button
                          variant="outline"
                          onClick={() => setShowQuiz(false)}
                          className="flex-1"
                        >
                          Volver a la Lección
                        </Button>
                        <Button
                          onClick={resetQuiz}
                          className="flex-1"
                          data-testid="button-retry-quiz"
                        >
                          <RotateCcw className="w-4 h-4 mr-2" />
                          Intentar de Nuevo
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-6">
                      <div className="flex items-center justify-between">
                        <div>
                          <h2 className="text-xl font-display uppercase">{quiz.title}</h2>
                          <p className="font-mono text-sm text-muted-foreground">
                            {quiz.questions.length} preguntas · Puntaje mínimo: {quiz.passingScore}%
                          </p>
                        </div>
                        {timeLeft !== null && (
                          <Badge
                            variant="outline"
                            className={`font-mono text-lg px-3 py-1 ${timeLeft < 60 ? 'border-red-500 text-red-500' : ''}`}
                          >
                            <Clock className="w-4 h-4 mr-2" />
                            {formatTime(timeLeft)}
                          </Badge>
                        )}
                      </div>

                      <Progress
                        value={(Object.keys(quizAnswers).length / sortedQuestions.length) * 100}
                        className="h-2"
                      />

                      <div className="space-y-6">
                        {sortedQuestions.map((question, index) => (
                          <div key={question.id} className="p-4 border" data-testid={`quiz-question-${index}`}>
                            <p className="font-mono font-semibold mb-4">
                              {index + 1}. {question.question}
                            </p>
                            <RadioGroup
                              value={quizAnswers[question.id]?.toString()}
                              onValueChange={(value) => setQuizAnswers({ ...quizAnswers, [question.id]: parseInt(value) })}
                            >
                              {question.options.map((option, optIndex) => (
                                <div
                                  key={optIndex}
                                  className="flex items-center space-x-3 p-3 border hover-elevate cursor-pointer"
                                  onClick={() => setQuizAnswers({ ...quizAnswers, [question.id]: optIndex })}
                                >
                                  <RadioGroupItem value={optIndex.toString()} id={`q${question.id}-opt${optIndex}`} />
                                  <Label htmlFor={`q${question.id}-opt${optIndex}`} className="font-mono cursor-pointer flex-1">
                                    {option}
                                  </Label>
                                </div>
                              ))}
                            </RadioGroup>
                          </div>
                        ))}
                      </div>

                      <div className="flex gap-3">
                        <Button
                          variant="outline"
                          onClick={() => setShowQuiz(false)}
                          className="flex-1"
                        >
                          Cancelar
                        </Button>
                        <Button
                          onClick={handleSubmitQuiz}
                          disabled={!allQuestionsAnswered || submitQuizMutation.isPending}
                          className="flex-1"
                          data-testid="button-submit-quiz"
                        >
                          {submitQuizMutation.isPending ? "Enviando..." : "Enviar Respuestas"}
                        </Button>
                      </div>
                    </div>
                  )}
                </Card>
              )}
            </div>
          ) : (
            <Card className="p-8 text-center">
              <Play className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
              <h3 className="font-mono font-semibold mb-2">Selecciona una Lección</h3>
              <p className="font-mono text-sm text-muted-foreground">
                Elige una lección del menú para comenzar a aprender
              </p>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
