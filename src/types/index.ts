export type RootStackParamList = {
  Setup: undefined;
  Capture: undefined;
  Confirm: { imageUri: string; objectClass: string };
  Counter: { objectClass: string };
};

export interface Detection {
  x: number; // normalized 0-1, center x
  y: number; // normalized 0-1, center y
  w?: number; // normalized width (optional)
  h?: number; // normalized height (optional)
}

export interface TrackedObject {
  id: string;
  x: number;
  y: number;
  w: number;
  h: number;
  firstSeen: number;
  lastSeen: number;
  counted: boolean;
  side: 'left' | 'right';
}
