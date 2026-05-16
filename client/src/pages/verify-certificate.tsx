/**
 * Public certificate verification page.
 *
 * Route: /verify/:code   (registered outside the dashboard auth wall)
 *
 * Used by employers / LinkedIn viewers to confirm that a CogniBoost
 * certificate is authentic. No login required.
 */

import { useParams, Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { BadgeCheck, XCircle, AlertTriangle, ExternalLink, Loader2, GraduationCap } from "lucide-react";

interface VerifyResponse {
  valid: boolean;
  revoked?: boolean;
  reason?: string;
  level?: string;
  studentName?: string;
  finalScore?: string;
  issuedAt?: string;
  signatureName?: string;
  verificationCode?: string;
}

export default function VerifyCertificatePage() {
  const { code } = useParams<{ code: string }>();
  const { data, isLoading, error } = useQuery<VerifyResponse>({
    queryKey: [`/api/verify/${code}`],
    retry: false,
  });

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center p-4">
      <div className="w-full max-w-xl space-y-4">
        <Link href="/" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
          <GraduationCap className="w-4 h-4" />
          <span className="font-display uppercase tracking-widest">COGNIBOOST</span>
        </Link>

        {isLoading ? (
          <Card className="p-8 text-center">
            <Loader2 className="w-8 h-8 mx-auto animate-spin text-primary" />
            <p className="text-sm text-muted-foreground mt-3">Verifying certificate…</p>
          </Card>
        ) : error || !data?.valid ? (
          <Card className="p-8 text-center space-y-3 border-red-200 bg-red-50/30">
            {data?.revoked ? (
              <>
                <AlertTriangle className="w-12 h-12 mx-auto text-amber-500" />
                <h2 className="text-xl font-bold">Certificate revoked</h2>
                <p className="text-sm text-muted-foreground">{data?.reason || "This certificate has been revoked."}</p>
              </>
            ) : (
              <>
                <XCircle className="w-12 h-12 mx-auto text-red-500" />
                <h2 className="text-xl font-bold">Certificate not found</h2>
                <p className="text-sm text-muted-foreground">
                  The verification code <span className="font-mono">{code}</span> doesn't match any certificate
                  issued by CogniBoost. Double-check the code or contact the holder.
                </p>
              </>
            )}
          </Card>
        ) : (
          <Card className="p-8 sm:p-10 space-y-4 border-emerald-200">
            <div className="flex items-center gap-2 text-emerald-700">
              <BadgeCheck className="w-7 h-7" />
              <span className="font-bold uppercase tracking-widest text-sm">Verified · Authentic</span>
            </div>

            <div className="text-center pt-2">
              <p className="text-xs uppercase tracking-widest text-muted-foreground mb-1">Issued to</p>
              <h2 className="text-3xl font-display font-bold mb-3">{data.studentName}</h2>
              <p className="text-sm text-foreground/80 leading-relaxed">
                Passed the <strong>{data.level} Mastery Exam</strong> at CogniBoost ESL Academy,
                aligned with CEFR descriptors.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3 pt-2">
              <div className="p-3 rounded-lg bg-muted/40 text-center">
                <p className="text-[10px] uppercase tracking-widest text-muted-foreground">Score</p>
                <p className="text-xl font-bold">{Math.round(Number(data.finalScore || 0))}/100</p>
              </div>
              <div className="p-3 rounded-lg bg-muted/40 text-center">
                <p className="text-[10px] uppercase tracking-widest text-muted-foreground">Level</p>
                <p className="text-xl font-bold">{data.level}</p>
              </div>
            </div>

            <div className="text-xs text-muted-foreground space-y-1 pt-2 border-t">
              <p><strong>Issued:</strong> {data.issuedAt ? new Date(data.issuedAt).toLocaleDateString("en-US", { day: "numeric", month: "long", year: "numeric" }) : "—"}</p>
              <p><strong>Signed by:</strong> {data.signatureName}</p>
              <p><strong>Verification code:</strong> <span className="font-mono">{data.verificationCode}</span></p>
            </div>

            <Button asChild variant="outline" className="w-full">
              <a href="https://cogniboost.co" target="_blank" rel="noopener noreferrer">
                Visit CogniBoost <ExternalLink className="w-4 h-4 ml-2" />
              </a>
            </Button>
          </Card>
        )}

        <p className="text-center text-[10px] text-muted-foreground">
          CogniBoost ESL Academy · cogniboost.co
        </p>
      </div>
    </div>
  );
}
