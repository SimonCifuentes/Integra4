"use client";

import { useMemo } from "react";

// Puedes reemplazar esto por datos reales luego
const reviewsMock = [
  { id: 1, user: "Juan Pérez", rating: 5, comment: "Excelente cancha, muy buena atención." },
  { id: 2, user: "María López", rating: 4, comment: "Todo bien, pero el pasto un poco seco." },
  { id: 3, user: "Carlos Ruiz", rating: 5, comment: "La mejor experiencia deportiva en Temuco." },
  { id: 4, user: "Ana Torres", rating: 4, comment: "Fácil de reservar, volveré sin dudas." },
];

function Star({ filled, size = 20 }: { filled: boolean; size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      className={filled ? "fill-yellow-400 text-yellow-400" : "fill-none text-gray-300"}
      aria-hidden="true"
    >
      <path
        stroke="currentColor"
        strokeWidth="2"
        d="M12 17.27 18.18 21l-1.64-7.03L22 9.24l-7.19-.62L12 2 9.19 8.62 2 9.24l5.46 4.73L5.82 21z"
      />
    </svg>
  );
}

function StarsRow({ value, size = 20 }: { value: number; size?: number }) {
  const rounded = Math.round(value);
  return (
    <div className="flex items-center">
      {Array.from({ length: 5 }).map((_, i) => (
        <Star key={i} filled={i < rounded} size={size} />
      ))}
    </div>
  );
}

export default function ReseñasPage() {
  const { avg, total } = useMemo(() => {
    const total = reviewsMock.length;
    const sum = reviewsMock.reduce((acc, r) => acc + r.rating, 0);
    const avg = total ? sum / total : 0;
    return { avg, total };
  }, []);

  return (
    <main className="p-4 max-w-2xl mx-auto">
      {/* Encabezado promedio y total */}
      <section className="flex items-center gap-3 mb-5">
        <span className="text-3xl font-bold">{avg.toFixed(1)}</span>
        <StarsRow value={avg} size={22} />
        <span className="text-gray-500">({total} reseñas)</span>
      </section>

      {/* Lista de reseñas */}
      <section className="space-y-3">
        {reviewsMock.map((r) => (
          <article
            key={r.id}
            className="rounded-2xl border border-gray-200 bg-white/70 dark:bg-zinc-900/60 dark:border-zinc-800 shadow-sm p-4"
          >
            <header className="flex items-center justify-between mb-1">
              <h3 className="font-semibold">{r.user}</h3>
              <StarsRow value={r.rating} size={16} />
            </header>
            <p className="text-gray-700 dark:text-gray-300">{r.comment}</p>
          </article>
        ))}
      </section>
    </main>
  );
}
