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
    paddingTop: 10,
    paddingBottom: 16,
    backgroundColor: '#161b22',
    borderColor: '#30363d',
    borderTopWidth: 1,
  },
  tabItem: {
    width: 64,
    minHeight: 52,
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 6,
    borderTopWidth: 2,
    borderTopColor: 'transparent',
  },
  tabItemActive: {
    borderTopColor: '#58a6ff',
  },
  tabLabel: {
    color: '#8b949e',
    fontSize: 10,
    fontFamily: 'Montserrat_700Bold',
  },
  tabLabelActive: {
    color: '#58a6ff',
  },
  pressed: { opacity: 0.75 },
});
