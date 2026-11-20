import React from 'react';
import { View } from 'react-native';

// Hick's law: keep 1-2 primary actions visible, move rare ones (edit, delete, reorder, note) behind a menu.
// TODO: implement (see todo.txt "⋮ menu")
export type MenuItem = { key: string; label: string; icon: string; destructive?: boolean; onPress: () => void };

export default function OverflowMenu(_props: { items: MenuItem[]; accessibilityLabel: string }) {
  return <View />;
}
