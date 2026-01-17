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
  Check
} from "lucide-react";
import { useAuth } from "@/hooks/use-auth";

export function Settings() {
  const { user } = useAuth();

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
          Manage your account preferences and subscription
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
                Email is managed by your Replit account
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
            <Select defaultValue="en">
              <SelectTrigger className="w-48 font-mono" data-testid="select-language">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="en">English</SelectItem>
                <SelectItem value="es">Español</SelectItem>
                <SelectItem value="pt">Português</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Separator />

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <p className="font-mono font-medium">Timezone</p>
              <p className="text-sm font-mono text-muted-foreground">
                Set your timezone for lab scheduling
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
                Get notified about new lessons and courses
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
                Promotions, tips, and learning resources
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
              <div className="flex items-center gap-2 mb-1">
                <p className="font-mono font-semibold">Standard Plan</p>
                <Badge className="bg-primary text-primary-foreground font-mono text-xs">ACTIVE</Badge>
              </div>
              <p className="text-sm font-mono text-muted-foreground">
                $29/month • Renews on Feb 15, 2025
              </p>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" className="font-mono" data-testid="button-manage-subscription">
                Manage
              </Button>
              <Button className="bg-accent text-accent-foreground font-mono" data-testid="button-upgrade">
                Upgrade to Premium
              </Button>
            </div>
          </div>
        </div>

        <div className="space-y-3">
          <div className="flex items-center gap-2 text-sm font-mono text-muted-foreground">
            <Check className="w-4 h-4 text-primary" />
            <span>Full course library access</span>
          </div>
          <div className="flex items-center gap-2 text-sm font-mono text-muted-foreground">
            <Check className="w-4 h-4 text-primary" />
            <span>4 conversation labs per month</span>
          </div>
          <div className="flex items-center gap-2 text-sm font-mono text-muted-foreground">
            <Check className="w-4 h-4 text-primary" />
            <span>Downloadable certificates</span>
          </div>
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
                Allow other learners to see your profile
              </p>
            </div>
            <Switch defaultChecked data-testid="switch-profile-visibility" />
          </div>

          <Separator />

          <div className="flex items-center justify-between">
            <div>
              <p className="font-mono font-medium">Show Progress</p>
              <p className="text-sm font-mono text-muted-foreground">
                Display your level and achievements publicly
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
