
export type Toy = {
  id: string;
  name: string;
  description: string | null;
  category: string | null;
  age: string;
  price: number;
  stock: number;
  image: string | null;
  created_at?: string;
};

export type CartItem = {
  toy: Toy;
  quantity: number;
};
