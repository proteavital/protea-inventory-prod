'use client';

import { useState } from 'react';
import {
  ArrowLeft01Icon,
  BarcodeScanIcon,
  CancelCircleIcon,
  CheckmarkCircle01Icon,
  KeyboardIcon,
  MinusSignIcon,
} from '@hugeicons/core-free-icons';
import { HugeiconsIcon } from '@hugeicons/react';
import Link from 'next/link';

import BarcodeScanner from '@/components/BarcodeScanner';
import { deductFromBatchesFIFO, findMaterialByBarcode, RawMaterial } from '@/lib/airtable-fifo';
import { AppSidebar } from '@/components/app-sidebar';
import { Button } from '@workspace/ui/components/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@workspace/ui/components/card';
import { Input } from '@workspace/ui/components/input';
import { Label } from '@workspace/ui/components/label';
import { Separator } from '@workspace/ui/components/separator';
import { SidebarInset, SidebarProvider, SidebarTrigger } from '@workspace/ui/components/sidebar';
import { cn } from '@workspace/ui/lib/utils';

export default function ExitMaterial() {
  const [scannedMaterial, setScannedMaterial] = useState<RawMaterial | null>(null);
  const [quantity, setQuantity] = useState('');
  const [notes, setNotes] = useState('');
  const [manualBarcode, setManualBarcode] = useState('');
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState<'success' | 'error'>('error');
  const [loading, setLoading] = useState(false);
  const [useScanner, setUseScanner] = useState(true);

  const handleScan = async (barcode: string) => {
    setLoading(true);
    setMessage('');
    setScannedMaterial(null);

    const material = await findMaterialByBarcode(barcode);

    if (material) {
      setScannedMaterial(material);
      setMessage(`Found: ${material.fields['Material Name']}`);
      setMessageType('success');
    } else {
      setMessage(`No material found with barcode "${barcode}"`);
      setMessageType('error');
    }

    setLoading(false);
  };

  const handleManualSubmit = () => {
    if (manualBarcode.trim()) handleScan(manualBarcode.trim());
  };

  const handleExit = async () => {
    if (!scannedMaterial) return;

    const qty = parseFloat(quantity);
    if (isNaN(qty) || qty <= 0) {
      setMessage('Please enter a valid quantity.');
      setMessageType('error');
      return;
    }

    const available = scannedMaterial.fields['Current Stock'] || 0;
    if (qty > available) {
      setMessage(`Only ${available} ${scannedMaterial.fields['Unit']} available in stock.`);
      setMessageType('error');
      return;
    }

    setLoading(true);

    const result = await deductFromBatchesFIFO(
      scannedMaterial.id,
      qty,
      'Warehouse User',
      notes || 'Manual exit',
      'Raw Material OUT'
    );

    if (result.success) {
      setMessage(
        `Removed ${qty} ${scannedMaterial.fields['Unit']} of ${scannedMaterial.fields['Material Name']} from stock.`
      );
      setMessageType('success');
      setScannedMaterial(null);
      setQuantity('');
      setNotes('');
      setManualBarcode('');
    } else {
      setMessage(result.error || 'Failed to exit material.');
      setMessageType('error');
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
            <h1 className="text-base font-medium">Iesiri materie prima</h1>
          </div>
        </header>

        <div className="flex flex-1 flex-col p-4 lg:p-6">
          <div className="mx-auto w-full max-w-2xl space-y-4">
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Exit Raw Material</CardTitle>
                    <CardDescription>Remove raw material from stock (waste, disposal, correction)</CardDescription>
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
                        : 'border-destructive/30 bg-destructive/10 text-destructive dark:border-destructive/40 dark:bg-destructive/20'
                    )}
                  >
                    <HugeiconsIcon
                      icon={messageType === 'success' ? CheckmarkCircle01Icon : CancelCircleIcon}
                      size={16}
                      className="mt-0.5 shrink-0"
                    />
                    <p>{message}</p>
                  </div>
                )}

                <div className="flex gap-2">
                  <Button
                    variant={useScanner ? 'default' : 'outline'}
                    onClick={() => setUseScanner(true)}
                    className="flex-1"
                  >
                    <HugeiconsIcon icon={BarcodeScanIcon} size={16} />
                    Scan Barcode
                  </Button>
                  <Button
                    variant={!useScanner ? 'default' : 'outline'}
                    onClick={() => setUseScanner(false)}
                    className="flex-1"
                  >
                    <HugeiconsIcon icon={KeyboardIcon} size={16} />
                    Manual Entry
                  </Button>
                </div>

                {useScanner ? (
                  <BarcodeScanner
                    onScan={handleScan}
                    onError={(error) => { setMessage(error); setMessageType('error'); }}
                  />
                ) : (
                  <div className="space-y-3">
                    <div className="space-y-1.5">
                      <Label htmlFor="barcode">Enter Barcode</Label>
                      <Input
                        id="barcode"
                        value={manualBarcode}
                        onChange={(e) => setManualBarcode(e.target.value)}
                        onKeyPress={(e) => e.key === 'Enter' && handleManualSubmit()}
                        placeholder="Type or scan barcode here"
                        autoFocus
                      />
                    </div>
                    <Button
                      onClick={handleManualSubmit}
                      disabled={!manualBarcode.trim() || loading}
                      className="w-full"
                    >
                      Search Material
                    </Button>
                  </div>
                )}

                {scannedMaterial && (
                  <>
                    <Separator />
                    <div className="space-y-4">
                      <div>
                        <h2 className="text-lg font-semibold">{scannedMaterial.fields['Material Name']}</h2>
                        <div className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
                          <span className="text-muted-foreground">Material ID</span>
                          <span className="font-medium">{scannedMaterial.fields['Material ID']}</span>
                          <span className="text-muted-foreground">Current Stock</span>
                          <span className="font-medium">
                            {scannedMaterial.fields['Current Stock'] || 0} {scannedMaterial.fields['Unit']}
                          </span>
                          <span className="text-muted-foreground">Avg Cost</span>
                          <span className="font-medium">
                            €{(scannedMaterial.fields['Unit Cost AVG'] || 0).toFixed(2)} /{' '}
                            {scannedMaterial.fields['Unit']}
                          </span>
                        </div>
                      </div>

                      <Separator />

                      <div className="space-y-1.5">
                        <Label htmlFor="quantity">
                          Quantity to Remove ({scannedMaterial.fields['Unit']})
                        </Label>
                        <Input
                          id="quantity"
                          type="number"
                          value={quantity}
                          onChange={(e) => setQuantity(e.target.value)}
                          min="0"
                          step="0.01"
                          placeholder="0"
                          autoFocus
                        />
                      </div>

                      <div className="space-y-1.5">
                        <Label htmlFor="notes">Reason / Notes</Label>
                        <Input
                          id="notes"
                          type="text"
                          value={notes}
                          onChange={(e) => setNotes(e.target.value)}
                          placeholder="e.g. Expired, Damaged, Correction..."
                        />
                      </div>

                      {quantity && parseFloat(quantity) > 0 && (
                        <div className="rounded-lg bg-muted px-4 py-3 text-sm">
                          <p className="mb-0.5 font-semibold">Exit Summary</p>
                          <p className="text-muted-foreground">
                            Removing{' '}
                            <span className="font-semibold text-foreground">
                              {quantity} {scannedMaterial.fields['Unit']}
                            </span>{' '}
                            — remaining stock:{' '}
                            <span className="font-semibold text-foreground">
                              {Math.max(
                                0,
                                (scannedMaterial.fields['Current Stock'] || 0) - parseFloat(quantity)
                              ).toFixed(2)}{' '}
                              {scannedMaterial.fields['Unit']}
                            </span>
                          </p>
                        </div>
                      )}

                      <Button
                        onClick={handleExit}
                        disabled={loading || !quantity}
                        variant="destructive"
                        size="lg"
                        className="w-full"
                      >
                        <HugeiconsIcon icon={MinusSignIcon} size={16} />
                        {loading ? 'Processing...' : 'Remove from Stock'}
                      </Button>
                    </div>
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
