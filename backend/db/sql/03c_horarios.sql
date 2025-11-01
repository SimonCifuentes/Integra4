-- app/db/sql/03c_horarios.sql
-- Seed de horarios_atencion.
--
-- Objetivo:
--   - Asegurar que cada complejo tenga un horario general
--     (id_cancha = NULL) para cada día de la semana.
--   - Franja por defecto: 08:00 -> 23:00.
--
-- Seguridad / idempotencia:
--   - Usa NOT EXISTS para no duplicar (porque la tabla horarios_atencion
--     NO tiene una restricción UNIQUE sobre (id_complejo, id_cancha, dia)).
--
-- Uso:
--   \i app/db/sql/03c_horarios.sql
--   (o copiar su contenido y ejecutarlo en psql contra la misma DB
--    donde ya corriste 01_schema.sql, 03_datos_iniciales.sql, etc.)

WITH dias AS (
    SELECT unnest(ARRAY[
        'lunes',
        'martes',
        'miercoles',
        'jueves',
        'viernes',
        'sabado',
        'domingo'
    ])::dia_semana AS dia
),
comp AS (
    SELECT id_complejo
    FROM complejos
    -- si quieres excluir complejos borrados lógicamente, agrega:
    -- WHERE deleted_at IS NULL
)
INSERT INTO horarios_atencion (
    id_complejo,
    id_cancha,
    dia,
    hora_apertura,
    hora_cierre
)
SELECT
    c.id_complejo,
    NULL,                         -- horario general del complejo
    d.dia,
    TIME '08:00',
    TIME '23:00'
FROM comp c
CROSS JOIN dias d
WHERE NOT EXISTS (
    SELECT 1
    FROM horarios_atencion h
    WHERE h.id_complejo = c.id_complejo
      AND h.id_cancha  IS NULL
      AND h.dia        = d.dia
);

-- OPCIONAL:
-- Si quisieras pre-cargar overrides por cancha (por ejemplo, si una cancha techada
-- atiende hasta más tarde), podrías agregar otro bloque similar:
--
-- WITH dias AS (
--     SELECT unnest(ARRAY[
--         'lunes','martes','miercoles','jueves','viernes','sabado','domingo'
--     ])::dia_semana AS dia
-- ),
-- tech AS (
--     SELECT ch.id_cancha, ch.id_complejo
--     FROM canchas ch
--     WHERE ch.cubierta = TRUE  -- ej: sólo las techadas
-- )
-- INSERT INTO horarios_atencion (id_complejo, id_cancha, dia, hora_apertura, hora_cierre)
-- SELECT
--     t.id_complejo,
--     t.id_cancha,
--     d.dia,
--     TIME '08:00',
--     TIME '23:00'
-- FROM tech t
-- CROSS JOIN dias d
-- WHERE NOT EXISTS (
--     SELECT 1
--     FROM horarios_atencion h
--     WHERE h.id_cancha = t.id_cancha
--       AND h.dia       = d.dia
-- );
--
-- Ese bloque es opcional y sólo tiene sentido si quieres que ciertas canchas
-- tengan un horario distinto al general del complejo.
