import React, { useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { MIN_TOUCH_TARGET } from '../../theme/tokens';
import { useA11y } from '../../accessibility/A11yContext';

// Hick's law: keep 1-2 primary actions visible, move rarer ones behind a ⋮ button.
// Opens as a bottom sheet with full-width rows: easier to hit one-handed than a small dropdown.
export type MenuItem = {
  key: string;
  label: string;
  icon: React.ComponentProps<typeof MaterialIcons>['name'];
  destructive?: boolean;
  onPress: () => void;
};

export default function OverflowMenu({
  items,
  title,
  accessibilityLabel,
}: {
  items: MenuItem[];
  title: string;
  accessibilityLabel: string;
}) {
  const [open, setOpen] = useState(false);
  const { prefs } = useA11y();

  return (
    <>
      <Pressable
        onPress={() => setOpen(true)}
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel}
        hitSlop={4}
        style={({ pressed }) => [styles.trigger, pressed && styles.pressed]}
      >
        <MaterialIcons name="more-vert" size={22} color={prefs.highContrast ? '#ffffff' : '#8b949e'} />
      </Pressable>

      <Modal
        visible={open}
        transparent
        animationType={prefs.reduceMotion ? 'none' : 'slide'}
        onRequestClose={() => setOpen(false)}
        statusBarTranslucent
      >
        <View style={styles.overlay}>
          <Pressable
            style={StyleSheet.absoluteFill}
            onPress={() => setOpen(false)}
            accessibilityRole="button"
            accessibilityLabel="Close menu"
          />
          <View style={styles.sheet}>
            <View style={styles.grabber} />
            <Text style={styles.title} accessibilityRole="header" numberOfLines={1}>
              {title}
            </Text>
            {items.map((item) => (
              <Pressable
                key={item.key}
                onPress={() => {
                  setOpen(false);
                  item.onPress();
                }}
                accessibilityRole="button"
                style={({ pressed }) => [styles.item, pressed && styles.itemPressed]}
              >
                <MaterialIcons name={item.icon} size={22} color={item.destructive ? '#f85149' : '#58a6ff'} />
                <Text style={[styles.itemText, item.destructive && styles.itemTextDestructive]}>{item.label}</Text>
              </Pressable>
            ))}
            <Pressable
              onPress={() => setOpen(false)}
              accessibilityRole="button"
              style={({ pressed }) => [styles.cancel, pressed && styles.pressed]}
            >
              <Text style={styles.cancelText}>Cancel</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  trigger: {
    width: MIN_TOUCH_TARGET - 8,
    height: MIN_TOUCH_TARGET - 8,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: '#161b22',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    borderWidth: 1,
    borderBottomWidth: 0,
    borderColor: '#30363d',
    paddingHorizontal: 12,
    paddingTop: 8,
    paddingBottom: 24,
    gap: 4,
  },
  grabber: {
    alignSelf: 'center',
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#30363d',
    marginBottom: 6,
  },
  title: {
    color: '#8b949e',
    fontSize: 12,
    fontFamily: 'Montserrat_700Bold',
    letterSpacing: 0.8,
    paddingHorizontal: 8,
    paddingBottom: 6,
    textTransform: 'uppercase',
  },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    minHeight: 56,
    paddingHorizontal: 12,
    borderRadius: 10,
  },
  itemPressed: { backgroundColor: '#21262d' },
  itemText: { color: '#c9d1d9', fontSize: 16, fontFamily: 'Montserrat_700Bold' },
  itemTextDestructive: { color: '#f85149' },
  cancel: {
    marginTop: 6,
    minHeight: 52,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#30363d',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelText: { color: '#8b949e', fontSize: 14, fontFamily: 'Montserrat_700Bold' },
  pressed: { opacity: 0.75 },
});
