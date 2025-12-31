import React, { useState, useEffect, useLayoutEffect } from 'react';
import { View, FlatList, StyleSheet, Modal, Share } from 'react-native';
import { IconButton, TextInput, Checkbox, Text, Button, Portal, Dialog, Snackbar } from 'react-native-paper';
import { auth, db } from '../services/firebase';
import { doc, getDoc, updateDoc, onSnapshot, arrayUnion, setDoc, collection } from 'firebase/firestore';
import * as Haptics from 'expo-haptics';
import * as Clipboard from 'expo-clipboard';
import BarcodeScannerComponent from '../components/BarcodeScanner';

export default function ListEditScreen({ route, navigation }) {
  const { listId, listName: initialListName } = route.params;
  const [articles, setArticles] = useState([]);
  const [newArticleName, setNewArticleName] = useState('');
  const [newArticleQuantity, setNewArticleQuantity] = useState('');
  const [newArticleSize, setNewArticleSize] = useState('');
  const [editableListName, setEditableListName] = useState(initialListName);
  const [isBarcodeModalVisible, setIsBarcodeModalVisible] = useState(false);
  const [isEditDialogVisible, setIsEditDialogVisible] = useState(false);
  const [editingArticle, setEditingArticle] = useState(null);
  const [editName, setEditName] = useState('');
  const [editQuantity, setEditQuantity] = useState('');
  const [editSize, setEditSize] = useState('');
  const [isShareDialogVisible, setIsShareDialogVisible] = useState(false);
  const [shareCode, setShareCode] = useState('');
  const [isShared, setIsShared] = useState(false);
  const [sharedListId, setSharedListId] = useState(null);
  const [snackbarVisible, setSnackbarVisible] = useState(false);

  useEffect(() => {
    const userListRef = doc(db, `users/${auth.currentUser.uid}/lists`, listId);
    const unsubscribe = onSnapshot(userListRef, (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        const shared = data.isShared || false;
        const sListId = data.sharedListId || null;
        setIsShared(shared);
        setSharedListId(sListId);
        if (!shared) {
            setEditableListName(data.name);
        }
      }
    });
    return () => unsubscribe();
  }, [listId]);

  useEffect(() => {
    let unsubscribe = () => {};
    if (isShared && sharedListId) {
      const listRef = doc(db, 'sharedLists', sharedListId);
      unsubscribe = onSnapshot(listRef, (docSnap) => {
        if (docSnap.exists()) {
          const data = docSnap.data();
          setArticles(data.articles || []);
          setEditableListName(data.name);
        }
      });
    } else if (!isShared) {
      const listRef = doc(db, `users/${auth.currentUser.uid}/lists`, listId);
      unsubscribe = onSnapshot(listRef, (docSnap) => {
        if (docSnap.exists()) {
          setArticles(docSnap.data().articles || []);
          setEditableListName(docSnap.data().name);
        }
      });
    }
    return () => unsubscribe();
  }, [listId, isShared, sharedListId]);

  const getListRef = () => {
    if (isShared && sharedListId) {
      return doc(db, 'sharedLists', sharedListId);
    } else {
      return doc(db, `users/${auth.currentUser.uid}/lists`, listId);
    }
  };

  const updateListName = React.useCallback(async () => {
    const listRef = getListRef();
    try {
      await updateDoc(listRef, { name: editableListName });
      navigation.setParams({ listName: editableListName });
    } catch (error) {
      console.error("Error updating list name: ", error);
    }
  }, [editableListName, navigation, isShared, sharedListId]);

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
      headerRight: () => (
        <IconButton icon="account-plus" onPress={handleShareList} />
      ),
    });
  }, [navigation, editableListName, updateListName]);

  const handleAddArticle = async () => {
    if (newArticleName.trim() === '') return;
    const newArticle = {
      id: `item-${Date.now()}`,
      name: newArticleName,
      quantity: newArticleQuantity.trim() || '1',
      size: newArticleSize || '',
      completed: false,
    };
    const listRef = getListRef();
    await updateDoc(listRef, { articles: arrayUnion(newArticle) });
    setNewArticleName('');
    setNewArticleQuantity('');
    setNewArticleSize('');
  };

  const handleToggleArticle = async (articleToToggle) => {
    const listRef = getListRef();
    const docSnap = await getDoc(listRef);
    if (docSnap.exists()) {
      const updatedArticles = docSnap.data().articles.map(article =>
        article.id === articleToToggle.id ? { ...article, completed: !article.completed } : article
      );
      await updateDoc(listRef, { articles: updatedArticles });
      if (!articleToToggle.completed) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
    }
  };

  const handleScan = (productInfo) => {
    setNewArticleName(productInfo.name);
    setNewArticleSize(productInfo.quantity);
    setIsBarcodeModalVisible(false);
  };

  const openEditDialog = (article) => {
    setEditingArticle(article);
    setEditName(article.name);
    setEditQuantity(article.quantity);
    setEditSize(article.size || '');
    setIsEditDialogVisible(true);
  };

  const handleEditArticle = async () => {
    if (!editingArticle) return;
    const listRef = getListRef();
    const docSnap = await getDoc(listRef);
    if (docSnap.exists()) {
      const updatedArticles = docSnap.data().articles.map(article =>
        article.id === editingArticle.id ? { ...article, name: editName, quantity: editQuantity, size: editSize } : article
      );
      await updateDoc(listRef, { articles: updatedArticles });
    }
    setIsEditDialogVisible(false);
    setEditingArticle(null);
  };

  const handleShareList = async () => {
    let code = sharedListId; // Use sharedListId as the code if it exists.
    
    if (!isShared) {
        const userListRef = doc(db, `users/${auth.currentUser.uid}/lists`, listId);
        const docSnap = await getDoc(userListRef);

        if (docSnap.exists()) {
            code = Math.random().toString(36).substring(2, 8).toUpperCase();
            const sharedListRef = doc(db, 'sharedLists', code);

            const sharedListData = {
                ...docSnap.data(),
                shareCode: code, // The code is also stored in the document
                members: [auth.currentUser.uid],
                createdBy: auth.currentUser.uid,
                createdAt: Date.now(),
            };
            await setDoc(sharedListRef, sharedListData); // Use setDoc with the code as ID

            await updateDoc(userListRef, { 
                isShared: true, 
                sharedListId: code // Link user list to the shared list ID (the code)
            });
            
            setIsShared(true);
            setSharedListId(code);
        }
    }
    
    if (code) {
        setShareCode(code);
        setIsShareDialogVisible(true);
    }
  };

  const handleShareCode = async () => {
    try {
      await Share.share({
        message: `Tritt meiner Einkaufsliste "${editableListName}" bei! Code: ${shareCode}`,
      });
    } catch (error) {
      console.log('Share error:', error);
    }
  };

  const handleCopyCode = async () => {
    await Clipboard.setStringAsync(shareCode);
    setSnackbarVisible(true);
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
            <Text style={styles.quantityText}>{item.quantity}x</Text>
            <Text style={[styles.articleText, item.completed && styles.articleTextCompleted]}>
              {item.name}{item.size ? ` (${item.size})` : ''}
            </Text>
            <IconButton icon="pencil" size={20} onPress={() => openEditDialog(item)} style={styles.editButton} />
          </View>
        )}
      />
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

      <Portal>
        <Dialog visible={isEditDialogVisible} onDismiss={() => setIsEditDialogVisible(false)}>
          <Dialog.Title>Artikel bearbeiten</Dialog.Title>
          <Dialog.Content>
            <TextInput label="Name" value={editName} onChangeText={setEditName} style={{ marginBottom: 8 }}/>
            <TextInput label="Anzahl" value={editQuantity} onChangeText={setEditQuantity} keyboardType="numeric" style={{ marginBottom: 8 }}/>
            <TextInput label="Größe (optional)" value={editSize} onChangeText={setEditSize} />
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setIsEditDialogVisible(false)}>Abbrechen</Button>
            <Button onPress={handleEditArticle}>Speichern</Button>
          </Dialog.Actions>
        </Dialog>

        <Dialog visible={isShareDialogVisible} onDismiss={() => setIsShareDialogVisible(false)}>
          <Dialog.Title>Liste freigeben</Dialog.Title>
          <Dialog.Content>
            <Text>Teile diesen Code, damit Freunde beitreten können:</Text>
            <Text style={{ fontSize: 24, fontWeight: 'bold', textAlign: 'center', marginVertical: 10 }}>{shareCode}</Text>
            <Button mode="contained" onPress={handleCopyCode} style={{ marginTop: 10 }}>Code kopieren</Button>
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setIsShareDialogVisible(false)}>Schließen</Button>
            <Button onPress={handleShareCode}>Teilen</Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>
      <Snackbar visible={snackbarVisible} onDismiss={() => setSnackbarVisible(false)} duration={2000}>Code kopiert!</Snackbar>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  headerInput: { fontSize: 18, fontWeight: 'bold', backgroundColor: 'transparent', width: 250 },
  articleContainer: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8, paddingHorizontal: 8, borderBottomWidth: 1, borderBottomColor: '#eee' },
  quantityText: { fontSize: 16, marginHorizontal: 8, fontWeight: 'bold' },
  articleText: { flex: 1, fontSize: 16 },
  articleTextCompleted: { textDecorationLine: 'line-through', color: 'grey' },
  inputContainer: { flexDirection: 'row', alignItems: 'center', padding: 8, borderTopWidth: 1, borderTopColor: '#ddd' },
  quantityInput: { width: 80, marginRight: 8 },
  nameInput: { flex: 1 },
  scanButton: { marginLeft: 8 },
  addButton: { marginLeft: 8 },
  modalContainer: { flex: 1 },
  editButton: { marginLeft: 'auto' },
});