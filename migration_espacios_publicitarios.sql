-- MIGRACIÓN DE ESPACIOS PUBLICITARIOS ESTRUCTURADOS (GEP)
CREATE TABLE IF NOT EXISTS espacios_publicitarios (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  id_unidad TEXT NOT NULL UNIQUE,
  contrato_id TEXT,
  arrendatario TEXT,
  codigo_nomenclatura TEXT NOT NULL,
  tipo_medio TEXT NOT NULL,
  modulo TEXT,
  nivel TEXT,
  superficie REAL,
  ubicacion_especifica TEXT,
  estatus_operativo TEXT NOT NULL DEFAULT 'Operando',
  observaciones TEXT,
  activo INTEGER DEFAULT 1,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (contrato_id) REFERENCES contratos(numero_contrato) ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_espacios_pub_contrato ON espacios_publicitarios(contrato_id);
CREATE INDEX IF NOT EXISTS idx_espacios_pub_codigo ON espacios_publicitarios(codigo_nomenclatura);
CREATE INDEX IF NOT EXISTS idx_espacios_pub_tipo ON espacios_publicitarios(tipo_medio);
CREATE INDEX IF NOT EXISTS idx_espacios_pub_modulo ON espacios_publicitarios(modulo);

DELETE FROM espacios_publicitarios;
INSERT INTO espacios_publicitarios (
  id_unidad, contrato_id, arrendatario, codigo_nomenclatura, tipo_medio, modulo, nivel, superficie, ubicacion_especifica, estatus_operativo, observaciones
) VALUES (
  'PUB-001',
  'AIFA-DCS-SSC-102-2023',
  'DLPX4 Holding, S.A.P.I. de C.V.',
  'VWEIG1-1',
  'VideoWall',
  'G1',
  '10.50 / 0.00 / 5.25',
  NULL,
  'Edificio Terminal de Pasajeros - Módulo G1',
  'Operando',
  'Parte del paquete de 62 pantallas DLPX VEO MEDIA'
);
INSERT INTO espacios_publicitarios (
  id_unidad, contrato_id, arrendatario, codigo_nomenclatura, tipo_medio, modulo, nivel, superficie, ubicacion_especifica, estatus_operativo, observaciones
) VALUES (
  'PUB-002',
  'AIFA-DCS-SSC-102-2023',
  'DLPX4 Holding, S.A.P.I. de C.V.',
  'VWEIG1-11',
  'VideoWall',
  'G1',
  '10.50 / 0.00 / 5.25',
  NULL,
  'Edificio Terminal de Pasajeros - Módulo G1',
  'Operando',
  'Parte del paquete de 62 pantallas DLPX VEO MEDIA'
);
INSERT INTO espacios_publicitarios (
  id_unidad, contrato_id, arrendatario, codigo_nomenclatura, tipo_medio, modulo, nivel, superficie, ubicacion_especifica, estatus_operativo, observaciones
) VALUES (
  'PUB-003',
  'AIFA-DCS-SSC-102-2023',
  'DLPX4 Holding, S.A.P.I. de C.V.',
  'VWEIG1-12',
  'VideoWall',
  'G1',
  '10.50 / 0.00 / 5.25',
  NULL,
  'Edificio Terminal de Pasajeros - Módulo G1',
  'Operando',
  'Parte del paquete de 62 pantallas DLPX VEO MEDIA'
);
INSERT INTO espacios_publicitarios (
  id_unidad, contrato_id, arrendatario, codigo_nomenclatura, tipo_medio, modulo, nivel, superficie, ubicacion_especifica, estatus_operativo, observaciones
) VALUES (
  'PUB-004',
  'AIFA-DCS-SSC-102-2023',
  'DLPX4 Holding, S.A.P.I. de C.V.',
  'PTEIF-25',
  'Pantalla Tótem',
  'G1',
  '10.50 / 0.00 / 5.25',
  NULL,
  'Edificio Terminal de Pasajeros - Módulo G1',
  'Operando',
  'Parte del paquete de 62 pantallas DLPX VEO MEDIA'
);
INSERT INTO espacios_publicitarios (
  id_unidad, contrato_id, arrendatario, codigo_nomenclatura, tipo_medio, modulo, nivel, superficie, ubicacion_especifica, estatus_operativo, observaciones
) VALUES (
  'PUB-005',
  'AIFA-DCS-SSC-102-2023',
  'DLPX4 Holding, S.A.P.I. de C.V.',
  'PTEIG1-26',
  'Pantalla Tótem',
  'G1',
  '10.50 / 0.00 / 5.25',
  NULL,
  'Edificio Terminal de Pasajeros - Módulo G1',
  'Operando',
  'Parte del paquete de 62 pantallas DLPX VEO MEDIA'
);
INSERT INTO espacios_publicitarios (
  id_unidad, contrato_id, arrendatario, codigo_nomenclatura, tipo_medio, modulo, nivel, superficie, ubicacion_especifica, estatus_operativo, observaciones
) VALUES (
  'PUB-006',
  'AIFA-DCS-SSC-102-2023',
  'DLPX4 Holding, S.A.P.I. de C.V.',
  'PTEIG1-27',
  'Pantalla Tótem',
  'G1',
  '10.50 / 0.00 / 5.25',
  NULL,
  'Edificio Terminal de Pasajeros - Módulo G1',
  'Operando',
  'Parte del paquete de 62 pantallas DLPX VEO MEDIA'
);
INSERT INTO espacios_publicitarios (
  id_unidad, contrato_id, arrendatario, codigo_nomenclatura, tipo_medio, modulo, nivel, superficie, ubicacion_especifica, estatus_operativo, observaciones
) VALUES (
  'PUB-007',
  'AIFA-DCS-SSC-102-2023',
  'DLPX4 Holding, S.A.P.I. de C.V.',
  'PTEIG1-28',
  'Pantalla Tótem',
  'G1',
  '10.50 / 0.00 / 5.25',
  NULL,
  'Edificio Terminal de Pasajeros - Módulo G1',
  'Operando',
  'Parte del paquete de 62 pantallas DLPX VEO MEDIA'
);
INSERT INTO espacios_publicitarios (
  id_unidad, contrato_id, arrendatario, codigo_nomenclatura, tipo_medio, modulo, nivel, superficie, ubicacion_especifica, estatus_operativo, observaciones
) VALUES (
  'PUB-008',
  'AIFA-DCS-SSC-102-2023',
  'DLPX4 Holding, S.A.P.I. de C.V.',
  'PTEIG1-29',
  'Pantalla Tótem',
  'G1',
  '10.50 / 0.00 / 5.25',
  NULL,
  'Edificio Terminal de Pasajeros - Módulo G1',
  'Operando',
  'Parte del paquete de 62 pantallas DLPX VEO MEDIA'
);
INSERT INTO espacios_publicitarios (
  id_unidad, contrato_id, arrendatario, codigo_nomenclatura, tipo_medio, modulo, nivel, superficie, ubicacion_especifica, estatus_operativo, observaciones
) VALUES (
  'PUB-009',
  'AIFA-DCS-SSC-102-2023',
  'DLPX4 Holding, S.A.P.I. de C.V.',
  'PTEIG1-30',
  'Pantalla Tótem',
  'G1',
  '10.50 / 0.00 / 5.25',
  NULL,
  'Edificio Terminal de Pasajeros - Módulo G1',
  'Operando',
  'Parte del paquete de 62 pantallas DLPX VEO MEDIA'
);
INSERT INTO espacios_publicitarios (
  id_unidad, contrato_id, arrendatario, codigo_nomenclatura, tipo_medio, modulo, nivel, superficie, ubicacion_especifica, estatus_operativo, observaciones
) VALUES (
  'PUB-010',
  'AIFA-DCS-SSC-102-2023',
  'DLPX4 Holding, S.A.P.I. de C.V.',
  'PTEIG1-31',
  'Pantalla Tótem',
  'G1',
  '10.50 / 0.00 / 5.25',
  NULL,
  'Edificio Terminal de Pasajeros - Módulo G1',
  'Operando',
  'Parte del paquete de 62 pantallas DLPX VEO MEDIA'
);
INSERT INTO espacios_publicitarios (
  id_unidad, contrato_id, arrendatario, codigo_nomenclatura, tipo_medio, modulo, nivel, superficie, ubicacion_especifica, estatus_operativo, observaciones
) VALUES (
  'PUB-011',
  'AIFA-DCS-SSC-102-2023',
  'DLPX4 Holding, S.A.P.I. de C.V.',
  'PTEIG1-32',
  'Pantalla Tótem',
  'G1',
  '10.50 / 0.00 / 5.25',
  NULL,
  'Edificio Terminal de Pasajeros - Módulo G1',
  'Operando',
  'Parte del paquete de 62 pantallas DLPX VEO MEDIA'
);
INSERT INTO espacios_publicitarios (
  id_unidad, contrato_id, arrendatario, codigo_nomenclatura, tipo_medio, modulo, nivel, superficie, ubicacion_especifica, estatus_operativo, observaciones
) VALUES (
  'PUB-012',
  'AIFA-DCS-SSC-102-2023',
  'DLPX4 Holding, S.A.P.I. de C.V.',
  'VWEIG2-13',
  'VideoWall',
  'G2',
  '10.50 / 0.00 / 5.25',
  NULL,
  'Edificio Terminal de Pasajeros - Módulo G2',
  'Operando',
  'Parte del paquete de 62 pantallas DLPX VEO MEDIA'
);
INSERT INTO espacios_publicitarios (
  id_unidad, contrato_id, arrendatario, codigo_nomenclatura, tipo_medio, modulo, nivel, superficie, ubicacion_especifica, estatus_operativo, observaciones
) VALUES (
  'PUB-013',
  'AIFA-DCS-SSC-102-2023',
  'DLPX4 Holding, S.A.P.I. de C.V.',
  'VWEIG2-14',
  'VideoWall',
  'G2',
  '10.50 / 0.00 / 5.25',
  NULL,
  'Edificio Terminal de Pasajeros - Módulo G2',
  'Operando',
  'Parte del paquete de 62 pantallas DLPX VEO MEDIA'
);
INSERT INTO espacios_publicitarios (
  id_unidad, contrato_id, arrendatario, codigo_nomenclatura, tipo_medio, modulo, nivel, superficie, ubicacion_especifica, estatus_operativo, observaciones
) VALUES (
  'PUB-014',
  'AIFA-DCS-SSC-102-2023',
  'DLPX4 Holding, S.A.P.I. de C.V.',
  'VWEIG2-02',
  'VideoWall',
  'G2',
  '10.50 / 0.00 / 5.25',
  NULL,
  'Edificio Terminal de Pasajeros - Módulo G2',
  'Operando',
  'Parte del paquete de 62 pantallas DLPX VEO MEDIA'
);
INSERT INTO espacios_publicitarios (
  id_unidad, contrato_id, arrendatario, codigo_nomenclatura, tipo_medio, modulo, nivel, superficie, ubicacion_especifica, estatus_operativo, observaciones
) VALUES (
  'PUB-015',
  'AIFA-DCS-SSC-102-2023',
  'DLPX4 Holding, S.A.P.I. de C.V.',
  'PTEIG2-33',
  'Pantalla Tótem',
  'G2',
  '10.50 / 0.00 / 5.25',
  NULL,
  'Edificio Terminal de Pasajeros - Módulo G2',
  'Operando',
  'Parte del paquete de 62 pantallas DLPX VEO MEDIA'
);
INSERT INTO espacios_publicitarios (
  id_unidad, contrato_id, arrendatario, codigo_nomenclatura, tipo_medio, modulo, nivel, superficie, ubicacion_especifica, estatus_operativo, observaciones
) VALUES (
  'PUB-016',
  'AIFA-DCS-SSC-102-2023',
  'DLPX4 Holding, S.A.P.I. de C.V.',
  'PTEIG2-34',
  'Pantalla Tótem',
  'G2',
  '10.50 / 0.00 / 5.25',
  NULL,
  'Edificio Terminal de Pasajeros - Módulo G2',
  'Operando',
  'Parte del paquete de 62 pantallas DLPX VEO MEDIA'
);
INSERT INTO espacios_publicitarios (
  id_unidad, contrato_id, arrendatario, codigo_nomenclatura, tipo_medio, modulo, nivel, superficie, ubicacion_especifica, estatus_operativo, observaciones
) VALUES (
  'PUB-017',
  'AIFA-DCS-SSC-102-2023',
  'DLPX4 Holding, S.A.P.I. de C.V.',
  'PTEIG2-35',
  'Pantalla Tótem',
  'G2',
  '10.50 / 0.00 / 5.25',
  NULL,
  'Edificio Terminal de Pasajeros - Módulo G2',
  'Operando',
  'Parte del paquete de 62 pantallas DLPX VEO MEDIA'
);
INSERT INTO espacios_publicitarios (
  id_unidad, contrato_id, arrendatario, codigo_nomenclatura, tipo_medio, modulo, nivel, superficie, ubicacion_especifica, estatus_operativo, observaciones
) VALUES (
  'PUB-018',
  'AIFA-DCS-SSC-102-2023',
  'DLPX4 Holding, S.A.P.I. de C.V.',
  'PTEIG2-36',
  'Pantalla Tótem',
  'G2',
  '10.50 / 0.00 / 5.25',
  NULL,
  'Edificio Terminal de Pasajeros - Módulo G2',
  'Operando',
  'Parte del paquete de 62 pantallas DLPX VEO MEDIA'
);
INSERT INTO espacios_publicitarios (
  id_unidad, contrato_id, arrendatario, codigo_nomenclatura, tipo_medio, modulo, nivel, superficie, ubicacion_especifica, estatus_operativo, observaciones
) VALUES (
  'PUB-019',
  'AIFA-DCS-SSC-102-2023',
  'DLPX4 Holding, S.A.P.I. de C.V.',
  'VWENB-01',
  'VideoWall',
  'B',
  '10.50 / 0.00 / 5.25',
  NULL,
  'Edificio Terminal de Pasajeros - Módulo B',
  'Operando',
  'Parte del paquete de 62 pantallas DLPX VEO MEDIA'
);
INSERT INTO espacios_publicitarios (
  id_unidad, contrato_id, arrendatario, codigo_nomenclatura, tipo_medio, modulo, nivel, superficie, ubicacion_especifica, estatus_operativo, observaciones
) VALUES (
  'PUB-020',
  'AIFA-DCS-SSC-102-2023',
  'DLPX4 Holding, S.A.P.I. de C.V.',
  'VWENB-01',
  'VideoWall',
  'B',
  '10.50 / 0.00 / 5.25',
  NULL,
  'Edificio Terminal de Pasajeros - Módulo B',
  'Operando',
  'Parte del paquete de 62 pantallas DLPX VEO MEDIA'
);
INSERT INTO espacios_publicitarios (
  id_unidad, contrato_id, arrendatario, codigo_nomenclatura, tipo_medio, modulo, nivel, superficie, ubicacion_especifica, estatus_operativo, observaciones
) VALUES (
  'PUB-021',
  'AIFA-DCS-SSC-102-2023',
  'DLPX4 Holding, S.A.P.I. de C.V.',
  'VWENC-02',
  'VideoWall',
  'C',
  '10.50 / 0.00 / 5.25',
  NULL,
  'Edificio Terminal de Pasajeros - Módulo C',
  'Operando',
  'Parte del paquete de 62 pantallas DLPX VEO MEDIA'
);
INSERT INTO espacios_publicitarios (
  id_unidad, contrato_id, arrendatario, codigo_nomenclatura, tipo_medio, modulo, nivel, superficie, ubicacion_especifica, estatus_operativo, observaciones
) VALUES (
  'PUB-022',
  'AIFA-DCS-SSC-102-2023',
  'DLPX4 Holding, S.A.P.I. de C.V.',
  'VWENC-03',
  'VideoWall',
  'C',
  '10.50 / 0.00 / 5.25',
  NULL,
  'Edificio Terminal de Pasajeros - Módulo C',
  'Operando',
  'Parte del paquete de 62 pantallas DLPX VEO MEDIA'
);
INSERT INTO espacios_publicitarios (
  id_unidad, contrato_id, arrendatario, codigo_nomenclatura, tipo_medio, modulo, nivel, superficie, ubicacion_especifica, estatus_operativo, observaciones
) VALUES (
  'PUB-023',
  'AIFA-DCS-SSC-102-2023',
  'DLPX4 Holding, S.A.P.I. de C.V.',
  'PTENC-06',
  'Pantalla Tótem',
  'C',
  '10.50 / 0.00 / 5.25',
  NULL,
  'Edificio Terminal de Pasajeros - Módulo C',
  'Operando',
  'Parte del paquete de 62 pantallas DLPX VEO MEDIA'
);
INSERT INTO espacios_publicitarios (
  id_unidad, contrato_id, arrendatario, codigo_nomenclatura, tipo_medio, modulo, nivel, superficie, ubicacion_especifica, estatus_operativo, observaciones
) VALUES (
  'PUB-024',
  'AIFA-DCS-SSC-102-2023',
  'DLPX4 Holding, S.A.P.I. de C.V.',
  'PTENC-07',
  'Pantalla Tótem',
  'C',
  '10.50 / 0.00 / 5.25',
  NULL,
  'Edificio Terminal de Pasajeros - Módulo C',
  'Operando',
  'Parte del paquete de 62 pantallas DLPX VEO MEDIA'
);
INSERT INTO espacios_publicitarios (
  id_unidad, contrato_id, arrendatario, codigo_nomenclatura, tipo_medio, modulo, nivel, superficie, ubicacion_especifica, estatus_operativo, observaciones
) VALUES (
  'PUB-025',
  'AIFA-DCS-SSC-102-2023',
  'DLPX4 Holding, S.A.P.I. de C.V.',
  'PTENC-08',
  'Pantalla Tótem',
  'C',
  '10.50 / 0.00 / 5.25',
  NULL,
  'Edificio Terminal de Pasajeros - Módulo C',
  'Operando',
  'Parte del paquete de 62 pantallas DLPX VEO MEDIA'
);
INSERT INTO espacios_publicitarios (
  id_unidad, contrato_id, arrendatario, codigo_nomenclatura, tipo_medio, modulo, nivel, superficie, ubicacion_especifica, estatus_operativo, observaciones
) VALUES (
  'PUB-026',
  'AIFA-DCS-SSC-102-2023',
  'DLPX4 Holding, S.A.P.I. de C.V.',
  'PTENC-09',
  'Pantalla Tótem',
  'C',
  '10.50 / 0.00 / 5.25',
  NULL,
  'Edificio Terminal de Pasajeros - Módulo C',
  'Operando',
  'Parte del paquete de 62 pantallas DLPX VEO MEDIA'
);
INSERT INTO espacios_publicitarios (
  id_unidad, contrato_id, arrendatario, codigo_nomenclatura, tipo_medio, modulo, nivel, superficie, ubicacion_especifica, estatus_operativo, observaciones
) VALUES (
  'PUB-027',
  'AIFA-DCS-SSC-102-2023',
  'DLPX4 Holding, S.A.P.I. de C.V.',
  'VWEND-04',
  'VideoWall',
  'D',
  '10.50 / 0.00 / 5.25',
  NULL,
  'Edificio Terminal de Pasajeros - Módulo D',
  'Operando',
  'Parte del paquete de 62 pantallas DLPX VEO MEDIA'
);
INSERT INTO espacios_publicitarios (
  id_unidad, contrato_id, arrendatario, codigo_nomenclatura, tipo_medio, modulo, nivel, superficie, ubicacion_especifica, estatus_operativo, observaciones
) VALUES (
  'PUB-028',
  'AIFA-DCS-SSC-102-2023',
  'DLPX4 Holding, S.A.P.I. de C.V.',
  'PTEND-10',
  'Pantalla Tótem',
  'D',
  '10.50 / 0.00 / 5.25',
  NULL,
  'Edificio Terminal de Pasajeros - Módulo D',
  'Operando',
  'Parte del paquete de 62 pantallas DLPX VEO MEDIA'
);
INSERT INTO espacios_publicitarios (
  id_unidad, contrato_id, arrendatario, codigo_nomenclatura, tipo_medio, modulo, nivel, superficie, ubicacion_especifica, estatus_operativo, observaciones
) VALUES (
  'PUB-029',
  'AIFA-DCS-SSC-102-2023',
  'DLPX4 Holding, S.A.P.I. de C.V.',
  'PTEND-11',
  'Pantalla Tótem',
  'D',
  '10.50 / 0.00 / 5.25',
  NULL,
  'Edificio Terminal de Pasajeros - Módulo D',
  'Operando',
  'Parte del paquete de 62 pantallas DLPX VEO MEDIA'
);
INSERT INTO espacios_publicitarios (
  id_unidad, contrato_id, arrendatario, codigo_nomenclatura, tipo_medio, modulo, nivel, superficie, ubicacion_especifica, estatus_operativo, observaciones
) VALUES (
  'PUB-030',
  'AIFA-DCS-SSC-102-2023',
  'DLPX4 Holding, S.A.P.I. de C.V.',
  'VWENE1-05',
  'VideoWall',
  'E1',
  '10.50 / 0.00 / 5.25',
  NULL,
  'Edificio Terminal de Pasajeros - Módulo E1',
  'Operando',
  'Parte del paquete de 62 pantallas DLPX VEO MEDIA'
);
INSERT INTO espacios_publicitarios (
  id_unidad, contrato_id, arrendatario, codigo_nomenclatura, tipo_medio, modulo, nivel, superficie, ubicacion_especifica, estatus_operativo, observaciones
) VALUES (
  'PUB-031',
  'AIFA-DCS-SSC-102-2023',
  'DLPX4 Holding, S.A.P.I. de C.V.',
  'PTENE1-12',
  'Pantalla Tótem',
  'E1',
  '10.50 / 0.00 / 5.25',
  NULL,
  'Edificio Terminal de Pasajeros - Módulo E1',
  'Operando',
  'Parte del paquete de 62 pantallas DLPX VEO MEDIA'
);
INSERT INTO espacios_publicitarios (
  id_unidad, contrato_id, arrendatario, codigo_nomenclatura, tipo_medio, modulo, nivel, superficie, ubicacion_especifica, estatus_operativo, observaciones
) VALUES (
  'PUB-032',
  'AIFA-DCS-SSC-102-2023',
  'DLPX4 Holding, S.A.P.I. de C.V.',
  'PTENE1-13',
  'Pantalla Tótem',
  'E1',
  '10.50 / 0.00 / 5.25',
  NULL,
  'Edificio Terminal de Pasajeros - Módulo E1',
  'Operando',
  'Parte del paquete de 62 pantallas DLPX VEO MEDIA'
);
INSERT INTO espacios_publicitarios (
  id_unidad, contrato_id, arrendatario, codigo_nomenclatura, tipo_medio, modulo, nivel, superficie, ubicacion_especifica, estatus_operativo, observaciones
) VALUES (
  'PUB-033',
  'AIFA-DCS-SSC-102-2023',
  'DLPX4 Holding, S.A.P.I. de C.V.',
  'PSENE1-01',
  'Pantalla Sensorial',
  'E1',
  '10.50 / 0.00 / 5.25',
  NULL,
  'Edificio Terminal de Pasajeros - Módulo E1',
  'Operando',
  'Parte del paquete de 62 pantallas DLPX VEO MEDIA'
);
INSERT INTO espacios_publicitarios (
  id_unidad, contrato_id, arrendatario, codigo_nomenclatura, tipo_medio, modulo, nivel, superficie, ubicacion_especifica, estatus_operativo, observaciones
) VALUES (
  'PUB-034',
  'AIFA-DCS-SSC-102-2023',
  'DLPX4 Holding, S.A.P.I. de C.V.',
  'VWENE2-06',
  'VideoWall',
  'E2',
  '10.50 / 0.00 / 5.25',
  NULL,
  'Edificio Terminal de Pasajeros - Módulo E2',
  'Operando',
  'Parte del paquete de 62 pantallas DLPX VEO MEDIA'
);
INSERT INTO espacios_publicitarios (
  id_unidad, contrato_id, arrendatario, codigo_nomenclatura, tipo_medio, modulo, nivel, superficie, ubicacion_especifica, estatus_operativo, observaciones
) VALUES (
  'PUB-035',
  'AIFA-DCS-SSC-102-2023',
  'DLPX4 Holding, S.A.P.I. de C.V.',
  'PTEIE2-14',
  'Pantalla Tótem',
  'E2',
  '10.50 / 0.00 / 5.25',
  NULL,
  'Edificio Terminal de Pasajeros - Módulo E2',
  'Operando',
  'Parte del paquete de 62 pantallas DLPX VEO MEDIA'
);
INSERT INTO espacios_publicitarios (
  id_unidad, contrato_id, arrendatario, codigo_nomenclatura, tipo_medio, modulo, nivel, superficie, ubicacion_especifica, estatus_operativo, observaciones
) VALUES (
  'PUB-036',
  'AIFA-DCS-SSC-102-2023',
  'DLPX4 Holding, S.A.P.I. de C.V.',
  'PTEIE2-15',
  'Pantalla Tótem',
  'E2',
  '10.50 / 0.00 / 5.25',
  NULL,
  'Edificio Terminal de Pasajeros - Módulo E2',
  'Operando',
  'Parte del paquete de 62 pantallas DLPX VEO MEDIA'
);
INSERT INTO espacios_publicitarios (
  id_unidad, contrato_id, arrendatario, codigo_nomenclatura, tipo_medio, modulo, nivel, superficie, ubicacion_especifica, estatus_operativo, observaciones
) VALUES (
  'PUB-037',
  'AIFA-DCS-SSC-102-2023',
  'DLPX4 Holding, S.A.P.I. de C.V.',
  'VWEIE3-07',
  'VideoWall',
  'E3',
  '10.50 / 0.00 / 5.25',
  NULL,
  'Edificio Terminal de Pasajeros - Módulo E3',
  'Operando',
  'Parte del paquete de 62 pantallas DLPX VEO MEDIA'
);
INSERT INTO espacios_publicitarios (
  id_unidad, contrato_id, arrendatario, codigo_nomenclatura, tipo_medio, modulo, nivel, superficie, ubicacion_especifica, estatus_operativo, observaciones
) VALUES (
  'PUB-038',
  'AIFA-DCS-SSC-102-2023',
  'DLPX4 Holding, S.A.P.I. de C.V.',
  'PTEIE3-16',
  'Pantalla Tótem',
  'E3',
  '10.50 / 0.00 / 5.25',
  NULL,
  'Edificio Terminal de Pasajeros - Módulo E3',
  'Operando',
  'Parte del paquete de 62 pantallas DLPX VEO MEDIA'
);
INSERT INTO espacios_publicitarios (
  id_unidad, contrato_id, arrendatario, codigo_nomenclatura, tipo_medio, modulo, nivel, superficie, ubicacion_especifica, estatus_operativo, observaciones
) VALUES (
  'PUB-039',
  'AIFA-DCS-SSC-102-2023',
  'DLPX4 Holding, S.A.P.I. de C.V.',
  'PTEIE3-17',
  'Pantalla Tótem',
  'E3',
  '10.50 / 0.00 / 5.25',
  NULL,
  'Edificio Terminal de Pasajeros - Módulo E3',
  'Operando',
  'Parte del paquete de 62 pantallas DLPX VEO MEDIA'
);
INSERT INTO espacios_publicitarios (
  id_unidad, contrato_id, arrendatario, codigo_nomenclatura, tipo_medio, modulo, nivel, superficie, ubicacion_especifica, estatus_operativo, observaciones
) VALUES (
  'PUB-040',
  'AIFA-DCS-SSC-102-2023',
  'DLPX4 Holding, S.A.P.I. de C.V.',
  'PSEIE3-02',
  'Pantalla Sensorial',
  'E3',
  '10.50 / 0.00 / 5.25',
  NULL,
  'Edificio Terminal de Pasajeros - Módulo E3',
  'Operando',
  'Parte del paquete de 62 pantallas DLPX VEO MEDIA'
);
INSERT INTO espacios_publicitarios (
  id_unidad, contrato_id, arrendatario, codigo_nomenclatura, tipo_medio, modulo, nivel, superficie, ubicacion_especifica, estatus_operativo, observaciones
) VALUES (
  'PUB-041',
  'AIFA-DCS-SSC-102-2023',
  'DLPX4 Holding, S.A.P.I. de C.V.',
  'PCEIE4-01',
  'Pantalla Circular',
  'E4',
  '10.50 / 0.00 / 5.25',
  NULL,
  'Edificio Terminal de Pasajeros - Módulo E4',
  'Operando',
  'Parte del paquete de 62 pantallas DLPX VEO MEDIA'
);
INSERT INTO espacios_publicitarios (
  id_unidad, contrato_id, arrendatario, codigo_nomenclatura, tipo_medio, modulo, nivel, superficie, ubicacion_especifica, estatus_operativo, observaciones
) VALUES (
  'PUB-042',
  'AIFA-DCS-SSC-102-2023',
  'DLPX4 Holding, S.A.P.I. de C.V.',
  'VWEIE4-08',
  'VideoWall',
  'E4',
  '10.50 / 0.00 / 5.25',
  NULL,
  'Edificio Terminal de Pasajeros - Módulo E4',
  'Operando',
  'Parte del paquete de 62 pantallas DLPX VEO MEDIA'
);
INSERT INTO espacios_publicitarios (
  id_unidad, contrato_id, arrendatario, codigo_nomenclatura, tipo_medio, modulo, nivel, superficie, ubicacion_especifica, estatus_operativo, observaciones
) VALUES (
  'PUB-043',
  'AIFA-DCS-SSC-102-2023',
  'DLPX4 Holding, S.A.P.I. de C.V.',
  'VWEIE4-09',
  'VideoWall',
  'E4',
  '10.50 / 0.00 / 5.25',
  NULL,
  'Edificio Terminal de Pasajeros - Módulo E4',
  'Operando',
  'Parte del paquete de 62 pantallas DLPX VEO MEDIA'
);
INSERT INTO espacios_publicitarios (
  id_unidad, contrato_id, arrendatario, codigo_nomenclatura, tipo_medio, modulo, nivel, superficie, ubicacion_especifica, estatus_operativo, observaciones
) VALUES (
  'PUB-044',
  'AIFA-DCS-SSC-102-2023',
  'DLPX4 Holding, S.A.P.I. de C.V.',
  'PTEIE4-18',
  'Pantalla Tótem',
  'E4',
  '10.50 / 0.00 / 5.25',
  NULL,
  'Edificio Terminal de Pasajeros - Módulo E4',
  'Operando',
  'Parte del paquete de 62 pantallas DLPX VEO MEDIA'
);
INSERT INTO espacios_publicitarios (
  id_unidad, contrato_id, arrendatario, codigo_nomenclatura, tipo_medio, modulo, nivel, superficie, ubicacion_especifica, estatus_operativo, observaciones
) VALUES (
  'PUB-045',
  'AIFA-DCS-SSC-102-2023',
  'DLPX4 Holding, S.A.P.I. de C.V.',
  'PTEIE4-19',
  'Pantalla Tótem',
  'E4',
  '10.50 / 0.00 / 5.25',
  NULL,
  'Edificio Terminal de Pasajeros - Módulo E4',
  'Operando',
  'Parte del paquete de 62 pantallas DLPX VEO MEDIA'
);
INSERT INTO espacios_publicitarios (
  id_unidad, contrato_id, arrendatario, codigo_nomenclatura, tipo_medio, modulo, nivel, superficie, ubicacion_especifica, estatus_operativo, observaciones
) VALUES (
  'PUB-046',
  'AIFA-DCS-SSC-102-2023',
  'DLPX4 Holding, S.A.P.I. de C.V.',
  'VWEIF-10',
  'VideoWall',
  'F',
  '10.50 / 0.00 / 5.25',
  NULL,
  'Edificio Terminal de Pasajeros - Módulo F',
  'Operando',
  'Parte del paquete de 62 pantallas DLPX VEO MEDIA'
);
INSERT INTO espacios_publicitarios (
  id_unidad, contrato_id, arrendatario, codigo_nomenclatura, tipo_medio, modulo, nivel, superficie, ubicacion_especifica, estatus_operativo, observaciones
) VALUES (
  'PUB-047',
  'AIFA-DCS-SSC-102-2023',
  'DLPX4 Holding, S.A.P.I. de C.V.',
  'PTEIF-21',
  'Pantalla Tótem',
  'F',
  '10.50 / 0.00 / 5.25',
  NULL,
  'Edificio Terminal de Pasajeros - Módulo F',
  'Operando',
  'Parte del paquete de 62 pantallas DLPX VEO MEDIA'
);
INSERT INTO espacios_publicitarios (
  id_unidad, contrato_id, arrendatario, codigo_nomenclatura, tipo_medio, modulo, nivel, superficie, ubicacion_especifica, estatus_operativo, observaciones
) VALUES (
  'PUB-048',
  'AIFA-DCS-SSC-102-2023',
  'DLPX4 Holding, S.A.P.I. de C.V.',
  'PTEIF-22',
  'Pantalla Tótem',
  'F',
  '10.50 / 0.00 / 5.25',
  NULL,
  'Edificio Terminal de Pasajeros - Módulo F',
  'Operando',
  'Parte del paquete de 62 pantallas DLPX VEO MEDIA'
);
INSERT INTO espacios_publicitarios (
  id_unidad, contrato_id, arrendatario, codigo_nomenclatura, tipo_medio, modulo, nivel, superficie, ubicacion_especifica, estatus_operativo, observaciones
) VALUES (
  'PUB-049',
  'AIFA-DCS-SSC-102-2023',
  'DLPX4 Holding, S.A.P.I. de C.V.',
  'PTEIF-23',
  'Pantalla Tótem',
  'F',
  '10.50 / 0.00 / 5.25',
  NULL,
  'Edificio Terminal de Pasajeros - Módulo F',
  'Operando',
  'Parte del paquete de 62 pantallas DLPX VEO MEDIA'
);
INSERT INTO espacios_publicitarios (
  id_unidad, contrato_id, arrendatario, codigo_nomenclatura, tipo_medio, modulo, nivel, superficie, ubicacion_especifica, estatus_operativo, observaciones
) VALUES (
  'PUB-050',
  'AIFA-DCS-SSC-102-2023',
  'DLPX4 Holding, S.A.P.I. de C.V.',
  'PTEIF-24',
  'Pantalla Tótem',
  'F',
  '10.50 / 0.00 / 5.25',
  NULL,
  'Edificio Terminal de Pasajeros - Módulo F',
  'Operando',
  'Parte del paquete de 62 pantallas DLPX VEO MEDIA'
);
INSERT INTO espacios_publicitarios (
  id_unidad, contrato_id, arrendatario, codigo_nomenclatura, tipo_medio, modulo, nivel, superficie, ubicacion_especifica, estatus_operativo, observaciones
) VALUES (
  'PUB-051',
  'AIFA-DCS-SSC-102-2023',
  'DLPX4 Holding, S.A.P.I. de C.V.',
  'VWEIH-15',
  'VideoWall',
  'H',
  '10.50 / 0.00 / 5.25',
  NULL,
  'Edificio Terminal de Pasajeros - Módulo H',
  'Operando',
  'Parte del paquete de 62 pantallas DLPX VEO MEDIA'
);
INSERT INTO espacios_publicitarios (
  id_unidad, contrato_id, arrendatario, codigo_nomenclatura, tipo_medio, modulo, nivel, superficie, ubicacion_especifica, estatus_operativo, observaciones
) VALUES (
  'PUB-052',
  'AIFA-DCS-SSC-102-2023',
  'DLPX4 Holding, S.A.P.I. de C.V.',
  'VWEIH-16',
  'VideoWall',
  'H',
  '10.50 / 0.00 / 5.25',
  NULL,
  'Edificio Terminal de Pasajeros - Módulo H',
  'Operando',
  'Parte del paquete de 62 pantallas DLPX VEO MEDIA'
);
INSERT INTO espacios_publicitarios (
  id_unidad, contrato_id, arrendatario, codigo_nomenclatura, tipo_medio, modulo, nivel, superficie, ubicacion_especifica, estatus_operativo, observaciones
) VALUES (
  'PUB-053',
  'AIFA-DCS-SSC-102-2023',
  'DLPX4 Holding, S.A.P.I. de C.V.',
  'PTEIH-37',
  'Pantalla Tótem',
  'H',
  '10.50 / 0.00 / 5.25',
  NULL,
  'Edificio Terminal de Pasajeros - Módulo H',
  'Operando',
  'Parte del paquete de 62 pantallas DLPX VEO MEDIA'
);
INSERT INTO espacios_publicitarios (
  id_unidad, contrato_id, arrendatario, codigo_nomenclatura, tipo_medio, modulo, nivel, superficie, ubicacion_especifica, estatus_operativo, observaciones
) VALUES (
  'PUB-054',
  'AIFA-DCS-SSC-102-2023',
  'DLPX4 Holding, S.A.P.I. de C.V.',
  'PTEIH-38',
  'Pantalla Tótem',
  'H',
  '10.50 / 0.00 / 5.25',
  NULL,
  'Edificio Terminal de Pasajeros - Módulo H',
  'Operando',
  'Parte del paquete de 62 pantallas DLPX VEO MEDIA'
);
INSERT INTO espacios_publicitarios (
  id_unidad, contrato_id, arrendatario, codigo_nomenclatura, tipo_medio, modulo, nivel, superficie, ubicacion_especifica, estatus_operativo, observaciones
) VALUES (
  'PUB-055',
  'AIFA-DCS-SSC-102-2023',
  'DLPX4 Holding, S.A.P.I. de C.V.',
  'PCEIH-01',
  'Pantalla Circular',
  'H',
  '10.50 / 0.00 / 5.25',
  NULL,
  'Edificio Terminal de Pasajeros - Módulo H',
  'Operando',
  'Parte del paquete de 62 pantallas DLPX VEO MEDIA'
);
INSERT INTO espacios_publicitarios (
  id_unidad, contrato_id, arrendatario, codigo_nomenclatura, tipo_medio, modulo, nivel, superficie, ubicacion_especifica, estatus_operativo, observaciones
) VALUES (
  'PUB-056',
  'AIFA-DCS-SSC-102-2023',
  'DLPX4 Holding, S.A.P.I. de C.V.',
  'VWENI-17',
  'VideoWall',
  'I',
  '10.50 / 0.00 / 5.25',
  NULL,
  'Edificio Terminal de Pasajeros - Módulo I',
  'Operando',
  'Parte del paquete de 62 pantallas DLPX VEO MEDIA'
);
INSERT INTO espacios_publicitarios (
  id_unidad, contrato_id, arrendatario, codigo_nomenclatura, tipo_medio, modulo, nivel, superficie, ubicacion_especifica, estatus_operativo, observaciones
) VALUES (
  'PUB-057',
  'AIFA-DCS-SSC-102-2023',
  'DLPX4 Holding, S.A.P.I. de C.V.',
  'VWENI-18',
  'VideoWall',
  'I',
  '10.50 / 0.00 / 5.25',
  NULL,
  'Edificio Terminal de Pasajeros - Módulo I',
  'Operando',
  'Parte del paquete de 62 pantallas DLPX VEO MEDIA'
);
INSERT INTO espacios_publicitarios (
  id_unidad, contrato_id, arrendatario, codigo_nomenclatura, tipo_medio, modulo, nivel, superficie, ubicacion_especifica, estatus_operativo, observaciones
) VALUES (
  'PUB-058',
  'AIFA-DCS-SSC-102-2023',
  'DLPX4 Holding, S.A.P.I. de C.V.',
  'PTENA-01',
  'Pantalla Tótem',
  'A',
  '10.50 / 0.00 / 5.25',
  NULL,
  'Edificio Terminal de Pasajeros - Módulo A',
  'Operando',
  'Parte del paquete de 62 pantallas DLPX VEO MEDIA'
);
INSERT INTO espacios_publicitarios (
  id_unidad, contrato_id, arrendatario, codigo_nomenclatura, tipo_medio, modulo, nivel, superficie, ubicacion_especifica, estatus_operativo, observaciones
) VALUES (
  'PUB-059',
  'AIFA-DCS-SSC-102-2023',
  'DLPX4 Holding, S.A.P.I. de C.V.',
  'PTENA-02',
  'Pantalla Tótem',
  'A',
  '10.50 / 0.00 / 5.25',
  NULL,
  'Edificio Terminal de Pasajeros - Módulo A',
  'Operando',
  'Parte del paquete de 62 pantallas DLPX VEO MEDIA'
);
INSERT INTO espacios_publicitarios (
  id_unidad, contrato_id, arrendatario, codigo_nomenclatura, tipo_medio, modulo, nivel, superficie, ubicacion_especifica, estatus_operativo, observaciones
) VALUES (
  'PUB-060',
  'AIFA-DCS-SSC-102-2023',
  'DLPX4 Holding, S.A.P.I. de C.V.',
  'PTENA-03',
  'Pantalla Tótem',
  'A',
  '10.50 / 0.00 / 5.25',
  NULL,
  'Edificio Terminal de Pasajeros - Módulo A',
  'Operando',
  'Parte del paquete de 62 pantallas DLPX VEO MEDIA'
);
INSERT INTO espacios_publicitarios (
  id_unidad, contrato_id, arrendatario, codigo_nomenclatura, tipo_medio, modulo, nivel, superficie, ubicacion_especifica, estatus_operativo, observaciones
) VALUES (
  'PUB-061',
  'AIFA-DCS-SSC-GEP-137-2025',
  'DLPX4 Holding, S.A.P.I. de C.V.',
  'EFANL-168',
  'Módulo / Kiosko con Personal',
  'A',
  '10.50',
  1,
  'Módulo A',
  'Sin operar',
  'Módulo comercial publicitario'
);
INSERT INTO espacios_publicitarios (
  id_unidad, contrato_id, arrendatario, codigo_nomenclatura, tipo_medio, modulo, nivel, superficie, ubicacion_especifica, estatus_operativo, observaciones
) VALUES (
  'PUB-062',
  'AIFA-DCS-SSC-GEP-173-2026',
  'Marc Contac Center, S.A. de C.V.',
  'SENA-MA01',
  'Módulo / Kiosko con Personal',
  'A',
  '10.50',
  1,
  'Módulo A',
  'Operando',
  'Marc Contac Center'
);
INSERT INTO espacios_publicitarios (
  id_unidad, contrato_id, arrendatario, codigo_nomenclatura, tipo_medio, modulo, nivel, superficie, ubicacion_especifica, estatus_operativo, observaciones
) VALUES (
  'PUB-063',
  'AIFA-DCS-SSC-GEP-079-2026',
  'DLPX4 Holding, S.A.P.I. de C.V.',
  'PCEMA-01',
  'Pantalla Exterior',
  'Polígono Aeroportuario',
  'Exterior',
  48.79,
  'Polígono Aeroportuario / Vialidades',
  'Operando',
  'Publicidad Exterior Digital'
);
INSERT INTO espacios_publicitarios (
  id_unidad, contrato_id, arrendatario, codigo_nomenclatura, tipo_medio, modulo, nivel, superficie, ubicacion_especifica, estatus_operativo, observaciones
) VALUES (
  'PUB-064',
  'AIFA-DCS-SSC-GEP-079-2026',
  'DLPX4 Holding, S.A.P.I. de C.V.',
  'PCEMB-01',
  'Pantalla Exterior',
  'Polígono Aeroportuario',
  'Exterior',
  48.79,
  'Polígono Aeroportuario / Vialidades',
  'Operando',
  'Publicidad Exterior Digital'
);
INSERT INTO espacios_publicitarios (
  id_unidad, contrato_id, arrendatario, codigo_nomenclatura, tipo_medio, modulo, nivel, superficie, ubicacion_especifica, estatus_operativo, observaciones
) VALUES (
  'PUB-065',
  'AIFA-DCS-SSC-GEP-079-2026',
  'DLPX4 Holding, S.A.P.I. de C.V.',
  'PCEMA-02',
  'Pantalla Exterior',
  'Polígono Aeroportuario',
  'Exterior',
  48.79,
  'Polígono Aeroportuario / Vialidades',
  'Operando',
  'Publicidad Exterior Digital'
);
INSERT INTO espacios_publicitarios (
  id_unidad, contrato_id, arrendatario, codigo_nomenclatura, tipo_medio, modulo, nivel, superficie, ubicacion_especifica, estatus_operativo, observaciones
) VALUES (
  'PUB-066',
  'AIFA-DCS-SSC-GEP-079-2026',
  'DLPX4 Holding, S.A.P.I. de C.V.',
  'PCEMB-02',
  'Pantalla Exterior',
  'Polígono Aeroportuario',
  'Exterior',
  48.79,
  'Polígono Aeroportuario / Vialidades',
  'Operando',
  'Publicidad Exterior Digital'
);
INSERT INTO espacios_publicitarios (
  id_unidad, contrato_id, arrendatario, codigo_nomenclatura, tipo_medio, modulo, nivel, superficie, ubicacion_especifica, estatus_operativo, observaciones
) VALUES (
  'PUB-067',
  'AIFA-DCS-SSC-GEP-079-2026',
  'DLPX4 Holding, S.A.P.I. de C.V.',
  'PCEMA-03',
  'Pantalla Exterior',
  'Polígono Aeroportuario',
  'Exterior',
  48.79,
  'Polígono Aeroportuario / Vialidades',
  'Operando',
  'Publicidad Exterior Digital'
);
INSERT INTO espacios_publicitarios (
  id_unidad, contrato_id, arrendatario, codigo_nomenclatura, tipo_medio, modulo, nivel, superficie, ubicacion_especifica, estatus_operativo, observaciones
) VALUES (
  'PUB-068',
  'AIFA-DCS-SSC-GEP-079-2026',
  'DLPX4 Holding, S.A.P.I. de C.V.',
  'PCEMB-03',
  'Pantalla Exterior',
  'Polígono Aeroportuario',
  'Exterior',
  48.79,
  'Polígono Aeroportuario / Vialidades',
  'Operando',
  'Publicidad Exterior Digital'
);
INSERT INTO espacios_publicitarios (
  id_unidad, contrato_id, arrendatario, codigo_nomenclatura, tipo_medio, modulo, nivel, superficie, ubicacion_especifica, estatus_operativo, observaciones
) VALUES (
  'PUB-069',
  'AIFA-DCS-SSC-GEP-079-2026',
  'DLPX4 Holding, S.A.P.I. de C.V.',
  'PCTVP-01',
  'Pantalla Vialidad / TVP',
  'Polígono Aeroportuario',
  'Exterior',
  48.79,
  'Polígono Aeroportuario / Vialidades',
  'Operando',
  'Publicidad Exterior Digital'
);
INSERT INTO espacios_publicitarios (
  id_unidad, contrato_id, arrendatario, codigo_nomenclatura, tipo_medio, modulo, nivel, superficie, ubicacion_especifica, estatus_operativo, observaciones
) VALUES (
  'PUB-070',
  'AIFA-DCS-SSC-GEP-079-2026',
  'DLPX4 Holding, S.A.P.I. de C.V.',
  'PCTVP-02',
  'Pantalla Vialidad / TVP',
  'Polígono Aeroportuario',
  'Exterior',
  48.79,
  'Polígono Aeroportuario / Vialidades',
  'Operando',
  'Publicidad Exterior Digital'
);
INSERT INTO espacios_publicitarios (
  id_unidad, contrato_id, arrendatario, codigo_nomenclatura, tipo_medio, modulo, nivel, superficie, ubicacion_especifica, estatus_operativo, observaciones
) VALUES (
  'PUB-071',
  'AIFA-DCS-SSC-GEP-079-2026',
  'DLPX4 Holding, S.A.P.I. de C.V.',
  'PCTVP-03',
  'Pantalla Vialidad / TVP',
  'Polígono Aeroportuario',
  'Exterior',
  48.79,
  'Polígono Aeroportuario / Vialidades',
  'Operando',
  'Publicidad Exterior Digital'
);
INSERT INTO espacios_publicitarios (
  id_unidad, contrato_id, arrendatario, codigo_nomenclatura, tipo_medio, modulo, nivel, superficie, ubicacion_especifica, estatus_operativo, observaciones
) VALUES (
  'PUB-072',
  'AIFA-DCS-SSC-GEP-079-2026',
  'DLPX4 Holding, S.A.P.I. de C.V.',
  'PCTVP-04',
  'Pantalla Vialidad / TVP',
  'Polígono Aeroportuario',
  'Exterior',
  48.79,
  'Polígono Aeroportuario / Vialidades',
  'Operando',
  'Publicidad Exterior Digital'
);
INSERT INTO espacios_publicitarios (
  id_unidad, contrato_id, arrendatario, codigo_nomenclatura, tipo_medio, modulo, nivel, superficie, ubicacion_especifica, estatus_operativo, observaciones
) VALUES (
  'PUB-073',
  'AIFA-DCS-SSC-GEP-079-2026',
  'DLPX4 Holding, S.A.P.I. de C.V.',
  'PETELL-01',
  'Pantalla Eje Troncal / TELL',
  'Polígono Aeroportuario',
  'Exterior',
  48.79,
  'Polígono Aeroportuario / Vialidades',
  'Operando',
  'Publicidad Exterior Digital'
);
INSERT INTO espacios_publicitarios (
  id_unidad, contrato_id, arrendatario, codigo_nomenclatura, tipo_medio, modulo, nivel, superficie, ubicacion_especifica, estatus_operativo, observaciones
) VALUES (
  'PUB-074',
  'AIFA-DCS-SSC-GEP-079-2026',
  'DLPX4 Holding, S.A.P.I. de C.V.',
  'PETELL-02',
  'Pantalla Eje Troncal / TELL',
  'Polígono Aeroportuario',
  'Exterior',
  48.79,
  'Polígono Aeroportuario / Vialidades',
  'Operando',
  'Publicidad Exterior Digital'
);
INSERT INTO espacios_publicitarios (
  id_unidad, contrato_id, arrendatario, codigo_nomenclatura, tipo_medio, modulo, nivel, superficie, ubicacion_especifica, estatus_operativo, observaciones
) VALUES (
  'PUB-075',
  'AIFA-DCS-SSC-GEP-079-2026',
  'DLPX4 Holding, S.A.P.I. de C.V.',
  'PETELL-03',
  'Pantalla Eje Troncal / TELL',
  'Polígono Aeroportuario',
  'Exterior',
  48.79,
  'Polígono Aeroportuario / Vialidades',
  'Operando',
  'Publicidad Exterior Digital'
);
INSERT INTO espacios_publicitarios (
  id_unidad, contrato_id, arrendatario, codigo_nomenclatura, tipo_medio, modulo, nivel, superficie, ubicacion_especifica, estatus_operativo, observaciones
) VALUES (
  'PUB-076',
  'AIFA-DCS-SSC-GEP-079-2026',
  'DLPX4 Holding, S.A.P.I. de C.V.',
  'PETELL-04',
  'Pantalla Eje Troncal / TELL',
  'Polígono Aeroportuario',
  'Exterior',
  48.79,
  'Polígono Aeroportuario / Vialidades',
  'Operando',
  'Publicidad Exterior Digital'
);
INSERT INTO espacios_publicitarios (
  id_unidad, contrato_id, arrendatario, codigo_nomenclatura, tipo_medio, modulo, nivel, superficie, ubicacion_especifica, estatus_operativo, observaciones
) VALUES (
  'PUB-077',
  'AIFA-DCS-SSC-GEP-079-2026',
  'DLPX4 Holding, S.A.P.I. de C.V.',
  'PETELL-05',
  'Pantalla Eje Troncal / TELL',
  'Polígono Aeroportuario',
  'Exterior',
  48.79,
  'Polígono Aeroportuario / Vialidades',
  'Operando',
  'Publicidad Exterior Digital'
);
INSERT INTO espacios_publicitarios (
  id_unidad, contrato_id, arrendatario, codigo_nomenclatura, tipo_medio, modulo, nivel, superficie, ubicacion_especifica, estatus_operativo, observaciones
) VALUES (
  'PUB-078',
  'AIFA-DCS-SSC-GEP-079-2026',
  'DLPX4 Holding, S.A.P.I. de C.V.',
  'PETELL-06',
  'Pantalla Eje Troncal / TELL',
  'Polígono Aeroportuario',
  'Exterior',
  48.79,
  'Polígono Aeroportuario / Vialidades',
  'Operando',
  'Publicidad Exterior Digital'
);
INSERT INTO espacios_publicitarios (
  id_unidad, contrato_id, arrendatario, codigo_nomenclatura, tipo_medio, modulo, nivel, superficie, ubicacion_especifica, estatus_operativo, observaciones
) VALUES (
  'PUB-079',
  'AIFA-DCS-SSC-GEP-079-2026',
  'DLPX4 Holding, S.A.P.I. de C.V.',
  'PAC-01',
  'Pantalla Acceso / PAC',
  'Polígono Aeroportuario',
  'Exterior',
  48.79,
  'Polígono Aeroportuario / Vialidades',
  'Operando',
  'Publicidad Exterior Digital'
);
INSERT INTO espacios_publicitarios (
  id_unidad, contrato_id, arrendatario, codigo_nomenclatura, tipo_medio, modulo, nivel, superficie, ubicacion_especifica, estatus_operativo, observaciones
) VALUES (
  'PUB-080',
  'AIFA-DCS-SSC-GEP-107-2026',
  'Impacto 360 Estrategias y Medios, S.A.P.I. de C.V.',
  'EP-JE-01',
  'Estructura Especial 3D',
  'Jardín Exterior',
  '0.00',
  16,
  'Jardín Exterior',
  'Operando',
  'Bolsa de Liverpool'
);
INSERT INTO espacios_publicitarios (
  id_unidad, contrato_id, arrendatario, codigo_nomenclatura, tipo_medio, modulo, nivel, superficie, ubicacion_especifica, estatus_operativo, observaciones
) VALUES (
  'PUB-081',
  'AIFA-DCS-SSC-GEP-108-2026',
  'Impacto 360 Estrategias y Medios, S.A.P.I. de C.V.',
  'EP-CTITT-02',
  'Wall Graphic / Columna',
  'TITT',
  'Planta Principal',
  28.6,
  'Terminal Intermodal de Transporte Terrestre (TITT)',
  'Operando',
  'Columna enfrente de la TITT'
);
INSERT INTO espacios_publicitarios (
  id_unidad, contrato_id, arrendatario, codigo_nomenclatura, tipo_medio, modulo, nivel, superficie, ubicacion_especifica, estatus_operativo, observaciones
) VALUES (
  'PUB-082',
  'AIFA-DCS-SSC-GEP-109-2026',
  'Impacto 360 Estrategias y Medios, S.A.P.I. de C.V.',
  'EP-VLLEIE4-01',
  'Vitral Publicitario',
  'E4',
  '0.00',
  18.51,
  'Módulo E4 (Área Gym)',
  'Operando',
  'Vitral Gym'
);
INSERT INTO espacios_publicitarios (
  id_unidad, contrato_id, arrendatario, codigo_nomenclatura, tipo_medio, modulo, nivel, superficie, ubicacion_especifica, estatus_operativo, observaciones
) VALUES (
  'PUB-083',
  'AIFA-DCS-SSC-GEP-110-2026',
  'Impacto 360 Estrategias y Medios, S.A.P.I. de C.V.',
  'EP-VPM-01',
  'Vitral Publicitario',
  'Plaza Mexicana',
  '0.00',
  119.45,
  'Plaza Mexicana',
  'Operando',
  'Vitral Plaza Mexicana'
);
INSERT INTO espacios_publicitarios (
  id_unidad, contrato_id, arrendatario, codigo_nomenclatura, tipo_medio, modulo, nivel, superficie, ubicacion_especifica, estatus_operativo, observaciones
) VALUES (
  'PUB-084',
  'AIFA-DCS-SSC-GEP-137-2026',
  'Impacto 360 Estrategias y Medios, S.A.P.I. de C.V.',
  'EP-BENI-01',
  'Muro Publicitario',
  'I',
  '10.50',
  43.5,
  'Módulo I - Nivel 10.50',
  'Operando',
  'Muro de gran formato interior'
);
INSERT INTO espacios_publicitarios (
  id_unidad, contrato_id, arrendatario, codigo_nomenclatura, tipo_medio, modulo, nivel, superficie, ubicacion_especifica, estatus_operativo, observaciones
) VALUES (
  'PUB-085',
  'AIFA-DCS-SSC-GEP-137-2026',
  'Impacto 360 Estrategias y Medios, S.A.P.I. de C.V.',
  'EP-SANL-4',
  'Muro Publicitario',
  'L',
  '10.50',
  43.5,
  'Módulo L - Nivel 10.50',
  'Operando',
  'Muro de gran formato interior'
);
INSERT INTO espacios_publicitarios (
  id_unidad, contrato_id, arrendatario, codigo_nomenclatura, tipo_medio, modulo, nivel, superficie, ubicacion_especifica, estatus_operativo, observaciones
) VALUES (
  'PUB-086',
  'AIFA-DCS-SSC-GEP-137-2026',
  'Impacto 360 Estrategias y Medios, S.A.P.I. de C.V.',
  'EP-SANM-3',
  'Muro Publicitario',
  'M',
  '10.50',
  43.5,
  'Módulo M - Nivel 10.50',
  'Operando',
  'Muro de gran formato interior'
);
INSERT INTO espacios_publicitarios (
  id_unidad, contrato_id, arrendatario, codigo_nomenclatura, tipo_medio, modulo, nivel, superficie, ubicacion_especifica, estatus_operativo, observaciones
) VALUES (
  'PUB-087',
  'AIFA-DCS-SSC-GEP-137-2026',
  'Impacto 360 Estrategias y Medios, S.A.P.I. de C.V.',
  'EP-SANM-4',
  'Muro Publicitario',
  'M',
  '10.50',
  43.5,
  'Módulo M - Nivel 10.50',
  'Operando',
  'Muro de gran formato interior'
);
INSERT INTO espacios_publicitarios (
  id_unidad, contrato_id, arrendatario, codigo_nomenclatura, tipo_medio, modulo, nivel, superficie, ubicacion_especifica, estatus_operativo, observaciones
) VALUES (
  'PUB-088',
  'AIFA-DCS-SSC-GEP-139-2026',
  'Impacto 360 Estrategias y Medios, S.A.P.I. de C.V.',
  'EP-SANL-3',
  'Muro Publicitario',
  'L',
  '10.50',
  37,
  'Módulo L - Nivel 10.50',
  'Operando',
  'Muro interior'
);
INSERT INTO espacios_publicitarios (
  id_unidad, contrato_id, arrendatario, codigo_nomenclatura, tipo_medio, modulo, nivel, superficie, ubicacion_especifica, estatus_operativo, observaciones
) VALUES (
  'PUB-089',
  'AIFA-DCS-SSC-GEP-139-2026',
  'Impacto 360 Estrategias y Medios, S.A.P.I. de C.V.',
  'EP-MSEND-01',
  'Muro Publicitario',
  'D',
  '5.25',
  37,
  'Módulo D - Nivel 5.25',
  'Operando',
  'Muro interior'
);
INSERT INTO espacios_publicitarios (
  id_unidad, contrato_id, arrendatario, codigo_nomenclatura, tipo_medio, modulo, nivel, superficie, ubicacion_especifica, estatus_operativo, observaciones
) VALUES (
  'PUB-090',
  'AIFA-DCS-SSC-GEP-121-2026',
  'Impacto 360 Estrategias y Medios, S.A.P.I. de C.V.',
  'EP-BZEIJK-01',
  'Estructura Publicitaria',
  'I, J, K',
  '10.50',
  16.2,
  'Zona de Embarque I, J, K',
  'Operando',
  'Estructura 1 de 19'
);
INSERT INTO espacios_publicitarios (
  id_unidad, contrato_id, arrendatario, codigo_nomenclatura, tipo_medio, modulo, nivel, superficie, ubicacion_especifica, estatus_operativo, observaciones
) VALUES (
  'PUB-091',
  'AIFA-DCS-SSC-GEP-121-2026',
  'Impacto 360 Estrategias y Medios, S.A.P.I. de C.V.',
  'EP-BZEIJK-02',
  'Estructura Publicitaria',
  'I, J, K',
  '10.50',
  16.2,
  'Zona de Embarque I, J, K',
  'Operando',
  'Estructura 2 de 19'
);
INSERT INTO espacios_publicitarios (
  id_unidad, contrato_id, arrendatario, codigo_nomenclatura, tipo_medio, modulo, nivel, superficie, ubicacion_especifica, estatus_operativo, observaciones
) VALUES (
  'PUB-092',
  'AIFA-DCS-SSC-GEP-121-2026',
  'Impacto 360 Estrategias y Medios, S.A.P.I. de C.V.',
  'EP-BZEIJK-03',
  'Estructura Publicitaria',
  'I, J, K',
  '10.50',
  16.2,
  'Zona de Embarque I, J, K',
  'Operando',
  'Estructura 3 de 19'
);
INSERT INTO espacios_publicitarios (
  id_unidad, contrato_id, arrendatario, codigo_nomenclatura, tipo_medio, modulo, nivel, superficie, ubicacion_especifica, estatus_operativo, observaciones
) VALUES (
  'PUB-093',
  'AIFA-DCS-SSC-GEP-121-2026',
  'Impacto 360 Estrategias y Medios, S.A.P.I. de C.V.',
  'EP-BZEIJK-04',
  'Estructura Publicitaria',
  'I, J, K',
  '10.50',
  16.2,
  'Zona de Embarque I, J, K',
  'Operando',
  'Estructura 4 de 19'
);
INSERT INTO espacios_publicitarios (
  id_unidad, contrato_id, arrendatario, codigo_nomenclatura, tipo_medio, modulo, nivel, superficie, ubicacion_especifica, estatus_operativo, observaciones
) VALUES (
  'PUB-094',
  'AIFA-DCS-SSC-GEP-121-2026',
  'Impacto 360 Estrategias y Medios, S.A.P.I. de C.V.',
  'EP-BZEIJK-05',
  'Estructura Publicitaria',
  'I, J, K',
  '10.50',
  16.2,
  'Zona de Embarque I, J, K',
  'Operando',
  'Estructura 5 de 19'
);
INSERT INTO espacios_publicitarios (
  id_unidad, contrato_id, arrendatario, codigo_nomenclatura, tipo_medio, modulo, nivel, superficie, ubicacion_especifica, estatus_operativo, observaciones
) VALUES (
  'PUB-095',
  'AIFA-DCS-SSC-GEP-121-2026',
  'Impacto 360 Estrategias y Medios, S.A.P.I. de C.V.',
  'EP-BZEIJK-06',
  'Estructura Publicitaria',
  'I, J, K',
  '10.50',
  16.2,
  'Zona de Embarque I, J, K',
  'Operando',
  'Estructura 6 de 19'
);
INSERT INTO espacios_publicitarios (
  id_unidad, contrato_id, arrendatario, codigo_nomenclatura, tipo_medio, modulo, nivel, superficie, ubicacion_especifica, estatus_operativo, observaciones
) VALUES (
  'PUB-096',
  'AIFA-DCS-SSC-GEP-121-2026',
  'Impacto 360 Estrategias y Medios, S.A.P.I. de C.V.',
  'EP-BZEIJK-07',
  'Estructura Publicitaria',
  'I, J, K',
  '10.50',
  16.2,
  'Zona de Embarque I, J, K',
  'Operando',
  'Estructura 7 de 19'
);
INSERT INTO espacios_publicitarios (
  id_unidad, contrato_id, arrendatario, codigo_nomenclatura, tipo_medio, modulo, nivel, superficie, ubicacion_especifica, estatus_operativo, observaciones
) VALUES (
  'PUB-097',
  'AIFA-DCS-SSC-GEP-121-2026',
  'Impacto 360 Estrategias y Medios, S.A.P.I. de C.V.',
  'EP-BZEIJK-08',
  'Estructura Publicitaria',
  'I, J, K',
  '10.50',
  16.2,
  'Zona de Embarque I, J, K',
  'Operando',
  'Estructura 8 de 19'
);
INSERT INTO espacios_publicitarios (
  id_unidad, contrato_id, arrendatario, codigo_nomenclatura, tipo_medio, modulo, nivel, superficie, ubicacion_especifica, estatus_operativo, observaciones
) VALUES (
  'PUB-098',
  'AIFA-DCS-SSC-GEP-121-2026',
  'Impacto 360 Estrategias y Medios, S.A.P.I. de C.V.',
  'EP-BZEIJK-09',
  'Estructura Publicitaria',
  'I, J, K',
  '10.50',
  16.2,
  'Zona de Embarque I, J, K',
  'Operando',
  'Estructura 9 de 19'
);
INSERT INTO espacios_publicitarios (
  id_unidad, contrato_id, arrendatario, codigo_nomenclatura, tipo_medio, modulo, nivel, superficie, ubicacion_especifica, estatus_operativo, observaciones
) VALUES (
  'PUB-099',
  'AIFA-DCS-SSC-GEP-121-2026',
  'Impacto 360 Estrategias y Medios, S.A.P.I. de C.V.',
  'EP-BZEIJK-10',
  'Estructura Publicitaria',
  'I, J, K',
  '10.50',
  16.2,
  'Zona de Embarque I, J, K',
  'Operando',
  'Estructura 10 de 19'
);
INSERT INTO espacios_publicitarios (
  id_unidad, contrato_id, arrendatario, codigo_nomenclatura, tipo_medio, modulo, nivel, superficie, ubicacion_especifica, estatus_operativo, observaciones
) VALUES (
  'PUB-100',
  'AIFA-DCS-SSC-GEP-121-2026',
  'Impacto 360 Estrategias y Medios, S.A.P.I. de C.V.',
  'EP-BZEIJK-11',
  'Estructura Publicitaria',
  'I, J, K',
  '10.50',
  16.2,
  'Zona de Embarque I, J, K',
  'Operando',
  'Estructura 11 de 19'
);
INSERT INTO espacios_publicitarios (
  id_unidad, contrato_id, arrendatario, codigo_nomenclatura, tipo_medio, modulo, nivel, superficie, ubicacion_especifica, estatus_operativo, observaciones
) VALUES (
  'PUB-101',
  'AIFA-DCS-SSC-GEP-121-2026',
  'Impacto 360 Estrategias y Medios, S.A.P.I. de C.V.',
  'EP-BZEIJK-12',
  'Estructura Publicitaria',
  'I, J, K',
  '10.50',
  16.2,
  'Zona de Embarque I, J, K',
  'Operando',
  'Estructura 12 de 19'
);
INSERT INTO espacios_publicitarios (
  id_unidad, contrato_id, arrendatario, codigo_nomenclatura, tipo_medio, modulo, nivel, superficie, ubicacion_especifica, estatus_operativo, observaciones
) VALUES (
  'PUB-102',
  'AIFA-DCS-SSC-GEP-121-2026',
  'Impacto 360 Estrategias y Medios, S.A.P.I. de C.V.',
  'EP-BZEIJK-13',
  'Estructura Publicitaria',
  'I, J, K',
  '10.50',
  16.2,
  'Zona de Embarque I, J, K',
  'Operando',
  'Estructura 13 de 19'
);
INSERT INTO espacios_publicitarios (
  id_unidad, contrato_id, arrendatario, codigo_nomenclatura, tipo_medio, modulo, nivel, superficie, ubicacion_especifica, estatus_operativo, observaciones
) VALUES (
  'PUB-103',
  'AIFA-DCS-SSC-GEP-121-2026',
  'Impacto 360 Estrategias y Medios, S.A.P.I. de C.V.',
  'EP-BZEIJK-14',
  'Estructura Publicitaria',
  'I, J, K',
  '10.50',
  16.2,
  'Zona de Embarque I, J, K',
  'Operando',
  'Estructura 14 de 19'
);
INSERT INTO espacios_publicitarios (
  id_unidad, contrato_id, arrendatario, codigo_nomenclatura, tipo_medio, modulo, nivel, superficie, ubicacion_especifica, estatus_operativo, observaciones
) VALUES (
  'PUB-104',
  'AIFA-DCS-SSC-GEP-121-2026',
  'Impacto 360 Estrategias y Medios, S.A.P.I. de C.V.',
  'EP-BZEIJK-15',
  'Estructura Publicitaria',
  'I, J, K',
  '10.50',
  16.2,
  'Zona de Embarque I, J, K',
  'Operando',
  'Estructura 15 de 19'
);
INSERT INTO espacios_publicitarios (
  id_unidad, contrato_id, arrendatario, codigo_nomenclatura, tipo_medio, modulo, nivel, superficie, ubicacion_especifica, estatus_operativo, observaciones
) VALUES (
  'PUB-105',
  'AIFA-DCS-SSC-GEP-121-2026',
  'Impacto 360 Estrategias y Medios, S.A.P.I. de C.V.',
  'EP-BZEIJK-16',
  'Estructura Publicitaria',
  'I, J, K',
  '10.50',
  16.2,
  'Zona de Embarque I, J, K',
  'Operando',
  'Estructura 16 de 19'
);
INSERT INTO espacios_publicitarios (
  id_unidad, contrato_id, arrendatario, codigo_nomenclatura, tipo_medio, modulo, nivel, superficie, ubicacion_especifica, estatus_operativo, observaciones
) VALUES (
  'PUB-106',
  'AIFA-DCS-SSC-GEP-121-2026',
  'Impacto 360 Estrategias y Medios, S.A.P.I. de C.V.',
  'EP-BZEIJK-17',
  'Estructura Publicitaria',
  'I, J, K',
  '10.50',
  16.2,
  'Zona de Embarque I, J, K',
  'Operando',
  'Estructura 17 de 19'
);
INSERT INTO espacios_publicitarios (
  id_unidad, contrato_id, arrendatario, codigo_nomenclatura, tipo_medio, modulo, nivel, superficie, ubicacion_especifica, estatus_operativo, observaciones
) VALUES (
  'PUB-107',
  'AIFA-DCS-SSC-GEP-121-2026',
  'Impacto 360 Estrategias y Medios, S.A.P.I. de C.V.',
  'EP-BZEIJK-18',
  'Estructura Publicitaria',
  'I, J, K',
  '10.50',
  16.2,
  'Zona de Embarque I, J, K',
  'Operando',
  'Estructura 18 de 19'
);
INSERT INTO espacios_publicitarios (
  id_unidad, contrato_id, arrendatario, codigo_nomenclatura, tipo_medio, modulo, nivel, superficie, ubicacion_especifica, estatus_operativo, observaciones
) VALUES (
  'PUB-108',
  'AIFA-DCS-SSC-GEP-121-2026',
  'Impacto 360 Estrategias y Medios, S.A.P.I. de C.V.',
  'EP-BZEIJK-19',
  'Estructura Publicitaria',
  'I, J, K',
  '10.50',
  16.2,
  'Zona de Embarque I, J, K',
  'Operando',
  'Estructura 19 de 19'
);
INSERT INTO espacios_publicitarios (
  id_unidad, contrato_id, arrendatario, codigo_nomenclatura, tipo_medio, modulo, nivel, superficie, ubicacion_especifica, estatus_operativo, observaciones
) VALUES (
  'PUB-109',
  'AIFA-DCS-SSC-030-2024',
  'Luz María Olimpa Camacho',
  'EP-PESC-01',
  'Pantalla Digital',
  'C',
  '10.50',
  NULL,
  'Módulo C - Nivel 10.50',
  'Operando',
  'Pantalla publicitaria'
);
INSERT INTO espacios_publicitarios (
  id_unidad, contrato_id, arrendatario, codigo_nomenclatura, tipo_medio, modulo, nivel, superficie, ubicacion_especifica, estatus_operativo, observaciones
) VALUES (
  'PUB-110',
  'AIFA-DCS-SSC-030-2024',
  'Luz María Olimpa Camacho',
  'EP-PESG1-02',
  'Pantalla Digital',
  'G1',
  '10.50',
  NULL,
  'Módulo G1 - Nivel 10.50',
  'Operando',
  'Pantalla publicitaria'
);
INSERT INTO espacios_publicitarios (
  id_unidad, contrato_id, arrendatario, codigo_nomenclatura, tipo_medio, modulo, nivel, superficie, ubicacion_especifica, estatus_operativo, observaciones
) VALUES (
  'PUB-111',
  'AIFA-DCS-SSC-GEP-071-2026',
  'Lacavi Mercadotecnia, S.A. de C.V.',
  'A01-B01',
  'Backlight',
  'A al H',
  '10.50 / 0.00',
  2.41,
  'Pasillos Módulos A al H',
  'Operando',
  'Caja de luz / Backlight 1 de 21'
);
INSERT INTO espacios_publicitarios (
  id_unidad, contrato_id, arrendatario, codigo_nomenclatura, tipo_medio, modulo, nivel, superficie, ubicacion_especifica, estatus_operativo, observaciones
) VALUES (
  'PUB-112',
  'AIFA-DCS-SSC-GEP-071-2026',
  'Lacavi Mercadotecnia, S.A. de C.V.',
  'A02-B02',
  'Backlight',
  'A al H',
  '10.50 / 0.00',
  2.41,
  'Pasillos Módulos A al H',
  'Operando',
  'Caja de luz / Backlight 2 de 21'
);
INSERT INTO espacios_publicitarios (
  id_unidad, contrato_id, arrendatario, codigo_nomenclatura, tipo_medio, modulo, nivel, superficie, ubicacion_especifica, estatus_operativo, observaciones
) VALUES (
  'PUB-113',
  'AIFA-DCS-SSC-GEP-071-2026',
  'Lacavi Mercadotecnia, S.A. de C.V.',
  'A03-B03',
  'Backlight',
  'A al H',
  '10.50 / 0.00',
  2.41,
  'Pasillos Módulos A al H',
  'Operando',
  'Caja de luz / Backlight 3 de 21'
);
INSERT INTO espacios_publicitarios (
  id_unidad, contrato_id, arrendatario, codigo_nomenclatura, tipo_medio, modulo, nivel, superficie, ubicacion_especifica, estatus_operativo, observaciones
) VALUES (
  'PUB-114',
  'AIFA-DCS-SSC-GEP-071-2026',
  'Lacavi Mercadotecnia, S.A. de C.V.',
  'A04-B04',
  'Backlight',
  'A al H',
  '10.50 / 0.00',
  2.41,
  'Pasillos Módulos A al H',
  'Operando',
  'Caja de luz / Backlight 4 de 21'
);
INSERT INTO espacios_publicitarios (
  id_unidad, contrato_id, arrendatario, codigo_nomenclatura, tipo_medio, modulo, nivel, superficie, ubicacion_especifica, estatus_operativo, observaciones
) VALUES (
  'PUB-115',
  'AIFA-DCS-SSC-GEP-071-2026',
  'Lacavi Mercadotecnia, S.A. de C.V.',
  'A05-B05',
  'Backlight',
  'A al H',
  '10.50 / 0.00',
  2.41,
  'Pasillos Módulos A al H',
  'Operando',
  'Caja de luz / Backlight 5 de 21'
);
INSERT INTO espacios_publicitarios (
  id_unidad, contrato_id, arrendatario, codigo_nomenclatura, tipo_medio, modulo, nivel, superficie, ubicacion_especifica, estatus_operativo, observaciones
) VALUES (
  'PUB-116',
  'AIFA-DCS-SSC-GEP-071-2026',
  'Lacavi Mercadotecnia, S.A. de C.V.',
  'A06-B06',
  'Backlight',
  'A al H',
  '10.50 / 0.00',
  2.41,
  'Pasillos Módulos A al H',
  'Operando',
  'Caja de luz / Backlight 6 de 21'
);
INSERT INTO espacios_publicitarios (
  id_unidad, contrato_id, arrendatario, codigo_nomenclatura, tipo_medio, modulo, nivel, superficie, ubicacion_especifica, estatus_operativo, observaciones
) VALUES (
  'PUB-117',
  'AIFA-DCS-SSC-GEP-071-2026',
  'Lacavi Mercadotecnia, S.A. de C.V.',
  'A07-B07',
  'Backlight',
  'A al H',
  '10.50 / 0.00',
  2.41,
  'Pasillos Módulos A al H',
  'Operando',
  'Caja de luz / Backlight 7 de 21'
);
INSERT INTO espacios_publicitarios (
  id_unidad, contrato_id, arrendatario, codigo_nomenclatura, tipo_medio, modulo, nivel, superficie, ubicacion_especifica, estatus_operativo, observaciones
) VALUES (
  'PUB-118',
  'AIFA-DCS-SSC-GEP-071-2026',
  'Lacavi Mercadotecnia, S.A. de C.V.',
  'A08-B08',
  'Backlight',
  'A al H',
  '10.50 / 0.00',
  2.41,
  'Pasillos Módulos A al H',
  'Operando',
  'Caja de luz / Backlight 8 de 21'
);
INSERT INTO espacios_publicitarios (
  id_unidad, contrato_id, arrendatario, codigo_nomenclatura, tipo_medio, modulo, nivel, superficie, ubicacion_especifica, estatus_operativo, observaciones
) VALUES (
  'PUB-119',
  'AIFA-DCS-SSC-GEP-071-2026',
  'Lacavi Mercadotecnia, S.A. de C.V.',
  'A09-B09',
  'Backlight',
  'A al H',
  '10.50 / 0.00',
  2.41,
  'Pasillos Módulos A al H',
  'Operando',
  'Caja de luz / Backlight 9 de 21'
);
INSERT INTO espacios_publicitarios (
  id_unidad, contrato_id, arrendatario, codigo_nomenclatura, tipo_medio, modulo, nivel, superficie, ubicacion_especifica, estatus_operativo, observaciones
) VALUES (
  'PUB-120',
  'AIFA-DCS-SSC-GEP-071-2026',
  'Lacavi Mercadotecnia, S.A. de C.V.',
  'A10-B10',
  'Backlight',
  'A al H',
  '10.50 / 0.00',
  2.41,
  'Pasillos Módulos A al H',
  'Operando',
  'Caja de luz / Backlight 10 de 21'
);
INSERT INTO espacios_publicitarios (
  id_unidad, contrato_id, arrendatario, codigo_nomenclatura, tipo_medio, modulo, nivel, superficie, ubicacion_especifica, estatus_operativo, observaciones
) VALUES (
  'PUB-121',
  'AIFA-DCS-SSC-GEP-071-2026',
  'Lacavi Mercadotecnia, S.A. de C.V.',
  'A11-B11',
  'Backlight',
  'A al H',
  '10.50 / 0.00',
  2.41,
  'Pasillos Módulos A al H',
  'Operando',
  'Caja de luz / Backlight 11 de 21'
);
INSERT INTO espacios_publicitarios (
  id_unidad, contrato_id, arrendatario, codigo_nomenclatura, tipo_medio, modulo, nivel, superficie, ubicacion_especifica, estatus_operativo, observaciones
) VALUES (
  'PUB-122',
  'AIFA-DCS-SSC-GEP-071-2026',
  'Lacavi Mercadotecnia, S.A. de C.V.',
  'A12-B12',
  'Backlight',
  'A al H',
  '10.50 / 0.00',
  2.41,
  'Pasillos Módulos A al H',
  'Operando',
  'Caja de luz / Backlight 12 de 21'
);
INSERT INTO espacios_publicitarios (
  id_unidad, contrato_id, arrendatario, codigo_nomenclatura, tipo_medio, modulo, nivel, superficie, ubicacion_especifica, estatus_operativo, observaciones
) VALUES (
  'PUB-123',
  'AIFA-DCS-SSC-GEP-071-2026',
  'Lacavi Mercadotecnia, S.A. de C.V.',
  'A13-B13',
  'Backlight',
  'A al H',
  '10.50 / 0.00',
  2.41,
  'Pasillos Módulos A al H',
  'Operando',
  'Caja de luz / Backlight 13 de 21'
);
INSERT INTO espacios_publicitarios (
  id_unidad, contrato_id, arrendatario, codigo_nomenclatura, tipo_medio, modulo, nivel, superficie, ubicacion_especifica, estatus_operativo, observaciones
) VALUES (
  'PUB-124',
  'AIFA-DCS-SSC-GEP-071-2026',
  'Lacavi Mercadotecnia, S.A. de C.V.',
  'A14-B14',
  'Backlight',
  'A al H',
  '10.50 / 0.00',
  2.41,
  'Pasillos Módulos A al H',
  'Operando',
  'Caja de luz / Backlight 14 de 21'
);
INSERT INTO espacios_publicitarios (
  id_unidad, contrato_id, arrendatario, codigo_nomenclatura, tipo_medio, modulo, nivel, superficie, ubicacion_especifica, estatus_operativo, observaciones
) VALUES (
  'PUB-125',
  'AIFA-DCS-SSC-GEP-071-2026',
  'Lacavi Mercadotecnia, S.A. de C.V.',
  'A15-B15',
  'Backlight',
  'A al H',
  '10.50 / 0.00',
  2.41,
  'Pasillos Módulos A al H',
  'Operando',
  'Caja de luz / Backlight 15 de 21'
);
INSERT INTO espacios_publicitarios (
  id_unidad, contrato_id, arrendatario, codigo_nomenclatura, tipo_medio, modulo, nivel, superficie, ubicacion_especifica, estatus_operativo, observaciones
) VALUES (
  'PUB-126',
  'AIFA-DCS-SSC-GEP-071-2026',
  'Lacavi Mercadotecnia, S.A. de C.V.',
  'A16-B16',
  'Backlight',
  'A al H',
  '10.50 / 0.00',
  2.41,
  'Pasillos Módulos A al H',
  'Operando',
  'Caja de luz / Backlight 16 de 21'
);
INSERT INTO espacios_publicitarios (
  id_unidad, contrato_id, arrendatario, codigo_nomenclatura, tipo_medio, modulo, nivel, superficie, ubicacion_especifica, estatus_operativo, observaciones
) VALUES (
  'PUB-127',
  'AIFA-DCS-SSC-GEP-071-2026',
  'Lacavi Mercadotecnia, S.A. de C.V.',
  'A17-B17',
  'Backlight',
  'A al H',
  '10.50 / 0.00',
  2.41,
  'Pasillos Módulos A al H',
  'Operando',
  'Caja de luz / Backlight 17 de 21'
);
INSERT INTO espacios_publicitarios (
  id_unidad, contrato_id, arrendatario, codigo_nomenclatura, tipo_medio, modulo, nivel, superficie, ubicacion_especifica, estatus_operativo, observaciones
) VALUES (
  'PUB-128',
  'AIFA-DCS-SSC-GEP-071-2026',
  'Lacavi Mercadotecnia, S.A. de C.V.',
  'A18-B18',
  'Backlight',
  'A al H',
  '10.50 / 0.00',
  2.41,
  'Pasillos Módulos A al H',
  'Operando',
  'Caja de luz / Backlight 18 de 21'
);
INSERT INTO espacios_publicitarios (
  id_unidad, contrato_id, arrendatario, codigo_nomenclatura, tipo_medio, modulo, nivel, superficie, ubicacion_especifica, estatus_operativo, observaciones
) VALUES (
  'PUB-129',
  'AIFA-DCS-SSC-GEP-071-2026',
  'Lacavi Mercadotecnia, S.A. de C.V.',
  'A19-B19',
  'Backlight',
  'A al H',
  '10.50 / 0.00',
  2.41,
  'Pasillos Módulos A al H',
  'Operando',
  'Caja de luz / Backlight 19 de 21'
);
INSERT INTO espacios_publicitarios (
  id_unidad, contrato_id, arrendatario, codigo_nomenclatura, tipo_medio, modulo, nivel, superficie, ubicacion_especifica, estatus_operativo, observaciones
) VALUES (
  'PUB-130',
  'AIFA-DCS-SSC-GEP-071-2026',
  'Lacavi Mercadotecnia, S.A. de C.V.',
  'A20-B20',
  'Backlight',
  'A al H',
  '10.50 / 0.00',
  2.41,
  'Pasillos Módulos A al H',
  'Operando',
  'Caja de luz / Backlight 20 de 21'
);
INSERT INTO espacios_publicitarios (
  id_unidad, contrato_id, arrendatario, codigo_nomenclatura, tipo_medio, modulo, nivel, superficie, ubicacion_especifica, estatus_operativo, observaciones
) VALUES (
  'PUB-131',
  'AIFA-DCS-SSC-GEP-071-2026',
  'Lacavi Mercadotecnia, S.A. de C.V.',
  'A21-B21',
  'Backlight',
  'A al H',
  '10.50 / 0.00',
  2.41,
  'Pasillos Módulos A al H',
  'Operando',
  'Caja de luz / Backlight 21 de 21'
);
INSERT INTO espacios_publicitarios (
  id_unidad, contrato_id, arrendatario, codigo_nomenclatura, tipo_medio, modulo, nivel, superficie, ubicacion_especifica, estatus_operativo, observaciones
) VALUES (
  'PUB-132',
  'AIFA-DCS-SSC-GEP-086-2026',
  'Lacavi Mercadotecnia, S.A. de C.V.',
  'EP-BRE-IJK',
  'Bandas de Reclamo de Equipaje',
  'I, J, K',
  '0.00',
  179.41,
  'Llegadas - Bandas de Reclamo I, J, K',
  'Operando',
  'Publicidad en carruseles de equipaje'
);
INSERT INTO espacios_publicitarios (
  id_unidad, contrato_id, arrendatario, codigo_nomenclatura, tipo_medio, modulo, nivel, superficie, ubicacion_especifica, estatus_operativo, observaciones
) VALUES (
  'PUB-133',
  'AIFA-DCS-SSC-GEP-135-2026',
  'Isa Corporativo, S.A. de C.V',
  'ISA-ETP-01',
  'Pantalla Estática / Digital',
  'ETP General',
  '10.50 / 0.00',
  NULL,
  'Edificio Terminal de Pasajeros',
  'Operando',
  'Pantalla ISA Corporativo 1 de 28'
);
INSERT INTO espacios_publicitarios (
  id_unidad, contrato_id, arrendatario, codigo_nomenclatura, tipo_medio, modulo, nivel, superficie, ubicacion_especifica, estatus_operativo, observaciones
) VALUES (
  'PUB-134',
  'AIFA-DCS-SSC-GEP-135-2026',
  'Isa Corporativo, S.A. de C.V',
  'ISA-ETP-02',
  'Pantalla Estática / Digital',
  'ETP General',
  '10.50 / 0.00',
  NULL,
  'Edificio Terminal de Pasajeros',
  'Operando',
  'Pantalla ISA Corporativo 2 de 28'
);
INSERT INTO espacios_publicitarios (
  id_unidad, contrato_id, arrendatario, codigo_nomenclatura, tipo_medio, modulo, nivel, superficie, ubicacion_especifica, estatus_operativo, observaciones
) VALUES (
  'PUB-135',
  'AIFA-DCS-SSC-GEP-135-2026',
  'Isa Corporativo, S.A. de C.V',
  'ISA-ETP-03',
  'Pantalla Estática / Digital',
  'ETP General',
  '10.50 / 0.00',
  NULL,
  'Edificio Terminal de Pasajeros',
  'Operando',
  'Pantalla ISA Corporativo 3 de 28'
);
INSERT INTO espacios_publicitarios (
  id_unidad, contrato_id, arrendatario, codigo_nomenclatura, tipo_medio, modulo, nivel, superficie, ubicacion_especifica, estatus_operativo, observaciones
) VALUES (
  'PUB-136',
  'AIFA-DCS-SSC-GEP-135-2026',
  'Isa Corporativo, S.A. de C.V',
  'ISA-ETP-04',
  'Pantalla Estática / Digital',
  'ETP General',
  '10.50 / 0.00',
  NULL,
  'Edificio Terminal de Pasajeros',
  'Operando',
  'Pantalla ISA Corporativo 4 de 28'
);
INSERT INTO espacios_publicitarios (
  id_unidad, contrato_id, arrendatario, codigo_nomenclatura, tipo_medio, modulo, nivel, superficie, ubicacion_especifica, estatus_operativo, observaciones
) VALUES (
  'PUB-137',
  'AIFA-DCS-SSC-GEP-135-2026',
  'Isa Corporativo, S.A. de C.V',
  'ISA-ETP-05',
  'Pantalla Estática / Digital',
  'ETP General',
  '10.50 / 0.00',
  NULL,
  'Edificio Terminal de Pasajeros',
  'Operando',
  'Pantalla ISA Corporativo 5 de 28'
);
INSERT INTO espacios_publicitarios (
  id_unidad, contrato_id, arrendatario, codigo_nomenclatura, tipo_medio, modulo, nivel, superficie, ubicacion_especifica, estatus_operativo, observaciones
) VALUES (
  'PUB-138',
  'AIFA-DCS-SSC-GEP-135-2026',
  'Isa Corporativo, S.A. de C.V',
  'ISA-ETP-06',
  'Pantalla Estática / Digital',
  'ETP General',
  '10.50 / 0.00',
  NULL,
  'Edificio Terminal de Pasajeros',
  'Operando',
  'Pantalla ISA Corporativo 6 de 28'
);
INSERT INTO espacios_publicitarios (
  id_unidad, contrato_id, arrendatario, codigo_nomenclatura, tipo_medio, modulo, nivel, superficie, ubicacion_especifica, estatus_operativo, observaciones
) VALUES (
  'PUB-139',
  'AIFA-DCS-SSC-GEP-135-2026',
  'Isa Corporativo, S.A. de C.V',
  'ISA-ETP-07',
  'Pantalla Estática / Digital',
  'ETP General',
  '10.50 / 0.00',
  NULL,
  'Edificio Terminal de Pasajeros',
  'Operando',
  'Pantalla ISA Corporativo 7 de 28'
);
INSERT INTO espacios_publicitarios (
  id_unidad, contrato_id, arrendatario, codigo_nomenclatura, tipo_medio, modulo, nivel, superficie, ubicacion_especifica, estatus_operativo, observaciones
) VALUES (
  'PUB-140',
  'AIFA-DCS-SSC-GEP-135-2026',
  'Isa Corporativo, S.A. de C.V',
  'ISA-ETP-08',
  'Pantalla Estática / Digital',
  'ETP General',
  '10.50 / 0.00',
  NULL,
  'Edificio Terminal de Pasajeros',
  'Operando',
  'Pantalla ISA Corporativo 8 de 28'
);
INSERT INTO espacios_publicitarios (
  id_unidad, contrato_id, arrendatario, codigo_nomenclatura, tipo_medio, modulo, nivel, superficie, ubicacion_especifica, estatus_operativo, observaciones
) VALUES (
  'PUB-141',
  'AIFA-DCS-SSC-GEP-135-2026',
  'Isa Corporativo, S.A. de C.V',
  'ISA-ETP-09',
  'Pantalla Estática / Digital',
  'ETP General',
  '10.50 / 0.00',
  NULL,
  'Edificio Terminal de Pasajeros',
  'Operando',
  'Pantalla ISA Corporativo 9 de 28'
);
INSERT INTO espacios_publicitarios (
  id_unidad, contrato_id, arrendatario, codigo_nomenclatura, tipo_medio, modulo, nivel, superficie, ubicacion_especifica, estatus_operativo, observaciones
) VALUES (
  'PUB-142',
  'AIFA-DCS-SSC-GEP-135-2026',
  'Isa Corporativo, S.A. de C.V',
  'ISA-ETP-10',
  'Pantalla Estática / Digital',
  'ETP General',
  '10.50 / 0.00',
  NULL,
  'Edificio Terminal de Pasajeros',
  'Operando',
  'Pantalla ISA Corporativo 10 de 28'
);
INSERT INTO espacios_publicitarios (
  id_unidad, contrato_id, arrendatario, codigo_nomenclatura, tipo_medio, modulo, nivel, superficie, ubicacion_especifica, estatus_operativo, observaciones
) VALUES (
  'PUB-143',
  'AIFA-DCS-SSC-GEP-135-2026',
  'Isa Corporativo, S.A. de C.V',
  'ISA-ETP-11',
  'Pantalla Estática / Digital',
  'ETP General',
  '10.50 / 0.00',
  NULL,
  'Edificio Terminal de Pasajeros',
  'Operando',
  'Pantalla ISA Corporativo 11 de 28'
);
INSERT INTO espacios_publicitarios (
  id_unidad, contrato_id, arrendatario, codigo_nomenclatura, tipo_medio, modulo, nivel, superficie, ubicacion_especifica, estatus_operativo, observaciones
) VALUES (
  'PUB-144',
  'AIFA-DCS-SSC-GEP-135-2026',
  'Isa Corporativo, S.A. de C.V',
  'ISA-ETP-12',
  'Pantalla Estática / Digital',
  'ETP General',
  '10.50 / 0.00',
  NULL,
  'Edificio Terminal de Pasajeros',
  'Operando',
  'Pantalla ISA Corporativo 12 de 28'
);
INSERT INTO espacios_publicitarios (
  id_unidad, contrato_id, arrendatario, codigo_nomenclatura, tipo_medio, modulo, nivel, superficie, ubicacion_especifica, estatus_operativo, observaciones
) VALUES (
  'PUB-145',
  'AIFA-DCS-SSC-GEP-135-2026',
  'Isa Corporativo, S.A. de C.V',
  'ISA-ETP-13',
  'Pantalla Estática / Digital',
  'ETP General',
  '10.50 / 0.00',
  NULL,
  'Edificio Terminal de Pasajeros',
  'Operando',
  'Pantalla ISA Corporativo 13 de 28'
);
INSERT INTO espacios_publicitarios (
  id_unidad, contrato_id, arrendatario, codigo_nomenclatura, tipo_medio, modulo, nivel, superficie, ubicacion_especifica, estatus_operativo, observaciones
) VALUES (
  'PUB-146',
  'AIFA-DCS-SSC-GEP-135-2026',
  'Isa Corporativo, S.A. de C.V',
  'ISA-ETP-14',
  'Pantalla Estática / Digital',
  'ETP General',
  '10.50 / 0.00',
  NULL,
  'Edificio Terminal de Pasajeros',
  'Operando',
  'Pantalla ISA Corporativo 14 de 28'
);
INSERT INTO espacios_publicitarios (
  id_unidad, contrato_id, arrendatario, codigo_nomenclatura, tipo_medio, modulo, nivel, superficie, ubicacion_especifica, estatus_operativo, observaciones
) VALUES (
  'PUB-147',
  'AIFA-DCS-SSC-GEP-135-2026',
  'Isa Corporativo, S.A. de C.V',
  'ISA-ETP-15',
  'Pantalla Estática / Digital',
  'ETP General',
  '10.50 / 0.00',
  NULL,
  'Edificio Terminal de Pasajeros',
  'Operando',
  'Pantalla ISA Corporativo 15 de 28'
);
INSERT INTO espacios_publicitarios (
  id_unidad, contrato_id, arrendatario, codigo_nomenclatura, tipo_medio, modulo, nivel, superficie, ubicacion_especifica, estatus_operativo, observaciones
) VALUES (
  'PUB-148',
  'AIFA-DCS-SSC-GEP-135-2026',
  'Isa Corporativo, S.A. de C.V',
  'ISA-ETP-16',
  'Pantalla Estática / Digital',
  'ETP General',
  '10.50 / 0.00',
  NULL,
  'Edificio Terminal de Pasajeros',
  'Operando',
  'Pantalla ISA Corporativo 16 de 28'
);
INSERT INTO espacios_publicitarios (
  id_unidad, contrato_id, arrendatario, codigo_nomenclatura, tipo_medio, modulo, nivel, superficie, ubicacion_especifica, estatus_operativo, observaciones
) VALUES (
  'PUB-149',
  'AIFA-DCS-SSC-GEP-135-2026',
  'Isa Corporativo, S.A. de C.V',
  'ISA-ETP-17',
  'Pantalla Estática / Digital',
  'ETP General',
  '10.50 / 0.00',
  NULL,
  'Edificio Terminal de Pasajeros',
  'Operando',
  'Pantalla ISA Corporativo 17 de 28'
);
INSERT INTO espacios_publicitarios (
  id_unidad, contrato_id, arrendatario, codigo_nomenclatura, tipo_medio, modulo, nivel, superficie, ubicacion_especifica, estatus_operativo, observaciones
) VALUES (
  'PUB-150',
  'AIFA-DCS-SSC-GEP-135-2026',
  'Isa Corporativo, S.A. de C.V',
  'ISA-ETP-18',
  'Pantalla Estática / Digital',
  'ETP General',
  '10.50 / 0.00',
  NULL,
  'Edificio Terminal de Pasajeros',
  'Operando',
  'Pantalla ISA Corporativo 18 de 28'
);
INSERT INTO espacios_publicitarios (
  id_unidad, contrato_id, arrendatario, codigo_nomenclatura, tipo_medio, modulo, nivel, superficie, ubicacion_especifica, estatus_operativo, observaciones
) VALUES (
  'PUB-151',
  'AIFA-DCS-SSC-GEP-135-2026',
  'Isa Corporativo, S.A. de C.V',
  'ISA-ETP-19',
  'Pantalla Estática / Digital',
  'ETP General',
  '10.50 / 0.00',
  NULL,
  'Edificio Terminal de Pasajeros',
  'Operando',
  'Pantalla ISA Corporativo 19 de 28'
);
INSERT INTO espacios_publicitarios (
  id_unidad, contrato_id, arrendatario, codigo_nomenclatura, tipo_medio, modulo, nivel, superficie, ubicacion_especifica, estatus_operativo, observaciones
) VALUES (
  'PUB-152',
  'AIFA-DCS-SSC-GEP-135-2026',
  'Isa Corporativo, S.A. de C.V',
  'ISA-ETP-20',
  'Pantalla Estática / Digital',
  'ETP General',
  '10.50 / 0.00',
  NULL,
  'Edificio Terminal de Pasajeros',
  'Operando',
  'Pantalla ISA Corporativo 20 de 28'
);
INSERT INTO espacios_publicitarios (
  id_unidad, contrato_id, arrendatario, codigo_nomenclatura, tipo_medio, modulo, nivel, superficie, ubicacion_especifica, estatus_operativo, observaciones
) VALUES (
  'PUB-153',
  'AIFA-DCS-SSC-GEP-135-2026',
  'Isa Corporativo, S.A. de C.V',
  'ISA-ETP-21',
  'Pantalla Estática / Digital',
  'ETP General',
  '10.50 / 0.00',
  NULL,
  'Edificio Terminal de Pasajeros',
  'Operando',
  'Pantalla ISA Corporativo 21 de 28'
);
INSERT INTO espacios_publicitarios (
  id_unidad, contrato_id, arrendatario, codigo_nomenclatura, tipo_medio, modulo, nivel, superficie, ubicacion_especifica, estatus_operativo, observaciones
) VALUES (
  'PUB-154',
  'AIFA-DCS-SSC-GEP-135-2026',
  'Isa Corporativo, S.A. de C.V',
  'ISA-ETP-22',
  'Pantalla Estática / Digital',
  'ETP General',
  '10.50 / 0.00',
  NULL,
  'Edificio Terminal de Pasajeros',
  'Operando',
  'Pantalla ISA Corporativo 22 de 28'
);
INSERT INTO espacios_publicitarios (
  id_unidad, contrato_id, arrendatario, codigo_nomenclatura, tipo_medio, modulo, nivel, superficie, ubicacion_especifica, estatus_operativo, observaciones
) VALUES (
  'PUB-155',
  'AIFA-DCS-SSC-GEP-135-2026',
  'Isa Corporativo, S.A. de C.V',
  'ISA-ETP-23',
  'Pantalla Estática / Digital',
  'ETP General',
  '10.50 / 0.00',
  NULL,
  'Edificio Terminal de Pasajeros',
  'Operando',
  'Pantalla ISA Corporativo 23 de 28'
);
INSERT INTO espacios_publicitarios (
  id_unidad, contrato_id, arrendatario, codigo_nomenclatura, tipo_medio, modulo, nivel, superficie, ubicacion_especifica, estatus_operativo, observaciones
) VALUES (
  'PUB-156',
  'AIFA-DCS-SSC-GEP-135-2026',
  'Isa Corporativo, S.A. de C.V',
  'ISA-ETP-24',
  'Pantalla Estática / Digital',
  'ETP General',
  '10.50 / 0.00',
  NULL,
  'Edificio Terminal de Pasajeros',
  'Operando',
  'Pantalla ISA Corporativo 24 de 28'
);
INSERT INTO espacios_publicitarios (
  id_unidad, contrato_id, arrendatario, codigo_nomenclatura, tipo_medio, modulo, nivel, superficie, ubicacion_especifica, estatus_operativo, observaciones
) VALUES (
  'PUB-157',
  'AIFA-DCS-SSC-GEP-135-2026',
  'Isa Corporativo, S.A. de C.V',
  'ISA-ETP-25',
  'Pantalla Estática / Digital',
  'ETP General',
  '10.50 / 0.00',
  NULL,
  'Edificio Terminal de Pasajeros',
  'Operando',
  'Pantalla ISA Corporativo 25 de 28'
);
INSERT INTO espacios_publicitarios (
  id_unidad, contrato_id, arrendatario, codigo_nomenclatura, tipo_medio, modulo, nivel, superficie, ubicacion_especifica, estatus_operativo, observaciones
) VALUES (
  'PUB-158',
  'AIFA-DCS-SSC-GEP-135-2026',
  'Isa Corporativo, S.A. de C.V',
  'ISA-ETP-26',
  'Pantalla Estática / Digital',
  'ETP General',
  '10.50 / 0.00',
  NULL,
  'Edificio Terminal de Pasajeros',
  'Operando',
  'Pantalla ISA Corporativo 26 de 28'
);
INSERT INTO espacios_publicitarios (
  id_unidad, contrato_id, arrendatario, codigo_nomenclatura, tipo_medio, modulo, nivel, superficie, ubicacion_especifica, estatus_operativo, observaciones
) VALUES (
  'PUB-159',
  'AIFA-DCS-SSC-GEP-135-2026',
  'Isa Corporativo, S.A. de C.V',
  'ISA-ETP-27',
  'Pantalla Estática / Digital',
  'ETP General',
  '10.50 / 0.00',
  NULL,
  'Edificio Terminal de Pasajeros',
  'Operando',
  'Pantalla ISA Corporativo 27 de 28'
);
INSERT INTO espacios_publicitarios (
  id_unidad, contrato_id, arrendatario, codigo_nomenclatura, tipo_medio, modulo, nivel, superficie, ubicacion_especifica, estatus_operativo, observaciones
) VALUES (
  'PUB-160',
  'AIFA-DCS-SSC-GEP-135-2026',
  'Isa Corporativo, S.A. de C.V',
  'ISA-ETP-28',
  'Pantalla Estática / Digital',
  'ETP General',
  '10.50 / 0.00',
  NULL,
  'Edificio Terminal de Pasajeros',
  'Operando',
  'Pantalla ISA Corporativo 28 de 28'
);
INSERT INTO espacios_publicitarios (
  id_unidad, contrato_id, arrendatario, codigo_nomenclatura, tipo_medio, modulo, nivel, superficie, ubicacion_especifica, estatus_operativo, observaciones
) VALUES (
  'PUB-161',
  'AIFA-DCS-SSC-GEP-178-2025',
  'Isa Corporativo, S.A. de C.V',
  'LLANM-22',
  'Bodega de Operación',
  'M',
  '0.00',
  14.41,
  'Módulo M - Nivel 0.00',
  'Operando',
  'Bodega de apoyo publicitario'
);
INSERT INTO espacios_publicitarios (
  id_unidad, contrato_id, arrendatario, codigo_nomenclatura, tipo_medio, modulo, nivel, superficie, ubicacion_especifica, estatus_operativo, observaciones
) VALUES (
  'PUB-162',
  'AIFA-DCS-SSC-GEP-168-2026',
  'Lacavi Mercadotecnia, S.A. de C.V.',
  'EP-LLANL-01',
  'Estructura Especial 3D',
  'L',
  '10.50 / 0.00',
  4,
  'Módulo L - Salidas / Llegadas',
  'Operando',
  'Estructura volumétrica 3D'
);
INSERT INTO espacios_publicitarios (
  id_unidad, contrato_id, arrendatario, codigo_nomenclatura, tipo_medio, modulo, nivel, superficie, ubicacion_especifica, estatus_operativo, observaciones
) VALUES (
  'PUB-163',
  'AIFA-DCS-SSC-GEP-168-2026',
  'Lacavi Mercadotecnia, S.A. de C.V.',
  'EP-LLANL-04',
  'Estructura Especial 3D',
  'L',
  '10.50 / 0.00',
  4,
  'Módulo L - Salidas / Llegadas',
  'Operando',
  'Estructura volumétrica 3D'
);
INSERT INTO espacios_publicitarios (
  id_unidad, contrato_id, arrendatario, codigo_nomenclatura, tipo_medio, modulo, nivel, superficie, ubicacion_especifica, estatus_operativo, observaciones
) VALUES (
  'PUB-164',
  'AIFA-DCS-SSC-GEP-168-2026',
  'Lacavi Mercadotecnia, S.A. de C.V.',
  'EP-LLANL-05',
  'Estructura Especial 3D',
  'L',
  '10.50 / 0.00',
  4,
  'Módulo L - Salidas / Llegadas',
  'Operando',
  'Estructura volumétrica 3D'
);
INSERT INTO espacios_publicitarios (
  id_unidad, contrato_id, arrendatario, codigo_nomenclatura, tipo_medio, modulo, nivel, superficie, ubicacion_especifica, estatus_operativo, observaciones
) VALUES (
  'PUB-165',
  'AIFA-DCS-SSC-GEP-168-2026',
  'Lacavi Mercadotecnia, S.A. de C.V.',
  'EP-LLANL-06',
  'Estructura Especial 3D',
  'L',
  '10.50 / 0.00',
  4,
  'Módulo L - Salidas / Llegadas',
  'Operando',
  'Estructura volumétrica 3D'
);
INSERT INTO espacios_publicitarios (
  id_unidad, contrato_id, arrendatario, codigo_nomenclatura, tipo_medio, modulo, nivel, superficie, ubicacion_especifica, estatus_operativo, observaciones
) VALUES (
  'PUB-166',
  'AIFA-DCS-SSC-GEP-168-2026',
  'Lacavi Mercadotecnia, S.A. de C.V.',
  'EP-LLANL-09',
  'Estructura Especial 3D',
  'L',
  '10.50 / 0.00',
  4,
  'Módulo L - Salidas / Llegadas',
  'Operando',
  'Estructura volumétrica 3D'
);
INSERT INTO espacios_publicitarios (
  id_unidad, contrato_id, arrendatario, codigo_nomenclatura, tipo_medio, modulo, nivel, superficie, ubicacion_especifica, estatus_operativo, observaciones
) VALUES (
  'PUB-167',
  'AIFA-DCS-SSC-GEP-168-2026',
  'Lacavi Mercadotecnia, S.A. de C.V.',
  'EP-SANL-1',
  'Estructura Especial 3D',
  'L',
  '10.50 / 0.00',
  4,
  'Módulo L - Salidas / Llegadas',
  'Operando',
  'Estructura volumétrica 3D'
);

-- Actualización de la relación de unidades en contrato_locales
DELETE FROM contrato_locales WHERE contrato_id IN ('AIFA-DCS-SSC-102-2023', 'AIFA-DCS-SSC-GEP-137-2025', 'AIFA-DCS-SSC-GEP-173-2026', 'AIFA-DCS-SSC-GEP-079-2026', 'AIFA-DCS-SSC-GEP-107-2026', 'AIFA-DCS-SSC-GEP-108-2026', 'AIFA-DCS-SSC-GEP-109-2026', 'AIFA-DCS-SSC-GEP-110-2026', 'AIFA-DCS-SSC-GEP-137-2026', 'AIFA-DCS-SSC-GEP-139-2026', 'AIFA-DCS-SSC-GEP-121-2026', 'AIFA-DCS-SSC-030-2024', 'AIFA-DCS-SSC-GEP-071-2026', 'AIFA-DCS-SSC-GEP-086-2026', 'AIFA-DCS-SSC-GEP-135-2026', 'AIFA-DCS-SSC-GEP-178-2025', 'AIFA-DCS-SSC-GEP-168-2026');
INSERT OR IGNORE INTO contrato_locales (
  contrato_id, local_nomenclatura, renta_mensual_fija, costo_por_m2
) VALUES (
  'AIFA-DCS-SSC-102-2023',
  'VWEIG1-1',
  NULL,
  NULL
);
INSERT OR IGNORE INTO contrato_locales (
  contrato_id, local_nomenclatura, renta_mensual_fija, costo_por_m2
) VALUES (
  'AIFA-DCS-SSC-102-2023',
  'VWEIG1-11',
  NULL,
  NULL
);
INSERT OR IGNORE INTO contrato_locales (
  contrato_id, local_nomenclatura, renta_mensual_fija, costo_por_m2
) VALUES (
  'AIFA-DCS-SSC-102-2023',
  'VWEIG1-12',
  NULL,
  NULL
);
INSERT OR IGNORE INTO contrato_locales (
  contrato_id, local_nomenclatura, renta_mensual_fija, costo_por_m2
) VALUES (
  'AIFA-DCS-SSC-102-2023',
  'PTEIF-25',
  NULL,
  NULL
);
INSERT OR IGNORE INTO contrato_locales (
  contrato_id, local_nomenclatura, renta_mensual_fija, costo_por_m2
) VALUES (
  'AIFA-DCS-SSC-102-2023',
  'PTEIG1-26',
  NULL,
  NULL
);
INSERT OR IGNORE INTO contrato_locales (
  contrato_id, local_nomenclatura, renta_mensual_fija, costo_por_m2
) VALUES (
  'AIFA-DCS-SSC-102-2023',
  'PTEIG1-27',
  NULL,
  NULL
);
INSERT OR IGNORE INTO contrato_locales (
  contrato_id, local_nomenclatura, renta_mensual_fija, costo_por_m2
) VALUES (
  'AIFA-DCS-SSC-102-2023',
  'PTEIG1-28',
  NULL,
  NULL
);
INSERT OR IGNORE INTO contrato_locales (
  contrato_id, local_nomenclatura, renta_mensual_fija, costo_por_m2
) VALUES (
  'AIFA-DCS-SSC-102-2023',
  'PTEIG1-29',
  NULL,
  NULL
);
INSERT OR IGNORE INTO contrato_locales (
  contrato_id, local_nomenclatura, renta_mensual_fija, costo_por_m2
) VALUES (
  'AIFA-DCS-SSC-102-2023',
  'PTEIG1-30',
  NULL,
  NULL
);
INSERT OR IGNORE INTO contrato_locales (
  contrato_id, local_nomenclatura, renta_mensual_fija, costo_por_m2
) VALUES (
  'AIFA-DCS-SSC-102-2023',
  'PTEIG1-31',
  NULL,
  NULL
);
INSERT OR IGNORE INTO contrato_locales (
  contrato_id, local_nomenclatura, renta_mensual_fija, costo_por_m2
) VALUES (
  'AIFA-DCS-SSC-102-2023',
  'PTEIG1-32',
  NULL,
  NULL
);
INSERT OR IGNORE INTO contrato_locales (
  contrato_id, local_nomenclatura, renta_mensual_fija, costo_por_m2
) VALUES (
  'AIFA-DCS-SSC-102-2023',
  'VWEIG2-13',
  NULL,
  NULL
);
INSERT OR IGNORE INTO contrato_locales (
  contrato_id, local_nomenclatura, renta_mensual_fija, costo_por_m2
) VALUES (
  'AIFA-DCS-SSC-102-2023',
  'VWEIG2-14',
  NULL,
  NULL
);
INSERT OR IGNORE INTO contrato_locales (
  contrato_id, local_nomenclatura, renta_mensual_fija, costo_por_m2
) VALUES (
  'AIFA-DCS-SSC-102-2023',
  'VWEIG2-02',
  NULL,
  NULL
);
INSERT OR IGNORE INTO contrato_locales (
  contrato_id, local_nomenclatura, renta_mensual_fija, costo_por_m2
) VALUES (
  'AIFA-DCS-SSC-102-2023',
  'PTEIG2-33',
  NULL,
  NULL
);
INSERT OR IGNORE INTO contrato_locales (
  contrato_id, local_nomenclatura, renta_mensual_fija, costo_por_m2
) VALUES (
  'AIFA-DCS-SSC-102-2023',
  'PTEIG2-34',
  NULL,
  NULL
);
INSERT OR IGNORE INTO contrato_locales (
  contrato_id, local_nomenclatura, renta_mensual_fija, costo_por_m2
) VALUES (
  'AIFA-DCS-SSC-102-2023',
  'PTEIG2-35',
  NULL,
  NULL
);
INSERT OR IGNORE INTO contrato_locales (
  contrato_id, local_nomenclatura, renta_mensual_fija, costo_por_m2
) VALUES (
  'AIFA-DCS-SSC-102-2023',
  'PTEIG2-36',
  NULL,
  NULL
);
INSERT OR IGNORE INTO contrato_locales (
  contrato_id, local_nomenclatura, renta_mensual_fija, costo_por_m2
) VALUES (
  'AIFA-DCS-SSC-102-2023',
  'VWENB-01',
  NULL,
  NULL
);
INSERT OR IGNORE INTO contrato_locales (
  contrato_id, local_nomenclatura, renta_mensual_fija, costo_por_m2
) VALUES (
  'AIFA-DCS-SSC-102-2023',
  'VWENB-01',
  NULL,
  NULL
);
INSERT OR IGNORE INTO contrato_locales (
  contrato_id, local_nomenclatura, renta_mensual_fija, costo_por_m2
) VALUES (
  'AIFA-DCS-SSC-102-2023',
  'VWENC-02',
  NULL,
  NULL
);
INSERT OR IGNORE INTO contrato_locales (
  contrato_id, local_nomenclatura, renta_mensual_fija, costo_por_m2
) VALUES (
  'AIFA-DCS-SSC-102-2023',
  'VWENC-03',
  NULL,
  NULL
);
INSERT OR IGNORE INTO contrato_locales (
  contrato_id, local_nomenclatura, renta_mensual_fija, costo_por_m2
) VALUES (
  'AIFA-DCS-SSC-102-2023',
  'PTENC-06',
  NULL,
  NULL
);
INSERT OR IGNORE INTO contrato_locales (
  contrato_id, local_nomenclatura, renta_mensual_fija, costo_por_m2
) VALUES (
  'AIFA-DCS-SSC-102-2023',
  'PTENC-07',
  NULL,
  NULL
);
INSERT OR IGNORE INTO contrato_locales (
  contrato_id, local_nomenclatura, renta_mensual_fija, costo_por_m2
) VALUES (
  'AIFA-DCS-SSC-102-2023',
  'PTENC-08',
  NULL,
  NULL
);
INSERT OR IGNORE INTO contrato_locales (
  contrato_id, local_nomenclatura, renta_mensual_fija, costo_por_m2
) VALUES (
  'AIFA-DCS-SSC-102-2023',
  'PTENC-09',
  NULL,
  NULL
);
INSERT OR IGNORE INTO contrato_locales (
  contrato_id, local_nomenclatura, renta_mensual_fija, costo_por_m2
) VALUES (
  'AIFA-DCS-SSC-102-2023',
  'VWEND-04',
  NULL,
  NULL
);
INSERT OR IGNORE INTO contrato_locales (
  contrato_id, local_nomenclatura, renta_mensual_fija, costo_por_m2
) VALUES (
  'AIFA-DCS-SSC-102-2023',
  'PTEND-10',
  NULL,
  NULL
);
INSERT OR IGNORE INTO contrato_locales (
  contrato_id, local_nomenclatura, renta_mensual_fija, costo_por_m2
) VALUES (
  'AIFA-DCS-SSC-102-2023',
  'PTEND-11',
  NULL,
  NULL
);
INSERT OR IGNORE INTO contrato_locales (
  contrato_id, local_nomenclatura, renta_mensual_fija, costo_por_m2
) VALUES (
  'AIFA-DCS-SSC-102-2023',
  'VWENE1-05',
  NULL,
  NULL
);
INSERT OR IGNORE INTO contrato_locales (
  contrato_id, local_nomenclatura, renta_mensual_fija, costo_por_m2
) VALUES (
  'AIFA-DCS-SSC-102-2023',
  'PTENE1-12',
  NULL,
  NULL
);
INSERT OR IGNORE INTO contrato_locales (
  contrato_id, local_nomenclatura, renta_mensual_fija, costo_por_m2
) VALUES (
  'AIFA-DCS-SSC-102-2023',
  'PTENE1-13',
  NULL,
  NULL
);
INSERT OR IGNORE INTO contrato_locales (
  contrato_id, local_nomenclatura, renta_mensual_fija, costo_por_m2
) VALUES (
  'AIFA-DCS-SSC-102-2023',
  'PSENE1-01',
  NULL,
  NULL
);
INSERT OR IGNORE INTO contrato_locales (
  contrato_id, local_nomenclatura, renta_mensual_fija, costo_por_m2
) VALUES (
  'AIFA-DCS-SSC-102-2023',
  'VWENE2-06',
  NULL,
  NULL
);
INSERT OR IGNORE INTO contrato_locales (
  contrato_id, local_nomenclatura, renta_mensual_fija, costo_por_m2
) VALUES (
  'AIFA-DCS-SSC-102-2023',
  'PTEIE2-14',
  NULL,
  NULL
);
INSERT OR IGNORE INTO contrato_locales (
  contrato_id, local_nomenclatura, renta_mensual_fija, costo_por_m2
) VALUES (
  'AIFA-DCS-SSC-102-2023',
  'PTEIE2-15',
  NULL,
  NULL
);
INSERT OR IGNORE INTO contrato_locales (
  contrato_id, local_nomenclatura, renta_mensual_fija, costo_por_m2
) VALUES (
  'AIFA-DCS-SSC-102-2023',
  'VWEIE3-07',
  NULL,
  NULL
);
INSERT OR IGNORE INTO contrato_locales (
  contrato_id, local_nomenclatura, renta_mensual_fija, costo_por_m2
) VALUES (
  'AIFA-DCS-SSC-102-2023',
  'PTEIE3-16',
  NULL,
  NULL
);
INSERT OR IGNORE INTO contrato_locales (
  contrato_id, local_nomenclatura, renta_mensual_fija, costo_por_m2
) VALUES (
  'AIFA-DCS-SSC-102-2023',
  'PTEIE3-17',
  NULL,
  NULL
);
INSERT OR IGNORE INTO contrato_locales (
  contrato_id, local_nomenclatura, renta_mensual_fija, costo_por_m2
) VALUES (
  'AIFA-DCS-SSC-102-2023',
  'PSEIE3-02',
  NULL,
  NULL
);
INSERT OR IGNORE INTO contrato_locales (
  contrato_id, local_nomenclatura, renta_mensual_fija, costo_por_m2
) VALUES (
  'AIFA-DCS-SSC-102-2023',
  'PCEIE4-01',
  NULL,
  NULL
);
INSERT OR IGNORE INTO contrato_locales (
  contrato_id, local_nomenclatura, renta_mensual_fija, costo_por_m2
) VALUES (
  'AIFA-DCS-SSC-102-2023',
  'VWEIE4-08',
  NULL,
  NULL
);
INSERT OR IGNORE INTO contrato_locales (
  contrato_id, local_nomenclatura, renta_mensual_fija, costo_por_m2
) VALUES (
  'AIFA-DCS-SSC-102-2023',
  'VWEIE4-09',
  NULL,
  NULL
);
INSERT OR IGNORE INTO contrato_locales (
  contrato_id, local_nomenclatura, renta_mensual_fija, costo_por_m2
) VALUES (
  'AIFA-DCS-SSC-102-2023',
  'PTEIE4-18',
  NULL,
  NULL
);
INSERT OR IGNORE INTO contrato_locales (
  contrato_id, local_nomenclatura, renta_mensual_fija, costo_por_m2
) VALUES (
  'AIFA-DCS-SSC-102-2023',
  'PTEIE4-19',
  NULL,
  NULL
);
INSERT OR IGNORE INTO contrato_locales (
  contrato_id, local_nomenclatura, renta_mensual_fija, costo_por_m2
) VALUES (
  'AIFA-DCS-SSC-102-2023',
  'VWEIF-10',
  NULL,
  NULL
);
INSERT OR IGNORE INTO contrato_locales (
  contrato_id, local_nomenclatura, renta_mensual_fija, costo_por_m2
) VALUES (
  'AIFA-DCS-SSC-102-2023',
  'PTEIF-21',
  NULL,
  NULL
);
INSERT OR IGNORE INTO contrato_locales (
  contrato_id, local_nomenclatura, renta_mensual_fija, costo_por_m2
) VALUES (
  'AIFA-DCS-SSC-102-2023',
  'PTEIF-22',
  NULL,
  NULL
);
INSERT OR IGNORE INTO contrato_locales (
  contrato_id, local_nomenclatura, renta_mensual_fija, costo_por_m2
) VALUES (
  'AIFA-DCS-SSC-102-2023',
  'PTEIF-23',
  NULL,
  NULL
);
INSERT OR IGNORE INTO contrato_locales (
  contrato_id, local_nomenclatura, renta_mensual_fija, costo_por_m2
) VALUES (
  'AIFA-DCS-SSC-102-2023',
  'PTEIF-24',
  NULL,
  NULL
);
INSERT OR IGNORE INTO contrato_locales (
  contrato_id, local_nomenclatura, renta_mensual_fija, costo_por_m2
) VALUES (
  'AIFA-DCS-SSC-102-2023',
  'VWEIH-15',
  NULL,
  NULL
);
INSERT OR IGNORE INTO contrato_locales (
  contrato_id, local_nomenclatura, renta_mensual_fija, costo_por_m2
) VALUES (
  'AIFA-DCS-SSC-102-2023',
  'VWEIH-16',
  NULL,
  NULL
);
INSERT OR IGNORE INTO contrato_locales (
  contrato_id, local_nomenclatura, renta_mensual_fija, costo_por_m2
) VALUES (
  'AIFA-DCS-SSC-102-2023',
  'PTEIH-37',
  NULL,
  NULL
);
INSERT OR IGNORE INTO contrato_locales (
  contrato_id, local_nomenclatura, renta_mensual_fija, costo_por_m2
) VALUES (
  'AIFA-DCS-SSC-102-2023',
  'PTEIH-38',
  NULL,
  NULL
);
INSERT OR IGNORE INTO contrato_locales (
  contrato_id, local_nomenclatura, renta_mensual_fija, costo_por_m2
) VALUES (
  'AIFA-DCS-SSC-102-2023',
  'PCEIH-01',
  NULL,
  NULL
);
INSERT OR IGNORE INTO contrato_locales (
  contrato_id, local_nomenclatura, renta_mensual_fija, costo_por_m2
) VALUES (
  'AIFA-DCS-SSC-102-2023',
  'VWENI-17',
  NULL,
  NULL
);
INSERT OR IGNORE INTO contrato_locales (
  contrato_id, local_nomenclatura, renta_mensual_fija, costo_por_m2
) VALUES (
  'AIFA-DCS-SSC-102-2023',
  'VWENI-18',
  NULL,
  NULL
);
INSERT OR IGNORE INTO contrato_locales (
  contrato_id, local_nomenclatura, renta_mensual_fija, costo_por_m2
) VALUES (
  'AIFA-DCS-SSC-102-2023',
  'PTENA-01',
  NULL,
  NULL
);
INSERT OR IGNORE INTO contrato_locales (
  contrato_id, local_nomenclatura, renta_mensual_fija, costo_por_m2
) VALUES (
  'AIFA-DCS-SSC-102-2023',
  'PTENA-02',
  NULL,
  NULL
);
INSERT OR IGNORE INTO contrato_locales (
  contrato_id, local_nomenclatura, renta_mensual_fija, costo_por_m2
) VALUES (
  'AIFA-DCS-SSC-102-2023',
  'PTENA-03',
  NULL,
  NULL
);
INSERT OR IGNORE INTO contrato_locales (
  contrato_id, local_nomenclatura, renta_mensual_fija, costo_por_m2
) VALUES (
  'AIFA-DCS-SSC-GEP-137-2025',
  'EFANL-168',
  NULL,
  NULL
);
INSERT OR IGNORE INTO contrato_locales (
  contrato_id, local_nomenclatura, renta_mensual_fija, costo_por_m2
) VALUES (
  'AIFA-DCS-SSC-GEP-173-2026',
  'SENA-MA01',
  NULL,
  NULL
);
INSERT OR IGNORE INTO contrato_locales (
  contrato_id, local_nomenclatura, renta_mensual_fija, costo_por_m2
) VALUES (
  'AIFA-DCS-SSC-GEP-079-2026',
  'PCEMA-01',
  NULL,
  NULL
);
INSERT OR IGNORE INTO contrato_locales (
  contrato_id, local_nomenclatura, renta_mensual_fija, costo_por_m2
) VALUES (
  'AIFA-DCS-SSC-GEP-079-2026',
  'PCEMB-01',
  NULL,
  NULL
);
INSERT OR IGNORE INTO contrato_locales (
  contrato_id, local_nomenclatura, renta_mensual_fija, costo_por_m2
) VALUES (
  'AIFA-DCS-SSC-GEP-079-2026',
  'PCEMA-02',
  NULL,
  NULL
);
INSERT OR IGNORE INTO contrato_locales (
  contrato_id, local_nomenclatura, renta_mensual_fija, costo_por_m2
) VALUES (
  'AIFA-DCS-SSC-GEP-079-2026',
  'PCEMB-02',
  NULL,
  NULL
);
INSERT OR IGNORE INTO contrato_locales (
  contrato_id, local_nomenclatura, renta_mensual_fija, costo_por_m2
) VALUES (
  'AIFA-DCS-SSC-GEP-079-2026',
  'PCEMA-03',
  NULL,
  NULL
);
INSERT OR IGNORE INTO contrato_locales (
  contrato_id, local_nomenclatura, renta_mensual_fija, costo_por_m2
) VALUES (
  'AIFA-DCS-SSC-GEP-079-2026',
  'PCEMB-03',
  NULL,
  NULL
);
INSERT OR IGNORE INTO contrato_locales (
  contrato_id, local_nomenclatura, renta_mensual_fija, costo_por_m2
) VALUES (
  'AIFA-DCS-SSC-GEP-079-2026',
  'PCTVP-01',
  NULL,
  NULL
);
INSERT OR IGNORE INTO contrato_locales (
  contrato_id, local_nomenclatura, renta_mensual_fija, costo_por_m2
) VALUES (
  'AIFA-DCS-SSC-GEP-079-2026',
  'PCTVP-02',
  NULL,
  NULL
);
INSERT OR IGNORE INTO contrato_locales (
  contrato_id, local_nomenclatura, renta_mensual_fija, costo_por_m2
) VALUES (
  'AIFA-DCS-SSC-GEP-079-2026',
  'PCTVP-03',
  NULL,
  NULL
);
INSERT OR IGNORE INTO contrato_locales (
  contrato_id, local_nomenclatura, renta_mensual_fija, costo_por_m2
) VALUES (
  'AIFA-DCS-SSC-GEP-079-2026',
  'PCTVP-04',
  NULL,
  NULL
);
INSERT OR IGNORE INTO contrato_locales (
  contrato_id, local_nomenclatura, renta_mensual_fija, costo_por_m2
) VALUES (
  'AIFA-DCS-SSC-GEP-079-2026',
  'PETELL-01',
  NULL,
  NULL
);
INSERT OR IGNORE INTO contrato_locales (
  contrato_id, local_nomenclatura, renta_mensual_fija, costo_por_m2
) VALUES (
  'AIFA-DCS-SSC-GEP-079-2026',
  'PETELL-02',
  NULL,
  NULL
);
INSERT OR IGNORE INTO contrato_locales (
  contrato_id, local_nomenclatura, renta_mensual_fija, costo_por_m2
) VALUES (
  'AIFA-DCS-SSC-GEP-079-2026',
  'PETELL-03',
  NULL,
  NULL
);
INSERT OR IGNORE INTO contrato_locales (
  contrato_id, local_nomenclatura, renta_mensual_fija, costo_por_m2
) VALUES (
  'AIFA-DCS-SSC-GEP-079-2026',
  'PETELL-04',
  NULL,
  NULL
);
INSERT OR IGNORE INTO contrato_locales (
  contrato_id, local_nomenclatura, renta_mensual_fija, costo_por_m2
) VALUES (
  'AIFA-DCS-SSC-GEP-079-2026',
  'PETELL-05',
  NULL,
  NULL
);
INSERT OR IGNORE INTO contrato_locales (
  contrato_id, local_nomenclatura, renta_mensual_fija, costo_por_m2
) VALUES (
  'AIFA-DCS-SSC-GEP-079-2026',
  'PETELL-06',
  NULL,
  NULL
);
INSERT OR IGNORE INTO contrato_locales (
  contrato_id, local_nomenclatura, renta_mensual_fija, costo_por_m2
) VALUES (
  'AIFA-DCS-SSC-GEP-079-2026',
  'PAC-01',
  NULL,
  NULL
);
INSERT OR IGNORE INTO contrato_locales (
  contrato_id, local_nomenclatura, renta_mensual_fija, costo_por_m2
) VALUES (
  'AIFA-DCS-SSC-GEP-107-2026',
  'EP-JE-01',
  NULL,
  NULL
);
INSERT OR IGNORE INTO contrato_locales (
  contrato_id, local_nomenclatura, renta_mensual_fija, costo_por_m2
) VALUES (
  'AIFA-DCS-SSC-GEP-108-2026',
  'EP-CTITT-02',
  NULL,
  NULL
);
INSERT OR IGNORE INTO contrato_locales (
  contrato_id, local_nomenclatura, renta_mensual_fija, costo_por_m2
) VALUES (
  'AIFA-DCS-SSC-GEP-109-2026',
  'EP-VLLEIE4-01',
  NULL,
  NULL
);
INSERT OR IGNORE INTO contrato_locales (
  contrato_id, local_nomenclatura, renta_mensual_fija, costo_por_m2
) VALUES (
  'AIFA-DCS-SSC-GEP-110-2026',
  'EP-VPM-01',
  NULL,
  NULL
);
INSERT OR IGNORE INTO contrato_locales (
  contrato_id, local_nomenclatura, renta_mensual_fija, costo_por_m2
) VALUES (
  'AIFA-DCS-SSC-GEP-137-2026',
  'EP-BENI-01',
  NULL,
  NULL
);
INSERT OR IGNORE INTO contrato_locales (
  contrato_id, local_nomenclatura, renta_mensual_fija, costo_por_m2
) VALUES (
  'AIFA-DCS-SSC-GEP-137-2026',
  'EP-SANL-4',
  NULL,
  NULL
);
INSERT OR IGNORE INTO contrato_locales (
  contrato_id, local_nomenclatura, renta_mensual_fija, costo_por_m2
) VALUES (
  'AIFA-DCS-SSC-GEP-137-2026',
  'EP-SANM-3',
  NULL,
  NULL
);
INSERT OR IGNORE INTO contrato_locales (
  contrato_id, local_nomenclatura, renta_mensual_fija, costo_por_m2
) VALUES (
  'AIFA-DCS-SSC-GEP-137-2026',
  'EP-SANM-4',
  NULL,
  NULL
);
INSERT OR IGNORE INTO contrato_locales (
  contrato_id, local_nomenclatura, renta_mensual_fija, costo_por_m2
) VALUES (
  'AIFA-DCS-SSC-GEP-139-2026',
  'EP-SANL-3',
  NULL,
  NULL
);
INSERT OR IGNORE INTO contrato_locales (
  contrato_id, local_nomenclatura, renta_mensual_fija, costo_por_m2
) VALUES (
  'AIFA-DCS-SSC-GEP-139-2026',
  'EP-MSEND-01',
  NULL,
  NULL
);
INSERT OR IGNORE INTO contrato_locales (
  contrato_id, local_nomenclatura, renta_mensual_fija, costo_por_m2
) VALUES (
  'AIFA-DCS-SSC-GEP-121-2026',
  'EP-BZEIJK-01',
  NULL,
  NULL
);
INSERT OR IGNORE INTO contrato_locales (
  contrato_id, local_nomenclatura, renta_mensual_fija, costo_por_m2
) VALUES (
  'AIFA-DCS-SSC-GEP-121-2026',
  'EP-BZEIJK-02',
  NULL,
  NULL
);
INSERT OR IGNORE INTO contrato_locales (
  contrato_id, local_nomenclatura, renta_mensual_fija, costo_por_m2
) VALUES (
  'AIFA-DCS-SSC-GEP-121-2026',
  'EP-BZEIJK-03',
  NULL,
  NULL
);
INSERT OR IGNORE INTO contrato_locales (
  contrato_id, local_nomenclatura, renta_mensual_fija, costo_por_m2
) VALUES (
  'AIFA-DCS-SSC-GEP-121-2026',
  'EP-BZEIJK-04',
  NULL,
  NULL
);
INSERT OR IGNORE INTO contrato_locales (
  contrato_id, local_nomenclatura, renta_mensual_fija, costo_por_m2
) VALUES (
  'AIFA-DCS-SSC-GEP-121-2026',
  'EP-BZEIJK-05',
  NULL,
  NULL
);
INSERT OR IGNORE INTO contrato_locales (
  contrato_id, local_nomenclatura, renta_mensual_fija, costo_por_m2
) VALUES (
  'AIFA-DCS-SSC-GEP-121-2026',
  'EP-BZEIJK-06',
  NULL,
  NULL
);
INSERT OR IGNORE INTO contrato_locales (
  contrato_id, local_nomenclatura, renta_mensual_fija, costo_por_m2
) VALUES (
  'AIFA-DCS-SSC-GEP-121-2026',
  'EP-BZEIJK-07',
  NULL,
  NULL
);
INSERT OR IGNORE INTO contrato_locales (
  contrato_id, local_nomenclatura, renta_mensual_fija, costo_por_m2
) VALUES (
  'AIFA-DCS-SSC-GEP-121-2026',
  'EP-BZEIJK-08',
  NULL,
  NULL
);
INSERT OR IGNORE INTO contrato_locales (
  contrato_id, local_nomenclatura, renta_mensual_fija, costo_por_m2
) VALUES (
  'AIFA-DCS-SSC-GEP-121-2026',
  'EP-BZEIJK-09',
  NULL,
  NULL
);
INSERT OR IGNORE INTO contrato_locales (
  contrato_id, local_nomenclatura, renta_mensual_fija, costo_por_m2
) VALUES (
  'AIFA-DCS-SSC-GEP-121-2026',
  'EP-BZEIJK-10',
  NULL,
  NULL
);
INSERT OR IGNORE INTO contrato_locales (
  contrato_id, local_nomenclatura, renta_mensual_fija, costo_por_m2
) VALUES (
  'AIFA-DCS-SSC-GEP-121-2026',
  'EP-BZEIJK-11',
  NULL,
  NULL
);
INSERT OR IGNORE INTO contrato_locales (
  contrato_id, local_nomenclatura, renta_mensual_fija, costo_por_m2
) VALUES (
  'AIFA-DCS-SSC-GEP-121-2026',
  'EP-BZEIJK-12',
  NULL,
  NULL
);
INSERT OR IGNORE INTO contrato_locales (
  contrato_id, local_nomenclatura, renta_mensual_fija, costo_por_m2
) VALUES (
  'AIFA-DCS-SSC-GEP-121-2026',
  'EP-BZEIJK-13',
  NULL,
  NULL
);
INSERT OR IGNORE INTO contrato_locales (
  contrato_id, local_nomenclatura, renta_mensual_fija, costo_por_m2
) VALUES (
  'AIFA-DCS-SSC-GEP-121-2026',
  'EP-BZEIJK-14',
  NULL,
  NULL
);
INSERT OR IGNORE INTO contrato_locales (
  contrato_id, local_nomenclatura, renta_mensual_fija, costo_por_m2
) VALUES (
  'AIFA-DCS-SSC-GEP-121-2026',
  'EP-BZEIJK-15',
  NULL,
  NULL
);
INSERT OR IGNORE INTO contrato_locales (
  contrato_id, local_nomenclatura, renta_mensual_fija, costo_por_m2
) VALUES (
  'AIFA-DCS-SSC-GEP-121-2026',
  'EP-BZEIJK-16',
  NULL,
  NULL
);
INSERT OR IGNORE INTO contrato_locales (
  contrato_id, local_nomenclatura, renta_mensual_fija, costo_por_m2
) VALUES (
  'AIFA-DCS-SSC-GEP-121-2026',
  'EP-BZEIJK-17',
  NULL,
  NULL
);
INSERT OR IGNORE INTO contrato_locales (
  contrato_id, local_nomenclatura, renta_mensual_fija, costo_por_m2
) VALUES (
  'AIFA-DCS-SSC-GEP-121-2026',
  'EP-BZEIJK-18',
  NULL,
  NULL
);
INSERT OR IGNORE INTO contrato_locales (
  contrato_id, local_nomenclatura, renta_mensual_fija, costo_por_m2
) VALUES (
  'AIFA-DCS-SSC-GEP-121-2026',
  'EP-BZEIJK-19',
  NULL,
  NULL
);
INSERT OR IGNORE INTO contrato_locales (
  contrato_id, local_nomenclatura, renta_mensual_fija, costo_por_m2
) VALUES (
  'AIFA-DCS-SSC-030-2024',
  'EP-PESC-01',
  NULL,
  NULL
);
INSERT OR IGNORE INTO contrato_locales (
  contrato_id, local_nomenclatura, renta_mensual_fija, costo_por_m2
) VALUES (
  'AIFA-DCS-SSC-030-2024',
  'EP-PESG1-02',
  NULL,
  NULL
);
INSERT OR IGNORE INTO contrato_locales (
  contrato_id, local_nomenclatura, renta_mensual_fija, costo_por_m2
) VALUES (
  'AIFA-DCS-SSC-GEP-071-2026',
  'A01-B01',
  NULL,
  NULL
);
INSERT OR IGNORE INTO contrato_locales (
  contrato_id, local_nomenclatura, renta_mensual_fija, costo_por_m2
) VALUES (
  'AIFA-DCS-SSC-GEP-071-2026',
  'A02-B02',
  NULL,
  NULL
);
INSERT OR IGNORE INTO contrato_locales (
  contrato_id, local_nomenclatura, renta_mensual_fija, costo_por_m2
) VALUES (
  'AIFA-DCS-SSC-GEP-071-2026',
  'A03-B03',
  NULL,
  NULL
);
INSERT OR IGNORE INTO contrato_locales (
  contrato_id, local_nomenclatura, renta_mensual_fija, costo_por_m2
) VALUES (
  'AIFA-DCS-SSC-GEP-071-2026',
  'A04-B04',
  NULL,
  NULL
);
INSERT OR IGNORE INTO contrato_locales (
  contrato_id, local_nomenclatura, renta_mensual_fija, costo_por_m2
) VALUES (
  'AIFA-DCS-SSC-GEP-071-2026',
  'A05-B05',
  NULL,
  NULL
);
INSERT OR IGNORE INTO contrato_locales (
  contrato_id, local_nomenclatura, renta_mensual_fija, costo_por_m2
) VALUES (
  'AIFA-DCS-SSC-GEP-071-2026',
  'A06-B06',
  NULL,
  NULL
);
INSERT OR IGNORE INTO contrato_locales (
  contrato_id, local_nomenclatura, renta_mensual_fija, costo_por_m2
) VALUES (
  'AIFA-DCS-SSC-GEP-071-2026',
  'A07-B07',
  NULL,
  NULL
);
INSERT OR IGNORE INTO contrato_locales (
  contrato_id, local_nomenclatura, renta_mensual_fija, costo_por_m2
) VALUES (
  'AIFA-DCS-SSC-GEP-071-2026',
  'A08-B08',
  NULL,
  NULL
);
INSERT OR IGNORE INTO contrato_locales (
  contrato_id, local_nomenclatura, renta_mensual_fija, costo_por_m2
) VALUES (
  'AIFA-DCS-SSC-GEP-071-2026',
  'A09-B09',
  NULL,
  NULL
);
INSERT OR IGNORE INTO contrato_locales (
  contrato_id, local_nomenclatura, renta_mensual_fija, costo_por_m2
) VALUES (
  'AIFA-DCS-SSC-GEP-071-2026',
  'A10-B10',
  NULL,
  NULL
);
INSERT OR IGNORE INTO contrato_locales (
  contrato_id, local_nomenclatura, renta_mensual_fija, costo_por_m2
) VALUES (
  'AIFA-DCS-SSC-GEP-071-2026',
  'A11-B11',
  NULL,
  NULL
);
INSERT OR IGNORE INTO contrato_locales (
  contrato_id, local_nomenclatura, renta_mensual_fija, costo_por_m2
) VALUES (
  'AIFA-DCS-SSC-GEP-071-2026',
  'A12-B12',
  NULL,
  NULL
);
INSERT OR IGNORE INTO contrato_locales (
  contrato_id, local_nomenclatura, renta_mensual_fija, costo_por_m2
) VALUES (
  'AIFA-DCS-SSC-GEP-071-2026',
  'A13-B13',
  NULL,
  NULL
);
INSERT OR IGNORE INTO contrato_locales (
  contrato_id, local_nomenclatura, renta_mensual_fija, costo_por_m2
) VALUES (
  'AIFA-DCS-SSC-GEP-071-2026',
  'A14-B14',
  NULL,
  NULL
);
INSERT OR IGNORE INTO contrato_locales (
  contrato_id, local_nomenclatura, renta_mensual_fija, costo_por_m2
) VALUES (
  'AIFA-DCS-SSC-GEP-071-2026',
  'A15-B15',
  NULL,
  NULL
);
INSERT OR IGNORE INTO contrato_locales (
  contrato_id, local_nomenclatura, renta_mensual_fija, costo_por_m2
) VALUES (
  'AIFA-DCS-SSC-GEP-071-2026',
  'A16-B16',
  NULL,
  NULL
);
INSERT OR IGNORE INTO contrato_locales (
  contrato_id, local_nomenclatura, renta_mensual_fija, costo_por_m2
) VALUES (
  'AIFA-DCS-SSC-GEP-071-2026',
  'A17-B17',
  NULL,
  NULL
);
INSERT OR IGNORE INTO contrato_locales (
  contrato_id, local_nomenclatura, renta_mensual_fija, costo_por_m2
) VALUES (
  'AIFA-DCS-SSC-GEP-071-2026',
  'A18-B18',
  NULL,
  NULL
);
INSERT OR IGNORE INTO contrato_locales (
  contrato_id, local_nomenclatura, renta_mensual_fija, costo_por_m2
) VALUES (
  'AIFA-DCS-SSC-GEP-071-2026',
  'A19-B19',
  NULL,
  NULL
);
INSERT OR IGNORE INTO contrato_locales (
  contrato_id, local_nomenclatura, renta_mensual_fija, costo_por_m2
) VALUES (
  'AIFA-DCS-SSC-GEP-071-2026',
  'A20-B20',
  NULL,
  NULL
);
INSERT OR IGNORE INTO contrato_locales (
  contrato_id, local_nomenclatura, renta_mensual_fija, costo_por_m2
) VALUES (
  'AIFA-DCS-SSC-GEP-071-2026',
  'A21-B21',
  NULL,
  NULL
);
INSERT OR IGNORE INTO contrato_locales (
  contrato_id, local_nomenclatura, renta_mensual_fija, costo_por_m2
) VALUES (
  'AIFA-DCS-SSC-GEP-086-2026',
  'EP-BRE-IJK',
  NULL,
  NULL
);
INSERT OR IGNORE INTO contrato_locales (
  contrato_id, local_nomenclatura, renta_mensual_fija, costo_por_m2
) VALUES (
  'AIFA-DCS-SSC-GEP-135-2026',
  'ISA-ETP-01',
  NULL,
  NULL
);
INSERT OR IGNORE INTO contrato_locales (
  contrato_id, local_nomenclatura, renta_mensual_fija, costo_por_m2
) VALUES (
  'AIFA-DCS-SSC-GEP-135-2026',
  'ISA-ETP-02',
  NULL,
  NULL
);
INSERT OR IGNORE INTO contrato_locales (
  contrato_id, local_nomenclatura, renta_mensual_fija, costo_por_m2
) VALUES (
  'AIFA-DCS-SSC-GEP-135-2026',
  'ISA-ETP-03',
  NULL,
  NULL
);
INSERT OR IGNORE INTO contrato_locales (
  contrato_id, local_nomenclatura, renta_mensual_fija, costo_por_m2
) VALUES (
  'AIFA-DCS-SSC-GEP-135-2026',
  'ISA-ETP-04',
  NULL,
  NULL
);
INSERT OR IGNORE INTO contrato_locales (
  contrato_id, local_nomenclatura, renta_mensual_fija, costo_por_m2
) VALUES (
  'AIFA-DCS-SSC-GEP-135-2026',
  'ISA-ETP-05',
  NULL,
  NULL
);
INSERT OR IGNORE INTO contrato_locales (
  contrato_id, local_nomenclatura, renta_mensual_fija, costo_por_m2
) VALUES (
  'AIFA-DCS-SSC-GEP-135-2026',
  'ISA-ETP-06',
  NULL,
  NULL
);
INSERT OR IGNORE INTO contrato_locales (
  contrato_id, local_nomenclatura, renta_mensual_fija, costo_por_m2
) VALUES (
  'AIFA-DCS-SSC-GEP-135-2026',
  'ISA-ETP-07',
  NULL,
  NULL
);
INSERT OR IGNORE INTO contrato_locales (
  contrato_id, local_nomenclatura, renta_mensual_fija, costo_por_m2
) VALUES (
  'AIFA-DCS-SSC-GEP-135-2026',
  'ISA-ETP-08',
  NULL,
  NULL
);
INSERT OR IGNORE INTO contrato_locales (
  contrato_id, local_nomenclatura, renta_mensual_fija, costo_por_m2
) VALUES (
  'AIFA-DCS-SSC-GEP-135-2026',
  'ISA-ETP-09',
  NULL,
  NULL
);
INSERT OR IGNORE INTO contrato_locales (
  contrato_id, local_nomenclatura, renta_mensual_fija, costo_por_m2
) VALUES (
  'AIFA-DCS-SSC-GEP-135-2026',
  'ISA-ETP-10',
  NULL,
  NULL
);
INSERT OR IGNORE INTO contrato_locales (
  contrato_id, local_nomenclatura, renta_mensual_fija, costo_por_m2
) VALUES (
  'AIFA-DCS-SSC-GEP-135-2026',
  'ISA-ETP-11',
  NULL,
  NULL
);
INSERT OR IGNORE INTO contrato_locales (
  contrato_id, local_nomenclatura, renta_mensual_fija, costo_por_m2
) VALUES (
  'AIFA-DCS-SSC-GEP-135-2026',
  'ISA-ETP-12',
  NULL,
  NULL
);
INSERT OR IGNORE INTO contrato_locales (
  contrato_id, local_nomenclatura, renta_mensual_fija, costo_por_m2
) VALUES (
  'AIFA-DCS-SSC-GEP-135-2026',
  'ISA-ETP-13',
  NULL,
  NULL
);
INSERT OR IGNORE INTO contrato_locales (
  contrato_id, local_nomenclatura, renta_mensual_fija, costo_por_m2
) VALUES (
  'AIFA-DCS-SSC-GEP-135-2026',
  'ISA-ETP-14',
  NULL,
  NULL
);
INSERT OR IGNORE INTO contrato_locales (
  contrato_id, local_nomenclatura, renta_mensual_fija, costo_por_m2
) VALUES (
  'AIFA-DCS-SSC-GEP-135-2026',
  'ISA-ETP-15',
  NULL,
  NULL
);
INSERT OR IGNORE INTO contrato_locales (
  contrato_id, local_nomenclatura, renta_mensual_fija, costo_por_m2
) VALUES (
  'AIFA-DCS-SSC-GEP-135-2026',
  'ISA-ETP-16',
  NULL,
  NULL
);
INSERT OR IGNORE INTO contrato_locales (
  contrato_id, local_nomenclatura, renta_mensual_fija, costo_por_m2
) VALUES (
  'AIFA-DCS-SSC-GEP-135-2026',
  'ISA-ETP-17',
  NULL,
  NULL
);
INSERT OR IGNORE INTO contrato_locales (
  contrato_id, local_nomenclatura, renta_mensual_fija, costo_por_m2
) VALUES (
  'AIFA-DCS-SSC-GEP-135-2026',
  'ISA-ETP-18',
  NULL,
  NULL
);
INSERT OR IGNORE INTO contrato_locales (
  contrato_id, local_nomenclatura, renta_mensual_fija, costo_por_m2
) VALUES (
  'AIFA-DCS-SSC-GEP-135-2026',
  'ISA-ETP-19',
  NULL,
  NULL
);
INSERT OR IGNORE INTO contrato_locales (
  contrato_id, local_nomenclatura, renta_mensual_fija, costo_por_m2
) VALUES (
  'AIFA-DCS-SSC-GEP-135-2026',
  'ISA-ETP-20',
  NULL,
  NULL
);
INSERT OR IGNORE INTO contrato_locales (
  contrato_id, local_nomenclatura, renta_mensual_fija, costo_por_m2
) VALUES (
  'AIFA-DCS-SSC-GEP-135-2026',
  'ISA-ETP-21',
  NULL,
  NULL
);
INSERT OR IGNORE INTO contrato_locales (
  contrato_id, local_nomenclatura, renta_mensual_fija, costo_por_m2
) VALUES (
  'AIFA-DCS-SSC-GEP-135-2026',
  'ISA-ETP-22',
  NULL,
  NULL
);
INSERT OR IGNORE INTO contrato_locales (
  contrato_id, local_nomenclatura, renta_mensual_fija, costo_por_m2
) VALUES (
  'AIFA-DCS-SSC-GEP-135-2026',
  'ISA-ETP-23',
  NULL,
  NULL
);
INSERT OR IGNORE INTO contrato_locales (
  contrato_id, local_nomenclatura, renta_mensual_fija, costo_por_m2
) VALUES (
  'AIFA-DCS-SSC-GEP-135-2026',
  'ISA-ETP-24',
  NULL,
  NULL
);
INSERT OR IGNORE INTO contrato_locales (
  contrato_id, local_nomenclatura, renta_mensual_fija, costo_por_m2
) VALUES (
  'AIFA-DCS-SSC-GEP-135-2026',
  'ISA-ETP-25',
  NULL,
  NULL
);
INSERT OR IGNORE INTO contrato_locales (
  contrato_id, local_nomenclatura, renta_mensual_fija, costo_por_m2
) VALUES (
  'AIFA-DCS-SSC-GEP-135-2026',
  'ISA-ETP-26',
  NULL,
  NULL
);
INSERT OR IGNORE INTO contrato_locales (
  contrato_id, local_nomenclatura, renta_mensual_fija, costo_por_m2
) VALUES (
  'AIFA-DCS-SSC-GEP-135-2026',
  'ISA-ETP-27',
  NULL,
  NULL
);
INSERT OR IGNORE INTO contrato_locales (
  contrato_id, local_nomenclatura, renta_mensual_fija, costo_por_m2
) VALUES (
  'AIFA-DCS-SSC-GEP-135-2026',
  'ISA-ETP-28',
  NULL,
  NULL
);
INSERT OR IGNORE INTO contrato_locales (
  contrato_id, local_nomenclatura, renta_mensual_fija, costo_por_m2
) VALUES (
  'AIFA-DCS-SSC-GEP-178-2025',
  'LLANM-22',
  NULL,
  NULL
);
INSERT OR IGNORE INTO contrato_locales (
  contrato_id, local_nomenclatura, renta_mensual_fija, costo_por_m2
) VALUES (
  'AIFA-DCS-SSC-GEP-168-2026',
  'EP-LLANL-01',
  NULL,
  NULL
);
INSERT OR IGNORE INTO contrato_locales (
  contrato_id, local_nomenclatura, renta_mensual_fija, costo_por_m2
) VALUES (
  'AIFA-DCS-SSC-GEP-168-2026',
  'EP-LLANL-04',
  NULL,
  NULL
);
INSERT OR IGNORE INTO contrato_locales (
  contrato_id, local_nomenclatura, renta_mensual_fija, costo_por_m2
) VALUES (
  'AIFA-DCS-SSC-GEP-168-2026',
  'EP-LLANL-05',
  NULL,
  NULL
);
INSERT OR IGNORE INTO contrato_locales (
  contrato_id, local_nomenclatura, renta_mensual_fija, costo_por_m2
) VALUES (
  'AIFA-DCS-SSC-GEP-168-2026',
  'EP-LLANL-06',
  NULL,
  NULL
);
INSERT OR IGNORE INTO contrato_locales (
  contrato_id, local_nomenclatura, renta_mensual_fija, costo_por_m2
) VALUES (
  'AIFA-DCS-SSC-GEP-168-2026',
  'EP-LLANL-09',
  NULL,
  NULL
);
INSERT OR IGNORE INTO contrato_locales (
  contrato_id, local_nomenclatura, renta_mensual_fija, costo_por_m2
) VALUES (
  'AIFA-DCS-SSC-GEP-168-2026',
  'EP-SANL-1',
  NULL,
  NULL
);
