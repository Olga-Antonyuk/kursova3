
"use client";

import Link from "next/link";
import { useShop } from "@/context/ShopContext";

export default function Cart() {
  const {
    items,
    remove,
    setQuantity,
    clear,
    loading,
    userId,
    message,
  } = useShop();

  const total = items.reduce(
    (sum, item) =>
      sum + Number(item.toy.price) * item.quantity,
    0
  );

  if (loading) {
    return (
      <section className="panel">
        <h1>Кошик</h1>
        <p>Завантаження кошика...</p>
      </section>
    );
  }

  if (!userId) {
    return (
      <section className="panel">
        <h1>Кошик</h1>

        <p>
          Щоб користуватися кошиком, потрібно
          увійти у свій акаунт.
        </p>

        <Link href="/login" className="btn">
          Увійти
        </Link>
      </section>
    );
  }

  return (
    <>
      <h1>Мій кошик</h1>

      {message && (
        <p className="error">{message}</p>
      )}

      <section className="panel">
        {items.length > 0 ? (
          <>
            {items.map(({ toy, quantity }) => (
              <div className="cartrow" key={toy.id}>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 14,
                  }}
                >
                  <Link href={`/catalog/${toy.id}`}>
                    <img
                      src={
                        toy.image ||
                        "/toy-placeholder.svg"
                      }
                      alt={toy.name}
                      onError={(e) => {
                        const img = e.currentTarget;
                        img.onerror = null;
                        img.src = "/toy-placeholder.svg";
                      }}
                    />
                  </Link>

                  <div>
                    <Link href={`/catalog/${toy.id}`}>
                      <strong>{toy.name}</strong>
                    </Link>

                    <p className="muted">
                      {Number(
                        toy.price
                      ).toLocaleString("uk-UA")}{" "}
                      грн / шт.
                    </p>
                  </div>
                </div>

                <input
                  aria-label={`Кількість: ${toy.name}`}
                  type="number"
                  min="1"
                  max={toy.stock}
                  value={quantity}
                  onChange={(e) =>
                    setQuantity(
                      toy.id,
                      Number(e.target.value)
                    )
                  }
                />

                <strong>
                  {(
                    Number(toy.price) * quantity
                  ).toLocaleString("uk-UA")}{" "}
                  грн
                </strong>

                <button
                  type="button"
                  className="danger"
                  onClick={() => remove(toy.id)}
                >
                  Видалити
                </button>
              </div>
            ))}

            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                gap: 15,
                flexWrap: "wrap",
                marginTop: 25,
              }}
            >
              <h2>
                Разом:{" "}
                {total.toLocaleString("uk-UA")} грн
              </h2>

              <button
                type="button"
                className="secondary"
                onClick={() => {
                  if (
                    window.confirm(
                      "Очистити весь кошик?"
                    )
                  ) {
                    clear();
                  }
                }}
              >
                Очистити кошик
              </button>
            </div>

            <Link
              href="/checkout"
              className="btn"
            >
              Оформити замовлення
            </Link>
          </>
        ) : (
          <div>
            <p>Ваш кошик порожній.</p>

            <Link
              href="/catalog"
              className="btn"
            >
              Перейти в каталог
            </Link>
          </div>
        )}
      </section>
    </>
  );
}
