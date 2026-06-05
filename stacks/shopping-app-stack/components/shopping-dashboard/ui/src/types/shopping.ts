export interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
}

export interface Product {
  name: string;
  price: number;
  store: Store;
  url: string | null;
  image: string | null;
}

export type Store = 'tesco' | 'sainsburys' | 'amazon' | 'ebay';

export interface BasketItem {
  id: string;
  name: string;
  store: Store;
  price: number;
  url: string | null;
  quantity: number;
  addedAt: string;
}

export interface Basket {
  items: BasketItem[];
  byStore: Record<Store, { items: BasketItem[]; subtotal: number }>;
  total: number;
}

export const STORE_LABELS: Record<Store, string> = {
  tesco:      'Tesco',
  sainsburys: "Sainsbury's",
  amazon:     'Amazon',
  ebay:       'eBay',
};

export const STORE_COLORS: Record<Store, string> = {
  tesco:      'text-blue-400',
  sainsburys: 'text-orange-400',
  amazon:     'text-yellow-400',
  ebay:       'text-red-400',
};

export const STORE_BORDER_HOVER: Record<Store, string> = {
  tesco:      'border-blue-700 text-blue-400 hover:bg-blue-900/20',
  sainsburys: 'border-orange-700 text-orange-400 hover:bg-orange-900/20',
  amazon:     'border-yellow-700 text-yellow-400 hover:bg-yellow-900/20',
  ebay:       'border-red-700 text-red-400 hover:bg-red-900/20',
};

export const CHECKOUT_URLS: Record<Store, string> = {
  tesco:      'https://www.tesco.com/groceries/en-GB/trolley',
  sainsburys: 'https://www.sainsburys.co.uk/webapp/wcs/stores/servlet/ShoppingCartCmd',
  amazon:     'https://www.amazon.co.uk/gp/cart/view.html',
  ebay:       'https://cart.ebay.co.uk/',
};
