import { apiRequest } from "../../lib/apiClient";
import type { BicycleRecord } from "./bicycleTypes";

export type BicycleListResponse = { items: BicycleRecord[]; message?: string };
export const getBicycles = () => apiRequest<BicycleListResponse>("/bicycles");
