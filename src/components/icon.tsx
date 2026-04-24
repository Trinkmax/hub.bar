import {
  Beef,
  Salad,
  Drumstick,
  Utensils,
  Pizza,
  Sandwich,
  Croissant,
  ChefHat,
  IceCreamCone,
  Wine,
  CupSoda,
  Martini,
  Grape,
  Sun,
  Coffee,
  Flame,
  type LucideIcon,
} from "lucide-react";

const map: Record<string, LucideIcon> = {
  beef: Beef,
  salad: Salad,
  drumstick: Drumstick,
  utensils: Utensils,
  pizza: Pizza,
  sandwich: Sandwich,
  croissant: Croissant,
  "chef-hat": ChefHat,
  "ice-cream-cone": IceCreamCone,
  wine: Wine,
  "cup-soda": CupSoda,
  martini: Martini,
  grape: Grape,
  sun: Sun,
  coffee: Coffee,
  flame: Flame,
};

export function CategoryIcon({
  name,
  className = "",
}: {
  name: string | null | undefined;
  className?: string;
}) {
  const Icon = (name && map[name]) || Utensils;
  return <Icon className={className} />;
}
