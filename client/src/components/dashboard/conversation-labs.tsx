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
  ChevronRight,
  Sparkles,
  CheckCircle2,
  XCircle,
  MessageSquare
} from "lucide-react";
import { courseLevels } from "@shared/schema";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { LiveSession, SessionRoom, RoomBooking } from "@shared/schema";

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

type SessionWithRooms = LiveSession & { rooms: SessionRoom[] };

function formatDate(dateStr: string): { dayName: string; dayNum: string; month: string; time: string } {
  const date = new Date(dateStr);
  const days = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];
  const months = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];
  
  const today = new Date();
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  
  let dayName = days[date.getDay()];
  if (date.toDateString() === today.toDateString()) {
    dayName = "Hoy";
  } else if (date.toDateString() === tomorrow.toDateString()) {
    dayName = "Mañana";
  }
  
  return {
    dayName,
    dayNum: date.getDate().toString(),
    month: months[date.getMonth()],
    time: date.toLocaleTimeString("es-MX", { hour: "numeric", minute: "2-digit", hour12: true })
  };
}

interface RoomCardProps {
  room: SessionRoom;
  isBooked: boolean;
  onBook: () => void;
  isBooking: boolean;
}

function RoomCard({ room, isBooked, onBook, isBooking }: RoomCardProps) {
  const spotsLeft = room.maxParticipants - room.currentParticipants;
  const isFull = spotsLeft <= 0;
  
  return (
    <div className={`p-4 border border-border hover-elevate ${isBooked ? "bg-primary/5 border-primary/30" : ""}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-2">
            <Badge variant="outline" className="font-mono text-xs">{room.level}</Badge>
            <Badge variant="secondary" className="font-mono text-xs">{getTopicLabel(room.topic)}</Badge>
            {isBooked && (
              <Badge className="bg-primary text-primary-foreground font-mono text-xs">
                <CheckCircle2 className="w-3 h-3 mr-1" />
                Reservado
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-3 text-xs font-mono text-muted-foreground">
            <div className="flex items-center gap-1">
              <Users className="w-3 h-3" />
              <span>{room.currentParticipants}/{room.maxParticipants}</span>
            </div>
            <span className={isFull ? "text-destructive" : "text-muted-foreground"}>
              {isFull ? "Lleno" : `${spotsLeft} lugares`}
            </span>
          </div>
        </div>
        <div>
          {isBooked ? (
            <Button 
              size="sm"
              className="bg-accent text-accent-foreground font-mono text-xs"
              data-testid={`button-join-room-${room.id}`}
            >
              Unirse
            </Button>
          ) : (
            <Button 
              size="sm"
              variant="outline"
              disabled={isFull || isBooking}
              onClick={onBook}
              className="font-mono text-xs"
              data-testid={`button-book-room-${room.id}`}
            >
              {isBooking ? "..." : "Reservar"}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

interface LiveSessionCardProps {
  session: SessionWithRooms;
  bookedRoomIds: Set<string>;
  onBookRoom: (roomId: string) => void;
  isBooking: boolean;
  bookingRoomId: string | null;
}

function LiveSessionCard({ session, bookedRoomIds, onBookRoom, isBooking, bookingRoomId }: LiveSessionCardProps) {
  const dateInfo = formatDate(session.scheduledAt as unknown as string);
  const hasBookedRoom = session.rooms.some(r => bookedRoomIds.has(r.id));
  
  return (
    <Card className="border-border overflow-hidden">
      <div className="flex">
        <div className="w-24 bg-primary/10 flex flex-col items-center justify-center py-6 px-4 flex-shrink-0">
          <span className="text-xs font-mono text-muted-foreground uppercase">{dateInfo.dayName}</span>
          <span className="text-3xl font-display">{dateInfo.dayNum}</span>
          <span className="text-xs font-mono text-muted-foreground">{dateInfo.month}</span>
        </div>
        
        <div className="flex-1 p-6">
          <div className="flex items-start justify-between mb-4">
            <div>
              <h3 className="font-mono font-semibold text-lg mb-1">{session.title}</h3>
              {session.description && (
                <p className="text-sm font-mono text-muted-foreground line-clamp-1">{session.description}</p>
              )}
            </div>
            {hasBookedRoom && (
              <Badge className="bg-primary text-primary-foreground font-mono">
                <CheckCircle2 className="w-3 h-3 mr-1" />
                Inscrito
              </Badge>
            )}
          </div>
          
          <div className="flex flex-wrap items-center gap-4 mb-4 text-xs font-mono text-muted-foreground">
            <div className="flex items-center gap-1">
              <Clock className="w-3 h-3" />
              <span>{dateInfo.time}</span>
            </div>
            <div className="flex items-center gap-1">
              <Video className="w-3 h-3" />
              <span>{session.duration} min</span>
            </div>
            <div className="flex items-center gap-1">
              <MessageSquare className="w-3 h-3" />
              <span>{session.rooms.length} salas por tema</span>
            </div>
          </div>
          
          <div className="space-y-2">
            <p className="text-xs font-mono text-muted-foreground uppercase tracking-wider mb-3">
              Selecciona una sala por tema:
            </p>
            <div className="grid gap-2">
              {session.rooms.map(room => (
                <RoomCard
                  key={room.id}
                  room={room}
                  isBooked={bookedRoomIds.has(room.id)}
                  onBook={() => onBookRoom(room.id)}
                  isBooking={isBooking && bookingRoomId === room.id}
                />
              ))}
            </div>
          </div>
        </div>
      </div>
    </Card>
  );
}

export function ConversationLabs() {
  const [activeTab, setActiveTab] = useState("upcoming");
  const [levelFilter, setLevelFilter] = useState<string>("all");
  const [topicFilter, setTopicFilter] = useState<string>("all");
  const [bookingRoomId, setBookingRoomId] = useState<string | null>(null);
  const { toast } = useToast();

  const { data: sessions = [], isLoading: sessionsLoading } = useQuery<LiveSession[]>({
    queryKey: ["/api/live-sessions"],
  });

  const { data: bookings = [] } = useQuery<RoomBooking[]>({
    queryKey: ["/api/room-bookings"],
  });

  const bookedRoomIds = new Set(bookings.map(b => b.roomId));

  const bookRoomMutation = useMutation({
    mutationFn: async (roomId: string) => {
      setBookingRoomId(roomId);
      return apiRequest("POST", "/api/room-bookings", { roomId });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/room-bookings"] });
      queryClient.invalidateQueries({ queryKey: ["/api/live-sessions"] });
      toast({
        title: "¡Sala reservada!",
        description: "Tu lugar en la sala ha sido confirmado.",
      });
      setBookingRoomId(null);
    },
    onError: () => {
      toast({
        title: "Error",
        description: "No se pudo reservar la sala. Intenta de nuevo.",
        variant: "destructive",
      });
      setBookingRoomId(null);
    },
  });

  const sessionsWithRooms: SessionWithRooms[] = sessions.map(session => ({
    ...session,
    rooms: (session as any).rooms || [],
  }));

  const now = new Date();
  const upcomingSessions = sessionsWithRooms.filter(s => new Date(s.scheduledAt) > now);
  const pastSessions = sessionsWithRooms.filter(s => new Date(s.scheduledAt) <= now);

  const filteredUpcoming = upcomingSessions.filter((session) => {
    if (levelFilter === "all" && topicFilter === "all") return true;
    
    return session.rooms.some(room => {
      const matchesLevel = levelFilter === "all" || room.level === levelFilter;
      const matchesTopic = topicFilter === "all" || room.topic === topicFilter;
      return matchesLevel && matchesTopic;
    });
  });

  const bookedSessions = upcomingSessions.filter(session => 
    session.rooms.some(room => bookedRoomIds.has(room.id))
  );

  const bookedRoomsCount = bookings.filter(b => !b.cancelledAt).length;
  const attendedCount = bookings.filter(b => b.attendedAt).length;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-display uppercase mb-2">Labs de Conversación</h1>
        <p className="font-mono text-muted-foreground">
          Únete a sesiones en vivo y elige la sala por tema que más te interese
        </p>
      </div>

      <div className="grid sm:grid-cols-3 gap-4">
        <Card className="p-4 border-border">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-primary/10 flex items-center justify-center">
              <CalendarIcon className="w-5 h-5 text-primary" />
            </div>
            <div>
              <p className="text-2xl font-display">{bookedRoomsCount}</p>
              <p className="text-xs font-mono text-muted-foreground">Salas Reservadas</p>
            </div>
          </div>
        </Card>
        <Card className="p-4 border-border">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-accent/10 flex items-center justify-center">
              <CheckCircle2 className="w-5 h-5 text-accent" />
            </div>
            <div>
              <p className="text-2xl font-display">{attendedCount}</p>
              <p className="text-xs font-mono text-muted-foreground">Labs Asistidos</p>
            </div>
          </div>
        </Card>
        <Card className="p-4 border-border">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-muted flex items-center justify-center">
              <MessageSquare className="w-5 h-5 text-muted-foreground" />
            </div>
            <div>
              <p className="text-2xl font-display">{upcomingSessions.length}</p>
              <p className="text-xs font-mono text-muted-foreground">Sesiones Próximas</p>
            </div>
          </div>
        </Card>
      </div>

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="bg-muted">
            <TabsTrigger value="upcoming" className="font-mono" data-testid="tab-upcoming">Próximas</TabsTrigger>
            <TabsTrigger value="booked" className="font-mono" data-testid="tab-booked">Mis Reservas</TabsTrigger>
            <TabsTrigger value="past" className="font-mono" data-testid="tab-past">Pasadas</TabsTrigger>
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

      <div className="space-y-4">
        {sessionsLoading && (
          <div className="text-center py-16">
            <div className="w-8 h-8 border-2 border-primary border-t-transparent animate-spin mx-auto mb-4"></div>
            <p className="font-mono text-muted-foreground">Cargando sesiones...</p>
          </div>
        )}

        {!sessionsLoading && activeTab === "upcoming" && (
          filteredUpcoming.length > 0 ? (
            filteredUpcoming.map((session) => (
              <LiveSessionCard 
                key={session.id} 
                session={session}
                bookedRoomIds={bookedRoomIds}
                onBookRoom={(roomId) => bookRoomMutation.mutate(roomId)}
                isBooking={bookRoomMutation.isPending}
                bookingRoomId={bookingRoomId}
              />
            ))
          ) : (
            <div className="text-center py-16">
              <CalendarIcon className="w-12 h-12 text-muted-foreground/30 mx-auto mb-4" />
              <p className="font-mono text-muted-foreground">
                {sessions.length === 0 
                  ? "No hay sesiones programadas por ahora" 
                  : "No hay sesiones que coincidan con tus filtros"
                }
              </p>
            </div>
          )
        )}

        {!sessionsLoading && activeTab === "booked" && (
          bookedSessions.length > 0 ? (
            bookedSessions.map((session) => (
              <LiveSessionCard 
                key={session.id} 
                session={session}
                bookedRoomIds={bookedRoomIds}
                onBookRoom={(roomId) => bookRoomMutation.mutate(roomId)}
                isBooking={bookRoomMutation.isPending}
                bookingRoomId={bookingRoomId}
              />
            ))
          ) : (
            <div className="text-center py-16">
              <CalendarIcon className="w-12 h-12 text-muted-foreground/30 mx-auto mb-4" />
              <p className="font-mono text-muted-foreground mb-4">Aún no has reservado ninguna sala</p>
              <Button onClick={() => setActiveTab("upcoming")} className="font-mono">
                Ver Sesiones Disponibles
              </Button>
            </div>
          )
        )}

        {!sessionsLoading && activeTab === "past" && (
          pastSessions.length > 0 ? (
            pastSessions.map((session) => (
              <LiveSessionCard 
                key={session.id} 
                session={session}
                bookedRoomIds={bookedRoomIds}
                onBookRoom={() => {}}
                isBooking={false}
                bookingRoomId={null}
              />
            ))
          ) : (
            <div className="text-center py-16">
              <Clock className="w-12 h-12 text-muted-foreground/30 mx-auto mb-4" />
              <p className="font-mono text-muted-foreground">No hay sesiones pasadas para mostrar</p>
            </div>
          )
        )}
      </div>
    </div>
  );
}
