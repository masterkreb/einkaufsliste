# Dokumentation: Familien-Einkaufsliste
**Modul:** 335 Mobile Applikation planen, entwickeln und publizieren  
**Autor:** Imad Chatila  
**Datum:** 01.01.2026

---

# Familien-Einkaufsliste App

## Überblick
Diese App ermöglicht es Familienmitgliedern, gemeinsame Einkaufslisten zu erstellen, freizugeben und zu verwalten. Sie unterstützt Offline-Speicherung und Synchronisation über Firebase. Entwickelt im Rahmen von Modul 335 mit React Native.

**Anforderungen erfüllt:**
- Aktor/Sensor 1: Kamera (Barcode-Scan via Open Food Facts API)
- Aktor/Sensor 2: Vibrationsmotor (haptisches Feedback bei Abhaken)
- Persistente Storage: Firebase Firestore + AsyncStorage (offline)
- Authentifizierung: Firebase Auth (optional)

## Aufgabe 1: Mobile App – Anforderungen und Planung

### Storyboard
Beschreibung der Screens und Abläufe (textuell, da keine Bilder):

1. **Startscreen (Hauptübersicht)**:
   - **Anzeige**: Zeigt alle Listen als Titel-Liste (Titel aus erster Zeile, "Zuletzt bearbeitet: [Datum]" in zweiter Zeile, Vorschau-Text darunter).
   - **Buttons**: Unten rechts "+" für neue Liste; oben rechts "⋮" (drei Punkte) für Untermenü mit "Bearbeiten" (aktiviert Auswahlmodus für Bulk-Löschung), "Anmeldung/Registrierung" (optional), "Suche" (lässt Suchleiste ausklappen/erscheinen), "Beitreten" (öffnet Dialog zum Eingeben eines Codes, um einer freigegebenen Liste beizutreten).
   - **Interaktionen**: Klick auf Titel öffnet Bearbeitung; Long-Press öffnet Menü mit "Löschen" (einzeln). Im Bearbeiten-Modus: Checkboxen links neben Listen, "Löschen"-Button für ausgewählte Listen.
   - **Zusätzliche Features**: Suchleiste oben (ausklappbar via Untermenü).
   - **Hinweis**: Offline ohne Anmeldung möglich; bei Anmeldung Synchronisation.
2. **Liste bearbeiten**: Direkt nach Klick auf Titel geöffnet – Artikel hinzufügen/entfernen. Links neben jedem Artikel: Checkbox (Viereck) – Klick markiert als erledigt (durchgestrichen) und vibriert. Oben rechts: ⋮-Menü mit "Bearbeiten" (aktiviert Löschmodus für Artikel), "Teilnehmer verwalten". Oben links: "Freigeben"-Button. Integration: Kamera für Barcode-Scan (öffnet Kamera, scannt Barcode, ruft Open Food Facts API ab für Produktinfo), Vibrationsmotor für haptisches Feedback (vibriert bei Abhaken). (Voll offline möglich, aber Scan braucht Internet.) Button zurück zur Übersicht. Im Bearbeiten-Modus: Rote [-] Icons rechts neben Artikeln zum Löschen.
3. **Artikel-Details**: Name und Menge eingeben (Popup oder separater Screen).
4. **Freigeben**: Liste mit Familie freigeben (optional, erfordert Anmeldung und Internet – kann übersprungen werden). Klick auf "Freigeben"-Button generiert 6-stelligen Code (z.B. 'A3F8K2'), zeigt ihn im Dialog an und speichert ihn in Firestore. Code wird manuell geteilt (z.B. per WhatsApp/SMS), andere können im ⋮-Menü "Beitreten" wählen und Code eingeben, um der Liste beizutreten.

Ablauf: Startscreen (Titel-Liste) → Klick auf Titel → Liste bearbeiten → Speichern (lokal oder Firestore bei Login). Anmeldung/Freigeben optional.

### Storyboard-Skizzen (Handgezeichnet)
*(Hier handgezeichnete Skizzen der Screens einfügen: Startscreen, Liste bearbeiten, Artikel-Details, Freigeben. Zeichne einfache Handskizzen auf Papier oder digital, fotografiere sie und füge sie hier ein. Beschreibe kurz jede Skizze.)*

