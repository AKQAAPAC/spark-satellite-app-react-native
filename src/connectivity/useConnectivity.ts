/** Connectivity: good | low | none from native ConnectivityStatus (plus optional CONNECTIVITY_OVERRIDE). */

import { useEffect, useState } from 'react';
import {
  AppState,
  type AppStateStatus,
  NativeEventEmitter,
  NativeModules,
  type NativeModule,
  TurboModuleRegistry,
} from 'react-native';
import Constants from 'expo-constants';
import type { Connectivity } from './types';

const VALID: Connectivity[] = ['good', 'low', 'none'];
function validOverride(value: unknown): Connectivity | null {
  if (typeof value !== 'string') return null;
  const v = value.toLowerCase() as Connectivity;
  return VALID.includes(v) ? v : null;
}

const OVERRIDE: Connectivity | null = validOverride(
  (Constants.expoConfig?.extra as { connectivityOverride?: unknown } | undefined)?.connectivityOverride
);

function parseConnectivity(raw: unknown): Connectivity | null {
  const s = (typeof raw === 'string' ? raw : String(raw)).trim().toLowerCase();
  if (s === 'good' || s === 'low' || s === 'none') return s as Connectivity;
  return null;
}

type ConnectivityStatusNative = { getConnectivity: () => Promise<string> };

function getConnectivityStatusModule(): ConnectivityStatusNative | undefined {
  const fromLegacy = NativeModules.ConnectivityStatus as { getConnectivity?: () => Promise<string> } | undefined;
  const fromTurbo = TurboModuleRegistry.get('ConnectivityStatus') as
    | { getConnectivity?: () => Promise<string> }
    | undefined;
  const m = fromLegacy ?? fromTurbo;
  if (m != null && typeof m.getConnectivity === 'function') return m as ConnectivityStatusNative;
  return undefined;
}

/** True when the native ConnectivityStatus module is registered. */
export function getIsUsingNativeConnectivity(): boolean {
  return getConnectivityStatusModule() != null;
}

const NATIVE_MODULE_RETRY_ATTEMPTS = 24;
const NATIVE_MODULE_RETRY_MS = 75;
const POLL_MS = 5000;

export function useConnectivity(): Connectivity {
  const [connectivity, setConnectivity] = useState<Connectivity>(() => OVERRIDE ?? 'none');

  useEffect(() => {
    if (OVERRIDE != null) return;

    let cancelled = false;
    let eventSub: { remove: () => void } | null = null;
    let pollId: ReturnType<typeof setInterval> | null = null;
    let appSub: { remove: () => void } | null = null;
    let attempt = 0;

    const applyNativeString = (raw: unknown) => {
      const next = parseConnectivity(raw);
      if (next != null) setConnectivity(next);
    };

    const attach = (nativeMod: ConnectivityStatusNative) => {
      const refresh = () => {
        nativeMod.getConnectivity().then((s: string) => {
          if (!cancelled) applyNativeString(s);
        });
      };

      refresh();

      // RCTEventEmitter delivers via NativeEventEmitter (DeviceEventEmitter never receives these).
      const emitter = new NativeEventEmitter(NativeModules.ConnectivityStatus as NativeModule);
      eventSub = emitter.addListener('connectivityChange', (payload: unknown) => {
        if (cancelled) return;
        applyNativeString(payload);
      });

      pollId = setInterval(refresh, POLL_MS);

      appSub = AppState.addEventListener('change', (nextState: AppStateStatus) => {
        if (nextState === 'active') refresh();
      });
    };

    const tryConnect = () => {
      if (cancelled) return;
      const nativeMod = getConnectivityStatusModule();
      if (nativeMod) {
        attach(nativeMod);
        return;
      }
      attempt += 1;
      if (attempt < NATIVE_MODULE_RETRY_ATTEMPTS) {
        setTimeout(tryConnect, NATIVE_MODULE_RETRY_MS);
      } else if (!cancelled) {
        setConnectivity('none');
      }
    };

    tryConnect();

    return () => {
      cancelled = true;
      eventSub?.remove();
      if (pollId != null) clearInterval(pollId);
      appSub?.remove();
    };
  }, []);

  return OVERRIDE ?? connectivity;
}
