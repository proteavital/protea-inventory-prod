'use client';

import { useState, useEffect } from 'react';
import {
  ArrowLeft01Icon,
  CancelCircleIcon,
  CheckmarkCircle01Icon,
  PackageRemoveIcon,
} from '@hugeicons/core-free-icons';
import { HugeiconsIcon } from '@hugeicons/react';
import Link from 'next/link';

import { exitFinishedProduct, FinishedProduct, getAllFinishedProducts } from '@/lib/airtable-fifo';
import { AppSidebar } from '@/components/app-sidebar';
import { Button } from '@workspace/ui/components/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@workspace/ui/components/card';
import { Input } from '@workspace/ui/components/input';
import { Label } from '@workspace/ui/components/label';
import { Separator } from '@workspace/ui/components/separator';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@workspace/ui/components/select';
import { SidebarInset, SidebarProvider, SidebarTrigger } from '@workspace/ui/components/sidebar';
import { cn } from '@workspace/ui/lib/utils';

export default function ExitProduct() {
  const [products, setProducts] = useState<FinishedProduct[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<FinishedProduct | null>(null);
  const [quantity, setQuantity] = useState('');
  const [notes, setNotes] = useState('');
  const [message, setMessage] = useState('');
  const [isError, setIsError] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    getAllFinishedProducts().then(setProducts);
  }, []);

  const handleProductSelect = (id: string) => {
    const product = products.find((p) => p.id === id) || null;
    setSelectedProduct(product);
    setMessage('');
  };

  const handleSubmit = async () => {
    if (!selectedProduct) return;
    const qty = parseFloat(quantity);
    if (isNaN(qty) || qty <= 0) {
      setMessage('Please enter a valid quantity.');
      setIsError(true);
      return;
    }
    const available = selectedProduct.fields['Current Stock'] || 0;
    if (qty > available) {
      setMessage(`Only ${available} units available in stock.`);
      setIsError(true);
      return;
    }
    setLoading(true);
    const result = await exitFinishedProduct(selectedProduct.id, qty, 'Warehouse User', notes || undefined);
    if (result.success) {
      setMessage(`Removed ${qty} unit(s) of ${selectedProduct.fields['Product Name']} from stock.`);
      setIsError(false);
      setQuantity('');
      setNotes('');
      setSelectedProduct(null);
      getAllFinishedProducts().then(setProducts);
    } else {
      setMessage(result.error || 'Failed to exit product.');
      setIsError(true);
    }
    setLoading(false);
  };

  return (
    <SidebarProvider
      style={
        {
          '--sidebar-width': 'calc(var(--spacing) * 72)',
          '--header-height': 'calc(var(--spacing) * 12)',
        } as React.CSSProperties
      }
    >
      <AppSidebar collapsible="icon" />
      <SidebarInset>
        <header className="flex h-(--header-height) shrink-0 items-center gap-2 border-b transition-[width,height] ease-linear">
          <div className="flex w-full items-center gap-1 px-4 lg:gap-2 lg:px-6">
            <SidebarTrigger className="-ml-1" />
            <Separator orientation="vertical" className="mx-2 data-[orientation=vertical]:h-4" />
            <h1 className="text-base font-medium">Iesiri produse finite</h1>
          </div>
        </header>

        <div className="flex flex-1 flex-col p-4 lg:p-6">
          <div className="mx-auto w-full max-w-lg space-y-4">
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Exit Finished Product</CardTitle>
                    <CardDescription>Remove finished products from stock (sales, disposal, correction)</CardDescription>
                  </div>
                  <Button variant="ghost" size="sm" asChild>
                    <Link href="/">
                      <HugeiconsIcon icon={ArrowLeft01Icon} size={16} />
                      Back
                    </Link>
                  </Button>
                </div>
              </CardHeader>

              <CardContent className="space-y-4">
                {message && (
                  <div
                    className={cn(
                      'flex items-start gap-2.5 rounded-lg border px-4 py-3 text-sm',
                      !isError
                        ? 'border-green-200 bg-green-50 text-green-800 dark:border-green-800 dark:bg-green-950 dark:text-green-300'
                        : 'border-destructive/30 bg-destructive/10 text-destructive dark:border-destructive/40 dark:bg-destructive/20'
                    )}
                  >
                    <HugeiconsIcon
                      icon={!isError ? CheckmarkCircle01Icon : CancelCircleIcon}
                      size={16}
                      className="mt-0.5 shrink-0"
                    />
                    <p>{message}</p>
                  </div>
                )}

                <div className="space-y-1.5">
                  <Label>Finished Product</Label>
                  <Select value={selectedProduct?.id || ''} onValueChange={handleProductSelect}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select a product..." />
                    </SelectTrigger>
                    <SelectContent>
                      {products.map((p) => (
                        <SelectItem key={p.id} value={p.id}>
                          {p.fields['Product Name']} — {p.fields['Current Stock'] ?? 0} units
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {selectedProduct && (
                  <div className="rounded-lg bg-muted px-4 py-3 text-sm">
                    <span className="text-muted-foreground">Current stock: </span>
                    <span className="font-semibold">{selectedProduct.fields['Current Stock'] ?? 0} units</span>
                  </div>
                )}

                <div className="space-y-1.5">
                  <Label htmlFor="quantity">Quantity to Remove</Label>
                  <Input
                    id="quantity"
                    type="number"
                    placeholder="0"
                    value={quantity}
                    onChange={(e) => setQuantity(e.target.value)}
                    min="0"
                    step="1"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="notes">Reason / Notes</Label>
                  <Input
                    id="notes"
                    type="text"
                    placeholder="e.g. Sold, Damaged, Correction..."
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                  />
                </div>

                <Button
                  onClick={handleSubmit}
                  disabled={loading || !selectedProduct || !quantity}
                  variant="destructive"
                  size="lg"
                  className="w-full"
                >
                  <HugeiconsIcon icon={PackageRemoveIcon} size={16} />
                  {loading ? 'Processing...' : 'Remove from Stock'}
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
