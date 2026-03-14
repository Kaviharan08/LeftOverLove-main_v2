import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { UtensilsCrossed, Truck } from "lucide-react";

interface ImpactData {
  totalListings: number;
  completedDeliveries: number;
  estimatedMeals: number;
  estimatedKgSaved: number;
  co2Saved: number;
}

const AVG_KG_PER_LISTING = 2.5;
const CO2_FACTOR = 2.5; // kg CO2 per kg food saved

interface ImpactStatsProps {
  userId?: string;
  role?: string | null;
  variant?: "compact" | "full";
}

export function ImpactStats({ userId, role, variant = "full" }: ImpactStatsProps) {
  const [data, setData] = useState<ImpactData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchImpact() {
      setLoading(true);
      try {
        let totalListings = 0;
        let completedDeliveries = 0;

        if (role === "donor" && userId) {
          const { count: listingCount } = await supabase
            .from("food_listings")
            .select("*", { count: "exact", head: true })
            .eq("donor_id", userId);
          totalListings = listingCount ?? 0;

          const { count: completedCount } = await supabase
            .from("pickup_requests")
            .select("*, food_listings!inner(donor_id)", { count: "exact", head: true })
            .eq("food_listings.donor_id", userId)
            .in("status", ["delivered", "confirmed"] as any);
          completedDeliveries = completedCount ?? 0;
        } else if (role === "receiver" && userId) {
          const { count: receivedCount } = await supabase
            .from("pickup_requests")
            .select("*", { count: "exact", head: true })
            .eq("receiver_id", userId)
            .in("status", ["delivered", "confirmed"] as any);
          completedDeliveries = receivedCount ?? 0;
          totalListings = completedDeliveries;
        } else if (role === "volunteer" && userId) {
          const { count: deliveredCount } = await supabase
            .from("pickup_requests")
            .select("*", { count: "exact", head: true })
            .eq("volunteer_id", userId)
            .in("status", ["delivered", "confirmed"] as any);
          completedDeliveries = deliveredCount ?? 0;
          totalListings = completedDeliveries;
        } else if (role === "ngo" && userId) {
          const { count: receivedCount } = await supabase
            .from("pickup_requests")
            .select("*", { count: "exact", head: true })
            .eq("receiver_id", userId)
            .in("status", ["delivered", "confirmed"] as any);
          completedDeliveries = receivedCount ?? 0;
          totalListings = completedDeliveries;
        } else {
          // Platform-wide (admin)
          const { count: listingCount } = await supabase
            .from("food_listings")
            .select("*", { count: "exact", head: true });
          totalListings = listingCount ?? 0;

          const { count: deliveredCount } = await supabase
            .from("pickup_requests")
            .select("*", { count: "exact", head: true })
            .in("status", ["delivered", "confirmed"] as any);
          completedDeliveries = deliveredCount ?? 0;
        }

        const estimatedKgSaved = completedDeliveries * AVG_KG_PER_LISTING;
        setData({
          totalListings,
          completedDeliveries,
          estimatedMeals: completedDeliveries,
          estimatedKgSaved,
          co2Saved: estimatedKgSaved * CO2_FACTOR,
        });
      } catch {
        // Silently fail
      } finally {
        setLoading(false);
      }
    }
    fetchImpact();
  }, [userId, role]);

  if (loading || !data) return null;

  const stats = [
    {
      label: role === "donor" ? "Listings Created" : role === "volunteer" ? "Deliveries Made" : "Meals Shared",
      value: role === "donor" ? data.totalListings : data.completedDeliveries,
      icon: UtensilsCrossed,
      color: "text-primary",
    },
    {
      label: "Completed Pickups",
      value: data.completedDeliveries,
      icon: Truck,
      color: "text-primary",
    },
  ];

  if (variant === "compact") {
    return (
      <div className="grid gap-3 grid-cols-2 sm:grid-cols-4">
        {stats.map((s) => (
          <div key={s.label} className="flex items-center gap-2 rounded-lg border p-3">
            <s.icon className={`h-4 w-4 ${s.color} shrink-0`} />
            <div>
              <p className="text-lg font-bold">{s.value}</p>
              <p className="text-[10px] text-muted-foreground leading-tight">{s.label}</p>
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {stats.map((s) => (
        <Card key={s.label}>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">{s.label}</CardTitle>
            <s.icon className={`h-4 w-4 ${s.color}`} />
          </CardHeader>
          <CardContent>
            <p className={`text-3xl font-bold ${s.color}`}>{s.value}</p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
