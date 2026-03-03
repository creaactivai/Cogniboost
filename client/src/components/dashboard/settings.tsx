import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import {
  User,
  Bell,
  Globe,
  CreditCard,
  Shield,
  Camera,
  Check,
  Loader2
} from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";

export function Settings() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [isManagingSubscription, setIsManagingSubscription] = useState(false);

  const handleManageSubscription = async () => {
    setIsManagingSubscription(true);
    try {
      const response = await fetch("/api/stripe/create-portal-session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
      });
      const data = await response.json();
      if (data.url) {
        window.location.href = data.url;
      } else {
        throw new Error(data.error || "Could not open subscription portal");
      }
    } catch (error: any) {
      console.error("Manage subscription error:", error);
      toast({
        title: "Error",
        description: "Could not open subscription portal. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsManagingSubscription(false);
    }
  };

  const getInitials = () => {
    if (!user) return "U";
    const first = user.firstName?.[0] || "";
    const last = user.lastName?.[0] || "";
    return (first + last).toUpperCase() || user.email?.[0]?.toUpperCase() || "U";
  };

  return (
    <div className="space-y-8 max-w-4xl">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-display uppercase mb-2">Account Settings</h1>
        <p className="font-mono text-muted-foreground">
          Manage your preferences and subscription
        </p>
      </div>

      {/* Profile section */}
      <Card className="p-6 border-border">
        <div className="flex items-center gap-2 mb-6">
          <User className="w-5 h-5 text-primary" />
          <h2 className="text-lg font-display uppercase">Profile</h2>
        </div>

        <div className="flex flex-col md:flex-row gap-8">
          {/* Avatar */}
          <div className="flex flex-col items-center gap-4">
            <div className="relative">
              <Avatar className="w-24 h-24">
                <AvatarImage src={user?.profileImageUrl || undefined} />
                <AvatarFallback className="bg-primary text-primary-foreground text-2xl font-mono">
                  {getInitials()}
                </AvatarFallback>
              </Avatar>
              <Button 
                size="icon" 
                variant="secondary" 
                className="absolute -bottom-2 -right-2 w-8 h-8"
                data-testid="button-change-avatar"
              >
                <Camera className="w-4 h-4" />
              </Button>
            </div>
            <p className="text-xs font-mono text-muted-foreground">JPG, PNG. Max 2MB</p>
          </div>

          {/* Form fields */}
          <div className="flex-1 space-y-4">
            <div className="grid sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="firstName" className="font-mono text-sm">First Name</Label>
                <Input 
                  id="firstName" 
                  defaultValue={user?.firstName || ""} 
                  className="font-mono"
                  data-testid="input-first-name"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="lastName" className="font-mono text-sm">Last Name</Label>
                <Input 
                  id="lastName" 
                  defaultValue={user?.lastName || ""} 
                  className="font-mono"
                  data-testid="input-last-name"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="email" className="font-mono text-sm">Email</Label>
              <Input 
                id="email" 
                type="email" 
                defaultValue={user?.email || ""} 
                className="font-mono"
                disabled
                data-testid="input-email"
              />
              <p className="text-xs font-mono text-muted-foreground">
                The email associated with your account
              </p>
            </div>
            <Button className="font-mono uppercase tracking-wider" data-testid="button-save-profile">
              Save Changes
            </Button>
          </div>
        </div>
      </Card>

      {/* Preferences */}
      <Card className="p-6 border-border">
        <div className="flex items-center gap-2 mb-6">
          <Globe className="w-5 h-5 text-primary" />
          <h2 className="text-lg font-display uppercase">Preferences</h2>
        </div>

        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <p className="font-mono font-medium">Interface Language</p>
              <p className="text-sm font-mono text-muted-foreground">
                Choose your preferred language for the platform
              </p>
            </div>
            <Select defaultValue="es">
              <SelectTrigger className="w-48 font-mono" data-testid="select-language">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="en">English</SelectItem>
                <SelectItem value="es">Spanish</SelectItem>
                <SelectItem value="pt">Portuguese</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Separator />

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <p className="font-mono font-medium">Time Zone</p>
              <p className="text-sm font-mono text-muted-foreground">
                Set your time zone for lab scheduling
              </p>
            </div>
            <Select defaultValue="est">
              <SelectTrigger className="w-48 font-mono" data-testid="select-timezone">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="est">EST (UTC-5)</SelectItem>
                <SelectItem value="cst">CST (UTC-6)</SelectItem>
                <SelectItem value="mst">MST (UTC-7)</SelectItem>
                <SelectItem value="pst">PST (UTC-8)</SelectItem>
                <SelectItem value="brt">BRT (UTC-3)</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </Card>

      {/* Notifications */}
      <Card className="p-6 border-border">
        <div className="flex items-center gap-2 mb-6">
          <Bell className="w-5 h-5 text-primary" />
          <h2 className="text-lg font-display uppercase">Notifications</h2>
        </div>

        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-mono font-medium">Lab Reminders</p>
              <p className="text-sm font-mono text-muted-foreground">
                Receive reminders before your scheduled labs
              </p>
            </div>
            <Switch defaultChecked data-testid="switch-lab-reminders" />
          </div>

          <Separator />

          <div className="flex items-center justify-between">
            <div>
              <p className="font-mono font-medium">Course Updates</p>
              <p className="text-sm font-mono text-muted-foreground">
                Receive notifications about new lessons and courses
              </p>
            </div>
            <Switch defaultChecked data-testid="switch-course-updates" />
          </div>

          <Separator />

          <div className="flex items-center justify-between">
            <div>
              <p className="font-mono font-medium">Progress Reports</p>
              <p className="text-sm font-mono text-muted-foreground">
                Weekly summary of your learning progress
              </p>
            </div>
            <Switch defaultChecked data-testid="switch-progress-reports" />
          </div>

          <Separator />

          <div className="flex items-center justify-between">
            <div>
              <p className="font-mono font-medium">Marketing Emails</p>
              <p className="text-sm font-mono text-muted-foreground">
                Promotions, tips and learning resources
              </p>
            </div>
            <Switch data-testid="switch-marketing" />
          </div>
        </div>
      </Card>

      {/* Subscription */}
      <Card className="p-6 border-border">
        <div className="flex items-center gap-2 mb-6">
          <CreditCard className="w-5 h-5 text-primary" />
          <h2 className="text-lg font-display uppercase">Subscription</h2>
        </div>

        <div className="p-4 border border-primary/30 bg-primary/5 mb-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 flex-wrap mb-1">
                <p className="font-mono font-semibold" data-testid="text-plan-name">
                  {user?.subscriptionTier === 'premium' ? 'Premium Plan' :
                   user?.subscriptionTier === 'basic' ? 'Standard Plan' :
                   user?.subscriptionTier === 'flex' ? 'Flex Plan' : 'Free Plan'}
                </p>
                <Badge className="bg-primary text-primary-foreground font-mono text-xs">ACTIVE</Badge>
              </div>
              <p className="text-sm font-mono text-muted-foreground" data-testid="text-plan-price">
                {user?.subscriptionTier === 'premium' ? '$99.99/mo' :
                 user?.subscriptionTier === 'basic' ? '$49.99/mo' :
                 user?.subscriptionTier === 'flex' ? '$14.99/mo' : 'Free'}
              </p>
            </div>
            <div className="flex gap-2 flex-wrap">
              {user?.subscriptionTier !== 'free' && (
                <Button
                  variant="outline"
                  className="font-mono"
                  data-testid="button-manage-subscription"
                  onClick={handleManageSubscription}
                  disabled={isManagingSubscription}
                >
                  {isManagingSubscription ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Loading...
                    </>
                  ) : (
                    "Manage"
                  )}
                </Button>
              )}
              {user?.subscriptionTier !== 'premium' && (
                <Button className="bg-accent text-accent-foreground font-mono" data-testid="button-upgrade">
                  {user?.subscriptionTier === 'free' ? 'Upgrade Plan' : 'Upgrade to Premium'}
                </Button>
              )}
            </div>
          </div>
        </div>

        <div className="space-y-3">
          {user?.subscriptionTier === 'free' && (
            <>
              <div className="flex items-center gap-2 text-sm font-mono text-muted-foreground">
                <Check className="w-4 h-4 text-primary" />
                <span>First 3 lessons of Module 1</span>
              </div>
              <div className="flex items-center gap-2 text-sm font-mono text-muted-foreground">
                <Check className="w-4 h-4 text-primary" />
                <span>Free placement test</span>
              </div>
            </>
          )}
          {user?.subscriptionTier === 'flex' && (
            <>
              <div className="flex items-center gap-2 text-sm font-mono text-muted-foreground">
                <Check className="w-4 h-4 text-primary" />
                <span>Access to all pre-recorded courses</span>
              </div>
              <div className="flex items-center gap-2 text-sm font-mono text-muted-foreground">
                <Check className="w-4 h-4 text-primary" />
                <span>Unlimited lessons</span>
              </div>
              <div className="flex items-center gap-2 text-sm font-mono text-muted-foreground">
                <Check className="w-4 h-4 text-primary" />
                <span>1 Conversation Lab per month</span>
              </div>
            </>
          )}
          {user?.subscriptionTier === 'basic' && (
            <>
              <div className="flex items-center gap-2 text-sm font-mono text-muted-foreground">
                <Check className="w-4 h-4 text-primary" />
                <span>Access to all pre-recorded courses</span>
              </div>
              <div className="flex items-center gap-2 text-sm font-mono text-muted-foreground">
                <Check className="w-4 h-4 text-primary" />
                <span>2 Conversation Labs per week</span>
              </div>
            </>
          )}
          {user?.subscriptionTier === 'premium' && (
            <>
              <div className="flex items-center gap-2 text-sm font-mono text-muted-foreground">
                <Check className="w-4 h-4 text-primary" />
                <span>Unlimited access to all courses</span>
              </div>
              <div className="flex items-center gap-2 text-sm font-mono text-muted-foreground">
                <Check className="w-4 h-4 text-primary" />
                <span>Unlimited Conversation Labs</span>
              </div>
              <div className="flex items-center gap-2 text-sm font-mono text-muted-foreground">
                <Check className="w-4 h-4 text-primary" />
                <span>Priority support</span>
              </div>
            </>
          )}
        </div>
      </Card>

      {/* Privacy */}
      <Card className="p-6 border-border">
        <div className="flex items-center gap-2 mb-6">
          <Shield className="w-5 h-5 text-primary" />
          <h2 className="text-lg font-display uppercase">Privacy & Security</h2>
        </div>

        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-mono font-medium">Profile Visibility</p>
              <p className="text-sm font-mono text-muted-foreground">
                Allow other students to see your profile
              </p>
            </div>
            <Switch defaultChecked data-testid="switch-profile-visibility" />
          </div>

          <Separator />

          <div className="flex items-center justify-between">
            <div>
              <p className="font-mono font-medium">Show Progress</p>
              <p className="text-sm font-mono text-muted-foreground">
                Show your level and achievements publicly
              </p>
            </div>
            <Switch data-testid="switch-show-progress" />
          </div>

          <Separator />

          <div>
            <p className="font-mono font-medium mb-2">Delete Account</p>
            <p className="text-sm font-mono text-muted-foreground mb-4">
              Permanently delete your account and all associated data
            </p>
            <Button variant="destructive" className="font-mono" data-testid="button-delete-account">
              Delete Account
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
}
