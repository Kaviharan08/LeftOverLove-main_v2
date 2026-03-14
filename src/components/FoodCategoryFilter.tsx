import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";

export const FOOD_CATEGORIES = [
  { value: "cooked", label: "Cooked" },
  { value: "raw", label: "Raw" },
  { value: "packaged", label: "Packaged" },
  { value: "baked", label: "Baked" },
  { value: "beverages", label: "Beverages" },
  { value: "other", label: "Other" },
] as const;

export const DIETARY_TAGS = [
  "Vegetarian",
  "Vegan",
  "Halal",
  "Kosher",
  "Gluten-Free",
  "Dairy-Free",
  "Nut-Free",
] as const;

interface CategorySelectProps {
  value: string;
  onChange: (value: string) => void;
}

export function CategorySelect({ value, onChange }: CategorySelectProps) {
  return (
    <div className="space-y-2">
      <Label>Category</Label>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger>
          <SelectValue placeholder="Select category" />
        </SelectTrigger>
        <SelectContent>
          {FOOD_CATEGORIES.map((c) => (
            <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

interface DietaryTagsPickerProps {
  value: string[];
  onChange: (tags: string[]) => void;
}

export function DietaryTagsPicker({ value, onChange }: DietaryTagsPickerProps) {
  const toggle = (tag: string) => {
    if (value.includes(tag)) {
      onChange(value.filter((t) => t !== tag));
    } else {
      onChange([...value, tag]);
    }
  };

  return (
    <div className="space-y-2">
      <Label>Dietary Tags</Label>
      <div className="flex flex-wrap gap-3">
        {DIETARY_TAGS.map((tag) => (
          <label key={tag} className="flex items-center gap-1.5 text-sm cursor-pointer">
            <Checkbox checked={value.includes(tag)} onCheckedChange={() => toggle(tag)} />
            {tag}
          </label>
        ))}
      </div>
    </div>
  );
}

interface CategoryBadgeProps {
  category: string | null;
}

export function CategoryBadge({ category }: CategoryBadgeProps) {
  if (!category) return null;
  const label = FOOD_CATEGORIES.find((c) => c.value === category)?.label ?? category;
  return <Badge variant="outline" className="capitalize">{label}</Badge>;
}

interface DietaryTagBadgesProps {
  tags: string[] | null;
}

export function DietaryTagBadges({ tags }: DietaryTagBadgesProps) {
  if (!tags || tags.length === 0) return null;
  return (
    <div className="flex flex-wrap gap-1">
      {tags.map((tag) => (
        <Badge key={tag} variant="secondary" className="text-xs">{tag}</Badge>
      ))}
    </div>
  );
}
