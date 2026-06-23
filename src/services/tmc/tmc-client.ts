import type { TmcRecord } from "@/domain/types";

/**
 * Port for the TMC system. The validation engine matches extracted documents
 * against the record returned here. Swap the implementation (seed fixtures vs a
 * real TMC API) without touching any business logic.
 */
export interface TmcClient {
  /**
   * Resolve the authoritative driver/vehicle record for a submission reference
   * (e.g. employee/driver id). Returns null when the reference is unknown.
   */
  getRecord(reference: string): Promise<TmcRecord | null>;
}
