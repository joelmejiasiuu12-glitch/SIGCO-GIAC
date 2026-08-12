export type ContractStage =
  | "preformalization"
  | "formalization"
  | "formalized"
  | "cancelled"
  | "expired"
  | "agreements";

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
  contractStage?: ContractStage | null;
  contractSourceSheet?: string | null;
  contractLocationName?: string | null;
  contractLocationId?: string | null;
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
