import type { LocalRecord } from "@/app/types";

function normalizedSubdirection(value: unknown) {
  return String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLocaleUpperCase("es-MX")
    .replace(/\s+/g, " ");
}

export function isCommercialServicesEtpRecord(record: Pick<LocalRecord, "subdireccion">) {
  const subdirection = normalizedSubdirection(record.subdireccion);
  return subdirection === "SVS COM" || subdirection.includes("SERVICIOS COMERCIALES");
}

export function visibleRecordsForLocation(locationId: string, records: LocalRecord[]) {
  return locationId === "etp" ? records.filter(isCommercialServicesEtpRecord) : records;
}
