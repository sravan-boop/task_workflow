"use client";

import { useState, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Video, Square, Loader2 } from "lucide-react";
import { toast } from "sonner";

interface VideoRecorderProps {
  onRecorded: (videoUrl: string, duration: number) => void;
}

export function VideoRecorder({ onRecorded }: VideoRecorderProps) {
  const [isRecording, setIsRecording] = useState(false);
  const [isPreviewing, setIsPreviewing] = useState(false);
  const [recordedUrl, setRecordedUrl] = useState<string | null>(null);
  const [duration, setDuration] = useState(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const videoPreviewRef = useRef<HTMLVideoElement>(null);
  const startTimeRef = useRef<number>(0);
  const timerRef = useRef<ReturnType<typeof setInterval>>(null);

  const startRecording = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true,
      });
      streamRef.current = stream;

      if (videoPreviewRef.current) {
        videoPreviewRef.current.srcObject = stream;
        videoPreviewRef.current.play();
      }

      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: MediaRecorder.isTypeSupported("video/webm;codecs=vp9")
          ? "video/webm;codecs=vp9"
          : "video/webm",
      });

      chunksRef.current = [];
      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: "video/webm" });
        const url = URL.createObjectURL(blob);
        setRecordedUrl(url);
        setIsPreviewing(true);
        setIsRecording(false);

        // Stop all tracks
        stream.getTracks().forEach((t) => t.stop());
        streamRef.current = null;
      };

      mediaRecorderRef.current = mediaRecorder;
      mediaRecorder.start(100);

      startTimeRef.current = Date.now();
      setDuration(0);
      setIsRecording(true);
      setIsPreviewing(false);
      setRecordedUrl(null);

      timerRef.current = setInterval(() => {
        setDuration(Math.floor((Date.now() - startTimeRef.current) / 1000));
      }, 1000);
    } catch {
      toast.error("Could not access camera. Please allow camera permissions.");
    }
  }, []);

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current?.state === "recording") {
      mediaRecorderRef.current.stop();
    }
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    setDuration(Math.floor((Date.now() - startTimeRef.current) / 1000));
  }, []);

  const handleUse = () => {
    if (recordedUrl) {
      onRecorded(recordedUrl, duration);
      setIsPreviewing(false);
      setRecordedUrl(null);
      setDuration(0);
    }
  };

  const handleDiscard = () => {
    if (recordedUrl) URL.revokeObjectURL(recordedUrl);
    setRecordedUrl(null);
    setIsPreviewing(false);
    setDuration(0);
  };

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m}:${s.toString().padStart(2, "0")}`;
  };

  // Simple button when not recording/previewing
  if (!isRecording && !isPreviewing) {
    return (
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="h-8 w-8 text-muted-foreground hover:text-[#4573D2]"
        onClick={startRecording}
        title="Record video message"
      >
        <Video className="h-4 w-4" />
      </Button>
    );
  }

  return (
    <div className="mt-2 rounded-lg border bg-gray-50 p-3">
      {isRecording && (
        <div className="space-y-2">
          <video
            ref={videoPreviewRef}
            muted
            className="w-full max-w-xs rounded bg-black"
            style={{ maxHeight: 180 }}
          />
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5">
              <span className="h-2 w-2 animate-pulse rounded-full bg-red-500" />
              <span className="text-xs font-medium text-red-600">
                Recording {formatTime(duration)}
              </span>
            </div>
            <Button
              type="button"
              size="sm"
              variant="destructive"
              className="h-7 gap-1 text-xs"
              onClick={stopRecording}
            >
              <Square className="h-3 w-3" />
              Stop
            </Button>
          </div>
        </div>
      )}

      {isPreviewing && recordedUrl && (
        <div className="space-y-2">
          <video
            src={recordedUrl}
            controls
            className="w-full max-w-xs rounded bg-black"
            style={{ maxHeight: 180 }}
          />
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">
              {formatTime(duration)}
            </span>
            <Button
              type="button"
              size="sm"
              className="h-7 bg-[#4573D2] text-xs hover:bg-[#3A63B8]"
              onClick={handleUse}
            >
              Attach video
            </Button>
            <Button
              type="button"
              size="sm"
              variant="ghost"
              className="h-7 text-xs"
              onClick={handleDiscard}
            >
              Discard
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