### Funktionalitäten
- Listen erstellen/bearbeiten/löschen (primär für individuelle Nutzung, auch offline ohne Internet und ohne Anmeldung – lokale Speicherung mit AsyncStorage). Bulk-Löschung im Bearbeiten-Modus möglich.
- Artikel mit Mengen (z. B. "5 x Brot", "2 x Milch") hinzufügen/bearbeiten/löschen. Einzelne Löschung im Bearbeiten-Modus.
- Offline-Modus mit lokaler Speicherung (funktioniert vollständig ohne Online-Verbindung und Anmeldung – Daten bleiben auf dem Gerät).
- Kamera: Barcode-Scan mit Open Food Facts API (erkennt Produkte, z. B. Schweizer Marken wie Migros, Coop; Fallback: Manueller Eingabe bei unbekannten Barcodes).
- Vibrationsmotor: Haptisches Feedback (vibriert nur bei Abhaken eines Artikels).
- Authentifizierung: Anmeldung für persönliche Listen und Synchronisation (erforderlich für Firestore und Freigeben, aber App kann auch ohne genutzt werden – dann nur lokal).
- Synchronisation: Listen über Firestore freigeben (optional nach Wahl – erfordert Anmeldung und Internet; ohne Anmeldung bleibt alles lokal).

### Testplan
Anwendungsfälle als Testfälle in Tabelle:

| ID  | Testfall                          | Vorbedingung                  | Aktion                          | Erwartetes Resultat                          |
|:----|:----------------------------------|:------------------------------|:--------------------------------|:---------------------------------------------|
| TC1 | Liste erstellen (offline ohne Anmeldung) | App installiert, kein Internet | Auf + tippen, Titel eingeben    | Liste lokal gespeichert, sichtbar ohne Internet/Login |
| TC2 | Artikel hinzufügen (offline)      | Liste vorhanden, kein Internet | Artikel mit Menge eingeben      | Artikel gespeichert, bleibt bei Neustart     |
| TC3 | Kamera (Barcode-Scan)             | Kamera-Berechtigung erteilt   | Barcode scannen                 | Produkt erkannt via API, zur Liste hinzugefügt; Fallback bei unbekannt |
| TC4 | Vibrationsmotor                   | Liste mit Artikeln            | Checkbox klicken                | Vibration bei Abhaken                        |
| TC5 | Authentifizierung                 | Internet verfügbar            | Login durchführen               | Erfolgreich, Listen synchronisiert           |
| TC6 | Offline-Speicherung ohne Anmeldung | Listen vorhanden, kein Internet | Listen öffnen/bearbeiten        | Verfügbar und editierbar                     |
| TC7 | Freigeben                         | Anmeldung erfolgt             | Freigeben-Button, Code teilen   | Liste für andere sichtbar                    |
| TC8 | Teilnehmer verwalten              | Freigegebene Liste            | ⋮ > Teilnehmer verwalten        | Ersteller kann entfernen, andere nicht       |
| TC9 | Liste löschen (einzeln) | Liste vorhanden | Long-Press auf Liste → Löschen | Liste entfernt |
| TC10 | Bulk-Löschung Listen             | Mehrere Listen vorhanden      | ⋮ > Bearbeiten, Listen auswählen, Löschen | Ausgewählte Listen entfernt                   |
| TC11 | Artikel löschen                  | Liste mit Artikeln            | ⋮ > Bearbeiten, [-] klicken     | Artikel entfernt                               |

Tests durchführen nach Implementierung und Ergebnisse festhalten.

### UI-Mockups (Detaillierte Text-Darstellung)
Hier ein einfaches textbasiertes Mockup der Hauptübersicht (Startscreen):

```
+-----------------------------+
|                        [⋮]  |
| [Suchleiste: _____________] |
|                             |
| Wochenendeinkauf            |
| Zuletzt bearbeitet: 29.12.2025 |
| Milch, Brot, Eier...        |
|                             |
| Party-Zutaten               |
| Zuletzt bearbeitet: 28.12.2025 |
| Chips, Getränke...          |
|                             |
| [ + ]                       |
+-----------------------------+
```

- Oben rechts: ⋮ (drei Punkte) für Untermenü (Bearbeiten, Anmeldung, Suche, Beitreten).
- Suchleiste darunter (ausklappbar).
- Listen: Titel, Datum, Vorschau.
- Unten rechts: + für neue Liste.

