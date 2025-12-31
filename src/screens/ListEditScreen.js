
import React, { useState, useEffect, useLayoutEffect, useCallback } from 'react';
import { View, FlatList, StyleSheet, Modal, Share } from 'react-native';
import { IconButton, TextInput, Checkbox, Text, Button, Portal, Dialog, Snackbar } from 'react-native-paper';
import { auth, db } from '../services/firebase';
import { doc, getDoc, updateDoc, onSnapshot, arrayUnion, setDoc } from 'firebase/firestore';
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
  const [isShared, setIsShared] = useState(route.params.isShared || false);
  const [sharedListId, setSharedListId] = useState(route.params.sharedListId || null);
  const [snackbarVisible, setSnackbarVisible] = useState(false);

  useEffect(() => {
    // This listener ensures we have the latest sharing status for the list.
    const userListRef = doc(db, `users/${auth.currentUser.uid}/lists`, listId);
    const unsubscribe = onSnapshot(userListRef, (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        setIsShared(data.isShared || false);
        setSharedListId(data.sharedListId || null);
      }
    });
    return () => unsubscribe();
  }, [listId]);

  useEffect(() => {
    let unsubscribe = () => {};
    // Determine the correct document to listen to for articles and name.
    const sourceRef = isShared && sharedListId 
      ? doc(db, 'sharedLists', sharedListId)
      : doc(db, `users/${auth.currentUser.uid}/lists`, listId);

    unsubscribe = onSnapshot(sourceRef, (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        setArticles(data.articles || []);
        // Only update the editable list name if it hasn't been changed by the user locally
        if (data.name !== editableListName) {
            setEditableListName(data.name || initialListName);
        }
      }
    });
    
    return () => unsubscribe();
  }, [listId, isShared, sharedListId, initialListName]);

  const updateListName = useCallback(async () => {
    const newName = editableListName.trim();

    if (!newName) {
        setEditableListName(initialListName); // Revert if empty
        return;
    }

    // If it's a shared list, update the central document.
    if (isShared && sharedListId) {
        try {
            const sharedListRef = doc(db, 'sharedLists', sharedListId);
            await updateDoc(sharedListRef, { name: newName, updatedAt: Date.now() });
            navigation.setParams({ listName: newName }); // Update header param
        } catch (error) {
            console.error("[ERROR] updateListName: Failed to update shared list:", error);
            alert("Fehler beim Aktualisieren des geteilten Listennamens.");
            setEditableListName(initialListName); // Revert on error
        }
    } else {
        // If it's a private list, update the user's private document.
        try {
            const userListRef = doc(db, `users/${auth.currentUser.uid}/lists`, listId);
            await updateDoc(userListRef, { name: newName });
            navigation.setParams({ listName: newName });
        } catch (error) {
            console.error("[ERROR] updateListName: Failed to update private list:", error);
            setEditableListName(initialListName); // Revert on error
        }
    }
}, [editableListName, isShared, sharedListId, listId, navigation, initialListName]);

  useLayoutEffect(() => {
    navigation.setOptions({
      headerTitle: () => (
        <TextInput
          value={editableListName}
          onChangeText={setEditableListName}
          style={styles.headerInput}
          onBlur={updateListName} // Trigger update when user taps away
        />
      ),
      headerRight: () => (
        <IconButton icon="account-plus" onPress={handleShareList} />
      ),
    });
  }, [navigation, editableListName, updateListName]);

  const getListRef = () => {
    return isShared && sharedListId
      ? doc(db, 'sharedLists', sharedListId)
      : doc(db, `users/${auth.currentUser.uid}/lists`, listId);
  };

  const handleAddArticle = async () => {
    if (newArticleName.trim() === '') return;
    const newArticle = {
      id: `item-${Date.now()}`,
      name: newArticleName.trim(),
      quantity: newArticleQuantity.trim() || '1',
      size: newArticleSize.trim() || '',
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

  const handleShareList = async () => {
    let code = sharedListId;
    
    if (!isShared) {
        const userListRef = doc(db, `users/${auth.currentUser.uid}/lists`, listId);
        const docSnap = await getDoc(userListRef);

        if (docSnap.exists()) {
            code = Math.random().toString(36).substring(2, 8).toUpperCase();
            const sharedListRef = doc(db, 'sharedLists', code);
            const privateListData = docSnap.data();

            await setDoc(sharedListRef, {
                name: privateListData.name,
                articles: privateListData.articles,
                shareCode: code,
                members: [auth.currentUser.uid],
                createdBy: auth.currentUser.uid,
                createdAt: Date.now(),
                updatedAt: Date.now(),
            });

            await updateDoc(userListRef, { 
                isShared: true, 
                sharedListId: code
            });

            // After successful sharing, update state to reflect this
            setIsShared(true);
            setSharedListId(code);
        }
    }
    
    if (code) {
        setShareCode(code);
        setIsShareDialogVisible(true);
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
