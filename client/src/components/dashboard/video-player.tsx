import { useState, useRef, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { 
  Play, 
  Pause, 
  Volume2, 
  VolumeX, 
  Maximize,
  SkipBack,
  SkipForward,
  Settings,
  Subtitles,
  ChevronLeft,
  CheckCircle2,
  Lock
} from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { Link } from "wouter";

interface Lesson {
  id: string;
  title: string;
  duration: number;
  isCompleted: boolean;
  isLocked: boolean;
}

interface VideoPlayerProps {
  courseId: string;
  lessonId: string;
}

// Mock lesson data
const mockLessons: Lesson[] = [
  { id: "1", title: "Introduction to Business Meetings", duration: 8, isCompleted: true, isLocked: false },
  { id: "2", title: "Common Meeting Phrases", duration: 12, isCompleted: true, isLocked: false },
  { id: "3", title: "Leading a Meeting", duration: 15, isCompleted: false, isLocked: false },
  { id: "4", title: "Handling Disagreements", duration: 10, isCompleted: false, isLocked: false },
  { id: "5", title: "Wrapping Up Meetings", duration: 8, isCompleted: false, isLocked: true },
  { id: "6", title: "Practice Exercise", duration: 20, isCompleted: false, isLocked: true },
];

export function VideoPlayer({ courseId, lessonId }: VideoPlayerProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [progress, setProgress] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [playbackSpeed, setPlaybackSpeed] = useState("1");
  const [showSubtitles, setShowSubtitles] = useState(true);
  const [subtitleLanguage, setSubtitleLanguage] = useState("en");

  const currentLesson = mockLessons.find(l => l.id === lessonId) || mockLessons[2];
  const currentIndex = mockLessons.findIndex(l => l.id === lessonId);
  const prevLesson = currentIndex > 0 ? mockLessons[currentIndex - 1] : null;
  const nextLesson = currentIndex < mockLessons.length - 1 ? mockLessons[currentIndex + 1] : null;

  // Format time as mm:ss
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Simulate video progress
  useEffect(() => {
    if (isPlaying) {
      const interval = setInterval(() => {
        setCurrentTime(prev => {
          const newTime = prev + 1;
          const totalDuration = currentLesson.duration * 60;
          if (newTime >= totalDuration) {
            setIsPlaying(false);
            return totalDuration;
          }
          setProgress((newTime / totalDuration) * 100);
          return newTime;
        });
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [isPlaying, currentLesson.duration]);

  return (
    <div className="space-y-6">
      {/* Back button */}
      <Link href="/dashboard/courses">
        <Button variant="ghost" className="font-mono gap-2" data-testid="button-back-to-courses">
          <ChevronLeft className="w-4 h-4" />
          Back to Courses
        </Button>
      </Link>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Video player section */}
        <div className="lg:col-span-2 space-y-4">
          {/* Video container */}
          <div className="relative bg-foreground aspect-video group">
            {/* Video placeholder */}
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="text-center text-background/60">
                <Play className="w-16 h-16 mx-auto mb-4" />
                <p className="font-mono text-sm">Video Player</p>
              </div>
            </div>

            {/* Subtitles */}
            {showSubtitles && (
              <div className="absolute bottom-20 left-1/2 -translate-x-1/2 bg-foreground/80 px-4 py-2 max-w-lg text-center">
                <p className="text-background font-mono text-sm">
                  "Welcome to lesson three. Today we'll learn how to lead effective meetings."
                </p>
              </div>
            )}

            {/* Controls overlay */}
            <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-foreground/90 to-transparent p-4 opacity-0 group-hover:opacity-100 transition-opacity">
              {/* Progress bar */}
              <div className="mb-4">
                <Slider
                  value={[progress]}
                  max={100}
                  step={0.1}
                  onValueChange={([value]) => {
                    setProgress(value);
                    setCurrentTime((value / 100) * currentLesson.duration * 60);
                  }}
                  className="cursor-pointer"
                  data-testid="slider-progress"
                />
              </div>

              {/* Control buttons */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="text-background hover:bg-background/20"
                    onClick={() => setCurrentTime(Math.max(0, currentTime - 10))}
                    data-testid="button-skip-back"
                  >
                    <SkipBack className="w-5 h-5" />
                  </Button>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="text-background hover:bg-background/20 w-12 h-12"
                    onClick={() => setIsPlaying(!isPlaying)}
                    data-testid="button-play-pause"
                  >
                    {isPlaying ? <Pause className="w-6 h-6" /> : <Play className="w-6 h-6" />}
                  </Button>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="text-background hover:bg-background/20"
                    onClick={() => setCurrentTime(Math.min(currentLesson.duration * 60, currentTime + 10))}
                    data-testid="button-skip-forward"
                  >
                    <SkipForward className="w-5 h-5" />
                  </Button>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="text-background hover:bg-background/20"
                    onClick={() => setIsMuted(!isMuted)}
                    data-testid="button-mute"
                  >
                    {isMuted ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
                  </Button>
                  <span className="text-background font-mono text-sm">
                    {formatTime(currentTime)} / {formatTime(currentLesson.duration * 60)}
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  {/* Playback speed */}
                  <Select value={playbackSpeed} onValueChange={setPlaybackSpeed}>
                    <SelectTrigger className="w-20 h-8 bg-transparent border-background/30 text-background font-mono text-xs" data-testid="select-speed">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="0.5">0.5x</SelectItem>
                      <SelectItem value="0.75">0.75x</SelectItem>
                      <SelectItem value="1">1x</SelectItem>
                      <SelectItem value="1.25">1.25x</SelectItem>
                      <SelectItem value="1.5">1.5x</SelectItem>
                      <SelectItem value="2">2x</SelectItem>
                    </SelectContent>
                  </Select>

                  {/* Subtitles */}
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className={`text-background hover:bg-background/20 ${showSubtitles ? "bg-background/20" : ""}`}
                    onClick={() => setShowSubtitles(!showSubtitles)}
                    data-testid="button-subtitles"
                  >
                    <Subtitles className="w-5 h-5" />
                  </Button>

                  {/* Fullscreen */}
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="text-background hover:bg-background/20"
                    data-testid="button-fullscreen"
                  >
                    <Maximize className="w-5 h-5" />
                  </Button>
                </div>
              </div>
            </div>
          </div>

          {/* Lesson info */}
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="px-2 py-1 bg-primary/10 text-primary text-xs font-mono">B1</span>
              <span className="px-2 py-1 bg-muted text-xs font-mono">Lesson {currentIndex + 1} of {mockLessons.length}</span>
            </div>
            <h1 className="text-2xl font-display uppercase mb-2">{currentLesson.title}</h1>
            <p className="font-mono text-muted-foreground">
              Learn the essential phrases and strategies for leading productive business meetings. 
              This lesson covers opening statements, agenda setting, and keeping discussions on track.
            </p>
          </div>

          {/* Navigation */}
          <div className="flex justify-between pt-4 border-t border-border">
            {prevLesson ? (
              <Button variant="outline" className="font-mono gap-2" data-testid="button-prev-lesson">
                <ChevronLeft className="w-4 h-4" />
                Previous: {prevLesson.title}
              </Button>
            ) : (
              <div />
            )}
            {nextLesson && !nextLesson.isLocked ? (
              <Button className="font-mono gap-2 bg-primary" data-testid="button-next-lesson">
                Next: {nextLesson.title}
                <ChevronLeft className="w-4 h-4 rotate-180" />
              </Button>
            ) : nextLesson?.isLocked ? (
              <Button variant="outline" disabled className="font-mono gap-2">
                <Lock className="w-4 h-4" />
                Complete this lesson first
              </Button>
            ) : (
              <Button className="font-mono gap-2 bg-accent text-accent-foreground" data-testid="button-complete-course">
                Complete Course
              </Button>
            )}
          </div>
        </div>

        {/* Sidebar - Course content */}
        <div>
          <Card className="p-4 border-border">
            <h3 className="font-display uppercase text-lg mb-4">Course Content</h3>
            <div className="space-y-2">
              {mockLessons.map((lesson, index) => (
                <div 
                  key={lesson.id}
                  className={`p-3 border ${lesson.id === lessonId ? "border-primary bg-primary/5" : "border-border"} ${lesson.isLocked ? "opacity-50" : "hover-elevate cursor-pointer"}`}
                >
                  <div className="flex items-start gap-3">
                    <div className={`w-6 h-6 flex items-center justify-center flex-shrink-0 ${lesson.isCompleted ? "bg-primary text-primary-foreground" : lesson.isLocked ? "bg-muted text-muted-foreground" : "border border-border"}`}>
                      {lesson.isCompleted ? (
                        <CheckCircle2 className="w-4 h-4" />
                      ) : lesson.isLocked ? (
                        <Lock className="w-3 h-3" />
                      ) : (
                        <span className="text-xs font-mono">{index + 1}</span>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className={`font-mono text-sm truncate ${lesson.id === lessonId ? "text-primary font-medium" : ""}`}>
                        {lesson.title}
                      </p>
                      <p className="text-xs font-mono text-muted-foreground">
                        {lesson.duration} min
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Course progress */}
            <div className="mt-6 pt-4 border-t border-border">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-mono text-muted-foreground">Course Progress</span>
                <span className="text-xs font-mono text-primary">33%</span>
              </div>
              <Progress value={33} className="h-1" />
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
