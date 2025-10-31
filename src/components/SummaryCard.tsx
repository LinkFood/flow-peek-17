import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LucideIcon } from "lucide-react";

interface SummaryCardProps {
  title: string;
  value: string;
  icon: LucideIcon;
  trend?: "up" | "down" | "neutral";
}

export const SummaryCard = ({ title, value, icon: Icon, trend }: SummaryCardProps) => {
  const getTrendColor = () => {
    if (!trend) return "text-foreground";
    switch (trend) {
      case "up":
        return "text-call-color";
      case "down":
        return "text-put-color";
      default:
        return "text-neutral-color";
    }
  };

  return (
    <Card className="shadow-md">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
        <Icon className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className={`text-2xl font-bold ${getTrendColor()}`}>{value}</div>
      </CardContent>
    </Card>
  );
};
