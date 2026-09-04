/** Cloudflare Worker entry point for the vinext-starter template. */
import { handleImageOptimization, DEFAULT_DEVICE_SIZES, DEFAULT_IMAGE_SIZES } from "vinext/server/image-optimization";
import handler from "vinext/server/app-router-entry";

interface Env {
  ASSETS: Fetcher;
  IMAGES: {
    input(stream: ReadableStream): {
      transform(options: Record<string, unknown>): {
        output(options: { format: string; quality: number }): Promise<{ response(): Response }>;
      };
    };
  };
  DB?: D1Database;
}

interface ExecutionContext {
  waitUntil(promise: Promise<unknown>): void;
  passThroughOnException(): void;
}

const worker = {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);

    // Endpoint API para gestión de locales conectados a Cloudflare D1
    if (url.pathname === "/api/locales") {
      const headers = { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" };

      if (request.method === "OPTIONS") {
        return new Response(null, {
          headers: {
            ...headers,
            "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
            "Access-Control-Allow-Headers": "Content-Type",
          },
        });
      }

      if (!env.DB) {
        return new Response(JSON.stringify({ success: false, error: "Cloudflare D1 no configurado" }), {
          status: 500,
          headers,
        });
      }

      try {
        if (request.method === "GET") {
          let locales: unknown[] = [];
          try {
            const { results } = await env.DB.prepare(
              "SELECT * FROM v_locales_completo WHERE activo = 1 ORDER BY zona_id ASC, nomenclatura ASC"
            ).all();
            locales = results;
          } catch {
            const { results } = await env.DB.prepare(
              "SELECT * FROM locales WHERE activo = 1 ORDER BY zona_id ASC, nomenclatura ASC"
            ).all();
            locales = results;
          }

          let contracts: unknown[] = [];
          try {
            const { results } = await env.DB.prepare(`
              SELECT 
                c.numero_contrato AS contractNumber,
                CASE 
                  WHEN LOWER(c.etapa_contractual) LIKE '%cancelad%' THEN 'cancelled'
                  WHEN LOWER(c.etapa_contractual) LIKE '%fenecid%' OR LOWER(c.etapa_contractual) LIKE '%expirad%' THEN 'expired'
                  WHEN LOWER(c.etapa_contractual) LIKE '%convenio%' THEN 'agreements'
                  WHEN LOWER(c.etapa_contractual) LIKE '%preformal%' THEN 'preformalization'
                  WHEN LOWER(c.etapa_contractual) LIKE '%formalizac%' THEN 'formalization'
                  ELSE 'formalized'
                END AS contractStage,
                c.estatus_operativo AS contractStatus,
                COALESCE(c.gerencia, 'GSC') AS gerencia,
                c.fecha_firma AS signatureDate,
                c.fecha_firma AS fechaFormalizacion,
                c.fecha_conclusion AS fechaConclusion,
                c.fecha_inicio_operaciones AS operationsStartDate,
                c.fecha_renovacion AS renewalDate,
                c.plazo_vigencia AS contractTerm,
                c.dias_restantes AS daysRemaining,
                c.estatus_fianza AS guaranteeStatus,
                c.estatus_poliza_rc AS liabilityPolicyStatus,
                c.estatus_proyecto_obra AS projectStatus,
                c.gestor_responsable AS manager,
                c.observaciones_expediente AS observaciones,
                m.nombre_comercial AS marca,
                m.giro_operativo AS giroOperativo,
                m.giro_iata AS giroIata,
                m.giro_indaabin AS giroIndaabin,
                m.linea_comercial AS commercialLine,
                m.sublinea_comercial AS commercialSubline,
                rs.razon_social AS razonSocial,
                rs.datos_contacto AS contactData,
                cl.local_nomenclatura AS nomenclatura,
                COALESCE(l.zona_id, 'etp') AS contractLocationId,
                COALESCE(z.nombre, 'Edificio Terminal de Pasajeros (ETP)') AS contractLocationName,
                COALESCE(z.nombre, 'ETP') AS zonaComercial,
                cl.renta_mensual_fija AS monthlyRent,
                cl.costo_por_m2 AS costPerM2,
                cl.porcentaje_participacion AS participationRate,
                cl.notas_participacion AS participationNotes,
                l.lado,
                l.area,
                l.modulo,
                l.nivel,
                l.tipo_espacio AS areaComercial,
                l.metraje
              FROM contratos c
              LEFT JOIN marcas m ON c.marca_id = m.id
              LEFT JOIN razones_sociales rs ON c.razon_social_id = rs.id
              LEFT JOIN contrato_locales cl ON c.numero_contrato = cl.contrato_id
              LEFT JOIN locales l ON cl.local_nomenclatura = l.nomenclatura
              LEFT JOIN zonas z ON l.zona_id = z.id
            `).all();
            contracts = results;
          } catch {}

          let passengerTraffic: unknown[] = [];
          try {
            const { results } = await env.DB.prepare(
              "SELECT year, month, month_name AS monthName, passengers, status FROM trafico_pasajeros ORDER BY year ASC, month ASC"
            ).all();
            passengerTraffic = results;
          } catch {}

          let etpCommercialCapacity: unknown = null;
          try {
            const cap = (await env.DB.prepare("SELECT * FROM capacidad_comercial LIMIT 1").first()) as Record<string, unknown> | null;
            if (cap) {
              etpCommercialCapacity = {
                terminalPassengerCapacity: cap.terminal_passenger_capacity,
                commercialAreaFactor: cap.commercial_area_factor,
                recommendedCommercialArea: cap.recommended_commercial_area,
                leasedCommercialArea: cap.leased_commercial_area,
                commercialPassengerCapacity: cap.commercial_passenger_capacity,
              };
            }
          } catch {}

          let advertisingSpaces: unknown[] = [];
          try {
            const { results } = await env.DB.prepare(
              "SELECT * FROM espacios_publicitarios ORDER BY id_unidad ASC"
            ).all();
            advertisingSpaces = results;
          } catch {}

          return new Response(JSON.stringify({
            success: true,
            locales,
            contracts,
            passengerTraffic,
            etpCommercialCapacity,
            advertisingSpaces,
          }), { headers });
        }

        if (request.method === "POST") {
          const body = (await request.json()) as Record<string, unknown>;
          const nom = String(body.nomenclatura || "").trim();
          const estatus = String(body.estatus || body.estatus_fisico || "DISPONIBLE").toUpperCase();

          const stmt = env.DB.prepare(`
            INSERT INTO locales (
              nomenclatura, zona_id, lado, area, modulo, nivel, metraje, 
              metraje_original, metraje_construido, tipo_espacio, estatus_fisico, 
              situacion, subdireccion_responsable, gerencia, observaciones
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          `);

          const result = await stmt.bind(
            nom,
            body.zona_id || body.contractLocationId || "etp",
            body.lado ?? null,
            body.area ?? null,
            body.modulo ?? null,
            body.nivel ?? "1",
            body.metraje ?? null,
            body.metraje_original ?? (body.metraje ? String(body.metraje) : null),
            body.metraje_construido ?? null,
            body.tipo_espacio ?? body.areaComercial ?? "Local",
            estatus,
            body.situacion ?? null,
            body.subdireccion_responsable ?? body.subdireccion ?? "SVS COM",
            body.gerencia ?? "GSC",
            body.observaciones ?? null
          ).run();

          // Manejo opcional de marca y contrato si se envía
          const marcaName = body.marca ? String(body.marca).trim() : null;
          if (marcaName) {
            try {
              await env.DB.prepare(
                "INSERT OR IGNORE INTO marcas (nombre_comercial, giro_operativo) VALUES (?, ?)"
              ).bind(marcaName, body.giroOperativo ?? body.giro_operativo ?? null).run();
            } catch {}
          }

          const contractNum = body.contractNumber ?? body.contract_number;
          if (contractNum) {
            try {
              const contractId = String(contractNum).trim();
              const rent = body.monthlyRent !== undefined ? Number(body.monthlyRent) : null;
              const cost = body.costPerM2 !== undefined ? Number(body.costPerM2) : null;
              const part = body.participationRate !== undefined ? Number(body.participationRate) : null;

              await env.DB.prepare(`
                INSERT OR IGNORE INTO contratos (numero_contrato, etapa_contractual, estatus_operativo, gestor_responsable)
                VALUES (?, 'Formalizado', ?, ?)
              `).bind(contractId, body.situacion ?? "OPERANDO", body.manager ?? null).run();

              await env.DB.prepare(`
                INSERT OR REPLACE INTO contrato_locales (contrato_id, local_nomenclatura, renta_mensual_fija, costo_por_m2, porcentaje_participacion)
                VALUES (?, ?, ?, ?, ?)
              `).bind(contractId, nom, rent, cost, part).run();
            } catch {}
          }

          return new Response(JSON.stringify({ success: true, id: result.meta.last_row_id }), { headers });
        }

        if (request.method === "PUT") {
          const body = (await request.json()) as Record<string, unknown>;
          const nom = String(body.nomenclatura || "").trim();
          const estatus = String(body.estatus || body.estatus_fisico || "DISPONIBLE").toUpperCase();

          const stmt = env.DB.prepare(`
            UPDATE locales
            SET zona_id = COALESCE(?, zona_id),
                lado = ?,
                area = ?,
                modulo = ?,
                nivel = ?,
                metraje = ?,
                tipo_espacio = ?,
                estatus_fisico = ?,
                situacion = ?,
                subdireccion_responsable = COALESCE(?, subdireccion_responsable),
                gerencia = ?,
                observaciones = ?,
                updated_at = CURRENT_TIMESTAMP
            WHERE id = ? OR nomenclatura = ?
          `);

          await stmt.bind(
            body.zona_id || body.contractLocationId || null,
            body.lado ?? null,
            body.area ?? null,
            body.modulo ?? null,
            body.nivel ?? "1",
            body.metraje ?? null,
            body.tipo_espacio ?? body.areaComercial ?? "Local",
            estatus,
            body.situacion ?? null,
            body.subdireccion_responsable ?? body.subdireccion ?? null,
            body.gerencia ?? null,
            body.observaciones ?? null,
            body.id ?? null,
            nom
          ).run();

          // Actualización de montos contractuales si vienen en el payload
          const contractNum = body.contractNumber ?? body.contract_number;
          if (contractNum) {
            try {
              const contractId = String(contractNum).trim();
              const rent = body.monthlyRent !== undefined ? Number(body.monthlyRent) : null;
              const cost = body.costPerM2 !== undefined ? Number(body.costPerM2) : null;
              const part = body.participationRate !== undefined ? Number(body.participationRate) : null;

              await env.DB.prepare(`
                INSERT OR REPLACE INTO contrato_locales (contrato_id, local_nomenclatura, renta_mensual_fija, costo_por_m2, porcentaje_participacion)
                VALUES (?, ?, ?, ?, ?)
              `).bind(contractId, nom, rent, cost, part).run();
            } catch {}
          }

          return new Response(JSON.stringify({ success: true }), { headers });
        }

        if (request.method === "DELETE") {
          const idOrNom = url.searchParams.get("id") || url.searchParams.get("nomenclatura");
          if (!idOrNom) {
            return new Response(JSON.stringify({ success: false, error: "Parámetro id o nomenclatura requerido" }), {
              status: 400,
              headers,
            });
          }

          await env.DB.prepare("DELETE FROM locales WHERE id = ? OR nomenclatura = ?").bind(idOrNom, idOrNom).run();
          await env.DB.prepare("DELETE FROM contrato_locales WHERE local_nomenclatura = ?").bind(idOrNom).run();
          return new Response(JSON.stringify({ success: true }), { headers });
        }
      } catch (err: unknown) {
        const errorMsg = err instanceof Error ? err.message : String(err);
        return new Response(JSON.stringify({ success: false, error: errorMsg }), {
          status: 400,
          headers,
        });
      }
    }

    // Endpoint API para inventario de espacios publicitarios
    if (url.pathname === "/api/espacios-publicitarios") {
      const headers = { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" };

      if (request.method === "OPTIONS") {
        return new Response(null, {
          headers: {
            ...headers,
            "Access-Control-Allow-Methods": "GET, OPTIONS",
            "Access-Control-Allow-Headers": "Content-Type",
          },
        });
      }

      if (!env.DB) {
        return new Response(JSON.stringify({ success: false, error: "Cloudflare D1 no configurado" }), {
          status: 500,
          headers,
        });
      }

      try {
        const { results } = await env.DB.prepare(
          "SELECT * FROM espacios_publicitarios ORDER BY id_unidad ASC"
        ).all();

        return new Response(JSON.stringify({
          success: true,
          total: results.length,
          advertisingSpaces: results,
        }), { headers });
      } catch (err) {
        return new Response(JSON.stringify({ success: false, error: String(err) }), {
          status: 500,
          headers,
        });
      }
    }

    // Endpoint API para autenticación institucional
    if (url.pathname === "/api/auth/login") {
      const headers = { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" };
      if (request.method === "OPTIONS") {
        return new Response(null, {
          headers: {
            ...headers,
            "Access-Control-Allow-Methods": "POST, OPTIONS",
            "Access-Control-Allow-Headers": "Content-Type",
          },
        });
      }

      if (request.method === "POST") {
        try {
          const { username, password } = (await request.json()) as any;
          const normU = String(username ?? "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim().toLowerCase();
          const p = String(password ?? "").trim();

          const users = [
            {
              aliases: ["encargada de la subdirección servicios comerciales", "encargada de la subdireccion servicios comerciales", "encargada de la subdirección", "subdirectora", "subdireccion"],
              pass: "SSC&Dsje.",
              user: {
                username: "Encargada de la Subdirección Servicios Comerciales",
                fullName: "Encargada de la Subdirección de Servicios Comerciales",
                role: "subdirectora",
                roleLabel: "Encargada de la Subdirección",
                shortRole: "Subdirección SSC",
                canEdit: true,
                canDelete: true,
              },
            },
            {
              aliases: ["gerente de servicios comerciales", "gerente servicios comerciales", "gerente gsc", "gerencia de servicios comerciales", "gsc"],
              pass: "GSC&2026.",
              user: {
                username: "Gerente de Servicios Comerciales",
                fullName: "Gerente de Servicios Comerciales · AIFA",
                role: "gerente_gsc",
                roleLabel: "Gerente de Servicios Comerciales",
                shortRole: "Gerencia GSC",
                canEdit: true,
                canDelete: false,
              },
            },
            {
              aliases: ["auxiliar administrativo", "auxiliar", "jmg"],
              pass: "SSC&Jmg.",
              user: {
                username: "Auxiliar Administrativo",
                fullName: "Auxiliar Administrativo de Servicios Comerciales",
                role: "auxiliar",
                roleLabel: "Auxiliar Administrativo",
                shortRole: "Auxiliar SSC",
                canEdit: true,
                canDelete: false,
              },
            },
            {
              aliases: ["invitado", "consulta", "auditor", "guest"],
              pass: "SSC&Inv.",
              user: {
                username: "Invitado",
                fullName: "Usuario de Consulta e Invitado Institucional",
                role: "invitado",
                roleLabel: "Invitado / Solo Lectura",
                shortRole: "Invitado",
                canEdit: false,
                canDelete: false,
              },
            },
          ];

          const found = users.find((u) => u.aliases.some((a) => a === normU) && u.pass === p);
          if (found) {
            return new Response(JSON.stringify({ success: true, user: found.user }), { headers });
          }
          return new Response(JSON.stringify({ success: false, error: "Credenciales inválidas" }), {
            status: 401,
            headers,
          });
        } catch {
          return new Response(JSON.stringify({ success: false, error: "Petición inválida" }), {
            status: 400,
            headers,
          });
        }
      }
    }

    // Endpoint API para gestión integral de contratos (CRUD) en Cloudflare D1
    if (url.pathname === "/api/contratos") {
      const headers = { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" };

      if (request.method === "OPTIONS") {
        return new Response(null, {
          headers: {
            ...headers,
            "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
            "Access-Control-Allow-Headers": "Content-Type",
          },
        });
      }

      if (!env.DB) {
        return new Response(JSON.stringify({ success: false, error: "Cloudflare D1 no configurado" }), {
          status: 500,
          headers,
        });
      }

      try {
        if (request.method === "GET") {
          const { results } = await env.DB.prepare(`
            SELECT 
              c.numero_contrato AS contractNumber,
              CASE 
                WHEN LOWER(c.etapa_contractual) LIKE '%cancelad%' THEN 'cancelled'
                WHEN LOWER(c.etapa_contractual) LIKE '%fenecid%' OR LOWER(c.etapa_contractual) LIKE '%expirad%' THEN 'expired'
                WHEN LOWER(c.etapa_contractual) LIKE '%convenio%' THEN 'agreements'
                WHEN LOWER(c.etapa_contractual) LIKE '%preformal%' THEN 'preformalization'
                WHEN LOWER(c.etapa_contractual) LIKE '%formalizac%' THEN 'formalization'
                ELSE 'formalized'
              END AS contractStage,
              c.estatus_operativo AS contractStatus,
              COALESCE(c.gerencia, 'GSC') AS gerencia,
              c.fecha_firma AS signatureDate,
              c.fecha_firma AS fechaFormalizacion,
              c.fecha_conclusion AS fechaConclusion,
              c.fecha_inicio_operaciones AS operationsStartDate,
              c.fecha_renovacion AS renewalDate,
              c.plazo_vigencia AS contractTerm,
              c.dias_restantes AS daysRemaining,
              c.estatus_fianza AS guaranteeStatus,
              c.estatus_poliza_rc AS liabilityPolicyStatus,
              c.estatus_proyecto_obra AS projectStatus,
              c.gestor_responsable AS manager,
              c.observaciones_expediente AS observaciones,
              m.nombre_comercial AS marca,
              m.giro_operativo AS giroOperativo,
              m.giro_iata AS giroIata,
              m.giro_indaabin AS giroIndaabin,
              m.linea_comercial AS commercialLine,
              m.sublinea_comercial AS commercialSubline,
              rs.razon_social AS razonSocial,
              rs.datos_contacto AS contactData,
              cl.local_nomenclatura AS nomenclatura,
              COALESCE(l.zona_id, 'etp') AS contractLocationId,
              COALESCE(z.nombre, 'Edificio Terminal de Pasajeros (ETP)') AS contractLocationName,
              COALESCE(z.nombre, 'ETP') AS zonaComercial,
              cl.renta_mensual_fija AS monthlyRent,
              cl.costo_por_m2 AS costPerM2,
              cl.porcentaje_participacion AS participationRate,
              cl.notas_participacion AS participationNotes,
              l.lado,
              l.area,
              l.modulo,
              l.nivel,
              l.tipo_espacio AS areaComercial,
              l.metraje
            FROM contratos c
            LEFT JOIN marcas m ON c.marca_id = m.id
            LEFT JOIN razones_sociales rs ON c.razon_social_id = rs.id
            LEFT JOIN contrato_locales cl ON c.numero_contrato = cl.contrato_id
            LEFT JOIN locales l ON cl.local_nomenclatura = l.nomenclatura
            LEFT JOIN zonas z ON l.zona_id = z.id
          `).all();

          return new Response(JSON.stringify({ success: true, contracts: results }), { headers });
        }

        if (request.method === "POST" || request.method === "PUT") {
          const body = (await request.json()) as Record<string, unknown>;
          const numContrato = String(body.contractNumber || body.numero_contrato || "").trim();

          if (!numContrato) {
            return new Response(JSON.stringify({ success: false, error: "El número de contrato es obligatorio" }), {
              status: 400,
              headers,
            });
          }

          // 1. Marca
          let marcaId: number | null = null;
          const marcaName = body.marca ? String(body.marca).trim() : null;
          if (marcaName) {
            const existingMarca = (await env.DB.prepare("SELECT id FROM marcas WHERE LOWER(nombre_comercial) = LOWER(?)").bind(marcaName).first()) as { id: number } | null;
            if (existingMarca) {
              marcaId = existingMarca.id;
              await env.DB.prepare(`
                UPDATE marcas SET 
                  giro_operativo = COALESCE(?, giro_operativo),
                  giro_iata = COALESCE(?, giro_iata),
                  giro_indaabin = COALESCE(?, giro_indaabin),
                  linea_comercial = COALESCE(?, linea_comercial),
                  sublinea_comercial = COALESCE(?, sublinea_comercial)
                WHERE id = ?
              `).bind(
                body.giroOperativo ?? null,
                body.giroIata ?? null,
                body.giroIndaabin ?? null,
                body.commercialLine ?? null,
                body.commercialSubline ?? null,
                marcaId
              ).run();
            } else {
              const resMarca = await env.DB.prepare(`
                INSERT INTO marcas (nombre_comercial, giro_operativo, giro_iata, giro_indaabin, linea_comercial, sublinea_comercial)
                VALUES (?, ?, ?, ?, ?, ?)
              `).bind(
                marcaName,
                body.giroOperativo ?? null,
                body.giroIata ?? null,
                body.giroIndaabin ?? null,
                body.commercialLine ?? null,
                body.commercialSubline ?? null
              ).run();
              marcaId = resMarca.meta.last_row_id as number;
            }
          }

          // 2. Razón Social
          let razonId: number | null = null;
          const razonName = body.razonSocial ? String(body.razonSocial).trim() : null;
          if (razonName) {
            const existingRazon = (await env.DB.prepare("SELECT id FROM razones_sociales WHERE LOWER(razon_social) = LOWER(?)").bind(razonName).first()) as { id: number } | null;
            if (existingRazon) {
              razonId = existingRazon.id;
              await env.DB.prepare(`
                UPDATE razones_sociales SET 
                  datos_contacto = COALESCE(?, datos_contacto),
                  administrador_gerente_responsable = COALESCE(?, administrador_gerente_responsable)
                WHERE id = ?
              `).bind(
                body.contactData ?? null,
                body.manager ?? null,
                razonId
              ).run();
            } else {
              const resRazon = await env.DB.prepare(`
                INSERT INTO razones_sociales (razon_social, datos_contacto, administrador_gerente_responsable)
                VALUES (?, ?, ?)
              `).bind(
                razonName,
                body.contactData ?? null,
                body.manager ?? null
              ).run();
              razonId = resRazon.meta.last_row_id as number;
            }
          }

          // 3. Etapa Contractual y Días Restantes
          const stage = String(body.contractStage || "formalized").toLowerCase();
          const diasRestantes = body.daysRemaining !== undefined && body.daysRemaining !== null && body.daysRemaining !== "" ? Number(body.daysRemaining) : null;

          // 4. Upsert en Contratos
          await env.DB.prepare(`
            INSERT INTO contratos (
              numero_contrato, razon_social_id, marca_id, gerencia,
              etapa_contractual, estatus_operativo, fecha_firma, fecha_inicio_operaciones,
              fecha_conclusion, fecha_renovacion, plazo_vigencia, dias_restantes,
              estatus_fianza, estatus_poliza_rc, estatus_proyecto_obra, gestor_responsable,
              observaciones_expediente
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ON CONFLICT(numero_contrato) DO UPDATE SET
              razon_social_id = COALESCE(excluded.razon_social_id, contratos.razon_social_id),
              marca_id = COALESCE(excluded.marca_id, contratos.marca_id),
              gerencia = excluded.gerencia,
              etapa_contractual = excluded.etapa_contractual,
              estatus_operativo = excluded.estatus_operativo,
              fecha_firma = excluded.fecha_firma,
              fecha_inicio_operaciones = excluded.fecha_inicio_operaciones,
              fecha_conclusion = excluded.fecha_conclusion,
              fecha_renovacion = excluded.fecha_renovacion,
              plazo_vigencia = excluded.plazo_vigencia,
              dias_restantes = excluded.dias_restantes,
              estatus_fianza = excluded.estatus_fianza,
              estatus_poliza_rc = excluded.estatus_poliza_rc,
              estatus_proyecto_obra = excluded.estatus_proyecto_obra,
              gestor_responsable = excluded.gestor_responsable,
              observaciones_expediente = excluded.observaciones_expediente
          `).bind(
            numContrato,
            razonId,
            marcaId,
            body.gerencia || "GSC",
            stage,
            body.contractStatus || "OPERANDO",
            body.signatureDate ?? body.fechaFormalizacion ?? null,
            body.operationsStartDate ?? null,
            body.fechaConclusion ?? null,
            body.renewalDate ?? null,
            body.contractTerm ?? null,
            diasRestantes,
            body.guaranteeStatus ?? null,
            body.liabilityPolicyStatus ?? null,
            body.projectStatus ?? null,
            body.manager ?? null,
            body.observaciones ?? null
          ).run();

          // 5. Vincular a contrato_locales si se indica nomenclatura
          const nom = body.nomenclatura ? String(body.nomenclatura).trim() : null;
          if (nom) {
            const rent = body.monthlyRent !== undefined && body.monthlyRent !== null && body.monthlyRent !== "" ? Number(body.monthlyRent) : null;
            const cost = body.costPerM2 !== undefined && body.costPerM2 !== null && body.costPerM2 !== "" ? Number(body.costPerM2) : null;
            const part = body.participationRate !== undefined && body.participationRate !== null && body.participationRate !== "" ? Number(body.participationRate) : null;
            const notas = body.participationNotes ? String(body.participationNotes).trim() : null;

            await env.DB.prepare(`
              INSERT INTO contrato_locales (contrato_id, local_nomenclatura, renta_mensual_fija, costo_por_m2, renta_vigente_actualizada, porcentaje_participacion, notas_participacion)
              VALUES (?, ?, ?, ?, ?, ?, ?)
              ON CONFLICT(contrato_id, local_nomenclatura) DO UPDATE SET
                renta_mensual_fija = excluded.renta_mensual_fija,
                costo_por_m2 = excluded.costo_por_m2,
                renta_vigente_actualizada = excluded.renta_vigente_actualizada,
                porcentaje_participacion = excluded.porcentaje_participacion,
                notas_participacion = excluded.notas_participacion
            `).bind(numContrato, nom, rent, cost, rent, part, notas).run();
          }

          return new Response(JSON.stringify({ success: true, contractNumber: numContrato }), { headers });
        }

        if (request.method === "DELETE") {
          const contractNumber = url.searchParams.get("contractNumber") || url.searchParams.get("numero_contrato");
          if (!contractNumber) {
            return new Response(JSON.stringify({ success: false, error: "Parámetro contractNumber requerido" }), {
              status: 400,
              headers,
            });
          }

          await env.DB.prepare("DELETE FROM contrato_locales WHERE contrato_id = ?").bind(contractNumber).run();
          await env.DB.prepare("DELETE FROM contratos WHERE numero_contrato = ?").bind(contractNumber).run();

          return new Response(JSON.stringify({ success: true, deleted: contractNumber }), { headers });
        }
      } catch (err: unknown) {
        const errorMsg = err instanceof Error ? err.message : String(err);
        return new Response(JSON.stringify({ success: false, error: errorMsg }), {
          status: 400,
          headers,
        });
      }
    }

    // Endpoint API para Capacidad Comercial del ETP
    if (url.pathname === "/api/capacidad-comercial") {
      const headers = { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" };

      if (request.method === "OPTIONS") {
        return new Response(null, {
          headers: {
            ...headers,
            "Access-Control-Allow-Methods": "GET, POST, PUT, OPTIONS",
            "Access-Control-Allow-Headers": "Content-Type",
          },
        });
      }

      if (!env.DB) {
        return new Response(JSON.stringify({ success: false, error: "Cloudflare D1 no configurado" }), {
          status: 500,
          headers,
        });
      }

      try {
        if (request.method === "GET") {
          const cap = (await env.DB.prepare("SELECT * FROM capacidad_comercial LIMIT 1").first()) as Record<string, unknown> | null;
          return new Response(JSON.stringify({
            success: true,
            capacity: cap ? {
              terminalPassengerCapacity: cap.terminal_passenger_capacity,
              commercialAreaFactor: cap.commercial_area_factor,
              recommendedCommercialArea: cap.recommended_commercial_area,
              leasedCommercialArea: cap.leased_commercial_area,
              commercialPassengerCapacity: cap.commercial_passenger_capacity,
            } : null,
          }), { headers });
        }

        if (request.method === "POST" || request.method === "PUT") {
          const body = (await request.json()) as Record<string, unknown>;
          const terminalCap = Number(body.terminalPassengerCapacity || 20000000);
          const factor = Number(body.commercialAreaFactor || 0.000821);
          const recommended = Number(body.recommendedCommercialArea || (terminalCap * factor));
          const leased = Number(body.leasedCommercialArea || 0);
          const commercialCap = factor > 0 ? (leased / factor) : 0;

          await env.DB.prepare(`
            INSERT INTO capacidad_comercial (
              id, terminal_passenger_capacity, commercial_area_factor,
              recommended_commercial_area, leased_commercial_area, commercial_passenger_capacity
            ) VALUES (1, ?, ?, ?, ?, ?)
            ON CONFLICT(id) DO UPDATE SET
              terminal_passenger_capacity = excluded.terminal_passenger_capacity,
              commercial_area_factor = excluded.commercial_area_factor,
              recommended_commercial_area = excluded.recommended_commercial_area,
              leased_commercial_area = excluded.leased_commercial_area,
              commercial_passenger_capacity = excluded.commercial_passenger_capacity
          `).bind(terminalCap, factor, recommended, leased, commercialCap).run();

          return new Response(JSON.stringify({
            success: true,
            capacity: {
              terminalPassengerCapacity: terminalCap,
              commercialAreaFactor: factor,
              recommendedCommercialArea: recommended,
              leasedCommercialArea: leased,
              commercialPassengerCapacity: commercialCap,
            },
          }), { headers });
        }
      } catch (err: unknown) {
        const errorMsg = err instanceof Error ? err.message : String(err);
        return new Response(JSON.stringify({ success: false, error: errorMsg }), { status: 400, headers });
      }
    }

    // Endpoint API para Tráfico Mensual de Pasajeros
    if (url.pathname === "/api/trafico-pasajeros") {
      const headers = { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" };

      if (request.method === "OPTIONS") {
        return new Response(null, {
          headers: {
            ...headers,
            "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
            "Access-Control-Allow-Headers": "Content-Type",
          },
        });
      }

      if (!env.DB) {
        return new Response(JSON.stringify({ success: false, error: "Cloudflare D1 no configurado" }), {
          status: 500,
          headers,
        });
      }

      try {
        if (request.method === "GET") {
          const { results } = await env.DB.prepare(
            "SELECT year, month, month_name AS monthName, passengers, status FROM trafico_pasajeros ORDER BY year ASC, month ASC"
          ).all();
          return new Response(JSON.stringify({ success: true, passengerTraffic: results }), { headers });
        }

        if (request.method === "POST" || request.method === "PUT") {
          const body = (await request.json()) as Record<string, unknown>;
          const year = Number(body.year);
          const month = Number(body.month);
          const passengers = Number(body.passengers || 0);
          const status = String(body.status || "real").toLowerCase();
          const monthName = String(body.monthName || body.month_name || "").toUpperCase();

          if (!year || !month) {
            return new Response(JSON.stringify({ success: false, error: "Año y mes requeridos" }), { status: 400, headers });
          }

          const existing = (await env.DB.prepare("SELECT id FROM trafico_pasajeros WHERE year = ? AND month = ?").bind(year, month).first()) as { id: number } | null;
          if (existing) {
            await env.DB.prepare("UPDATE trafico_pasajeros SET passengers = ?, status = ?, month_name = ? WHERE id = ?").bind(passengers, status, monthName, existing.id).run();
          } else {
            await env.DB.prepare("INSERT INTO trafico_pasajeros (year, month, month_name, passengers, status) VALUES (?, ?, ?, ?, ?)").bind(year, month, monthName, passengers, status).run();
          }

          const { results } = await env.DB.prepare(
            "SELECT year, month, month_name AS monthName, passengers, status FROM trafico_pasajeros ORDER BY year ASC, month ASC"
          ).all();

          return new Response(JSON.stringify({ success: true, passengerTraffic: results }), { headers });
        }
      } catch (err: unknown) {
        const errorMsg = err instanceof Error ? err.message : String(err);
        return new Response(JSON.stringify({ success: false, error: errorMsg }), { status: 400, headers });
      }
    }

    if (url.pathname === "/_vinext/image") {
      const allowedWidths = [...DEFAULT_DEVICE_SIZES, ...DEFAULT_IMAGE_SIZES];
      return handleImageOptimization(request, {
        fetchAsset: (path) => env.ASSETS.fetch(new Request(new URL(path, request.url))),
        transformImage: async (body, { width, format, quality }) => {
          const result = await env.IMAGES.input(body).transform(width > 0 ? { width } : {}).output({ format, quality });
          return result.response();
        },
      }, allowedWidths);
    }

    return handler.fetch(request, env, ctx);
  },
};

export default worker;
