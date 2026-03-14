import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";

interface Props {
  icon: string;
  title: string;
  description: string;
  action?: { label: string; to: string };
}

export function EmptyState({ icon, title, description, action }: Props) {
  return (
    <div className="flex flex-col items-center justify-center rounded-xl border border-dashed bg-muted/30 py-16 px-6 text-center animate-fade-in-up">
      <div className="mb-4 text-5xl">{icon}</div>
      <h3 className="text-lg font-semibold text-foreground">{title}</h3>
      <p className="mt-1 max-w-xs text-sm text-muted-foreground">{description}</p>
      {action && (
        <Button className="mt-5" asChild>
          <Link to={action.to}>{action.label}</Link>
        </Button>
      )}
    </div>
  );
}
