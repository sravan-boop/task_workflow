"use client";

import { useState, useRef } from "react";
import { trpc } from "@/lib/trpc";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { X, Check, MessageCircle } from "lucide-react";

interface ImageProofingProps {
  attachmentId: string;
  imageUrl: string;
  fileName: string;
  onClose: () => void;
}

export function ImageProofing({
  attachmentId,
  imageUrl,
  fileName,
  onClose,
}: ImageProofingProps) {
  const imageRef = useRef<HTMLDivElement>(null);
  const [newPin, setNewPin] = useState<{ x: number; y: number } | null>(null);
  const [newPinBody, setNewPinBody] = useState("");
  const [selectedPinId, setSelectedPinId] = useState<string | null>(null);

  const { data: annotations, refetch } = trpc.annotations.list.useQuery({
    attachmentId,
  });

  const createAnnotation = trpc.annotations.create.useMutation({
    onSuccess: () => {
      refetch();
      setNewPin(null);
      setNewPinBody("");
    },
  });

  const resolveAnnotation = trpc.annotations.resolve.useMutation({
    onSuccess: () => refetch(),
  });

  const deleteAnnotation = trpc.annotations.delete.useMutation({
    onSuccess: () => {
      refetch();
      setSelectedPinId(null);
    },
  });

  const handleImageClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (selectedPinId) {
      setSelectedPinId(null);
      return;
    }
    const rect = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    setNewPin({ x, y });
    setNewPinBody("");
  };

  const handleSubmitPin = () => {
    if (!newPin || !newPinBody.trim()) return;
    createAnnotation.mutate({
      attachmentId,
      x: newPin.x,
      y: newPin.y,
      body: newPinBody.trim(),
    });
  };

  const unresolvedAnnotations = annotations?.filter((a) => !a.resolved) ?? [];
  const resolvedAnnotations = annotations?.filter((a) => a.resolved) ?? [];

  return (
    <div className="fixed inset-0 z-50 flex bg-black/80" onClick={onClose}>
      <div
        className="flex flex-1 flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between bg-gray-900 px-4 py-3 text-white">
          <div className="flex items-center gap-2">
            <MessageCircle className="h-4 w-4" />
            <span className="text-sm font-medium">{fileName}</span>
            <span className="text-xs text-gray-400">
              {unresolvedAnnotations.length} annotation
              {unresolvedAnnotations.length !== 1 ? "s" : ""}
            </span>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-white hover:bg-white/10"
            onClick={onClose}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Image area */}
        <div className="flex flex-1 overflow-auto">
          <div className="flex flex-1 items-center justify-center p-8">
            <div
              ref={imageRef}
              className="relative cursor-crosshair"
              onClick={handleImageClick}
            >
              <img
                src={imageUrl}
                alt={fileName}
                className="max-h-[70vh] max-w-full rounded"
                draggable={false}
              />

              {/* Existing pins */}
              {unresolvedAnnotations.map((ann, idx) => (
                <button
                  key={ann.id}
                  className={cn(
                    "absolute flex h-6 w-6 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full text-[10px] font-bold text-white shadow-lg transition-transform hover:scale-110",
                    selectedPinId === ann.id
                      ? "bg-blue-600 ring-2 ring-white"
                      : "bg-[#4573D2]"
                  )}
                  style={{ left: `${ann.x}%`, top: `${ann.y}%` }}
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedPinId(
                      selectedPinId === ann.id ? null : ann.id
                    );
                    setNewPin(null);
                  }}
                >
                  {idx + 1}
                </button>
              ))}

              {/* Resolved pins (dimmed) */}
              {resolvedAnnotations.map((ann) => (
                <div
                  key={ann.id}
                  className="absolute flex h-6 w-6 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-green-600/60 text-[10px] font-bold text-white"
                  style={{ left: `${ann.x}%`, top: `${ann.y}%` }}
                >
                  <Check className="h-3 w-3" />
                </div>
              ))}

              {/* New pin placement */}
              {newPin && (
                <div
                  className="absolute flex h-6 w-6 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-orange-500 text-[10px] font-bold text-white ring-2 ring-white"
                  style={{ left: `${newPin.x}%`, top: `${newPin.y}%` }}
                >
                  +
                </div>
              )}

              {/* New pin input popover */}
              {newPin && (
                <div
                  className="absolute z-10 w-64 rounded-lg border bg-white p-3 shadow-xl"
                  style={{
                    left: `${Math.min(newPin.x, 70)}%`,
                    top: `${newPin.y + 3}%`,
                  }}
                  onClick={(e) => e.stopPropagation()}
                >
                  <Input
                    value={newPinBody}
                    onChange={(e) => setNewPinBody(e.target.value)}
                    placeholder="Add annotation..."
                    className="h-8 text-sm"
                    autoFocus
                    onKeyDown={(e) => {
                      if (e.key === "Enter") handleSubmitPin();
                      if (e.key === "Escape") setNewPin(null);
                    }}
                  />
                  <div className="mt-2 flex justify-end gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 text-xs"
                      onClick={() => setNewPin(null)}
                    >
                      Cancel
                    </Button>
                    <Button
                      size="sm"
                      className="h-7 bg-[#4573D2] text-xs hover:bg-[#3A63B8]"
                      onClick={handleSubmitPin}
                      disabled={!newPinBody.trim()}
                    >
                      Add
                    </Button>
                  </div>
                </div>
              )}

              {/* Selected pin detail */}
              {selectedPinId && (() => {
                const ann = annotations?.find((a) => a.id === selectedPinId);
                if (!ann) return null;
                return (
                  <div
                    className="absolute z-10 w-64 rounded-lg border bg-white p-3 shadow-xl"
                    style={{
                      left: `${Math.min(ann.x, 70)}%`,
                      top: `${ann.y + 3}%`,
                    }}
                    onClick={(e) => e.stopPropagation()}
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="text-xs font-medium text-gray-900">
                          {ann.author?.name ?? "Unknown"}
                        </p>
                        <p className="mt-1 text-sm text-gray-700">{ann.body}</p>
                      </div>
                      <button
                        onClick={() => setSelectedPinId(null)}
                        className="text-gray-400 hover:text-gray-600"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                    <div className="mt-2 flex gap-1">
                      {!ann.resolved && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-6 text-[10px]"
                          onClick={() =>
                            resolveAnnotation.mutate({ id: ann.id })
                          }
                        >
                          <Check className="mr-1 h-3 w-3" />
                          Resolve
                        </Button>
                      )}
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-6 text-[10px] text-red-500 hover:text-red-600"
                        onClick={() =>
                          deleteAnnotation.mutate({ id: ann.id })
                        }
                      >
                        Delete
                      </Button>
                    </div>
                  </div>
                );
              })()}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
