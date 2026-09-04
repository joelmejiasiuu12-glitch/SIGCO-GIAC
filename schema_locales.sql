-- TABLA 1: ZONAS COMERCIALES
CREATE TABLE IF NOT EXISTS zonas (
  id TEXT PRIMARY KEY,
  nombre TEXT NOT NULL,
  nombre_corto TEXT NOT NULL,
  tipo_espacio_etiqueta TEXT DEFAULT 'locales'
);

-- Inserción de las 7 zonas comerciales
INSERT OR IGNORE INTO zonas (id, nombre, nombre_corto, tipo_espacio_etiqueta) VALUES
  ('etp', 'Edificio Terminal de Pasajeros (ETP)', 'ETP', 'locales'),
  ('parque-santa-lucia', 'Parque Santa Lucía', 'Parque Santa Lucía', 'locales'),
  ('carga-aduana', 'Edificio de Servicios', 'Edificio de Servicios', 'espacios'),
  ('autobuses-plaza', 'Terminal Intermodal de Transportación Terrestre (TITT)', 'TITT', 'locales'),
  ('parque-revolucion', 'Glorieta Felipe Ángeles (Parque Revolución)', 'Parque Revolución', 'espacios'),
  ('ciudad-aeroportuaria', 'Ciudad Aeroportuaria', 'Ciudad Aeroportuaria', 'manzanas'),
  ('calzada-mamuts', 'Calzada de los Mamuts', 'Calzada de los Mamuts', 'predios');

-- TABLA 2: LOCALES E INVENTARIO FÍSICO
CREATE TABLE IF NOT EXISTS locales (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  nomenclatura TEXT NOT NULL UNIQUE,
  zona_id TEXT NOT NULL,
  lado TEXT,
  area TEXT,
  modulo TEXT,
  nivel TEXT,
  metraje REAL,
  metraje_original TEXT,
  metraje_construido REAL,
  tipo_espacio TEXT,
  estatus TEXT NOT NULL DEFAULT 'DISPONIBLE',
  situacion TEXT,
  subdireccion TEXT,
  gerencia TEXT,
  observaciones TEXT,
  activo INTEGER DEFAULT 1,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (zona_id) REFERENCES zonas(id) ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_locales_zona ON locales(zona_id);
CREATE INDEX IF NOT EXISTS idx_locales_estatus ON locales(estatus);
CREATE INDEX IF NOT EXISTS idx_locales_nivel ON locales(nivel);
CREATE INDEX IF NOT EXISTS idx_locales_modulo ON locales(modulo);
