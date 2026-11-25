
"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { useShop } from "@/context/ShopContext";

// Перевірка українського номера телефону
function isValidPhone(phone: string) {
  return /^\+380\d{9}$/.test(phone);
}

export default function Checkout() {
  const {
    items,
    resetLocal,
    waitForPending,
    loading,
    userId,
  } = useShop();

  const router = useRouter();

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("+380");
  const [address, setAddress] = useState("");
  const [comment, setComment] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const total = items.reduce(
    (sum, item) =>
      sum + Number(item.toy.price) * item.quantity,
    0
  );

  // Обробка введення номера
  function handlePhoneChange(value: string) {
    // Залишаємо тільки цифри
    let digits = value.replace(/\D/g, "");

    // Прибираємо код країни, якщо він присутній
    if (digits.startsWith("380")) {
      digits = digits.slice(3);
    } else if (digits.startsWith("0")) {
      digits = digits.slice(1);
    }

    // Максимум 9 цифр після +380
    digits = digits.slice(0, 9);

    setPhone("+380" + digits);
  }

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();

    if (!supabase || busy || loading || !items.length) {
      return;
    }

    setError("");

    // Перевірка номера телефону
    if (!isValidPhone(phone)) {
      setError(
        "Введіть правильний номер телефону у форматі +380XXXXXXXXX"
      );
      return;
    }

    if (name.trim().length < 2) {
      setError("Введіть ім’я та прізвище.");
      return;
    }

    if (address.trim().length < 3) {
      setError("Введіть адресу доставки.");
      return;
    }

    setBusy(true);

    try {
      const { data: auth, error: authError } =
        await supabase.auth.getUser();

      if (authError || !auth.user) {
        setError(
          "Увійдіть в акаунт перед оформленням замовлення."
        );
        return;
      }

      if (auth.user.id !== userId) {
        setError("Акаунт змінився. Оновіть сторінку.");
        return;
      }

      // Очікуємо завершення змін кошика
      await waitForPending();

      const orderItems = items.map(({ toy, quantity }) => ({
        product_id: toy.id,
        quantity,
      }));

      const { data, error: orderError } =
        await supabase.rpc("place_order", {
          p_name: name.trim(),
          p_phone: phone,
          p_address: address.trim(),
          p_comment: comment.trim(),
          p_items: orderItems,
        });

      if (orderError) {
        setError(orderError.message);
        return;
      }

      // SQL-функція очищає кошик у базі даних.
      // Тут очищаємо локальний стан.
      resetLocal();

      router.push(
        "/orders?created=" +
          encodeURIComponent(String(data))
      );
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Не вдалося оформити замовлення."
      );
    } finally {
      setBusy(false);
    }
  }

  if (loading) {
    return (
      <section className="panel">
        <h1>Оформлення замовлення</h1>
        <p>Завантаження кошика...</p>
      </section>
    );
  }

  if (!userId) {
    return (
      <section className="panel">
        <h1>Оформлення замовлення</h1>

        <p>
          Для оформлення замовлення увійдіть в акаунт.
        </p>

        <Link href="/login" className="btn">
          Увійти
        </Link>
      </section>
    );
  }

  if (!items.length) {
    return (
      <section className="panel">
        <h1>Оформлення замовлення</h1>

        <p>Ваш кошик порожній.</p>

        <Link href="/catalog" className="btn">
          Перейти в каталог
        </Link>
      </section>
    );
  }

  return (
    <>
      <h1>Оформлення замовлення</h1>

      <p>
        Оплата під час отримання.
        Перевірте товари та заповніть контактні дані.
      </p>

      <form className="panel stack" onSubmit={submit}>
        <h2>Контактні дані</h2>

        <label>
          Ім’я та прізвище
          <input
            required
            minLength={2}
            placeholder="Введіть ім’я та прізвище"
            value={name}
            onChange={(e) => setName(e.target.value)}
            disabled={busy}
          />
        </label>

        <label>
          Номер телефону
          <input
            required
            type="tel"
            inputMode="numeric"
            autoComplete="tel"
            placeholder="+380XXXXXXXXX"
            value={phone}
            onChange={(e) =>
              handlePhoneChange(e.target.value)
            }
            minLength={13}
            maxLength={13}
            pattern="\+380[0-9]{9}"
            title="Введіть 9 цифр після +380"
            disabled={busy}
          />
        </label>

        <p className="muted">
          Введіть 9 цифр після +380.
          Наприклад: +380671234567
        </p>

        <label>
          Адреса доставки
          <textarea
            required
            minLength={3}
            placeholder="Місто, відділення пошти або адреса"
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            disabled={busy}
          />
        </label>

        <label>
          Коментар до замовлення
          <textarea
            placeholder="Необов'язково"
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            disabled={busy}
          />
        </label>

        <h2>Ваше замовлення</h2>

        {items.map(({ toy, quantity }) => (
          <div className="cartrow" key={toy.id}>
            <div>
              <strong>{toy.name}</strong>

              <p className="muted">
                Кількість: {quantity}
              </p>
            </div>

            <strong>
              {(
                Number(toy.price) * quantity
              ).toLocaleString("uk-UA")} грн
            </strong>
          </div>
        ))}

        <h2>
          Разом: {total.toLocaleString("uk-UA")} грн
        </h2>

        {error && (
          <p className="error">{error}</p>
        )}

        <button
          type="submit"
          disabled={busy || !items.length}
        >
          {busy
            ? "Оформлення замовлення..."
            : "Підтвердити замовлення"}
        </button>
      </form>
    </>
  );
}
