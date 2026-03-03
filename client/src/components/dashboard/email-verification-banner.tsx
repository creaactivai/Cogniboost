import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Mail, X, Loader2, CheckCircle } from "lucide-react";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";

export function EmailVerificationBanner() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [dismissed, setDismissed] = useState(false);
  const [emailSent, setEmailSent] = useState(false);

  const resendMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", "/api/auth/resend-verification");
      return response.json();
    },
    onSuccess: (data) => {
      if (data.alreadyVerified) {
        toast({
          title: "Email already verified",
          description: data.message,
        });
        setDismissed(true);
      } else {
        toast({
          title: "Email sent",
          description: "We've sent a new verification link to your email.",
        });
        setEmailSent(true);
      }
    },
    onError: async (error: any) => {
      try {
        const errorData = error.response ? await error.response.json() : { error: error.message };
        toast({
          title: "Error",
          description: errorData.error || "Could not send verification email.",
          variant: "destructive",
        });
      } catch {
        toast({
          title: "Error",
          description: error.message || "Unknown error",
          variant: "destructive",
        });
      }
    },
  });

  if (!user || user.emailVerified || user.addedManually || dismissed) {
    return null;
  }

  return (
    <div className="bg-orange-500/10 border border-orange-500/30 px-4 py-3 flex items-center justify-between gap-4 flex-wrap" data-testid="banner-email-verification">
      <div className="flex items-center gap-3">
        <Mail className="h-5 w-5 text-orange-500 shrink-0" />
        <div>
          <p className="text-sm font-medium text-foreground">
            Verify your email address
          </p>
          <p className="text-xs text-muted-foreground">
            Check your inbox and click the link to verify {user.email}
          </p>
        </div>
      </div>
      <div className="flex items-center gap-2">
        {emailSent ? (
          <div className="flex items-center gap-2 text-sm text-emerald-600">
            <CheckCircle className="h-4 w-4" />
            <span>Email sent</span>
          </div>
        ) : (
          <Button
            variant="outline"
            size="sm"
            onClick={() => resendMutation.mutate()}
            disabled={resendMutation.isPending}
            data-testid="button-resend-verification"
          >
            {resendMutation.isPending ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                Sending...
              </>
            ) : (
              "Resend email"
            )}
          </Button>
        )}
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setDismissed(true)}
          className="h-8 w-8"
          data-testid="button-dismiss-verification-banner"
        >
          <X className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
