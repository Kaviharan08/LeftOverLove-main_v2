import { useEffect, useRef, useState } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { supabase } from "@/integrations/supabase/client";

delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

const volunteerIcon = L.divIcon({
  className: "",
  html: `<div style="background:hsl(221,83%,53%);width:18px;height:18px;border-radius:50%;border:3px solid white;box-shadow:0 2px 6px rgba(0,0,0,0.3)"></div>`,
  iconSize: [18, 18],
  iconAnchor: [9, 9],
});

const pickupIcon = L.divIcon({
  className: "",
  html: `<div style="background:hsl(25,95%,53%);width:14px;height:14px;border-radius:50%;border:2px solid white;box-shadow:0 2px 4px rgba(0,0,0,0.3)"></div>`,
  iconSize: [14, 14],
  iconAnchor: [7, 7],
});

const deliveryIcon = L.divIcon({
  className: "",
  html: `<div style="background:hsl(142,52%,36%);width:14px;height:14px;border-radius:50%;border:2px solid white;box-shadow:0 2px 4px rgba(0,0,0,0.3)"></div>`,
  iconSize: [14, 14],
  iconAnchor: [7, 7],
});

// Fetch real road route from OSRM (free, no API key)
async function fetchRoadRoute(points: [number, number][]): Promise<[number, number][]> {
  if (points.length < 2) return points;
  try {
    const coords = points.map(([lat, lng]) => `${lng},${lat}`).join(";");
    const url = `https://router.project-osrm.org/route/v1/driving/${coords}?overview=full&geometries=geojson`;
    const res = await fetch(url);
    if (!res.ok) return points;
    const data = await res.json();
    if (data.code !== "Ok" || !data.routes?.[0]?.geometry?.coordinates) return points;
    // OSRM returns [lng, lat] — swap to [lat, lng] for Leaflet
    return data.routes[0].geometry.coordinates.map(([lng, lat]: [number, number]) => [lat, lng]);
  } catch {
    return points; // fallback to straight line on error
  }
}

interface LiveTrackingMapProps {
  requestId: string;
  pickupLat?: number | null;
  pickupLng?: number | null;
  deliveryLat?: number | null;
  deliveryLng?: number | null;
  volunteerLat?: number | null;
  volunteerLng?: number | null;
  status: string;
  className?: string;
}

