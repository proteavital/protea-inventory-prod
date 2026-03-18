'use client';

import { useState, useEffect } from 'react';
import { ArrowReloadHorizontalIcon, Search01Icon } from '@hugeicons/core-free-icons';
import { HugeiconsIcon } from '@hugeicons/react';

import { FinishedProduct, getAllFinishedProducts, getAllRawMaterials, RawMaterial } from '@/lib/airtable-fifo';
import { AppSidebar } from '@/components/app-sidebar';
import { Badge } from '@workspace/ui/components/badge';
import { Button } from '@workspace/ui/components/button';
import { Card, CardContent } from '@workspace/ui/components/card';
import { Input } from '@workspace/ui/components/input';
import { Separator } from '@workspace/ui/components/separator';
import { SidebarInset, SidebarProvider, SidebarTrigger } from '@workspace/ui/components/sidebar';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@workspace/ui/components/table';
import { cn } from '@workspace/ui/lib/utils';

export default function StocksClient() {
  const [rawMaterials, setRawMaterials] = useState<RawMaterial[]>([]);
  const [finishedProducts, setFinishedProducts] = useState<FinishedProduct[]>([]);
  const [view, setView] = useState<'materials' | 'products'>('materials');
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    setLoading(true);
    const [materials, products] = await Promise.all([getAllRawMaterials(), getAllFinishedProducts()]);
    setRawMaterials(materials);
    setFinishedProducts(products);
    setLoading(false);
  };

  const filteredMaterials = rawMaterials.filter(
    (m) =>
      m.fields['Material Name'].toLowerCase().includes(searchTerm.toLowerCase()) ||
      String(m.fields['Material ID']).toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredProducts = finishedProducts.filter(
    (p) =>
      p.fields['Product Name'].toLowerCase().includes(searchTerm.toLowerCase()) ||
      String(p.fields['Product ID']).toLowerCase().includes(searchTerm.toLowerCase())
  );

  const totalMaterialsValue = rawMaterials.reduce(
    (sum, m) => sum + (m.fields['Current Stock'] || 0) * (m.fields['Unit Cost AVG'] || 0),
    0
  );

  const totalProductsValue = finishedProducts.reduce(
    (sum, p) => sum + (p.fields['Current Stock'] || 0) * (p.fields['Unit Cost'] || 0),
    0
  );

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
            <h1 className="text-base font-medium">Stocuri</h1>
          </div>
        </header>

        <div className="flex flex-1 flex-col p-4 lg:p-6">
          <div className="mx-auto w-full max-w-6xl space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <Card>
                <CardContent className="pt-6">
                  <p className="text-sm text-muted-foreground">Raw Materials Value</p>
                  <p className="mt-1 text-2xl font-bold text-blue-600 dark:text-blue-400">
                    €{totalMaterialsValue.toFixed(2)}
                  </p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6">
                  <p className="text-sm text-muted-foreground">Finished Products Value</p>
                  <p className="mt-1 text-2xl font-bold text-green-600 dark:text-green-400">
                    €{totalProductsValue.toFixed(2)}
                  </p>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardContent className="space-y-4 pt-6">
                <div className="flex gap-2">
                  <Button
                    variant={view === 'materials' ? 'default' : 'outline'}
                    onClick={() => setView('materials')}
                    className="flex-1"
                  >
                    Raw Materials ({rawMaterials.length})
                  </Button>
                  <Button
                    variant={view === 'products' ? 'default' : 'outline'}
                    onClick={() => setView('products')}
                    className="flex-1"
                  >
                    Finished Products ({finishedProducts.length})
                  </Button>
                </div>

                <div className="relative">
                  <HugeiconsIcon
                    icon={Search01Icon}
                    size={16}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                  />
                  <Input
                    placeholder="Search..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-9"
                  />
                </div>

                {loading ? (
                  <div className="py-12 text-center text-muted-foreground">Loading...</div>
                ) : view === 'materials' ? (
                  <>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Material</TableHead>
                          <TableHead>ID</TableHead>
                          <TableHead className="text-right">Stock</TableHead>
                          <TableHead className="text-right">Unit Cost AVG</TableHead>
                          <TableHead className="text-right">Value</TableHead>
                          <TableHead className="text-center">Status</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredMaterials.map((material) => {
                          const stock = material.fields['Current Stock'] || 0;
                          const value = stock * (material.fields['Unit Cost AVG'] || 0);
                          const isLowStock = material.fields['Low Stock Alert'] === '🔴 LOW';
                          return (
                            <TableRow key={material.id}>
                              <TableCell className="font-medium">{material.fields['Material Name']}</TableCell>
                              <TableCell className="text-sm text-muted-foreground">{material.fields['Material ID']}</TableCell>
                              <TableCell className="text-right">{stock.toFixed(2)} {material.fields['Unit']}</TableCell>
                              <TableCell className="text-right">€{(material.fields['Unit Cost AVG'] || 0).toFixed(2)}</TableCell>
                              <TableCell className="text-right font-medium">€{value.toFixed(2)}</TableCell>
                              <TableCell className="text-center">
                                <Badge
                                  variant={isLowStock ? 'destructive' : 'secondary'}
                                  className={cn(
                                    !isLowStock && 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300'
                                  )}
                                >
                                  {isLowStock ? 'LOW' : 'OK'}
                                </Badge>
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                    {filteredMaterials.length === 0 && (
                      <p className="py-8 text-center text-muted-foreground">
                        No materials found matching &quot;{searchTerm}&quot;
                      </p>
                    )}
                  </>
                ) : (
                  <>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Product</TableHead>
                          <TableHead>ID</TableHead>
                          <TableHead className="text-right">Stock</TableHead>
                          <TableHead className="text-right">Unit Cost</TableHead>
                          <TableHead className="text-right">Sell Price</TableHead>
                          <TableHead className="text-right">Value</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredProducts.map((product) => {
                          const stock = product.fields['Current Stock'] || 0;
                          const unitCost = product.fields['Unit Cost'] || 0;
                          const value = stock * unitCost;
                          return (
                            <TableRow key={product.id}>
                              <TableCell className="font-medium">{product.fields['Product Name']}</TableCell>
                              <TableCell className="text-sm text-muted-foreground">{product.fields['Product ID']}</TableCell>
                              <TableCell className="text-right">{stock}</TableCell>
                              <TableCell className="text-right">€{unitCost.toFixed(2)}</TableCell>
                              <TableCell className="text-right">€{(product.fields['Selling Price'] || 0).toFixed(2)}</TableCell>
                              <TableCell className="text-right font-medium">€{value.toFixed(2)}</TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                    {filteredProducts.length === 0 && (
                      <p className="py-8 text-center text-muted-foreground">
                        No products found matching &quot;{searchTerm}&quot;
                      </p>
                    )}
                  </>
                )}

                <Button variant="outline" className="w-full" onClick={loadData}>
                  <HugeiconsIcon icon={ArrowReloadHorizontalIcon} size={16} />
                  Refresh
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
