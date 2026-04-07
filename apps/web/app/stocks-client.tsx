'use client';

import { useState, useEffect, useMemo } from 'react';
import { ArrowReloadHorizontalIcon, Search01Icon } from '@hugeicons/core-free-icons';
import { HugeiconsIcon } from '@hugeicons/react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';

import { FinishedProduct, getAllFinishedProducts, getAllRawMaterials, RawMaterial } from '@/lib/airtable-fifo';
import { getFinishedProductTransactions } from '@/lib/airtable';
import { AppSidebar } from '@/components/app-sidebar';
import { Badge } from '@workspace/ui/components/badge';
import { Button } from '@workspace/ui/components/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@workspace/ui/components/card';
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

const CHART_COLORS = [
  '#3b82f6', '#10b981', '#f59e0b', '#ef4444',
  '#8b5cf6', '#06b6d4', '#f97316', '#ec4899',
];

export default function StocksClient() {
  const [rawMaterials, setRawMaterials] = useState<RawMaterial[]>([]);
  const [finishedProducts, setFinishedProducts] = useState<FinishedProduct[]>([]);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [view, setView] = useState<'materials' | 'products'>('materials');
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    setLoading(true);
    const [materials, products, txns] = await Promise.all([
      getAllRawMaterials(),
      getAllFinishedProducts(),
      getFinishedProductTransactions(),
    ]);
    setRawMaterials(materials);
    setFinishedProducts(products);
    setTransactions(txns);
    setLoading(false);
  };

  // Build line chart data: one entry per day of the current month (up to today)
  const { chartData, productNames } = useMemo(() => {
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth(); // 0-indexed
    const today = now.getDate();

    // Filter transactions to current month only
    const monthTxns = transactions.filter((t) => {
      const raw = t.fields['Date'];
      if (!raw) return false;
      const d = new Date(raw);
      return d.getFullYear() === year && d.getMonth() === month;
    });

    // Collect unique product names
    const namesSet = new Set<string>();
    monthTxns.forEach((t) => {
      const productId = t.fields['Finished Product']?.[0];
      const product = finishedProducts.find((p) => p.id === productId);
      const name = product?.fields['Product Name'];
      if (name) namesSet.add(name);
    });
    const productNames = Array.from(namesSet);

    // Build one entry per day (1 → today)
    const chartData = Array.from({ length: today }, (_, i) => {
      const day = i + 1;
      const entry: Record<string, string | number> = { day: String(day) };
      productNames.forEach((name) => { entry[name] = 0; });

      monthTxns.forEach((t) => {
        const d = new Date(t.fields['Date']);
        if (d.getDate() !== day) return;
        const productId = t.fields['Finished Product']?.[0];
        const product = finishedProducts.find((p) => p.id === productId);
        const name = product?.fields['Product Name'];
        if (!name) return;
        (entry[name] as number) += Math.abs(t.fields['Quantity Change'] || 0);
      });

      return entry;
    });

    return { chartData, productNames };
  }, [transactions, finishedProducts]);

  const filteredMaterials = rawMaterials.filter(
    (m) =>
      (m.fields['Material Name'] ?? '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      String(m.fields['Material ID'] ?? '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredProducts = finishedProducts.filter(
    (p) =>
      (p.fields['Product Name'] ?? '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      String(p.fields['Product ID'] ?? '').toLowerCase().includes(searchTerm.toLowerCase())
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
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base font-medium">Production this month</CardTitle>
                <CardDescription>
                  Units of each finished product produced per day —{' '}
                  {new Date().toLocaleString('default', { month: 'long', year: 'numeric' })}
                </CardDescription>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="flex h-52 items-center justify-center text-sm text-muted-foreground">
                    Loading...
                  </div>
                ) : productNames.length === 0 ? (
                  <div className="flex h-52 items-center justify-center text-sm text-muted-foreground">
                    No production recorded this month yet.
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height={220}>
                    <LineChart data={chartData} margin={{ top: 4, right: 16, left: -16, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                      <XAxis
                        dataKey="day"
                        tick={{ fontSize: 12 }}
                        tickLine={false}
                        axisLine={false}
                      />
                      <YAxis
                        allowDecimals={false}
                        tick={{ fontSize: 12 }}
                        tickLine={false}
                        axisLine={false}
                      />
                      <Tooltip
                        contentStyle={{
                          borderRadius: '8px',
                          fontSize: '13px',
                          border: '1px solid hsl(var(--border))',
                          background: 'hsl(var(--popover))',
                          color: 'hsl(var(--popover-foreground))',
                        }}
                        labelFormatter={(label) => `Day ${label}`}
                      />
                      <Legend wrapperStyle={{ fontSize: '13px', paddingTop: '12px' }} />
                      {productNames.map((name, i) => (
                        <Line
                          key={name}
                          type="monotone"
                          dataKey={name}
                          stroke={CHART_COLORS[i % CHART_COLORS.length]}
                          strokeWidth={2}
                          dot={false}
                          activeDot={{ r: 4 }}
                        />
                      ))}
                    </LineChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>

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
                          {
                          //<TableHead className="text-right">Unit Cost AVG</TableHead>
                          //<TableHead className="text-right">Value</TableHead>
    }
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
                              {
                              //<TableCell className="text-right">€{(material.fields['Unit Cost AVG'] || 0).toFixed(2)}</TableCell>
                              //<TableCell className="text-right font-medium">€{value.toFixed(2)}</TableCell>
                              }
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
                        {         
                          //<TableHead className="text-right">Unit Cost</TableHead>
                          //<TableHead className="text-right">Sell Price</TableHead>
                          //<TableHead className="text-right">Value</TableHead>
                        }
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
                              {
                              //<TableCell className="text-right">€{unitCost.toFixed(2)}</TableCell>
                              //<TableCell className="text-right">€{(product.fields['Selling Price'] || 0).toFixed(2)}</TableCell>
                              //<TableCell className="text-right font-medium">€{value.toFixed(2)}</TableCell>
                              }
                              
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
