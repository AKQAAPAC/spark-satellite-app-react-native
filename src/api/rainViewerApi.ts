/** RainViewer radar frames for map overlay. */
import { fetchJsonWithTimeout } from './fetchWithTimeout';

const MAPS_URL = 'https://api.rainviewer.com/public/weather-maps.json';

export interface RadarFrame {
  time: Date;
  imageURL: string;
}

interface RainViewerMapsPayload {
  host?: string;
  radar?: { past?: Array<{ time: number; path: string }> };
}

export async function fetchRadarFrames(
  latitude: number,
  longitude: number
): Promise<RadarFrame[]> {
  let data: RainViewerMapsPayload;
  try {
    data = await fetchJsonWithTimeout<RainViewerMapsPayload>(MAPS_URL, { timeoutMs: 15000 });
  } catch {
    return [];
  }
  const past = data?.radar?.past;
  if (!Array.isArray(past) || past.length === 0) return [];
  const host = data.host ?? '';
  const size = '512';
  const zoom = '4';
  const colorScheme = '2';
  const options = '1_1';
  const pathTemplate = `${size}/${zoom}/${latitude}/${longitude}/${colorScheme}/${options}.png`;
  return past.map((frame: { time: number; path: string }) => {
    const path = frame.path.endsWith('/') ? frame.path : frame.path + '/';
    const imageURL = host + path + pathTemplate;
    return { time: new Date(frame.time * 1000), imageURL };
  });
}
