export type ContractStage =
  | "preformalization"
  | "formalization"
  | "formalized"
  | "cancelled"
  | "expired"
  | "agreements";

export type EtpCommercialCapacityData = {
  terminalPassengerCapacity: number;
  commercialAreaFactor: number;
  recommendedCommercialArea: number;
  leasedCommercialArea: number;
  commercialPassengerCapacity: number;
};

export type PassengerTrafficRecord = {
  year: number;
  month: number;
  monthName: string;
  passengers: number;
  status: "real" | "partial" | "projection";
};

export type AnalysisTarget =
  | "capacity"
  | "average"
  | "median"
  | "format"
  | "top3"
  | "brands"
  | "multi_location"
  | "mix"
  | "vacancy"
  | "modules"
  | "levels"
  | "area_type";

export type LocalRecord = {
  id: number;
  nomenclatura: string;
  lado: string;
  area: string;
  modulo: string;
  metraje: number | null;
  metrajeOriginal: number | string | null;
  areaComercial: string;
  nivel: number | string;
  estatus: string;
  situacion: string | null;
  marca: string | null;
  subdireccion: string | null;
  gerencia: string | null;
  giroIata: string | null;
  giroOperativo: string | null;
  giroIndaabin: string | null;
  observaciones: string | null;
  fechaFormalizacion: string | null;
  fechaConclusion: string | null;
  contractNumber: string | null;
  contractPending: boolean;
  commercialLine: string | null;
  commercialSubline: string | null;
  costPerM2: number | null;
  monthlyRent: number | null;
  participationRate: number | null;
  participationNotes: string | null;
  operationsStartDate: string | null;
  signatureDate: string | null;
  contractTerm: string | null;
  renewalDate: string | null;
  guaranteeStatus: string | null;
  liabilityPolicyStatus: string | null;
  projectStatus: string | null;
  contractStatus: string | null;
  operationalStatus: string | null;
  contactData: string | null;
  manager: string | null;
  razonSocial?: string | null;
  costPerM2Vigente?: number | null;
  monthlyRentVigente?: number | null;
  participationRateVigente?: number | null;
  zonaComercial?: string | null;
  contractStage?: ContractStage | null;
  contractSourceSheet?: string | null;
  contractLocationName?: string | null;
  contractLocationId?: string | null;
  locationId?: string | null;
  daysRemaining?: number | null;
};

export type LocationOption = {
  id: string;
  name: string;
  shortName: string;
  recordLabel: string;
};

export const locationOptions: LocationOption[] = [
  { id: "etp", name: "Edificio Terminal de Pasajeros (ETP)", shortName: "ETP", recordLabel: "locales" },
  { id: "parque-santa-lucia", name: "Parque Santa Lucía", shortName: "Parque Santa Lucía", recordLabel: "locales" },
  {
    id: "carga-aduana",
    name: "Edificio de Servicios",
    shortName: "Edificio de Servicios",
    recordLabel: "espacios",
  },
  {
    id: "autobuses-plaza",
    name: "Terminal Intermodal de Transportación Terrestre",
    shortName: "Terminal Intermodal de Transportación Terrestre",
    recordLabel: "locales",
  },
  {
    id: "parque-revolucion",
    name: "Glorieta Felipe Ángeles (Parque Revolución)",
    shortName: "Parque Revolución",
    recordLabel: "espacios",
  },
  { id: "ciudad-aeroportuaria", name: "Ciudad Aeroportuaria", shortName: "Ciudad Aeroportuaria", recordLabel: "manzanas" },
  { id: "calzada-mamuts", name: "Calzada de los Mamuts", shortName: "Calzada de los Mamuts", recordLabel: "predios" },
];

