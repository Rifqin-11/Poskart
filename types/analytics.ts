export type KpiMetric = {
  label: string;
  value: string;
  delta: string;
  tone: "neutral" | "positive" | "warning";
};

export type ChartPoint = {
  label: string;
  revenue: number;
  transactions: number;
  downloads?: number;
};
