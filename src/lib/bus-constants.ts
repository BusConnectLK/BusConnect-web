export const BUS_CLASSES = [
  { value: "normal", label: "Normal" },
  { value: "semi_luxury", label: "Semi Luxury" },
  { value: "luxury", label: "Luxury" },
  { value: "super_luxury", label: "Super Luxury" },
  { value: "expressway", label: "Expressway" },
] as const;

export const SEAT_LAYOUTS = [
  { value: "2x2", label: "2 × 2" },
  { value: "3x2", label: "3 × 2" },
  { value: "2x1", label: "2 × 1" },
] as const;

export const PREDEFINED_AMENITIES = [
  "Air Conditioning (AC)",
  "Wi-Fi",
  "USB Charging",
  "Power Outlets",
  "Reclining Seats",
  "TV / Entertainment",
  "CCTV",
  "GPS Tracking",
  "Reading Lights",
  "Blankets (Sleeper)",
  "Washroom",
  "Wheelchair Accessible",
  "Luggage Storage",
  "Refreshments",
  "Emergency Exit",
  "Fire Extinguisher",
];
