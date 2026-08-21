import { sqliteTable, integer, text } from "drizzle-orm/sqlite-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const serviceRequestsTable = sqliteTable("service_requests", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  clientName: text("client_name").notNull(),
  phone: text("phone").notNull(),
  email: text("email"),
  serviceType: text("service_type").notNull(),
  containerSize: text("container_size"),
  propertyType: text("property_type"), // villa | apartment | office | building
  areaSize: text("area_size"), // size in sqm or rooms
  location: text("location").notNull(),
  duration: text("duration"),
  notes: text("notes"),
  appointmentType: text("appointment_type").notNull().default("immediate"), // immediate | scheduled
  scheduledAt: text("scheduled_at"), // ISO date string for scheduled appointments
  status: text("status").notNull().default("pending"),
  adminNotes: text("admin_notes"),
  customerRecordId: integer("customer_record_id"),
  containerRecordId: integer("container_record_id"),
  contractRecordId: integer("contract_record_id"),
  assignedDriverId: integer("assigned_driver_id"),
  assignedVehicleId: integer("assigned_vehicle_id"),
  assignedVehiclePlate: text("assigned_vehicle_plate"),
  driverStatus: text("driver_status").notNull().default("unassigned"),
  driverResponseAt: text("driver_response_at"),
  driverStartedAt: text("driver_started_at"),
  driverCompletedAt: text("driver_completed_at"),
  driverNotes: text("driver_notes"),
  driverLocationLat: text("driver_location_lat"),
  driverLocationLng: text("driver_location_lng"),
  driverProofPhotoUrl: text("driver_proof_photo_url"),
  driverSignatureData: text("driver_signature_data"),
  driverReceiverName: text("driver_receiver_name"),
  assignedAt: text("assigned_at"),
  sessionId: text("session_id").notNull().default(""),
  acquisitionSource: text("acquisition_source").notNull().default("مباشر"),
  attributionReferrer: text("attribution_referrer").notNull().default(""),
  attributionLandingPage: text("attribution_landing_page").notNull().default(""),
  attributionUtmSource: text("attribution_utm_source").notNull().default(""),
  attributionUtmMedium: text("attribution_utm_medium").notNull().default(""),
  attributionUtmCampaign: text("attribution_utm_campaign").notNull().default(""),
  attributionGclid: text("attribution_gclid").notNull().default(""),
  createdAt: text("created_at").$defaultFn(() => new Date().toISOString()).notNull(),
  updatedAt: text("updated_at").$defaultFn(() => new Date().toISOString()).notNull(),
});

export const insertServiceRequestSchema = createInsertSchema(serviceRequestsTable).omit({ id: true, status: true, adminNotes: true, createdAt: true, updatedAt: true });
export type InsertServiceRequest = z.infer<typeof insertServiceRequestSchema>;
export type ServiceRequest = typeof serviceRequestsTable.$inferSelect;
