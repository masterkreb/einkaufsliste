import React, { useState, useEffect, useLayoutEffect, useCallback, useRef } from 'react';
import { View, FlatList, StyleSheet, Modal, Share, Keyboard, Platform, SafeAreaView, LayoutAnimation, UIManager, Animated, TouchableOpacity, ActivityIndicator, Pressable } from 'react-native';
import { GestureHandlerRootView, Swipeable } from 'react-native-gesture-handler';
import { Menu, IconButton, TextInput, Checkbox, Text, Button, Portal, Dialog, Snackbar, Icon } from 'react-native-paper';
import { auth, db } from '../services/firebase';
import { doc, getDoc, updateDoc, onSnapshot, arrayUnion, arrayRemove, setDoc, deleteDoc } from 'firebase/firestore';
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
  const [isEditingTitle, setIsEditingTitle] = useState(false);
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
  const [menuKey, setMenuKey] = useState(0);

  // State for members management
  const [isMembersDialogVisible, setIsMembersDialogVisible] = useState(false);
  const [members, setMembers] = useState([]);
  const [listCreatorId, setListCreatorId] = useState(null);
  const [isLoadingMembers, setIsLoadingMembers] = useState(false);
  const [memberToRemove, setMemberToRemove] = useState(null);
  const [isRemoveConfirmVisible, setIsRemoveConfirmVisible] = useState(false);

  const nameInputRef = useRef(null);
  const isProcessingScan = useRef(false);
  const keyboardOffset = useRef(new Animated.Value(0)).current;

  // --- Effects ---
  useEffect(() => {
    const keyboardWillShow = (e) => Animated.timing(keyboardOffset, { toValue: e.endCoordinates.height, duration: e.duration, useNativeDriver: false }).start();
    const keyboardWillHide = (e) => Animated.timing(keyboardOffset, { toValue: 0, duration: e.duration, useNativeDriver: false }).start();
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
    let unsubscribe = () => {};
    const listRef = isShared && sharedListId 
      ? doc(db, 'sharedLists', sharedListId)
      : doc(db, `users/${auth.currentUser.uid}/lists`, listId);

    unsubscribe = onSnapshot(listRef, (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        setArticles(data.articles || []);
        if (data.name !== editableListName) {
            setEditableListName(data.name || initialListName);
        }
        // Update shared status from the definitive source
        if (isShared && sharedListId) {
            setListCreatorId(data.createdBy || null);
        }
      }
    });
    
    // Also, listen to the user's private list document for shared status changes
    const userListRef = doc(db, `users/${auth.currentUser.uid}/lists`, listId);
    const userListUnsubscribe = onSnapshot(userListRef, (docSnap) => {
        if (docSnap.exists()) {
            const data = docSnap.data();
            setIsShared(data.isShared || false);
            setSharedListId(data.sharedListId || null);
        }
    });

    return () => {
      unsubscribe();
      userListUnsubscribe();
    };
  }, [listId, isShared, sharedListId, initialListName]);

  // --- Logic Functions ---
  const getListRef = useCallback(() => {
    return isShared && sharedListId
      ? doc(db, 'sharedLists', sharedListId)
      : doc(db, `users/${auth.currentUser.uid}/lists`, listId);
  }, [isShared, sharedListId, listId]);

  const updateListName = useCallback(async () => {
    const newName = editableListName.trim();
    if (!newName) {
        setEditableListName(initialListName); 
        return;
    }
    const ref = getListRef();
    try {
        await updateDoc(ref, { name: newName });
    } catch (error) {
        console.error("[ERROR] updateListName:", error);
        setEditableListName(initialListName);
    }
  }, [editableListName, getListRef, listId, initialListName]);

  useLayoutEffect(() => {
    navigation.setOptions({      
      headerLeft: isEditMode ? () => <Button onPress={() => { setIsEditMode(false); setSelectedArticles([]); }}>Abbrechen</Button> : undefined,
      headerRight: () => {
        if (isEditMode) {
          return <Button onPress={handleBulkDelete} disabled={selectedArticles.length === 0}>Löschen</Button>;
        }
        return (
          <View style={{ flexDirection: 'row' }}>
            <IconButton icon="account-plus" onPress={handleShareList} />
            <Menu
              key={menuKey}
              visible={isMenuVisible}
              onDismiss={() => setIsMenuVisible(false)}
              anchor={<IconButton icon="dots-vertical" onPress={() => { setMenuKey(k => k + 1); setIsMenuVisible(true); }} />}
            >
              <Menu.Item onPress={() => { setIsEditMode(true); setIsMenuVisible(false); }} title="Artikel auswählen" />
              <Menu.Item onPress={handleDeleteCompleted} title="Erledigte löschen" />
              {isShared && <Menu.Item onPress={openMembersDialog} title="Mitglieder verwalten" />}
            </Menu>
          </View>
        );
      },
    });
  }, [navigation, isEditMode, selectedArticles, isMenuVisible, menuKey, isShared]);

  // --- Logic Functions ---
  const addArticleToList = async (article) => {
    if (!article || !article.name || article.name.trim() === '') return;
    const safeQuantity = String(article.quantity ?? '').trim();
    const newArticle = {
        id: `item-${Date.now()}`, name: article.name.trim(),
        quantity: safeQuantity || '1', size: article.size ? String(article.size).trim() : '',
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
    if (Platform.OS !== 'web') {
      LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    }
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
        }
    }
    if (code) {
        setShareCode(code);
        setIsShareDialogVisible(true);
    }
  };

  const handleScan = async (scannedInfo) => {
    // Wird teilweise mehrfach gefeuert -> hartes Gate
    if (isProcessingScan.current) return;
    isProcessingScan.current = true;

    try {
      const name = String(scannedInfo?.name ?? '').trim();
      const quantity = String(scannedInfo?.quantity ?? '1').trim();
      const size = String(scannedInfo?.size ?? '').trim();

      if (!name) {
        setSnackbarMessage('Kein Produktname erkannt.');
        setSnackbarVisible(true);
        return;
      }

      await addArticleToList({ name, quantity, size });
      setSnackbarMessage(`'${name}' hinzugefügt`);
      setSnackbarVisible(true);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (error) {
      console.error('[ERROR] handleScan:', error);
      setSnackbarMessage('Fehler beim Hinzufügen des Artikels.');
      setSnackbarVisible(true);
    } finally {
      setIsBarcodeModalVisible(false);
      // kleines Delay, damit ein zweiter Scan-Event nicht direkt doppelt hinzufügt
      setTimeout(() => {
        isProcessingScan.current = false;
      }, 500);
    }
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

  // --- Member Management Functions ---
  const openMembersDialog = async () => {
    setIsMenuVisible(false);
    setIsMembersDialogVisible(true);
    setIsLoadingMembers(true);
    try {
      const listRef = doc(db, 'sharedLists', sharedListId);
      const listSnap = await getDoc(listRef);
      if (listSnap.exists()) {
        const listData = listSnap.data();
        console.log('listData:', listData);
        const memberUIDs = listData.members || [];
        console.log('memberUIDs:', memberUIDs);
        setListCreatorId(listData.createdBy);

        const memberPromises = memberUIDs.map(uid => getDoc(doc(db, 'users', uid)));
        const memberDocs = await Promise.all(memberPromises);
        
        const memberDetails = memberDocs
          .filter(doc => doc.exists())
          .map(doc => ({ uid: doc.id, email: doc.data().email }));
        console.log('memberDetails:', memberDetails);

        // Sort to show creator first, then current user, then others
        memberDetails.sort((a, b) => {
            if (a.uid === listData.createdBy) return -1;
            if (b.uid === listData.createdBy) return 1;
            if (a.uid === auth.currentUser.uid) return -1;
            if (b.uid === auth.currentUser.uid) return 1;
            return a.email.localeCompare(b.email);
        });

        setMembers(memberDetails);
      }
    } catch (error) {
      console.error("Error fetching members:", error);
      setSnackbarMessage("Fehler beim Laden der Mitglieder.");
      setSnackbarVisible(true);
    } finally {
      setIsLoadingMembers(false);
    }
  };

  const confirmRemoveMember = (member) => {
    setMemberToRemove(member);
    setIsRemoveConfirmVisible(true);
  };
  
  const handleRemoveMember = async () => {
    if (!memberToRemove || auth.currentUser.uid !== listCreatorId) return;
  
    const memberUid = memberToRemove.uid;
    const sharedListRef = doc(db, 'sharedLists', sharedListId);
  
    console.log('Removing member:', memberUid, 'from list:', sharedListId, 'creator:', listCreatorId, 'current user:', auth.currentUser.uid);
  
    try {
      // Remove member from the shared list
      console.log('Updating sharedList');
      await updateDoc(sharedListRef, {
        members: arrayRemove(memberUid)
      });
      console.log('SharedList updated');
  
      // Find the user's private list document to delete it
      const userPrivateListRef = doc(db, `users/${memberUid}/lists`, sharedListId);
      console.log('Deleting userPrivateList for', memberUid, 'sharedListId:', sharedListId);
      await deleteDoc(userPrivateListRef);
      console.log('UserPrivateList deleted');
  
      setSnackbarMessage(`'${memberToRemove.email}' wurde entfernt.`);
      setSnackbarVisible(true);
      
      // Refresh members list
      const updatedMembers = members.filter(m => m.uid !== memberUid);
      setMembers(updatedMembers);

    } catch (error) {
      console.error("Error removing member:", error);
      setSnackbarMessage("Fehler beim Entfernen des Mitglieds.");
      setSnackbarVisible(true);
    } finally {
        setIsRemoveConfirmVisible(false);
        setMemberToRemove(null);
        // If the current user was removed by the owner, this will effectively kick them out.
        // A listener on the user's private list doc will update the state.
    }
  };

  // --- Render Functions ---
  const renderArticle = ({ item }) => {
     // ... (this function is unchanged)
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
    
    if (Platform.OS === 'web') {
      return (
        <View style={[styles.articleWrapper, isSelected && styles.selectedArticle]}>
          <TouchableOpacity 
            onPress={() => isEditMode ? handleToggleSelect(item.id) : handleToggleArticle(item)}
            onLongPress={() => {
              if (!isEditMode) {
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
              {!isEditMode && !isEditingThisItem && (
                <IconButton
                  icon="delete"
                  size={20}
                  onPress={() => handleDeleteArticle(item)}
                  style={styles.editButton}
                />
              )}
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
      );
    } else {
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
    }
  };

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaView style={styles.container}>

      <View style={styles.titleContainer}>
  {isEditingTitle ? (
    <TextInput
      value={editableListName}
      onChangeText={setEditableListName}
      style={styles.titleInput}
      onBlur={() => {
        updateListName();
        setIsEditingTitle(false);
      }}
      autoFocus
      onSubmitEditing={() => {
        updateListName();
        setIsEditingTitle(false);
      }}
    />
  ) : (
    <TouchableOpacity   // ← Ändere Pressable zu TouchableOpacity
      onPress={() => setIsEditingTitle(true)}
      style={{ flexDirection: 'row', alignItems: 'center', padding: 8 }}
    >
      <Text style={styles.titleText}>{editableListName}</Text>
      <IconButton
        icon="pencil"
        size={20}
      />
    </TouchableOpacity>
  )}
</View>

      <FlatList
        data={articles}
        keyExtractor={(item) => item.id}
        renderItem={renderArticle}
        contentContainerStyle={{ paddingBottom: isEditMode ? 60 : 80 }}
        extraData={isEditMode + selectedArticles.length + editingArticleId}
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
          {/* Share Dialog */}
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

          {/* Members Dialog */}
          <Dialog visible={isMembersDialogVisible} onDismiss={() => setIsMembersDialogVisible(false)}>
            <Dialog.Title>Mitglieder der Liste</Dialog.Title>
            <Dialog.Content>
              {isLoadingMembers ? (
                <ActivityIndicator animating={true} style={{paddingVertical: 20}} />
              ) : (
                members.map(member => (
                  <View key={member.uid} style={styles.memberItem}>
                    <View>
                      <Text style={styles.memberEmail}>{member.email}</Text>
                      {member.uid === listCreatorId && <Text style={styles.memberTag}>(Ersteller)</Text>}
                      {member.uid === auth.currentUser.uid && member.uid !== listCreatorId && <Text style={styles.memberTag}>(Du)</Text>}
                    </View>
                    {auth.currentUser.uid === listCreatorId && member.uid !== auth.currentUser.uid && (
                      <Button onPress={() => confirmRemoveMember(member)} textColor='red' style={{marginLeft: 'auto'}}>Entfernen</Button>
                    )}
                  </View>
                ))
              )}
            </Dialog.Content>
            <Dialog.Actions>
              <Button onPress={() => setIsMembersDialogVisible(false)}>Schließen</Button>
            </Dialog.Actions>
          </Dialog>

          {/* Confirm Member Removal Dialog */}
          <Dialog visible={isRemoveConfirmVisible} onDismiss={() => setIsRemoveConfirmVisible(false)}>
            <Dialog.Title>Mitglied entfernen?</Dialog.Title>
            <Dialog.Content>
              <Text>Möchtest du '{memberToRemove?.email}' wirklich aus dieser Liste entfernen?</Text>
            </Dialog.Content>
            <Dialog.Actions>
              <Button onPress={() => setIsRemoveConfirmVisible(false)}>Abbrechen</Button>
              <Button onPress={handleRemoveMember} textColor='red'>Bestätigen</Button>
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
    titleContainer: {
    paddingHorizontal: 16,
    paddingVertical: 1,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
    backgroundColor: '#f9f9f9',
  },
  titleText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    flex: 1,
  },
  titleInput: {
    fontSize: 24,
    fontWeight: 'bold',
    backgroundColor: 'white',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#2196F3',
  }, 
  articleWrapper: { borderBottomWidth: 1, borderBottomColor: '#eee', backgroundColor: 'white' },
  selectedArticle: { backgroundColor: '#e0e0e0' },
  articleContainer: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8, paddingHorizontal: 16 },
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
  deleteAction: { backgroundColor: '#ff4444', justifyContent: 'center', alignItems: 'flex-end', width: 100 },
  deleteButtonContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', width: 100 },
  deleteButtonText: { color: 'white', fontSize: 14, fontWeight: 'bold', marginTop: 4 },
  memberItem: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 10 },
  memberEmail: { fontSize: 16 },
  memberTag: { fontSize: 12, color: 'grey' },
});