**⋮-Menü im Startscreen**:
```
+-----------------------------+
| ⋮                           |
| - Bearbeiten                |
| - Anmeldung/Registrierung   |
| - Suche                     |
| - Beitreten                 |
+-----------------------------+
```

- Öffnet bei Klick auf ⋮ im Startscreen.
- Optionen: "Bearbeiten" (aktiviert Auswahlmodus für Listen), "Anmeldung/Registrierung" (öffnet Login), "Suche" (zeigt Suchleiste), "Beitreten" (öffnet Code-Eingabe-Dialog).

Untermenü bei ⋮:
- Bearbeiten (aktiviert Auswahlmodus)
- Anmeldung/Registrierung
- Suche (lässt Suchleiste ausklappen/erscheinen)
- Beitreten (öffnet Dialog zum Eingeben eines Codes)

**Startscreen im Bearbeiten-Modus**:
```
+-----------------------------+
| [Abbrechen] [Löschen]       |
| [Suchleiste: _____________] |
|                             |
| [ ] Wochenendeinkauf        |
| Zuletzt bearbeitet: 29.12.2025 |
| Milch, Brot, Eier...        |
|                             |
| [x] Party-Zutaten           |
| Zuletzt bearbeitet: 28.12.2025 |
| Chips, Getränke...          |
|                             |
| [ + ]                       |
+-----------------------------+
```

- Oben links: "Abbrechen" (verlässt Modus).
- Oben rechts: "Löschen" (löscht ausgewählte Listen).
- Listen: Checkboxen links für Auswahl.
- Unten rechts: + bleibt sichtbar.

**Bearbeitungsscreen (nach Klick auf Titel)**:
```
+-----------------------------+
|                      [⋮]    |
|                             |
| Wochenendeinkauf            |
| - [ ] 5 x Brot              |
| - [x] 2 x Milch             |
| - [Neuer Artikel]           |
|                             |
| [Scan] [ + ]                |
+-----------------------------+
```

- Oben rechts: ⋮-Menü mit "Freigeben", "Bearbeiten", "Teilnehmer verwalten".
- Unten: [Scan]-Button (öffnet Kamera für Barcode-Scan), [ + ] für manueller Eingabe.
- Liste bearbeiten: Artikel mit Checkbox links ( [ ] für offen, [x] für erledigt/durchgestrichen, vibriert bei Klick).

**Bearbeitungsscreen im Bearbeiten-Modus (nach ⋮ > Bearbeiten)**:
```
+-----------------------------+
|                      [⋮]    |
|                             |
| Wochenendeinkauf            |
| - [ ] 5 x Brot         [-]  |
| - [x] 2 x Milch        [-]  |
| - [Neuer Artikel]           |
|                             |
| [Scan] [ + ]                |
+-----------------------------+
```

- Im Bearbeiten-Modus erscheinen rote [-] Icons rechts neben Artikeln zum Löschen (mit Bestätigung).

**⋮-Menü im Bearbeitungsscreen**:
```
+-----------------------------+
| ⋮                           |
| - Freigeben                 |
| - Bearbeiten                |
| - Teilnehmer verwalten      |
+-----------------------------+
```

- Öffnet bei Klick auf ⋮.
- Optionen: "Freigeben" (öffnet Freigeben-Dialog), "Bearbeiten" (aktiviert Löschmodus für Artikel), "Teilnehmer verwalten".

**Teilnehmerverwaltung-Dialog (bei ⋮ > Teilnehmer verwalten)**:
```
+-----------------------------+
| Teilnehmer                  |
| - Ersteller (Du)            |
| - User1 [Entfernen]         |
| - User2 [Entfernen]         |
| [Schließen]                 |
+-----------------------------+
```

- Zeigt alle Teilnehmer.
- Ersteller kann andere mit [Entfernen] löschen (Bestätigung).
- Andere können die Liste nicht verwalten.

**Freigeben-Dialog (bei Klick auf Freigeben-Button)**:
```
+-----------------------------+
| Liste freigeben             |
|                             |
| Generierter Code: A3F8K2    |
|                             |
| [Code teilen] [Schließen]    |
+-----------------------------+
```

