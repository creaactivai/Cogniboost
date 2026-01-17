import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Search, 
  Play, 
  Clock, 
  BookOpen,
  Filter,
  GraduationCap
} from "lucide-react";
import { courseLevels } from "@shared/schema";

// Spanish translations for course topics
const courseTopicsEs: Record<string, string> = {
  "Business English": "Inglés de Negocios",
  "Travel & Tourism": "Viajes y Turismo",
  "Technology": "Tecnología",
  "Culture & Arts": "Cultura y Artes",
  "Healthcare": "Salud",
  "Finance": "Finanzas",
  "Academic English": "Inglés Académico",
  "Everyday Conversations": "Conversaciones Cotidianas",
};

const getTopicLabel = (topic: string) => courseTopicsEs[topic] || topic;

interface CourseCardProps {
  id: string;
  title: string;
  description: string;
  level: string;
  topic: string;
  duration: number;
  lessonsCount: number;
  progress?: number;
  isEnrolled?: boolean;
  isFree?: boolean;
}

function CourseCard({
  id,
  title,
  description,
  level,
  topic,
  duration,
  lessonsCount,
  progress,
  isEnrolled,
  isFree,
}: CourseCardProps) {
  return (
    <Card className="overflow-hidden border-border hover-elevate group">
      {/* Thumbnail */}
      <div className="h-40 bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center relative">
        <GraduationCap className="w-16 h-16 text-muted-foreground/30" />
        {/* Level badge */}
        <div className="absolute top-3 left-3 px-2 py-1 bg-primary text-primary-foreground text-xs font-mono">
          {level}
        </div>
        {/* Free badge */}
        {isFree && (
          <div className="absolute top-3 right-3 px-2 py-1 bg-accent text-accent-foreground text-xs font-mono">
            GRATIS
          </div>
        )}
        {/* Play button overlay */}
        <div className="absolute inset-0 bg-foreground/0 group-hover:bg-foreground/20 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100">
          <div className="w-16 h-16 bg-primary flex items-center justify-center">
            <Play className="w-8 h-8 text-primary-foreground fill-primary-foreground" />
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="p-5">
        <p className="text-xs font-mono text-muted-foreground uppercase tracking-wider mb-2">{getTopicLabel(topic)}</p>
        <h3 className="font-mono font-semibold mb-2 line-clamp-2">{title}</h3>
        <p className="text-sm font-mono text-muted-foreground line-clamp-2 mb-4">{description}</p>

        {/* Meta */}
        <div className="flex items-center gap-4 text-xs font-mono text-muted-foreground mb-4">
          <div className="flex items-center gap-1">
            <Clock className="w-3 h-3" />
            <span>{duration} min</span>
          </div>
          <div className="flex items-center gap-1">
            <BookOpen className="w-3 h-3" />
            <span>{lessonsCount} lecciones</span>
          </div>
        </div>

        {/* Progress or CTA */}
        {isEnrolled && progress !== undefined ? (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs font-mono">
              <span className="text-muted-foreground">Progreso</span>
              <span className="text-primary">{progress}%</span>
            </div>
            <Progress value={progress} className="h-1" />
            <Button className="w-full mt-3 font-mono uppercase tracking-wider" data-testid={`button-continue-${id}`}>
              Continuar
            </Button>
          </div>
        ) : (
          <Button 
            className="w-full font-mono uppercase tracking-wider" 
            variant={isFree ? "default" : "outline"}
            data-testid={`button-enroll-${id}`}
          >
            {isFree ? "Empezar Gratis" : "Inscribirse"}
          </Button>
        )}
      </div>
    </Card>
  );
}

