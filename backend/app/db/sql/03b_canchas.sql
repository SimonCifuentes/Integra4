-- app/db/sql/03b_canchas.sql
-- Seed específico para **canchas**.
-- Seguro de re-ejecución con ON CONFLICT DO NOTHING cuando existan claves únicas (ajusta si tu esquema difiere).
-- Asume tablas: complejos(id_complejo, nombre), canchas(id_cancha, id_complejo, nombre, id_deporte, cubierta)
-- y una tabla de deportes opcional (si no existe, usa IDs numéricos conocidos).

-- ⚠️ Ajusta los NOMBRES de complejos si en tu seed principal tienen otros nombres.

INSERT INTO canchas (id_complejo, nombre, id_deporte, cubierta)
VALUES 
  ((SELECT id_complejo FROM complejos WHERE nombre = 'Complejo Ñielol' LIMIT 1), 'Cancha 1 - Ñielol', 1, FALSE),
  ((SELECT id_complejo FROM complejos WHERE nombre = 'Complejo Ñielol' LIMIT 1), 'Cancha 2 - Ñielol', 1, TRUE),
  ((SELECT id_complejo FROM complejos WHERE nombre = 'Complejo Labranza' LIMIT 1), 'Cancha A - Labranza', 2, FALSE),
  ((SELECT id_complejo FROM complejos WHERE nombre = 'Complejo Labranza' LIMIT 1), 'Cancha B - Labranza', 2, TRUE),
  ((SELECT id_complejo FROM complejos WHERE nombre = 'Complejo Pueblo Nuevo' LIMIT 1), 'Cancha Única - Pueblo Nuevo', 3, FALSE);

-- Si tienes una restricción de unicidad como (id_complejo, nombre), puedes convertir lo anterior a:
-- INSERT ... ON CONFLICT (id_complejo, nombre) DO NOTHING;
