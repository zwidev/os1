import type { Product, Store } from '../types/shopping';
import { STORE_LABELS, STORE_COLORS } from '../types/shopping';
import { ShoppingCart, ExternalLink } from 'lucide-react';

interface Props {
  json: string;
  onAdd: (text: string) => void;
}

export function ResultCard({ json, onAdd }: Props) {
  let products: Product[] = [];
  try {
    const parsed = JSON.parse(json);
    products = Array.isArray(parsed) ? parsed : [];
  } catch {
    return null;
  }

  if (!products.length) return null;

  return (
    <div className="grid gap-2" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(190px, 1fr))' }}>
      {products.map((product, i) => {
        const storeLabel = STORE_LABELS[product.store as Store] || product.store;
        const storeColor = STORE_COLORS[product.store as Store] || 'text-zinc-400';

        return (
          <div key={i} className="bg-zinc-800 rounded-xl p-3 flex flex-col gap-2 border border-zinc-700/50">
            {/* Store badge */}
            <div className="flex items-center justify-between">
              <span className={`text-xs font-medium ${storeColor}`}>{storeLabel}</span>
              {product.url && (
                <a
                  href={product.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-zinc-600 hover:text-zinc-400 transition-colors"
                  title="View on site"
                >
                  <ExternalLink size={11} />
                </a>
              )}
            </div>

            {/* Product name */}
            <p className="text-xs text-zinc-200 leading-snug flex-1">{product.name}</p>

            {/* Price + Add button */}
            <div className="flex items-center justify-between mt-auto pt-1">
              <span className="text-base font-semibold text-zinc-100">
                £{product.price.toFixed(2)}
              </span>
              <button
                onClick={() =>
                  onAdd(
                    `Add "${product.name}" from ${storeLabel} at £${product.price.toFixed(2)} to my basket`
                  )
                }
                className="flex items-center gap-1 text-xs text-zinc-300 hover:text-white bg-zinc-700 hover:bg-zinc-600 rounded-lg px-2.5 py-1 transition-colors"
              >
                <ShoppingCart size={11} />
                Add
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}
