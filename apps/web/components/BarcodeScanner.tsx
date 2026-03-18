'use client';

import { useEffect, useRef, useState } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { Camera01Icon, StopIcon } from '@hugeicons/core-free-icons';
import { HugeiconsIcon } from '@hugeicons/react';
import { Button } from '@workspace/ui/components/button';
import { Label } from '@workspace/ui/components/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@workspace/ui/components/select';

interface BarcodeScannerProps {
  onScan: (barcode: string) => void;
  onError?: (error: string) => void;
}

export default function BarcodeScanner({ onScan, onError }: BarcodeScannerProps) {
  const [isScanning, setIsScanning] = useState(false);
  const [cameras, setCameras] = useState<any[]>([]);
  const [selectedCamera, setSelectedCamera] = useState<string>('');
  const scannerRef = useRef<Html5Qrcode | null>(null);

  useEffect(() => {
    Html5Qrcode.getCameras()
      .then((devices) => {
        if (devices && devices.length) {
          setCameras(devices);
          const backCamera = devices.find((d) => d.label.toLowerCase().includes('back'));
          setSelectedCamera(backCamera?.id || devices[0]!.id);
        }
      })
      .catch(() => {
        onError?.('Cannot access camera. Please grant camera permissions.');
      });

    return () => {
      stopScanning();
    };
  }, []);

  const startScanning = async () => {
    if (!selectedCamera) {
      onError?.('No camera selected');
      return;
    }

    try {
      const scanner = new Html5Qrcode('qr-reader');
      scannerRef.current = scanner;

      await scanner.start(
        selectedCamera,
        { fps: 10, qrbox: { width: 250, height: 250 } },
        (decodedText) => {
          onScan(decodedText);
          stopScanning();
        },
        () => {}
      );

      setIsScanning(true);
    } catch (err: any) {
      onError?.(`Scanner error: ${err.message || 'Unknown error'}`);
    }
  };

  const stopScanning = () => {
    if (scannerRef.current?.isScanning) {
      scannerRef.current
        .stop()
        .then(() => setIsScanning(false))
        .catch(() => {});
    }
  };

  return (
    <div className="space-y-3">
      {cameras.length > 1 && !isScanning && (
        <div className="space-y-1.5">
          <Label>Select Camera</Label>
          <Select value={selectedCamera} onValueChange={setSelectedCamera}>
            <SelectTrigger>
              <SelectValue placeholder="Choose camera..." />
            </SelectTrigger>
            <SelectContent>
              {cameras.map((camera) => (
                <SelectItem key={camera.id} value={camera.id}>
                  {camera.label || `Camera ${camera.id}`}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      <div id="qr-reader" className="overflow-hidden rounded-lg" />

      {!isScanning ? (
        <Button onClick={startScanning} disabled={!selectedCamera} className="w-full">
          <HugeiconsIcon icon={Camera01Icon} size={16} />
          Start Scanning
        </Button>
      ) : (
        <Button onClick={stopScanning} variant="destructive" className="w-full">
          <HugeiconsIcon icon={StopIcon} size={16} />
          Stop Scanning
        </Button>
      )}

      {isScanning && (
        <p className="text-center text-xs text-muted-foreground">
          Position the barcode in the center of the frame
        </p>
      )}
    </div>
  );
}
