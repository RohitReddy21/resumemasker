import { useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { FunnelMetrics } from '@/types/recruitment';

interface FunnelChartProps {
  data: FunnelMetrics[];
  title?: string;
}

const COLORS = [
  'hsl(200, 98%, 39%)',  // primary
  'hsl(213, 93%, 67%)',  // chart-2
  'hsl(215, 20%, 65%)',  // chart-3
  'hsl(215, 16%, 46%)',  // chart-4
  'hsl(160, 60%, 45%)',  // success green
  'hsl(150, 60%, 40%)',  // darker green
];

export function FunnelChart({ data, title = 'Recruitment Funnel' }: FunnelChartProps) {
  const chartData = useMemo(() => {
    return data.map((item, index) => ({
      ...item,
      fill: COLORS[index % COLORS.length],
    }));
  }, [data]);

  return (
    <Card className="border-border">
      <CardHeader className="pb-4">
        <CardTitle className="text-lg font-semibold text-foreground">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-[300px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={chartData}
              layout="vertical"
              margin={{ top: 5, right: 30, left: 80, bottom: 5 }}
            >
              <XAxis type="number" stroke="hsl(var(--muted-foreground))" fontSize={12} />
              <YAxis
                dataKey="stage"
                type="category"
                stroke="hsl(var(--muted-foreground))"
                fontSize={12}
                width={75}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'hsl(var(--card))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '8px',
                  color: 'hsl(var(--foreground))',
                }}
                formatter={(value: number, name: string, props: { payload: FunnelMetrics }) => [
                  `${value} (${props.payload.percentage}%)`,
                  'Candidates',
                ]}
              />
              <Bar dataKey="count" radius={[0, 4, 4, 0]}>
                {chartData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.fill} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
        
        {/* Funnel progression labels */}
        <div className="mt-4 flex items-center justify-center gap-2 text-xs text-muted-foreground">
          {data.map((item, index) => (
            <div key={item.stage} className="flex items-center gap-2">
              <span className="font-medium">{item.count}</span>
              {index < data.length - 1 && (
                <span className="text-muted">→</span>
              )}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