export function LiveTrackingMap({
  requestId,
  pickupLat, pickupLng,
  deliveryLat, deliveryLng,
  volunteerLat, volunteerLng,
  status, className,
}: LiveTrackingMapProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstance = useRef<L.Map | null>(null);
  const volMarker = useRef<L.Marker | null>(null);
  const routeLine = useRef<L.Polyline | null>(null);
  const [liveLat, setLiveLat] = useState(volunteerLat);
  const [liveLng, setLiveLng] = useState(volunteerLng);

  // Sync prop changes
  useEffect(() => {
    if (volunteerLat != null) setLiveLat(volunteerLat);
    if (volunteerLng != null) setLiveLng(volunteerLng);
  }, [volunteerLat, volunteerLng]);

  // Realtime volunteer location
  useEffect(() => {
    const channel = supabase
      .channel(`tracking-${requestId}`)
      .on("postgres_changes", {
        event: "UPDATE",
        schema: "public",
        table: "pickup_requests",
        filter: `id=eq.${requestId}`,
      }, (payload) => {
        const row = payload.new as any;
        if (row.volunteer_lat != null && row.volunteer_lng != null) {
          setLiveLat(row.volunteer_lat);
          setLiveLng(row.volunteer_lng);
        }
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [requestId]);

  // Initialize map
  useEffect(() => {
    if (!mapRef.current) return;
    if (mapInstance.current) { mapInstance.current.remove(); mapInstance.current = null; }

    const points: [number, number][] = [];
    if (pickupLat && pickupLng) points.push([pickupLat, pickupLng]);
    if (deliveryLat && deliveryLng) points.push([deliveryLat, deliveryLng]);
    if (liveLat && liveLng) points.push([liveLat, liveLng]);

    const center: [number, number] = points.length > 0 ? points[0] : [6.9271, 79.8612];

    const map = L.map(mapRef.current, {
      // Fix z-index: prevent map controls from overlapping page UI
      zoomControl: true,
    }).setView(center, 14);

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: 'Leaflet | &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    }).addTo(map);

    if (pickupLat && pickupLng) {
      L.marker([pickupLat, pickupLng], { icon: pickupIcon }).addTo(map).bindPopup("Pickup (Donor)");
    }
    if (deliveryLat && deliveryLng) {
      L.marker([deliveryLat, deliveryLng], { icon: deliveryIcon }).addTo(map).bindPopup("Delivery (Receiver)");
    }

    if (points.length >= 2) {
      map.fitBounds(L.latLngBounds(points.map(p => L.latLng(p[0], p[1]))), { padding: [40, 40] });
    }

    mapInstance.current = map;
    return () => { map.remove(); mapInstance.current = null; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pickupLat, pickupLng, deliveryLat, deliveryLng]);

  // Update volunteer marker and road route
  useEffect(() => {
    if (!mapInstance.current || liveLat == null || liveLng == null) return;

    // Update/create volunteer marker
    if (volMarker.current) {
      volMarker.current.setLatLng([liveLat, liveLng]);
    } else {
      volMarker.current = L.marker([liveLat, liveLng], { icon: volunteerIcon })
        .addTo(mapInstance.current)
        .bindPopup("Volunteer");
    }

    // Build route points: pickup → volunteer → delivery
    const routePoints: [number, number][] = [];
    if (pickupLat && pickupLng) routePoints.push([pickupLat, pickupLng]);
    routePoints.push([liveLat, liveLng]);
    if (deliveryLat && deliveryLng) routePoints.push([deliveryLat, deliveryLng]);

    if (routePoints.length >= 2) {
      // Fetch real road route from OSRM
      fetchRoadRoute(routePoints).then((roadCoords) => {
        if (!mapInstance.current) return;
        if (routeLine.current) {
          routeLine.current.setLatLngs(roadCoords);
        } else {
          routeLine.current = L.polyline(roadCoords, {
            color: "hsl(221,83%,53%)",
            weight: 4,
            opacity: 0.8,
          }).addTo(mapInstance.current);
        }
      });
    }
  }, [liveLat, liveLng, pickupLat, pickupLng, deliveryLat, deliveryLng]);

  const isTrackable = ["volunteer_accepted", "picked_up"].includes(status);
  if (!isTrackable && !liveLat) return null;

  return (
    // ── FIX: relative + isolate keeps Leaflet z-index contained ──
    <div className={`relative isolate ${className ?? ""}`}>
      <div className="mb-2 flex items-center gap-2 text-sm font-medium">
        <span className="relative flex h-3 w-3">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-green-400 opacity-75" />
          <span className="relative inline-flex h-3 w-3 rounded-full bg-green-500" />
        </span>
        Live Tracking
      </div>
      {/* z-[1] keeps the map tile layer below page modals/nav */}
      <div ref={mapRef} className="h-[300px] w-full rounded-lg border relative z-[1]" />
      <div className="mt-2 flex gap-4 text-xs text-muted-foreground">
        <span className="flex items-center gap-1">
          <span className="inline-block h-2.5 w-2.5 rounded-full" style={{ background: "hsl(25,95%,53%)" }} /> Donor
        </span>
        <span className="flex items-center gap-1">
          <span className="inline-block h-2.5 w-2.5 rounded-full" style={{ background: "hsl(221,83%,53%)" }} /> Volunteer
        </span>
        <span className="flex items-center gap-1">
          <span className="inline-block h-2.5 w-2.5 rounded-full" style={{ background: "hsl(142,52%,36%)" }} /> Receiver
        </span>
      </div>
    </div>
  );
}
