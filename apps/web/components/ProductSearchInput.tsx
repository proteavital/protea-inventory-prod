'use client';

import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Search01Icon } from '@hugeicons/core-free-icons';
import { HugeiconsIcon } from '@hugeicons/react';
import { getAllFinishedProducts, FinishedProduct } from '@/lib/airtable-fifo';
import { Input } from '@workspace/ui/components/input';
import { Label } from '@workspace/ui/components/label';

interface ProductSearchInputProps {
  onSelect: (product: FinishedProduct) => void;
  disabled?: boolean;
}

interface DropdownPosition {
  top: number;
  left: number;
  width: number;
}

// Safely extract a printable string from any Airtable field value.
// Airtable's Barcode field type returns { text: "..." } instead of a plain string.
function toDisplayString(value: unknown): string | null {
  if (value === null || value === undefined) return null;
  if (typeof value === 'string') return value.trim() || null;
  if (typeof value === 'number') return String(value);
  if (Array.isArray(value)) return value.length > 0 ? toDisplayString(value[0]) : null;
  if (typeof value === 'object') {
    const obj = value as Record<string, unknown>;
    if (obj.text !== undefined) return toDisplayString(obj.text);
    if (obj.value !== undefined) return toDisplayString(obj.value);
    if (obj.name !== undefined) return toDisplayString(obj.name);
  }
  return null;
}

export function ProductSearchInput({ onSelect, disabled }: ProductSearchInputProps) {
  const [query, setQuery] = useState('');
  const [products, setProducts] = useState<FinishedProduct[]>([]);
  const [filtered, setFiltered] = useState<FinishedProduct[]>([]);
  const [open, setOpen] = useState(false);
  const [fetching, setFetching] = useState(false);
  const [dropdownPos, setDropdownPos] = useState<DropdownPosition | null>(null);

  const inputWrapperRef = useRef<HTMLDivElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Load all products once on mount
  useEffect(() => {
    setFetching(true);
    getAllFinishedProducts().then((data) => {
      setProducts(data);
      setFetching(false);
    });
  }, []);

  // Filter locally as user types
  useEffect(() => {
    if (!query.trim()) {
      setFiltered([]);
      setOpen(false);
      return;
    }
    const q = query.toLowerCase();
    const results = products.filter((p) => {
      const nameMatch = (p.fields['Product Name'] ?? '').toLowerCase().includes(q);
      const productId = toDisplayString(p.fields['Product ID']);
      const idMatch = productId ? productId.toLowerCase().includes(q) : false;
      const barcode = toDisplayString(p.fields['Barcode']);
      const barcodeMatch = barcode ? barcode.toLowerCase().includes(q) : false;
      return nameMatch || idMatch || barcodeMatch;
    });
    setFiltered(results);
    setOpen(results.length > 0);
  }, [query, products]);

  // Recompute dropdown position whenever it opens or on scroll/resize
  useEffect(() => {
    if (!open || !inputWrapperRef.current) return;

    const updatePosition = () => {
      const rect = inputWrapperRef.current!.getBoundingClientRect();
      setDropdownPos({
        top: rect.bottom + window.scrollY + 4,
        left: rect.left + window.scrollX,
        width: rect.width,
      });
    };

    updatePosition();
    window.addEventListener('scroll', updatePosition, true);
    window.addEventListener('resize', updatePosition);
    return () => {
      window.removeEventListener('scroll', updatePosition, true);
      window.removeEventListener('resize', updatePosition);
    };
  }, [open]);

  // Close on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Node;
      const insideInput = inputWrapperRef.current?.contains(target);
      const insideDropdown = dropdownRef.current?.contains(target);
      if (!insideInput && !insideDropdown) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelect = (product: FinishedProduct) => {
    setQuery('');
    setOpen(false);
    onSelect(product);
  };

  const dropdown =
    open && dropdownPos
      ? createPortal(
          <div
            ref={dropdownRef}
            style={{
              position: 'absolute',
              top: dropdownPos.top,
              left: dropdownPos.left,
              width: dropdownPos.width,
              zIndex: 9999,
            }}
            className="rounded-lg border bg-popover text-popover-foreground shadow-md"
          >
            <ul className="max-h-60 overflow-auto py-1">
              {filtered.map((product) => {
                const barcode = toDisplayString(product.fields['Barcode']);
                return (
                  <li key={product.id}>
                    <button
                      type="button"
                      onClick={() => handleSelect(product)}
                      className="flex w-full flex-col px-3 py-2 text-left text-sm hover:bg-accent hover:text-accent-foreground transition-colors"
                    >
                      <span className="font-medium">{product.fields['Product Name']}</span>
                      <span className="text-xs text-muted-foreground">
                        {barcode ? `Barcode: ${barcode}` : product.fields['Product ID']}
                        {product.fields['Current Stock'] !== undefined &&
                          ` · Stock: ${product.fields['Current Stock']} units`}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>,
          document.body
        )
      : null;

  return (
    <div className="space-y-1.5">
      <Label htmlFor="product-search">Search by name, code or barcode</Label>
      <div ref={inputWrapperRef} className="relative">
        <HugeiconsIcon
          icon={Search01Icon}
          size={16}
          className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none"
        />
        <Input
          id="product-search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={fetching ? 'Loading products...' : 'e.g. Produs Finit or 123456789'}
          disabled={disabled || fetching}
          className="pl-9"
          autoFocus
          autoComplete="off"
        />
      </div>
      {dropdown}
    </div>
  );
}
