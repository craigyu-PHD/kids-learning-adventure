#!/usr/bin/env python3
"""PS1 browser recording pipeline feasibility.

Uses an in-browser oscillator -> MediaStreamDestination so it never needs a real
child/microphone sample. This validates codec selection, MediaRecorder Blob
capture, object-URL loading and browser audio decoding. Physical microphone,
permission UX and child pronunciation quality remain separate manual/model gates.
"""
from __future__ import annotations

import json
import os
from pathlib import Path
from typing import Any

from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[1]
QA_DIR = ROOT / ".qa"
QA_DIR.mkdir(exist_ok=True)
RESULT = QA_DIR / "speech_recorder_result.json"
URL = os.environ.get("AUDIT_URL", "http://127.0.0.1:4173/")

CAPTURE_JS = r"""async () => {
  const candidates = [
    'audio/webm;codecs=opus',
    'audio/webm',
    'audio/mp4;codecs=mp4a.40.2',
    'audio/mp4',
    'audio/ogg;codecs=opus',
    'audio/ogg',
  ];
  const result = {
    secureContext: window.isSecureContext,
    mediaDevices: Boolean(navigator.mediaDevices?.getUserMedia),
    mediaRecorder: typeof MediaRecorder !== 'undefined',
    supportedMimeTypes: [],
    selectedMimeType: null,
    blobType: null,
    blobBytes: 0,
    decodedDurationSeconds: 0,
    playbackMetadataLoaded: false,
    playbackDurationSeconds: 0,
    error: null,
  };
  if (!result.mediaRecorder) {
    result.error = 'MediaRecorder unavailable';
    return result;
  }
  result.supportedMimeTypes = candidates.filter(type => MediaRecorder.isTypeSupported(type));
  result.selectedMimeType = result.supportedMimeTypes[0] || null;
  if (!result.selectedMimeType) {
    result.error = 'No approved MIME candidate supported';
    return result;
  }
  const AudioContextCtor = window.AudioContext || window.webkitAudioContext;
  if (!AudioContextCtor) {
    result.error = 'AudioContext unavailable';
    return result;
  }
  let context;
  let decodeContext;
  let objectUrl;
  let oscillator;
  try {
    context = new AudioContextCtor();
    await context.resume();
    const destination = context.createMediaStreamDestination();
    oscillator = context.createOscillator();
    const gain = context.createGain();
    gain.gain.value = 0.15;
    oscillator.frequency.value = 440;
    oscillator.connect(gain);
    gain.connect(destination);
    const chunks = [];
    const recorder = new MediaRecorder(destination.stream, { mimeType: result.selectedMimeType });
    recorder.addEventListener('dataavailable', event => { if (event.data.size > 0) chunks.push(event.data); });
    const stopped = new Promise((resolve, reject) => {
      recorder.addEventListener('stop', resolve, { once: true });
      recorder.addEventListener('error', event => reject(new Error(event.error?.message || 'MediaRecorder error')), { once: true });
    });
    oscillator.start();
    recorder.start(100);
    await new Promise(resolve => setTimeout(resolve, 900));
    recorder.stop();
    await stopped;
    oscillator.stop();
    const blob = new Blob(chunks, { type: recorder.mimeType || result.selectedMimeType });
    result.blobType = blob.type;
    result.blobBytes = blob.size;
    if (!blob.size) throw new Error('empty capture');

    decodeContext = new AudioContextCtor();
    const bytes = await blob.arrayBuffer();
    const decoded = await decodeContext.decodeAudioData(bytes.slice(0));
    result.decodedDurationSeconds = Math.round(decoded.duration * 1000) / 1000;

    objectUrl = URL.createObjectURL(blob);
    const audio = new Audio();
    audio.preload = 'metadata';
    const loaded = new Promise((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error('audio metadata timeout')), 5000);
      audio.addEventListener('loadedmetadata', () => { clearTimeout(timer); resolve(true); }, { once: true });
      audio.addEventListener('error', () => { clearTimeout(timer); reject(new Error('audio element failed to load capture')); }, { once: true });
    });
    audio.src = objectUrl;
    await loaded;
    result.playbackMetadataLoaded = true;
    result.playbackDurationSeconds = Number.isFinite(audio.duration) ? Math.round(audio.duration * 1000) / 1000 : 0;
  } catch (error) {
    result.error = error instanceof Error ? `${error.name}: ${error.message}` : String(error);
  } finally {
    try { oscillator?.stop(); } catch {}
    if (objectUrl) URL.revokeObjectURL(objectUrl);
    await Promise.allSettled([context?.close?.(), decodeContext?.close?.()]);
  }
  return result;
}"""


def assess(payload: dict[str, Any]) -> list[str]:
    failures: list[str] = []
    if not payload.get("secureContext"):
        failures.append("localhost page is not a secure context")
    if not payload.get("mediaDevices"):
        failures.append("getUserMedia API unavailable")
    if not payload.get("mediaRecorder"):
        failures.append("MediaRecorder API unavailable")
    if not payload.get("selectedMimeType"):
        failures.append("no approved codec selected via isTypeSupported")
    if payload.get("error"):
        failures.append(str(payload["error"]))
    if int(payload.get("blobBytes") or 0) <= 100:
        failures.append(f"recorded blob too small: {payload.get('blobBytes')}")
    if float(payload.get("decodedDurationSeconds") or 0) < 0.5:
        failures.append(f"captured audio did not decode to expected duration: {payload.get('decodedDurationSeconds')}")
    if not payload.get("playbackMetadataLoaded"):
        failures.append("captured Blob could not load in Audio element")
    return failures


def main() -> int:
    cases: list[dict[str, Any]] = []
    with sync_playwright() as pw:
        for engine_name in ("chromium", "firefox", "webkit"):
            browser = getattr(pw, engine_name).launch(headless=True)
            context = browser.new_context(viewport={"width": 800, "height": 600})
            page = context.new_page()
            page.goto(URL, wait_until="domcontentloaded", timeout=60000)
            payload = page.evaluate(CAPTURE_JS)
            failures = assess(payload)
            cases.append({"engine": engine_name, "payload": payload, "failures": failures})
            context.close()
            browser.close()

    failures = [
        {"engine": case["engine"], "failures": case["failures"]}
        for case in cases
        if case["failures"]
    ]
    result = {
        "status": "FAIL" if failures else "PASS",
        "scope": "synthetic-browser-record-capture-decode-playback-metadata",
        "auditUrl": URL,
        "physicalMicTested": False,
        "childSpeechTested": False,
        "cases": cases,
        "failures": failures,
    }
    RESULT.write_text(json.dumps(result, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(json.dumps(result, ensure_ascii=False, indent=2))
    return 1 if failures else 0


if __name__ == "__main__":
    raise SystemExit(main())
