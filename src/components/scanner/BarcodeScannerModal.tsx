"use client";

import React, { useEffect, useRef, useState } from "react";
import { BrowserMultiFormatReader, BarcodeFormat, DecodeHintType } from "@zxing/library";
import { Camera, X, Check, Volume2, Flashlight, RefreshCw, Keyboard, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";

interface BarcodeScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onScan: (barcode: string) => void;
  title?: string;
}

export const BarcodeScannerModal: React.FC<BarcodeScannerModalProps> = ({
  isOpen,
  onClose,
  onScan,
  title = "Escaneo de Código de Barras",
}) => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const codeReaderRef = useRef<BrowserMultiFormatReader | null>(null);
  
  const [manualCode, setManualCode] = useState("");
  const [lastScanned, setLastScanned] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [videoDevices, setVideoDevices] = useState<MediaDeviceInfo[]>([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState<string>("");
  const lastScanTimeRef = useRef<number>(0);

  // Play audio beep synthesized via Web Audio API
  const playBeep = () => {
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(880, audioCtx.currentTime); // 880Hz A5 note
      gain.gain.setValueAtTime(0.1, audioCtx.currentTime);
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.start();
      osc.stop(audioCtx.currentTime + 0.15);
    } catch (e) {
      // Audio fallback
    }
  };

  const handleDetectedCode = (code: string) => {
    const now = Date.now();
    // Prevenir lecturas múltiples accidentales en menos de 1200ms
    if (now - lastScanTimeRef.current < 1200) {
      return;
    }

    lastScanTimeRef.current = now;
    setLastScanned(code);
    playBeep();
    onScan(code);
  };

  useEffect(() => {
    if (!isOpen) {
      stopScanning();
      return;
    }

    const hints = new Map();
    const formats = [
      BarcodeFormat.EAN_13,
      BarcodeFormat.EAN_8,
      BarcodeFormat.UPC_A,
      BarcodeFormat.UPC_E,
      BarcodeFormat.CODE_128,
      BarcodeFormat.CODE_39,
      BarcodeFormat.QR_CODE,
    ];
    hints.set(DecodeHintType.POSSIBLE_FORMATS, formats);

    const codeReader = new BrowserMultiFormatReader(hints);
    codeReaderRef.current = codeReader;

    codeReader
      .listVideoInputDevices()
      .then((devices) => {
        setVideoDevices(devices);
        if (devices.length > 0) {
          // Seleccionar cámara trasera si existe, de lo contrario la primera
          const backCam = devices.find((d) =>
            d.label.toLowerCase().includes("back") || d.label.toLowerCase().includes("trasera")
          );
          const deviceId = backCam ? backCam.deviceId : devices[0].deviceId;
          setSelectedDeviceId(deviceId);
          startScanning(codeReader, deviceId);
        } else {
          setErrorMsg("No se detectó ninguna cámara disponible en este dispositivo.");
        }
      })
      .catch((err) => {
        console.error("Error al acceder a la cámara:", err);
        setErrorMsg("Permiso de cámara denegado o no soportado en este navegador.");
      });

    return () => {
      stopScanning();
    };
  }, [isOpen]);

  const startScanning = (codeReader: BrowserMultiFormatReader, deviceId: string) => {
    if (!videoRef.current) return;
    setErrorMsg(null);
    setIsScanning(true);

    codeReader.decodeFromVideoDevice(deviceId, videoRef.current, (result, err) => {
      if (result) {
        handleDetectedCode(result.getText());
      }
    }).catch((err) => {
      console.error("Error starting camera stream:", err);
      setErrorMsg("Error al iniciar la transmisión de la cámara.");
      setIsScanning(false);
    });
  };

  const stopScanning = () => {
    if (codeReaderRef.current) {
      codeReaderRef.current.reset();
      codeReaderRef.current = null;
    }
    setIsScanning(false);
  };

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualCode.trim()) return;
    handleDetectedCode(manualCode.trim());
    setManualCode("");
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md bg-white border-[#E2E2E2] p-0 overflow-hidden text-[#222222]">
        <DialogHeader className="p-4 bg-[#F7F7F7] border-b border-[#E2E2E2]">
          <DialogTitle className="flex items-center gap-2 text-base text-[#222222] font-bold">
            <Camera className="h-5 w-5 text-[#ED1C24]" />
            {title}
          </DialogTitle>
          <DialogDescription className="text-xs text-[#666666]">
            Apunta la cámara al código EAN-13, UPC o Code-128 del producto
          </DialogDescription>
        </DialogHeader>

        <div className="p-4 space-y-4">
          {/* Camera Stream Area */}
          <div className="relative aspect-video w-full overflow-hidden rounded-xl bg-black border border-[#E2E2E2] flex items-center justify-center">
            <video
              ref={videoRef}
              className="w-full h-full object-cover"
              playsInline
            />

            {/* Target Reticle Overlay */}
            {isScanning && (
              <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                <div className="w-3/4 h-1/2 border-2 border-dashed border-[#FFD500] rounded-lg animate-pulse flex items-center justify-center bg-yellow-500/5">
                  <div className="w-full h-0.5 bg-[#ED1C24] shadow-md shadow-red-500/50 animate-bounce" />
                </div>
              </div>
            )}

            {/* Error Overlay */}
            {errorMsg && (
              <div className="absolute inset-0 bg-white/95 p-4 flex flex-col items-center justify-center text-center space-y-2">
                <AlertCircle className="h-8 w-8 text-amber-500" />
                <p className="text-sm font-bold text-[#222222]">{errorMsg}</p>
                <p className="text-xs text-[#666666]">Puedes ingresar el código manualmente abajo.</p>
              </div>
            )}
          </div>

          {/* Feedback popup on detection */}
          {lastScanned && (
            <div className="flex items-center gap-2 p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-mono font-bold animate-in fade-in zoom-in">
              <Check className="h-4 w-4 text-emerald-600 shrink-0" />
              <span>Código detectado: {lastScanned}</span>
            </div>
          )}

          {/* Manual Input Fallback */}
          <form onSubmit={handleManualSubmit} className="space-y-2 pt-2 border-t border-[#E2E2E2]">
            <label className="text-xs font-bold text-[#222222] flex items-center gap-1.5">
              <Keyboard className="h-3.5 w-3.5 text-[#ED1C24]" />
              Ingreso Manual de Código
            </label>
            <div className="flex gap-2">
              <Input
                placeholder="Ej. 7501055300010"
                value={manualCode}
                onChange={(e) => setManualCode(e.target.value)}
                className="font-mono text-xs bg-white border-[#E2E2E2]"
              />
              <Button type="submit" size="sm" className="bg-[#ED1C24] hover:bg-[#C9151C] text-white font-bold shrink-0">
                Agregar
              </Button>
            </div>
          </form>
        </div>
      </DialogContent>
    </Dialog>
  );
};
