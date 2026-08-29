export type ContainerVisualStatus =
  "available" | "rented" | "maintenance" | "other";

const statusImages: Record<
  ContainerVisualStatus,
  { webp: string; fallback: string }
> = {
  available: {
    webp: "/images/container-status-green.webp",
    fallback: "/images/container-status-green.png",
  },
  rented: {
    webp: "/images/container-status-red.webp",
    fallback: "/images/container-status-red.png",
  },
  maintenance: {
    webp: "/images/container-status-yellow.webp",
    fallback: "/images/container-status-yellow.png",
  },
  other: {
    webp: "/images/container-status-blue.webp",
    fallback: "/images/container-status-blue.png",
  },
};

const statusImageDimensions: Record<
  ContainerVisualStatus,
  { width: number; height: number }
> = {
  available: { width: 1200, height: 600 },
  rented: { width: 1200, height: 596 },
  maintenance: { width: 1200, height: 600 },
  other: { width: 1200, height: 600 },
};

export function getContainerVisualStatus(
  status: unknown,
): ContainerVisualStatus {
  const value = String(status ?? "").toLowerCase();
  if (["available", "متاحة", "متاح", "ready", "جاهزة"].includes(value))
    return "available";
  if (["maintenance", "صيانة", "inspection", "تحت الفحص"].includes(value))
    return "maintenance";
  if (
    [
      "rented",
      "with_customer",
      "مؤجرة",
      "لدى العميل",
      "reserved",
      "محجوزة",
    ].includes(value)
  )
    return "rented";
  return "other";
}

export function getContainerStatusImage(status: unknown): string {
  return statusImages[getContainerVisualStatus(status)].webp;
}

export function getContainerStatusFallbackImage(status: unknown): string {
  return statusImages[getContainerVisualStatus(status)].fallback;
}

export function getContainerStatusImageDimensions(status: unknown): {
  width: number;
  height: number;
} {
  return statusImageDimensions[getContainerVisualStatus(status)];
}
