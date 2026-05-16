/**
 * Exam result page — shown after the student submits the exam.
 *
 * Route: /dashboard/exam/:level/result/:attemptId
 *
 * Renders the score breakdown + the Certificate of Achievement card if
 * the student passed. The certificate is a printable HTML element so
 * the student can press Cmd/Ctrl+P → Save as PDF. A "Share on LinkedIn"
 * button uses LinkedIn's Add-To-Profile flow with the public
 * /verify/{code} URL as the certificate URL.
 */

import { useParams, useLocation, Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Award, ArrowLeft, Printer, Linkedin, BookOpen, Trophy, BadgeCheck, XCircle, Loader2 } from "lucide-react";

interface Attempt {
  id: string;
  examId: string;
  status: string;
  quizScore: string | null;
  writingScore: string | null;
  speakingScore: string | null;
  finalScore: string | null;
  passed: boolean | null;
  completedAt: string | null;
}

interface Certificate {
  id: string;
  level: string;
  studentName: string;
  finalScore: string;
  verificationCode: string;
  signatureName: string;
  issuedAt: string;
}

export default function ExamResultPage() {
  const { level, attemptId } = useParams<{ level: string; attemptId: string }>();
  const [, navigate] = useLocation();

  const { data: attempt, isLoading } = useQuery<Attempt>({
    queryKey: [`/api/final-exam-attempts/${attemptId}`],
  });
  const { data: myCerts = [] } = useQuery<Certificate[]>({
    queryKey: ["/api/certificates/mine"],
  });

  const cert = myCerts.find((c) => c.examAttemptId === attemptId) as any;
  // The schema returns examAttemptId; the query helper may snake-case.
  // Try both shapes.
  const certificate: Certificate | undefined =
    (cert as any) ||
    (myCerts as any[]).find((c) => c.exam_attempt_id === attemptId);

  if (isLoading || !attempt) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  const final = Number(attempt.finalScore || 0);
  const passed = !!attempt.passed;

  return (
    <div className="max-w-3xl mx-auto p-4 space-y-6" data-testid="page-exam-result">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" onClick={() => navigate("/dashboard/exams")}>
          <ArrowLeft className="w-4 h-4 mr-1" /> Exams
        </Button>
        <h1 className="text-xl font-bold">{level} Mastery Exam — Result</h1>
      </div>

      {/* Score breakdown */}
      <Card className="p-6 text-center space-y-3">
        {passed ? <Trophy className="w-12 h-12 mx-auto text-amber-500" /> : <XCircle className="w-12 h-12 mx-auto text-muted-foreground" />}
        <div>
          <p className="text-xs uppercase tracking-widest text-muted-foreground mb-1">Final score</p>
          <div className="flex items-baseline justify-center gap-2">
            <span className="text-6xl font-bold tabular-nums">{Math.round(final)}</span>
            <span className="text-2xl text-muted-foreground">/100</span>
          </div>
        </div>
        <Badge className={passed ? "bg-emerald-500 text-white text-sm" : "bg-slate-400 text-white text-sm"}>
          {passed ? "PASSED · Certificate issued" : "Not passed — review feedback"}
        </Badge>
      </Card>

      <div className="grid sm:grid-cols-3 gap-3">
        <Card className="p-4 text-center">
          <p className="text-[10px] uppercase tracking-widest text-muted-foreground mb-1">Quiz · 40%</p>
          <p className="text-2xl font-bold">{Math.round(Number(attempt.quizScore || 0))}</p>
        </Card>
        <Card className="p-4 text-center">
          <p className="text-[10px] uppercase tracking-widest text-muted-foreground mb-1">Writing · 30%</p>
          <p className="text-2xl font-bold">{Math.round(Number(attempt.writingScore || 0))}</p>
        </Card>
        <Card className="p-4 text-center">
          <p className="text-[10px] uppercase tracking-widest text-muted-foreground mb-1">Speaking · 30%</p>
          <p className="text-2xl font-bold">{Math.round(Number(attempt.speakingScore || 0))}</p>
        </Card>
      </div>

      {/* Certificate */}
      {passed && certificate && (
        <>
          <div className="flex items-center justify-end gap-2 print:hidden">
            <Button variant="outline" onClick={() => window.print()}>
              <Printer className="w-4 h-4 mr-2" /> Print / Save as PDF
            </Button>
            <Button asChild>
              <a
                href={`https://www.linkedin.com/profile/add?startTask=CERTIFICATION_NAME&name=${encodeURIComponent(`CogniBoost ${certificate.level} Completion Certificate`)}&organizationName=${encodeURIComponent("CogniBoost ESL Academy")}&issueYear=${new Date(certificate.issuedAt).getFullYear()}&issueMonth=${new Date(certificate.issuedAt).getMonth() + 1}&certUrl=${encodeURIComponent(`${window.location.origin}/verify/${certificate.verificationCode}`)}&certId=${certificate.verificationCode}`}
                target="_blank"
                rel="noopener noreferrer"
              >
                <Linkedin className="w-4 h-4 mr-2" /> Share on LinkedIn
              </a>
            </Button>
          </div>

          <Card className="p-10 sm:p-12 border-4 border-double border-primary/30 bg-gradient-to-br from-white via-amber-50/30 to-white print:border-primary/60">
            <div className="text-center space-y-5">
              <div className="flex items-center justify-center gap-2">
                <BadgeCheck className="w-8 h-8 text-primary" />
                <span className="font-display uppercase tracking-widest text-sm font-bold text-primary">
                  COGNIBOOST · CERTIFICATE OF ACHIEVEMENT
                </span>
              </div>

              <p className="text-xs uppercase tracking-widest text-muted-foreground">This certifies that</p>
              <h2 className="text-3xl sm:text-4xl font-display font-bold text-foreground">{certificate.studentName}</h2>

              <p className="text-sm sm:text-base text-foreground/80 max-w-lg mx-auto leading-relaxed">
                has successfully passed the <strong>{certificate.level} Mastery Exam</strong>,
                demonstrating proficiency at the <strong>{cefrLabel(certificate.level)}</strong> level,
                aligned with CEFR descriptors.
              </p>

              <div className="flex items-center justify-center gap-2 my-2">
                <span className="text-3xl font-bold">{Math.round(Number(certificate.finalScore))}/100</span>
                <Award className="w-6 h-6 text-amber-500" />
              </div>

              <div className="pt-4 grid grid-cols-2 gap-4 text-left max-w-md mx-auto">
                <div>
                  <p className="text-[10px] uppercase tracking-widest text-muted-foreground mb-1">Issued</p>
                  <p className="text-sm font-mono">{new Date(certificate.issuedAt).toLocaleDateString("en-US", { day: "numeric", month: "long", year: "numeric" })}</p>
                </div>
                <div>
                  <p className="text-[10px] uppercase tracking-widest text-muted-foreground mb-1">Verification code</p>
                  <p className="text-sm font-mono select-all">{certificate.verificationCode}</p>
                </div>
              </div>

              <div className="pt-6">
                <p className="font-display italic text-2xl text-primary">{certificate.signatureName}</p>
                <p className="text-[10px] uppercase tracking-widest text-muted-foreground mt-1">Academic Director</p>
              </div>

              <div className="pt-4 text-[10px] text-muted-foreground">
                Verify authenticity at <span className="font-mono">{`${window.location.origin.replace(/^https?:\/\//, "")}/verify/${certificate.verificationCode}`}</span>
              </div>
            </div>
          </Card>
        </>
      )}

      {!passed && (
        <Card className="p-6 space-y-3">
          <h3 className="text-lg font-bold">Keep going — you're close!</h3>
          <p className="text-sm text-muted-foreground">
            You scored {Math.round(final)}/100. To earn the certificate you need a 70 or higher.
            Review the lessons you found tricky and try again when you feel ready.
          </p>
          <div className="flex gap-2 flex-wrap">
            <Button asChild variant="outline">
              <Link href={`/dashboard/courses`}><BookOpen className="w-4 h-4 mr-2" /> Review lessons</Link>
            </Button>
            <Button asChild>
              <Link href={`/dashboard/exam/${level}`}>Retake exam</Link>
            </Button>
          </div>
        </Card>
      )}
    </div>
  );
}

function cefrLabel(level: string): string {
  return {
    A1: "Beginner (A1)",
    A2: "Elementary (A2)",
    B1: "Intermediate (B1)",
    B2: "Upper Intermediate (B2)",
    C1: "Advanced (C1)",
  }[level] || level;
}
