import React from 'react';
import { MaterialIcons } from '@expo/vector-icons';
import { Pressable, StyleSheet, Text, View } from 'react-native';

const tabs = [
  { key: 'home', label: 'Workouts', icon: 'fitness-center' },
  { key: 'history', label: 'History', icon: 'history' },
  { key: 'account', label: 'Account', icon: 'person' },
];

export default function TabBar({ activeTab, setActiveTab }: { activeTab: string; setActiveTab: (k: any) => void }) {
  return (
    <View style={styles.tabBar}>
      {tabs.map((tab) => {
        const isActive = activeTab === tab.key;

        return (
          <Pressable
            key={tab.key}
            onPress={() => setActiveTab(tab.key)}
            style={({ pressed }) => [styles.tabItem, isActive && styles.tabItemActive, pressed && styles.pressed]}
          >
            <MaterialIcons name={tab.icon as any} size={22} color={isActive ? '#58a6ff' : '#8b949e'} />
            <Text style={[styles.tabLabel, isActive && styles.tabLabelActive]}>{tab.label}</Text>
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
    width: 66,
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
