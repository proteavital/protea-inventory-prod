'use client';

import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Search01Icon } from '@hugeicons/core-free-icons';
import { HugeiconsIcon } from '@hugeicons/react';
import { getAllRawMaterials, RawMaterial } from '@/lib/airtable-fifo';
import { Input } from '@workspace/ui/components/input';
import { Label } from '@workspace/ui/components/label';

interface MaterialSearchInputProps {
  onSelect: (material: RawMaterial) => void;
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
    // Airtable Barcode field type: { text: "12345678" }
    if (obj.text !== undefined) return toDisplayString(obj.text);
    // Other common object shapes
    if (obj.value !== undefined) return toDisplayString(obj.value);
    if (obj.name !== undefined) return toDisplayString(obj.name);
  }
  return null;
}

export function MaterialSearchInput({ onSelect, disabled }: MaterialSearchInputProps) {
  const [query, setQuery] = useState('');
  const [materials, setMaterials] = useState<RawMaterial[]>([]);
  const [filtered, setFiltered] = useState<RawMaterial[]>([]);
  const [open, setOpen] = useState(false);
  const [fetching, setFetching] = useState(false);
  const [dropdownPos, setDropdownPos] = useState<DropdownPosition | null>(null);

  const inputWrapperRef = useRef<HTMLDivElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Load all materials once on mount
  useEffect(() => {
    setFetching(true);
    getAllRawMaterials().then((data) => {
      setMaterials(data);
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
    const results = materials.filter((m) => {
      const nameMatch = (m.fields['Material Name'] ?? '').toLowerCase().includes(q);
      const barcode = toDisplayString(m.fields['Barcode']);
      const barcodeMatch = barcode ? barcode.toLowerCase().includes(q) : false;
      return nameMatch || barcodeMatch;
    });
    setFiltered(results);
    setOpen(results.length > 0);
  }, [query, materials]);

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

  // Close on outside click — exclude both the input wrapper AND the portal dropdown
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

  const handleSelect = (material: RawMaterial) => {
    setQuery('');
    setOpen(false);
    onSelect(material);
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
              {filtered.map((material) => {
                const barcode = toDisplayString(material.fields['Barcode']);
                return (
                  <li key={material.id}>
                    <button
                      type="button"
                      onClick={() => handleSelect(material)}
                      className="flex w-full flex-col px-3 py-2 text-left text-sm hover:bg-accent hover:text-accent-foreground transition-colors"
                    >
                      <span className="font-medium">{material.fields['Material Name']}</span>
                      <span className="text-xs text-muted-foreground">
                        {barcode ? `Barcode: ${barcode}` : 'No barcode'}
                        {material.fields['Current Stock'] !== undefined &&
                          ` · Stock: ${material.fields['Current Stock']} ${material.fields['Unit']}`}
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
      <Label htmlFor="material-search">Search by name or barcode</Label>
      <div ref={inputWrapperRef} className="relative">
        <HugeiconsIcon
          icon={Search01Icon}
          size={16}
          className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none"
        />
        <Input
          id="material-search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={fetching ? 'Loading materials...' : 'e.g. Steel Sheet or 123456789'}
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
