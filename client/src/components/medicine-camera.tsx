import { useState, useRef, useCallback, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Camera, Loader2, AlertTriangle, SwitchCamera, Check, Pencil, Trash2, X, Plus } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

export interface MedicineIdentifyResult {
  name?: string;
  genericName?: string;
  category?: string;
  form?: string;
  strength?: string;
  manufacturer?: string;
  brand?: string;
  batchNumber?: string;
  expiryDate?: string;
  mrp?: string;
  description?: string;
  hsnCode?: string;
  requiresPrescription?: boolean;
}

interface MedicineCameraProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onIdentified: (result: MedicineIdentifyResult) => void;
  mode?: "single" | "multi";
}

export function MedicineCamera({ open, onOpenChange, onIdentified, mode = "multi" }: MedicineCameraProps) {
  const { toast } = useToast();
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const scanIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const lastIdentifiedRef = useRef<string>("");
  const cooldownRef = useRef(false);

  const [cameraActive, setCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [cameraLoading, setCameraLoading] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [facingMode, setFacingMode] = useState<"environment" | "user">("environment");
  const [scannedMedicines, setScannedMedicines] = useState<MedicineIdentifyResult[]>([]);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editForm, setEditForm] = useState<MedicineIdentifyResult>({});
  const [scanPaused, setScanPaused] = useState(false);

  const stopCamera = useCallback(() => {
    if (scanIntervalRef.current) {
      clearInterval(scanIntervalRef.current);
      scanIntervalRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setCameraActive(false);
    setScanning(false);
  }, []);

  const startCamera = useCallback(async (facing: "environment" | "user" = facingMode) => {
    setCameraError(null);
    setCameraLoading(true);

    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setCameraError("Camera is not supported in this browser or context. Please use HTTPS or try a different browser.");
      setCameraLoading(false);
      return;
    }

    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: facing,
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
      });

      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }

      setCameraActive(true);
    } catch (err: any) {
      const msg = err?.message || String(err);
      if (msg.includes("Permission") || msg.includes("NotAllowed")) {
        setCameraError("Camera permission denied. Please allow camera access in your browser settings.");
      } else if (msg.includes("NotFound") || msg.includes("DevicesNotFound")) {
        setCameraError("No camera found on this device.");
      } else if (msg.includes("NotReadable")) {
        setCameraError("Camera is in use by another app. Please close it and try again.");
      } else {
        setCameraError("Could not start camera. Please try again.");
      }
    } finally {
      setCameraLoading(false);
    }
  }, [facingMode]);

  const flipCamera = useCallback(() => {
    const newFacing = facingMode === "environment" ? "user" : "environment";
    setFacingMode(newFacing);
    if (cameraActive) {
      stopCamera();
      setTimeout(() => startCamera(newFacing), 200);
    }
  }, [facingMode, cameraActive, stopCamera, startCamera]);

  const captureFrame = useCallback((): string | null => {
    if (!videoRef.current || !canvasRef.current) return null;
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (video.videoWidth === 0 || video.videoHeight === 0) return null;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;
    ctx.drawImage(video, 0, 0);
    return canvas.toDataURL("image/jpeg", 0.7);
  }, []);

  const identifyFrame = useCallback(async () => {
    if (cooldownRef.current || scanPaused) return;
    const imageData = captureFrame();
    if (!imageData) return;

    cooldownRef.current = true;
    setScanning(true);

    try {
      const res = await apiRequest("POST", "/api/medlab/ai/identify-medicine-image", {
        image: imageData,
      });
      const data: MedicineIdentifyResult = await res.json();

      if (data.name || data.genericName) {
        const norm = (s?: string) => (s || "").toLowerCase().trim();
        const identifier = `${norm(data.name)}-${norm(data.genericName)}-${norm(data.strength)}-${norm(data.brand)}`;

        if (identifier !== lastIdentifiedRef.current) {
          lastIdentifiedRef.current = identifier;

          if (mode === "single") {
            onIdentified(data);
            onOpenChange(false);
            toast({ title: "Medicine Identified", description: `Detected: ${data.name || data.genericName}` });
          } else {
            setScannedMedicines((prev) => {
              const exists = prev.some(
                (m) =>
                  norm(m.name) === norm(data.name) &&
                  norm(m.strength) === norm(data.strength) &&
                  norm(m.brand) === norm(data.brand)
              );
              if (exists) return prev;
              return [...prev, data];
            });
            toast({ title: "Medicine Added", description: `${data.name || data.genericName}` });
          }
        }
      }
    } catch {
      toast({ title: "Scan failed", description: "Could not process frame. Retrying...", variant: "destructive" });
    } finally {
      setScanning(false);
      cooldownRef.current = false;
    }
  }, [captureFrame, mode, onIdentified, onOpenChange, toast, scanPaused]);

  useEffect(() => {
    if (open) {
      const timer = setTimeout(() => startCamera(), 300);
      return () => {
        clearTimeout(timer);
        stopCamera();
      };
    } else {
      stopCamera();
      setScannedMedicines([]);
      setEditingIndex(null);
      setEditForm({});
      setCameraError(null);
      lastIdentifiedRef.current = "";
      cooldownRef.current = false;
      setScanPaused(false);
    }
  }, [open, startCamera, stopCamera]);

  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, [stopCamera]);

  useEffect(() => {
    if (cameraActive && !scanPaused) {
      scanIntervalRef.current = setInterval(() => {
        identifyFrame();
      }, 4000);

      return () => {
        if (scanIntervalRef.current) {
          clearInterval(scanIntervalRef.current);
          scanIntervalRef.current = null;
        }
      };
    } else {
      if (scanIntervalRef.current) {
        clearInterval(scanIntervalRef.current);
        scanIntervalRef.current = null;
      }
    }
  }, [cameraActive, identifyFrame, scanPaused]);

  const startEditMedicine = (index: number) => {
    setEditingIndex(index);
    setEditForm({ ...scannedMedicines[index] });
    setScanPaused(true);
  };

  const saveEditMedicine = () => {
    if (editingIndex === null) return;
    setScannedMedicines((prev) => {
      const updated = [...prev];
      updated[editingIndex] = { ...editForm };
      return updated;
    });
    setEditingIndex(null);
    setEditForm({});
    setScanPaused(false);
  };

  const cancelEdit = () => {
    setEditingIndex(null);
    setEditForm({});
    setScanPaused(false);
  };

  const removeMedicine = (index: number) => {
    setScannedMedicines((prev) => prev.filter((_, i) => i !== index));
    if (editingIndex === index) {
      cancelEdit();
    }
  };

  const handleDone = () => {
    scannedMedicines.forEach((med) => onIdentified(med));
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] flex flex-col" aria-describedby={undefined}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Camera className="h-5 w-5" />
            Scan Medicines
            {scannedMedicines.length > 0 && (
              <Badge variant="secondary">{scannedMedicines.length}</Badge>
            )}
          </DialogTitle>
        </DialogHeader>

        <div className="flex flex-col gap-3 flex-1 min-h-0">
          <div className="relative w-full aspect-[4/3] bg-muted rounded-md overflow-hidden flex-shrink-0">
            {!cameraError && (
              <video
                ref={videoRef}
                className="w-full h-full object-cover"
                autoPlay
                playsInline
                muted
                data-testid="medicine-camera-video"
              />
            )}
            {cameraLoading && (
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-muted">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                <p className="text-sm text-muted-foreground mt-2">Starting camera...</p>
              </div>
            )}
            {cameraError && (
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-muted gap-2 p-4 text-center">
                <AlertTriangle className="h-8 w-8 text-amber-500" />
                <p className="text-sm text-muted-foreground">{cameraError}</p>
                <Button variant="outline" size="sm" onClick={() => startCamera()} data-testid="button-retry-camera">
                  Try Again
                </Button>
              </div>
            )}

            {scanning && (
              <div className="absolute top-2 left-2 flex items-center gap-1.5 bg-background/80 backdrop-blur-sm rounded-md px-2 py-1">
                <Loader2 className="h-3.5 w-3.5 animate-spin text-primary" />
                <span className="text-xs font-medium">Detecting...</span>
              </div>
            )}

            {cameraActive && !cameraError && (
              <>
                <div className="absolute inset-x-0 bottom-0 p-2 flex items-center justify-between">
                  <div className="flex items-center gap-1.5 bg-background/80 backdrop-blur-sm rounded-md px-2 py-1">
                    <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
                    <span className="text-xs font-medium">Auto-scanning</span>
                  </div>
                  <Button
                    size="icon"
                    variant="secondary"
                    className="h-8 w-8 rounded-full bg-background/80 backdrop-blur-sm"
                    onClick={flipCamera}
                    data-testid="button-flip-camera"
                  >
                    <SwitchCamera className="h-4 w-4" />
                  </Button>
                </div>

                <div className="absolute inset-0 pointer-events-none border-2 border-primary/30 rounded-md" />
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-3/4 h-1/2 border border-dashed border-primary/50 rounded-sm pointer-events-none" />
              </>
            )}
          </div>

          <canvas ref={canvasRef} className="hidden" />

          <p className="text-xs text-muted-foreground text-center flex-shrink-0">
            Point your camera at a medicine strip, box, or label. It will be detected automatically.
          </p>

          {mode === "multi" && scannedMedicines.length > 0 && (
            <div className="flex-1 min-h-0 flex flex-col gap-2">
              <div className="flex items-center justify-between flex-shrink-0">
                <span className="text-sm font-medium">Scanned Medicines</span>
                <span className="text-xs text-muted-foreground">{scannedMedicines.length} item{scannedMedicines.length !== 1 ? "s" : ""}</span>
              </div>
              <ScrollArea className="flex-1 max-h-[200px]">
                <div className="space-y-2 pr-2">
                  {scannedMedicines.map((med, index) => (
                    <div key={index} className="rounded-md border p-2" data-testid={`scanned-medicine-${index}`}>
                      {editingIndex === index ? (
                        <div className="space-y-2">
                          <div className="grid grid-cols-2 gap-2">
                            <Input
                              placeholder="Name"
                              value={editForm.name || ""}
                              onChange={(e) => setEditForm((prev) => ({ ...prev, name: e.target.value }))}
                              className="h-8 text-sm"
                              data-testid={`input-edit-name-${index}`}
                            />
                            <Input
                              placeholder="Generic Name"
                              value={editForm.genericName || ""}
                              onChange={(e) => setEditForm((prev) => ({ ...prev, genericName: e.target.value }))}
                              className="h-8 text-sm"
                              data-testid={`input-edit-generic-${index}`}
                            />
                            <Input
                              placeholder="Strength"
                              value={editForm.strength || ""}
                              onChange={(e) => setEditForm((prev) => ({ ...prev, strength: e.target.value }))}
                              className="h-8 text-sm"
                              data-testid={`input-edit-strength-${index}`}
                            />
                            <Input
                              placeholder="Form"
                              value={editForm.form || ""}
                              onChange={(e) => setEditForm((prev) => ({ ...prev, form: e.target.value }))}
                              className="h-8 text-sm"
                              data-testid={`input-edit-form-${index}`}
                            />
                            <Input
                              placeholder="Brand"
                              value={editForm.brand || ""}
                              onChange={(e) => setEditForm((prev) => ({ ...prev, brand: e.target.value }))}
                              className="h-8 text-sm"
                              data-testid={`input-edit-brand-${index}`}
                            />
                            <Input
                              placeholder="MRP"
                              value={editForm.mrp || ""}
                              onChange={(e) => setEditForm((prev) => ({ ...prev, mrp: e.target.value }))}
                              className="h-8 text-sm"
                              data-testid={`input-edit-mrp-${index}`}
                            />
                            <Input
                              placeholder="Batch No."
                              value={editForm.batchNumber || ""}
                              onChange={(e) => setEditForm((prev) => ({ ...prev, batchNumber: e.target.value }))}
                              className="h-8 text-sm"
                              data-testid={`input-edit-batch-${index}`}
                            />
                            <Input
                              placeholder="Expiry Date"
                              value={editForm.expiryDate || ""}
                              onChange={(e) => setEditForm((prev) => ({ ...prev, expiryDate: e.target.value }))}
                              className="h-8 text-sm"
                              data-testid={`input-edit-expiry-${index}`}
                            />
                          </div>
                          <div className="flex gap-1 justify-end">
                            <Button size="sm" variant="ghost" onClick={cancelEdit} data-testid={`button-cancel-edit-${index}`}>
                              <X className="h-3.5 w-3.5 mr-1" />
                              Cancel
                            </Button>
                            <Button size="sm" onClick={saveEditMedicine} data-testid={`button-save-edit-${index}`}>
                              <Check className="h-3.5 w-3.5 mr-1" />
                              Save
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">{med.name || "Unknown"}</p>
                            <div className="flex flex-wrap items-center gap-1 mt-0.5">
                              {med.genericName && <span className="text-xs text-muted-foreground">{med.genericName}</span>}
                              {med.strength && <Badge variant="outline" className="text-[10px] px-1 py-0">{med.strength}</Badge>}
                              {med.form && <Badge variant="outline" className="text-[10px] px-1 py-0">{med.form}</Badge>}
                              {med.mrp && <span className="text-xs font-medium text-primary">MRP: {med.mrp}</span>}
                            </div>
                          </div>
                          <div className="flex items-center gap-0.5 flex-shrink-0">
                            <Button
                              size="icon"
                              variant="ghost"
                              onClick={() => startEditMedicine(index)}
                              data-testid={`button-edit-medicine-${index}`}
                            >
                              <Pencil className="h-3.5 w-3.5" />
                            </Button>
                            <Button
                              size="icon"
                              variant="ghost"
                              onClick={() => removeMedicine(index)}
                              data-testid={`button-remove-medicine-${index}`}
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </div>
          )}

          <div className="flex gap-2 flex-shrink-0">
            {mode === "multi" && scannedMedicines.length > 0 && (
              <Button className="flex-1" onClick={handleDone} data-testid="button-done-scanning">
                <Check className="h-4 w-4 mr-2" />
                Done ({scannedMedicines.length})
              </Button>
            )}
            <Button
              variant="outline"
              className={mode === "multi" && scannedMedicines.length > 0 ? "" : "flex-1"}
              onClick={() => onOpenChange(false)}
              data-testid="button-close-camera"
            >
              Cancel
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
