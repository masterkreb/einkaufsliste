
import React, { useState, useEffect, useRef } from 'react';
import { View, FlatList, StyleSheet, Text } from 'react-native';
import { FAB, Searchbar, Portal, Dialog, TextInput, Button, Card, Title, Paragraph, IconButton, Subheading } from 'react-native-paper';
import { useIsFocused } from '@react-navigation/native';
import { auth, db } from '../services/firebase';
import { collection, onSnapshot, addDoc, deleteDoc, doc, updateDoc, getDoc, setDoc, arrayUnion } from 'firebase/firestore';

export default function StartScreen({ route, navigation }) {
  const [lists, setLists] = useState([]);
  const [filteredLists, setFilteredLists] = useState([]);
  const [isEditMode, setIsEditMode] = useState(false);
  const [isSearchVisible, setIsSearchVisible] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  
  const [isJoinDialogVisible, setIsJoinDialogVisible] = useState(false);
  const [joinCode, setJoinCode] = useState('');

  const [isRenameDialogVisible, setIsRenameDialogVisible] = useState(false);
  const [listToRename, setListToRename] = useState(null);
  const [newListName, setNewListName] = useState('');

  const isFocused = useIsFocused();
  const user = auth.currentUser;

  const sharedListUnsubscribersRef = useRef({});

  useEffect(() => {
    const { action, timestamp } = route.params || {};
    if (timestamp && action) {
      switch (action) {
        case 'edit': setIsEditMode(prev => !prev); setIsSearchVisible(false); break;
        case 'search': setIsSearchVisible(prev => !prev); setIsEditMode(false); break;
        case 'join': setIsJoinDialogVisible(true); break;
      }
      navigation.setParams({ action: null, timestamp: null });
    }
  }, [route.params?.action, route.params?.timestamp, navigation]);

  useEffect(() => {
    if (!isFocused || !user) {
        setLists([]);
        setFilteredLists([]);
        Object.values(sharedListUnsubscribersRef.current).forEach(unsub => unsub());
        sharedListUnsubscribersRef.current = {};
        return;
    }

    const userListsRef = collection(db, `users/${user.uid}/lists`);
    const mainUnsubscribe = onSnapshot(userListsRef, (snapshot) => {
        const freshUserLists = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        const currentUnsubscribers = { ...sharedListUnsubscribersRef.current };
        const newSubscribers = {};

        freshUserLists.forEach(list => {
            if (list.isShared && list.sharedListId) {
                const listId = list.sharedListId;
                if (currentUnsubscribers[listId]) {
                    newSubscribers[listId] = currentUnsubscribers[listId];
                    delete currentUnsubscribers[listId];
                } else {
                    const sharedListRef = doc(db, 'sharedLists', listId);
                    newSubscribers[listId] = onSnapshot(sharedListRef, (sharedDoc) => {
                        if (sharedDoc.exists()) {
                            const sharedData = sharedDoc.data();
                            setLists(prevLists =>
                                prevLists.map(l => (l.id === listId || l.sharedListId === listId) ? { ...l, name: sharedData.name, articles: sharedData.articles } : l)
                            );
                        }
                    });
                }
            }
        });

        Object.values(currentUnsubscribers).forEach(unsub => unsub());
        sharedListUnsubscribersRef.current = newSubscribers;
        setLists(freshUserLists);
    });

    return () => {
        mainUnsubscribe();
        Object.values(sharedListUnsubscribersRef.current).forEach(unsub => unsub());
        sharedListUnsubscribersRef.current = {};
    };
}, [isFocused, user]);


  useEffect(() => {
    if (searchQuery) {
      const filtered = lists.filter(list => list.name.toLowerCase().includes(searchQuery.toLowerCase()));
      setFilteredLists(filtered);
    } else {
      setFilteredLists(lists);
    }
  }, [lists, searchQuery]);

  const handleAddList = async () => {
    if (!user) return;
    await addDoc(collection(db, `users/${user.uid}/lists`), { 
      name: 'Neue Liste', 
      articles: [], 
      createdAt: Date.now(), 
      updatedAt: Date.now(),
      isShared: false,
    });
  };

  const handleDeleteList = async (listId) => {
    if (!user) return;
    await deleteDoc(doc(db, `users/${user.uid}/lists`, listId));
  };

  const handleJoinList = async () => {
    const code = joinCode.trim().toUpperCase();
    if (!code || !user) return;

    const sharedListRef = doc(db, 'sharedLists', code);

    try {
      await updateDoc(sharedListRef, {
        members: arrayUnion(user.uid)
      });

      const sharedListSnap = await getDoc(sharedListRef);
      if (sharedListSnap.exists()) {
        const sharedList = sharedListSnap.data();
        await setDoc(doc(db, `users/${user.uid}/lists`, code), {
          name: sharedList.name,
          isShared: true,
          sharedListId: code,
          joinedAt: Date.now()
        });
        alert('Liste erfolgreich beigetreten!');
      } else {
          throw new Error("Konnte die Liste nach dem Beitreten nicht finden.");
      }
    } catch (error) {
      console.error('Error joining list:', error);
      if (error.code === 'permission-denied' || error.code === 'not-found') {
           alert('Fehler beim Beitreten. Prüfe den Freigabecode. Er ist entweder falsch oder die Liste existiert nicht mehr.');
      } else {
           alert('Ein unerwarteter Fehler ist aufgetreten.');
      }
    } finally {
        setIsJoinDialogVisible(false);
        setJoinCode('');
    }
  };

  const openRenameDialog = (list) => {
    setListToRename(list);
    setNewListName(list.name);
    setIsRenameDialogVisible(true);
  };

  const handleRenameList = async () => {
    if (!listToRename || !newListName.trim() || newListName.trim() === listToRename.name) {
      setIsRenameDialogVisible(false);
      return;
    }
    
    if (listToRename.isShared) {
        alert("Geteilte Listen können nur innerhalb der Liste selbst umbenannt werden.");
        setIsRenameDialogVisible(false);
        return;
    }

    try {
        const userListRef = doc(db, `users/${user.uid}/lists`, listToRename.id);
        await updateDoc(userListRef, { name: newListName.trim(), updatedAt: Date.now() });
    } catch (error) {
        console.error("Error renaming private list:", error);
        alert("Fehler beim Umbenennen der Liste.");
    } finally {
        setIsRenameDialogVisible(false);
    }
  };

  const navigateToList = (list) => {
    navigation.navigate('ListEdit', { listId: list.id, listName: list.name, isShared: list.isShared, sharedListId: list.sharedListId });
  };

  const renderListCard = ({ item }) => {
    const formatDate = (timestamp) => {
      if (!timestamp) return 'Unbekannt';
      return new Date(timestamp).toLocaleDateString();
    };
  
    const displayDate = item.updatedAt ? `Zuletzt bearbeitet: ${formatDate(item.updatedAt)}` : `Erstellt am: ${formatDate(item.createdAt)}`;

    const articlesPreview = item.articles && item.articles.length > 0
      ? item.articles.slice(0, 3).map(a => a.name).join(', ') + (item.articles.length > 3 ? '...' : '')
      : 'Noch keine Artikel';

    return (
      <Card style={styles.card} onPress={isEditMode ? undefined : () => navigateToList(item)}>
        <Card.Content style={styles.contentContainer}>
          {item.isShared && (
            <IconButton
              icon="account-group"
              size={20}
              style={styles.sharedIcon}
              color="#666"
            />
          )}

          <View style={styles.textContainer}>
            <Title style={styles.title}>{item.name}</Title>
            <Paragraph style={styles.paragraph}>{displayDate}</Paragraph>
            <Paragraph style={[styles.paragraph, styles.articlesPreview]}>{articlesPreview}</Paragraph>
          </View>
          
          {isEditMode && (
            <View style={styles.actionsContainer}>
              <IconButton
                icon="pencil"
                size={24}
                onPress={() => openRenameDialog(item)}
              />
              <IconButton
                icon="delete"
                color="red"
                size={24}
                onPress={() => handleDeleteList(item.id)}
              />
            </View>
          )}
        </Card.Content>
      </Card>
    );
  };

  const EmptyListComponent = () => (
    <View style={styles.emptyContainer}>
        <Title style={styles.emptyTitle}>Willkommen!</Title>
        <Subheading style={styles.emptySubheading}>
            Du hast noch keine Einkaufslisten. Tippe auf das <Text style={{fontWeight: 'bold'}}>+</Text> unten rechts, um deine erste Liste zu erstellen.
        </Subheading>
    </View>
  );

  return (
    <View style={styles.container}>
      {isSearchVisible && (
        <Searchbar
          placeholder="Listen durchsuchen..."
          onChangeText={setSearchQuery}
          value={searchQuery}
          style={styles.searchbar}
          onIconPress={() => setIsSearchVisible(false)}
        />
      )}
      <FlatList
        data={filteredLists}
        keyExtractor={(item) => item.id}
        renderItem={renderListCard}
        ListEmptyComponent={EmptyListComponent}
        contentContainerStyle={lists.length === 0 ? { flexGrow: 1, justifyContent: 'center' } : {}}
      />
      <FAB style={styles.fab} icon="plus" onPress={handleAddList} />

      <Portal>
        <Dialog visible={isRenameDialogVisible} onDismiss={() => setIsRenameDialogVisible(false)}>
          <Dialog.Title>Liste umbenennen</Dialog.Title>
          <Dialog.Content>
            <TextInput
              label="Neuer Name"
              value={newListName}
              onChangeText={setNewListName}
              autoFocus
            />
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setIsRenameDialogVisible(false)}>Abbrechen</Button>
            <Button onPress={handleRenameList}>Speichern</Button>
          </Dialog.Actions>
        </Dialog>

        <Dialog visible={isJoinDialogVisible} onDismiss={() => setIsJoinDialogVisible(false)}>
            <Dialog.Title>Liste beitreten</Dialog.Title>
            <Dialog.Content>
                <TextInput
                label="Freigabecode eingeben"
                value={joinCode}
                onChangeText={setJoinCode}
                autoCapitalize="characters"
                autoFocus
                placeholder="z.B. ABC123"
                />
            </Dialog.Content>
            <Dialog.Actions>
                <Button onPress={() => setIsJoinDialogVisible(false)}>Abbrechen</Button>
                <Button onPress={handleJoinList}>Beitreten</Button>
            </Dialog.Actions>
        </Dialog>
      </Portal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  fab: { position: 'absolute', margin: 16, right: 0, bottom: 0 },
  searchbar: { margin: 8 },
  card: {
    marginVertical: 5,
    marginHorizontal: 10,
  },
  contentContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
  },
  textContainer: {
    flex: 1, 
    paddingRight: 10, // Make some space for edit buttons
  },
  actionsContainer: {
    flexDirection: 'row',
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  paragraph: {
    fontSize: 12,
    color: 'grey',
  },
  articlesPreview: {
    marginTop: 5,
    fontStyle: 'italic',
  },
  sharedIcon: {
    position: 'absolute',
    top: 5,
    right: 5,
    margin: 0,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 30,
  },
  emptyTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  emptySubheading: {
    fontSize: 16,
    textAlign: 'center',
    lineHeight: 24,
  },
});
