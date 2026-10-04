import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { Priority } from "@/lib/campus";

export const PRIORITY_COLORS: Record<Priority, string> = {
  low: "#0ea5e9",
  medium: "#f59e0b",
  high: "#f97316",
  critical: "#f43f5e",
};

export const STATUS_COLORS: Record<string, string> = {
  submitted: "#94a3b8",
  under_review: "#f59e0b",
  assigned: "#06b6d4",
  in_progress: "#3b82f6",
  resolved: "#10b981",
};

const glassTooltip = {
  contentStyle: {
    background: "rgba(255,255,255,0.92)",
    backdropFilter: "blur(12px)",
    border: "1px solid rgba(255,255,255,0.9)",
    borderRadius: 12,
    fontSize: 12,
    boxShadow: "0 10px 30px -12px rgba(11,55,95,0.25)",
  },
  labelStyle: { color: "#0f2f4a", fontWeight: 700 },
};

/** Monthly complaint volume vs resolved. */
export function TrendChart({
  data,
  height = 220,
}: {
  data: { month: string; total: number; resolved: number }[];
  height?: number;
}) {
  return (
    <div style={{ height }} className="w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 8, right: 8, left: -22, bottom: 0 }}>
          <CartesianGrid stroke="rgba(11,55,95,0.08)" vertical={false} />
          <XAxis dataKey="month" tick={{ fontSize: 11, fill: "#5b7793" }} axisLine={false} tickLine={false} />
          <YAxis tick={{ fontSize: 11, fill: "#5b7793" }} axisLine={false} tickLine={false} allowDecimals={false} />
          <Tooltip {...glassTooltip} />
          <Legend wrapperStyle={{ fontSize: 11 }} />
          <Line
            type="monotone"
            dataKey="total"
            name="Reported"
            stroke="#0284c7"
            strokeWidth={2.5}
            dot={{ r: 3, fill: "#0284c7" }}
          />
          <Line
            type="monotone"
            dataKey="resolved"
            name="Resolved"
            stroke="#10b981"
            strokeWidth={2.5}
            dot={{ r: 3, fill: "#10b981" }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

/** Donut of complaints by priority. */
export function PriorityDonut({
  rows,
  height = 220,
}: {
  rows: { name: string; count: number }[];
  height?: number;
}) {
  const data = rows.filter((r) => r.count > 0);
  if (data.length === 0) {
    return (
      <div style={{ height }} className="grid place-items-center text-sm text-muted-foreground">
        No priority data yet
      </div>
    );
  }
  return (
    <div style={{ height }} className="w-full">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={data}
            dataKey="count"
            nameKey="name"
            innerRadius="55%"
            outerRadius="85%"
            paddingAngle={3}
            stroke="rgba(255,255,255,0.9)"
          >
            {data.map((entry) => (
              <Cell
                key={entry.name}
                fill={PRIORITY_COLORS[entry.name as Priority] ?? "#0ea5e9"}
              />
            ))}
          </Pie>
          <Tooltip {...glassTooltip} />
          <Legend wrapperStyle={{ fontSize: 11 }} />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}

/** Horizontal bars: complaints by category / location / department. */
export function CategoryBars({
  rows,
  height,
  color = "#0284c7",
  labelTransform = (s: string) => s,
}: {
  rows: { name: string; count: number }[];
  height?: number;
  color?: string;
  labelTransform?: (s: string) => string;
}) {
  const data = rows.slice(0, 8).map((r) => ({ ...r, label: labelTransform(r.name) }));
  const computedHeight = height ?? Math.max(180, data.length * 34 + 30);
  if (data.length === 0) {
    return (
      <div style={{ height: 180 }} className="grid place-items-center text-sm text-muted-foreground">
        No data yet
      </div>
    );
  }
  return (
    <div style={{ height: computedHeight }} className="w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} layout="vertical" margin={{ top: 4, right: 16, left: 8, bottom: 4 }}>
          <CartesianGrid stroke="rgba(11,55,95,0.08)" horizontal={false} />
          <XAxis type="number" allowDecimals={false} tick={{ fontSize: 11, fill: "#5b7793" }} axisLine={false} tickLine={false} />
          <YAxis
            type="category"
            dataKey="label"
            width={120}
            tick={{ fontSize: 11, fill: "#33556f" }}
            axisLine={false}
            tickLine={false}
          />
          <Tooltip {...glassTooltip} cursor={{ fill: "rgba(255,255,255,0.5)" }} />
          <Bar dataKey="count" name="Reports" fill={color} radius={[0, 8, 8, 0]} barSize={16} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

/** Vertical bars: monthly trend (used on the analytics page). */
export function MonthlyBars({
  data,
  height = 240,
}: {
  data: { month: string; total: number; resolved: number }[];
  height?: number;
}) {
  return (
    <div style={{ height }} className="w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 8, right: 8, left: -22, bottom: 0 }}>
          <CartesianGrid stroke="rgba(11,55,95,0.08)" vertical={false} />
          <XAxis dataKey="month" tick={{ fontSize: 11, fill: "#5b7793" }} axisLine={false} tickLine={false} />
          <YAxis tick={{ fontSize: 11, fill: "#5b7793" }} axisLine={false} tickLine={false} allowDecimals={false} />
          <Tooltip {...glassTooltip} cursor={{ fill: "rgba(255,255,255,0.5)" }} />
          <Legend wrapperStyle={{ fontSize: 11 }} />
          <Bar dataKey="total" name="Reported" fill="#0284c7" radius={[8, 8, 0, 0]} barSize={18} />
          <Bar dataKey="resolved" name="Resolved" fill="#10b981" radius={[8, 8, 0, 0]} barSize={18} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
