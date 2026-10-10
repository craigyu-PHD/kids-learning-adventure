export const RECORDER_MIME_CANDIDATES = [
  "audio/webm;codecs=opus",
  "audio/webm",
  "audio/mp4;codecs=mp4a.40.2",
  "audio/mp4",
  "audio/ogg;codecs=opus",
  "audio/ogg",
] as const;

export type RecorderState =
  | "idle"
  | "permission"
  | "ready"
  | "recording"
  | "stopping"
  | "captured"
  | "error";

export type RecorderFailureCode =
  | "unsupported"
  | "unsupported-codec"
  | "denied"
  | "no-device"
  | "busy-device"
  | "capture-failed"
  | "empty-capture";

export class RecorderControllerError extends Error {
  readonly code: RecorderFailureCode;

  constructor(code: RecorderFailureCode, message: string, options?: ErrorOptions) {
    super(message, options);
    this.name = "RecorderControllerError";
    this.code = code;
  }
}

export type RecordedClip = {
  blob: Blob;
  objectUrl: string;
  mimeType: string;
  durationMs: number;
  sizeBytes: number;
};

const releaseTracks = (stream: MediaStream | null) => {
  stream?.getTracks().forEach((track) => track.stop());
};

const browserMediaDevices = () =>
  typeof navigator === "undefined"
    ? undefined
    : (navigator as Navigator & { mediaDevices?: MediaDevices }).mediaDevices;

const mapMediaError = (error: unknown) => {
  const name = error instanceof DOMException ? error.name : "";
  if (name === "NotAllowedError" || name === "SecurityError") {
    return new RecorderControllerError("denied", "麥克風權限未允許。", { cause: error });
  }
  if (name === "NotFoundError" || name === "DevicesNotFoundError") {
    return new RecorderControllerError("no-device", "找不到可用的麥克風。", { cause: error });
  }
  if (name === "NotReadableError" || name === "TrackStartError") {
    return new RecorderControllerError("busy-device", "麥克風目前無法使用，可能正被其他程式占用。", { cause: error });
  }
  return new RecorderControllerError("capture-failed", "錄音無法開始。", { cause: error });
};

export function chooseRecorderMimeType(
  recorderType: typeof MediaRecorder | undefined = typeof MediaRecorder === "undefined" ? undefined : MediaRecorder,
): string | null {
  if (!recorderType) return null;
  return RECORDER_MIME_CANDIDATES.find((mimeType) => recorderType.isTypeSupported(mimeType)) ?? null;
}

/**
 * Owns one in-memory microphone capture at a time.
 * It never persists or uploads audio; callers must explicitly opt in elsewhere
 * if retention is introduced in PS2.
 */
export class RecorderController {
  state: RecorderState = "idle";

  private stream: MediaStream | null = null;
  private recorder: MediaRecorder | null = null;
  private chunks: BlobPart[] = [];
  private startedAt = 0;
  private activeObjectUrl: string | null = null;
  private captureGeneration = 0;
  private cancelPendingStop: (() => void) | null = null;

  get isSupported() {
    return Boolean(browserMediaDevices() && typeof MediaRecorder !== "undefined" && chooseRecorderMimeType());
  }

