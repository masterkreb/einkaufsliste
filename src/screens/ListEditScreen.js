import React, { useState, useEffect, useLayoutEffect } from 'react';
import { View, FlatList, StyleSheet, Modal } from 'react-native';
import { IconButton, TextInput, Checkbox, Text, Button } from 'react-native-paper';
import { auth, db } from '../services/firebase';
import { doc, getDoc, updateDoc, onSnapshot, arrayUnion } from 'firebase/firestore';
import * as Haptics from 'expo-haptics';
import BarcodeScannerComponent from '../components/BarcodeScanner';

export default function ListEditScreen({ route, navigation }) {
  const { listId, listName: initialListName } = route.params;
  const [articles, setArticles] = useState([]);
  const [newArticleName, setNewArticleName] = useState('');
  const [newArticleQuantity, setNewArticleQuantity] = useState(''); // State for the quantity
  const [editableListName, setEditableListName] = useState(initialListName);
  const [isBarcodeModalVisible, setIsBarcodeModalVisible] = useState(false);

  useEffect(() => {
    setEditableListName(initialListName);
  }, [initialListName]);

  useLayoutEffect(() => {
    navigation.setOptions({
      headerTitle: () => (
        <TextInput
          value={editableListName}
          onChangeText={setEditableListName}
          style={styles.headerInput}
          onBlur={updateListName}
        />
      ),
    });
  }, [navigation, editableListName, updateListName]);

  useEffect(() => {
    const listRef = doc(db, `users/${auth.currentUser.uid}/lists`, listId);
    const unsubscribe = onSnapshot(listRef, (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        setArticles(data.articles || []);
        if (data.name !== editableListName) {
          setEditableListName(data.name);
        }
      }
    });
    return unsubscribe;
  }, [listId]);

  const updateListName = React.useCallback(async () => {
    if (editableListName.trim() === '' || editableListName === initialListName) {
      setEditableListName(initialListName);
      return;
    }
    const listRef = doc(db, `users/${auth.currentUser.uid}/lists`, listId);
    try {
      await updateDoc(listRef, { name: editableListName, updatedAt: Date.now() });
      navigation.setParams({ listName: editableListName });
    } catch (error) {
      console.error("Error updating list name: ", error);
      setEditableListName(initialListName);
    }
  }, [editableListName, initialListName, listId, navigation]);

  const handleAddArticle = async () => {
    if (newArticleName.trim() === '') return;
    const newArticle = {
      id: `item-${Date.now()}`,
      name: newArticleName,
      quantity: newArticleQuantity.trim() || '1', // Add quantity, default to 1
      completed: false,
    };
    const listRef = doc(db, `users/${auth.currentUser.uid}/lists`, listId);
    await updateDoc(listRef, { articles: arrayUnion(newArticle) });
    setNewArticleName('');
    setNewArticleQuantity(''); // Reset quantity field
  };

  const handleToggleArticle = async (articleToToggle) => {
    const listRef = doc(db, `users/${auth.currentUser.uid}/lists`, listId);
    const docSnap = await getDoc(listRef);
    if (docSnap.exists()) {
      const currentArticles = docSnap.data().articles || [];
      const updatedArticles = currentArticles.map(article =>
        article.id === articleToToggle.id ? { ...article, completed: !article.completed } : article
      );
      await updateDoc(listRef, { articles: updatedArticles });
      // Vibrate when marking as completed
      if (!articleToToggle.completed) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
    }
  };

  const handleScan = (productName) => {
    setNewArticleName(productName);
    setIsBarcodeModalVisible(false);
  };

  return (
    <View style={styles.container}>
      <FlatList
        data={articles}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <View style={styles.articleContainer}>
            <Checkbox.Android
              status={item.completed ? 'checked' : 'unchecked'}
              onPress={() => handleToggleArticle(item)}
            />
            {/* Display quantity and name */}
            <Text style={styles.quantityText}>{item.quantity}x</Text>
            <Text style={[styles.articleText, item.completed && styles.articleTextCompleted]}>
              {item.name}
            </Text>
          </View>
        )}
      />
      {/* Input area for new articles */}
      <View style={styles.inputContainer}>
        <TextInput
          label="Menge"
          value={newArticleQuantity}
          onChangeText={setNewArticleQuantity}
          style={styles.quantityInput}
          keyboardType="numeric"
        />
        <TextInput
          label="Neuer Artikel"
          value={newArticleName}
          onChangeText={setNewArticleName}
          style={styles.nameInput}
        />
        <IconButton icon="barcode-scan" size={40} onPress={() => setIsBarcodeModalVisible(true)} style={styles.scanButton} />
        <IconButton icon="plus-circle" size={40} onPress={handleAddArticle} style={styles.addButton} />
      </View>

      <Modal
        visible={isBarcodeModalVisible}
        onRequestClose={() => setIsBarcodeModalVisible(false)}
        animationType="slide"
        presentationStyle="fullScreen"
      >
        <View style={styles.modalContainer}>
          <BarcodeScannerComponent onScan={handleScan} />
          <Button onPress={() => setIsBarcodeModalVisible(false)}>Abbrechen</Button>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  headerInput: { fontSize: 18, fontWeight: 'bold', backgroundColor: 'transparent', width: 250 },
  articleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  quantityText: {
    fontSize: 16,
    marginHorizontal: 8,
    fontWeight: 'bold',
  },
  articleText: {
    flex: 1,
    fontSize: 16,
  },
  articleTextCompleted: { textDecorationLine: 'line-through', color: 'grey' },
  inputContainer: { flexDirection: 'row', alignItems: 'center', padding: 8, borderTopWidth: 1, borderTopColor: '#ddd' },
  quantityInput: {
    width: 80,
    marginRight: 8,
  },
  nameInput: {
    flex: 1,
  },
  scanButton: { marginLeft: 8 },
  addButton: { marginLeft: 8 },
  modalContainer: { flex: 1 },
});
