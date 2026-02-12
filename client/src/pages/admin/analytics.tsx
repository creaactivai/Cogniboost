import { useQuery } from "@tanstack/react-query";
import { AdminLayout } from "@/components/admin/admin-layout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Users, TrendingUp, DollarSign, BookOpen, Activity } from "lucide-react";
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { useState } from "react";

interface EngagementAnalytics {
  overview: {
    totalStudents: number;
    activeUsers7Days: number;
    activeUsers30Days: number;
    dau: number;
    wau: number;
  };
  enrollmentTrend: Array<{
    date: string;
    enrollments: number;
  }>;
  coursePerformance: Array<{
    courseTitle: string;
    enrollments: number;
    completions: number;
    completionRate: number;
  }>;
  revenue: {
    totalRevenue: string;
    mrr: string;
    arpu: string;
    activeSubscriptions: number;
  };
}

export default function AdminAnalytics() {
  const [timeRange, setTimeRange] = useState("30");

  const { data: analytics, isLoading } = useQuery<EngagementAnalytics>({
    queryKey: ["/api/admin/analytics/engagement", { days: timeRange }],
  });

  if (isLoading) {
    return (
      <AdminLayout title="Analytics">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </AdminLayout>
    );
  }

  if (!analytics) {
    return (
      <AdminLayout title="Analytics">
        <div className="text-center text-muted-foreground">No analytics data available</div>
      </AdminLayout>
    );
  }

  // Calculate engagement rate
  const engagementRate7Days = analytics.overview.totalStudents > 0
    ? ((analytics.overview.activeUsers7Days / analytics.overview.totalStudents) * 100).toFixed(1)
    : "0";

  const engagementRate30Days = analytics.overview.totalStudents > 0
    ? ((analytics.overview.activeUsers30Days / analytics.overview.totalStudents) * 100).toFixed(1)
    : "0";

  return (
    <AdminLayout title="Analytics">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Analytics Dashboard</h1>
            <p className="text-muted-foreground">
              Student engagement and course performance metrics
            </p>
          </div>
          <Select value={timeRange} onValueChange={setTimeRange}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Select time range" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7">Last 7 days</SelectItem>
              <SelectItem value="30">Last 30 days</SelectItem>
              <SelectItem value="90">Last 90 days</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Overview Stats Cards */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Students</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{analytics.overview.totalStudents}</div>
              <p className="text-xs text-muted-foreground">
                Active in last 7 days: {analytics.overview.activeUsers7Days}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">7-Day Engagement</CardTitle>
              <Activity className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{engagementRate7Days}%</div>
              <p className="text-xs text-muted-foreground">
                {analytics.overview.activeUsers7Days} active users
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">30-Day Engagement</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{engagementRate30Days}%</div>
              <p className="text-xs text-muted-foreground">
                {analytics.overview.activeUsers30Days} active users
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Monthly Recurring Revenue</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">${analytics.revenue.mrr}</div>
              <p className="text-xs text-muted-foreground">
                {analytics.revenue.activeSubscriptions} active subscriptions
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Revenue Metrics */}
        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">${analytics.revenue.totalRevenue}</div>
              <p className="text-xs text-muted-foreground">All-time revenue</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium">ARPU</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">${analytics.revenue.arpu}</div>
              <p className="text-xs text-muted-foreground">Average Revenue Per User</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium">Active Subscriptions</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{analytics.revenue.activeSubscriptions}</div>
              <p className="text-xs text-muted-foreground">Not cancelled</p>
            </CardContent>
          </Card>
        </div>

        {/* Enrollment Trend Chart */}
        <Card>
          <CardHeader>
            <CardTitle>Enrollment Trend</CardTitle>
            <CardDescription>
              Course enrollments over the last {timeRange} days
            </CardDescription>
          </CardHeader>
          <CardContent>
            {analytics.enrollmentTrend.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={analytics.enrollmentTrend}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis
                    dataKey="date"
                    tickFormatter={(date) => new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                  />
                  <YAxis />
                  <Tooltip
                    labelFormatter={(date) => new Date(date).toLocaleDateString()}
                  />
                  <Legend />
                  <Line
                    type="monotone"
                    dataKey="enrollments"
                    stroke="hsl(var(--primary))"
                    strokeWidth={2}
                    name="Enrollments"
                  />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-[300px] text-muted-foreground">
                No enrollment data for this period
              </div>
            )}
          </CardContent>
        </Card>

        {/* Course Performance */}
        <Card>
          <CardHeader>
            <CardTitle>Course Performance</CardTitle>
            <CardDescription>
              Top 10 courses by enrollment with completion rates
            </CardDescription>
          </CardHeader>
          <CardContent>
            {analytics.coursePerformance.length > 0 ? (
              <ResponsiveContainer width="100%" height={400}>
                <BarChart data={analytics.coursePerformance}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis
                    dataKey="courseTitle"
                    angle={-45}
                    textAnchor="end"
                    height={120}
                    interval={0}
                  />
                  <YAxis yAxisId="left" />
                  <YAxis yAxisId="right" orientation="right" />
                  <Tooltip />
                  <Legend />
                  <Bar
                    yAxisId="left"
                    dataKey="enrollments"
                    fill="hsl(var(--primary))"
                    name="Enrollments"
                  />
                  <Bar
                    yAxisId="right"
                    dataKey="completionRate"
                    fill="hsl(var(--chart-2))"
                    name="Completion Rate (%)"
                  />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-[400px] text-muted-foreground">
                No course performance data available
              </div>
            )}
          </CardContent>
        </Card>

        {/* Course Completion Table */}
        <Card>
          <CardHeader>
            <CardTitle>Course Completion Details</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-2 px-4">Course</th>
                    <th className="text-right py-2 px-4">Enrollments</th>
                    <th className="text-right py-2 px-4">Completions</th>
                    <th className="text-right py-2 px-4">Rate</th>
                  </tr>
                </thead>
                <tbody>
                  {analytics.coursePerformance.map((course, idx) => (
                    <tr key={idx} className="border-b">
                      <td className="py-2 px-4">{course.courseTitle}</td>
                      <td className="text-right py-2 px-4">{course.enrollments}</td>
                      <td className="text-right py-2 px-4">{course.completions}</td>
                      <td className="text-right py-2 px-4">
                        <span className={`font-semibold ${course.completionRate >= 50 ? 'text-green-600' : 'text-amber-600'}`}>
                          {course.completionRate}%
                        </span>
                      </td>
                    </tr>
                  ))}
                  {analytics.coursePerformance.length === 0 && (
                    <tr>
                      <td colSpan={4} className="text-center py-8 text-muted-foreground">
                        No course data available
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}
