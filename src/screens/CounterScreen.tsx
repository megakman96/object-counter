import React, { useRef, useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  Animated,
} from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList, TrackedObject } from '../types';
import { detectObjects } from '../utils/claudeApi';
import { ObjectTracker } from '../utils/objectTracker';

type Props = NativeStackScreenProps<RootStackParamList, 'Counter'>;

const { width: SW, height: SH } = Dimensions.get('window');
const POLL_INTERVAL_MS = 2200;

export default function CounterScreen({ route, navigation }: Props) {
  const { objectClass } = route.params;
  const cameraRef = useRef<CameraView>(null);
  const trackerRef = useRef(new ObjectTracker());
  const [permission] = useCameraPermissions();
  const [count, setCount] = useState(0);
  const [active, setActive] = useState<TrackedObject[]>([]);
  const [scanning, setScanning] = useState(false);
  const [cameraReady, setCameraReady] = useState(false);
  const busyRef = useRef(false);
  const cancelledRef = useRef(false);
  const countAnim = useRef(new Animated.Value(1)).current;
  const prevCountRef = useRef(0);
  const insets = useSafeAreaInsets();

  const animateCount = useCallback(() => {
    Animated.sequence([
      Animated.timing(countAnim, { toValue: 1.5, duration: 120, useNativeDriver: true }),
      Animated.timing(countAnim, { toValue: 1, duration: 160, useNativeDriver: true }),
    ]).start();
  }, [countAnim]);

  const runDetection = useCallback(async () => {
    if (busyRef.current || !cameraRef.current || !cameraReady) return;
    busyRef.current = true;
    setScanning(true);
    try {
      const photo = await cameraRef.current.takePictureAsync({
        quality: 0.35,
        base64: true,
        exif: false,
      });
      if (cancelledRef.current || !photo?.base64) return;
      const detections = await detectObjects(photo.base64, objectClass);
      if (cancelledRef.current) return;
      const result = trackerRef.current.update(detections);
      setActive([...result.active]);
      setCount(result.count);
      if (result.count > prevCountRef.current) animateCount();
      prevCountRef.current = result.count;
    } catch {
      // silently continue
    } finally {
      busyRef.current = false;
      setScanning(false);
    }
  }, [objectClass, cameraReady, animateCount]);

  // Detection loop: wait for completion, then schedule next poll
  useEffect(() => {
    cancelledRef.current = false;
    let timeout: ReturnType<typeof setTimeout>;
    const loop = async () => {
      if (cancelledRef.current) return;
      await runDetection();
      if (!cancelledRef.current) timeout = setTimeout(loop, POLL_INTERVAL_MS);
    };
    const start = setTimeout(loop, 800);
    return () => {
      cancelledRef.current = true;
      clearTimeout(start);
      clearTimeout(timeout);
    };
  }, [runDetection]);

  const handleReset = () => {
    trackerRef.current.reset();
    setCount(0);
    prevCountRef.current = 0;
    setActive([]);
  };

  if (!permission?.granted) {
    return (
      <View style={styles.center}>
        <Text style={styles.errorText}>Camera permission required</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <CameraView
        ref={cameraRef}
        style={StyleSheet.absoluteFill}
        facing="back"
        onCameraReady={() => setCameraReady(true)}
      />

      {/* Vertical counting line */}
      <View style={styles.countLine} />

      {/* Bounding boxes for tracked objects */}
      {active.map(obj => {
        const bw = obj.w * SW;
        const bh = obj.h * SH;
        return (
          <View
            key={obj.id}
            style={[
              styles.bbox,
              {
                left: obj.x * SW - bw / 2,
                top: obj.y * SH - bh / 2,
                width: bw,
                height: bh,
              },
              obj.counted ? styles.bboxCounted : styles.bboxActive,
            ]}
          >
            <View style={[styles.bboxCorner, styles.bboxTL]} />
            <View style={[styles.bboxCorner, styles.bboxTR]} />
            <View style={[styles.bboxCorner, styles.bboxBL]} />
            <View style={[styles.bboxCorner, styles.bboxBR]} />
          </View>
        );
      })}

      {/* Top HUD */}
      <View style={[styles.topHud, { paddingTop: insets.top + 8 }]}>
        <View style={styles.counterCard}>
          <Text style={styles.counterLabel}>{objectClass}</Text>
          <Animated.Text
            style={[styles.counterValue, { transform: [{ scale: countAnim }] }]}
          >
            {count}
          </Animated.Text>
          <Text style={styles.counterSublabel}>counted</Text>
        </View>
        {scanning && (
          <View style={styles.scanBadge}>
            <Text style={styles.scanText}>Scanning...</Text>
          </View>
        )}
      </View>

      {/* Bottom HUD */}
      <View style={[styles.bottomHud, { paddingBottom: insets.bottom + 16 }]}>
        <Text style={styles.lineHint}>Objects crossing the yellow line are counted</Text>
        <View style={styles.bottomButtons}>
          <TouchableOpacity style={styles.resetBtn} onPress={handleReset}>
            <Text style={styles.resetText}>Reset</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.newBtn}
            onPress={() => navigation.navigate('Capture')}
          >
            <Text style={styles.newText}>New Object</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  center: {
    flex: 1,
    backgroundColor: '#0a0a0a',
    alignItems: 'center',
    justifyContent: 'center',
  },
  errorText: {
    color: '#fff',
    fontSize: 16,
  },
  countLine: {
    position: 'absolute',
    left: SW / 2 - 1,
    top: 0,
    bottom: 0,
    width: 2,
    backgroundColor: 'rgba(255, 230, 0, 0.65)',
  },
  bbox: {
    position: 'absolute',
  },
  bboxActive: {
    borderWidth: 0, // corners only
  },
  bboxCounted: {
    borderWidth: 0,
  },
  bboxCorner: {
    position: 'absolute',
    width: 14,
    height: 14,
  },
  bboxTL: {
    top: 0,
    left: 0,
    borderTopWidth: 3,
    borderLeftWidth: 3,
    borderColor: '#00ff88',
  },
  bboxTR: {
    top: 0,
    right: 0,
    borderTopWidth: 3,
    borderRightWidth: 3,
    borderColor: '#00ff88',
  },
  bboxBL: {
    bottom: 0,
    left: 0,
    borderBottomWidth: 3,
    borderLeftWidth: 3,
    borderColor: '#00ff88',
  },
  bboxBR: {
    bottom: 0,
    right: 0,
    borderBottomWidth: 3,
    borderRightWidth: 3,
    borderColor: '#00ff88',
  },
  topHud: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    alignItems: 'center',
    paddingHorizontal: 20,
    gap: 8,
  },
  counterCard: {
    backgroundColor: 'rgba(0,0,0,0.65)',
    borderRadius: 20,
    paddingHorizontal: 28,
    paddingVertical: 14,
    alignItems: 'center',
    minWidth: 160,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
  },
  counterLabel: {
    color: 'rgba(255,255,255,0.65)',
    fontSize: 14,
    fontWeight: '500',
    textTransform: 'capitalize',
  },
  counterValue: {
    color: '#fff',
    fontSize: 72,
    fontWeight: '800',
    lineHeight: 80,
    letterSpacing: -2,
  },
  counterSublabel: {
    color: 'rgba(255,255,255,0.4)',
    fontSize: 12,
    marginTop: -4,
  },
  scanBadge: {
    backgroundColor: 'rgba(0,200,100,0.25)',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: 'rgba(0,200,100,0.4)',
  },
  scanText: {
    color: '#00c864',
    fontSize: 12,
    fontWeight: '600',
  },
  bottomHud: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 20,
  },
  lineHint: {
    color: 'rgba(255,255,255,0.55)',
    fontSize: 12,
    backgroundColor: 'rgba(0,0,0,0.4)',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 10,
    overflow: 'hidden',
    textAlign: 'center',
  },
  bottomButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  resetBtn: {
    backgroundColor: 'rgba(255,60,60,0.85)',
    borderRadius: 14,
    paddingHorizontal: 28,
    paddingVertical: 14,
  },
  resetText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 15,
  },
  newBtn: {
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: 14,
    paddingHorizontal: 28,
    paddingVertical: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.25)',
  },
  newText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 15,
  },
});
