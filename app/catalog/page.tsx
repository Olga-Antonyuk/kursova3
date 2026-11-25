
"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";
import type { Toy } from "@/lib/types";
import ToyCard from "@/components/ToyCard";

type Category = {
  id: string;
  name: string;
  description: string | null;
};

type Product = Toy & {
  category_id: string | null;
};

export default function Catalog() {
  const [toys, setToys] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);

  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("all");
  const [sort, setSort] = useState("new");

  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      if (!supabase) {
        setError("Не налаштовано підключення до Supabase");
        setLoading(false);
        return;
      }

      setLoading(true);
      setError("");

      const [productsResult, categoriesResult] =
        await Promise.all([
          supabase.from("products").select("*"),
          supabase
            .from("categories")
            .select("id, name, description")
            .order("name"),
        ]);
        console.log("Товари:", productsResult.data);
console.log("Категорії:", categoriesResult.data);
console.log("Помилка категорій:", categoriesResult.error);

      if (productsResult.error) {
        setError(productsResult.error.message);
      } else {
        setToys((productsResult.data || []) as Product[]);
      }

      if (categoriesResult.error) {
        setError((previous) =>
          previous
            ? previous + "; " + categoriesResult.error!.message
            : categoriesResult.error!.message
        );
      } else {
        setCategories(
          (categoriesResult.data || []) as Category[]
        );
      }

      setLoading(false);
    }

    loadData();
  }, []);

  const shown = useMemo(() => {
    return toys
      .filter((toy) => {
        const matchesSearch = toy.name
          .toLowerCase()
          .includes(search.toLowerCase());

        const matchesCategory =
          category === "all" ||
          toy.category_id === category;

        return matchesSearch && matchesCategory;
      })
      .sort((a, b) => {
        if (sort === "low") {
          return Number(a.price) - Number(b.price);
        }

        if (sort === "high") {
          return Number(b.price) - Number(a.price);
        }

        return (
          new Date(b.created_at ?? 0).getTime() -
          new Date(a.created_at ?? 0).getTime()
        );
      });
  }, [toys, search, category, sort]);

  return (
    <>
      <h1>Каталог іграшок</h1>

      <div className="toolbar">
        {/* Пошук */}
        <input
          type="text"
          placeholder="Пошук іграшок"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />

        {/* Категорії */}
        <select
          value={category}
          onChange={(e) => setCategory(e.target.value)}
        >
          <option value="all">Усі категорії</option>

          {categories.map((cat) => (
            <option key={cat.id} value={cat.id}>
              {cat.name}
            </option>
          ))}
        </select>

        {/* Сортування */}
        <select
          value={sort}
          onChange={(e) => setSort(e.target.value)}
        >
          <option value="new">Спочатку нові</option>
          <option value="low">Від дешевих</option>
          <option value="high">Від дорогих</option>
        </select>
      </div>

      {/* Завантаження */}
      {loading && (
        <p className="muted">Завантаження товарів...</p>
      )}

      {/* Помилка */}
      {error && <p className="error">{error}</p>}

      {/* Кількість товарів */}
      {!loading && !error && (
        <p className="muted">
          Знайдено товарів: {shown.length}
        </p>
      )}

      {/* Список товарів */}
      {!loading && !error && (
        <div className="grid">
          {shown.map((toy) => {
            const foundCategory = categories.find(
              (cat) => cat.id === toy.category_id
            );

            return (
              <ToyCard
                key={toy.id}
                toy={{
                  ...toy,
                  category: foundCategory?.name || "Іграшки",
                }}
              />
            );
          })}
        </div>
      )}

      {/* Порожній результат */}
      {!loading && !error && shown.length === 0 && (
        <p className="hint">
          У цій категорії товарів поки немає.
        </p>
      )}
    </>
  );
}
