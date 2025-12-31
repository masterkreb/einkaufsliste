
import React, { useState, useEffect, useLayoutEffect, useCallback, useRef } from 'react';
import { View, FlatList, StyleSheet, Modal, Share, Keyboard, Platform, SafeAreaView, LayoutAnimation, UIManager, KeyboardAvoidingView } from 'react-native';
import { IconButton, TextInput, Checkbox, Text, Button, Portal, Dialog, Snackbar } from 'react-native-paper';
import { auth, db } from '../services/firebase';
import { doc, getDoc, updateDoc, onSnapshot, arrayUnion, setDoc } from 'firebase/firestore';
import * as Haptics from 'expo-haptics';
import * as Clipboard from 'expo-clipboard';
import BarcodeScannerComponent from '../components/BarcodeScanner';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

export default function ListEditScreen({ route, navigation }) {
  const { listId, listName: initialListName } = route.params;
  const [articles, setArticles] = useState([]);
  const [newArticleName, setNewArticleName] = useState('');
  const [newArticleQuantity, setNewArticleQuantity] = useState('1');
  const [editableListName, setEditableListName] = useState(initialListName);
  const [isBarcodeModalVisible, setIsBarcodeModalVisible] = useState(false);
  
  const [editingArticleId, setEditingArticleId] = useState(null);
  const [editName, setEditName] = useState('');
  const [editQuantity, setEditQuantity] = useState('');

  const [isShareDialogVisible, setIsShareDialogVisible] = useState(false);
  const [shareCode, setShareCode] = useState('');
  const [isShared, setIsShared] = useState(route.params.isShared || false);
  const [sharedListId, setSharedListId] = useState(route.params.sharedListId || null);
  const [snackbarVisible, setSnackbarVisible] = useState(false);

  const nameInputRef = useRef(null);

  useEffect(() => {
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
    const sourceRef = isShared && sharedListId 
      ? doc(db, 'sharedLists', sharedListId)
      : doc(db, `users/${auth.currentUser.uid}/lists`, listId);

    unsubscribe = onSnapshot(sourceRef, (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        setArticles(data.articles || []);
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
        setEditableListName(initialListName); 
        return;
    }
    const ref = isShared && sharedListId ? doc(db, 'sharedLists', sharedListId) : doc(db, `users/${auth.currentUser.uid}/lists`, listId);
    try {
        await updateDoc(ref, { name: newName });
        navigation.setParams({ listName: newName });
    } catch (error) {
        console.error("[ERROR] updateListName:", error);
        setEditableListName(initialListName);
    }
  }, [editableListName, isShared, sharedListId, listId, navigation, initialListName]);

  useLayoutEffect(() => {
    navigation.setOptions({
      headerTitle: () => <TextInput value={editableListName} onChangeText={setEditableListName} style={styles.headerInput} onBlur={updateListName}/>,
      headerRight: () => <IconButton icon="account-plus" onPress={handleShareList} />,
    });
  }, [navigation, editableListName, updateListName]);

  const getListRef = () => {
    return isShared && sharedListId
      ? doc(db, 'sharedLists', sharedListId)
      : doc(db, `users/${auth.currentUser.uid}/lists`, listId);
  };

  const handleAddArticle = async () => {
    if (newArticleName.trim() === '') {
        Keyboard.dismiss();
        return;
    }
    const newArticle = { id: `item-${Date.now()}`, name: newArticleName.trim(), quantity: newArticleQuantity.trim() || '1', size: '', completed: false };
    await updateDoc(getListRef(), { articles: arrayUnion(newArticle) });
    setNewArticleName('');
    setNewArticleQuantity('1');
    Keyboard.dismiss();
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

  const handleToggleEdit = (article) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    if (editingArticleId === article.id) {
      setEditingArticleId(null);
    } else {
      setEditingArticleId(article.id);
      setEditName(article.name);
      setEditQuantity(article.quantity);
    }
  };

  const handleSaveEdit = async () => {
    if (!editingArticleId) return;
    const listRef = getListRef();
    const docSnap = await getDoc(listRef);
    if (docSnap.exists()) {
      const currentArticles = docSnap.data().articles;
      const updatedArticles = currentArticles.map(article =>
        article.id === editingArticleId ? { ...article, name: editName, quantity: editQuantity, size: '' } : article
      );
      await updateDoc(listRef, { articles: updatedArticles });
      setEditingArticleId(null);
      Keyboard.dismiss();
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
            await setDoc(sharedListRef, { ...privateListData, shareCode: code, members: [auth.currentUser.uid], createdBy: auth.currentUser.uid, createdAt: Date.now(), updatedAt: Date.now() });
            await updateDoc(userListRef, { isShared: true, sharedListId: code });
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
    setNewArticleQuantity(productInfo.quantity || '1');
    setIsBarcodeModalVisible(false);
  };

  const handleShareCode = async () => {
    try {
      await Share.share({ message: `Tritt meiner Einkaufsliste "${editableListName}" bei! Code: ${shareCode}` });
    } catch (error) {
      console.log('Share error:', error);
    }
  };

  const handleCopyCode = async () => {
    await Clipboard.setStringAsync(shareCode);
    setSnackbarVisible(true);
  };

  const renderArticle = ({ item }) => {
    const isEditing = editingArticleId === item.id;
    
    return (
      <View style={styles.articleWrapper}>
        <View style={styles.articleContainer}>
          <Checkbox.Android
            status={item.completed ? 'checked' : 'unchecked'}
            onPress={() => handleToggleArticle(item)}
            disabled={isEditing}
          />
          <Text style={styles.quantityText}>{item.quantity}x</Text>
          <Text style={[styles.articleText, item.completed && styles.articleTextCompleted]}>
            {item.name}
          </Text>
          <IconButton
            icon={isEditing ? "chevron-up" : "pencil"}
            size={20}
            onPress={() => handleToggleEdit(item)}
            style={styles.editButton}
          />
        </View>
        {isEditing && (
          <View style={styles.editContainer}>
            <TextInput label="Name" value={editName} onChangeText={setEditName} style={styles.editInput}/>
            <TextInput label="Anzahl" value={editQuantity} onChangeText={setEditQuantity} keyboardType="numeric" style={[styles.editInput, {marginTop: 8}]}/>
            <View style={styles.editActions}>
              <Button onPress={() => setEditingArticleId(null)}>Abbrechen</Button>
              <Button onPress={handleSaveEdit}>Speichern</Button>
            </View>
          </View>
        )}
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <FlatList
        data={articles}
        keyExtractor={(item) => item.id}
        renderItem={renderArticle}
        contentContainerStyle={{ paddingBottom: 60 }}
      />
      
      <KeyboardAvoidingView 
        behavior={Platform.OS === "ios" ? "padding" : "height"} 
        keyboardVerticalOffset={90}
      >
        <View style={styles.inputContainer}>
            <TextInput label="Menge" value={newArticleQuantity} onChangeText={setNewArticleQuantity} style={styles.quantityInput} keyboardType="numeric" />
            <TextInput ref={nameInputRef} label="Neuer Artikel" value={newArticleName} onChangeText={setNewArticleName} style={styles.nameInput} onSubmitEditing={handleAddArticle} right={<TextInput.Icon icon="barcode-scan" onPress={() => setIsBarcodeModalVisible(true)} />} />
        </View>
      </KeyboardAvoidingView>

      <Modal visible={isBarcodeModalVisible} onRequestClose={() => setIsBarcodeModalVisible(false)} animationType="slide" presentationStyle="fullScreen">
        <View style={styles.modalContainer}>
          <BarcodeScannerComponent onScan={handleScan} />
          <Button onPress={() => setIsBarcodeModalVisible(false)}>Abbrechen</Button>
        </View>
      </Modal>

      <Portal>
        <Dialog visible={isShareDialogVisible} onDismiss={() => setIsShareDialogVisible(false)}>
          <Dialog.Title>Liste freigeben</Dialog.Title>
          <Dialog.Content>
            <Text>Teile diesen Code, damit Freunde beitreten können:</Text>
            <Text style={styles.shareCodeText}>{shareCode}</Text>
            <Button mode="contained" onPress={handleCopyCode} style={{ marginTop: 10 }}>Code kopieren</Button>
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setIsShareDialogVisible(false)}>Schließen</Button>
            <Button onPress={handleShareCode}>Teilen</Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>
      <Snackbar visible={snackbarVisible} onDismiss={() => setSnackbarVisible(false)} duration={2000}>Code kopiert!</Snackbar>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: 'white' },
  headerInput: { fontSize: 18, fontWeight: 'bold', backgroundColor: 'transparent', width: 250 },
  articleWrapper: { borderBottomWidth: 1, borderBottomColor: '#eee' },
  articleContainer: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8, paddingHorizontal: 8 },
  quantityText: { fontSize: 16, marginHorizontal: 8, fontWeight: 'bold' },
  articleText: { flex: 1, fontSize: 16 },
  articleTextCompleted: { textDecorationLine: 'line-through', color: 'grey' },
  editButton: { marginLeft: 'auto' },
  editContainer: { padding: 16, backgroundColor: '#fafafa' },
  editInput: { backgroundColor: '#f0f0f0' },
  editActions: { flexDirection: 'row', justifyContent: 'flex-end', marginTop: 16 },
  inputContainer: { flexDirection: 'row', alignItems: 'center', padding: 8, borderTopWidth: 1, borderTopColor: '#ddd', backgroundColor: 'white' },
  quantityInput: { width: 80, marginRight: 8 },
  nameInput: { flex: 1 },
  modalContainer: { flex: 1 },
  shareCodeText: { fontSize: 24, fontWeight: 'bold', textAlign: 'center', marginVertical: 10 }
});