  async start(): Promise<void> {
    if (this.state === "recording" || this.state === "stopping") {
      throw new RecorderControllerError("capture-failed", "已有錄音正在進行。" );
    }
    const mediaDevices = browserMediaDevices();
    if (!mediaDevices || typeof MediaRecorder === "undefined") {
      this.state = "error";
      throw new RecorderControllerError("unsupported", "這個瀏覽器不支援本機錄音。" );
    }
    const mimeType = chooseRecorderMimeType();
    if (!mimeType) {
      this.state = "error";
      throw new RecorderControllerError("unsupported-codec", "找不到瀏覽器可安全錄製與回放的音訊格式。" );
    }

    this.releaseClip();
    this.cancelCapture();
    const generation = this.captureGeneration;
    this.state = "permission";
    let stream: MediaStream;
    try {
      stream = await mediaDevices.getUserMedia({
        audio: {
          channelCount: 1,
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
        video: false,
      });
    } catch (error) {
      if (generation === this.captureGeneration) this.state = "error";
      throw mapMediaError(error);
    }
    if (generation !== this.captureGeneration) {
      releaseTracks(stream);
      throw new RecorderControllerError("capture-failed", "錄音已取消。" );
    }

    this.stream = stream;
    this.state = "ready";
    this.chunks = [];
    let recorder: MediaRecorder;
    try {
      recorder = new MediaRecorder(stream, { mimeType });
    } catch (error) {
      releaseTracks(stream);
      this.stream = null;
      this.state = "error";
      throw new RecorderControllerError("unsupported-codec", `無法使用 ${mimeType} 啟動錄音。`, { cause: error });
    }
    this.recorder = recorder;
    recorder.addEventListener("dataavailable", (event) => {
      if (generation === this.captureGeneration && this.recorder === recorder && event.data.size > 0) {
        this.chunks.push(event.data);
      }
    });
    try {
      recorder.start(250);
    } catch (error) {
      this.cancelCapture();
      this.state = "error";
      throw mapMediaError(error);
    }
    this.startedAt = performance.now();
    this.state = "recording";
  }

  stop(): Promise<RecordedClip> {
    const recorder = this.recorder;
    if (!recorder || this.state !== "recording") {
      return Promise.reject(new RecorderControllerError("capture-failed", "目前沒有可停止的錄音。"));
    }
    this.state = "stopping";
    const durationMs = Math.max(0, performance.now() - this.startedAt);

    const generation = this.captureGeneration;
    return new Promise<RecordedClip>((resolve, reject) => {
      let settled = false;
      const isCurrent = () => generation === this.captureGeneration && this.recorder === recorder;
      const cleanup = () => {
        settled = true;
        recorder.removeEventListener("stop", finish);
        recorder.removeEventListener("error", fail);
        if (this.cancelPendingStop === cancel) this.cancelPendingStop = null;
      };
      const cancel = () => {
        if (settled) return;
        cleanup();
        reject(new RecorderControllerError("capture-failed", "錄音已取消。"));
      };
      const finish = () => {
        if (settled) return;
        if (!isCurrent()) { cancel(); return; }
        cleanup();
        const mimeType = recorder.mimeType || chooseRecorderMimeType() || "application/octet-stream";
        const blob = new Blob(this.chunks, { type: mimeType });
        releaseTracks(this.stream);
        this.stream = null;
        this.recorder = null;
        this.chunks = [];
        if (blob.size === 0) {
          this.state = "error";
          reject(new RecorderControllerError("empty-capture", "沒有錄到可播放的聲音資料。"));
          return;
        }
        const objectUrl = URL.createObjectURL(blob);
        this.activeObjectUrl = objectUrl;
        this.state = "captured";
        resolve({ blob, objectUrl, mimeType, durationMs, sizeBytes: blob.size });
      };
      const fail = (event: Event) => {
        if (settled) return;
        if (!isCurrent()) { cancel(); return; }
        cleanup();
        releaseTracks(this.stream);
        this.stream = null;
        this.recorder = null;
        this.chunks = [];
        this.state = "error";
        reject(new RecorderControllerError("capture-failed", "錄音途中發生錯誤。", { cause: event }));
      };
      this.cancelPendingStop = cancel;
      recorder.addEventListener("stop", finish, { once: true });
      recorder.addEventListener("error", fail, { once: true });
      try {
        recorder.stop();
      } catch (error) {
        fail(error instanceof Event ? error : new Event("recorder-stop-error"));
      }
    });
  }

  releaseClip() {
    if (this.activeObjectUrl) URL.revokeObjectURL(this.activeObjectUrl);
    this.activeObjectUrl = null;
    if (this.state === "captured") this.state = "idle";
  }

  cancelCapture() {
    this.captureGeneration += 1;
    this.cancelPendingStop?.();
    const recorder = this.recorder;
    this.recorder = null;
    this.chunks = [];
    if (recorder && recorder.state !== "inactive") {
      try { recorder.stop(); } catch { /* Tracks are released below even when MediaRecorder is already stopping. */ }
    }
    releaseTracks(this.stream);
    this.stream = null;
    if (this.state !== "error") this.state = "idle";
  }

  dispose() {
    this.cancelCapture();
    this.releaseClip();
    this.state = "idle";
  }
}
