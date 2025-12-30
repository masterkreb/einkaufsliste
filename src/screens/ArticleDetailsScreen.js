import React, { useState, useEffect } from 'react';
import { View } from 'react-native';
import { TextInput, Button, Text } from 'react-native-paper';
import { useRoute, useNavigation } from '@react-navigation/native';
import { auth, db } from '../services/firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { loadListsLocally, saveListsLocally } from '../services/asyncStorage';

export default function ArticleDetailsScreen() {
  const route = useRoute();
  const navigation = useNavigation();
  const { articleId, listId } = route.params;
  const [article, setArticle] = useState(null);
  const [notes, setNotes] = useState('');
  const user = auth.currentUser;

  useEffect(() => {
    const loadArticle = async () => {
      if (user) {
        const listRef = doc(db, `users/${user.uid}/lists`, listId);
        const listSnap = await getDoc(listRef);
        if (listSnap.exists()) {
            const listData = listSnap.data();
            const currentArticle = listData.articles.find(a => a.id === articleId);
            if (currentArticle) {
                setArticle(currentArticle);
                setNotes(currentArticle.notes || '');
            }
        }
      } else {
        const lists = await loadListsLocally();
        const currentList = lists.find(l => l.id === listId);
        if (currentList) {
          const currentArticle = currentList.articles.find(a => a.id === articleId);
          if (currentArticle) {
            setArticle(currentArticle);
            setNotes(currentArticle.notes || '');
          }
        }
      }
    };
    loadArticle();
  }, [articleId, listId, user]);

  const handleSave = async () => {
    if (user) {
        const listRef = doc(db, `users/${user.uid}/lists`, listId);
        const listSnap = await getDoc(listRef);
        if (listSnap.exists()) {
            const listData = listSnap.data();
            const updatedArticles = listData.articles.map(a =>
                a.id === articleId ? { ...a, ...article, notes } : a
            );
            const updatedList = { ...listData, articles: updatedArticles, updatedAt: Date.now() };
            await setDoc(listRef, updatedList);
        }
    } else {
      const allLists = await loadListsLocally();
      const listIndex = allLists.findIndex(l => l.id === listId);
      if (listIndex > -1) {
          const articles = allLists[listIndex].articles;
          const articleIndex = articles.findIndex(a => a.id === articleId);
          if (articleIndex > -1) {
              articles[articleIndex] = { ...articles[articleIndex], ...article, notes };
              allLists[listIndex].articles = articles;
              allLists[listIndex].updatedAt = Date.now();
              await saveListsLocally(allLists);
          }
      }
    }
    navigation.goBack();
  };

  if (!article) {
    return <Text>Loading...</Text>;
  }

  return (
    <View style={{ flex: 1, padding: 16 }}>
      <Text style={{ fontSize: 24, fontWeight: 'bold', marginBottom: 16 }}>{article.name}</Text>
      <TextInput
        label="Notizen"
        value={notes}
        onChangeText={setNotes}
        multiline
        numberOfLines={4}
        style={{ marginBottom: 16 }}
      />
      <Button mode="contained" onPress={handleSave}>Speichern</Button>
    </View>
  );
}
