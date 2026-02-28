import AsyncStorage from '@react-native-async-storage/async-storage';

const KEYS = {
  TOKEN: '@carenearby/token',
  USER: '@carenearby/user',
  PHOTO_URI: '@carenearby/photo_uri',
  DOCUMENTS: '@carenearby/documents',
  LANG: '@carenearby/lang',
} as const;

export interface StoredDocument {
  id: string;
  label: string;
  uri: string;
  uploadedAt: string;
}

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

  async getDocuments(): Promise<StoredDocument[]> {
    const raw = await AsyncStorage.getItem(KEYS.DOCUMENTS);
    if (!raw) return [];
    try { return JSON.parse(raw) as StoredDocument[]; } catch { return []; }
  },

  async saveDocument(doc: StoredDocument): Promise<void> {
    const docs = await Storage.getDocuments();
    const idx = docs.findIndex(d => d.id === doc.id);
    if (idx >= 0) docs[idx] = doc; else docs.push(doc);
    await AsyncStorage.setItem(KEYS.DOCUMENTS, JSON.stringify(docs));
  },

  async removeDocument(id: string): Promise<void> {
    const docs = await Storage.getDocuments();
    await AsyncStorage.setItem(KEYS.DOCUMENTS, JSON.stringify(docs.filter(d => d.id !== id)));
  },

  async clearDocuments(): Promise<void> {
    await AsyncStorage.removeItem(KEYS.DOCUMENTS);
  },

  async saveLang(lang: string): Promise<void> {
    await AsyncStorage.setItem(KEYS.LANG, lang);
  },

  async getLang(): Promise<string | null> {
    return AsyncStorage.getItem(KEYS.LANG);
  },
};