- Zeigt den generierten 6-stelligen Code an (z.B. 'A3F8K2').
- [Code teilen] öffnet Share-Menü (WhatsApp, SMS, etc.) für manuellen Austausch.
- Code wird in Firestore gespeichert und ermöglicht Beitritt zur Liste.

## Aufgabe 2: Mobile App – Lösungskonzept erarbeiten

### 2.a) Framework und App-Typ

**Gewähltes Framework:** React Native mit Expo  
**App-Typ:** Hybrid-App (Cross-Platform)  
**Entwicklungsumgebung:** Visual Studio Code mit Expo CLI

**Begründung der Framework-Wahl:**
- **Plattformübergreifend:** Eine Codebasis für Android und iOS, was die Entwicklungszeit erheblich reduziert
- **Expo-Integration:** Vereinfacht den Zugriff auf Hardware-Funktionen (Kamera, Vibration) durch vorgefertigte Module
- **Firebase-Support:** Hervorragende Integration mit Firebase für Authentication, Firestore und Storage
- **Community & Dokumentation:** Große Community, viele npm-Pakete und umfangreiche Dokumentation verfügbar
- **Schnelles Prototyping:** Expo Go App ermöglicht sofortiges Testen auf physischen Geräten ohne Build-Prozess

**App-Architektur und wichtigste Komponenten:**

1. **Navigation (React Navigation)**
   - Stack Navigator für Screen-Übergänge
   - Screens: StartScreen, ListEditScreen, ArticleDetailsScreen, LoginScreen

2. **State Management**
   - React Context API für globalen App-State (User, Listen)
   - React Hooks (useState, useEffect, useContext) für lokalen State
   - AsyncStorage für Offline-Persistierung

3. **UI-Komponenten**
   - React Native Paper oder NativeBase für konsistentes Design
   - Custom Components: ListCard, ArticleItem, BarcodeScanner, ShareDialog

4. **Backend-Integration**
   - Firebase SDK für Firestore, Authentication und Storage
   - Axios für Open Food Facts API-Calls

5. **Projektstruktur:**
```
/src
  /screens
    - StartScreen.js         (Übersicht aller Listen)
    - ListEditScreen.js      (Artikel bearbeiten)
    - ArticleDetailsScreen.js (Artikel hinzufügen/bearbeiten)
    - LoginScreen.js         (Authentifizierung)
  /components
    - ListCard.js            (Listen-Vorschau Karte)
    - ArticleItem.js         (Einzelner Artikel mit Checkbox)
    - BarcodeScanner.js      (Kamera-Scanner Komponente)
    - ShareDialog.js         (Freigabe-Dialog)
  /services
    - firebase.js            (Firebase Konfiguration)
    - asyncStorage.js        (Lokale Speicherung)
    - openFoodFacts.js       (API-Integration)
  /utils
    - helpers.js             (Hilfsfunktionen)
  /navigation
    - AppNavigator.js        (Navigation Setup)
```

---

### 2.b) Detaillierte Umsetzung der Elemente

#### **Element 1: Kamera (Barcode-Scanner)**

**Verwendung:**  
Die Kamera wird zum Scannen von Produkt-Barcodes genutzt. Nach erfolgreichem Scan wird die Open Food Facts API aufgerufen, um Produktinformationen abzurufen und automatisch zur Einkaufsliste hinzuzufügen.

**Technische Umsetzung:**
- **Package:** `expo-camera` (für Kamera-Zugriff) + `expo-barcode-scanner` (für Barcode-Erkennung)
- **Berechtigungen:** Kamera-Berechtigung wird zur Laufzeit angefordert (`Camera.requestCameraPermissionsAsync()`)
- **Ablauf:**
  1. Benutzer tippt auf [Scan]-Button im ListEditScreen
  2. BarcodeScanner-Komponente öffnet sich als Modal
  3. Kamera zeigt Live-Vorschau mit Scan-Bereich
  4. Bei erkanntem Barcode: API-Call zu Open Food Facts (`https://world.openfoodfacts.org/api/v0/product/{barcode}.json`)
  5. Produktname wird extrahiert und zur Liste hinzugefügt
  6. **Fallback:** Bei unbekanntem Barcode → Manuelles Eingabefeld erscheint

