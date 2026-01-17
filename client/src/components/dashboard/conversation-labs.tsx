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
            <Badge variant="secondary" className="font-mono text-xs">{topic}</Badge>
            {isBooked && !isPast && (
              <Badge className="bg-primary text-primary-foreground font-mono text-xs">
                <CheckCircle2 className="w-3 h-3 mr-1" />
                Booked
              </Badge>
            )}
            {isPast && attended && (
              <Badge className="bg-green-500 text-white font-mono text-xs">Attended</Badge>
            )}
            {isPast && !attended && isBooked && (
              <Badge variant="destructive" className="font-mono text-xs">Missed</Badge>
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
              <span>{currentParticipants}/{maxParticipants} joined</span>
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
                    Join Lab
                  </Button>
                  <Button variant="ghost" className="font-mono text-xs text-muted-foreground" data-testid={`button-cancel-${id}`}>
                    Cancel Booking
                  </Button>
                </div>
              ) : (
                <Button 
                  className="font-mono uppercase tracking-wider"
                  disabled={isFull}
                  data-testid={`button-book-${id}`}
                >
                  {isFull ? "Full" : "Reserve Spot"}
                </Button>
              )}
              {!isFull && !isBooked && (
                <span className="text-xs font-mono text-muted-foreground">
                  {spotsLeft} spots left
                </span>
              )}
            </>
          )}
          {isPast && (
            <span className="text-xs font-mono text-muted-foreground">Completed</span>
          )}
        </div>
      </div>
    </Card>
  );
}

// Mock data
const mockLabs: LabCardProps[] = [
  {
    id: "1",
    title: "Tech Talk Tuesday",
    description: "Discuss the latest in AI, machine learning, and how technology is changing our world. Practice explaining complex tech concepts.",
    topic: "Technology",
    level: "B2",
    date: "Tue 21",
    time: "6:00 PM EST",
    duration: 60,
    instructor: "Prof. Sarah Chen",
    maxParticipants: 12,
    currentParticipants: 8,
    isBooked: true,
  },
  {
    id: "2",
    title: "Business Negotiations Workshop",
    description: "Role-play salary negotiations, contract discussions, and learn persuasive language for professional settings.",
    topic: "Business English",
    level: "B1",
    date: "Wed 22",
    time: "7:00 PM EST",
    duration: 60,
    instructor: "Mark Thompson",
    maxParticipants: 12,
    currentParticipants: 6,
  },
  {
    id: "3",
    title: "Travel Tales",
    description: "Share your travel experiences and learn vocabulary for booking, transportation, and cultural encounters.",
    topic: "Travel & Tourism",
    level: "A2",
    date: "Thu 23",
    time: "5:00 PM EST",
    duration: 45,
    instructor: "Ana Martinez",
    maxParticipants: 10,
    currentParticipants: 10,
  },
  {
    id: "4",
    title: "Casual Friday Chat",
    description: "Relaxed conversation practice on any topic. Perfect for building confidence in casual settings.",
    topic: "Everyday Conversations",
    level: "A1",
    date: "Fri 24",
    time: "4:00 PM EST",
    duration: 45,
    instructor: "David Lee",
    maxParticipants: 8,
    currentParticipants: 3,
  },
  {
    id: "5",
    title: "Healthcare Vocabulary Intensive",
    description: "Medical terminology, patient communication, and healthcare industry conversations.",
    topic: "Healthcare",
    level: "B1",
    date: "Sat 25",
    time: "10:00 AM EST",
    duration: 60,
    instructor: "Dr. Rachel Kim",
    maxParticipants: 10,
    currentParticipants: 5,
  },
];

const pastLabs: LabCardProps[] = [
  {
    id: "p1",
    title: "Monday Motivation",
    description: "Start the week with positive energy and goal-setting vocabulary.",
    topic: "Everyday Conversations",
    level: "A2",
    date: "Mon 13",
    time: "6:00 PM EST",
    duration: 45,
    instructor: "Ana Martinez",
    maxParticipants: 12,
    currentParticipants: 12,
    isPast: true,
    isBooked: true,
    attended: true,
  },
  {
    id: "p2",
    title: "Finance Fundamentals",
    description: "Investment vocabulary and discussing market trends.",
    topic: "Finance",
    level: "B2",
    date: "Tue 14",
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

const topicOptions = [
  "All Topics",
  "Technology",
  "Business English",
  "Travel & Tourism",
  "Everyday Conversations",
  "Healthcare",
  "Finance",
];

export function ConversationLabs() {
  const [activeTab, setActiveTab] = useState("upcoming");
  const [levelFilter, setLevelFilter] = useState<string>("all");
  const [topicFilter, setTopicFilter] = useState<string>("all");

  const filteredUpcoming = mockLabs.filter((lab) => {
    const matchesLevel = levelFilter === "all" || lab.level === levelFilter;
    const matchesTopic = topicFilter === "all" || lab.topic.toLowerCase().includes(topicFilter.toLowerCase());
    return matchesLevel && matchesTopic;
  });

  const bookedLabs = mockLabs.filter((lab) => lab.isBooked);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-display uppercase mb-2">Conversation Labs</h1>
        <p className="font-mono text-muted-foreground">
          Practice speaking English with peers at your level
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
              <p className="text-xs font-mono text-muted-foreground">Upcoming Booked</p>
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
              <p className="text-xs font-mono text-muted-foreground">Labs Attended</p>
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
              <p className="text-xs font-mono text-muted-foreground">Speaking Time</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Tabs and Filters */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="bg-muted">
            <TabsTrigger value="upcoming" className="font-mono" data-testid="tab-upcoming">Upcoming</TabsTrigger>
            <TabsTrigger value="booked" className="font-mono" data-testid="tab-booked">My Bookings</TabsTrigger>
            <TabsTrigger value="past" className="font-mono" data-testid="tab-past">Past Labs</TabsTrigger>
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
                {topicOptions.map((topic) => (
                  <SelectItem key={topic} value={topic === "All Topics" ? "all" : topic}>{topic}</SelectItem>
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
              <p className="font-mono text-muted-foreground">No labs matching your filters</p>
            </div>
          )
        )}

        {activeTab === "booked" && (
          bookedLabs.length > 0 ? (
            bookedLabs.map((lab) => <LabCard key={lab.id} {...lab} />)
          ) : (
            <div className="text-center py-16">
              <CalendarIcon className="w-12 h-12 text-muted-foreground/30 mx-auto mb-4" />
              <p className="font-mono text-muted-foreground mb-4">You haven't booked any labs yet</p>
              <Button onClick={() => setActiveTab("upcoming")} className="font-mono">
                Browse Available Labs
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
              <p className="font-mono text-muted-foreground">No past labs to show</p>
            </div>
          )
        )}
      </div>
    </div>
  );
}
