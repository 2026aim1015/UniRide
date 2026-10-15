export type BicycleStatus = "available" | "in_use" | "maintenance" | "missing";

export type BicycleRecord = {
  id: string;
  code: string;
  name: string;
  status: BicycleStatus;
  qr_code?: string;
};