**Code-Beispiel:**
```javascript
import { Camera } from 'expo-camera';
import { BarCodeScanner } from 'expo-barcode-scanner';

const BarcodeScanner = ({ onScan }) => {
  const [hasPermission, setHasPermission] = useState(null);

  useEffect(() => {
    (async () => {
      const { status } = await Camera.requestCameraPermissionsAsync();
      setHasPermission(status === 'granted');
    })();
  }, []);

  const handleBarCodeScanned = async ({ data }) => {
    const response = await fetch(`https://world.openfoodfacts.org/api/v0/product/${data}.json`);
    const product = await response.json();
    onScan(product.product.product_name || 'Unbekanntes Produkt');
  };

  return (
    <BarCodeScanner
      onBarCodeScanned={handleBarCodeScanned}
      style={StyleSheet.absoluteFillObject}
    />
  );
};
```

---

#### **Element 2: Vibrationsmotor (Haptisches Feedback)**

**Verwendung:**  
Der Vibrationsmotor gibt haptisches Feedback beim Abhaken von Artikeln, um dem Benutzer eine direkte Bestätigung der Aktion zu geben.

**Technische Umsetzung:**
- **Package:** `expo-haptics`
- **Vibrations-Typen:** 
  - `ImpactFeedbackStyle.Medium` für Checkbox-Klick (mittlere Intensität)
  - `ImpactFeedbackStyle.Light` für andere Interaktionen (optional)
- **Trigger:** Wird nur beim Aktivieren/Deaktivieren der Checkbox ausgelöst

**Code-Beispiel:**
```javascript
import * as Haptics from 'expo-haptics';

const ArticleItem = ({ article, onToggle }) => {
  const handleCheckboxPress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    onToggle(article.id);
  };

  return (
    <TouchableOpacity onPress={handleCheckboxPress}>
      <Checkbox checked={article.checked} />
      <Text style={article.checked && styles.strikethrough}>
        {article.name}
      </Text>
    </TouchableOpacity>
  );
};
```

---

#### **Element 3: Persistente Speicherung (Firebase Firestore + AsyncStorage)**

**Verwendung:**  
Firestore speichert Listen und Artikel in der Cloud für Echtzeit-Synchronisation zwischen Geräten. AsyncStorage dient als lokaler Cache für Offline-Funktionalität.

**Firestore Datenstruktur:**
```
users/
  {userId}/
    lists/
      {listId}/
        - name: "Wocheneinkauf"
        - createdAt: timestamp
        - shareCode: "A3F8K2"
        - ownerId: "userId"
        - members: ["userId1", "userId2"]
        articles/
          {articleId}/
            - name: "Milch"
            - quantity: "2 Liter"
            - checked: false
            - createdAt: timestamp
```

**Technische Umsetzung:**
- **Package:** `firebase` (v10+)
- **Offline-Modus:** Firestore hat integrierte Offline-Persistierung (`enableIndexedDbPersistence()`)
- **Echtzeit-Synchronisation:** Snapshot-Listener überwachen Änderungen und aktualisieren UI automatisch
- **AsyncStorage:** Speichert Listen lokal, wenn Benutzer nicht angemeldet ist

**Code-Beispiel (Firestore):**
```javascript
import { getFirestore, collection, onSnapshot, addDoc, updateDoc, deleteDoc, doc } from 'firebase/firestore';

// Echtzeit-Listener für Artikel
const listenToArticles = (listId, callback) => {
  const db = getFirestore();
  const articlesRef = collection(db, `users/${userId}/lists/${listId}/articles`);
  
  return onSnapshot(articlesRef, (snapshot) => {
    const articles = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
    callback(articles);
  });
};

// Artikel hinzufügen
const addArticle = async (listId, articleData) => {
  const db = getFirestore();
  await addDoc(collection(db, `users/${userId}/lists/${listId}/articles`), {
    ...articleData,
    createdAt: new Date()
  });
};
```

**Code-Beispiel (AsyncStorage für Offline):**
```javascript
import AsyncStorage from '@react-native-async-storage/async-storage';

// Listen lokal speichern (wenn nicht angemeldet)
const saveListsLocally = async (lists) => {
  await AsyncStorage.setItem('local_lists', JSON.stringify(lists));
};