// Mock data - topics use English keys for filtering, displayed with getTopicLabel()
const mockCourses: CourseCardProps[] = [
  {
    id: "1",
    title: "Inglés de Negocios: Reuniones y Presentaciones",
    description: "Domina el vocabulario y frases necesarias para reuniones y presentaciones efectivas.",
    level: "B1",
    topic: "Business English",
    duration: 180,
    lessonsCount: 12,
    progress: 65,
    isEnrolled: true,
  },
  {
    id: "2",
    title: "Conversaciones Cotidianas: En la Oficina",
    description: "Aprende inglés casual para interacciones diarias con colegas y clientes.",
    level: "A2",
    topic: "Everyday Conversations",
    duration: 120,
    lessonsCount: 8,
    progress: 40,
    isEnrolled: true,
  },
  {
    id: "3",
    title: "Gramática Esencial: Tiempos Pasados",
    description: "Profundiza en el pasado simple, pasado continuo y pasado perfecto.",
    level: "B1",
    topic: "Academic English",
    duration: 90,
    lessonsCount: 6,
    progress: 20,
    isEnrolled: true,
  },
  {
    id: "4",
    title: "Introducción al Inglés",
    description: "Comienza tu viaje en inglés con vocabulario básico y frases esenciales.",
    level: "A1",
    topic: "Everyday Conversations",
    duration: 60,
    lessonsCount: 5,
    isFree: true,
  },
  {
    id: "5",
    title: "Inglés para Viajes: Aeropuerto y Hotel",
    description: "Inglés esencial para viajeros - desde la reserva hasta el check-out.",
    level: "A2",
    topic: "Travel & Tourism",
    duration: 90,
    lessonsCount: 6,
  },
  {
    id: "6",
    title: "Vocabulario de la Industria Tech",
    description: "Domina el lenguaje de la tecnología, startups y desarrollo de software.",
    level: "B2",
    topic: "Technology",
    duration: 150,
    lessonsCount: 10,
  },
  {
    id: "7",
    title: "Negociaciones Empresariales Avanzadas",
    description: "Estrategias y lenguaje de alto nivel para negociaciones complejas.",
    level: "C1",
    topic: "Business English",
    duration: 200,
    lessonsCount: 14,
  },
  {
    id: "8",
    title: "Fundamentos de Inglés Médico",
    description: "Vocabulario esencial para profesionales de la salud y pacientes.",
    level: "B1",
    topic: "Healthcare",
    duration: 120,
    lessonsCount: 8,
  },
];

export function CourseCatalog() {
  const [searchQuery, setSearchQuery] = useState("");
  const [levelFilter, setLevelFilter] = useState<string>("all");
  const [topicFilter, setTopicFilter] = useState<string>("all");
  const [activeTab, setActiveTab] = useState("all");

  const filteredCourses = mockCourses.filter((course) => {
    const matchesSearch = course.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      course.description.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesLevel = levelFilter === "all" || course.level === levelFilter;
    const matchesTopic = topicFilter === "all" || course.topic === topicFilter;
    const matchesTab = activeTab === "all" || 
      (activeTab === "enrolled" && course.isEnrolled) ||
      (activeTab === "completed" && course.progress === 100);
    
    return matchesSearch && matchesLevel && matchesTopic && matchesTab;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-display uppercase mb-2">Mis Cursos</h1>
        <p className="font-mono text-muted-foreground">
          Explora y continúa tu viaje de aprendizaje
        </p>
      </div>

      {/* Filters */}
      <div className="flex flex-col md:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Buscar cursos..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 font-mono"
            data-testid="input-search-courses"
          />
        </div>
        <div className="flex gap-2">
          <Select value={levelFilter} onValueChange={setLevelFilter}>
            <SelectTrigger className="w-32 font-mono" data-testid="select-level-filter">
              <SelectValue placeholder="Nivel" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos los Niveles</SelectItem>
              {courseLevels.map((level) => (
                <SelectItem key={level} value={level}>{level}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={topicFilter} onValueChange={setTopicFilter}>
            <SelectTrigger className="w-40 font-mono" data-testid="select-topic-filter">
              <SelectValue placeholder="Tema" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos los Temas</SelectItem>
              {Object.entries(courseTopicsEs).map(([value, label]) => (
                <SelectItem key={value} value={value}>{label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="bg-muted">
          <TabsTrigger value="all" className="font-mono" data-testid="tab-all-courses">Todos los Cursos</TabsTrigger>
          <TabsTrigger value="enrolled" className="font-mono" data-testid="tab-enrolled">En Progreso</TabsTrigger>
          <TabsTrigger value="completed" className="font-mono" data-testid="tab-completed">Completados</TabsTrigger>
        </TabsList>
      </Tabs>

      {/* Course grid */}
      {filteredCourses.length > 0 ? (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {filteredCourses.map((course) => (
            <CourseCard key={course.id} {...course} />
          ))}
        </div>
      ) : (
        <div className="text-center py-20">
          <Filter className="w-12 h-12 text-muted-foreground/30 mx-auto mb-4" />
          <p className="font-mono text-muted-foreground">No se encontraron cursos con estos criterios</p>
          <Button 
            variant="outline" 
            className="mt-4 font-mono"
            onClick={() => {
              setSearchQuery("");
              setLevelFilter("all");
              setTopicFilter("all");
            }}
          >
            Limpiar Filtros
          </Button>
        </div>
      )}
    </div>
  );
}
