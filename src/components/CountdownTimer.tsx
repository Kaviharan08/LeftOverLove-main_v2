import { useState, useEffect } from "react";
import { Badge } from "@/components/ui/badge";
import { Clock, AlertTriangle } from "lucide-react";

interface CountdownTimerProps {
  expiresAt: string | null;
  status?: string;
  className?: string;
  showBadge?: boolean;
}

function getTimeLeft(expiresAt: string) {
  const now = Date.now();
  const expiry = new Date(expiresAt).getTime();
  const diff = expiry - now;
  if (diff <= 0) return null;

  const hours = Math.floor(diff / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  const days = Math.floor(hours / 24);
  const remainingHours = hours % 24;

  if (days > 0) {
    return { label: `${days}d ${remainingHours}h`, isUrgent: false, isSoon: false };
  }
  if (hours >= 2) {
    return { label: `${hours}h ${minutes}m`, isUrgent: false, isSoon: false };
  }
  if (hours >= 1) {
    return { label: `${hours}h ${minutes}m`, isUrgent: false, isSoon: true };
  }
  return { label: `${minutes}m`, isUrgent: true, isSoon: true };
}

export function CountdownTimer({ expiresAt, status, className, showBadge = true }: CountdownTimerProps) {
  const [timeLeft, setTimeLeft] = useState(() => expiresAt ? getTimeLeft(expiresAt) : null);

  useEffect(() => {
    if (!expiresAt) return;
    // Skip countdown for completed/delivered/cancelled statuses
    if (status && ["completed", "delivered", "cancelled"].includes(status)) return;

    const update = () => setTimeLeft(getTimeLeft(expiresAt));
    update();
    // Use shorter interval when expiry is close (< 2h) for accuracy
    const hoursLeft = (new Date(expiresAt).getTime() - Date.now()) / (1000 * 60 * 60);
    const intervalMs = hoursLeft < 2 ? 10_000 : 60_000;
    const interval = setInterval(update, intervalMs);
    return () => clearInterval(interval);
  }, [expiresAt, status]);

  // Don't show for non-applicable statuses
  if (status && ["completed", "delivered", "cancelled"].includes(status)) {
    if (status === "completed" && showBadge) {
      return (
        <Badge variant="secondary" className={`bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400 ${className}`}>
          ✓ Completed
        </Badge>
      );
    }
    return null;
  }

  if (!expiresAt) return null;

  // Expired
  if (!timeLeft) {
    if (!showBadge) return <span className={`text-destructive font-medium ${className}`}>Expired</span>;
    return (
      <Badge variant="destructive" className={className}>
        <AlertTriangle className="mr-1 h-3 w-3" /> Expired
      </Badge>
    );
  }

  // Expiring soon (< 2 hours)
  if (timeLeft.isSoon) {
    if (!showBadge) {
      return (
        <span className={`font-medium ${timeLeft.isUrgent ? "text-destructive" : "text-yellow-600 dark:text-yellow-400"} ${className}`}>
          ⏱ Expires in: {timeLeft.label}
        </span>
      );
    }
    return (
      <Badge className={`${timeLeft.isUrgent ? "bg-destructive text-destructive-foreground" : "bg-yellow-500 text-white hover:bg-yellow-600"} ${className}`}>
        <Clock className="mr-1 h-3 w-3 animate-pulse" /> {timeLeft.label}
      </Badge>
    );
  }

  // Normal countdown
  if (!showBadge) {
    return <span className={`text-muted-foreground ${className}`}>Expires in: {timeLeft.label}</span>;
  }
  return (
    <Badge variant="secondary" className={`text-green-700 dark:text-green-400 ${className}`}>
      <Clock className="mr-1 h-3 w-3" /> {timeLeft.label}
    </Badge>
  );
}

export function ExpiryStatusBadge({ status, expiresAt: _expiresAt }: { status: string; expiresAt: string | null }) {
  if (status === "expired") {
    return <Badge variant="destructive"><AlertTriangle className="mr-1 h-3 w-3" /> Expired</Badge>;
  }
  if (status === "expiring_soon") {
    return (
      <Badge className="bg-yellow-500 text-white hover:bg-yellow-600">
        <Clock className="mr-1 h-3 w-3 animate-pulse" /> Expiring Soon
      </Badge>
    );
  }
  if (status === "completed") {
    return <Badge variant="secondary" className="bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400">✓ Completed</Badge>;
  }
  if (status === "claimed") {
    return <Badge className="bg-accent text-accent-foreground">Claimed</Badge>;
  }
  if (status === "available") {
    return <Badge className="bg-primary text-primary-foreground">Available</Badge>;
  }
  return <Badge variant="secondary">{status}</Badge>;
}