// Listen lokal laden
const loadListsLocally = async () => {
  const data = await AsyncStorage.getItem('local_lists');
  return data ? JSON.parse(data) : [];
};
```

---

#### **Element 4: Authentifizierung (Firebase Authentication)**

**Verwendung:**  
Firebase Authentication ermöglicht Benutzeranmeldung für Synchronisation und Freigabe von Listen. Die App kann auch ohne Anmeldung (nur lokal) genutzt werden.

**Technische Umsetzung:**
- **Package:** `firebase/auth`
- **Methoden:** E-Mail/Passwort-Authentifizierung
- **Features:**
  - Registrierung neuer Benutzer
  - Login bestehender Benutzer
  - Automatischer Login bei App-Start (persistente Session)
  - Logout-Funktion
- **Auth-State-Verwaltung:** `onAuthStateChanged()` überwacht Login-Status

**Code-Beispiel:**
```javascript
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, onAuthStateChanged, signOut } from 'firebase/auth';

// Registrierung
const registerUser = async (email, password) => {
  const auth = getAuth();
  try {
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    return userCredential.user;
  } catch (error) {
    throw new Error(error.message);
  }
};

// Login
const loginUser = async (email, password) => {
  const auth = getAuth();
  try {
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    return userCredential.user;
  } catch (error) {
    throw new Error('Ungültige Anmeldedaten');
  }
};

// Auth-State überwachen
const auth = getAuth();
onAuthStateChanged(auth, (user) => {
  if (user) {
    // Benutzer ist angemeldet → Firestore-Sync starten
    console.log('Angemeldet als:', user.email);
  } else {
    // Benutzer ist nicht angemeldet → Nur lokaler Modus
    console.log('Nicht angemeldet');
  }
});

// Logout
const logoutUser = async () => {
  const auth = getAuth();
  await signOut(auth);
};
```

---

#### **Element 5: Freigabe-Mechanismus (6-stelliger Code)**

**Verwendung:**  
Listen können über einen 6-stelligen Code mit Familienmitgliedern geteilt werden. Der Code wird in Firestore gespeichert und ermöglicht das Beitreten zur Liste.

**Technische Umsetzung:**
- **Code-Generierung:** Zufälliger 6-stelliger alphanumerischer Code (z.B. "A3F8K2")
- **Firestore-Feld:** `shareCode` wird im Listen-Dokument gespeichert
- **Beitritt:** Benutzer gibt Code ein → App sucht Liste mit diesem Code → Fügt Benutzer zu `members`-Array hinzu

**Code-Beispiel:**
```javascript
// Code generieren
const generateShareCode = () => {
  return Math.random().toString(36).substring(2, 8).toUpperCase();
};

// Liste freigeben
const shareList = async (listId) => {
  const db = getFirestore();
  const code = generateShareCode();
  await updateDoc(doc(db, `users/${userId}/lists/${listId}`), {
    shareCode: code
  });
  return code;
};

// Mit Code beitreten
const joinListByCode = async (code) => {
  const db = getFirestore();
  const listsRef = collection(db, 'users');
  const q = query(listsRef, where('shareCode', '==', code));
  const snapshot = await getDocs(q);
  
  if (!snapshot.empty) {
    const listDoc = snapshot.docs[0];
    await updateDoc(listDoc.ref, {
      members: arrayUnion(currentUserId)
    });
  } else {
    throw new Error('Ungültiger Code');
  }
};
```

---

### Zusammenfassung der verwendeten Packages

| Package | Zweck |
|:--------|:------|
| `expo-camera` | Kamera-Zugriff |
| `expo-barcode-scanner` | Barcode-Erkennung |
| `expo-haptics` | Vibrations-Feedback |
| `firebase` | Firestore, Authentication, Storage |
| `@react-native-async-storage/async-storage` | Lokale Speicherung |
| `axios` | API-Calls (Open Food Facts) |
| `@react-navigation/native` | Navigation zwischen Screens |
| `react-native-paper` | UI-Komponenten |

---


## Aufgabe 3: Mobile App programmieren
*(Platzhalter – wird später erweitert)*

## Aufgabe 4: Mobile App publizieren
*(Platzhalter – wird später erweitert)*

## Aufgabe 5: Mobile App gemäss Testplan überprüfen
*(Platzhalter – wird später erweitert)*