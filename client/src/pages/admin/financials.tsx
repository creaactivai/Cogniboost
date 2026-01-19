import { useQuery } from "@tanstack/react-query";
import { AdminLayout } from "@/components/admin/admin-layout";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { DollarSign, TrendingUp, CreditCard, Users, ArrowUpRight, ArrowDownRight, TrendingDown, UserCheck } from "lucide-react";
import type { Payment, Subscription } from "@shared/schema";

const tierLabels: Record<string, string> = {
  free: "Gratis",
  flex: "Flex",
  standard: "Estándar",
  premium: "Prémium",
};

const PLAN_PRICES = {
  free: 0,
  flex: 14.99,
  standard: 49.99,
  premium: 99.99,
};

interface AdminStats {
  totalStudents: number;
  totalCourses: number;
  totalLabs: number;
  totalRevenue: string;
  activeSubscriptions: number;
}

interface StudentMetrics {
  totalStudents: number;
  activeStudents: number;
  holdStudents: number;
  inactiveStudents: number;
  churnRate: number;
  newStudentsThisMonth: number;
  churnedThisMonth: number;
}

export default function AdminFinancials() {
  const { data: stats, isLoading: statsLoading } = useQuery<AdminStats>({
    queryKey: ["/api/admin/stats"],
  });

  const { data: metrics, isLoading: metricsLoading } = useQuery<StudentMetrics>({
    queryKey: ["/api/admin/students/metrics"],
  });

  const { data: payments, isLoading: paymentsLoading } = useQuery<Payment[]>({
    queryKey: ["/api/admin/payments"],
  });

  const { data: subscriptions } = useQuery<Subscription[]>({
    queryKey: ["/api/admin/subscriptions"],
  });

  const tierCounts = subscriptions?.reduce(
    (acc, sub) => {
      acc[sub.tier] = (acc[sub.tier] || 0) + 1;
      return acc;
    },
    {} as Record<string, number>
  ) || {};

  const totalSubs = subscriptions?.length || 1;
  const mrr = 
    (tierCounts.flex || 0) * PLAN_PRICES.flex + 
    (tierCounts.standard || 0) * PLAN_PRICES.standard + 
    (tierCounts.premium || 0) * PLAN_PRICES.premium;
  const arr = mrr * 12;

  return (
    <AdminLayout title="Finanzas de la Academia">
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="w-10 h-10 bg-success flex items-center justify-center">
                <DollarSign className="w-5 h-5 text-success-foreground" />
              </div>
              <Badge variant="secondary" className="text-xs">
                <ArrowUpRight className="w-3 h-3 mr-1" />
                +18%
              </Badge>
            </div>
            <p className="text-2xl font-display uppercase tracking-tight" data-testid="text-total-revenue">
              ${statsLoading ? "..." : Number(stats?.totalRevenue || 0).toLocaleString()}
            </p>
            <p className="text-sm font-mono text-muted-foreground">
              Ingresos Totales
            </p>
          </Card>

          <Card className="p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="w-10 h-10 bg-primary flex items-center justify-center">
                <TrendingUp className="w-5 h-5 text-primary-foreground" />
              </div>
              <Badge variant="secondary" className="text-xs">
                MRR
              </Badge>
            </div>
            <p className="text-2xl font-display uppercase tracking-tight" data-testid="text-mrr">
              ${mrr.toLocaleString()}
            </p>
            <p className="text-sm font-mono text-muted-foreground">
              Ingresos Mensuales
            </p>
          </Card>

          <Card className="p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="w-10 h-10 bg-accent flex items-center justify-center">
                <CreditCard className="w-5 h-5 text-accent-foreground" />
              </div>
              <Badge variant="secondary" className="text-xs">
                {stats?.activeSubscriptions || 0}
              </Badge>
            </div>
            <p className="text-2xl font-display uppercase tracking-tight" data-testid="text-active-subscriptions">
              {stats?.activeSubscriptions || 0}
            </p>
            <p className="text-sm font-mono text-muted-foreground">
              Suscripciones Activas
            </p>
          </Card>

          <Card className="p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="w-10 h-10 bg-primary flex items-center justify-center">
                <Users className="w-5 h-5 text-primary-foreground" />
              </div>
              <Badge variant="secondary" className="text-xs">
                ARR
              </Badge>
            </div>
            <p className="text-2xl font-display uppercase tracking-tight" data-testid="text-arr">
              ${arr.toLocaleString()}
            </p>
            <p className="text-sm font-mono text-muted-foreground">
              Ingresos Anuales Est.
            </p>
          </Card>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-success flex items-center justify-center">
                <UserCheck className="w-4 h-4 text-success-foreground" />
              </div>
              <div>
                <p className="text-lg font-display uppercase tracking-tight">
                  {metricsLoading ? "..." : metrics?.activeStudents || 0}
                </p>
                <p className="text-xs font-mono text-muted-foreground">Estudiantes Activos</p>
              </div>
            </div>
          </Card>
          <Card className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-accent flex items-center justify-center">
                <Users className="w-4 h-4 text-accent-foreground" />
              </div>
              <div>
                <p className="text-lg font-display uppercase tracking-tight">
                  {metricsLoading ? "..." : metrics?.holdStudents || 0}
                </p>
                <p className="text-xs font-mono text-muted-foreground">En Espera (Pago)</p>
              </div>
            </div>
          </Card>
          <Card className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-destructive flex items-center justify-center">
                <TrendingDown className="w-4 h-4 text-destructive-foreground" />
              </div>
              <div>
                <p className="text-lg font-display uppercase tracking-tight">
                  {metricsLoading ? "..." : `${metrics?.churnRate || 0}%`}
                </p>
                <p className="text-xs font-mono text-muted-foreground">Tasa de Abandono</p>
              </div>
            </div>
          </Card>
          <Card className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-success flex items-center justify-center">
                <ArrowUpRight className="w-4 h-4 text-success-foreground" />
              </div>
              <div>
                <p className="text-lg font-display uppercase tracking-tight">
                  +{metricsLoading ? "..." : metrics?.newStudentsThisMonth || 0}
                </p>
                <p className="text-xs font-mono text-muted-foreground">Nuevos este Mes</p>
              </div>
            </div>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Card className="p-4 lg:col-span-2">
            <h2 className="text-lg font-display uppercase tracking-tight mb-4">
              Historial de Pagos
            </h2>
            {paymentsLoading ? (
              <p className="font-mono text-muted-foreground">
                Cargando pagos...
              </p>
            ) : payments?.length === 0 ? (
              <div className="text-center py-8">
                <CreditCard className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                <p className="font-mono text-muted-foreground">
                  No hay pagos registrados todavía
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {payments?.slice(0, 10).map((payment) => (
                  <div
                    key={payment.id}
                    className="flex items-center justify-between p-3 bg-muted/50 rounded"
                    data-testid={`payment-row-${payment.id}`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-8 h-8 flex items-center justify-center ${payment.status === "completed" ? "bg-success" : "bg-destructive"}`}>
                        {payment.status === "completed" ? (
                          <ArrowUpRight className="w-4 h-4 text-success-foreground" />
                        ) : (
                          <ArrowDownRight className="w-4 h-4 text-destructive-foreground" />
                        )}
                      </div>
                      <div>
                        <p className="font-mono font-medium text-sm">
                          {payment.userId.substring(0, 8)}...
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(payment.createdAt!).toLocaleDateString('es-ES')}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <Badge variant="secondary">{tierLabels[payment.tier] || payment.tier}</Badge>
                      <p className="font-mono font-bold">
                        ${Number(payment.amount).toLocaleString()}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>

          <Card className="p-4">
            <h2 className="text-lg font-display uppercase tracking-tight mb-4">
              Distribución de Planes
            </h2>
            <div className="space-y-4">
              <div>
                <div className="flex justify-between mb-2">
                  <span className="text-sm font-mono">Gratis</span>
                  <span className="font-bold">{tierCounts.free || 0}</span>
                </div>
                <Progress value={((tierCounts.free || 0) / totalSubs) * 100} className="h-2" />
              </div>
              <div>
                <div className="flex justify-between mb-2">
                  <span className="text-sm font-mono">Flex (${PLAN_PRICES.flex}/mes)</span>
                  <span className="font-bold">{tierCounts.flex || 0}</span>
                </div>
                <Progress value={((tierCounts.flex || 0) / totalSubs) * 100} className="h-2" />
              </div>
              <div>
                <div className="flex justify-between mb-2">
                  <span className="text-sm font-mono">Estándar (${PLAN_PRICES.standard}/mes)</span>
                  <span className="font-bold">{tierCounts.standard || 0}</span>
                </div>
                <Progress value={((tierCounts.standard || 0) / totalSubs) * 100} className="h-2" />
              </div>
              <div>
                <div className="flex justify-between mb-2">
                  <span className="text-sm font-mono">Prémium (${PLAN_PRICES.premium}/mes)</span>
                  <span className="font-bold">{tierCounts.premium || 0}</span>
                </div>
                <Progress value={((tierCounts.premium || 0) / totalSubs) * 100} className="h-2" />
              </div>

              <div className="pt-4 border-t border-border">
                <h3 className="font-bold font-mono mb-3">Métricas Clave</h3>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>ARPU (Prom./Usuario)</span>
                    <span className="font-bold">
                      ${metrics?.activeStudents ? Math.round(mrr / metrics.activeStudents) : 0}/mes
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>Retención</span>
                    <span className="font-bold text-success">
                      {metrics ? 100 - metrics.churnRate : 100}%
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>LTV Estimado</span>
                    <span className="font-bold text-primary">
                      ${metrics?.activeStudents && mrr 
                        ? Math.round((mrr / metrics.activeStudents) * 12 * (100 / Math.max(metrics.churnRate, 1)))
                        : 0}
                    </span>
                  </div>
                </div>
              </div>

              <div className="pt-4 border-t border-border">
                <h3 className="font-bold font-mono mb-3">Precios de Planes</h3>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Gratis</span>
                    <span className="font-bold">$0/mes</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>Flex</span>
                    <span className="font-bold text-accent">${PLAN_PRICES.flex}/mes</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>Estándar</span>
                    <span className="font-bold text-primary">${PLAN_PRICES.standard}/mes</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>Prémium</span>
                    <span className="font-bold text-success">${PLAN_PRICES.premium}/mes</span>
                  </div>
                </div>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </AdminLayout>
  );
}
