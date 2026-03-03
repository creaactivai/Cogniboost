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
  MessageSquare,
  Lock,
  Crown
} from "lucide-react";
import { courseLevels } from "@shared/schema";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { Link } from "wouter";
import type { LiveSession, SessionRoom, RoomBooking, Subscription } from "@shared/schema";
import {
  canAccessLabs,
  canBookMoreLabs,
  getWeeklyLabLimit,
  getMonthlyLabLimit,
  getTierDisplayName,
  getStartOfCurrentWeek,
  getStartOfCurrentMonth,
  type SubscriptionTier
} from "@/lib/tier-access";

const courseTopicsEn: Record<string, string> = {
  "Business English": "Business English",
  "Travel & Tourism": "Travel & Tourism",
  "Technology": "Technology",
  "Culture & Arts": "Culture & Arts",
  "Healthcare": "Healthcare",
  "Finance": "Finance",
  "Academic English": "Academic English",
  "Everyday Conversations": "Everyday Conversations",
};

const getTopicLabel = (topic: string) => courseTopicsEn[topic] || topic;

type SessionWithRooms = LiveSession & { rooms: SessionRoom[] };

function formatDate(dateStr: string): { dayName: string; dayNum: string; month: string; time: string } {
  const date = new Date(dateStr);
  const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

  const today = new Date();
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  let dayName = days[date.getDay()];
  if (date.toDateString() === today.toDateString()) {
    dayName = "Today";
  } else if (date.toDateString() === tomorrow.toDateString()) {
    dayName = "Tomorrow";
  }
  
  return {
    dayName,
    dayNum: date.getDate().toString(),
    month: months[date.getMonth()],
    time: date.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true })
  };
}

interface RoomCardProps {
  room: SessionRoom;
  isBooked: boolean;
  onBook: () => void;
  isBooking: boolean;
  isAtWeeklyLimit?: boolean;
}

function RoomCard({ room, isBooked, onBook, isBooking, isAtWeeklyLimit = false }: RoomCardProps) {
  const spotsLeft = room.maxParticipants - room.currentParticipants;
  const isFull = spotsLeft <= 0;
  const isDisabled = isFull || isBooking || isAtWeeklyLimit;
  
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
                Booked
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-3 text-xs font-mono text-muted-foreground">
            <div className="flex items-center gap-1">
              <Users className="w-3 h-3" />
              <span>{room.currentParticipants}/{room.maxParticipants}</span>
            </div>
            <span className={isFull ? "text-destructive" : "text-muted-foreground"}>
              {isFull ? "Full" : `${spotsLeft} spots`}
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
              Join
            </Button>
          ) : (
            <Button 
              size="sm"
              variant="outline"
              disabled={isDisabled}
              onClick={onBook}
              className="font-mono text-xs"
              data-testid={`button-book-room-${room.id}`}
            >
              {isBooking ? "..." : isAtWeeklyLimit ? "Limit" : "Book"}
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
  isAtWeeklyLimit?: boolean;
}

