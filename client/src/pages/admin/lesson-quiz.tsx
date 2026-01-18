import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useParams, Link } from "wouter";
import { AdminLayout } from "@/components/admin/admin-layout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Plus, Pencil, Trash2, ArrowLeft, Sparkles, Check, X, Eye, EyeOff, GripVertical } from "lucide-react";
import type { Course, Lesson, Quiz, QuizQuestion } from "@shared/schema";

interface QuizWithQuestions extends Quiz {
  questions: QuizQuestion[];
}

export default function AdminLessonQuiz() {
  const { courseId, lessonId } = useParams<{ courseId: string; lessonId: string }>();
  const { toast } = useToast();
  const [isQuizDialogOpen, setIsQuizDialogOpen] = useState(false);
  const [isQuestionDialogOpen, setIsQuestionDialogOpen] = useState(false);
  const [isGenerateDialogOpen, setIsGenerateDialogOpen] = useState(false);
  const [editingQuestion, setEditingQuestion] = useState<QuizQuestion | null>(null);
  const [selectedQuiz, setSelectedQuiz] = useState<Quiz | null>(null);
  const [numberOfQuestions, setNumberOfQuestions] = useState(5);

  const [quizFormData, setQuizFormData] = useState({
    title: "",
    description: "",
    passingScore: 70,
    timeLimit: null as number | null,
    isPublished: false,
  });

  const [questionFormData, setQuestionFormData] = useState({
    question: "",
    options: ["", "", "", ""],
    correctOptionIndex: 0,
    explanation: "",
  });

  const { data: course } = useQuery<Course>({
    queryKey: [`/api/admin/courses/${courseId}`],
    enabled: !!courseId,
  });

  const { data: lesson } = useQuery<Lesson>({
    queryKey: [`/api/admin/lessons/${lessonId}`],
    enabled: !!lessonId,
  });

  const { data: quizzes, isLoading: quizzesLoading } = useQuery<Quiz[]>({
    queryKey: [`/api/admin/lessons/${lessonId}/quizzes`],
    enabled: !!lessonId,
  });

  const { data: quizWithQuestions, isLoading: questionsLoading } = useQuery<QuizWithQuestions>({
    queryKey: [`/api/admin/quizzes/${selectedQuiz?.id}`],
    enabled: !!selectedQuiz?.id,
  });

  const createQuizMutation = useMutation({
    mutationFn: async (data: typeof quizFormData) => {
      const response = await apiRequest("POST", "/api/admin/quizzes", { ...data, lessonId });
      return response.json() as Promise<Quiz>;
    },
    onSuccess: (newQuiz: Quiz) => {
      queryClient.invalidateQueries({ queryKey: [`/api/admin/lessons/${lessonId}/quizzes`] });
      toast({ title: "Quiz creado exitosamente" });
      setIsQuizDialogOpen(false);
      setSelectedQuiz(newQuiz);
      resetQuizForm();
    },
    onError: () => {
      toast({ title: "Error al crear quiz", variant: "destructive" });
    },
  });

  const updateQuizMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<typeof quizFormData> }) =>
      apiRequest("PATCH", `/api/admin/quizzes/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/admin/lessons/${lessonId}/quizzes`] });
      queryClient.invalidateQueries({ queryKey: [`/api/admin/quizzes/${selectedQuiz?.id}`] });
      toast({ title: "Quiz actualizado exitosamente" });
      setIsQuizDialogOpen(false);
      resetQuizForm();
    },
    onError: () => {
      toast({ title: "Error al actualizar quiz", variant: "destructive" });
    },
  });

  const deleteQuizMutation = useMutation({
    mutationFn: (id: string) => apiRequest("DELETE", `/api/admin/quizzes/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/admin/lessons/${lessonId}/quizzes`] });
      toast({ title: "Quiz eliminado exitosamente" });
      setSelectedQuiz(null);
    },
    onError: () => {
      toast({ title: "Error al eliminar quiz", variant: "destructive" });
    },
  });

  const createQuestionMutation = useMutation({
    mutationFn: (data: typeof questionFormData & { quizId: string; orderIndex: number }) =>
      apiRequest("POST", "/api/admin/quiz-questions", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/admin/quizzes/${selectedQuiz?.id}`] });
      toast({ title: "Pregunta creada exitosamente" });
      setIsQuestionDialogOpen(false);
      resetQuestionForm();
    },
    onError: () => {
      toast({ title: "Error al crear pregunta", variant: "destructive" });
    },
  });

  const updateQuestionMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<typeof questionFormData> }) =>
      apiRequest("PATCH", `/api/admin/quiz-questions/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/admin/quizzes/${selectedQuiz?.id}`] });
      toast({ title: "Pregunta actualizada exitosamente" });
      setIsQuestionDialogOpen(false);
      resetQuestionForm();
    },
    onError: () => {
      toast({ title: "Error al actualizar pregunta", variant: "destructive" });
    },
  });

  const deleteQuestionMutation = useMutation({
    mutationFn: (id: string) => apiRequest("DELETE", `/api/admin/quiz-questions/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/admin/quizzes/${selectedQuiz?.id}`] });
      toast({ title: "Pregunta eliminada exitosamente" });
    },
    onError: () => {
      toast({ title: "Error al eliminar pregunta", variant: "destructive" });
    },
  });

  const generateQuestionsMutation = useMutation({
    mutationFn: () =>
      apiRequest("POST", `/api/admin/quizzes/${selectedQuiz?.id}/generate`, {
        lessonTitle: lesson?.title,
        lessonDescription: lesson?.description,
        courseLevel: course?.level,
        numberOfQuestions,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/admin/quizzes/${selectedQuiz?.id}`] });
      toast({ title: "Preguntas generadas exitosamente con IA" });
      setIsGenerateDialogOpen(false);
    },
    onError: () => {
      toast({ title: "Error al generar preguntas", variant: "destructive" });
    },
  });

  const resetQuizForm = () => {
    setQuizFormData({
      title: "",
      description: "",
      passingScore: 70,
      timeLimit: null,
      isPublished: false,
    });
  };

  const resetQuestionForm = () => {
    setQuestionFormData({
      question: "",
      options: ["", "", "", ""],
      correctOptionIndex: 0,
      explanation: "",
    });
    setEditingQuestion(null);
  };

  const handleEditQuestion = (question: QuizQuestion) => {
    setEditingQuestion(question);
    setQuestionFormData({
      question: question.question,
      options: question.options || ["", "", "", ""],
      correctOptionIndex: question.correctOptionIndex,
      explanation: question.explanation || "",
    });
    setIsQuestionDialogOpen(true);
  };

  const handleQuizSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedQuiz) {
      updateQuizMutation.mutate({ id: selectedQuiz.id, data: quizFormData });
    } else {
      createQuizMutation.mutate(quizFormData);
    }
  };

  const handleQuestionSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingQuestion) {
      updateQuestionMutation.mutate({ id: editingQuestion.id, data: questionFormData });
    } else if (selectedQuiz) {
      const orderIndex = quizWithQuestions?.questions?.length || 0;
      createQuestionMutation.mutate({
        ...questionFormData,
        quizId: selectedQuiz.id,
        orderIndex,
      });
    }
  };

  const handleOptionChange = (index: number, value: string) => {
    const newOptions = [...questionFormData.options];
    newOptions[index] = value;
    setQuestionFormData({ ...questionFormData, options: newOptions });
  };

  const togglePublish = (quiz: Quiz) => {
    updateQuizMutation.mutate({ 
      id: quiz.id, 
      data: { isPublished: !quiz.isPublished } 
    });
  };

  if (quizzesLoading) {
    return (
      <AdminLayout title="Quiz de Lección">
        <div className="flex items-center justify-center h-64">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent animate-spin" />
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout title="Quiz de Lección">
      <div className="space-y-6">
        <div className="flex items-center gap-4 flex-wrap">
          <Link href={`/admin/courses/${courseId}/lessons`}>
            <Button variant="ghost" size="sm" data-testid="button-back-to-lessons">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Volver a Lecciones
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-foreground font-display">
              Quiz: {lesson?.title || "Cargando..."}
            </h1>
            <p className="text-sm text-muted-foreground">
              Curso: {course?.title || "Cargando..."} - Nivel: {course?.level}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-1 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold">Quizzes</h2>
              <Dialog open={isQuizDialogOpen} onOpenChange={setIsQuizDialogOpen}>
                <DialogTrigger asChild>
                  <Button
                    size="sm"
                    onClick={() => {
                      resetQuizForm();
                      setSelectedQuiz(null);
                    }}
                    data-testid="button-create-quiz"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Nuevo Quiz
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>
                      {selectedQuiz ? "Editar Quiz" : "Crear Quiz"}
                    </DialogTitle>
                  </DialogHeader>
                  <form onSubmit={handleQuizSubmit} className="space-y-4">
                    <div>
                      <Label>Título</Label>
                      <Input
                        value={quizFormData.title}
                        onChange={(e) =>
                          setQuizFormData({ ...quizFormData, title: e.target.value })
                        }
                        placeholder="Quiz de vocabulario"
                        required
                        data-testid="input-quiz-title"
                      />
                    </div>
                    <div>
                      <Label>Descripción (opcional)</Label>
                      <Textarea
                        value={quizFormData.description}
                        onChange={(e) =>
                          setQuizFormData({ ...quizFormData, description: e.target.value })
                        }
                        placeholder="Evaluación de vocabulario básico..."
                        data-testid="input-quiz-description"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label>Puntaje mínimo (%)</Label>
                        <Input
                          type="number"
                          min="0"
                          max="100"
                          value={quizFormData.passingScore}
                          onChange={(e) =>
                            setQuizFormData({ ...quizFormData, passingScore: parseInt(e.target.value) })
                          }
                          data-testid="input-quiz-passing-score"
                        />
                      </div>
                      <div>
                        <Label>Tiempo límite (min)</Label>
                        <Input
                          type="number"
                          min="1"
                          value={quizFormData.timeLimit || ""}
                          onChange={(e) =>
                            setQuizFormData({
                              ...quizFormData,
                              timeLimit: e.target.value ? parseInt(e.target.value) : null,
                            })
                          }
                          placeholder="Sin límite"
                          data-testid="input-quiz-time-limit"
                        />
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Switch
                        checked={quizFormData.isPublished}
                        onCheckedChange={(checked) =>
                          setQuizFormData({ ...quizFormData, isPublished: checked })
                        }
                        data-testid="switch-quiz-published"
                      />
                      <Label>Publicado</Label>
                    </div>
                    <DialogFooter>
                      <Button
                        type="submit"
                        disabled={createQuizMutation.isPending || updateQuizMutation.isPending}
                        data-testid="button-save-quiz"
                      >
                        {(createQuizMutation.isPending || updateQuizMutation.isPending) ? (
                          <div className="w-4 h-4 border-2 border-white border-t-transparent animate-spin" />
                        ) : (
                          "Guardar"
                        )}
                      </Button>
                    </DialogFooter>
                  </form>
                </DialogContent>
              </Dialog>
            </div>

            {quizzes?.length === 0 ? (
              <Card className="p-6 text-center">
                <p className="text-muted-foreground">No hay quizzes creados</p>
                <p className="text-sm text-muted-foreground mt-2">
                  Crea un quiz para esta lección
                </p>
              </Card>
            ) : (
              <div className="space-y-2">
                {quizzes?.map((quiz) => (
                  <Card
                    key={quiz.id}
                    className={`p-4 cursor-pointer transition-colors ${
                      selectedQuiz?.id === quiz.id ? "border-primary bg-primary/5" : ""
                    }`}
                    onClick={() => setSelectedQuiz(quiz)}
                    data-testid={`card-quiz-${quiz.id}`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <h3 className="font-medium">{quiz.title}</h3>
                        <div className="flex items-center gap-2 mt-1">
                          <Badge variant={quiz.isPublished ? "default" : "secondary"}>
                            {quiz.isPublished ? "Publicado" : "Borrador"}
                          </Badge>
                          <span className="text-xs text-muted-foreground">
                            {quiz.passingScore}% para aprobar
                          </span>
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={(e) => {
                          e.stopPropagation();
                          togglePublish(quiz);
                        }}
                        data-testid={`button-toggle-publish-${quiz.id}`}
                      >
                        {quiz.isPublished ? (
                          <Eye className="w-4 h-4" />
                        ) : (
                          <EyeOff className="w-4 h-4" />
                        )}
                      </Button>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </div>

          <div className="lg:col-span-2">
            {selectedQuiz ? (
              <div className="space-y-4">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div>
                    <h2 className="text-lg font-semibold">{selectedQuiz.title}</h2>
                    <p className="text-sm text-muted-foreground">
                      {quizWithQuestions?.questions?.length || 0} preguntas
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Dialog open={isGenerateDialogOpen} onOpenChange={setIsGenerateDialogOpen}>
                      <DialogTrigger asChild>
                        <Button variant="outline" data-testid="button-generate-ai">
                          <Sparkles className="w-4 h-4 mr-2" />
                          Generar con IA
                        </Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>Generar Preguntas con IA</DialogTitle>
                        </DialogHeader>
                        <div className="space-y-4">
                          <p className="text-sm text-muted-foreground">
                            La IA generará preguntas de opción múltiple basadas en el
                            contenido de esta lección: <strong>{lesson?.title}</strong>
                          </p>
                          <div>
                            <Label>Número de preguntas</Label>
                            <Select
                              value={numberOfQuestions.toString()}
                              onValueChange={(v) => setNumberOfQuestions(parseInt(v))}
                            >
                              <SelectTrigger data-testid="select-num-questions">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="3">3 preguntas</SelectItem>
                                <SelectItem value="5">5 preguntas</SelectItem>
                                <SelectItem value="10">10 preguntas</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          <DialogFooter>
                            <Button
                              onClick={() => generateQuestionsMutation.mutate()}
                              disabled={generateQuestionsMutation.isPending}
                              data-testid="button-confirm-generate"
                            >
                              {generateQuestionsMutation.isPending ? (
                                <>
                                  <div className="w-4 h-4 border-2 border-white border-t-transparent animate-spin mr-2" />
                                  Generando...
                                </>
                              ) : (
                                <>
                                  <Sparkles className="w-4 h-4 mr-2" />
                                  Generar
                                </>
                              )}
                            </Button>
                          </DialogFooter>
                        </div>
                      </DialogContent>
                    </Dialog>
                    <Dialog open={isQuestionDialogOpen} onOpenChange={setIsQuestionDialogOpen}>
                      <DialogTrigger asChild>
                        <Button onClick={resetQuestionForm} data-testid="button-add-question">
                          <Plus className="w-4 h-4 mr-2" />
                          Agregar Pregunta
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="max-w-2xl">
                        <DialogHeader>
                          <DialogTitle>
                            {editingQuestion ? "Editar Pregunta" : "Nueva Pregunta"}
                          </DialogTitle>
                        </DialogHeader>
                        <form onSubmit={handleQuestionSubmit} className="space-y-4">
                          <div>
                            <Label>Pregunta</Label>
                            <Textarea
                              value={questionFormData.question}
                              onChange={(e) =>
                                setQuestionFormData({
                                  ...questionFormData,
                                  question: e.target.value,
                                })
                              }
                              placeholder="¿Cuál es la traducción correcta de...?"
                              required
                              data-testid="input-question-text"
                            />
                          </div>
                          <div className="space-y-3">
                            <Label>Opciones de respuesta</Label>
                            {questionFormData.options.map((option, index) => (
                              <div key={index} className="flex items-center gap-2">
                                <Button
                                  type="button"
                                  variant={
                                    questionFormData.correctOptionIndex === index
                                      ? "default"
                                      : "outline"
                                  }
                                  size="icon"
                                  onClick={() =>
                                    setQuestionFormData({
                                      ...questionFormData,
                                      correctOptionIndex: index,
                                    })
                                  }
                                  data-testid={`button-correct-option-${index}`}
                                >
                                  {questionFormData.correctOptionIndex === index ? (
                                    <Check className="w-4 h-4" />
                                  ) : (
                                    <span className="text-xs">{index + 1}</span>
                                  )}
                                </Button>
                                <Input
                                  value={option}
                                  onChange={(e) => handleOptionChange(index, e.target.value)}
                                  placeholder={`Opción ${index + 1}`}
                                  required
                                  data-testid={`input-option-${index}`}
                                />
                              </div>
                            ))}
                            <p className="text-xs text-muted-foreground">
                              Haz clic en el número para marcar la respuesta correcta
                            </p>
                          </div>
                          <div>
                            <Label>Explicación (opcional)</Label>
                            <Textarea
                              value={questionFormData.explanation}
                              onChange={(e) =>
                                setQuestionFormData({
                                  ...questionFormData,
                                  explanation: e.target.value,
                                })
                              }
                              placeholder="Esta respuesta es correcta porque..."
                              data-testid="input-question-explanation"
                            />
                          </div>
                          <DialogFooter>
                            <Button
                              type="submit"
                              disabled={
                                createQuestionMutation.isPending ||
                                updateQuestionMutation.isPending
                              }
                              data-testid="button-save-question"
                            >
                              {(createQuestionMutation.isPending ||
                                updateQuestionMutation.isPending) ? (
                                <div className="w-4 h-4 border-2 border-white border-t-transparent animate-spin" />
                              ) : (
                                "Guardar"
                              )}
                            </Button>
                          </DialogFooter>
                        </form>
                      </DialogContent>
                    </Dialog>
                    <Button
                      variant="outline"
                      onClick={() => {
                        setQuizFormData({
                          title: selectedQuiz.title,
                          description: selectedQuiz.description || "",
                          passingScore: selectedQuiz.passingScore,
                          timeLimit: selectedQuiz.timeLimit,
                          isPublished: selectedQuiz.isPublished,
                        });
                        setIsQuizDialogOpen(true);
                      }}
                      data-testid="button-edit-quiz"
                    >
                      <Pencil className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => {
                        if (confirm("¿Eliminar este quiz y todas sus preguntas?")) {
                          deleteQuizMutation.mutate(selectedQuiz.id);
                        }
                      }}
                      data-testid="button-delete-quiz"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>

                {questionsLoading ? (
                  <div className="flex items-center justify-center h-32">
                    <div className="w-6 h-6 border-2 border-primary border-t-transparent animate-spin" />
                  </div>
                ) : quizWithQuestions?.questions?.length === 0 ? (
                  <Card className="p-8 text-center">
                    <p className="text-muted-foreground mb-4">
                      No hay preguntas en este quiz
                    </p>
                    <div className="flex justify-center gap-2">
                      <Button
                        variant="outline"
                        onClick={() => setIsGenerateDialogOpen(true)}
                        data-testid="button-generate-empty"
                      >
                        <Sparkles className="w-4 h-4 mr-2" />
                        Generar con IA
                      </Button>
                      <Button onClick={() => setIsQuestionDialogOpen(true)}>
                        <Plus className="w-4 h-4 mr-2" />
                        Agregar Manual
                      </Button>
                    </div>
                  </Card>
                ) : (
                  <div className="space-y-3">
                    {quizWithQuestions?.questions?.map((question, index) => (
                      <Card key={question.id} className="p-4" data-testid={`card-question-${question.id}`}>
                        <div className="flex items-start gap-3">
                          <div className="flex items-center justify-center w-8 h-8 bg-primary/10 text-primary font-semibold flex-shrink-0">
                            {index + 1}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-foreground mb-3">
                              {question.question}
                            </p>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                              {question.options?.map((option, optIndex) => (
                                <div
                                  key={optIndex}
                                  className={`flex items-center gap-2 p-2 text-sm ${
                                    optIndex === question.correctOptionIndex
                                      ? "bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-200"
                                      : "bg-muted/50"
                                  }`}
                                >
                                  {optIndex === question.correctOptionIndex ? (
                                    <Check className="w-4 h-4 text-green-600 flex-shrink-0" />
                                  ) : (
                                    <X className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                                  )}
                                  <span className="truncate">{option}</span>
                                </div>
                              ))}
                            </div>
                            {question.explanation && (
                              <p className="mt-3 text-sm text-muted-foreground italic">
                                {question.explanation}
                              </p>
                            )}
                          </div>
                          <div className="flex gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleEditQuestion(question)}
                              data-testid={`button-edit-question-${question.id}`}
                            >
                              <Pencil className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => {
                                if (confirm("¿Eliminar esta pregunta?")) {
                                  deleteQuestionMutation.mutate(question.id);
                                }
                              }}
                              data-testid={`button-delete-question-${question.id}`}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                      </Card>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <Card className="p-8 text-center">
                <p className="text-muted-foreground">
                  Selecciona un quiz de la lista para ver y editar sus preguntas
                </p>
              </Card>
            )}
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}
