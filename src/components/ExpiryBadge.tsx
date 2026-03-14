// Re-export from CountdownTimer for backward compatibility
export { CountdownTimer as ExpiryBadge } from "@/components/CountdownTimer";
export { ExpiryStatusBadge } from "@/components/CountdownTimer";

export function getExpiryLabel(expiresAt: string | null): string {
  if (!expiresAt) return "";
  const now = new Date();
  const expiry = new Date(expiresAt);
  const hoursLeft = (expiry.getTime() - now.getTime()) / (1000 * 60 * 60);
  if (hoursLeft <= 0) return "Expired";
  if (hoursLeft <= 1) return `${Math.round(hoursLeft * 60)}m left`;
  if (hoursLeft <= 24) return `${Math.round(hoursLeft)}h left`;
  return `${Math.round(hoursLeft / 24)}d left`;
}
