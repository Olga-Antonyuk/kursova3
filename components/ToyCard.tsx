
"use client";

import Link from "next/link";
import type { Toy } from "@/lib/types";
import { useShop } from "@/context/ShopContext";

export default function ToyCard({ toy }: { toy: Toy }) {
  const { add } = useShop();

  return (
    <article className="toycard">
      <Link href={`/catalog/${toy.id}`}>
        <div className="toyimage">
          <img
            src={toy.image || "/toy-placeholder.svg"}
            alt={toy.name}
            onError={(e) => {
              const img = e.currentTarget;
              img.onerror = null;
              img.src = "/toy-placeholder.svg";
            }}
          />
        </div>
      </Link>

      <div className="toybody">
        <small>
          {toy.category && `${toy.category} · `}
          {toy.age
            ? `Вік: ${toy.age}`
            : "Вік не вказано"}
        </small>

        <Link href={`/catalog/${toy.id}`}>
          <h3>{toy.name}</h3>
        </Link>

        <p>
          {toy.description || "Іграшка для дітей"}
        </p>

        <div className="price">
          {Number(toy.price).toLocaleString("uk-UA")} грн
        </div>

        <Link
          href={`/catalog/${toy.id}`}
          className="details-link"
        >
          Детальніше
        </Link>

        <button
          type="button"
          disabled={toy.stock < 1}
          onClick={() => add(toy)}
        >
          {toy.stock > 0
            ? "До кошика"
            : "Немає в наявності"}
        </button>
      </div>
    </article>
  );
}
