import type { Basket, Store } from '../types/shopping';
import { STORE_LABELS, STORE_COLORS, STORE_BORDER_HOVER, CHECKOUT_URLS } from '../types/shopping';
import { X, ShoppingBasket } from 'lucide-react';

interface Props {
  basket: Basket;
  onRemove: (id: string) => void;
}

export function BasketSidebar({ basket, onRemove }: Props) {
  const stores = Object.keys(basket.byStore) as Store[];

  return (
    <aside className="w-72 flex-shrink-0 flex flex-col border-l border-zinc-800 bg-zinc-900">
      {/* Header */}
      <div className="px-4 py-4 border-b border-zinc-800 flex-shrink-0">
        <div className="flex items-center gap-2">
          <ShoppingBasket size={14} className="text-zinc-400" />
          <h2 className="text-sm font-semibold text-zinc-200">Basket</h2>
          {basket.items.length > 0 && (
            <span className="ml-auto text-xs text-zinc-500">
              {basket.items.length} {basket.items.length === 1 ? 'item' : 'items'}
            </span>
          )}
        </div>
      </div>

      {/* Items */}
      <div className="flex-1 overflow-y-auto">
        {basket.items.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-40 gap-2 text-zinc-700">
            <ShoppingBasket size={24} />
            <p className="text-xs">Your basket is empty</p>
          </div>
        ) : (
          <div className="p-3 space-y-5">
            {stores.map(store => {
              const { items, subtotal } = basket.byStore[store];
              return (
                <div key={store}>
                  {/* Store header */}
                  <div className="flex items-center justify-between mb-2">
                    <span className={`text-xs font-semibold ${STORE_COLORS[store]}`}>
                      {STORE_LABELS[store]}
                    </span>
                    <span className="text-xs text-zinc-500">£{subtotal.toFixed(2)}</span>
                  </div>

                  {/* Items */}
                  <div className="space-y-1.5 mb-2">
                    {items.map(item => (
                      <div key={item.id} className="flex items-start gap-2 bg-zinc-800/60 rounded-lg p-2">
                        <div className="flex-1 min-w-0">
                          <p className="text-xs text-zinc-200 leading-snug line-clamp-2">{item.name}</p>
                          <p className="text-xs text-zinc-500 mt-0.5">
                            £{item.price.toFixed(2)}
                            {item.quantity > 1 && (
                              <span className="ml-1 text-zinc-600">× {item.quantity}</span>
                            )}
                          </p>
                        </div>
                        <button
                          onClick={() => onRemove(item.id)}
                          className="text-zinc-600 hover:text-zinc-400 flex-shrink-0 mt-0.5 transition-colors"
                          title="Remove"
                        >
                          <X size={12} />
                        </button>
                      </div>
                    ))}
                  </div>

                  {/* Checkout button */}
                  <a
                    href={CHECKOUT_URLS[store]}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={`flex items-center justify-center text-xs font-medium py-2 rounded-lg border transition-colors ${STORE_BORDER_HOVER[store]}`}
                  >
                    Confirm at {STORE_LABELS[store]} →
                  </a>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Total */}
      {basket.items.length > 0 && (
        <div className="px-4 py-3 border-t border-zinc-800 flex-shrink-0">
          <div className="flex items-center justify-between">
            <span className="text-xs text-zinc-400">Basket total</span>
            <span className="text-sm font-semibold text-zinc-100">£{basket.total.toFixed(2)}</span>
          </div>
        </div>
      )}
    </aside>
  );
}
