'use client';

import { useState, useEffect } from 'react';
import { ArrowLeft01Icon, ArrowReloadHorizontalIcon } from '@hugeicons/core-free-icons';
import { HugeiconsIcon } from '@hugeicons/react';
import Link from 'next/link';

import { getRecentTransactions } from '@/lib/airtable-fifo';
import { airtableStr } from '@/lib/utils';
import { AppSidebar } from '@/components/app-sidebar';
import { Badge } from '@workspace/ui/components/badge';
import { Button } from '@workspace/ui/components/button';
import { Card, CardContent, CardHeader, CardTitle } from '@workspace/ui/components/card';
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

const TYPE_STYLES: Record<string, string> = {
  'Raw Material IN': 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300',
  'Finished Product IN': 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300',
  'Raw Material OUT': 'bg-destructive/10 text-destructive dark:bg-destructive/20',
  'Finished Product OUT': 'bg-destructive/10 text-destructive dark:bg-destructive/20',
  'Production': 'bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-300',
  'Adjustment': 'bg-secondary text-secondary-foreground',
};

export default function History() {
  const [transactions, setTransactions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { load(); }, []);

  const load = async () => {
    setLoading(true);
    const data = await getRecentTransactions(100);
    setTransactions(data);
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
            <h1 className="text-base font-medium">Istoric tranzactii</h1>
          </div>
        </header>

        <div className="flex flex-1 flex-col p-4 lg:p-6">
          <div className="mx-auto w-full max-w-6xl space-y-4">
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle>Transaction History</CardTitle>
                  <Button variant="ghost" size="sm" asChild>
                    <Link href="/">
                      <HugeiconsIcon icon={ArrowLeft01Icon} size={16} />
                      Back
                    </Link>
                  </Button>
                </div>
              </CardHeader>
            </Card>

            <Card>
              <CardContent className="pt-6">
                {loading ? (
                  <div className="py-12 text-center text-muted-foreground">Loading...</div>
                ) : (
                  <>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Date</TableHead>
                          <TableHead>Type</TableHead>
                          <TableHead>Qty Change</TableHead>
                          <TableHead>User</TableHead>
                          <TableHead>Notes</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {transactions.map((t, i) => {
                          const qty = t.fields['Quantity Change'] ?? 0;
                          const type = airtableStr(t.fields['Type']);
                          const date = airtableStr(t.fields['Date']);
                          return (
                            <TableRow key={t.id ?? i}>
                              <TableCell className="whitespace-nowrap text-sm text-muted-foreground">
                                {date !== '—' ? new Date(date).toLocaleString() : '—'}
                              </TableCell>
                              <TableCell>
                                <Badge
                                  variant="outline"
                                  className={cn(TYPE_STYLES[type] ?? 'bg-secondary text-secondary-foreground')}
                                >
                                  {type}
                                </Badge>
                              </TableCell>
                              <TableCell
                                className={cn(
                                  'font-medium',
                                  qty >= 0 ? 'text-green-600 dark:text-green-400' : 'text-destructive'
                                )}
                              >
                                {qty >= 0 ? '+' : ''}{qty}
                              </TableCell>
                              <TableCell className="text-sm">{airtableStr(t.fields['User'])}</TableCell>
                              <TableCell className="text-sm text-muted-foreground">{airtableStr(t.fields['Notes'])}</TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                    {transactions.length === 0 && (
                      <p className="py-8 text-center text-muted-foreground">No transactions found</p>
                    )}
                    <Button variant="outline" className="mt-4 w-full" onClick={load}>
                      <HugeiconsIcon icon={ArrowReloadHorizontalIcon} size={16} />
                      Refresh
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
