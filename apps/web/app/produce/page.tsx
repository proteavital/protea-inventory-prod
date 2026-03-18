'use client';

import { useState, useEffect } from 'react';
import {
  Alert01Icon,
  ArrowLeft01Icon,
  CancelCircleIcon,
  CheckmarkCircle01Icon,
  Factory01Icon,
} from '@hugeicons/core-free-icons';
import { HugeiconsIcon } from '@hugeicons/react';
import Link from 'next/link';

import {
  FinishedProduct,
  getAllFinishedProducts,
  getAllRawMaterials,
  getRecipesForProduct,
  produceFinishedProductFIFO,
  RawMaterial,
  Recipe,
} from '@/lib/airtable-fifo';
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

export default function Produce() {
  const [products, setProducts] = useState<FinishedProduct[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<FinishedProduct | null>(null);
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [rawMaterials, setRawMaterials] = useState<RawMaterial[]>([]);
  const [quantity, setQuantity] = useState<string>('1');
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState<'success' | 'error' | 'warning'>('success');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadProducts();
    loadRawMaterials();
  }, []);

  const loadProducts = async () => {
    const data = await getAllFinishedProducts();
    setProducts(data);
  };

  const loadRawMaterials = async () => {
    const data = await getAllRawMaterials();
    setRawMaterials(data);
  };

  const handleProductSelect = async (productId: string) => {
    const product = products.find((p) => p.id === productId);
    if (!product) return;
    setSelectedProduct(product);
    setMessage('');
    const recipeData = await getRecipesForProduct(product.id);
    setRecipes(recipeData);
    if (recipeData.length === 0) {
      setMessage('No recipe configured for this product. Please contact admin.');
      setMessageType('warning');
    }
  };

  const canProduce = (qty: number): { canProduce: boolean; missing: string[] } => {
    const missing: string[] = [];
    recipes.forEach((recipe) => {
      const materialId = recipe.fields['Raw Material'][0];
      const material = rawMaterials.find((m) => m.id === materialId);
      if (material) {
        const needed = recipe.fields['Quantity Needed'] * qty;
        const available = material.fields['Current Stock'] || 0;
        if (available < needed) {
          missing.push(
            `${material.fields['Material Name']}: need ${needed}, have ${available} ${material.fields['Unit']}`
          );
        }
      }
    });
    return { canProduce: missing.length === 0, missing };
  };

  const handleProduce = async () => {
    if (!selectedProduct) return;
    const qty = parseFloat(quantity);
    if (isNaN(qty) || qty <= 0) {
      setMessage('Please enter a valid quantity');
      setMessageType('error');
      return;
    }
    const check = canProduce(qty);
    if (!check.canProduce) {
      setMessage(`Insufficient materials:\n${check.missing.join('\n')}`);
      setMessageType('error');
      return;
    }
    setLoading(true);
    const result = await produceFinishedProductFIFO(selectedProduct.id, qty, 'Warehouse User', recipes);
    if (result.success) {
      setMessage(`Produced ${qty} units of ${selectedProduct.fields['Product Name']}`);
      setMessageType('success');
      setQuantity('1');
      setSelectedProduct(null);
      setRecipes([]);
      await loadRawMaterials();
    } else {
      setMessage(result.error || 'Failed to produce product');
      setMessageType('error');
    }
    setLoading(false);
  };

  const qty = parseFloat(quantity);
  const showMaterialsCheck = selectedProduct && recipes.length > 0 && quantity && qty > 0;

  const messageIcon =
    messageType === 'success'
      ? CheckmarkCircle01Icon
      : messageType === 'warning'
        ? Alert01Icon
        : CancelCircleIcon;

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
            <h1 className="text-base font-medium">Productie</h1>
          </div>
        </header>

        <div className="flex flex-1 flex-col p-4 lg:p-6">
          <div className="mx-auto w-full max-w-2xl space-y-4">
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Produce Product</CardTitle>
                    <CardDescription>Create finished products from raw materials</CardDescription>
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
                      messageType === 'success'
                        ? 'border-green-200 bg-green-50 text-green-800 dark:border-green-800 dark:bg-green-950 dark:text-green-300'
                        : messageType === 'warning'
                          ? 'border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-300'
                          : 'border-destructive/30 bg-destructive/10 text-destructive dark:border-destructive/40 dark:bg-destructive/20'
                    )}
                  >
                    <HugeiconsIcon icon={messageIcon} size={16} className="mt-0.5 shrink-0" />
                    <p className="whitespace-pre-line">{message}</p>
                  </div>
                )}

                <div className="space-y-1.5">
                  <Label>Select Product</Label>
                  <Select value={selectedProduct?.id || ''} onValueChange={handleProductSelect}>
                    <SelectTrigger>
                      <SelectValue placeholder="Choose a product..." />
                    </SelectTrigger>
                    <SelectContent>
                      {products.map((product) => (
                        <SelectItem key={product.id} value={product.id}>
                          {product.fields['Product Name']} ({product.fields['Product ID']})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {selectedProduct && recipes.length > 0 && (
                  <>
                    <Separator />

                    <div className="rounded-lg bg-muted p-4 space-y-2">
                      <p className="text-sm font-semibold">Recipe</p>
                      <ul className="space-y-1">
                        {recipes.map((recipe, idx) => {
                          const materialId = recipe.fields['Raw Material'][0];
                          const material = rawMaterials.find((m) => m.id === materialId);
                          const available = material?.fields['Current Stock'] || 0;
                          const unit = material?.fields['Unit'] || '';
                          return (
                            <li key={idx} className="flex justify-between text-sm">
                              <span>{recipe.fields['Recipe Line']}</span>
                              <span className="text-muted-foreground">available: {available} {unit}</span>
                            </li>
                          );
                        })}
                      </ul>
                    </div>

                    <div className="space-y-1.5">
                      <Label htmlFor="quantity">Quantity to Produce</Label>
                      <Input
                        id="quantity"
                        type="number"
                        value={quantity}
                        onChange={(e) => setQuantity(e.target.value)}
                        min="0"
                        step="1"
                        className="text-lg font-semibold"
                      />
                    </div>

                    {showMaterialsCheck && (
                      <div className="rounded-lg border p-4 space-y-2">
                        <p className="text-sm font-semibold">Materials needed for {quantity} unit(s)</p>
                        <ul className="space-y-1">
                          {recipes.map((recipe, idx) => {
                            const materialId = recipe.fields['Raw Material'][0];
                            const material = rawMaterials.find((m) => m.id === materialId);
                            const needed = recipe.fields['Quantity Needed'] * qty;
                            const available = material?.fields['Current Stock'] || 0;
                            const sufficient = available >= needed;
                            return (
                              <li
                                key={idx}
                                className={cn(
                                  'flex items-center justify-between text-sm',
                                  sufficient ? 'text-green-700 dark:text-green-400' : 'font-semibold text-destructive'
                                )}
                              >
                                <span>
                                  {material?.fields['Material Name']}: {needed.toFixed(2)} {material?.fields['Unit']}
                                </span>
                                <span>{sufficient ? '✓' : '✗'}</span>
                              </li>
                            );
                          })}
                        </ul>
                      </div>
                    )}

                    <Button
                      onClick={handleProduce}
                      disabled={loading || recipes.length === 0}
                      size="lg"
                      className="w-full"
                    >
                      <HugeiconsIcon icon={Factory01Icon} size={16} />
                      {loading ? 'Producing...' : `Produce ${quantity} unit(s)`}
                    </Button>
                  </>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