function normalizedText(value: unknown) {
  return String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

export function getSpaceType(record: LocalRecord, locationId?: string): string {
  const rawType = String(record.areaComercial ?? "").trim();
  const normalizedRaw = normalizedText(rawType);

  // If explicit value exists in the database column (Mezzanine, Terraza, Local, Isla, Bodega, etc.), preserve and return it directly!
  if (
    rawType &&
    normalizedRaw !== "sin dato" &&
    normalizedRaw !== "n/a" &&
    normalizedRaw !== "sin clasificacion"
  ) {
    return rawType;
  }

  // Combine fields to infer specific space type if empty
  const nom = normalizedText(record.nomenclatura);
  const giro = normalizedText(record.giroOperativo);
  const giroInda = normalizedText(record.giroIndaabin);
  const giroIat = normalizedText(record.giroIata);
  const brand = normalizedText(record.marca);
  const areaName = normalizedText(record.area);
  const obs = normalizedText(record.observaciones);
  const line = normalizedText(record.commercialLine);
  const subline = normalizedText(record.commercialSubline);
  const levelStr = normalizedText(record.nivel);

  const searchable = `${nom} ${giro} ${giroInda} ${giroIat} ${brand} ${areaName} ${obs} ${line} ${subline} ${levelStr}`;

  // 1. Mezzanine
  if (
    /mezzanine|mezzaninne|mezz|\bmz\b/.test(searchable) ||
    /\b(mezz|mz)\b/.test(nom)
  ) {
    return "Mezzanine";
  }

  // 2. Terraza
  if (
    /terraza|balcon|balcón|exterior|patio|al aire libre/.test(searchable) ||
    /\b(ter|bal|ext)\b/.test(nom)
  ) {
    return "Terraza";
  }

  // 3. Cajero automático / Divisas
  if (
    /cajero|atm\b|caja de cambio|casa de cambio|divisas|remesas|banorte|bbva|santander|citibanamex|hsbc|scotiabank|inbursa|banco/.test(
      searchable,
    ) ||
    /\b(caj|atm)\b/.test(nom)
  ) {
    return "Cajero";
  }

  // 4. Isla / Kiosco
  if (
    /isla|kiosco|kiosk|stand|carrito|modulo comercial|módulo comercial|exhibidor/.test(
      searchable,
    ) ||
    /\b(isl|ksk|kio)\b/.test(nom)
  ) {
    return "Isla";
  }

  // 5. Bodega / Almacén
  if (
    /bodega|almacen|almacén|guarda|deposito|depósito|lockers/.test(searchable) ||
    /\b(bod|bg|alm)\b/.test(nom)
  ) {
    return "Bodega";
  }

  // 6. Oficina / Administración
  if (
    /oficina|admin|despacho|aerolinea|aerolínea|operativa|gestion|operaciones|corporativo/.test(
      searchable,
    ) ||
    /\b(ofc|ofn|of|adm)\b/.test(nom)
  ) {
    return "Oficina";
  }

  // 7. Espacio publicitario
  if (
    /publicidad|publicitario|pantalla|muro|unipolar|banner|marquesina|valla|cartel/.test(
      searchable,
    ) ||
    /\b(pub|pan|mur)\b/.test(nom)
  ) {
    return "Espacio publicitario";
  }

  // 8. Máquina de autoservicio / Vending
  if (
    /maquina|máquina|vending|expendedora|autoservicio|silla de masaje|masaje|cargador/.test(
      searchable,
    ) ||
    /\b(vnd|mq|aut)\b/.test(nom)
  ) {
    return "Máquina de autoservicio";
  }

  // 9. Sala VIP / Lounge
  if (
    /sala vip|salon vip|salón vip|lounge|club|terrazas vip|centurion/.test(
      searchable,
    ) ||
    /\b(vip|lng|sln)\b/.test(nom)
  ) {
    return "Sala VIP";
  }

  // 10. Mostrador / Taquilla
  if (
    /mostrador|taquilla|counter|check-in|check in|boletos|atencion a clientes/.test(
      searchable,
    ) ||
    /\b(mst|taq|cnt)\b/.test(nom)
  ) {
    return "Mostrador / Taquilla";
  }

  // 11. Hotel
  if (/hotel|posada|hospedaje|stay|pod/.test(searchable)) {
    return "Hotel";
  }

  // Location fallbacks
  const loc = locationId || record.contractLocationId || "";
  if (loc === "ciudad-aeroportuaria") return "Manzana";
  if (loc === "calzada-mamuts") return "Predio";

  // Default
  return "Local";
}

export const IATA_GIRO_CATEGORIES = [
  "ALIMENTOS Y BEBIDAS",
  "DUTY FREE",
  "RETAIL",
  "SERVICIOS",
  "TIENDA DE CONVENIENCIA",
] as const;

export function normalizeGiroIata(record: LocalRecord | null | undefined): string {
  if (!record) return "Sin giro asignado";

  const rawIata = normalizedText(record.giroIata);
  const rawOperativo = normalizedText(record.giroOperativo);
  const rawLine = normalizedText(record.commercialLine);
  const rawBrand = normalizedText(record.marca);
  const rawInda = normalizedText(record.giroIndaabin);
  const rawObs = normalizedText(record.observaciones);

  const combined = `${rawIata} ${rawOperativo} ${rawLine} ${rawBrand} ${rawInda} ${rawObs}`.trim();

  if (!combined || combined === "sin dato" || combined === "n/a" || combined === "null") {
    return "Sin giro asignado";
  }

  // 1. Alimentos y Bebidas
  if (
    /aliment|bebid|restauran|cafet|cafe\b|café|food|comida|snack|gourmet|hamburgues|tacos|pizza|bar\b|cervec|helad|palet|pasteler|panader|donas|starbucks|vips|subway|dominos|burger|mcdonald|kfc|carls|chilis|wings|toks|sushi|mariscos|cantina|mezcal|taqueria|taquería/i.test(
      rawIata || combined
    )
  ) {
    return "ALIMENTOS Y BEBIDAS";
  }

  // 2. Duty Free
  if (/duty\s*free|duty\s*paid|libre de impuestos|libres de impuestos|dufry|attenza|tax free/i.test(rawIata || combined)) {
    return "DUTY FREE";
  }

  // 3. Tienda de conveniencia
  if (/conveniencia|oxxo|7\s*eleven|seven|circle\s*k|super\s*city|minisuper|supermercado|extra\b/i.test(rawIata || combined)) {
    return "TIENDA DE CONVENIENCIA";
  }

  // 4. Retail (Artículos, ropa, calzado, artesanías, joyería, libros, etc.)
  if (
    /retail|articul|tienda|boutique|moda|ropa|calzado|zapater|joyer|accesorios|souvenir|artesan|regalo|electronic|librer|juguet|perfum|cosmetic|equipaj|maleta|comercio|confeccion|tabac|dulcer|miniso|sunglass|optica solar|pineda covalin|quarzo|crocs|samsonite|sanborns/i.test(
      rawIata || combined
    )
  ) {
    return "RETAIL";
  }

  // 5. Servicios (Bancos, divisas, arrendadoras, transporte terrestre, telecom, salud, etc.)
  if (
    /servicio|banc|financ|cambio|divisa|remesa|auto|renta de auto|transporte|taxi|autobus|autobús|aerolinea|aerolínea|vuelo|volaris|viva|aeromexico|salud|laboratorio|farmacia|medic|optica|óptica|telecom|telefonia|telefonía|telcel|at&t|movistar|internet|logist|mensajer|paquet|dhl|fedex|ups|estafeta|guarder|masaj|spa|estetic|lavander|empaque|maleter|seguro|hotel|lounge|vip|mostrador|taquilla|cajero|atm/i.test(
      rawIata || combined
    )
  ) {
    return "SERVICIOS";
  }

  // Direct uppercase comparison fallback
  const upperIata = String(record.giroIata ?? "").trim().toUpperCase();
  if (upperIata === "ALIMENTOS Y BEBIDAS") return "ALIMENTOS Y BEBIDAS";
  if (upperIata === "DUTY FREE") return "DUTY FREE";
  if (upperIata === "RETAIL") return "RETAIL";
  if (upperIata === "SERVICIOS") return "SERVICIOS";
  if (upperIata === "TIENDA DE CONVENIENCIA") return "TIENDA DE CONVENIENCIA";

  return "Sin giro asignado";
}

export function getGiroCategory(record: LocalRecord): string {
  const rawGiro = String(record.giroOperativo ?? "").trim();
  if (rawGiro && rawGiro.toLowerCase() !== "null" && rawGiro.toLowerCase() !== "undefined") {
    return rawGiro;
  }
  const iata = String(record.giroIata ?? "").trim();
  if (iata && iata.toLowerCase() !== "null" && iata.toLowerCase() !== "undefined") {
    return iata;
  }
  const inda = String(record.giroIndaabin ?? "").trim();
  if (inda && inda.toLowerCase() !== "null" && inda.toLowerCase() !== "undefined") {
    return inda;
  }
  return "Sin giro registrado";
}

export interface AdvertisingSpaceRecord {
  id: number;
  id_unidad: string;
  contrato_id: string;
  arrendatario: string;
  codigo_nomenclatura: string;
  tipo_medio: string;
  modulo: string;
  nivel: string;
  superficie: number | null;
  ubicacion_especifica: string;
  estatus_operativo: string;
  observaciones: string | null;
  activo: number;
}
