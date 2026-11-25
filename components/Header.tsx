
"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useShop } from "@/context/ShopContext";
import { supabase } from "@/lib/supabase";

export default function Header() {
  const { count } = useShop();
  const router = useRouter();

  const [isAdmin, setIsAdmin] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  useEffect(() => {
    if (!supabase) return;

    const client = supabase;
    let active = true;
    let requestId = 0;

    async function checkUser() {
      const currentRequest = ++requestId;

      const { data: { user }, error } =
        await client.auth.getUser();

      if (!active || currentRequest !== requestId) return;

      if (error || !user) {
        setIsLoggedIn(false);
        setIsAdmin(false);
        return;
      }

      setIsLoggedIn(true);

      const { data: profile, error: profileError } =
        await client
          .from("profiles")
          .select("role")
          .eq("id", user.id)
          .maybeSingle();

      if (!active || currentRequest !== requestId) return;

      setIsAdmin(
        !profileError && profile?.role === "admin"
      );
    }

    checkUser();

    const { data: { subscription } } =
      client.auth.onAuthStateChange(() => {
        // Виконуємо перевірку після оновлення сесії.
        setTimeout(() => {
          if (active) checkUser();
        }, 0);
      });

    return () => {
      active = false;
      requestId++;
      subscription.unsubscribe();
    };
  }, []);

  async function handleLogout() {
    if (!supabase) return;

    const { error } = await supabase.auth.signOut();

    if (error) {
      alert("Помилка виходу: " + error.message);
      return;
    }

    setIsLoggedIn(false);
    setIsAdmin(false);

    router.push("/");
    router.refresh();
  }

  return (
    <header className="header">
      <Link href="/" className="logo">
        🧸 TOYLAND
      </Link>

      <nav>
        <Link href="/">Головна</Link>

        <Link href="/catalog">Каталог</Link>

        <Link href="/cart">
          Кошик ({count})
        </Link>

        <Link href="/orders">
          Мої замовлення
        </Link>

        {!isLoggedIn ? (
          <Link href="/login">Увійти</Link>
        ) : (
          <button
            type="button"
            onClick={handleLogout}
            className="logout-btn"
          >
            Вийти
          </button>
        )}

        {isAdmin && (
          <Link href="/admin">Адмін</Link>
        )}
      </nav>
    </header>
  );
}

