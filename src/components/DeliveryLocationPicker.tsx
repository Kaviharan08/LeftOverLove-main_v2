import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { LocationPicker } from "@/components/LocationPicker";
import { MapPin } from "lucide-react";

interface DeliveryLocationPickerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (lat: number, lng: number) => void;
  loading?: boolean;
}

export function DeliveryLocationPicker({ open, onOpenChange, onConfirm, loading }: DeliveryLocationPickerProps) {
  const [lat, setLat] = useState<number | null>(null);
  const [lng, setLng] = useState<number | null>(null);

  const handleLocationChange = (newLat: number, newLng: number) => {
    setLat(newLat);
    setLng(newLng);
  };

  const handleConfirm = () => {
    if (lat != null && lng != null) {
      onConfirm(lat, lng);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MapPin className="h-5 w-5 text-primary" />
            Set Delivery Location
          </DialogTitle>
          <DialogDescription>
            Share your current location or tap the map to set where you'd like the food delivered.
          </DialogDescription>
        </DialogHeader>

        <LocationPicker
          latitude={lat}
          longitude={lng}
          onLocationChange={handleLocationChange}
        />

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
            Cancel
          </Button>
          <Button onClick={handleConfirm} disabled={!lat || !lng || loading}>
            {loading ? "Requesting..." : "Request Volunteer"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
