
import { useEffect, useId, useRef } from "react";
import { Html5Qrcode } from "html5-qrcode";

type QRScannerProps = {
  onScan: (decodedText: string) => void;
  onClose: () => void;
};

// Keep scanner startup and cleanup in order, including React Strict Mode.
let scannerQueue: Promise<void> = Promise.resolve();

export default function QRScanner({
  onScan,
  onClose,
}: QRScannerProps) {
  const scannerId = useId().replace(/:/g, "");
  const elementId = `qr-reader-${scannerId}`;
  const onScanRef = useRef(onScan);
  const onCloseRef = useRef(onClose);

  useEffect(() => {
    onScanRef.current = onScan;
    onCloseRef.current = onClose;
  }, [onScan, onClose]);

  useEffect(() => {
    let active = true;
    let scanned = false;
    let scanner: Html5Qrcode | null = null;

    const startTask = scannerQueue.then(async () => {
      if (!active) return;

      const element = document.getElementById(elementId);
      if (!element) return;

      scanner = new Html5Qrcode(elementId);

      try {
        await scanner.start(
          { facingMode: "environment" },
          {
            fps: 10,
            qrbox: { width: 250, height: 250 },
            aspectRatio: 1,
          },
          (decodedText) => {
            if (!active || scanned) return;

            scanned = true;
            onScanRef.current(decodedText);
          },
          () => {
            // No QR code detected in this frame.
          }
        );
      } catch (error) {
        console.error("Could not start QR scanner:", error);

        if (active) {
          onCloseRef.current();
        }
      }
    });

    scannerQueue = startTask.catch((error) => {
      console.error("QR scanner startup failed:", error);
    });

    return () => {
      active = false;

      const cleanupTask = scannerQueue.then(async () => {
        if (!scanner) return;

        try {
          if (scanner.isScanning) {
            await scanner.stop();
          }
        } catch (error) {
          console.error("Could not stop QR scanner:", error);
        }

        try {
          scanner.clear();
        } catch (error) {
          console.error("Could not clear QR scanner:", error);
        }
      });

      scannerQueue = cleanupTask.catch((error) => {
        console.error("QR scanner cleanup failed:", error);
      });
    };
  }, [elementId]);

  return (
    <div className="qr-scanner-panel">
      <h2>Scan bicycle QR code</h2>
      <p>Allow camera access and point it at the bicycle's QR code.</p>

      <div
        id={elementId}
        style={{
          width: "100%",
          maxWidth: "400px",
          margin: "0 auto",
          overflow: "hidden",
        }}
      />

      <button type="button" onClick={onClose}>
        Close scanner
      </button>
    </div>
  );
}
