import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

export default function Account() {
  return (
    <View style={styles.placeholderCard}>
      <Text style={styles.placeholderTitle}>Account</Text>
      <Text style={styles.placeholderText}>Profile and account options will appear here.</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  placeholderCard: { flex: 1, backgroundColor: '#161b22', borderColor: '#30363d', borderWidth: 1, borderRadius: 18, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 24, gap: 8 },
  placeholderTitle: { color: '#f0f6fc', fontSize: 20, fontWeight: '700', textAlign: 'center' },
  placeholderText: { color: '#8b949e', fontSize: 14, lineHeight: 20, textAlign: 'center' },
});
