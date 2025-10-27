import { cn } from "@/lib/utils";

interface HealthScoreProps {
  score: number;
  size?: "sm" | "md" | "lg";
  showLabel?: boolean;
  className?: string;
}

export function HealthScore({ score, size = "md", showLabel = false, className }: HealthScoreProps) {
  const getHealthStatus = (score: number) => {
    if (score >= 80) return { status: "excellent", color: "bg-green-500", label: "Excellent" };
    if (score >= 60) return { status: "good", color: "bg-green-400", label: "Good" };
    if (score >= 40) return { status: "fair", color: "bg-yellow-500", label: "Fair" };
    if (score >= 20) return { status: "poor", color: "bg-orange-500", label: "Poor" };
    return { status: "critical", color: "bg-red-500", label: "Critical" };
  };

  const health = getHealthStatus(score);

  const sizeClasses = {
    sm: "w-2 h-2",
    md: "w-3 h-3",
    lg: "w-4 h-4"
  };

  return (
    <div className={cn("flex items-center gap-2", className)}>
      <div
        className={cn(
          "rounded-full border-2 border-white shadow-sm",
          sizeClasses[size],
          health.color
        )}
        title={`${health.label} (${score}/100)`}
      />
      {showLabel && (
        <span className="text-sm font-medium text-gray-700">
          {health.label} ({score}/100)
        </span>
      )}
    </div>
  );
}