export type ContainerVisualStatus = "available" | "rented" | "maintenance" | "other"

const statusImages: Record<ContainerVisualStatus, string> = {
  available: "/images/container-status-green.png",
  rented: "/images/container-status-red.png",
  maintenance: "/images/container-status-yellow.png",
  other: "/images/container-status-blue.png",
}

export function getContainerVisualStatus(status: unknown): ContainerVisualStatus {
  const value = String(status ?? "").toLowerCase()
  if (["available", "متاحة", "متاح", "ready", "جاهزة"].includes(value)) return "available"
  if (["maintenance", "صيانة", "inspection", "تحت الفحص"].includes(value)) return "maintenance"
  if (["rented", "with_customer", "مؤجرة", "لدى العميل", "reserved", "محجوزة"].includes(value)) return "rented"
  return "other"
}

export function getContainerStatusImage(status: unknown): string {
  return statusImages[getContainerVisualStatus(status)]
}