function LiveSessionCard({ session, bookedRoomIds, onBookRoom, isBooking, bookingRoomId, isAtWeeklyLimit = false }: LiveSessionCardProps) {
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
                Enrolled
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
              <span>{session.rooms.length} rooms by topic</span>
            </div>
          </div>
          
          <div className="space-y-2">
            <p className="text-xs font-mono text-muted-foreground uppercase tracking-wider mb-3">
              Select a room by topic:
            </p>
            <div className="grid gap-2">
              {session.rooms.map(room => (
                <RoomCard
                  key={room.id}
                  room={room}
                  isBooked={bookedRoomIds.has(room.id)}
                  onBook={() => onBookRoom(room.id)}
                  isBooking={isBooking && bookingRoomId === room.id}
                  isAtWeeklyLimit={isAtWeeklyLimit}
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
  const { user } = useAuth();

  const { data: subscription } = useQuery<Subscription>({
    queryKey: ["/api/subscription"],
    enabled: !!user,
  });

  const userTier = (subscription?.tier || "free") as SubscriptionTier;
  const userLevel = user?.englishLevel || user?.placementLevel || "A1";
  const hasLabsAccess = canAccessLabs(userTier);

  const { data: sessions = [], isLoading: sessionsLoading } = useQuery<LiveSession[]>({
    queryKey: ["/api/live-sessions"],
    enabled: hasLabsAccess,
  });

  const { data: bookings = [] } = useQuery<RoomBooking[]>({
    queryKey: ["/api/room-bookings"],
    enabled: hasLabsAccess,
  });

  const bookedRoomIds = new Set(bookings.map(b => b.roomId));

  const weekStart = getStartOfCurrentWeek();
  const currentWeekBookings = bookings.filter(b => {
    const bookingDate = new Date(b.bookedAt as unknown as string);
    return bookingDate >= weekStart && !b.cancelledAt;
  }).length;

  const monthStart = getStartOfCurrentMonth();
  const currentMonthBookings = bookings.filter(b => {
    const bookingDate = new Date(b.bookedAt as unknown as string);
    return bookingDate >= monthStart && !b.cancelledAt;
  }).length;

  const weeklyLimit = getWeeklyLabLimit(userTier);
  const monthlyLimit = getMonthlyLabLimit(userTier);
  const canBookMore = canBookMoreLabs(userTier, currentWeekBookings, currentMonthBookings);
  const isAtWeeklyLimit = weeklyLimit !== null && currentWeekBookings >= weeklyLimit;
  const isAtMonthlyLimit = monthlyLimit !== null && currentMonthBookings >= monthlyLimit;

  const bookRoomMutation = useMutation({
    mutationFn: async (roomId: string) => {
      setBookingRoomId(roomId);
      return apiRequest("POST", "/api/room-bookings", { roomId });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/room-bookings"] });
      queryClient.invalidateQueries({ queryKey: ["/api/live-sessions"] });
      toast({
        title: "Room booked!",
        description: "Your spot in the room has been confirmed.",
      });
      setBookingRoomId(null);
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Could not book the room. Please try again.",
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
    const matchingRooms = session.rooms.filter(room => {
      const matchesUserLevel = room.level === userLevel;
      const matchesLevelFilter = levelFilter === "all" || room.level === levelFilter;
      const matchesTopic = topicFilter === "all" || room.topic === topicFilter;
      return matchesUserLevel && matchesLevelFilter && matchesTopic;
    });
    return matchingRooms.length > 0;
  }).map(session => ({
    ...session,
    rooms: session.rooms.filter(room => room.level === userLevel),
  }));

  const bookedSessions = upcomingSessions.filter(session => 
    session.rooms.some(room => bookedRoomIds.has(room.id))
  );

  const bookedRoomsCount = bookings.filter(b => !b.cancelledAt).length;
  const attendedCount = bookings.filter(b => b.attendedAt).length;

  if (!hasLabsAccess) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-display uppercase mb-2">Conversation Labs</h1>
          <p className="font-mono text-muted-foreground">
            Live practice with other students at your level
          </p>
        </div>
        
        <Card className="relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-b from-transparent via-background/50 to-background z-10" />
          <div className="filter blur-sm pointer-events-none">
            <div className="p-6 space-y-4">
              <div className="grid sm:grid-cols-3 gap-4 opacity-50">
                <Card className="p-4 border-border">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-primary/10 flex items-center justify-center">
                      <CalendarIcon className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <p className="text-2xl font-display">0</p>
                      <p className="text-xs font-mono text-muted-foreground">Rooms Booked</p>
                    </div>
                  </div>
                </Card>
                <Card className="p-4 border-border">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-accent/10 flex items-center justify-center">
                      <CheckCircle2 className="w-5 h-5 text-accent" />
                    </div>
                    <div>
                      <p className="text-2xl font-display">0</p>
                      <p className="text-xs font-mono text-muted-foreground">Labs Attended</p>
                    </div>
                  </div>
                </Card>
                <Card className="p-4 border-border">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-muted flex items-center justify-center">
                      <MessageSquare className="w-5 h-5 text-muted-foreground" />
                    </div>
                    <div>
                      <p className="text-2xl font-display">5+</p>
                      <p className="text-xs font-mono text-muted-foreground">Available Sessions</p>
                    </div>
                  </div>
                </Card>
              </div>
              <div className="h-48 bg-muted/30 flex items-center justify-center">
                <div className="text-center text-muted-foreground">
                  <Video className="w-12 h-12 mx-auto mb-2 opacity-50" />
                  <p className="font-mono text-sm">Live practice sessions</p>
                </div>
              </div>
            </div>
          </div>
          
          <div className="absolute inset-0 flex items-center justify-center z-20">
            <div className="text-center p-8 max-w-md">
              <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <Lock className="w-8 h-8 text-primary" />
              </div>
              <h3 className="text-xl font-display uppercase mb-2">
                Labs Access Locked
              </h3>
              <p className="font-mono text-sm text-muted-foreground mb-6">
                {userTier === "free"
                  ? "Live conversation labs are available starting from the Basic plan. Practice with other students and improve your fluency."
                  : "Your Flex plan includes access to pre-recorded courses. Upgrade to the Basic plan to join live practice sessions."
                }
              </p>
              <div className="flex flex-col gap-3">
                <Link href="/choose-plan">
                  <Button className="w-full font-mono" data-testid="button-upgrade-labs">
                    <Crown className="w-4 h-4 mr-2" />
                    Upgrade to Basic - $49.99/mo
                  </Button>
                </Link>
                <p className="text-xs font-mono text-muted-foreground">
                  Basic Plan: 2 labs per week {"\u2022"} Premium Plan: unlimited labs
                </p>
              </div>
            </div>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-display uppercase mb-2">Conversation Labs</h1>
        <p className="font-mono text-muted-foreground">
          Join live sessions and choose the room by topic that interests you most
        </p>
      </div>
      
      {(isAtWeeklyLimit || isAtMonthlyLimit) && (
        <Card className="p-4 border-orange-200 bg-orange-50 dark:border-orange-800 dark:bg-orange-950/20">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center shrink-0">
              <Lock className="w-5 h-5 text-orange-600 dark:text-orange-400" />
            </div>
            <div className="flex-1">
              <h4 className="font-mono font-medium text-orange-800 dark:text-orange-200">
                {isAtMonthlyLimit
                  ? `Monthly limit reached (${currentMonthBookings}/${monthlyLimit})`
                  : `Weekly limit reached (${currentWeekBookings}/${weeklyLimit})`}
              </h4>
              <p className="text-sm font-mono text-orange-600 dark:text-orange-400 mb-3">
                {isAtMonthlyLimit
                  ? "You've booked the maximum labs for this month. Upgrade your plan for more labs."
                  : "You've booked the maximum labs for this week. Upgrade to Premium for unlimited access."}
              </p>
              <Link href="/choose-plan">
                <Button size="sm" className="font-mono" data-testid="button-upgrade-unlimited">
                  <Crown className="w-4 h-4 mr-2" />
                  {isAtMonthlyLimit ? "Upgrade Plan" : "Upgrade to Premium"}
                </Button>
              </Link>
            </div>
          </div>
        </Card>
      )}

      <div className="grid sm:grid-cols-3 gap-4">
        <Card className="p-4 border-border">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-primary/10 flex items-center justify-center">
              <CalendarIcon className="w-5 h-5 text-primary" />
            </div>
            <div>
              <p className="text-2xl font-display">{bookedRoomsCount}</p>
              <p className="text-xs font-mono text-muted-foreground">Rooms Booked</p>
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
              <p className="text-xs font-mono text-muted-foreground">Labs Attended</p>
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
              <p className="text-xs font-mono text-muted-foreground">Upcoming Sessions</p>
            </div>
          </div>
        </Card>
      </div>

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="bg-muted">
            <TabsTrigger value="upcoming" className="font-mono" data-testid="tab-upcoming">Upcoming</TabsTrigger>
            <TabsTrigger value="booked" className="font-mono" data-testid="tab-booked">My Bookings</TabsTrigger>
            <TabsTrigger value="past" className="font-mono" data-testid="tab-past">Past</TabsTrigger>
          </TabsList>
        </Tabs>

        {activeTab === "upcoming" && (
          <div className="flex gap-2">
            <Select value={levelFilter} onValueChange={setLevelFilter}>
              <SelectTrigger className="w-32 font-mono" data-testid="select-level">
                <SelectValue placeholder="Level" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Levels</SelectItem>
                {courseLevels.map((level) => (
                  <SelectItem key={level} value={level}>{level}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={topicFilter} onValueChange={setTopicFilter}>
              <SelectTrigger className="w-40 font-mono" data-testid="select-topic">
                <SelectValue placeholder="Topic" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Topics</SelectItem>
                {Object.entries(courseTopicsEn).map(([value, label]) => (
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
            <p className="font-mono text-muted-foreground">Loading sessions...</p>
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
                isAtWeeklyLimit={isAtWeeklyLimit || isAtMonthlyLimit}
              />
            ))
          ) : (
            <div className="text-center py-16">
              <CalendarIcon className="w-12 h-12 text-muted-foreground/30 mx-auto mb-4" />
              <p className="font-mono text-muted-foreground">
                {sessions.length === 0
                  ? "No sessions scheduled at the moment"
                  : "No sessions match your filters"
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
              <p className="font-mono text-muted-foreground mb-4">You haven't booked any rooms yet</p>
              <Button onClick={() => setActiveTab("upcoming")} className="font-mono">
                View Available Sessions
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
              <p className="font-mono text-muted-foreground">No past sessions to show</p>
            </div>
          )
        )}
      </div>
    </div>
  );
}
