
"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

export default function Login() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [register, setRegister] = useState(false);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();

    if (!supabase) {
      setMessage("Налаштуйте Supabase у .env.local");
      return;
    }

    setLoading(true);
    setMessage("");

    try {
      if (register) {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
        });

        if (error) {
          setMessage(error.message);
          return;
        }

        if (data.session) {
          router.replace("/");
          router.refresh();
        } else {
          setMessage(
            "Акаунт створено. Перевірте email для підтвердження."
          );
        }
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (error) {
          setMessage(error.message);
          return;
        }

        // Перехід на головну після успішного входу
        router.replace("/");
        router.refresh();
      }
    } catch {
      setMessage("Виникла помилка. Спробуйте ще раз.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <section
      className="panel"
      style={{
        maxWidth: 500,
        margin: "30px auto",
      }}
    >
      <h1>{register ? "Реєстрація" : "Вхід"}</h1>

      <form className="stack" onSubmit={submit}>
        <input
          type="email"
          placeholder="Email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />

        <input
          type="password"
          minLength={6}
          placeholder="Пароль"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />

        <button type="submit" disabled={loading}>
          {loading
            ? "Зачекайте..."
            : register
            ? "Зареєструватися"
            : "Увійти"}
        </button>
      </form>

      {message && (
        <p className={message.includes("Акаунт створено") ? "success" : "error"}>
          {message}
        </p>
      )}

      <button
        type="button"
        className="secondary"
        style={{ marginTop: 15 }}
        onClick={() => {
          setRegister(!register);
          setMessage("");
        }}
      >
        {register
          ? "Уже є акаунт? Увійти"
          : "Створити акаунт"}
      </button>
    </section>
  );
}
