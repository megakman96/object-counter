import React, { useState } from 'react';
import {
  View,
  Text,
  Image,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../types';

type Props = NativeStackScreenProps<RootStackParamList, 'Confirm'>;

export default function ConfirmScreen({ navigation, route }: Props) {
  const { imageUri, objectClass: initialClass } = route.params;
  const [objectClass, setObjectClass] = useState(initialClass);
  const insets = useSafeAreaInsets();

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <Image source={{ uri: imageUri }} style={StyleSheet.absoluteFill} resizeMode="cover" />
      <View style={styles.scrim} />

      <View style={[styles.card, { paddingBottom: insets.bottom + 20 }]}>
        <Text style={styles.cardTitle}>Identified Object</Text>
        <TextInput
          style={styles.input}
          value={objectClass}
          onChangeText={setObjectClass}
          placeholder="Object name..."
          placeholderTextColor="#555"
          autoCapitalize="none"
          autoCorrect={false}
          selectTextOnFocus
        />
        <Text style={styles.editHint}>Edit above if Claude got it wrong</Text>

        <View style={styles.buttons}>
          <TouchableOpacity
            style={[styles.btn, styles.btnSecondary]}
            onPress={() => navigation.goBack()}
          >
            <Text style={styles.btnSecondaryText}>Retake</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.btn, styles.btnPrimary, !objectClass.trim() && styles.btnDisabled]}
            onPress={() => navigation.navigate('Counter', { objectClass: objectClass.trim() })}
            disabled={!objectClass.trim()}
          >
            <Text style={styles.btnPrimaryText}>Start Counting!</Text>
          </TouchableOpacity>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
    justifyContent: 'flex-end',
  },
  scrim: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  card: {
    backgroundColor: '#111',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingTop: 24,
    paddingHorizontal: 24,
    gap: 14,
  },
  cardTitle: {
    color: '#fff',
    fontSize: 20,
    fontWeight: '700',
    textAlign: 'center',
  },
  input: {
    backgroundColor: '#222',
    color: '#fff',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 22,
    fontWeight: '600',
    textAlign: 'center',
  },
  editHint: {
    color: '#555',
    fontSize: 12,
    textAlign: 'center',
    marginTop: -6,
  },
  buttons: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 4,
  },
  btn: {
    flex: 1,
    paddingVertical: 16,
    borderRadius: 14,
    alignItems: 'center',
  },
  btnPrimary: {
    backgroundColor: '#fff',
  },
  btnPrimaryText: {
    color: '#000',
    fontSize: 15,
    fontWeight: '700',
  },
  btnSecondary: {
    backgroundColor: '#2a2a2a',
  },
  btnSecondaryText: {
    color: '#ccc',
    fontSize: 15,
    fontWeight: '600',
  },
  btnDisabled: {
    opacity: 0.35,
  },
});
