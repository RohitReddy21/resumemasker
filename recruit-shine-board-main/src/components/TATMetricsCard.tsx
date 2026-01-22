import { Clock, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { TATMetrics } from '@/types/recruitment';

interface TATMetricsCardProps {
  metrics: TATMetrics[];
  title?: string;
}

export function TATMetricsCard({ metrics, title = 'Turnaround Time (TAT)' }: TATMetricsCardProps) {
  return (
    <Card className="border-border">
      <CardHeader className="pb-4">
        <CardTitle className="flex items-center gap-2 text-lg font-semibold text-foreground">
          <Clock className="h-5 w-5 text-primary" />
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {metrics.map((metric) => {
            const isGood = metric.avgDays <= 3;
            const isBad = metric.avgDays >= 7;
            
            return (
              <div
                key={metric.metric}
                className="flex items-center justify-between rounded-lg border border-border bg-card p-4"
              >
                <div className="flex items-center gap-3">
                  <div className={`rounded-full p-2 ${
                    isGood ? 'bg-emerald-500/10' : isBad ? 'bg-rose-500/10' : 'bg-amber-500/10'
                  }`}>
                    {isGood ? (
                      <TrendingDown className="h-4 w-4 text-emerald-600" />
                    ) : isBad ? (
                      <TrendingUp className="h-4 w-4 text-rose-600" />
                    ) : (
                      <Minus className="h-4 w-4 text-amber-600" />
                    )}
                  </div>
                  <div>
                    <p className="font-medium text-foreground">{metric.metric}</p>
                    <p className="text-xs text-muted-foreground">
                      {metric.count} records
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className={`text-2xl font-bold ${
                    isGood ? 'text-emerald-600' : isBad ? 'text-rose-600' : 'text-amber-600'
                  }`}>
                    {metric.avgDays.toFixed(1)}d
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {metric.minDays}d - {metric.maxDays}d
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
