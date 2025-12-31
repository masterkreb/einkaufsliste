
import React, { useState, useEffect, useLayoutEffect, useCallback, useRef } from 'react';
import { View, FlatList, StyleSheet, Modal, Share, Keyboard, Platform, SafeAreaView, LayoutAnimation, UIManager, Animated, TouchableOpacity } from 'react-native';
import { GestureHandlerRootView, Swipeable } from 'react-native-gesture-handler';
import { Menu, IconButton, TextInput, Checkbox, Text, Button, Portal, Dialog, Snackbar, Icon } from 'react-native-paper';
import { auth, db } from '../services/firebase';
import { doc, getDoc, updateDoc, onSnapshot, arrayUnion, arrayRemove, setDoc } from 'firebase/firestore';
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
  const [snackbarMessage, setSnackbarMessage] = useState('');

  // State for bulk-edit mode
  const [isEditMode, setIsEditMode] = useState(false);
  const [selectedArticles, setSelectedArticles] = useState([]);
  const [isMenuVisible, setIsMenuVisible] = useState(false);
  const [menuKey, setMenuKey] = useState(0); // The fix: Add a key state

  const nameInputRef = useRef(null);
  const isProcessingScan = useRef(false);
  const keyboardOffset = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const keyboardWillShow = (e) => {
        Animated.timing(keyboardOffset, { toValue: e.endCoordinates.height, duration: e.duration, useNativeDriver: false }).start();
    };
    const keyboardWillHide = (e) => {
        Animated.timing(keyboardOffset, { toValue: 0, duration: e.duration, useNativeDriver: false }).start();
    };
    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';
    const showSubscription = Keyboard.addListener(showEvent, keyboardWillShow);
    const hideSubscription = Keyboard.addListener(hideEvent, keyboardWillHide);
    return () => {
      showSubscription.remove();
      hideSubscription.remove();
    };
  }, [keyboardOffset]);

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
    const ref = getListRef();
    try {
        await updateDoc(ref, { name: newName });
        navigation.setParams({ listName: newName });
    } catch (error) {
        console.error("[ERROR] updateListName:", error);
        setEditableListName(initialListName);
    }
  }, [editableListName, getListRef, listId, navigation, initialListName]);

   useLayoutEffect(() => {
    navigation.setOptions({
      headerTitle: isEditMode ? '' : () => <TextInput value={editableListName} onChangeText={setEditableListName} style={styles.headerInput} onBlur={updateListName}/>,
      headerLeft: isEditMode ? () => <Button onPress={() => { setIsEditMode(false); setSelectedArticles([]); }}>Abbrechen</Button> : undefined,
      headerRight: () => {
        if (isEditMode) {
          return <Button onPress={handleBulkDelete} disabled={selectedArticles.length === 0}>Löschen</Button>;
        }
        return (
          <View style={{ flexDirection: 'row' }}>
            <IconButton icon="account-plus" onPress={handleShareList} />
            <Menu
              key={menuKey} // The fix: Apply the key
              visible={isMenuVisible}
              onDismiss={() => setIsMenuVisible(false)}
              anchor={<IconButton icon="dots-vertical" onPress={() => {
                setMenuKey(k => k + 1); // The fix: Increment key on open
                setIsMenuVisible(true);
              }} />}
            >
              <Menu.Item onPress={() => { setIsEditMode(true); setIsMenuVisible(false); }} title="Artikel auswählen" />
              <Menu.Item onPress={handleDeleteCompleted} title="Erledigte löschen" />
            </Menu>
          </View>
        );
      },
    });
  }, [navigation, editableListName, updateListName, isEditMode, selectedArticles, isMenuVisible, menuKey]);

  const getListRef = useCallback(() => {
    return isShared && sharedListId
      ? doc(db, 'sharedLists', sharedListId)
      : doc(db, `users/${auth.currentUser.uid}/lists`, listId);
  }, [isShared, sharedListId, listId]);

  const addArticleToList = async (article) => {
    if (!article || !article.name || article.name.trim() === '') return;
    const newArticle = {
        id: `item-${Date.now()}`,
        name: article.name.trim(),
        quantity: article.quantity.trim() || '1',
        size: article.size ? article.size.trim() : '',
        completed: false
    };
    await updateDoc(getListRef(), { articles: arrayUnion(newArticle) });
    return newArticle;
  };

  const handleAddArticle = async () => {
    const article = await addArticleToList({ name: newArticleName, quantity: newArticleQuantity, size: '' });
    if (article) {
      setNewArticleName('');
      setNewArticleQuantity('1');
      Keyboard.dismiss();
    }
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
  
  const handleDeleteArticle = async (articleToDelete) => {
    const listRef = getListRef();
    await updateDoc(listRef, { articles: arrayRemove(articleToDelete) });
    setSnackbarMessage(`'${articleToDelete.name}' gelöscht`);
    setSnackbarVisible(true);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  };

  const handleBulkDelete = async () => {
    const listRef = getListRef();
    const docSnap = await getDoc(listRef);
    if (docSnap.exists()) {
        const currentArticles = docSnap.data().articles;
        const updatedArticles = currentArticles.filter(article => !selectedArticles.includes(article.id));
        await updateDoc(listRef, { articles: updatedArticles });
        setSnackbarMessage(`${selectedArticles.length} Artikel gelöscht`);
        setSnackbarVisible(true);
        setIsEditMode(false);
        setSelectedArticles([]);
    }
  };
  
  const handleDeleteCompleted = async () => {
    setIsMenuVisible(false);
    const listRef = getListRef();
    const docSnap = await getDoc(listRef);
    if (docSnap.exists()) {
        const currentArticles = docSnap.data().articles;
        const updatedArticles = currentArticles.filter(article => !article.completed);
        const numDeleted = currentArticles.length - updatedArticles.length;
        if (numDeleted > 0) {
            await updateDoc(listRef, { articles: updatedArticles });
            setSnackbarMessage(`${numDeleted} erledigte Artikel gelöscht`);
        } else {
            setSnackbarMessage('Keine erledigten Artikel gefunden');
        }
        setSnackbarVisible(true);
    }
  };

  const handleToggleSelect = (articleId) => {
    const newSelection = selectedArticles.includes(articleId)
      ? selectedArticles.filter(id => id !== articleId)
      : [...selectedArticles, articleId];
    setSelectedArticles(newSelection);
  };

  const handleToggleEdit = (article) => {
    if (isEditMode) return;
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
    if (isEditMode) return;
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

  const handleScan = async (scannedInfo) => {
    if (isProcessingScan.current) return;
    isProcessingScan.current = true;
    
    setIsBarcodeModalVisible(false);

    let name = scannedInfo.name;
    let size = '';
    const weightRegex = /(\d+\s*(g|ml|l|kg))/i;
    const match = name.match(weightRegex);

    if (match) {
        size = match[1].toLowerCase();
        name = name.replace(weightRegex, '').replace(/\s+/g, ' ').trim();
    }

    const article = await addArticleToList({ 
        name: name, 
        quantity: scannedInfo.quantity || '1', 
        size: size 
    });
    
    if (article) {
        setSnackbarMessage(`'${article.name}${article.size ? ` (${article.size})` : ''}' hinzugefügt`);
        setSnackbarVisible(true);
    }
     setTimeout(() => { isProcessingScan.current = false; }, 1000);
  };
  
  const openBarcodeScanner = () => {
    isProcessingScan.current = false;
    setIsBarcodeModalVisible(true);
  }

  const handleShareCode = async () => {
    try {
      await Share.share({ message: `Tritt meiner Einkaufsliste "${editableListName}" bei! Code: ${shareCode}` });
    } catch (error) {
      console.log('Share error:', error);
    }
  };

  const handleCopyCode = async () => {
    await Clipboard.setStringAsync(shareCode);
    setSnackbarMessage('Code kopiert!');
    setSnackbarVisible(true);
  };

  const renderArticle = ({ item }) => {
    const isEditingThisItem = editingArticleId === item.id;
    const isSelected = selectedArticles.includes(item.id);

    const renderRightActions = (progress, dragX) => {
      if (isEditMode) return null;
      const trans = dragX.interpolate({
        inputRange: [-100, 0],
        outputRange: [0, 100],
        extrapolate: 'clamp',
      });
      return (
        <TouchableOpacity onPress={() => handleDeleteArticle(item)} style={styles.deleteAction}>
          <Animated.View style={[styles.deleteButtonContainer, { transform: [{ translateX: trans }] }]}>
            <Icon source="delete" color="white" size={24} />
            <Text style={styles.deleteButtonText}>Löschen</Text>
          </Animated.View>
        </TouchableOpacity>
      );
    };
    
    return (
      <Swipeable renderRightActions={renderRightActions} enabled={!isEditMode}>
          <View style={[styles.articleWrapper, isSelected && styles.selectedArticle]}>
            <TouchableOpacity 
              onPress={() => isEditMode ? handleToggleSelect(item.id) : handleToggleArticle(item)}
              onLongPress={() => {
                if (!isEditMode) {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                  setIsEditMode(true);
                  setSelectedArticles([item.id]);
                }
              }}
              delayLongPress={200}
              activeOpacity={0.8}
            >
              <View style={styles.articleContainer}>
                {isEditMode ? (
                  <Checkbox.Android status={isSelected ? 'checked' : 'unchecked'} onPress={() => handleToggleSelect(item.id)}/>
                ) : (
                  <Checkbox.Android
                    status={item.completed ? 'checked' : 'unchecked'}
                    onPress={() => handleToggleArticle(item)}
                    disabled={isEditingThisItem}
                  />
                )}
                <Text style={styles.quantityText}>{item.quantity}x</Text>
                <Text style={[styles.articleText, item.completed && !isEditMode && styles.articleTextCompleted]}>
                   {item.name}{item.size ? ` (${item.size})` : ''}
                </Text>
                {!isEditMode && 
                  <IconButton
                    icon={isEditingThisItem ? "chevron-up" : "pencil"}
                    size={20}
                    onPress={() => handleToggleEdit(item)}
                    style={styles.editButton}
                  />
                }
              </View>
            </TouchableOpacity>
            {!isEditMode && isEditingThisItem && (
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
      </Swipeable>
    );
  };

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaView style={styles.container}>
        <FlatList
          data={articles}
          keyExtractor={(item) => item.id}
          renderItem={renderArticle}
          contentContainerStyle={{ paddingBottom: isEditMode ? 60 : 80 }}
          extraData={isEditMode + selectedArticles.length}
        />
        
        {!isEditMode && (
          <Animated.View style={[styles.inputContainer, { bottom: keyboardOffset }]}>
            <SafeAreaView style={{flexDirection: 'row'}} edges={['left', 'right']}>
                <TextInput label="Menge" value={newArticleQuantity} onChangeText={setNewArticleQuantity} style={styles.quantityInput} keyboardType="numeric" />
                <TextInput ref={nameInputRef} label="Neuer Artikel" value={newArticleName} onChangeText={setNewArticleName} style={styles.nameInput} onSubmitEditing={handleAddArticle} right={<TextInput.Icon icon="barcode-scan" onPress={openBarcodeScanner} />} />
            </SafeAreaView>
          </Animated.View>
        )}

        <Modal visible={isBarcodeModalVisible} onRequestClose={() => setIsBarcodeModalVisible(false)} animationType="slide" presentationStyle="fullScreen">
          <View style={styles.modalContainer}>
            <BarcodeScannerComponent onScan={handleScan} onClose={() => setIsBarcodeModalVisible(false)} />
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
        <Snackbar visible={snackbarVisible} onDismiss={() => setSnackbarVisible(false)} duration={3000}>{snackbarMessage}</Snackbar>
      </SafeAreaView>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: 'white' },
  headerInput: { fontSize: 18, fontWeight: 'bold', backgroundColor: 'transparent', width: 250 },
  articleWrapper: { borderBottomWidth: 1, borderBottomColor: '#eee', backgroundColor: 'white' },
  selectedArticle: { backgroundColor: '#e0e0e0' },
  articleContainer: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    paddingVertical: 8, 
    paddingHorizontal: 16 
  },
  quantityText: { fontSize: 16, marginHorizontal: 8, fontWeight: 'bold' },
  articleText: { flex: 1, fontSize: 16 },
  articleTextCompleted: { textDecorationLine: 'line-through', color: 'grey' },
  editButton: { marginLeft: 'auto', marginRight: -8 },
  editContainer: { padding: 16, backgroundColor: '#fafafa' },
  editInput: { backgroundColor: '#f0f0f0' },
  editActions: { flexDirection: 'row', justifyContent: 'flex-end', marginTop: 16 },
  inputContainer: { position: 'absolute', left: 0, right: 0, padding: 8, borderTopWidth: 1, borderTopColor: '#ddd', backgroundColor: 'white' },
  quantityInput: { width: 80, marginRight: 8 },
  nameInput: { flex: 1 },
  modalContainer: { flex: 1 },
  shareCodeText: { fontSize: 24, fontWeight: 'bold', textAlign: 'center', marginVertical: 10 },
  deleteAction: {
    backgroundColor: '#ff4444',
    justifyContent: 'center',
    alignItems: 'flex-end',
    width: 100,
  },
  deleteButtonContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    width: 100,
  },
  deleteButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: 'bold',
    marginTop: 4,
  },
});
