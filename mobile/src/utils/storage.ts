import AsyncStorage from '@react-native-async-storage/async-storage';

const KEYS = {
  TOKEN: '@carenearby/token',
  USER: '@carenearby/user',
  PHOTO_URI: '@carenearby/photo_uri',
} as const;

export interface StoredUser {
  id: string;
  name: string;
  phone: string;
  role: 'CUSTOMER' | 'PSW' | 'ADMIN';
  onboardingComplete?: boolean;
}

export const Storage = {
  async saveAuth(token: string, user: StoredUser): Promise<void> {
    await AsyncStorage.multiSet([
      [KEYS.TOKEN, token],
      [KEYS.USER, JSON.stringify(user)],
    ]);
  },

  async getToken(): Promise<string | null> {
    return AsyncStorage.getItem(KEYS.TOKEN);
  },

  async getUser(): Promise<StoredUser | null> {
    const raw = await AsyncStorage.getItem(KEYS.USER);
    if (!raw) return null;
    try {
      return JSON.parse(raw) as StoredUser;
    } catch {
      return null;
    }
  },

  async clearAuth(): Promise<void> {
    await AsyncStorage.multiRemove([KEYS.TOKEN, KEYS.USER]);
  },

  async savePhotoUri(uri: string): Promise<void> {
    await AsyncStorage.setItem(KEYS.PHOTO_URI, uri);
  },

  async getPhotoUri(): Promise<string | null> {
    return AsyncStorage.getItem(KEYS.PHOTO_URI);
  },

  async clearPhotoUri(): Promise<void> {
    await AsyncStorage.removeItem(KEYS.PHOTO_URI);
  },
};
