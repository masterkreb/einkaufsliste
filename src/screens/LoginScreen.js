import React, { useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import { TextInput, Button, Text, Title, Subheading } from 'react-native-paper';
import { auth, db } from '../services/firebase';
import { createUserWithEmailAndPassword, signInWithEmailAndPassword, sendPasswordResetEmail } from 'firebase/auth';
import { doc, setDoc } from 'firebase/firestore';

export default function LoginScreen({ navigation }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [isSignUp, setIsSignUp] = useState(false); // State to toggle between Login and Sign Up

  const getFriendlyErrorMessage = (err) => {
    switch (err.code) {
      case 'auth/invalid-credential':
        return 'Die E-Mail-Adresse oder das Passwort ist falsch.';
      case 'auth/invalid-email':
        return 'Die E-Mail-Adresse ist ungültig oder falsch formatiert.';
      case 'auth/user-not-found':
        return 'Es wurde kein Konto mit dieser E-Mail-Adresse gefunden.';
      case 'auth/wrong-password':
        return 'Das eingegebene Passwort ist falsch.';
      case 'auth/email-already-in-use':
        return 'Diese E-Mail-Adresse wird bereits verwendet. Bitte melden Sie sich stattdessen an.';
      case 'auth/weak-password':
        return 'Das Passwort ist zu schwach. Es muss mindestens 6 Zeichen lang sein.';
      case 'auth/network-request-failed':
        return 'Keine Netzwerkverbindung. Bitte versuchen Sie es später erneut.';
      default:
        console.error('Firebase Auth Error:', err);
        return 'Ein unerwarteter Fehler ist aufgetreten. Bitte versuchen Sie es erneut.';
    }
  };

  const handleAuthAction = async (action) => {
    if (!email || !password) {
      setError(isSignUp ? 'Bitte geben Sie E-Mail und Passwort ein, um sich zu registrieren.' : 'Bitte geben Sie E-Mail und Passwort ein.');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const userCredential = await action();      
      // User-Dokument erstellen bei Registrierung
      await setDoc(doc(db, 'users', userCredential.user.uid), {
        email: userCredential.user.email
      }, { merge: true });
      
      // AppNavigator wird automatisch zur StartScreen navigieren
    } catch (err) {
      setError(getFriendlyErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };


  const handlePrimaryAction = () => {
    if (isSignUp) {
      handleAuthAction(() => createUserWithEmailAndPassword(auth, email, password));
    } else {
      handleAuthAction(() => signInWithEmailAndPassword(auth, email, password));
    }
  };

  const handlePasswordReset = async () => {
    if (!email) {
      setError('Bitte geben Sie Ihre E-Mail-Adresse an, um das Passwort zurückzusetzen.');
      return;
    }
    setLoading(true);
    setError('');
    try {
      await sendPasswordResetEmail(auth, email);
      alert('E-Mail zum Zurücksetzen des Passworts wurde gesendet!');
    } catch (err) {
      setError(getFriendlyErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAwareScrollView
      style={styles.container}
      contentContainerStyle={styles.inner}
    >
      <View style={styles.headerContainer}>
        <Title style={styles.headerTitle}>Familien-Einkaufsliste</Title>
        <Subheading style={styles.subheading}>Einfach. Synchronisiert. Geteilt.</Subheading>
      </View>

      <Title style={styles.title}>{isSignUp ? 'Konto erstellen' : 'Anmelden'}</Title>
      
      <TextInput 
        label="Email" 
        value={email} 
        onChangeText={setEmail} 
        keyboardType="email-address" 
        autoCapitalize="none" 
        disabled={loading} 
        style={styles.input}
      />
      <TextInput 
        label="Password" 
        value={password} 
        onChangeText={setPassword} 
        secureTextEntry 
        disabled={loading} 
        style={styles.input}
        onSubmitEditing={handlePrimaryAction}
      />

      {error ? <Text style={styles.error}>{error}</Text> : null}

      <Button 
        mode="contained" 
        onPress={handlePrimaryAction} 
        style={styles.button} 
        loading={loading} 
        disabled={loading}
      >
        {isSignUp ? 'Registrieren' : 'Anmelden'}
      </Button>

      <Button 
        onPress={() => {
          setIsSignUp(!isSignUp);
          setError('');
        }} 
        style={styles.switchButton} 
        disabled={loading}
      >
        {isSignUp ? 'Sie haben bereits ein Konto? Anmelden' : 'Noch kein Konto? Registrieren'}
      </Button>

      {!isSignUp && (
        <Button 
          onPress={handlePasswordReset} 
          style={styles.switchButton} 
          disabled={loading}
        >
          Passwort vergessen
        </Button>
      )}
    </KeyboardAwareScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  inner: {
    flexGrow: 1,
    padding: 20,
    justifyContent: 'center',
  },
  headerContainer: {
    alignItems: 'center',
    marginBottom: 40,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  subheading: {
    fontSize: 16,
    textAlign: 'center',
    marginTop: 8,
    color: '#666',
  },
  title: {
    textAlign: 'center',
    marginBottom: 24,
  },
  input: {
    marginBottom: 12,
  },
  error: {
    color: '#D32F2F',
    marginVertical: 10,
    textAlign: 'center',
    fontSize: 14,
  },
  button: {
    marginTop: 16,
    paddingVertical: 8,
  },
  switchButton: {
    marginTop: 12,
  },
});
