"use client";

import { useCallback, useEffect, useRef, useState } from "react";

/**
 * Web Serial scale integration. Chromium-only (Chrome/Edge on desktop,
 * Android) and requires a secure context — `navigator.serial` doesn't exist
 * in Safari or Firefox at all, which is exactly the case this hook treats
 * as "unsupported" and routes to manual-entry failover, same as a runtime
 * disconnect.
 *
 * Wire protocol assumed here is a common continuous-output format used by
 * Toledo/CAS-style scales: ASCII lines like `ST,GS,+   0.250kg\r\n` (ST =
 * stable, US = unstable) or a bare `0.250\r\n`. Real hardware varies by
 * manufacturer — adjust `parseLine` to match your actual scale's manual
 * before going live; nothing else in this hook depends on the exact format.
 */

export interface ScaleReading {
  grams: number;
  stable: boolean;
  receivedAt: number;
}

const STALE_AFTER_MS = 5000;

function parseLine(line: string): ScaleReading | null {
  const trimmed = line.trim();
  if (!trimmed) return null;

  const stable = !trimmed.startsWith("US");
  const match = trimmed.match(/([\d.]+)\s*(kg|g)?/i);
  if (!match) return null;

  const value = parseFloat(match[1]!);
  if (Number.isNaN(value)) return null;

  const unit = (match[2] ?? "kg").toLowerCase();
  const grams = unit === "kg" ? value * 1000 : value;
  return { grams: Math.round(grams), stable, receivedAt: Date.now() };
}

export function useScale(baudRate = 9600) {
  const [isSupported] = useState(() => typeof navigator !== "undefined" && "serial" in navigator);
  const [isConnected, setIsConnected] = useState(false);
  const [reading, setReading] = useState<ScaleReading | null>(null);
  const [isStale, setIsStale] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const portRef = useRef<SerialPort | null>(null);
  const readerRef = useRef<ReadableStreamDefaultReader<Uint8Array> | null>(null);
  const cancelledRef = useRef(false);

  const disconnect = useCallback(async () => {
    cancelledRef.current = true;
    try {
      await readerRef.current?.cancel();
    } catch {
      // port already gone — nothing to clean up
    }
    try {
      await portRef.current?.close();
    } catch {
      // already closed
    }
    portRef.current = null;
    readerRef.current = null;
    setIsConnected(false);
    setIsStale(false);
  }, []);

  const connect = useCallback(async () => {
    if (!isSupported) {
      setError("This browser doesn't support Web Serial (Chrome/Edge only) — use manual weight entry.");
      return;
    }
    setError(null);
    try {
      const port = await navigator.serial!.requestPort();
      await port.open({ baudRate });
      portRef.current = port;
      cancelledRef.current = false;
      setIsConnected(true);

      const reader = port.readable!.getReader();
      readerRef.current = reader;
      const decoder = new TextDecoder();

      let buffer = "";
      (async () => {
        try {
          while (!cancelledRef.current) {
            const { value, done } = await reader.read();
            if (done) break;
            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split(/\r\n|\r|\n/);
            buffer = lines.pop() ?? "";
            for (const line of lines) {
              const parsed = parseLine(line);
              if (parsed) setReading(parsed);
            }
          }
        } catch {
          if (!cancelledRef.current) setError("Scale disconnected unexpectedly — switch to manual entry.");
        } finally {
          setIsConnected(false);
        }
      })();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't open the scale port.");
      setIsConnected(false);
    }
  }, [baudRate, isSupported]);

  useEffect(() => () => void disconnect(), [disconnect]);

  // Continuous-output scales that silently stop transmitting (cable pulled,
  // power loss) don't always throw on the read() promise — a stale reading
  // is the only signal. Guards against a customer being charged off a
  // last-known weight from a scale that's actually dead.
  useEffect(() => {
    if (!isConnected) {
      setIsStale(false);
      return;
    }
    const interval = setInterval(() => {
      setIsStale(reading ? Date.now() - reading.receivedAt > STALE_AFTER_MS : false);
    }, 1000);
    return () => clearInterval(interval);
  }, [isConnected, reading]);

  return { isSupported, isConnected, reading, isStale, error, connect, disconnect };
}
