import React from 'react';
import { Linking, Modal, Platform, Pressable, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useA11y } from '../accessibility/A11yContext';
import { WEIGHT_STEPS, type A11yPrefs } from '../lib/a11yPrefs';
import { formatValue } from '../lib/wheel';

type BoolKey = { [K in keyof A11yPrefs]: A11yPrefs[K] extends boolean ? K : never }[keyof A11yPrefs];

const TOGGLES: { key: BoolKey; icon: React.ComponentProps<typeof MaterialIcons>['name']; title: string; detail: string }[] = [
  {
    key: 'highContrast',
    icon: 'contrast',
    title: 'High contrast',
    detail: 'Black background and brighter text on the workout screens. Helps in bright gyms and with low vision.',
  },
  {
    key: 'leftHanded',
    icon: 'back-hand',
    title: 'Left-handed layout',
    detail: 'Moves Save and Skip to the left side, under your left thumb.',
  },
  {
    key: 'voiceInput',
    icon: 'mic',
    title: 'Voice input',
    detail: 'Adds a mic to the weight and reps panel. Say "80 by 8", or "80 by 8 save" to log it hands-free.',
  },
  {
    key: 'haptics',
    icon: 'vibration',
    title: 'Vibration',
    detail: 'Ticks on the number wheels, a buzz when a set saves and when rest ends.',
  },
  {
    key: 'audioCues',
    icon: 'record-voice-over',
    title: 'Spoken rest alerts',
    detail: 'Says "Rest over" out loud when the rest timer ends.',
  },
  {
    key: 'reduceMotion',
    icon: 'motion-photos-off',
    title: 'Reduce motion',
    detail: 'Turns off sliding sheets and chart animations.',
  },
];

// Every accessibility preference in one place, opened from the Account tab.
export default function AccessibilitySettings({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const { prefs, setPref } = useA11y();
  const insets = useSafeAreaInsets();

  const openDisplaySettings = () => {
    const fallback = () => Linking.openSettings().catch(() => {});
    if (Platform.OS === 'android') {
      Linking.sendIntent('android.settings.DISPLAY_SETTINGS').catch(fallback);
    } else {
      fallback();
    }
  };

  return (
    <Modal
      visible={visible}
      animationType={prefs.reduceMotion ? 'none' : 'slide'}
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <View style={[styles.root, { paddingTop: insets.top }]}>
        <View style={styles.header}>
          <Pressable
            onPress={onClose}
            accessibilityRole="button"
            accessibilityLabel="Back to account"
            style={({ pressed }) => [styles.backBtn, pressed && styles.pressed]}
          >
            <MaterialIcons name="arrow-back" size={22} color="#58a6ff" />
            <Text style={styles.backText}>Back</Text>
          </Pressable>
        </View>

        <ScrollView contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 32 }]}>
          <Text style={styles.title} accessibilityRole="header">
            ACCESSIBILITY
          </Text>

          <View style={styles.card}>
            {TOGGLES.map((t, i) => (
              <Pressable
                key={t.key}
                onPress={() => setPref(t.key, !prefs[t.key])}
                accessibilityRole="switch"
                accessibilityState={{ checked: prefs[t.key] }}
                accessibilityLabel={t.title}
                accessibilityHint={t.detail}
                style={({ pressed }) => [styles.row, i > 0 && styles.rowBorder, pressed && styles.rowPressed]}
              >
                <MaterialIcons name={t.icon} size={22} color="#58a6ff" />
                <View style={styles.rowText}>
                  <Text style={styles.rowTitle}>{t.title}</Text>
                  <Text style={styles.rowDetail}>{t.detail}</Text>
                </View>
                {/* Visual only: the whole row is the touch target and the accessible switch */}
                <View importantForAccessibility="no-hide-descendants" pointerEvents="none">
                  <Switch
                    value={prefs[t.key]}
                    trackColor={{ false: '#30363d', true: '#238636' }}
                    thumbColor={prefs[t.key] ? '#ffffff' : '#8b949e'}
                  />
                </View>
              </Pressable>
            ))}
          </View>

          <Text style={styles.sectionTitle}>WEIGHT WHEEL STEP</Text>
          <View style={styles.card}>
            <Text style={styles.rowDetail}>How many kg one notch of the weight wheel moves.</Text>
            <View style={styles.segment} accessibilityRole="radiogroup">
              {WEIGHT_STEPS.map((step) => {
                const selected = prefs.weightStep === step;
                return (
                  <Pressable
                    key={step}
                    onPress={() => setPref('weightStep', step)}
                    accessibilityRole="radio"
                    accessibilityState={{ checked: selected }}
                    accessibilityLabel={`${formatValue(step)} kilograms`}
                    style={({ pressed }) => [styles.segBtn, selected && styles.segBtnActive, pressed && styles.pressed]}
                  >
                    <Text style={[styles.segText, selected && styles.segTextActive]}>{formatValue(step)}</Text>
                  </Pressable>
                );
              })}
            </View>
          </View>

          <Text style={styles.sectionTitle}>TEXT SIZE</Text>
          <View style={styles.card}>
            <Text style={styles.rowDetail}>
              GymYaki follows your phone&apos;s font size, so bigger text works everywhere, including other apps.
            </Text>
            <Pressable
              onPress={openDisplaySettings}
              accessibilityRole="button"
              style={({ pressed }) => [styles.linkBtn, pressed && styles.pressed]}
            >
              <MaterialIcons name="text-fields" size={20} color="#58a6ff" />
              <Text style={styles.linkText}>Open phone display settings</Text>
            </Pressable>
          </View>
        </ScrollView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#0b141c' },
  header: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#21262d',
  },
  backBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, minHeight: 48, alignSelf: 'flex-start' },
  backText: { color: '#58a6ff', fontSize: 14, fontFamily: 'Montserrat_700Bold' },
  content: { padding: 16, gap: 12 },
  title: { color: '#c9d1d9', fontSize: 26, fontFamily: 'Montserrat_900Black', letterSpacing: 1 },
  sectionTitle: { color: '#8b949e', fontSize: 11, fontFamily: 'Montserrat_700Bold', letterSpacing: 1, marginTop: 8 },
  card: {
    backgroundColor: '#161b22',
    borderWidth: 1,
    borderColor: '#30363d',
    borderRadius: 12,
    padding: 12,
    gap: 10,
  },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 64, paddingVertical: 8 },
  rowBorder: { borderTopWidth: 1, borderTopColor: '#21262d' },
  rowPressed: { opacity: 0.75 },
  rowText: { flex: 1, gap: 2 },
  rowTitle: { color: '#c9d1d9', fontSize: 15, fontFamily: 'Montserrat_700Bold' },
  rowDetail: { color: '#8b949e', fontSize: 12, lineHeight: 17, fontFamily: 'Montserrat_400Regular' },
  segment: { flexDirection: 'row', gap: 8 },
  segBtn: {
    flex: 1,
    minHeight: 48,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#30363d',
    alignItems: 'center',
    justifyContent: 'center',
  },
  segBtnActive: { backgroundColor: 'rgba(88, 166, 255, 0.15)', borderColor: '#58a6ff' },
  segText: { color: '#8b949e', fontSize: 15, fontFamily: 'Montserrat_700Bold' },
  segTextActive: { color: '#58a6ff' },
  linkBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    minHeight: 48,
    paddingHorizontal: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(88, 166, 255, 0.35)',
    backgroundColor: 'rgba(88, 166, 255, 0.1)',
  },
  linkText: { color: '#58a6ff', fontSize: 14, fontFamily: 'Montserrat_700Bold' },
  pressed: { opacity: 0.75 },
});
