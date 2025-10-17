-- Auditoría de reservas (PostgreSQL)

CREATE TABLE IF NOT EXISTS auditoria (
  id_auditoria BIGSERIAL PRIMARY KEY,
  actor_id     BIGINT REFERENCES usuarios(id_usuario) ON DELETE SET NULL,
  accion       VARCHAR(80) NOT NULL,          -- ej: crear_reserva, cancelar_reserva
  objeto_tipo  VARCHAR(30),                   -- ej: 'reserva'
  id_objeto    BIGINT,                        -- id_reserva
  snapshot     JSONB,                         -- estado después del evento (o antes/después si quieres)
  ip           VARCHAR(45),
  user_agent   TEXT,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Índices útiles para consultas por objeto y por actor/fecha
CREATE INDEX IF NOT EXISTS idx_auditoria_objeto ON auditoria(objeto_tipo, id_objeto);
CREATE INDEX IF NOT EXISTS idx_auditoria_actor  ON auditoria(actor_id, created_at);
