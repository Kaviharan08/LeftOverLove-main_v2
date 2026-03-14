import { useEffect, useState } from "react";
import { useNavigate, useParams, Link } from "react-router-dom";
import { Navbar } from "@/components/Navbar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LocationPicker } from "@/components/LocationPicker";
import { CategorySelect, DietaryTagsPicker } from "@/components/FoodCategoryFilter";
import { useAuth } from "@/lib/auth";
import { fetchListingById, updateFoodListing, uploadFoodImage } from "@/lib/food-listings";
import { localInputToSLISO, isoToSLLocalInput } from "@/lib/timezone";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Upload, Loader2 } from "lucide-react";
import { Label } from "@/components/ui/label";

export default function EditListing() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [pickupAddress, setPickupAddress] = useState("");
  const [latitude, setLatitude] = useState<number | null>(null);
  const [longitude, setLongitude] = useState<number | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [expiresAt, setExpiresAt] = useState("");
  const [category, setCategory] = useState("");
  const [dietaryTags, setDietaryTags] = useState<string[]>([]);
  const [quantity, setQuantity] = useState("");
  const [weightKg, setWeightKg] = useState("");

  useEffect(() => {
    if (!id) return;
    fetchListingById(id).then((listing: any) => {
      setTitle(listing.title);
      setDescription(listing.description || "");
      setPickupAddress(listing.pickup_address || "");
      setLatitude(listing.latitude);
      setLongitude(listing.longitude);
      setImagePreview(listing.image_url);
      setExpiresAt(listing.expires_at ? isoToSLLocalInput(listing.expires_at) : "");
      setCategory(listing.category || "");
      setDietaryTags(listing.dietary_tags || []);
      setQuantity(listing.quantity?.toString() || "");
      setWeightKg(listing.weight_kg?.toString() || "");
      setFetching(false);
    }).catch(() => {
      toast({ title: "Error", description: "Listing not found", variant: "destructive" });
      navigate("/dashboard/donor");
    });
  }, [id, navigate, toast]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !id) return;
    setLoading(true);
    try {
      let imageUrl: string | undefined;
      if (imageFile) {
        imageUrl = await uploadFoodImage(user.id, imageFile);
      }
      await updateFoodListing(id, {
        title: title.trim(),
        description: description.trim() || null,
        pickup_address: pickupAddress.trim() || null,
        latitude,
        longitude,
        ...(imageUrl ? { image_url: imageUrl } : {}),
        expires_at: expiresAt ? localInputToSLISO(expiresAt) : null,
        category: category || null,
        dietary_tags: dietaryTags.length > 0 ? dietaryTags : [],
        quantity: quantity ? parseInt(quantity) : null,
        weight_kg: weightKg ? parseFloat(weightKg) : null,
      } as any);
      toast({ title: "Updated!", description: "Listing updated successfully." });
      navigate("/dashboard/donor");
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  if (fetching) return <div className="min-h-screen"><Navbar /><div className="flex items-center justify-center py-20 text-muted-foreground">Loading...</div></div>;

  return (
    <div className="min-h-screen">
      <Navbar />
      <div className="container mx-auto max-w-2xl px-4 py-8">
        <Link to="/dashboard/donor" className="mb-4 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" /> Back to Dashboard
        </Link>
        <Card>
          <CardHeader><CardTitle>Edit Listing</CardTitle></CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="space-y-2">
                <label className="text-sm font-medium">Title *</label>
                <Input value={title} onChange={(e) => setTitle(e.target.value)} required />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Description</label>
                <Textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3} />
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>Quantity (items)</Label>
                  <Input type="number" min="1" value={quantity} onChange={(e) => setQuantity(e.target.value)} placeholder="e.g. 5" />
                </div>
                <div className="space-y-2">
                  <Label>Weight (kg)</Label>
                  <Input type="number" min="0.1" step="0.1" value={weightKg} onChange={(e) => setWeightKg(e.target.value)} placeholder="e.g. 2.5" />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Expiry Date & Time</Label>
                <Input type="datetime-local" value={expiresAt} onChange={(e) => setExpiresAt(e.target.value)} />
              </div>
              <CategorySelect value={category} onChange={setCategory} />
              <DietaryTagsPicker value={dietaryTags} onChange={setDietaryTags} />
              <div className="space-y-2">
                <label className="text-sm font-medium">Pickup Address</label>
                <Input value={pickupAddress} onChange={(e) => setPickupAddress(e.target.value)} />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Photo</label>
                <div className="flex items-center gap-4">
                  <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-dashed px-4 py-3 text-sm text-muted-foreground hover:border-primary hover:text-primary">
                    <Upload className="h-4 w-4" />
                    {imageFile ? imageFile.name : "Change image"}
                    <input type="file" accept="image/*" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) { setImageFile(f); setImagePreview(URL.createObjectURL(f)); }}} />
                  </label>
                  {imagePreview && <img src={imagePreview} alt="Preview" className="h-16 w-16 rounded-lg object-cover" />}
                </div>
              </div>
              <LocationPicker latitude={latitude} longitude={longitude} onLocationChange={(lat, lng) => { setLatitude(lat); setLongitude(lng); }} />
              <Button type="submit" className="w-full" disabled={loading || !title.trim()}>
                {loading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Saving...</> : "Save Changes"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
