'use client';

import { useState } from 'react';
import {
  ArrowLeft01Icon,
  BarcodeScanIcon,
  CancelCircleIcon,
  CheckmarkCircle01Icon,
  KeyboardIcon,
} from '@hugeicons/core-free-icons';
import { HugeiconsIcon } from '@hugeicons/react';
import Link from 'next/link';

import BarcodeScanner from '@/components/BarcodeScanner';
import { createMaterialBatch, findMaterialByBarcode, RawMaterial } from '@/lib/airtable-fifo';
import { AppSidebar } from '@/components/app-sidebar';
import { Button } from '@workspace/ui/components/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@workspace/ui/components/card';
import { Input } from '@workspace/ui/components/input';
import { Label } from '@workspace/ui/components/label';
import { Separator } from '@workspace/ui/components/separator';
import { SidebarInset, SidebarProvider, SidebarTrigger } from '@workspace/ui/components/sidebar';
import { cn } from '@workspace/ui/lib/utils';

export default function ScanMaterialFIFO() {
  const [scannedMaterial, setScannedMaterial] = useState<RawMaterial | null>(null);
  const [quantity, setQuantity] = useState<string>('');
  const [unitCost, setUnitCost] = useState<string>('');
  const [supplier, setSupplier] = useState<string>('');
  const [lotNumber, setLotNumber] = useState<string>('');
  const [expiryDate, setExpiryDate] = useState<string>('');
  const [manualBarcode, setManualBarcode] = useState('');
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState<'success' | 'error'>('success');
  const [loading, setLoading] = useState(false);
  const [useScanner, setUseScanner] = useState(true);

  const handleScan = async (barcode: string) => {
    setLoading(true);
    setMessage('');

    const material = await findMaterialByBarcode(barcode);

    if (material) {
      setScannedMaterial(material);
      if (material.fields['Unit Cost AVG']) {
        setUnitCost(material.fields['Unit Cost AVG'].toString());
      }
      if (material.fields['Supplier']) {
        setSupplier(material.fields['Supplier']);
      }
      setMessage(`Found: ${material.fields['Material Name']}`);
      setMessageType('success');
    } else {
      setMessage(`Material with barcode "${barcode}" not found`);
      setMessageType('error');
    }

    setLoading(false);
  };

  const handleManualSubmit = () => {
    if (manualBarcode.trim()) {
      handleScan(manualBarcode.trim());
    }
  };

  const handleCreateBatch = async () => {
    if (!scannedMaterial) return;

    const qty = parseFloat(quantity);
    const cost = parseFloat(unitCost);

    if (isNaN(qty) || qty <= 0) {
      setMessage('Please enter a valid quantity');
      setMessageType('error');
      return;
    }

    if (isNaN(cost) || cost <= 0) {
      setMessage('Please enter a valid unit cost');
      setMessageType('error');
      return;
    }

    setLoading(true);

    const result = await createMaterialBatch(
      scannedMaterial.id,
      qty,
      cost,
      supplier || undefined,
      lotNumber || undefined,
      expiryDate || undefined
    );

    if (result.success) {
      setMessage(
        `Batch created: ${qty} ${scannedMaterial.fields['Unit']} of ${scannedMaterial.fields['Material Name']} @ €${cost}/unit — Total: €${(qty * cost).toFixed(2)}${result.batchId ? ` (Batch ${result.batchId})` : ''}`
      );
      setMessageType('success');
      setScannedMaterial(null);
      setQuantity('');
      setUnitCost('');
      setSupplier('');
      setLotNumber('');
      setExpiryDate('');
      setManualBarcode('');
    } else {
      setMessage(result.error || 'Failed to create batch');
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
        {/* Header */}
        <header className="flex h-(--header-height) shrink-0 items-center gap-2 border-b transition-[width,height] ease-linear">
          <div className="flex w-full items-center gap-1 px-4 lg:gap-2 lg:px-6">
            <SidebarTrigger className="-ml-1" />
            <Separator orientation="vertical" className="mx-2 data-[orientation=vertical]:h-4" />
            <h1 className="text-base font-medium">Intrari materie prima</h1>
          </div>
        </header>

        {/* Page content */}
        <div className="flex flex-1 flex-col p-4 lg:p-6">
          <div className="mx-auto w-full max-w-2xl space-y-4">
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Receive Raw Material</CardTitle>
                    <CardDescription>FIFO Batch Tracking</CardDescription>
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
                {/* Status message */}
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
                    <p className="whitespace-pre-line">{message}</p>
                  </div>
                )}

                {/* Scanner / Manual toggle */}
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
                    onError={(error) => {
                      setMessage(error);
                      setMessageType('error');
                    }}
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

                {/* Material details + batch form */}
                {scannedMaterial && (
                  <>
                    <Separator />
                    <div className="space-y-4">
                      <div>
                        <h2 className="text-lg font-semibold">
                          {scannedMaterial.fields['Material Name']}
                        </h2>
                        <div className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
                          <span className="text-muted-foreground">Material ID</span>
                          <span className="font-medium">{scannedMaterial.fields['Material ID']}</span>

                          <span className="text-muted-foreground">Current Stock</span>
                          <span className="font-medium">
                            {scannedMaterial.fields['Current Stock'] || 0}{' '}
                            {scannedMaterial.fields['Unit']}
                          </span>

                          <span className="text-muted-foreground">Avg Cost</span>
                          <span className="font-medium">
                            €{(scannedMaterial.fields['Unit Cost AVG'] || 0).toFixed(2)}/
                            {scannedMaterial.fields['Unit']}
                          </span>
                        </div>
                      </div>

                      <Separator />
                      <p className="text-sm font-semibold">New Batch Details</p>

                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1.5">
                          <Label htmlFor="qty">Quantity *</Label>
                          <Input
                            id="qty"
                            type="number"
                            value={quantity}
                            onChange={(e) => setQuantity(e.target.value)}
                            min="0"
                            step="0.01"
                            placeholder="100"
                          />
                        </div>
                        <div className="space-y-1.5">
                          <Label htmlFor="cost">Unit Cost (€) *</Label>
                          <Input
                            id="cost"
                            type="number"
                            value={unitCost}
                            onChange={(e) => setUnitCost(e.target.value)}
                            min="0"
                            step="0.01"
                            placeholder="15.50"
                          />
                        </div>
                      </div>

                      <div className="space-y-1.5">
                        <Label htmlFor="supplier">Supplier</Label>
                        <Input
                          id="supplier"
                          value={supplier}
                          onChange={(e) => setSupplier(e.target.value)}
                          placeholder="Metal Supplies Co"
                        />
                      </div>

                      <div className="space-y-1.5">
                        <Label htmlFor="lot">Lot/Batch Number</Label>
                        <Input
                          id="lot"
                          value={lotNumber}
                          onChange={(e) => setLotNumber(e.target.value)}
                          placeholder="LOT-2024-001"
                        />
                      </div>

                      <div className="space-y-1.5">
                        <Label htmlFor="expiry">Expiry Date (Optional)</Label>
                        <Input
                          id="expiry"
                          type="date"
                          value={expiryDate}
                          onChange={(e) => setExpiryDate(e.target.value)}
                        />
                      </div>

                      {quantity && unitCost && (
                        <div className="rounded-lg bg-muted px-4 py-3 text-sm">
                          <p className="mb-0.5 font-semibold">Batch Summary</p>
                          <p className="text-muted-foreground">
                            {quantity} {scannedMaterial.fields['Unit']} × €{unitCost} ={' '}
                            <span className="font-semibold text-foreground">
                              €{(parseFloat(quantity) * parseFloat(unitCost)).toFixed(2)}
                            </span>
                          </p>
                        </div>
                      )}

                      <Button
                        onClick={handleCreateBatch}
                        disabled={loading || !quantity || !unitCost}
                        size="lg"
                        className="w-full"
                      >
                        {loading ? 'Creating Batch...' : 'Receive Material (Create Batch)'}
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
