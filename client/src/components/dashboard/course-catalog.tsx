import { useState } from "react";
import { Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
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
  GraduationCap,
  Loader2,
  Unlock,
  Award
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { courseLevels, type Course } from "@shared/schema";
import { useAuth } from "@/hooks/use-auth";

// English labels for course topics
const courseTopics: Record<string, string> = {
  "Business English": "Business English",
  "Travel & Tourism": "Travel & Tourism",
  "Technology": "Technology",
  "Culture & Arts": "Culture & Arts",
  "Healthcare": "Healthcare",
  "Finance": "Finance",
  "Academic English": "Academic English",
  "Everyday Conversations": "Everyday Conversations",
};

const getTopicLabel = (topic: string) => courseTopics[topic] || topic;

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
            FREE
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
            <span>{lessonsCount} lessons</span>
          </div>
        </div>

        {/* Progress or CTA */}
        {isEnrolled && progress ? (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs font-mono">
              <span className="text-muted-foreground">Progress</span>
              <span className="text-primary">{progress}%</span>
            </div>
            <Progress value={progress} className="h-1" />
            <Link href={`/dashboard/courses/${id}`}>
              <Button className="w-full mt-3 font-mono uppercase tracking-wider" data-testid={`button-continue-${id}`}>
                Continue
              </Button>
            </Link>
          </div>
        ) : (
          <Link href={`/dashboard/courses/${id}`}>
            <Button
              className="w-full font-mono uppercase tracking-wider"
              variant="default"
              data-testid={isEnrolled ? `button-continue-${id}` : `button-start-${id}`}
            >
              {isEnrolled ? "Continue" : isFree ? "Start Free" : "Start"}
            </Button>
          </Link>
        )}
      </div>
    </Card>
  );
}

// Mock data - topics use English keys for filtering, displayed with getTopicLabel()
const mockCourses: CourseCardProps[] = [
  {
    id: "1",
    title: "Business English: Meetings & Presentations",
    description: "Master the vocabulary and phrases needed for effective meetings and presentations.",
    level: "B1",
    topic: "Business English",
    duration: 180,
    lessonsCount: 12,
    progress: 65,
    isEnrolled: true,
  },
  {
    id: "2",
    title: "Everyday Conversations: At the Office",
    description: "Learn casual English for daily interactions with colleagues and clients.",
    level: "A2",
    topic: "Everyday Conversations",
    duration: 120,
    lessonsCount: 8,
    progress: 40,
    isEnrolled: true,
  },
  {
    id: "3",
    title: "Essential Grammar: Past Tenses",
    description: "Dive deep into the simple past, past continuous, and past perfect.",
    level: "B1",
    topic: "Academic English",
    duration: 90,
    lessonsCount: 6,
    progress: 20,
    isEnrolled: true,
  },
  {
    id: "4",
    title: "Introduction to English",
    description: "Start your English journey with basic vocabulary and essential phrases.",
    level: "A1",
    topic: "Everyday Conversations",
    duration: 60,
    lessonsCount: 5,
    isFree: true,
  },
  {
    id: "5",
    title: "English for Travel: Airport & Hotel",
    description: "Essential English for travelers - from booking to check-out.",
    level: "A2",
    topic: "Travel & Tourism",
    duration: 90,
    lessonsCount: 6,
  },
  {
    id: "6",
    title: "Tech Industry Vocabulary",
    description: "Master the language of technology, startups, and software development.",
    level: "B2",
    topic: "Technology",
    duration: 150,
    lessonsCount: 10,
  },
  {
    id: "7",
    title: "Advanced Business Negotiations",
    description: "High-level strategies and language for complex negotiations.",
    level: "C1",
    topic: "Business English",
    duration: 200,
    lessonsCount: 14,
  },
  {
    id: "8",
    title: "Medical English Fundamentals",
    description: "Essential vocabulary for healthcare professionals and patients.",
    level: "B1",
    topic: "Healthcare",
    duration: 120,
    lessonsCount: 8,
  },
];

const levelOrder = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'];

const getLevelLabel = (level: string) => {
  const labels: Record<string, string> = {
    A1: "Beginner",
    A2: "Elementary",
    B1: "Intermediate",
    B2: "Upper Intermediate",
    C1: "Advanced",
    C2: "Mastery",
  };
  return labels[level] || level;
};

