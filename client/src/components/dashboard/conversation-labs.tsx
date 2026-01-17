import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { 
  Calendar as CalendarIcon, 
  Clock, 
  Users, 
  Video,
  MapPin,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  CheckCircle2,
  XCircle
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

interface LabCardProps {
  id: string;
  title: string;
  description: string;
  topic: string;
  level: string;
  date: string;
  time: string;
  duration: number;
  instructor: string;
  maxParticipants: number;
  currentParticipants: number;
  isBooked?: boolean;
  isPast?: boolean;
  attended?: boolean;
}

function LabCard({
  id,
  title,
  description,
  topic,
  level,
  date,
  time,
  duration,
  instructor,
  maxParticipants,
  currentParticipants,
  isBooked,
  isPast,
  attended,
}: LabCardProps) {
  const spotsLeft = maxParticipants - currentParticipants;
  const isFull = spotsLeft <= 0;

  return (
    <Card className={`p-6 border-border hover-elevate ${isPast ? "opacity-75" : ""}`}>
      <div className="flex flex-col md:flex-row md:items-start gap-4">
        {/* Date block */}
        <div className="w-20 h-20 bg-primary/10 flex flex-col items-center justify-center flex-shrink-0">
          <span className="text-xs font-mono text-muted-foreground uppercase">{date.split(" ")[0]}</span>
          <span className="text-2xl font-display">{date.split(" ")[1]}</span>
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-2">
            <Badge variant="outline" className="font-mono text-xs">{level}</Badge>
            <Badge variant="secondary" className="font-mono text-xs">{getTopicLabel(topic)}</Badge>
            {isBooked && !isPast && (
              <Badge className="bg-primary text-primary-foreground font-mono text-xs">
                <CheckCircle2 className="w-3 h-3 mr-1" />
                Reservado
              </Badge>
            )}
            {isPast && attended && (
              <Badge className="bg-green-500 text-white font-mono text-xs">Asistió</Badge>
            )}
            {isPast && !attended && isBooked && (
              <Badge variant="destructive" className="font-mono text-xs">No Asistió</Badge>
            )}
          </div>
          
          <h3 className="font-mono font-semibold text-lg mb-1">{title}</h3>
          <p className="text-sm font-mono text-muted-foreground mb-3 line-clamp-2">{description}</p>

          <div className="flex flex-wrap items-center gap-4 text-xs font-mono text-muted-foreground">
            <div className="flex items-center gap-1">
              <Clock className="w-3 h-3" />
              <span>{time}</span>
            </div>
            <div className="flex items-center gap-1">
              <Video className="w-3 h-3" />
              <span>{duration} min</span>
            </div>
            <div className="flex items-center gap-1">
              <Users className="w-3 h-3" />
              <span>{currentParticipants}/{maxParticipants} unidos</span>
            </div>
            <div className="flex items-center gap-1">
              <Sparkles className="w-3 h-3" />
              <span>{instructor}</span>
            </div>
          </div>
        </div>

        {/* Action */}
        <div className="flex flex-col items-end gap-2">
          {!isPast && (
            <>
              {isBooked ? (
                <div className="flex flex-col gap-2">
                  <Button className="bg-accent text-accent-foreground font-mono uppercase tracking-wider" data-testid={`button-join-${id}`}>
                    Unirse al Lab
                  </Button>
                  <Button variant="ghost" className="font-mono text-xs text-muted-foreground" data-testid={`button-cancel-${id}`}>
                    Cancelar Reserva
                  </Button>
                </div>
              ) : (
                <Button 
                  className="font-mono uppercase tracking-wider"
                  disabled={isFull}
                  data-testid={`button-book-${id}`}
                >
                  {isFull ? "Lleno" : "Reservar Lugar"}
                </Button>
              )}
              {!isFull && !isBooked && (
                <span className="text-xs font-mono text-muted-foreground">
                  {spotsLeft} lugares
                </span>
              )}
            </>
          )}
          {isPast && (
            <span className="text-xs font-mono text-muted-foreground">Completado</span>
          )}
        </div>
      </div>
    </Card>
  );
}

// Mock data - topics use English keys for filtering, displayed with getTopicLabel()
const mockLabs: LabCardProps[] = [
  {
    id: "1",
    title: "Martes de Tecnología",
    description: "Discute lo último en IA, machine learning y cómo la tecnología está cambiando nuestro mundo. Practica explicar conceptos tech complejos.",
    topic: "Technology",
    level: "B2",
    date: "Mar 21",
    time: "6:00 PM EST",
    duration: 60,
    instructor: "Prof. Sarah Chen",
    maxParticipants: 12,
    currentParticipants: 8,
    isBooked: true,
  },
  {
    id: "2",
    title: "Taller de Negociaciones",
    description: "Practica negociaciones de salario, discusiones de contratos y aprende lenguaje persuasivo para entornos profesionales.",
    topic: "Business English",
    level: "B1",
    date: "Mié 22",
    time: "7:00 PM EST",
    duration: 60,
    instructor: "Mark Thompson",
    maxParticipants: 12,
    currentParticipants: 6,
  },
  {
    id: "3",
    title: "Historias de Viajes",
    description: "Comparte tus experiencias de viaje y aprende vocabulario para reservas, transporte y encuentros culturales.",
    topic: "Travel & Tourism",
    level: "A2",
    date: "Jue 23",
    time: "5:00 PM EST",
    duration: 45,
    instructor: "Ana Martínez",
    maxParticipants: 10,
    currentParticipants: 10,
  },
  {
    id: "4",
    title: "Charla Casual de Viernes",
    description: "Práctica de conversación relajada sobre cualquier tema. Perfecto para ganar confianza en situaciones casuales.",
    topic: "Everyday Conversations",
    level: "A1",
    date: "Vie 24",
    time: "4:00 PM EST",
    duration: 45,
    instructor: "David Lee",
    maxParticipants: 8,
    currentParticipants: 3,
  },
  {
    id: "5",
    title: "Vocabulario Médico Intensivo",
    description: "Terminología médica, comunicación con pacientes y conversaciones de la industria de la salud.",
    topic: "Healthcare",
    level: "B1",
    date: "Sáb 25",
    time: "10:00 AM EST",
    duration: 60,
    instructor: "Dra. Rachel Kim",
    maxParticipants: 10,
    currentParticipants: 5,
  },
];

const pastLabs: LabCardProps[] = [
  {
    id: "p1",
    title: "Motivación del Lunes",
    description: "Comienza la semana con energía positiva y vocabulario de establecimiento de metas.",
    topic: "Everyday Conversations",
    level: "A2",
    date: "Lun 13",
    time: "6:00 PM EST",
    duration: 45,
    instructor: "Ana Martínez",
    maxParticipants: 12,
    currentParticipants: 12,
    isPast: true,
    isBooked: true,
    attended: true,
  },
  {
    id: "p2",
    title: "Fundamentos de Finanzas",
    description: "Vocabulario de inversiones y discusión de tendencias del mercado.",
    topic: "Finance",
    level: "B2",
    date: "Mar 14",
    time: "7:00 PM EST",
    duration: 60,
    instructor: "James Wilson",
    maxParticipants: 10,
    currentParticipants: 10,
    isPast: true,
    isBooked: true,
    attended: false,
  },
];

export function ConversationLabs() {
  const [activeTab, setActiveTab] = useState("upcoming");
  const [levelFilter, setLevelFilter] = useState<string>("all");
  const [topicFilter, setTopicFilter] = useState<string>("all");

  const filteredUpcoming = mockLabs.filter((lab) => {
    const matchesLevel = levelFilter === "all" || lab.level === levelFilter;
    const matchesTopic = topicFilter === "all" || lab.topic === topicFilter;
    return matchesLevel && matchesTopic;
  });

  const bookedLabs = mockLabs.filter((lab) => lab.isBooked);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-display uppercase mb-2">Labs de Conversación</h1>
        <p className="font-mono text-muted-foreground">
          Practica inglés hablado con compañeros de tu nivel
        </p>
      </div>

      {/* Quick stats */}
      <div className="grid sm:grid-cols-3 gap-4">
        <Card className="p-4 border-border">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-primary/10 flex items-center justify-center">
              <CalendarIcon className="w-5 h-5 text-primary" />
            </div>
            <div>
              <p className="text-2xl font-display">{bookedLabs.length}</p>
              <p className="text-xs font-mono text-muted-foreground">Próximos Reservados</p>
            </div>
          </div>
        </Card>
        <Card className="p-4 border-border">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-accent/10 flex items-center justify-center">
              <CheckCircle2 className="w-5 h-5 text-accent" />
            </div>
            <div>
              <p className="text-2xl font-display">12</p>
              <p className="text-xs font-mono text-muted-foreground">Labs Asistidos</p>
            </div>
          </div>
        </Card>
        <Card className="p-4 border-border">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-muted flex items-center justify-center">
              <Clock className="w-5 h-5 text-muted-foreground" />
            </div>
            <div>
              <p className="text-2xl font-display">8.5h</p>
              <p className="text-xs font-mono text-muted-foreground">Tiempo Hablando</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Tabs and Filters */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="bg-muted">
            <TabsTrigger value="upcoming" className="font-mono" data-testid="tab-upcoming">Próximos</TabsTrigger>
            <TabsTrigger value="booked" className="font-mono" data-testid="tab-booked">Mis Reservas</TabsTrigger>
            <TabsTrigger value="past" className="font-mono" data-testid="tab-past">Labs Pasados</TabsTrigger>
          </TabsList>
        </Tabs>

        {activeTab === "upcoming" && (
          <div className="flex gap-2">
            <Select value={levelFilter} onValueChange={setLevelFilter}>
              <SelectTrigger className="w-32 font-mono" data-testid="select-level">
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
              <SelectTrigger className="w-40 font-mono" data-testid="select-topic">
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
        )}
      </div>

      {/* Labs list */}
      <div className="space-y-4">
        {activeTab === "upcoming" && (
          filteredUpcoming.length > 0 ? (
            filteredUpcoming.map((lab) => <LabCard key={lab.id} {...lab} />)
          ) : (
            <div className="text-center py-16">
              <CalendarIcon className="w-12 h-12 text-muted-foreground/30 mx-auto mb-4" />
              <p className="font-mono text-muted-foreground">No hay labs que coincidan con tus filtros</p>
            </div>
          )
        )}

        {activeTab === "booked" && (
          bookedLabs.length > 0 ? (
            bookedLabs.map((lab) => <LabCard key={lab.id} {...lab} />)
          ) : (
            <div className="text-center py-16">
              <CalendarIcon className="w-12 h-12 text-muted-foreground/30 mx-auto mb-4" />
              <p className="font-mono text-muted-foreground mb-4">Aún no has reservado ningún lab</p>
              <Button onClick={() => setActiveTab("upcoming")} className="font-mono">
                Ver Labs Disponibles
              </Button>
            </div>
          )
        )}

        {activeTab === "past" && (
          pastLabs.length > 0 ? (
            pastLabs.map((lab) => <LabCard key={lab.id} {...lab} />)
          ) : (
            <div className="text-center py-16">
              <Clock className="w-12 h-12 text-muted-foreground/30 mx-auto mb-4" />
              <p className="font-mono text-muted-foreground">No hay labs pasados para mostrar</p>
            </div>
          )
        )}
      </div>
    </div>
  );
}
