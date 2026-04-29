import React, { useEffect, useRef, useState } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { MdClose } from 'react-icons/md';

interface BarcodeScannerProps {
  isOpen: boolean;
  onClose: () => void;
  onScan: (barcode: string) => void;
  title?: string;
}

const BarcodeScanner: React.FC<BarcodeScannerProps> = ({
  isOpen,
  onClose,
  onScan,
  title = 'Scan Barcode'
}) => {
  const [scanning, setScanning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const containerId = 'barcode-scanner-container';

  const stopScanner = async () => {
    if (scannerRef.current && scannerRef.current.isScanning) {
      try {
        await scannerRef.current.stop();
      } catch (e) {
        console.warn('Error stopping scanner:', e);
      }
    }
    scannerRef.current = null;
    setScanning(false);
  };

  const startScanner = async () => {
    if (!isOpen) return;
    
    setError(null);
    try {
      const html5QrCode = new Html5Qrcode(containerId);
      scannerRef.current = html5QrCode;

      await html5QrCode.start(
        { facingMode: 'environment' },
        {
          fps: 10,
          qrbox: { width: 350, height: 150 }, // Wider for barcodes
          aspectRatio: 1.777778
        },
        (decodedText) => {
          stopScanner();
          onScan(decodedText);
          onClose();
        },
        () => {} // Ignore scan failures (continuous scanning)
      );
      setScanning(true);
    } catch (err: any) {
      console.error('Barcode scanner error:', err);
      setError(err?.message || 'Failed to start camera. Please check permissions.');
    }
  };

  useEffect(() => {
    if (isOpen) {
      startScanner();
    }
    return () => {
      stopScanner();
    };
  }, [isOpen]);

  const handleClose = async () => {
    await stopScanner();
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center">
      <div className="absolute inset-0 bg-black/60" onClick={handleClose} />
      <div className="relative z-10 bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-md mx-4 overflow-hidden">
        <div className="flex justify-between items-center p-4 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-lg font-semibold text-gray-800 dark:text-white">{title}</h2>
          <button
            onClick={handleClose}
            className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
          >
            <MdClose size={24} className="text-gray-600 dark:text-gray-300" />
          </button>
        </div>
        
        <div className="p-4">
          <div
            id={containerId}
            className="w-full rounded-lg overflow-hidden bg-gray-100 dark:bg-gray-900"
            style={{ minHeight: 250 }}
          />
          {error && (
            <p className="mt-3 text-sm text-red-600 dark:text-red-400">{error}</p>
          )}
          <p className="mt-3 text-sm text-gray-600 dark:text-gray-400">
            Position the barcode within the frame. Works with USB scanners too — click the field and scan.
          </p>
        </div>
      </div>
    </div>
  );
};

export default BarcodeScanner;