export function CourseCatalog() {
  const { user } = useAuth();
  const [searchQuery, setSearchQuery] = useState("");
  const [levelFilter, setLevelFilter] = useState<string>("all");
  const [topicFilter, setTopicFilter] = useState<string>("all");
  const [activeTab, setActiveTab] = useState("all");

  const { data: courses = [], isLoading } = useQuery<Course[]>({
    queryKey: ['/api/courses'],
  });

  // Fetch user enrollments with progress
  const { data: enrollments = [] } = useQuery<Array<{ courseId: string; progress: number }>>({
    queryKey: ['/api/enrollments/with-progress'],
    enabled: !!user, // Only fetch if user is logged in
  });

  // Create a map of courseId -> enrollment data for quick lookup
  const enrollmentMap = new Map(
    enrollments.map(e => [e.courseId, e])
  );

  // Get user's level and unlocked levels
  const userLevel = user?.placementLevel || user?.englishLevel || 'A1';
  const userLevelIndex = levelOrder.indexOf(userLevel);
  const unlockedLevels = levelOrder.slice(0, userLevelIndex + 1);

  // Map API courses to the card format with real progress data
  const coursesWithCardData: CourseCardProps[] = courses.map((course) => {
    const enrollment = enrollmentMap.get(course.id);
    return {
      id: course.id,
      title: course.title,
      description: course.description || "",
      level: course.level,
      topic: course.topic,
      duration: parseInt(course.duration || "0") || 0,
      lessonsCount: course.lessonsCount || 0,
      progress: enrollment?.progress || 0, // Real progress from enrollment
      isEnrolled: !!enrollment, // User is enrolled if enrollment exists
      isFree: course.isFree === true,
    };
  });

  const filteredCourses = coursesWithCardData.filter((course) => {
    const matchesSearch = course.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      course.description.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesLevel = levelFilter === "all" || course.level === levelFilter;
    const matchesTopic = topicFilter === "all" || course.topic === topicFilter;
    const matchesTab = activeTab === "all" || 
      (activeTab === "enrolled" && course.isEnrolled) ||
      (activeTab === "completed" && course.progress === 100);
    
    return matchesSearch && matchesLevel && matchesTopic && matchesTab;
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-display uppercase mb-2">My Courses</h1>
        <p className="font-mono text-muted-foreground">
          Explore and continue your learning journey
        </p>
      </div>

      {/* Level unlocking info */}
      {user && (
        <div className="p-4 bg-primary/10 border border-primary/20 flex flex-col sm:flex-row sm:items-center gap-3" data-testid="level-unlock-banner">
          <div className="flex items-center gap-2">
            <Award className="w-5 h-5 text-primary" />
            <span className="font-mono text-sm" data-testid="text-user-level">
              <strong className="text-primary">{userLevel}</strong> - {getLevelLabel(userLevel)}
            </span>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <Unlock className="w-4 h-4 text-muted-foreground" />
            <span className="font-mono text-xs text-muted-foreground" data-testid="text-unlocked-levels-label">Unlocked levels:</span>
            {unlockedLevels.map((level) => (
              <Badge key={level} variant={level === userLevel ? "default" : "secondary"} className="text-xs" data-testid={`badge-level-${level}`}>
                {level}
              </Badge>
            ))}
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-col md:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search courses..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 font-mono"
            data-testid="input-search-courses"
          />
        </div>
        <div className="flex gap-2">
          <Select value={levelFilter} onValueChange={setLevelFilter}>
            <SelectTrigger className="w-32 font-mono" data-testid="select-level-filter">
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
            <SelectTrigger className="w-40 font-mono" data-testid="select-topic-filter">
              <SelectValue placeholder="Topic" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Topics</SelectItem>
              {Object.entries(courseTopics).map(([value, label]) => (
                <SelectItem key={value} value={value}>{label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="bg-muted">
          <TabsTrigger value="all" className="font-mono" data-testid="tab-all-courses">All Courses</TabsTrigger>
          <TabsTrigger value="enrolled" className="font-mono" data-testid="tab-enrolled">In Progress</TabsTrigger>
          <TabsTrigger value="completed" className="font-mono" data-testid="tab-completed">Completed</TabsTrigger>
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
          <p className="font-mono text-muted-foreground">No courses found matching these criteria</p>
          <Button 
            variant="outline" 
            className="mt-4 font-mono"
            onClick={() => {
              setSearchQuery("");
              setLevelFilter("all");
              setTopicFilter("all");
            }}
          >
            Clear Filters
          </Button>
        </div>
      )}
    </div>
  );
}
