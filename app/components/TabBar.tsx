import React from 'react';
import { MaterialIcons } from '@expo/vector-icons';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useA11y } from '../accessibility/A11yContext';

const tabs = [
  { key: 'home', label: 'Workouts', icon: 'fitness-center' },
  { key: 'history', label: 'History', icon: 'history' },
  { key: 'account', label: 'Account', icon: 'person' },
];

export default function TabBar({ activeTab, setActiveTab }: { activeTab: string; setActiveTab: (k: any) => void }) {
  const { prefs, colors } = useA11y();
  const hc = prefs.highContrast;

  return (
    <View style={[styles.tabBar, hc && hcStyles.tabBar]} accessibilityRole="tablist">
      {tabs.map((tab) => {
        const isActive = activeTab === tab.key;

        return (
          <Pressable
            key={tab.key}
            onPress={() => setActiveTab(tab.key)}
            accessibilityRole="tab"
            accessibilityLabel={tab.label}
            accessibilityState={{ selected: isActive }}
            style={({ pressed }) => [
              styles.tabItem,
              isActive && styles.tabItemActive,
              isActive && hc && hcStyles.tabItemActive,
              pressed && styles.pressed,
            ]}
          >
            <MaterialIcons
              name={tab.icon as any}
              size={22}
              color={isActive ? colors.accent : colors.muted}
            />
            <Text
              maxFontSizeMultiplier={1.3}
              style={[styles.tabLabel, hc && hcStyles.tabLabel, isActive && styles.tabLabelActive, isActive && hc && hcStyles.tabLabelActive]}
            >
              {tab.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    marginHorizontal: -16,
    paddingHorizontal: 28,
    paddingTop: 8,
    paddingBottom: 14,
    backgroundColor: '#0f1720',
    borderColor: '#2a3139',
    borderTopWidth: 1,
  },
  tabItem: {
    minWidth: 66,
    minHeight: 50,
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 4,
    borderTopWidth: 2,
    borderTopColor: 'transparent',
  },
  tabItemActive: {
    borderTopColor: '#58a6ff',
  },
  tabLabel: {
    color: '#8b949e',
    fontSize: 9,
    fontFamily: 'Montserrat_700Bold',
  },
  tabLabelActive: {
    color: '#58a6ff',
  },
  pressed: { opacity: 0.75 },
});

// High contrast overrides (highContrastPalette in tokens.ts).
const hcStyles = StyleSheet.create({
  tabBar: { backgroundColor: '#000000', borderColor: '#d0d7de' },
  tabItemActive: { borderTopColor: '#79c0ff' },
  tabLabel: { color: '#d0d7de', fontSize: 10 },
  tabLabelActive: { color: '#79c0ff' },
});
