import AsyncStorage from '@react-native-async-storage/async-storage';

// Listen lokal speichern (wenn nicht angemeldet)
export const saveListsLocally = async (lists) => {
  try {
    const jsonValue = JSON.stringify(lists);
    await AsyncStorage.setItem('local_lists', jsonValue);
  } catch (e) {
    // saving error
    console.error("Failed to save lists to async storage", e);
  }
};

// Listen lokal laden
export const loadListsLocally = async () => {
  try {
    const jsonValue = await AsyncStorage.getItem('local_lists');
    return jsonValue != null ? JSON.parse(jsonValue) : [];
  } catch (e) {
    // error reading value
    console.error("Failed to load lists from async storage", e);
    return [];
  }
};
