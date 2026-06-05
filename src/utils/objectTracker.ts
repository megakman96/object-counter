import { Detection, TrackedObject } from '../types';

const MATCH_THRESHOLD = 0.28; // max normalized distance to match a detection to a track
const MAX_AGE_MS = 2500;       // remove tracks unseen for this long
const MIN_TRACK_MS = 1200;     // minimum track duration to count on disappearance

export class ObjectTracker {
  private objects = new Map<string, TrackedObject>();
  private nextId = 0;
  private count = 0;

  update(detections: Detection[]): { count: number; active: TrackedObject[] } {
    const now = Date.now();

    // Expire stale tracks, counting them if they were alive long enough
    for (const [id, obj] of this.objects) {
      if (now - obj.lastSeen > MAX_AGE_MS) {
        const duration = obj.lastSeen - obj.firstSeen;
        if (!obj.counted && duration >= MIN_TRACK_MS) {
          this.count++;
        }
        this.objects.delete(id);
      }
    }

    const matched = new Set<string>();

    for (const det of detections) {
      let bestId: string | null = null;
      let bestDist = MATCH_THRESHOLD;

      for (const [id, obj] of this.objects) {
        if (matched.has(id)) continue;
        const d = Math.hypot(det.x - obj.x, det.y - obj.y);
        if (d < bestDist) {
          bestDist = d;
          bestId = id;
        }
      }

      if (bestId) {
        const obj = this.objects.get(bestId)!;
        const newSide: 'left' | 'right' = det.x < 0.5 ? 'left' : 'right';

        // Count when crossing the vertical center line for the first time
        if (!obj.counted && obj.side !== newSide) {
          this.count++;
          obj.counted = true;
        }

        obj.x = det.x;
        obj.y = det.y;
        obj.w = det.w ?? 0.18;
        obj.h = det.h ?? 0.18;
        obj.lastSeen = now;
        obj.side = newSide;
        matched.add(bestId);
      } else {
        const id = `t${this.nextId++}`;
        this.objects.set(id, {
          id,
          x: det.x,
          y: det.y,
          w: det.w ?? 0.18,
          h: det.h ?? 0.18,
          firstSeen: now,
          lastSeen: now,
          counted: false,
          side: det.x < 0.5 ? 'left' : 'right',
        });
      }
    }

    return { count: this.count, active: Array.from(this.objects.values()) };
  }

  getCount(): number {
    return this.count;
  }

  reset(): void {
    this.objects.clear();
    this.count = 0;
    this.nextId = 0;
  }
}
