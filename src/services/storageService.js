import { openDB } from 'idb';

const DB_NAME = 'NamazVakitleriDB';
const DB_VERSION = 2;
const STORE_TIMES = 'monthly_times';
const STORE_SETTINGS = 'settings';
const STORE_AUDIO = 'custom_audio';

export async function getDb() {
  return openDB(DB_NAME, DB_VERSION, {
    upgrade(db, oldVersion) {
      if (!db.objectStoreNames.contains(STORE_TIMES)) {
        db.createObjectStore(STORE_TIMES, { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains(STORE_SETTINGS)) {
        db.createObjectStore(STORE_SETTINGS, { keyPath: 'key' });
      }
      if (!db.objectStoreNames.contains(STORE_AUDIO)) {
        db.createObjectStore(STORE_AUDIO, { keyPath: 'id' });
      }
    }
  });
}

/**
 * Aylık vakitleri veritabanına kaydeder
 */
export async function saveMonthlyTimesToDb(cityId, monthlyTimes) {
  try {
    const db = await getDb();
    const tx = db.transaction(STORE_TIMES, 'readwrite');
    await tx.store.put({
      id: cityId,
      cityId,
      savedAt: new Date().toISOString(),
      data: monthlyTimes
    });
    await tx.done;
  } catch (e) {
    console.warn('DB save error:', e);
  }
}

/**
 * Şehir için kaydedilmiş vakitleri getirir
 */
export async function getMonthlyTimesFromDb(cityId) {
  try {
    const db = await getDb();
    const record = await db.get(STORE_TIMES, cityId);
    return record ? record.data : null;
  } catch (e) {
    return null;
  }
}

/**
 * Ayarları veritabanına kaydeder
 */
export async function saveSetting(key, value) {
  try {
    const db = await getDb();
    await db.put(STORE_SETTINGS, { key, value });
  } catch (e) {
    localStorage.setItem('nv_' + key, JSON.stringify(value));
  }
}

/**
 * Ayarı getirir
 */
export async function getSetting(key, defaultValue = null) {
  try {
    const db = await getDb();
    const res = await db.get(STORE_SETTINGS, key);
    if (res !== undefined) return res.value;
    const local = localStorage.getItem('nv_' + key);
    return local ? JSON.parse(local) : defaultValue;
  } catch (e) {
    const local = localStorage.getItem('nv_' + key);
    return local ? JSON.parse(local) : defaultValue;
  }
}

/**
 * Telefondan yüklenen özel ses dosyasını kaydeder
 */
export async function saveCustomAudio(id, name, dataUrl) {
  try {
    const db = await getDb();
    await db.put(STORE_AUDIO, { id, name, dataUrl, date: new Date().toISOString() });
    return true;
  } catch (e) {
    console.error('Audio save error:', e);
    return false;
  }
}

/**
 * Özel ses dosyasını getirir
 */
export async function getCustomAudio(id = 'default_custom') {
  try {
    const db = await getDb();
    return await db.get(STORE_AUDIO, id);
  } catch (e) {
    return null;
  }
}

/**
 * Özel ses dosyasını siler
 */
export async function deleteCustomAudio(id = 'default_custom') {
  try {
    const db = await getDb();
    await db.delete(STORE_AUDIO, id);
    return true;
  } catch (e) {
    return false;
  }
}
