#!/usr/bin/env python3
"""Render the approved Weekly Robot Rocket image as a short VP9 WebM motion asset.

The source illustration is made with ChatGPT Image. Chrome's Canvas/MediaRecorder
keeps the derived motion asset local, transparent, and free of external media tools.
"""

from __future__ import annotations

import base64
import json
import os
import shutil
import signal
import socket
import subprocess
import tempfile
import time
import urllib.request
from pathlib import Path

import websocket


ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "public/assets/v5/brand/weekly-rocket-robot.png"
OUTPUT = ROOT / "public/assets/v5/animations/weekly-rocket-robot.webm"
CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"


def free_port() -> int:
    sock = socket.socket()
    sock.bind(("127.0.0.1", 0))
    port = sock.getsockname()[1]
    sock.close()
    return port


def wait_for_debug(port: int) -> dict[str, object]:
    deadline = time.time() + 20
    while time.time() < deadline:
        try:
            with urllib.request.urlopen(f"http://127.0.0.1:{port}/json", timeout=1) as response:
                targets = json.load(response)
                return next(target for target in targets if target.get("type") == "page")
        except Exception:
            time.sleep(0.2)
    raise RuntimeError("Chrome remote debugging did not start")


def render_motion(ws_url: str) -> bytes:
    ws = websocket.create_connection(ws_url, timeout=30, origin="http://localhost")
    try:
        source_url = f"data:image/png;base64,{base64.b64encode(SOURCE.read_bytes()).decode()}"
        expression = f"""(async () => {{
          const img = new Image();
          img.src = {json.dumps(source_url)};
          await img.decode();
          const canvas = document.createElement('canvas');
          canvas.width = 512; canvas.height = 512;
          const ctx = canvas.getContext('2d');
          const stream = canvas.captureStream(24);
          const recorder = new MediaRecorder(stream, {{mimeType:'video/webm;codecs=vp9', videoBitsPerSecond:900000}});
          const chunks = [];
          const finished = new Promise((resolve) => {{ recorder.onstop = resolve; }});
          recorder.ondataavailable = (event) => {{ if (event.data.size) chunks.push(event.data); }};
          recorder.start();
          const started = performance.now();
          await new Promise((resolve) => {{
            const paint = (now) => {{
              const t = Math.min(1, (now - started) / 3000);
              const phase = t * Math.PI * 2;
              ctx.clearRect(0, 0, 512, 512);
              ctx.save();
              ctx.translate(256, 268 + Math.sin(phase) * 13);
              ctx.rotate(Math.sin(phase) * 0.032);
              ctx.drawImage(img, -220, -201, 440, 402);
              ctx.restore();
              if (t < 1) requestAnimationFrame(paint); else resolve();
            }};
            requestAnimationFrame(paint);
          }});
          recorder.stop();
          await finished;
          const bytes = new Uint8Array(await new Blob(chunks, {{type:'video/webm'}}).arrayBuffer());
          let binary = '';
          for (let offset = 0; offset < bytes.length; offset += 0x8000) binary += String.fromCharCode(...bytes.subarray(offset, offset + 0x8000));
          return btoa(binary);
        }})()"""
        request = {"id": 1, "method": "Runtime.evaluate", "params": {"expression": expression, "awaitPromise": True, "returnByValue": True}}
        ws.send(json.dumps(request))
        while True:
            message = json.loads(ws.recv())
            if message.get("id") != 1:
                continue
            if "error" in message or message.get("result", {}).get("exceptionDetails"):
                raise RuntimeError(str(message))
            value = message["result"]["result"].get("value")
            if not isinstance(value, str):
                raise RuntimeError(f"Chrome did not return WebM bytes: {message}")
            return base64.b64decode(value)
    finally:
        ws.close()


def main() -> int:
    if not SOURCE.is_file():
        raise FileNotFoundError(SOURCE)
    OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    port = free_port()
    profile = tempfile.mkdtemp(prefix="weekly-robot-webm-")
    chrome = subprocess.Popen([CHROME, "--headless=new", "--disable-gpu", "--no-first-run", "--remote-allow-origins=*", "--allow-file-access-from-files", f"--remote-debugging-port={port}", f"--user-data-dir={profile}", "about:blank"], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL, start_new_session=True)
    try:
        page = wait_for_debug(port)
        payload = render_motion(str(page["webSocketDebuggerUrl"]))
        if len(payload) < 30_000 or not payload.startswith(b"\x1a\x45\xdf\xa3") or b"V_VP9" not in payload:
            raise RuntimeError("Chrome did not produce a valid VP9 WebM")
        OUTPUT.write_bytes(payload)
        print(f"Wrote {OUTPUT.relative_to(ROOT)} ({len(payload)} bytes)")
        return 0
    finally:
        try:
            os.killpg(chrome.pid, signal.SIGTERM)
            chrome.wait(timeout=3)
        except Exception:
            os.killpg(chrome.pid, signal.SIGKILL)
        shutil.rmtree(profile, ignore_errors=True)


if __name__ == "__main__":
    raise SystemExit(main())
