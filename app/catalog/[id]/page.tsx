
"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { useShop } from "@/context/ShopContext";
import type { Toy } from "@/lib/types";

export default function ToyDetails() {
  const params = useParams();
  const id = params.id as string;
  const { add } = useShop();

  const [toy, setToy] = useState<Toy | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [added, setAdded] = useState(false);
  const [quantity, setQuantity] = useState(1);

  useEffect(() => {
    let active = true;

    async function loadToy() {
      setLoading(true);
      setError("");
      setToy(null);
      setAdded(false);
      setQuantity(1);

      if (!supabase) {
        setError("Немає підключення до Supabase");
        setLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from("products")
        .select("*")
        .eq("id", id)
        .maybeSingle();

      if (!active) return;

      if (error) {
        setError(error.message);
      } else {
        setToy(data as Toy | null);
      }

      setLoading(false);
    }

    loadToy();

    return () => {
      active = false;
    };
  }, [id]);

  function handleAddToCart() {
    if (!toy || toy.stock < 1) return;

    for (let i = 0; i < quantity; i++) {
      add(toy);
    }

    setAdded(true);
  }

  if (loading) {
    return (
      <div className="product-loading">
        Завантаження іграшки...
      </div>
    );
  }

  if (error) {
    return (
      <div className="panel">
        <h2>Помилка завантаження</h2>
        <p className="error">{error}</p>
        <Link href="/catalog">Повернутися до каталогу</Link>
      </div>
    );
  }

  if (!toy) {
    return (
      <div className="panel">
        <h2>Іграшку не знайдено</h2>
        <Link href="/catalog">Повернутися до каталогу</Link>
      </div>
    );
  }

  return (
    <div className="product-page">

      {/* Навігація */}
      <div className="product-breadcrumb">
        <Link href="/">Головна</Link>
        <span>/</span>
        <Link href="/catalog">Каталог</Link>
        <span>/</span>
        <span>{toy.name}</span>
      </div>

      {/* Основний блок */}
      <div className="product-layout">

        {/* Фотографія */}
        <div className="product-gallery">
          <div className="product-main-image">
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

          <div className="product-image-label">
            TOYLAND · Світ іграшок
          </div>
        </div>

        {/* Інформація */}
        <div className="product-info-card">

          <div className="product-top">
            <span className="product-category">
              {toy.category || "Іграшки"}
            </span>

            <span className="product-age">
              {toy.age || "Для дітей"}
            </span>
          </div>

          <h1 className="product-title">
            {toy.name}
          </h1>

          <p className="product-short-description">
            {toy.description ||
              "Чудова іграшка для розвитку та веселих ігор."}
          </p>

          <div className="product-divider" />

          <div className="product-price">
            {Number(toy.price).toLocaleString("uk-UA")}
            <span> грн</span>
          </div>

          <div
            className={
              toy.stock > 0
                ? "product-stock available"
                : "product-stock unavailable"
            }
          >
            <span className="stock-dot" />
            {toy.stock > 0
              ? `В наявності · ${toy.stock} шт.`
              : "Немає в наявності"}
          </div>

          {/* Кількість */}
          <div className="product-purchase">
            <div className="quantity-control">
              <button
                type="button"
                onClick={() =>
                  setQuantity(Math.max(1, quantity - 1))
                }
                disabled={quantity <= 1}
              >
                −
              </button>

              <span>{quantity}</span>

              <button
                type="button"
                onClick={() =>
                  setQuantity(Math.min(toy.stock, quantity + 1))
                }
                disabled={quantity >= toy.stock}
              >
                +
              </button>
            </div>

            <button
              className="product-buy-button"
              disabled={toy.stock < 1}
              onClick={handleAddToCart}
            >
              🛒 Додати в кошик
            </button>
          </div>

          {added && (
            <div className="product-added">
              <span>✓ Товар додано до кошика</span>
              <Link href="/cart">
                Перейти до кошика →
              </Link>
            </div>
          )}

          {/* Переваги */}
          <div className="product-benefits">
            <div>
              <span>🚚</span>
              <p>
                <strong>Доставка по Україні</strong>
                <small>Зручне оформлення замовлення</small>
              </p>
            </div>

            <div>
              <span>🎁</span>
              <p>
                <strong>Іграшки для дітей</strong>
                <small>Для гри, творчості та розвитку</small>
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Опис і характеристики */}
      <div className="product-bottom">

        <section className="product-description-card">
          <h2>Опис іграшки</h2>
          <div className="section-accent" />

          <p>
            {toy.description || "Опис товару відсутній."}
          </p>
        </section>

        <section className="product-specs-card">
          <h2>Характеристики</h2>
          <div className="section-accent" />

          <div className="spec-row">
            <span>Назва</span>
            <strong>{toy.name}</strong>
          </div>

          <div className="spec-row">
            <span>Категорія</span>
            <strong>{toy.category || "Іграшки"}</strong>
          </div>

          <div className="spec-row">
            <span>Вік</span>
            <strong>{toy.age || "Не вказано"}</strong>
          </div>

          <div className="spec-row">
            <span>Наявність</span>
            <strong>
              {toy.stock > 0
                ? `${toy.stock} шт.`
                : "Немає"}
            </strong>
          </div>

          <div className="spec-row">
            <span>Артикул</span>
            <strong>{toy.id.slice(0, 8).toUpperCase()}</strong>
          </div>
        </section>
      </div>

      <div className="product-back">
        <Link href="/catalog">
          ← Продовжити покупки
        </Link>
      </div>
    </div>
  );
}
