import { useState, useEffect, useRef } from "react";
import { useParams, Link, useLocation, useSearch } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { useTranslation } from "@/lib/i18n";
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
  Youtube,
  Layers,
  Mic,
  PenLine,
  BookText,
  Headphones,
  MessagesSquare,
} from "lucide-react";
import type { Course, Lesson, Quiz, QuizQuestion } from "@shared/schema";

interface ModuleWithStatus {
  id: string;
  courseId: string;
  title: string;
  description: string | null;
  orderIndex: number;
  videoUrl: string | null;
  videoSource: string | null;
  videoQuizStatus: {
    quizId: string;
    passed: boolean;
    bestScore: number | null;
    attempts: number;
  } | null;
}

interface VideoQuizData {
  quiz: {
    id: string;
    title: string;
    description: string | null;
    passingScore: number;
    timeLimit: number | null;
    totalPoints: number;
  };
  questions: Array<{
    id: string;
    question: string;
    options: string[];
    orderIndex: number;
  }>;
  previousAttempts: number;
  bestScore: number | null;
  isPassed: boolean;
}

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

interface CourseViewerProps {
  isAdminPreview?: boolean;
}

export function CourseViewer({ isAdminPreview: isAdminPreviewProp }: CourseViewerProps = {}) {
  const params = useParams<{ courseId: string; lessonId?: string }>();
  const { courseId, lessonId } = params;
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const { user } = useAuth();
  const { t } = useTranslation();
  const hasSubmittedRef = useRef(false);
  
  // Check for admin preview mode via prop or URL parameter (legacy support)
  const searchParams = typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : null;
  const isAdminPreview = isAdminPreviewProp || (user?.isAdmin && searchParams?.get('preview') === 'admin');
  
  const [selectedLessonId, setSelectedLessonId] = useState<string | null>(lessonId || null);
  const [selectedVideoModuleId, setSelectedVideoModuleId] = useState<string | null>(null);
  const [showQuiz, setShowQuiz] = useState(false);
  const [showVideoQuiz, setShowVideoQuiz] = useState(false);
  const [quizAnswers, setQuizAnswers] = useState<Record<string, number>>({});
  const [quizResult, setQuizResult] = useState<QuizResult | null>(null);
  const [timeLeft, setTimeLeft] = useState<number | null>(null);
  const [collapsedModules, setCollapsedModules] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (lessonId && lessonId !== selectedLessonId) {
      setSelectedLessonId(lessonId);
      setShowQuiz(false);
      setQuizResult(null);
      hasSubmittedRef.current = false;
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

  const { data: modules = [] } = useQuery<ModuleWithStatus[]>({
    queryKey: ["/api/courses", courseId, "modules"],
    enabled: !!courseId,
  });

  const { data: videoQuizData, isLoading: videoQuizLoading, refetch: refetchVideoQuiz } = useQuery<VideoQuizData>({
    queryKey: ["/api/modules", selectedVideoModuleId, "video-quiz"],
    enabled: !!selectedVideoModuleId && showVideoQuiz,
  });

  const submitVideoQuizMutation = useMutation({
    mutationFn: async (answers: number[]) => {
      const response = await apiRequest("POST", `/api/quizzes/${videoQuizData?.quiz.id}/attempt`, { answers });
      return response.json();
    },
    onSuccess: (result: QuizResult) => {
      setQuizResult(result);
      setTimeLeft(null);
      if (result.isPassed) {
        queryClient.invalidateQueries({ queryKey: ["/api/courses", courseId, "modules"] });
        refetchProgress();
      }
      toast({
        title: result.isPassed ? "Congratulations!" : "Try again",
        description: result.isPassed
          ? `You passed with ${result.score}%`
          : `You scored ${result.score}%. You need ${result.passingScore}% to pass.`,
      });
    },
    onError: () => {
      hasSubmittedRef.current = false;
      toast({ title: "Error", description: "Could not submit quiz.", variant: "destructive" });
    },
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
        title: t("lesson.completed"),
        description: t("lesson.completedDesc"),
      });
    },
    onError: () => {
      toast({
        title: t("error"),
        description: t("lesson.completedError"),
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
        title: result.isPassed ? t("quiz.congrats") : t("quiz.tryAgain"),
        description: result.isPassed
          ? `Score: ${result.score}%`
          : `Score: ${result.score}%. Need ${result.passingScore}% to pass.`,
      });
    },
    onError: () => {
      hasSubmittedRef.current = false;
      toast({
        title: t("error"),
        description: t("quiz.submitError"),
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
        <p className="font-mono text-muted-foreground">Course not found</p>
        <Link href="/dashboard/courses">
          <Button className="mt-4" variant="outline">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to courses
          </Button>
        </Link>
      </div>
    );
  }

  const userTier = courseProgress?.userSubscriptionTier || 'free';
  const isFreeUser = userTier === 'free' && !isAdminPreview;
  const lockedLessonsCount = isAdminPreview ? 0 : (courseProgress?.lessons.filter(l => l.isLockedBySubscription).length || 0);

  return (
    <div className="space-y-6">
      {/* Admin Preview Banner */}
      {isAdminPreview && (
        <Card className="p-4 bg-gradient-to-r from-purple-500/20 to-purple-600/10 border-purple-500/30" data-testid="admin-preview-banner">
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-purple-500/20 flex items-center justify-center">
                <Play className="w-5 h-5 text-purple-600" />
              </div>
              <div>
                <p className="font-mono font-semibold text-sm text-purple-700 dark:text-purple-300">Modo Vista Previa Admin</p>
                <p className="text-xs text-muted-foreground">
                  {t("lesson.adminPreview")}
                </p>
              </div>
            </div>
            <Link href="/admin/courses">
              <Button size="sm" variant="outline" data-testid="button-back-to-admin">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Volver al Admin
              </Button>
            </Link>
          </div>
        </Card>
      )}
      
      <div className="flex items-center gap-4">
        <Link href={isAdminPreview ? "/admin/courses" : "/dashboard/courses"}>
          <Button variant="ghost" size="icon" data-testid="button-back-courses">
            <ArrowLeft className="w-5 h-5" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-display uppercase">{course.title}</h1>
          <p className="text-sm font-mono text-muted-foreground">
            {course.level} · {lessons?.length || 0} lessons
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
                <p className="font-mono font-semibold text-sm">Free Plan</p>
                <p className="text-xs text-muted-foreground">
                  {t("lesson.lockedCount", { count: lockedLessonsCount })}
                </p>
              </div>
            </div>
            <Link href="/#pricing">
              <Button size="sm" data-testid="button-upgrade-plan">
                <Unlock className="w-4 h-4 mr-2" />
                Upgrade plan
              </Button>
            </Link>
          </div>
        </Card>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1 space-y-2">
          <h2 className="font-mono font-semibold mb-3 text-sm uppercase tracking-wider text-muted-foreground">
            Course content
          </h2>
          {isLoadingProgress && (
            <div className="text-center py-4">
              <Loader2 className="w-5 h-5 animate-spin mx-auto text-muted-foreground" />
              <p className="text-xs text-muted-foreground mt-2">{t("lesson.loadingProgress")}</p>
            </div>
          )}
          {modules.length > 0 ? (
            // Module-grouped sidebar — top-academy visual: each module is its
            // own progress card with number + title + completion percentage.
            modules.sort((a, b) => a.orderIndex - b.orderIndex).map((mod, modIdx) => {
              const moduleLessons = lessons?.filter(l => (l as any).moduleId === mod.id)
                .sort((a, b) => a.orderIndex - b.orderIndex) || [];
              const isCollapsed = collapsedModules.has(mod.id);
              const toggleCollapse = () => setCollapsedModules(prev => {
                const next = new Set(prev);
                if (next.has(mod.id)) next.delete(mod.id);
                else next.add(mod.id);
                return next;
              });

              // Module-level progress: completed lessons out of total.
              const completedCount = moduleLessons.filter(l => lessonProgressMap.get(l.id)?.isCompleted).length;
              const totalCount = moduleLessons.length;
              const modulePct = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;
              const isModuleDone = totalCount > 0 && completedCount === totalCount;

              return (
                <div key={mod.id} className="space-y-2 mb-4">
                  {/* Module header card — proper visual anchor with number
                      tile, title, lesson count and progress bar. */}
                  <Card
                    className={`p-3 cursor-pointer hover-elevate transition-colors ${
                      isModuleDone ? 'border-cyan-300 dark:border-cyan-700' : ''
                    }`}
                    onClick={toggleCollapse}
                    data-testid={`module-header-${mod.id}`}
                  >
                    <div className="flex items-center gap-3">
                      {/* Module number tile */}
                      <div
                        className="w-11 h-11 rounded-lg flex items-center justify-center font-bold text-base flex-shrink-0"
                        style={{
                          backgroundColor: isModuleDone ? '#33CBFB' : 'hsl(var(--primary) / 0.10)',
                          color: isModuleDone ? 'white' : 'hsl(var(--primary))',
                        }}
                      >
                        {isModuleDone ? <CheckCircle className="w-5 h-5" /> : String(modIdx + 1).padStart(2, '0')}
                      </div>

                      {/* Title + progress meta. The big "01" tile already
                          conveys the module ordinal, and many real-world
                          modules are titled "Module 1", "Module 2" etc —
                          so we drop a redundant "Module N" small label and
                          surface a single bold title with a "X of Y lessons"
                          line underneath, which scales nicely whether the
                          title is generic or descriptive. */}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold truncate leading-tight">{mod.title}</p>
                        {totalCount > 0 && (
                          <p className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground mt-1">
                            {completedCount} of {totalCount} lessons
                          </p>
                        )}
                        {totalCount > 0 && (
                          <div className="mt-2 flex items-center gap-2">
                            <div className="flex-1 h-1 bg-muted rounded-full overflow-hidden">
                              <div
                                className="h-full transition-all rounded-full"
                                style={{
                                  width: `${modulePct}%`,
                                  backgroundColor: isModuleDone ? '#10B981' : '#33CBFB',
                                }}
                              />
                            </div>
                            <span className="text-[10px] font-semibold text-muted-foreground tabular-nums">
                              {modulePct}%
                            </span>
                          </div>
                        )}
                      </div>

                      {/* Chevron */}
                      <div className="flex-shrink-0">
                        {isCollapsed ? (
                          <ChevronRight className="w-4 h-4 text-muted-foreground" />
                        ) : (
                          <ChevronDown className="w-4 h-4 text-muted-foreground" />
                        )}
                      </div>
                    </div>
                  </Card>

                  {!isCollapsed && (
                    <div className="space-y-1.5 pl-3 border-l-2 border-muted ml-5">
                      {/* Lesson cards — cleaner visual states */}
                      {moduleLessons.map((lesson, index) => {
                        const progress = lessonProgressMap.get(lesson.id);
                        const isUnlocked = isAdminPreview
                          ? true
                          : (isLoadingProgress ? false : (progress?.isUnlocked ?? false));
                        const isCompleted = progress?.isCompleted ?? false;
                        const isLockedBySubscription = isAdminPreview
                          ? false
                          : (progress?.isLockedBySubscription ?? false);
                        const isCurrent = selectedLessonId === lesson.id && !selectedVideoModuleId;

                        // Status indicator styling
                        let statusBg = '#f1f5f9';      // available (slate-100)
                        let statusFg = '#64748b';      // muted (slate-500)
                        if (isCompleted) { statusBg = '#10B981'; statusFg = '#fff'; }
                        else if (isCurrent) { statusBg = '#33CBFB'; statusFg = '#fff'; }
                        else if (isLockedBySubscription) { statusBg = '#94a3b8'; statusFg = '#fff'; }
                        else if (!isUnlocked) { statusBg = '#e2e8f0'; statusFg = '#94a3b8'; }

                        return (
                          <Card
                            key={lesson.id}
                            className={`p-2.5 transition-all rounded-lg ${isUnlocked ? 'cursor-pointer hover-elevate' : 'opacity-70 cursor-not-allowed'} ${
                              isCurrent ? 'border-primary border-2 shadow-sm' : 'border-border/50'
                            }`}
                            onClick={() => {
                              if (isLockedBySubscription) {
                                toast({ title: "Premium content", description: "Upgrade your plan to access all lessons.", variant: "default" });
                                return;
                              }
                              if (!isUnlocked) {
                                toast({ title: t("lesson.locked"), description: t("lesson.lockedDesc"), variant: "destructive" });
                                return;
                              }
                              setSelectedLessonId(lesson.id);
                              setSelectedVideoModuleId(null);
                              setShowQuiz(false);
                              setShowVideoQuiz(false);
                              setQuizResult(null);
                              setLocation(`/dashboard/courses/${courseId}/lessons/${lesson.id}`);
                            }}
                            data-testid={`card-lesson-select-${lesson.id}`}
                          >
                            <div className="flex items-center gap-3">
                              <div
                                className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold flex-shrink-0"
                                style={{ backgroundColor: statusBg, color: statusFg }}
                              >
                                {isLockedBySubscription || !isUnlocked
                                  ? <Lock className="w-3.5 h-3.5" />
                                  : (isCompleted ? <CheckCircle className="w-4 h-4" /> : index + 1)}
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className={`text-sm font-medium truncate leading-tight ${isLockedBySubscription ? 'blur-[2px]' : ''} ${isCurrent ? 'text-primary' : ''}`}>
                                  {lesson.title}
                                </p>
                                <div className="flex items-center gap-2 mt-0.5 text-[11px] text-muted-foreground">
                                  {lesson.duration > 0 && (
                                    <span className="flex items-center gap-1">
                                      <Clock className="w-3 h-3" />
                                      {lesson.duration} min
                                    </span>
                                  )}
                                  {isCompleted && (
                                    <span className="text-emerald-600 font-medium">Completed</span>
                                  )}
                                  {isCurrent && !isCompleted && (
                                    <span className="text-primary font-medium">In progress</span>
                                  )}
                                  {isLockedBySubscription && (
                                    <Badge className="text-[9px] px-1.5 py-0 h-4 bg-primary text-primary-foreground">Premium</Badge>
                                  )}
                                </div>
                              </div>
                            </div>
                          </Card>
                        );
                      })}

                      {/* Video Activity card — keeps red identity */}
                      {mod.videoUrl && (
                        <Card
                          className={`p-2.5 cursor-pointer hover-elevate transition-all rounded-lg ${
                            selectedVideoModuleId === mod.id ? 'border-red-500 border-2 shadow-sm bg-red-50/50 dark:bg-red-950/10' : 'border-border/50'
                          }`}
                          onClick={() => {
                            setSelectedVideoModuleId(mod.id);
                            setSelectedLessonId(null);
                            setShowQuiz(false);
                            setShowVideoQuiz(false);
                            setQuizResult(null);
                          }}
                        >
                          <div className="flex items-center gap-3">
                            <div
                              className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0"
                              style={{ backgroundColor: mod.videoQuizStatus?.passed ? '#10B981' : '#FF0000' }}
                            >
                              {mod.videoQuizStatus?.passed ? (
                                <CheckCircle className="w-4 h-4 text-white" />
                              ) : (
                                <Youtube className="w-4 h-4 text-white" />
                              )}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium truncate leading-tight">Video Activity</p>
                              <div className="flex items-center gap-2 mt-0.5 text-[11px] text-muted-foreground">
                                {mod.videoQuizStatus?.passed ? (
                                  <span className="text-emerald-600 font-medium">Passed · {mod.videoQuizStatus.bestScore}%</span>
                                ) : mod.videoQuizStatus?.attempts ? (
                                  <span>Best so far: {mod.videoQuizStatus.bestScore}%</span>
                                ) : (
                                  <span>Watch &amp; quiz</span>
                                )}
                              </div>
                            </div>
                          </div>
                        </Card>
                      )}

                      {/* Reading Project card — emerald identity */}
                      <Card
                        className="p-2.5 cursor-pointer hover-elevate transition-all rounded-lg border-border/50"
                        onClick={() => setLocation(`/dashboard/reading/${mod.id}`)}
                        data-testid={`card-reading-project-${mod.id}`}
                      >
                        <div className="flex items-center gap-3">
                          <div
                            className="w-8 h-8 rounded-full flex items-center justify-center text-white flex-shrink-0"
                            style={{ backgroundColor: '#10B981' }}
                          >
                            <BookText className="w-4 h-4" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate leading-tight">Reading Project</p>
                            <p className="text-[11px] text-muted-foreground mt-0.5">Read &amp; answer comprehension</p>
                          </div>
                        </div>
                      </Card>

                      {/* Listening Project card — violet identity */}
                      <Card
                        className="p-2.5 cursor-pointer hover-elevate transition-all rounded-lg border-border/50"
                        onClick={() => setLocation(`/dashboard/listening/${mod.id}`)}
                        data-testid={`card-listening-project-${mod.id}`}
                      >
                        <div className="flex items-center gap-3">
                          <div
                            className="w-8 h-8 rounded-full flex items-center justify-center text-white flex-shrink-0"
                            style={{ backgroundColor: '#6d3be4' }}
                          >
                            <Headphones className="w-4 h-4" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate leading-tight">Listening Project</p>
                            <p className="text-[11px] text-muted-foreground mt-0.5">Listen &amp; answer comprehension</p>
                          </div>
                        </div>
                      </Card>

                      {/* Scenario Sprint card — teal identity (text role-play) */}
                      <Card
                        className="p-2.5 cursor-pointer hover-elevate transition-all rounded-lg border-border/50"
                        onClick={() => setLocation(`/dashboard/scenario-sprint/${mod.id}`)}
                        data-testid={`card-scenario-sprint-${mod.id}`}
                      >
                        <div className="flex items-center gap-3">
                          <div
                            className="w-8 h-8 rounded-full flex items-center justify-center text-white flex-shrink-0"
                            style={{ backgroundColor: '#0e7c5a' }}
                          >
                            <MessagesSquare className="w-4 h-4" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate leading-tight">Scenario Sprint</p>
                            <p className="text-[11px] text-muted-foreground mt-0.5">Role-play with AI &amp; get feedback</p>
                          </div>
                        </div>
                      </Card>

                      {/* Speaking Project card — purple identity */}
                      <Card
                        className="p-2.5 cursor-pointer hover-elevate transition-all rounded-lg border-border/50"
                        onClick={() => setLocation(`/dashboard/speaking/${mod.id}`)}
                        data-testid={`card-speaking-project-${mod.id}`}
                      >
                        <div className="flex items-center gap-3">
                          <div
                            className="w-8 h-8 rounded-full flex items-center justify-center text-white flex-shrink-0"
                            style={{ backgroundColor: '#9333EA' }}
                          >
                            <Mic className="w-4 h-4" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate leading-tight">Speaking Project</p>
                            <p className="text-[11px] text-muted-foreground mt-0.5">Record &amp; receive feedback</p>
                          </div>
                        </div>
                      </Card>

                      {/* Writing Project card — blue identity */}
                      <Card
                        className="p-2.5 cursor-pointer hover-elevate transition-all rounded-lg border-border/50"
                        onClick={() => setLocation(`/dashboard/writing-project/${mod.id}`)}
                        data-testid={`card-writing-project-${mod.id}`}
                      >
                        <div className="flex items-center gap-3">
                          <div
                            className="w-8 h-8 rounded-full flex items-center justify-center text-white flex-shrink-0"
                            style={{ backgroundColor: '#0EA5E9' }}
                          >
                            <PenLine className="w-4 h-4" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate leading-tight">Writing Project</p>
                            <p className="text-[11px] text-muted-foreground mt-0.5">Write &amp; receive feedback</p>
                          </div>
                        </div>
                      </Card>
                    </div>
                  )}
                </div>
              );
            })
          ) : (
            // Fallback: flat lesson list (no modules)
            lessons?.sort((a, b) => a.orderIndex - b.orderIndex).map((lesson, index) => {
              const progress = lessonProgressMap.get(lesson.id);
              const isUnlocked = isAdminPreview
                ? true
                : (isLoadingProgress ? false : (progress?.isUnlocked ?? false));
              const isCompleted = progress?.isCompleted ?? false;
              const isLockedBySubscription = isAdminPreview
                ? false
                : (progress?.isLockedBySubscription ?? (index >= 3));

              return (
                <Card
                  key={lesson.id}
                  className={`p-3 ${isUnlocked ? 'cursor-pointer hover-elevate' : 'opacity-60 cursor-not-allowed'} ${
                    selectedLessonId === lesson.id ? 'border-primary bg-primary/5' : ''
                  } ${isLockedBySubscription ? 'bg-gradient-to-r from-muted/50 to-muted/30' : ''}`}
                  onClick={() => {
                    if (isLockedBySubscription) {
                      toast({ title: "Contenido Premium", description: "Actualiza tu plan para acceder a todas las lecciones.", variant: "default" });
                      return;
                    }
                    if (!isUnlocked) {
                      toast({ title: t("lesson.locked"), description: t("lesson.lockedDesc"), variant: "destructive" });
                      return;
                    }
                    setSelectedLessonId(lesson.id);
                    setSelectedVideoModuleId(null);
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
                        {isLockedBySubscription && (
                          <Badge className="text-[10px] px-1.5 py-0 bg-primary text-primary-foreground">Premium</Badge>
                        )}
                      </div>
                    </div>
                    {isLockedBySubscription ? (
                      <Lock className="w-4 h-4 text-primary" />
                    ) : !isUnlocked ? (
                      <Lock className="w-4 h-4 text-muted-foreground" />
                    ) : (
                      <ChevronRight className="w-4 h-4 text-muted-foreground" />
                    )}
                  </div>
                </Card>
              );
            })
          )}

          {/* Final Exam summary card — appears at the bottom of the
              module list so the student sees it as the natural last step
              of the course. Reads /api/final-exams/{level}/eligibility to
              know whether they can take it yet. */}
          {course?.level && (
            <FinalExamSidebarCard level={course.level} courseId={course.id} />
          )}
        </div>

        <div className="lg:col-span-2">
          {selectedVideoModuleId ? (
            // Video Activity View
            (() => {
              const selectedModule = modules.find(m => m.id === selectedVideoModuleId);
              if (!selectedModule?.videoUrl) return null;

              // Extract YouTube video ID for embed
              let ytVideoId: string | null = null;
              try {
                const url = new URL(selectedModule.videoUrl);
                if (url.hostname.includes("youtube.com")) ytVideoId = url.searchParams.get("v");
                else if (url.hostname === "youtu.be") ytVideoId = url.pathname.slice(1);
              } catch { /* ignore */ }

              const videoQuizQuestions = videoQuizData?.questions?.slice().sort((a, b) => a.orderIndex - b.orderIndex) || [];
              const allVideoQuestionsAnswered = videoQuizQuestions.length > 0 && videoQuizQuestions.every(q => quizAnswers[q.id] !== undefined);

              const handleSubmitVideoQuiz = () => {
                if (!videoQuizData || hasSubmittedRef.current || submitVideoQuizMutation.isPending) return;
                hasSubmittedRef.current = true;
                const answers = videoQuizQuestions.map(q => quizAnswers[q.id] ?? -1);
                submitVideoQuizMutation.mutate(answers);
              };

              return (
                <div className="space-y-6">
                  {!showVideoQuiz ? (
                    <>
                      <Card className="p-6">
                        <div className="flex items-center gap-3 mb-4">
                          <div className="w-10 h-10 flex items-center justify-center" style={{ backgroundColor: '#FF0000' }}>
                            <Youtube className="w-5 h-5 text-white" />
                          </div>
                          <div>
                            <h2 className="text-xl font-display uppercase">Video Activity</h2>
                            <p className="font-mono text-sm text-muted-foreground">{selectedModule.title}</p>
                          </div>
                        </div>

                        {ytVideoId && (
                          <div className="aspect-video bg-black mb-4 rounded overflow-hidden">
                            <iframe
                              src={`https://www.youtube.com/embed/${ytVideoId}?rel=0&cc_load_policy=0`}
                              className="w-full h-full"
                              allow="autoplay; fullscreen; picture-in-picture"
                              allowFullScreen
                              title="Video Activity"
                            />
                          </div>
                        )}

                        <p className="font-mono text-sm text-muted-foreground">
                          Watch the video carefully, then take the quiz to test your comprehension and listening skills.
                        </p>
                      </Card>

                      {selectedModule.videoQuizStatus && (
                        <Card className="p-6">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 flex items-center justify-center" style={{ backgroundColor: '#FD335A' }}>
                                <ClipboardList className="w-5 h-5 text-white" />
                              </div>
                              <div>
                                <h3 className="font-mono font-semibold">Video Comprehension Quiz</h3>
                                <p className="text-sm font-mono text-muted-foreground">
                                  {selectedModule.videoQuizStatus.passed ? (
                                    <span className="text-green-600">Passed! Best score: {selectedModule.videoQuizStatus.bestScore}%</span>
                                  ) : selectedModule.videoQuizStatus.attempts > 0 ? (
                                    <span>Best score: {selectedModule.videoQuizStatus.bestScore}% ({selectedModule.videoQuizStatus.attempts} attempts)</span>
                                  ) : (
                                    <span>Test your comprehension and listening</span>
                                  )}
                                </p>
                              </div>
                            </div>
                            <Button
                              onClick={() => {
                                setShowVideoQuiz(true);
                                setQuizAnswers({});
                                setQuizResult(null);
                                hasSubmittedRef.current = false;
                              }}
                            >
                              <Play className="w-4 h-4 mr-2" />
                              {selectedModule.videoQuizStatus.passed ? "Retake Quiz" : "Take Quiz"}
                            </Button>
                          </div>
                        </Card>
                      )}
                    </>
                  ) : (
                    <Card className="p-6">
                      {videoQuizLoading ? (
                        <div className="flex items-center justify-center h-32">
                          <div className="w-8 h-8 border-2 border-primary border-t-transparent animate-spin" />
                        </div>
                      ) : !videoQuizData ? (
                        <div className="text-center py-8">
                          <ClipboardList className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                          <p className="font-mono text-muted-foreground">No quiz available for this video yet</p>
                          <Button variant="outline" className="mt-4" onClick={() => setShowVideoQuiz(false)}>
                            Back to Video
                          </Button>
                        </div>
                      ) : quizResult ? (
                        <div className="space-y-6">
                          <div className="text-center py-6">
                            <div
                              className="w-20 h-20 mx-auto mb-4 flex items-center justify-center"
                              style={{ backgroundColor: quizResult.isPassed ? '#33CBFB' : '#FD335A' }}
                            >
                              {quizResult.isPassed ? <Trophy className="w-10 h-10 text-white" /> : <XCircle className="w-10 h-10 text-white" />}
                            </div>
                            <h2 className="text-2xl font-display uppercase mb-2">
                              {quizResult.isPassed ? 'You Passed!' : "Didn't Pass"}
                            </h2>
                            <p className="font-mono text-3xl font-bold" style={{ color: quizResult.isPassed ? '#33CBFB' : '#FD335A' }}>
                              {quizResult.score}%
                            </p>
                            <p className="font-mono text-sm text-muted-foreground mt-2">
                              Passing score: {quizResult.passingScore}%
                            </p>
                          </div>

                          <div className="space-y-4">
                            <h3 className="font-mono font-semibold text-sm uppercase tracking-wider">Answer Review</h3>
                            {quizResult.results.map((result, index) => {
                              const matchQ = videoQuizQuestions.find(q => q.id === result.questionId);
                              return (
                                <div key={result.questionId} className={`p-4 border ${result.isCorrect ? 'border-green-500/30 bg-green-500/5' : 'border-red-500/30 bg-red-500/5'}`}>
                                  <div className="flex items-start gap-3">
                                    {result.isCorrect ? <CheckCircle className="w-5 h-5 text-green-500 mt-0.5" /> : <XCircle className="w-5 h-5 text-red-500 mt-0.5" />}
                                    <div className="flex-1">
                                      <p className="font-mono font-semibold mb-2">{index + 1}. {result.question}</p>
                                      {!result.isCorrect && matchQ && (
                                        <p className="font-mono text-sm text-green-600 dark:text-green-400">
                                          Correct answer: {matchQ.options[result.correctAnswer]}
                                        </p>
                                      )}
                                      {result.explanation && (
                                        <p className="font-mono text-sm text-muted-foreground mt-2">{result.explanation}</p>
                                      )}
                                    </div>
                                  </div>
                                </div>
                              );
                            })}
                          </div>

                          <div className="flex gap-3">
                            <Button variant="outline" onClick={() => { setShowVideoQuiz(false); setQuizResult(null); }} className="flex-1">
                              Back to Video
                            </Button>
                            <Button onClick={() => { setQuizAnswers({}); setQuizResult(null); hasSubmittedRef.current = false; refetchVideoQuiz(); }} className="flex-1">
                              <RotateCcw className="w-4 h-4 mr-2" />
                              Try Again
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <div className="space-y-6">
                          <div className="flex items-center justify-between">
                            <div>
                              <h2 className="text-xl font-display uppercase">{videoQuizData.quiz.title}</h2>
                              <p className="font-mono text-sm text-muted-foreground">
                                {videoQuizQuestions.length} questions · Passing score: {videoQuizData.quiz.passingScore}%
                              </p>
                            </div>
                          </div>

                          <Progress value={(Object.keys(quizAnswers).length / videoQuizQuestions.length) * 100} className="h-2" />

                          <div className="space-y-6">
                            {videoQuizQuestions.map((question, index) => (
                              <div key={question.id} className="p-4 border">
                                <p className="font-mono font-semibold mb-4">{index + 1}. {question.question}</p>
                                <RadioGroup
                                  value={quizAnswers[question.id]?.toString()}
                                  onValueChange={(value) => setQuizAnswers(prev => ({ ...prev, [question.id]: parseInt(value) }))}
                                >
                                  {question.options.map((option, optIndex) => (
                                    <div
                                      key={optIndex}
                                      className="flex items-center space-x-3 p-3 border hover-elevate cursor-pointer"
                                      onClick={() => setQuizAnswers(prev => ({ ...prev, [question.id]: optIndex }))}
                                    >
                                      <RadioGroupItem value={optIndex.toString()} id={`vq${question.id}-opt${optIndex}`} />
                                      <Label htmlFor={`vq${question.id}-opt${optIndex}`} className="font-mono cursor-pointer flex-1">
                                        {option}
                                      </Label>
                                    </div>
                                  ))}
                                </RadioGroup>
                              </div>
                            ))}
                          </div>

                          <div className="flex gap-3">
                            <Button variant="outline" onClick={() => setShowVideoQuiz(false)} className="flex-1">
                              Cancel
                            </Button>
                            <Button
                              onClick={handleSubmitVideoQuiz}
                              disabled={!allVideoQuestionsAnswered || submitVideoQuizMutation.isPending}
                              className="flex-1"
                            >
                              {submitVideoQuizMutation.isPending ? "Submitting..." : "Submit Answers"}
                            </Button>
                          </div>
                        </div>
                      )}
                    </Card>
                  )}
                </div>
              );
            })()
          ) : selectedLesson ? (
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
                          srcDoc={
                            selectedLesson.htmlContent.replace(
                              /(var|const|let)\s+AUDIO_BASE_URL\s*=\s*['"][^'"]*['"]\s*;/,
                              `var AUDIO_BASE_URL = '/api/audio/${selectedLesson.id}/';`
                            )
                          }
                          className="w-full border-0 rounded-lg bg-white"
                          style={{ minHeight: "800px", height: "auto" }}
                          title={selectedLesson.title}
                          sandbox="allow-scripts allow-same-origin"
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
                                  {t("quiz.completed")}
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
                          <h3 className="font-mono font-semibold">{t("quiz.title")}</h3>
                          <p className="text-sm font-mono text-muted-foreground">
                            Test your understanding of the content
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
                        No quiz available for this lesson
                      </p>
                      <Button
                        variant="outline"
                        className="mt-4"
                        onClick={() => setShowQuiz(false)}
                      >
                        {t("quiz.backToLesson")}
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
                          {quizResult.isPassed ? 'You passed!' : 'Not passed'}
                        </h2>
                        <p className="font-mono text-3xl font-bold" style={{ color: quizResult.isPassed ? '#33CBFB' : '#FD335A' }}>
                          {quizResult.score}%
                        </p>
                        <p className="font-mono text-sm text-muted-foreground mt-2">
                          Passing score: {quizResult.passingScore}%
                        </p>
                      </div>

                      <div className="space-y-4">
                        <h3 className="font-mono font-semibold text-sm uppercase tracking-wider">
                          Answer review
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
                          {t("quiz.backToLesson")}
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
                            {quiz.questions.length} questions · Passing score: {quiz.passingScore}%
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
                              onValueChange={(value) => setQuizAnswers(prev => ({ ...prev, [question.id]: parseInt(value) }))}
                            >
                              {question.options.map((option, optIndex) => (
                                <div
                                  key={optIndex}
                                  className="flex items-center space-x-3 p-3 border hover-elevate cursor-pointer"
                                  onClick={() => setQuizAnswers(prev => ({ ...prev, [question.id]: optIndex }))}
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
              <h3 className="font-mono font-semibold mb-2">{t("lesson.select")}</h3>
              <p className="font-mono text-sm text-muted-foreground">
                Pick a lesson from the menu to start learning
              </p>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}

/**
 * Final Exam sidebar card. Slotted at the end of the module list so the
 * student understands the exam is the natural last step of the course.
 *
 *   - Locked (course not yet 100%): shows a progress bar with
 *     "X/Y modules complete" and a muted CTA.
 *   - Eligible: lights up amber with "Start Mastery Exam".
 *   - Certified: green badge with "View certificate" link.
 *
 * Eligibility is pulled live from /api/final-exams/{level}/eligibility,
 * which is the same source of truth as the standalone exams landing page.
 */
function FinalExamSidebarCard({ level, courseId }: { level: string; courseId: string }) {
  const [, setLocation] = useLocation();
  const { data: eligibility } = useQuery<{
    eligible: boolean;
    reason: string | null;
    completionPct?: number;
    totalLessons?: number;
    completedInCourse?: number;
    alreadyPassed?: boolean;
    exam?: { id: string; title: string; isPublished: boolean };
  }>({
    queryKey: [`/api/final-exams/${level}/eligibility`],
  });

  // Idle while loading — keep the slot quiet rather than flashing a spinner
  if (!eligibility) return null;

  const examPublished = eligibility.exam?.isPublished;
  const passed = !!eligibility.alreadyPassed;
  const canStart = !!eligibility.eligible && !passed;
  const pct = eligibility.completionPct ?? 0;

  // If the exam isn't even published yet (shouldn't happen for A1..C1 in
  // prod, but defensive), hide entirely.
  if (!examPublished) return null;

  return (
    <Card
      className={`mt-4 p-3 rounded-xl border-2 transition-all ${
        passed
          ? "border-emerald-300 bg-emerald-50/50 dark:bg-emerald-950/10"
          : canStart
          ? "border-amber-300 bg-gradient-to-br from-amber-50 to-orange-50 cursor-pointer hover-elevate shadow-sm"
          : "border-border bg-muted/30"
      }`}
      onClick={canStart ? () => setLocation(`/dashboard/exam/${level}`) : undefined}
      data-testid="card-final-exam"
    >
      <div className="flex items-center gap-3">
        <div
          className={`w-11 h-11 rounded-lg flex items-center justify-center flex-shrink-0 ${
            passed ? "bg-emerald-500" : canStart ? "bg-amber-500" : "bg-muted-foreground/20"
          }`}
        >
          <Trophy className={`w-5 h-5 ${passed || canStart ? "text-white" : "text-muted-foreground"}`} />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
            {passed ? "Certified" : "Final Exam"}
          </p>
          <p className="text-sm font-semibold leading-tight truncate">
            {level} Mastery Exam
          </p>
          {passed ? (
            <p className="text-[11px] text-emerald-700 font-medium mt-0.5">
              You passed · View certificate →
            </p>
          ) : canStart ? (
            <p className="text-[11px] text-amber-800 font-medium mt-0.5">
              Ready to take → 70+ to earn certificate
            </p>
          ) : (
            <div className="mt-1.5">
              <div className="flex items-center gap-2">
                <div className="flex-1 h-1 bg-muted rounded-full overflow-hidden">
                  <div className="h-full bg-amber-500 rounded-full transition-all" style={{ width: `${pct}%` }} />
                </div>
                <span className="text-[10px] font-semibold text-muted-foreground tabular-nums">
                  {pct}%
                </span>
              </div>
              <p className="text-[10px] text-muted-foreground mt-1">
                {eligibility.completedInCourse ?? 0}/{eligibility.totalLessons ?? 0} lessons · finish all to unlock
              </p>
            </div>
          )}
        </div>
      </div>
    </Card>
  );
}
