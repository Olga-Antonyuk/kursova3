
"use client";

import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";

import type { ReactNode } from "react";
import type { Toy, CartItem } from "@/lib/types";
import { supabase } from "@/lib/supabase";

type Store = {
  items: CartItem[];
  add: (toy: Toy) => void;
  remove: (id: string) => void;
  setQuantity: (id: string, n: number) => void;
  clear: () => void;
  resetLocal: () => void;
  waitForPending: () => Promise<void>;
  count: number;
  loading: boolean;
  userId: string | null;
  message: string;
};

const Context = createContext<Store | null>(null);

type CartRow = {
  product_id: string;
  quantity: number;
};

export function ShopProvider({
  children,
}: {
  children: ReactNode;
}) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);
  const [message, setMessage] = useState("");

  const itemsRef = useRef<CartItem[]>([]);
  const userRef = useRef<string | null>(null);
  const generation = useRef(0);
  const queue = useRef<Promise<void>>(Promise.resolve());

  function updateItems(next: CartItem[]) {
    itemsRef.current = next;
    setItems(next);
  }

  function changeItems(
    updater: (current: CartItem[]) => CartItem[]
  ) {
    const next = updater(itemsRef.current);
    updateItems(next);
  }

  async function loadCart(uid: string, version: number) {
    if (!supabase) return;

    const { data, error } = await supabase
      .from("cart_items")
      .select("product_id, quantity")
      .eq("user_id", uid);

    if (version !== generation.current) return;

    if (error) {
      setMessage(error.message);
      setLoading(false);
      return;
    }

    const rows = (data || []) as CartRow[];

    if (!rows.length) {
      updateItems([]);
      setLoading(false);
      return;
    }

    const { data: products, error: productsError } =
      await supabase
        .from("products")
        .select("*")
        .in(
          "id",
          rows.map((row) => row.product_id)
        );

    if (version !== generation.current) return;

    if (productsError) {
      setMessage(productsError.message);
      setLoading(false);
      return;
    }

    const productMap = new Map(
      ((products || []) as Toy[]).map((toy) => [
        toy.id,
        toy,
      ])
    );

    const loadedItems: CartItem[] = rows
      .flatMap((row) => {
        const toy = productMap.get(row.product_id);

        if (!toy || toy.stock < 1) return [];

        return [
          {
            toy,
            quantity: Math.min(
              toy.stock,
              Math.max(1, row.quantity)
            ),
          },
        ];
      });

    updateItems(loadedItems);
    setLoading(false);
  }

  useEffect(() => {
    if (!supabase) {
      setMessage("Не налаштовано Supabase");
      setLoading(false);
      return;
    }

    const client = supabase;
    let active = true;

    async function changeUser(uid: string | null) {
      if (!active) return;

      const version = ++generation.current;

      userRef.current = uid;
      setUserId(uid);
      updateItems([]);
      setMessage("");
      setLoading(Boolean(uid));

      if (uid) {
        await loadCart(uid, version);
      }
    }

    const {
      data: { subscription },
    } = client.auth.onAuthStateChange(
      (_event, session) => {
        const uid = session?.user?.id || null;

        if (uid !== userRef.current) {
          void changeUser(uid);
        }
      }
    );

    void client.auth.getUser().then(({ data }) => {
      if (!active) return;

      const uid = data.user?.id || null;

      if (uid !== userRef.current) {
        void changeUser(uid);
      } else if (!uid) {
        setLoading(false);
      }
    });

    return () => {
      active = false;
      generation.current++;
      subscription.unsubscribe();
    };
  }, []);

  function runMutation(
    uid: string,
    operation: () => PromiseLike<{
      error: { message: string } | null;
    }>
  ) {
    const version = generation.current;

    queue.current = queue.current
      .catch(() => {})
      .then(async () => {
        if (version !== generation.current) return;

        const result = await operation();

        if (version !== generation.current) return;

        if (result.error) {
          setMessage(result.error.message);
          await loadCart(uid, version);
        }
      })
      .catch(async (error: unknown) => {
        if (version !== generation.current) return;

        setMessage(
          error instanceof Error
            ? error.message
            : "Помилка збереження кошика"
        );

        await loadCart(uid, version);
      });
  }

  function add(toy: Toy) {
    const uid = userRef.current;

    if (!uid || !supabase) {
      setMessage(
        "Увійдіть в акаунт, щоб додати товар у кошик"
      );
      return;
    }

    if (loading || toy.stock < 1) return;

    const current = itemsRef.current.find(
      (item) => item.toy.id === toy.id
    );

    const quantity = Math.min(
      toy.stock,
      (current?.quantity || 0) + 1
    );

    if (current && quantity === current.quantity) return;

    changeItems((old) => {
      const existing = old.find(
        (item) => item.toy.id === toy.id
      );

      return existing
        ? old.map((item) =>
            item.toy.id === toy.id
              ? { ...item, quantity }
              : item
          )
        : [...old, { toy, quantity }];
    });

    setMessage("");

    const client = supabase;

    runMutation(uid, () =>
      client.from("cart_items").upsert(
        {
          user_id: uid,
          product_id: toy.id,
          quantity,
        },
        {
          onConflict: "user_id,product_id",
        }
      )
    );
  }

  function remove(id: string) {
    const uid = userRef.current;

    if (!uid || !supabase || loading) return;

    changeItems((old) =>
      old.filter((item) => item.toy.id !== id)
    );

    setMessage("");

    const client = supabase;

    runMutation(uid, () =>
      client
        .from("cart_items")
        .delete()
        .eq("user_id", uid)
        .eq("product_id", id)
    );
  }

  function setQuantity(id: string, n: number) {
    const uid = userRef.current;

    if (!uid || !supabase || loading) return;

    const item = itemsRef.current.find(
      (entry) => entry.toy.id === id
    );

    if (!item || item.toy.stock < 1) return;

    const quantity = Math.max(
      1,
      Math.min(item.toy.stock, Math.trunc(n || 1))
    );

    changeItems((old) =>
      old.map((entry) =>
        entry.toy.id === id
          ? { ...entry, quantity }
          : entry
      )
    );

    setMessage("");

    const client = supabase;

    runMutation(uid, () =>
      client.from("cart_items").upsert(
        {
          user_id: uid,
          product_id: id,
          quantity,
        },
        {
          onConflict: "user_id,product_id",
        }
      )
    );
  }

  function clear() {
    const uid = userRef.current;

    if (!uid || !supabase || loading) return;

    updateItems([]);
    setMessage("");

    const client = supabase;

    runMutation(uid, () =>
      client
        .from("cart_items")
        .delete()
        .eq("user_id", uid)
    );
  }

  function resetLocal() {
    updateItems([]);
    setMessage("");
  }

  async function waitForPending() {
    await queue.current;
  }

  const count = items.reduce(
    (sum, item) => sum + item.quantity,
    0
  );

  return (
    <Context.Provider
      value={{
        items,
        add,
        remove,
        setQuantity,
        clear,
        resetLocal,
        waitForPending,
        count,
        loading,
        userId,
        message,
      }}
    >
      {children}
    </Context.Provider>
  );
}

export function useShop() {
  const context = useContext(Context);

  if (!context) {
    throw new Error("ShopProvider missing");
  }

  return context;
}
