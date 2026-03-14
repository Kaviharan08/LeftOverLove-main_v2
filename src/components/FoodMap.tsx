import { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import type { Tables } from "@/integrations/supabase/types";

delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

interface FoodMapProps {
  listings: Tables<"food_listings">[];
  userLocation?: { lat: number; lng: number } | null;
  onListingClick?: (id: string) => void;
  className?: string;
}

export function FoodMap({ listings, userLocation, onListingClick, className }: FoodMapProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  // Keep a stable ref to the callback so marker popups always call the latest version
  const onClickRef = useRef(onListingClick);
  useEffect(() => { onClickRef.current = onListingClick; }, [onListingClick]);

  useEffect(() => {
    if (!mapRef.current) return;

    if (mapInstanceRef.current) {
      mapInstanceRef.current.remove();
      mapInstanceRef.current = null;
    }

    const center: [number, number] = userLocation
      ? [userLocation.lat, userLocation.lng]
      : listings.length > 0 && listings[0].latitude && listings[0].longitude
        ? [listings[0].latitude, listings[0].longitude]
        : [28.6139, 77.209];

    const map = L.map(mapRef.current).setView(center, 12);
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    }).addTo(map);

    if (userLocation) {
      L.circleMarker([userLocation.lat, userLocation.lng], {
        radius: 10,
        color: "hsl(142, 52%, 36%)",
        fillColor: "hsl(142, 52%, 36%)",
        fillOpacity: 0.3,
      })
        .addTo(map)
        .bindPopup("Your Location");
    }

    listings.forEach((listing) => {
      if (!listing.latitude || !listing.longitude) return;
      const marker = L.marker([listing.latitude, listing.longitude]).addTo(map);

      // Build popup HTML — use data-id attribute instead of inline JS
      const hasClick = !!onClickRef.current;
      const popupHtml = `
        <div style="min-width:180px">
          <strong>${listing.title}</strong>
          <p style="margin:4px 0;font-size:12px;color:#666">${listing.pickup_address || "No address"}</p>
          <p style="margin:4px 0;font-size:11px;color:hsl(142,52%,36%);font-weight:600">${listing.status}</p>
          ${hasClick ? `<a href="#" data-listing-id="${listing.id}" class="food-map-detail-link" style="font-size:12px;color:hsl(142,52%,36%)">View Details →</a>` : ""}
        </div>
      `;
      const popup = L.popup().setContent(popupHtml);
      marker.bindPopup(popup);

      // Attach click listener after popup opens (event delegation on popup DOM)
      marker.on("popupopen", () => {
        const el = document.querySelector(`[data-listing-id="${listing.id}"]`);
        if (el) {
          el.addEventListener("click", (e) => {
            e.preventDefault();
            onClickRef.current?.(listing.id);
          }, { once: true });
        }
      });
    });

    mapInstanceRef.current = map;

    return () => {
      map.remove();
      mapInstanceRef.current = null;
    };
  }, [listings, userLocation]);

  return <div ref={mapRef} className={`h-[400px] w-full rounded-lg border ${className || ""}`} />;
}
