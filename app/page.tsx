
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import ToyCard from "@/components/ToyCard";
import type { Toy } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function Home() {
  let toys: Toy[] = [];
  let errorMessage = "";

  if (supabase) {
    const { data, error } = await supabase
      .from("products")
      .select("*")
      .limit(8);

    if (error) {
      console.error("Помилка Supabase:", error.message);
      errorMessage = error.message;
    } else {
      toys = (data || []) as Toy[];
    }
  } else {
    errorMessage = "Не налаштовано підключення до Supabase";
  }

  return (
    <div className="home-page">
      {/* Залишаємо новий банер */}
      <section className="home-hero">
        <div className="home-hero-content">
          <span className="home-hero-label">
            ✨ МАГАЗИН ЩАСЛИВОГО ДИТИНСТВА
          </span>

          <h1>
            Маленькі іграшки.
            <br />
            <span>Великі пригоди!</span>
          </h1>

          <p>
            Відкривайте світ веселощів, творчості та
            неймовірних відкриттів разом із TOYLAND.
            Обирайте іграшки, які дарують усмішки!
          </p>

          <div className="home-hero-buttons">
            <Link href="/catalog" className="home-primary-btn">
              Обрати іграшку →
            </Link>

            <a href="#new-products" className="home-outline-btn">
              Переглянути новинки
            </a>
          </div>

          <div className="home-hero-features">
            <span>✓ Великий вибір</span>
            <span>✓ Для різного віку</span>
            <span>✓ Зручні покупки</span>
          </div>
        </div>

        <div className="home-hero-art">
          <div className="home-art-circle" />

          <div className="home-floating-toy toy-one">🧸</div>
          <div className="home-floating-toy toy-two">🚀</div>
          <div className="home-floating-toy toy-three">🪁</div>
          <div className="home-floating-toy toy-four">🧩</div>

          <div className="home-art-center">
            <span>🎁</span>
            <strong>TOYLAND</strong>
            <small>Тут живе радість!</small>
          </div>

          <div className="home-art-star star-one">✦</div>
          <div className="home-art-star star-two">✦</div>
          <div className="home-art-star star-three">✦</div>
        </div>
      </section>

      {/* Повертаємо старий блок новинок */}
      <section id="new-products">
        <h2>Новинки</h2>

        {errorMessage && (
          <p className="error">
            Помилка завантаження товарів: {errorMessage}
          </p>
        )}

        {toys.length > 0 ? (
          <div className="grid">
            {toys.map((toy) => (
              <ToyCard key={toy.id} toy={toy} />
            ))}
          </div>
        ) : (
          !errorMessage && (
            <p className="hint">
              Поки немає товарів.
              Адміністратор може додати перші іграшки
              в панелі керування.
            </p>
          )
        )}
      </section>
    </div>
  );
}
