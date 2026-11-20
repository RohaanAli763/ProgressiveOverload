// Gyms often have bad signal (situational constraint). Queue writes locally and flush when online.
// TODO: persist in AsyncStorage, flush via workoutService when @react-native-community/netinfo reports online.
export type QueuedWrite = { id: string; kind: 'saveSets' | 'updateDay'; payload: unknown; createdAt: string };

export function enqueue(_write: QueuedWrite): void {}
export async function flush(): Promise<void> {}
