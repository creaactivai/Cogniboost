/**
 * Speaking-assignment page — student-facing audio/video recorder.
 *
 * Mirrors the writing-assignment.tsx pattern but for speaking submissions:
 *   1. Student opens /dashboard/speaking/:moduleId
 *   2. We fetch the speaking project (prompt + target vocab/grammar/expressions)
 *   3. Student records with MediaRecorder (audio or video, their choice)
 *   4. Optional preview before submit (replay their own recording)
 *   5. On submit, multipart POST → backend uploads to GCS + grades async
 *   6. Redirect to /dashboard/speaking-submissions/:id (poller)
 */

import { useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useParams } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { RubricSummary } from "@/components/rubric-summary";

interface SpeakingProject {
  id: string;
  moduleId: string;
  level: "A1" | "A2" | "B1" | "B2" | "C1" | "C2";
  title: string;
  prompt: string;
  targetVocabulary: string[];
  targetGrammar: string[];
  targetExpressions: string[];
  targetDurationSeconds: number;
  isPublished: boolean;
}

type RecorderState = "idle" | "recording" | "paused" | "stopped";

export default function SpeakingAssignmentPage() {
  const params = useParams<{ moduleId: string }>();
  const moduleId = params.moduleId;
  const [, navigate] = useLocation();
  const { toast } = useToast();

  const [withVideo, setWithVideo] = useState(false);
  const [recState, setRecState] = useState<RecorderState>("idle");
  const [elapsed, setElapsed] = useState(0);
  const [recordedBlob, setRecordedBlob] = useState<Blob | null>(null);
  const [recordedUrl, setRecordedUrl] = useState<string | null>(null);
  const [audioLevel, setAudioLevel] = useState(0);
  const [permissionError, setPermissionError] = useState<string | null>(null);

  const streamRef = useRef<MediaStream | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const previewVideoRef = useRef<HTMLVideoElement | null>(null);

  // Fetch the speaking project for this module
  const { data: project, isLoading, isError } = useQuery<SpeakingProject>({
    queryKey: [`/api/speaking-projects/by-module/${moduleId}`],
    enabled: !!moduleId,
  });

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopAllTracks();
      if (timerRef.current) clearInterval(timerRef.current);
      if (audioCtxRef.current) audioCtxRef.current.close().catch(() => {});
      if (recordedUrl) URL.revokeObjectURL(recordedUrl);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function stopAllTracks() {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
  }

  function setupAudioMeter(stream: MediaStream) {
    try {
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const source = ctx.createMediaStreamSource(stream);
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 256;
      source.connect(analyser);
      const data = new Uint8Array(analyser.frequencyBinCount);
      const tick = () => {
        if (recState !== "recording") return;
        analyser.getByteFrequencyData(data);
        let sum = 0;
        for (let i = 0; i < data.length; i++) sum += data[i];
        setAudioLevel(Math.min(1, sum / data.length / 80));
        requestAnimationFrame(tick);
      };
      audioCtxRef.current = ctx;
      analyserRef.current = analyser;
      tick();
    } catch (err) {
      console.warn("Audio meter setup failed:", err);
    }
  }

  async function startRecording() {
    setPermissionError(null);
    setRecordedBlob(null);
    if (recordedUrl) URL.revokeObjectURL(recordedUrl);
    setRecordedUrl(null);
    chunksRef.current = [];

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: true,
        video: withVideo ? { facingMode: "user" } : false,
      });
      streamRef.current = stream;

      // Live preview if video
      if (withVideo && videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play().catch(() => {});
      }

      // MediaRecorder mime preference: webm/opus is most compatible
      const mimeType = (withVideo ? "video/webm" : "audio/webm");
      const supported = MediaRecorder.isTypeSupported(mimeType)
        ? mimeType
        : "";
      const recorder = new MediaRecorder(stream, supported ? { mimeType: supported } : undefined);
      recorderRef.current = recorder;

      recorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) chunksRef.current.push(e.data);
      };
      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, {
          type: supported || (withVideo ? "video/webm" : "audio/webm"),
        });
        setRecordedBlob(blob);
        setRecordedUrl(URL.createObjectURL(blob));
        stopAllTracks();
      };

      recorder.start();
      setRecState("recording");
      setElapsed(0);
      setupAudioMeter(stream);

      timerRef.current = setInterval(() => {
        setElapsed((e) => e + 1);
      }, 1000);
    } catch (err: any) {
      const msg = err?.message || String(err);
      setPermissionError(
        msg.includes("Permission")
          ? "We need permission to access your microphone (and camera if you chose video). Please allow access and try again."
          : `Could not start recording: ${msg}`
      );
      setRecState("idle");
    }
  }

  function stopRecording() {
    if (recorderRef.current && recorderRef.current.state !== "inactive") {
      recorderRef.current.stop();
    }
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    setRecState("stopped");
    setAudioLevel(0);
  }

  function retake() {
    setRecState("idle");
    setRecordedBlob(null);
    if (recordedUrl) URL.revokeObjectURL(recordedUrl);
    setRecordedUrl(null);
    setElapsed(0);
  }

  // Submission mutation
  const submitMutation = useMutation({
    mutationFn: async () => {
      if (!recordedBlob || !project) throw new Error("No recording to submit");
      const ext = withVideo ? "webm" : "webm";
      const filename = `speaking-${project.id}-${Date.now()}.${ext}`;
      const file = new File([recordedBlob], filename, { type: recordedBlob.type });

      const formData = new FormData();
      formData.append("recording", file);
      formData.append("speakingProjectId", project.id);
      formData.append("moduleId", project.moduleId);
      formData.append("isVideo", String(withVideo));
      formData.append("clientDurationSeconds", String(elapsed));

      const res = await fetch("/api/speaking-submissions", {
        method: "POST",
        body: formData,
        credentials: "include",
      });
      if (!res.ok) {
        const errBody = await res.json().catch(() => ({}));
        throw new Error(errBody.error || `Upload failed: ${res.status}`);
      }
      return res.json() as Promise<{ submissionId: string; status: string }>;
    },
    onSuccess: (data) => {
      toast({
        title: "Recording uploaded!",
        description: "Your grade is being prepared. This takes ~1 minute.",
      });
      navigate(`/dashboard/speaking-submissions/${data.submissionId}`);
    },
    onError: (err: any) => {
      toast({
        title: "Upload failed",
        description: err?.message || "Please try again.",
        variant: "destructive",
      });
    },
  });

  const targetDur = project?.targetDurationSeconds ?? 60;
  const minDur = Math.max(15, Math.floor(targetDur * 0.5));
  const tooShort = elapsed < minDur;
  const remaining = Math.max(0, targetDur - elapsed);

  if (isLoading) {
    return <div className="max-w-3xl mx-auto p-6 text-center">Loading speaking project…</div>;
  }
  if (isError || !project) {
    return (
      <div className="max-w-3xl mx-auto p-6">
        <Card className="p-6">
          <h2 className="text-xl font-bold mb-2">No speaking project found</h2>
          <p className="text-muted-foreground">
            This module doesn't have a speaking project yet. Check back soon!
          </p>
          <Button variant="outline" className="mt-4" onClick={() => navigate("/dashboard")}>
            Back to dashboard
          </Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto p-6 space-y-6" data-testid="page-speaking-assignment">
      <div>
        <Badge variant="outline" className="mb-2">{project.level} Speaking Project</Badge>
        <h1 className="text-2xl font-bold">{project.title}</h1>
      </div>

      {/* The prompt */}
      <Card className="p-6 bg-gradient-to-br from-primary/5 to-primary/10 border-primary/20">
        <h3 className="font-semibold mb-2 flex items-center gap-2">
          <span>📝</span> Speaking Prompt
        </h3>
        <p className="text-base leading-relaxed">{project.prompt}</p>
      </Card>

      {/* Rubric summary — students see HOW they'll be graded before they record */}
      <RubricSummary type="speaking" level={project.level} />

      {/* Targets */}
      <div className="grid md:grid-cols-3 gap-4">
        <Card className="p-4">
          <h4 className="font-semibold text-sm mb-2 text-muted-foreground">📚 USE THESE WORDS</h4>
          <div className="flex flex-wrap gap-1">
            {project.targetVocabulary.map((v) => (
              <span key={v} className="text-xs bg-secondary px-2 py-1 rounded">{v}</span>
            ))}
          </div>
        </Card>
        <Card className="p-4">
          <h4 className="font-semibold text-sm mb-2 text-muted-foreground">📝 GRAMMAR FOCUS</h4>
          <ul className="text-xs space-y-1">
            {project.targetGrammar.map((g) => <li key={g}>• {g}</li>)}
          </ul>
        </Card>
        <Card className="p-4">
          <h4 className="font-semibold text-sm mb-2 text-muted-foreground">🗣️ EXPRESSIONS</h4>
          <ul className="text-xs space-y-1">
            {project.targetExpressions.map((e) => <li key={e}>• {e}</li>)}
          </ul>
        </Card>
      </div>

      {/* Recording controls */}
      <Card className="p-6 space-y-4">
        {/* Camera/audio toggle (only when idle) */}
        {recState === "idle" && !recordedBlob && (
          <div className="flex items-center gap-3 mb-2">
            <button
              type="button"
              onClick={() => setWithVideo(false)}
              className={`flex-1 px-4 py-3 rounded-lg border-2 transition ${
                !withVideo ? "border-primary bg-primary/10" : "border-border"
              }`}
              data-testid="toggle-audio-only"
            >
              <div className="text-2xl mb-1">🎙️</div>
              <div className="text-sm font-medium">Audio only</div>
              <div className="text-xs text-muted-foreground">Just your voice</div>
            </button>
            <button
              type="button"
              onClick={() => setWithVideo(true)}
              className={`flex-1 px-4 py-3 rounded-lg border-2 transition ${
                withVideo ? "border-primary bg-primary/10" : "border-border"
              }`}
              data-testid="toggle-with-video"
            >
              <div className="text-2xl mb-1">📹</div>
              <div className="text-sm font-medium">Video</div>
              <div className="text-xs text-muted-foreground">Show your face</div>
            </button>
          </div>
        )}

        {/* Live video preview when recording with video */}
        {withVideo && (recState === "recording" || recState === "paused") && (
          <video
            ref={videoRef}
            muted
            playsInline
            className="w-full max-h-72 rounded-lg bg-black"
            data-testid="video-live-preview"
          />
        )}

        {/* Timer + audio meter */}
        {(recState === "recording" || recState === "stopped") && (
          <div className="text-center">
            <div className="text-4xl font-mono font-bold tabular-nums">
              {formatTime(elapsed)} <span className="text-base text-muted-foreground">/ {formatTime(targetDur)}</span>
            </div>
            {recState === "recording" && (
              <>
                <div className="mt-2 flex items-center justify-center gap-1 h-6">
                  {Array.from({ length: 12 }).map((_, i) => {
                    const active = audioLevel * 12 > i;
                    return (
                      <span
                        key={i}
                        className={`w-2 transition-all ${
                          active ? "h-6 bg-primary" : "h-2 bg-muted"
                        }`}
                      />
                    );
                  })}
                </div>
                <p className="text-sm text-muted-foreground mt-2">
                  🔴 Recording… {remaining > 0 ? `${remaining}s suggested remaining` : "you can stop anytime"}
                </p>
              </>
            )}
          </div>
        )}

        {/* Preview after stop */}
        {recordedBlob && recordedUrl && recState === "stopped" && (
          <div className="space-y-3">
            <h4 className="font-semibold">🎧 Listen back to your recording:</h4>
            {withVideo ? (
              <video
                ref={previewVideoRef}
                src={recordedUrl}
                controls
                className="w-full max-h-72 rounded-lg bg-black"
                data-testid="video-preview-playback"
              />
            ) : (
              <audio
                src={recordedUrl}
                controls
                className="w-full"
                data-testid="audio-preview-playback"
              />
            )}
            {tooShort && (
              <p className="text-sm text-amber-600">
                ⚠️ Your recording is shorter than suggested ({minDur}s minimum for {project.level}). You can still submit, but you'll likely get a low Task Achievement score.
              </p>
            )}
          </div>
        )}

        {/* Permission error */}
        {permissionError && (
          <div className="p-3 bg-destructive/10 border border-destructive/20 rounded text-sm text-destructive">
            {permissionError}
          </div>
        )}

        {/* Control buttons */}
        <div className="flex gap-3 justify-center pt-2">
          {recState === "idle" && !recordedBlob && (
            <Button
              size="lg"
              onClick={startRecording}
              data-testid="button-start-recording"
              className="bg-red-600 hover:bg-red-700"
            >
              🔴 Start Recording
            </Button>
          )}
          {recState === "recording" && (
            <Button
              size="lg"
              variant="outline"
              onClick={stopRecording}
              data-testid="button-stop-recording"
            >
              ⏹️ Stop
            </Button>
          )}
          {recState === "stopped" && recordedBlob && (
            <>
              <Button
                variant="outline"
                onClick={retake}
                disabled={submitMutation.isPending}
                data-testid="button-retake"
              >
                🔄 Retake
              </Button>
              <Button
                size="lg"
                onClick={() => submitMutation.mutate()}
                disabled={submitMutation.isPending}
                data-testid="button-submit-recording"
              >
                {submitMutation.isPending ? "Uploading…" : "✅ Submit Recording"}
              </Button>
            </>
          )}
        </div>
      </Card>

      {/* Help text */}
      <Card className="p-4 bg-muted/50">
        <h4 className="font-semibold text-sm mb-2">💡 Tips for a great recording</h4>
        <ul className="text-sm text-muted-foreground space-y-1">
          <li>• Find a quiet place with good lighting</li>
          <li>• Speak clearly and at a natural pace</li>
          <li>• Try to use the target vocabulary, grammar, and expressions above</li>
          <li>• Aim for the suggested duration — too short hurts your Task Achievement score</li>
          <li>• You can record as many times as you like before submitting</li>
        </ul>
      </Card>
    </div>
  );
}

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}
