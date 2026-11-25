
"use client";

import {
  FormEvent,
  useCallback,
  useEffect,
  useState,
} from "react";
import { supabase } from "@/lib/supabase";
import type { Toy } from "@/lib/types";

type Category = {
  id: string;
  name: string;
};

type Product = Toy & {
  category_id: string | null;
  specifications?: Record<string, string> | null;
};

type SpecRow = { id: string; name: string; value: string };
const newSpec = (): SpecRow => ({ id: crypto.randomUUID(), name: "", value: "" });

type Order = {
  id: string;
  created_at: string;
  customer_name: string;
  phone: string;
  address: string;
  total: number;
  status: string;
};

type ProductForm = {
  name: string;
  description: string;
  category_id: string;
  age: string;
  price: number;
  stock: number;
  image: string;
  specifications: SpecRow[];
};

const emptyForm: ProductForm = {
  name: "",
  description: "",
  category_id: "",
  age: "3+",
  price: 0,
  stock: 1,
  image: "",
  specifications: [],
};

const orderStatuses = [
  "Нове",
  "Підтверджено",
  "Відправлено",
  "Виконано",
  "Скасовано",
];

export default function Admin() {
  const [allowed, setAllowed] = useState(false);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);

  const [activeTab, setActiveTab] = useState<
    "products" | "form" | "orders"
  >("products");

  const [form, setForm] = useState<ProductForm>(emptyForm);
  const [editing, setEditing] = useState<string | null>(null);

  const [search, setSearch] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);

  const refresh = useCallback(async () => {
    if (!supabase) return;

    setRefreshing(true);

    const [p, c, o] = await Promise.all([
      supabase.from("products").select("*"),
      supabase.from("categories").select("id, name"),
      supabase
        .from("orders")
        .select("*")
        .order("created_at", { ascending: false }),
    ]);

    if (p.error || c.error || o.error) {
      setError(
        [p.error?.message, c.error?.message, o.error?.message]
          .filter(Boolean)
          .join("; ")
      );
    } else {
      setError("");
    }

    if (!p.error) {
      setProducts((p.data || []) as Product[]);
    }

    if (!c.error) {
      setCategories((c.data || []) as Category[]);
    }

    if (!o.error) {
      setOrders((o.data || []) as Order[]);
    }

    setRefreshing(false);
  }, []);

  useEffect(() => {
    async function init() {
      if (!supabase) {
        setError("Не налаштовано Supabase");
        setLoading(false);
        return;
      }

      const { data, error: authError } =
        await supabase.auth.getUser();

      if (authError || !data.user) {
        setLoading(false);
        return;
      }

      const { data: profile, error: profileError } =
        await supabase
          .from("profiles")
          .select("role")
          .eq("id", data.user.id)
          .single();

      if (profileError) {
        setError(profileError.message);
      }

      if (profile?.role === "admin") {
        setAllowed(true);
        await refresh();
      }

      setLoading(false);
    }

    init();
  }, [refresh]);

  function resetForm() {
    setForm({
      ...emptyForm,
      specifications: [],
      category_id: categories[0]?.id || "",
    });
    setEditing(null);
  }

  function startCreate() {
    resetForm();
    setMessage("");
    setError("");
    setActiveTab("form");
  }

  function startEdit(product: Product) {
    setForm({
      name: product.name,
      description: product.description || "",
      category_id: product.category_id || "",
      age: product.age || "3+",
      price: Number(product.price),
      stock: Number(product.stock),
      image: product.image || "",
      specifications: Object.entries(product.specifications || {}).map(([name, value]) => ({
        id: crypto.randomUUID(), name, value: String(value),
      })),
    });

    setEditing(product.id);
    setMessage("");
    setError("");
    setActiveTab("form");

    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function save(e: FormEvent) {
    e.preventDefault();

    if (!supabase || !allowed) return;

    setSaving(true);
    setError("");
    setMessage("");

    const names = form.specifications.map((row) => row.name.trim()).filter(Boolean);
    if (names.length !== new Set(names).size) {
      setError("Назви характеристик не повинні повторюватися");
      setSaving(false);
      return;
    }

    const payload = {
      name: form.name.trim(),
      description: form.description.trim(),
      category_id: form.category_id || null,
      age: form.age,
      price: Number(form.price),
      stock: Number(form.stock),
      image: form.image || null,
      specifications: Object.fromEntries(
        form.specifications.filter((row) => row.name.trim()).map((row) => [row.name.trim(), row.value.trim()])
      ),
    };

    const result = editing
      ? await supabase
          .from("products")
          .update(payload)
          .eq("id", editing)
          .select("id")
      : await supabase
          .from("products")
          .insert(payload)
          .select("id");

    setSaving(false);

    if (result.error) {
      setError(result.error.message);
      return;
    }

    if (!result.data?.length) {
      setError(
        "Товар не збережено. Перевірте політики RLS."
      );
      return;
    }

    setMessage(
      editing
        ? "Товар успішно оновлено"
        : "Нову іграшку додано"
    );

    resetForm();
    setActiveTab("products");
    await refresh();
  }

  async function upload(file: File) {
    if (!supabase || !allowed) return;

    if (
      !file.type.startsWith("image/") ||
      file.size > 5 * 1024 * 1024
    ) {
      setError("Оберіть зображення розміром до 5 МБ");
      return;
    }

    setUploading(true);
    setError("");

    const ext =
      file.name.split(".").pop()?.toLowerCase() || "jpg";

    const path = `${crypto.randomUUID()}.${ext}`;

    const { error: uploadError } = await supabase.storage
      .from("toy-images")
      .upload(path, file, {
        contentType: file.type,
      });

    if (uploadError) {
      setError(uploadError.message);
      setUploading(false);
      return;
    }

    const { data } = supabase.storage
      .from("toy-images")
      .getPublicUrl(path);

    setForm((previous) => ({
      ...previous,
      image: data.publicUrl,
    }));
    setMessage("Фотографію завантажено");

    setUploading(false);
  }

  async function remove(id: string) {
    if (!supabase || !allowed) return;

    if (!window.confirm("Видалити цей товар?")) return;

    setError("");
    setMessage("");

    const { data, error } = await supabase
      .from("products")
      .delete()
      .eq("id", id)
      .select("id");

    if (error) {
      setError(error.message);
      return;
    }

    if (!data?.length) {
      setError(
        "Товар не видалено. Перевірте права доступу."
      );
      return;
    }

    setMessage("Товар успішно видалено");
    await refresh();
  }

  async function changeStatus(id: string, value: string) {
    if (!supabase || !allowed) return;

    const { data, error } = await supabase
      .from("orders")
      .update({ status: value })
      .eq("id", id)
      .select("id");

    if (error) {
      setError(error.message);
      return;
    }

    if (!data?.length) {
      setError("Не вдалося оновити статус замовлення");
      return;
    }

    setMessage("Статус замовлення оновлено");
    await refresh();
  }

  const filteredProducts = products.filter((product) =>
    product.name.toLowerCase().includes(search.toLowerCase())
  );

  const lowStock = products.filter(
    (product) => Number(product.stock) <= 5
  ).length;

  const totalRevenue = orders
    .filter((order) => order.status === "Виконано")
    .reduce((sum, order) => sum + Number(order.total), 0);

  const formatPrice = (value: number) =>
    Number(value).toLocaleString("uk-UA") + " грн";

  const categoryName = (id: string | null) =>
    categories.find((category) => category.id === id)?.name ||
    "Без категорії";

  if (loading) {
    return (
      <div className="admin-loading">
        Перевірка доступу...
      </div>
    );
  }

  if (!allowed) {
    return (
      <section className="panel">
        <h1>Доступ заборонено</h1>
        <p>
          Панель доступна лише користувачам із роллю admin.
        </p>
      </section>
    );
  }

  return (
    <div className="admin-page">

      {/* Заголовок */}
      <div className="admin-heading">
        <div>
          <span className="admin-eyebrow">
            TOYLAND / КЕРУВАННЯ МАГАЗИНОМ
          </span>
          <h1>Панель адміністратора</h1>
          <p>
            Керуйте іграшками, залишками та замовленнями
          </p>
        </div>

        <button onClick={startCreate}>
          + Додати товар
        </button>
      </div>

      {message && (
        <div className="admin-alert success">
          {message}
        </div>
      )}

      {error && (
        <div className="admin-alert error">
          {error}
        </div>
      )}

      {/* Статистика */}
      <div className="admin-stats">
        <div className="admin-stat">
          <span className="admin-stat-icon">📦</span>
          <small>Усього товарів</small>
          <strong>{products.length}</strong>
          <span>У каталозі магазину</span>
        </div>

        <div className="admin-stat">
          <span className="admin-stat-icon">🛒</span>
          <small>Замовлення</small>
          <strong>{orders.length}</strong>
          <span>Усі замовлення</span>
        </div>

        <div className="admin-stat">
          <span className="admin-stat-icon">⚠️</span>
          <small>Мало на складі</small>
          <strong>{lowStock}</strong>
          <span>Залишок 5 шт. або менше</span>
        </div>

        <div className="admin-stat">
          <span className="admin-stat-icon">💰</span>
          <small>Виконані замовлення</small>
          <strong className="admin-revenue">
            {formatPrice(totalRevenue)}
          </strong>
          <span>Сума виконаних замовлень</span>
        </div>
      </div>

      {/* Вкладки */}
      <div className="admin-tabs">
        <button
          className={activeTab === "products" ? "active" : ""}
          onClick={() => setActiveTab("products")}
        >
          Товари ({products.length})
        </button>

        <button
          className={activeTab === "form" ? "active" : ""}
          onClick={() => setActiveTab("form")}
        >
          {editing ? "Редагування" : "Додати товар"}
        </button>

        <button
          className={activeTab === "orders" ? "active" : ""}
          onClick={() => setActiveTab("orders")}
        >
          Замовлення ({orders.length})
        </button>
      </div>

      {/* Товари */}
      {activeTab === "products" && (
        <section className="admin-section">
          <div className="admin-section-header">
            <div>
              <h2>Каталог товарів</h2>
              <p>Перегляд та керування іграшками</p>
            </div>

            <button
              className="secondary"
              disabled={refreshing}
              onClick={refresh}
            >
              {refreshing ? "Оновлення..." : "Оновити"}
            </button>
          </div>

          <div className="admin-search">
            <input
              placeholder="Пошук товару за назвою..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Товар</th>
                  <th>Категорія</th>
                  <th>Ціна</th>
                  <th>Залишок</th>
                  <th>Дії</th>
                </tr>
              </thead>

              <tbody>
                {filteredProducts.map((product) => (
                  <tr key={product.id}>
                    <td>
                      <div className="admin-product-cell">
                        <img
                          src={
                            product.image ||
                            "/toy-placeholder.svg"
                          }
                          alt={product.name}
                          onError={(e) => {
                            e.currentTarget.onerror = null;
                            e.currentTarget.src =
                              "/toy-placeholder.svg";
                          }}
                        />

                        <div>
                          <strong>{product.name}</strong>
                          <small>Вік: {product.age}</small>
                        </div>
                      </div>
                    </td>

                    <td>
                      {categoryName(product.category_id)}
                    </td>

                    <td>
                      <strong>
                        {formatPrice(product.price)}
                      </strong>
                    </td>

                    <td>
                      <span
                        className={
                          product.stock <= 5
                            ? "admin-stock low"
                            : "admin-stock"
                        }
                      >
                        {product.stock} шт.
                      </span>
                    </td>

                    <td>
                      <div className="admin-actions">
                        <button
                          className="secondary"
                          onClick={() => startEdit(product)}
                        >
                          Редагувати
                        </button>

                        <button
                          className="danger"
                          onClick={() => remove(product.id)}
                        >
                          Видалити
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {filteredProducts.length === 0 && (
              <p className="admin-empty">
                Товарів не знайдено
              </p>
            )}
          </div>
        </section>
      )}

      {/* Додавання / редагування */}
      {activeTab === "form" && (
        <section className="admin-section">
          <div className="admin-section-header">
            <div>
              <h2>
                {editing
                  ? "Редагування іграшки"
                  : "Додавання нової іграшки"}
              </h2>
              <p>
                Заповніть інформацію про товар
              </p>
            </div>
          </div>

          <form onSubmit={save} className="admin-form">
            <div className="admin-form-grid">
              <label>
                Назва іграшки
                <input
                  required
                  placeholder="Наприклад, Плюшевий ведмедик"
                  value={form.name}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      name: e.target.value,
                    })
                  }
                />
              </label>

              <label>
                Категорія
                <select
                  required
                  value={form.category_id}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      category_id: e.target.value,
                    })
                  }
                >
                  <option value="">Оберіть категорію</option>

                  {categories.map((category) => (
                    <option
                      key={category.id}
                      value={category.id}
                    >
                      {category.name}
                    </option>
                  ))}
                </select>
              </label>

              <label>
                Рекомендований вік
                <input
                  required
                  placeholder="3+, 6+, 8+"
                  value={form.age}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      age: e.target.value,
                    })
                  }
                />
              </label>

              <label>
                Ціна, грн
                <input
                  type="number"
                  min="0.01"
                  step="0.01"
                  required
                  value={form.price}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      price: Number(e.target.value),
                    })
                  }
                />
              </label>

              <label>
                Кількість на складі
                <input
                  type="number"
                  min="0"
                  step="1"
                  required
                  value={form.stock}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      stock: Number(e.target.value),
                    })
                  }
                />
              </label>

              <label>
                Завантажити фотографію з комп’ютера
                <input
                  type="file"
                  accept="image/*"
                  disabled={uploading}
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) upload(file);
                  }}
                />
              </label>
            </div>

            <label>
              Опис іграшки
              <textarea
                rows={5}
                placeholder="Опишіть особливості іграшки..."
                value={form.description}
                onChange={(e) =>
                  setForm({
                    ...form,
                    description: e.target.value,
                  })
                }
              />
            </label>

            <div className="admin-specifications">
              <h3>Характеристики іграшки</h3>
              <p className="muted">Додавайте матеріал, розміри, виробника, країну виробництва та інші параметри.</p>
              {form.specifications.map((row) => (
                <div className="spec-edit-row" key={row.id}>
                  <input
                    aria-label="Назва характеристики"
                    placeholder="Назва (наприклад, Матеріал)"
                    value={row.name}
                    onChange={(e) => setForm((previous) => ({
                      ...previous,
                      specifications: previous.specifications.map((item) =>
                        item.id === row.id ? { ...item, name: e.target.value } : item
                      ),
                    }))}
                  />
                  <input
                    aria-label="Значення характеристики"
                    placeholder="Значення (наприклад, Пластик)"
                    value={row.value}
                    onChange={(e) => setForm((previous) => ({
                      ...previous,
                      specifications: previous.specifications.map((item) =>
                        item.id === row.id ? { ...item, value: e.target.value } : item
                      ),
                    }))}
                  />
                  <button type="button" className="danger" onClick={() =>
                    setForm((previous) => ({
                      ...previous,
                      specifications: previous.specifications.filter((item) => item.id !== row.id),
                    }))
                  }>Видалити</button>
                </div>
              ))}
              <button type="button" className="secondary" onClick={() =>
                setForm((previous) => ({
                  ...previous,
                  specifications: [...previous.specifications, newSpec()],
                }))
              }>+ Додати характеристику</button>
            </div>

            {uploading && (
              <p className="muted">
                Завантаження фотографії...
              </p>
            )}

            {form.image && (
              <div className="admin-image-preview">
                <img
                  src={form.image}
                  alt="Попередній перегляд"
                />
              </div>
            )}

            <div className="admin-form-actions">
              <button
                type="submit"
                disabled={saving || uploading}
              >
                {saving
                  ? "Збереження..."
                  : editing
                  ? "Зберегти зміни"
                  : "Додати іграшку"}
              </button>

              <button
                type="button"
                className="secondary"
                onClick={() => {
                  resetForm();
                  setActiveTab("products");
                }}
              >
                Скасувати
              </button>
            </div>
          </form>
        </section>
      )}

      {/* Замовлення */}
      {activeTab === "orders" && (
        <section className="admin-section">
          <div className="admin-section-header">
            <div>
              <h2>Замовлення покупців</h2>
              <p>
                Перегляд та зміна статусів замовлень
              </p>
            </div>
          </div>

          {orders.length === 0 && (
            <p className="admin-empty">
              Замовлень поки немає
            </p>
          )}

          <div className="admin-orders">
            {orders.map((order) => (
              <div
                className="admin-order-card"
                key={order.id}
              >
                <div className="admin-order-info">
                  <strong>{order.customer_name}</strong>

                  <span>{order.phone}</span>
                  <span>{order.address}</span>

                  <small>
                    {new Date(
                      order.created_at
                    ).toLocaleString("uk-UA")}
                  </small>
                </div>

                <div className="admin-order-right">
                  <strong>
                    {formatPrice(order.total)}
                  </strong>

                  <select
                    value={order.status}
                    onChange={(e) =>
                      changeStatus(
                        order.id,
                        e.target.value
                      )
                    }
                  >
                    {orderStatuses.map((status) => (
                      <option key={status}>
                        {status}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
