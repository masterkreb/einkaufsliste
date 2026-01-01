# Dokumentation: Familien-Einkaufsliste
**Modul:** 335 Mobile Applikation planen, entwickeln und publizieren  
**Autor:** Imad Chatila  
**Datum:** 01.01.2026

---

## Überblick
Diese App ermöglicht es Familienmitgliedern, gemeinsame Einkaufslisten zu erstellen und zu verwalten. Die Listen können über einen Code geteilt werden und synchronisieren sich in Echtzeit über Firebase.

**Anforderungen erfüllt:**
- **Aktor/Sensor 1:** Kamera (Barcode-Scanner)
- **Aktor/Sensor 2:** Vibrationsmotor (haptisches Feedback)
- **Persistente Storage:** Firebase Firestore
- **Authentifizierung:** Firebase Authentication

---

## Aufgabe 1: Mobile App – Anforderungen und Planung

### 1.a) Storyboard und Screen-Abläufe

#### **Screen 1: Login-Screen**
- Anmeldung oder Registrierung mit E-Mail und Passwort
- Buttons: "Anmelden", "Registrieren", "Passwort vergessen"
- Bei erfolgreicher Anmeldung → Weiterleitung zur Listenübersicht

#### **Screen 2: Listenübersicht (StartScreen)**
- Zeigt alle Einkaufslisten als Karten
- Jede Karte zeigt: Titel, letztes Bearbeitungsdatum, Vorschau der Artikel
- Oben rechts: Drei-Punkte-Menü (⋮) mit "Bearbeiten", "Liste beitreten", "Abmelden"
- Suchleiste zum Filtern von Listen
- FAB-Button (+) unten rechts zum Erstellen neuer Listen

**Bearbeiten-Modus (im StartScreen):**
- Aktivierung über Drei-Punkte-Menü (oben rechts) → "Bearbeiten"
- Jede Listenkarte bekommt zwei Icons: Stift (umbenennen) und Papierkorb (löschen)
- "Fertig"-Button oben rechts zum Beenden des Bearbeiten-Modus

#### **Screen 3: Liste bearbeiten (ListEditScreen)**
- Artikelliste mit Checkboxen zum Abhaken
- Jeder Artikel zeigt: Menge, Name
- Stift-Icon für Inline-Bearbeitung (Name und Menge ändern)
- Swipe nach links → "Löschen"-Button
- Long-Press auf Artikel → aktiviert Bulk-Auswahl-Modus mit Vibration
- Unten: Eingabefelder für "Menge" und "Neuer Artikel" mit Barcode-Icon
- Oben rechts: 
  - 👥-Icon (Freigabe-Button) zum Teilen der Liste
  - Drei-Punkte-Menü (⋮) mit "Artikel auswählen", "Erledigte löschen", "Mitglieder verwalten"

**Barcode-Scanner (Modal):**
- Vollbild-Kamera mit roter Ziellinie
- Scannt Barcodes und holt Produktinfos von Open Food Facts API
- "Abbrechen"-Button zum Schliessen

#### **Screen 4: Artikel-Details**
- Zeigt Artikelnamen als Titel
- "Speichern"-Button

### 1.b) Funktionalitäten

**Listen-Verwaltung:**
- Listen erstellen, umbenennen, löschen
- Listen durchsuchen (Echtzeit-Filter)
- Listen teilen via 6-stelligem Code

**Artikel-Verwaltung:**
- Artikel manuell hinzufügen (Name + Menge)
- Artikel via Barcode scannen (mit API-Abfrage)
- Artikel abhaken/erledigen (mit Vibrationsfeedback)
- Artikel bearbeiten (Inline-Editor)
- Artikel löschen (Swipe oder Bulk-Auswahl)
- Alle erledigten Artikel auf einmal löschen

**Synchronisation:**
- Echtzeit-Updates über Firebase Firestore
- Geteilte Listen: Alle Mitglieder sehen Änderungen sofort
- Ersteller kann Mitglieder entfernen

**Hardware:**
- Kamera für Barcode-Scan
- Vibration beim Abhaken und bei Long-Press

### 1.c) Testplan

| ID   | Testfall                        | Vorbedingung              | Aktion                                      | Erwartetes Resultat                    |
|:-----|:--------------------------------|:--------------------------|:--------------------------------------------|:---------------------------------------|
| TC1  | Registrierung                   | Internet verfügbar        | E-Mail + Passwort → "Registrieren"         | Konto erstellt, zur Übersicht         |
| TC2  | Anmeldung                       | Konto vorhanden           | E-Mail + Passwort → "Anmelden"             | Erfolgreich angemeldet                |
| TC3  | Liste erstellen                 | Angemeldet                | FAB (+) drücken                            | "Neue Liste" erscheint                |
| TC4  | Liste umbenennen                | Liste vorhanden           | Bearbeiten → Stift → Name ändern           | Name aktualisiert                     |
| TC5  | Liste löschen                   | Liste vorhanden           | Bearbeiten → Papierkorb                    | Liste entfernt                        |
| TC6  | Artikel manuell hinzufügen      | Liste geöffnet            | Menge + Name eingeben → Enter              | Artikel erscheint                     |
| TC7  | Artikel via Barcode hinzufügen  | Kamera-Berechtigung       | Barcode-Icon → Scannen                     | Produkt erkannt, hinzugefügt          |
| TC8  | Artikel abhaken                 | Artikel vorhanden         | Checkbox klicken                           | Durchgestrichen, Vibration            |
| TC9  | Artikel bearbeiten              | Artikel vorhanden         | Stift → Name/Menge ändern → Speichern      | Änderungen gespeichert                |
| TC10 | Artikel löschen (Swipe)         | Artikel vorhanden         | Nach links wischen → "Löschen"             | Artikel entfernt                      |
| TC11 | Erledigte löschen               | Abgehakte Artikel         | Menü → "Erledigte löschen"                 | Alle abgehakten entfernt              |
| TC12 | Liste teilen                    | Liste vorhanden           | 👥-Icon → Code wird generiert              | Code angezeigt, teilbar               |
| TC13 | Liste beitreten                 | Code vorhanden            | Menü → "Beitreten" → Code eingeben         | Liste erscheint in Übersicht          |
| TC14 | Mitglieder entfernen            | Geteilte Liste (Ersteller)| Menü → "Mitglieder verwalten" → Entfernen  | Mitglied kann Liste nicht mehr sehen  |
| TC15 | Echtzeit-Sync                   | 2 Geräte, geteilte Liste  | Artikel auf Gerät 1 hinzufügen             | Erscheint sofort auf Gerät 2          |

---

## Aufgabe 2: Mobile App – Lösungskonzept erarbeiten

### 2.a) Framework und App-Typ

**Framework:** React Native mit Expo  
**App-Typ:** Hybrid-App (eine Codebasis für iOS und Android)  
**Entwicklungsumgebung:** Visual Studio Code mit Expo CLI

**Warum React Native + Expo?**
- Eine Codebasis für beide Plattformen spart viel Zeit
- Expo vereinfacht den Zugriff auf Kamera und Vibration
- Gute Integration mit Firebase
- Große Community mit vielen Hilfestellungen

**Projektstruktur:**
```
/src
  /components          # Wiederverwendbare UI-Komponenten
    - ArticleItem.js       → Einzelner Artikel in Liste
    - BarcodeScanner.js    → Kamera-Scanner für Barcodes
    - HeaderMenu.js        → Drei-Punkte-Menü im Header
  
  /screens             # Hauptscreens der App
    - StartScreen.js       → Listenübersicht
    - ListEditScreen.js    → Artikel bearbeiten   
    - LoginScreen.js       → Anmeldung/Registrierung
    - LoadingScreen.js     → Ladebildschirm
  
  /services            # Backend-Integration
    - firebase.js          → Firebase-Konfiguration
    - asyncStorage.js      → Lokale Speicherung
  
  /navigation
    - AppNavigator.js      → Navigation Setup

/.env                  # Umgebungsvariabeln für Firebase
/.gitignore            # Git Ignor Liste
/App.js                # Root-Komponente
/app.json              # Expo-Konfiguration
/firestore.rules       # Firebase Security Rules
/package.json          # Abhängigkeiten
```

**Wichtige Komponenten:**
- **Navigation:** React Navigation (Stack Navigator)
- **UI:** React Native Paper (Material Design)
- **State:** React Hooks (useState, useEffect)
- **Backend:** Firebase (Firestore, Authentication)

---

### 2.b) Umsetzung der Elemente

#### **Element 1: Kamera (Barcode-Scanner)**

**Package:** `expo-camera`

**Funktionsweise:**
1. User klickt auf Barcode-Icon
2. Modal öffnet sich mit Kamera-View
3. Kamera scannt Barcodes (EAN-13, EAN-8, UPC, QR-Codes)
4. Bei Scan: API-Call zu Open Food Facts: `https://world.openfoodfacts.org/api/v0/product/{barcode}.json`
5. Produktname wird aus Response extrahiert
6. Artikel wird automatisch zur Liste hinzugefügt

**Code (vereinfacht):**
```javascript
const handleBarCodeScanned = async ({ data }) => {
  const response = await axios.get(
    `https://world.openfoodfacts.org/api/v0/product/${data}.json`
  );
  const productName = response.data.product.product_name;
  onScan({ name: productName, quantity: '1' });
};
```

---

#### **Element 2: Vibrationsmotor**

**Package:** `expo-haptics`

**Verwendung:**
- Beim Abhaken von Artikeln: `Haptics.notificationAsync(NotificationFeedbackType.Success)`
- Bei Long-Press (Bulk-Auswahl): `Haptics.impactAsync(ImpactFeedbackStyle.Medium)`

**Code:**
```javascript
const handleCheckboxPress = () => {
  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  onToggle(article.id);
};
```

---

#### **Element 3: Persistente Speicherung (Firebase Firestore)**

**Datenstruktur:**
```
users/
  {userId}/
    - email: "user@example.com"
    lists/
      {listId}/
        - name: "Wocheneinkauf"
        - articles: [{ id, name, quantity, completed }]
        - createdAt, updatedAt
        - isShared: true/false
        - sharedListId: "ABC123"

sharedLists/
  {shareCode}/
    - name: "Familienliste"
    - articles: [...]
    - members: ["userId1", "userId2"]
    - createdBy: "userId1"
```

**Echtzeit-Updates:**
Firebase bietet automatische Synchronisation mit `onSnapshot()`:
```javascript
const unsubscribe = onSnapshot(listRef, (doc) => {
  if (doc.exists()) {
    setArticles(doc.data().articles);
  }
});
```

Wenn ein Benutzer einen Artikel hinzufügt, sehen alle anderen Mitglieder die Änderung sofort.

---

#### **Element 4: Authentifizierung (Firebase Auth)**

**Funktionen:**
- Registrierung: `createUserWithEmailAndPassword(auth, email, password)`
- Anmeldung: `signInWithEmailAndPassword(auth, email, password)`
- Passwort zurücksetzen: `sendPasswordResetEmail(auth, email)`
- Abmelden: `signOut(auth)`

**Auth-Check beim App-Start:**
```javascript
useEffect(() => {
  const unsubscribe = onAuthStateChanged(auth, (user) => {
    if (user) {
      // Angemeldet → Zur Übersicht
    } else {
      // Nicht angemeldet → Zum Login
    }
  });
}, []);
```

---

#### **Element 5: Listen-Freigabe**

**Ablauf:**
1. **Teilen:** 
   - Ersteller klickt auf 👥-Icon
   - App generiert 6-stelligen Code (z.B. "ABC123")
   - Liste wird in `sharedLists/` Collection kopiert
   - Code kann via Share-Sheet geteilt werden

2. **Beitreten:**
   - Anderer User gibt Code ein
   - App sucht Liste in `sharedLists/`
   - User wird zu `members`-Array hinzugefügt
   - Liste erscheint in dessen Übersicht

3. **Mitglieder verwalten:**
   - Nur Ersteller kann andere entfernen
   - Entfernen: User aus `members` löschen + private Referenz löschen

**Code (vereinfacht):**
```javascript
// Teilen
const code = Math.random().toString(36).substring(2, 8).toUpperCase();
await setDoc(doc(db, 'sharedLists', code), {
  ...listData,
  shareCode: code,
  members: [currentUserId],
  createdBy: currentUserId
});

// Beitreten
await updateDoc(doc(db, 'sharedLists', code), {
  members: arrayUnion(currentUserId)
});
```

---

### Verwendete Packages

| Package | Zweck |
|:--------|:------|
| `expo` | Framework |
| `react-native` | UI Framework |
| `@react-navigation/native` | Navigation |
| `react-native-paper` | UI-Komponenten |
| `expo-camera` | Kamera & Barcode-Scanner |
| `expo-haptics` | Vibration |
| `firebase` | Backend (Firestore, Auth) |
| `axios` | API-Calls (Open Food Facts) |
| `react-native-gesture-handler` | Swipe-Gesten |

---

## Aufgabe 3: Mobile App programmieren

Die App wurde vollständig mit React Native und Expo implementiert.

### 3.a) Funktionalität umgesetzt

✅ Alle geplanten Features aus Aufgabe 1 wurden erfolgreich umgesetzt:
- Listen erstellen, umbenennen, löschen, durchsuchen
- Artikel manuell hinzufügen (mit Menge)
- Artikel via Barcode-Scanner hinzufügen
- Artikel abhaken, bearbeiten, löschen
- Listen teilen via 6-stelligem Code
- Listen beitreten mit Code
- Mitglieder verwalten (Ersteller kann entfernen)
- Echtzeit-Synchronisation über Firebase
- Anmeldung und Registrierung

### 3.b) Sensoren umgesetzt

✅ **Kamera (Barcode-Scanner):**
- Implementiert mit `expo-camera`
- Unterstützt EAN-13, EAN-8, UPC-A, Code-128, QR-Codes
- Integration mit Open Food Facts API
- Produktname wird automatisch erkannt und zur Liste hinzugefügt

✅ **Vibrationsmotor (Haptics):**
- Implementiert mit `expo-haptics`
- Vibration beim Abhaken von Artikeln
- Vibration bei Long-Press für Bulk-Auswahl

---

## Aufgabe 4: Mobile App publizieren

### 4.a) Schritte zur Veröffentlichung

Um eine React Native App im Google Play Store zu veröffentlichen, sind folgende Schritte nötig:

**Vorbereitung:**
1. **Expo Account erstellen** auf https://expo.dev
2. **EAS CLI installieren:** `npm install -g eas-cli`
3. **Bei EAS anmelden:** `eas login`
4. **Projekt konfigurieren:** `eas build:configure`

**APK erstellen (für Android):**

1. **Build-Profil in `eas.json` erstellen:**
   ```json
   {
     "build": {
       "preview": {
         "android": {
           "buildType": "apk"
         }
       },
       "production": {}
     }
   }
   ```

2. **APK-Build starten:**
   ```bash
   eas build --platform android --profile preview
   ```

3. **Warten bis Build fertig ist** (ca. 10-20 Minuten)
   - Der Build läuft auf Expo-Servern
   - Man bekommt eine E-Mail wenn fertig

4. **APK herunterladen:**
   - Über das EAS Dashboard (https://expo.dev)
   - Oder direkt via Link in der E-Mail
   - Dateigröße: ca. 50-60 MB

**Veröffentlichung im Google Play Store:**

1. **Google Play Developer Account erstellen**
   - Einmalige Gebühr: 25 USD
   - Account-Verifizierung dauert 1-2 Tage

2. **Neue App erstellen** im Play Console

3. **App-Informationen bereitstellen:**
   - App-Name und kurze Beschreibung
   - Ausführliche Beschreibung (max. 4000 Zeichen)
   - Screenshots (mind. 2 pro Gerätegröße: Smartphone, Tablet)
   - App-Icon (512x512 px, PNG)
   - Feature Graphic (1024x500 px, JPG/PNG)
   - Kategorie auswählen (z.B. "Produktivität")

4. **Technische Informationen:**
   - APK hochladen
   - Datenschutzerklärung-URL angeben
   - Content Rating ausfüllen (Altersfreigabe)
   - Ziellande-Länder auswählen

5. **Preisgestaltung:**
   - Kostenlos oder kostenpflichtig festlegen
   - In-App-Käufe deklarieren (falls vorhanden)

6. **App zur Überprüfung einreichen**
   - Google prüft die App (1-3 Tage)
   - Bei Problemen: Benachrichtigung mit Anpassungswünschen
   - Bei Erfolg: App geht live

7. **Veröffentlichung:**
   - App ist im Play Store sichtbar
   - Updates können jederzeit hochgeladen werden

### 4.b) APK-Datei für diese App

Für diese App wurde eine APK-Datei erstellt, die bereit für die Veröffentlichung im Google Play Store ist.

**Durchgeführte Schritte:**

1. **EAS Build konfiguriert:**
   - `eas.json` mit Android-Build-Profil erstellt
   - App-Icon und Splash-Screen in `app.json` definiert
   - App-Name und Package-Name festgelegt

2. **APK-Build ausgeführt:**
   ```bash
   eas build --platform android --profile preview
   ```

3. **Build-Ergebnis:**
   - ✅ APK wurde erfolgreich erstellt
   - Dateigröße: ca. 55 MB
   - Download über EAS Dashboard verfügbar

4. **Was die APK enthält:**
   - Kompilierte React Native App
   - Alle JavaScript-Bundles
   - Firebase-Konfiguration
   - App-Icon und Splash-Screen
   - Alle benötigten Permissions (Kamera, Internet, Vibration)

**Hinweis:** Die App wurde nicht tatsächlich im Google Play Store veröffentlicht, da dies Kosten (25 USD) verursacht. Die APK ist jedoch vollständig paketiert und funktionsfähig. Sie kann auf jedem Android-Gerät installiert und getestet werden.

---

## Aufgabe 5: Mobile App gemäss Testplan überprüfen

### 5.a) Testergebnisse

Die App wurde gemäss dem Testplan aus Aufgabe 1c getestet. Alle Tests wurden auf einem Android-Gerät durchgeführt.

| ID   | Testfall                        | Status | Bemerkung                                    |
|:-----|:--------------------------------|:-------|:---------------------------------------------|
| TC1  | Registrierung                   | ✅ OK  | Konto erstellt, automatisch angemeldet       |
| TC2  | Anmeldung                       | ✅ OK  | Login funktioniert, zur Übersicht navigiert  |
| TC3  | Liste erstellen                 | ✅ OK  | "Neue Liste" erscheint sofort                |
| TC4  | Liste umbenennen                | ✅ OK  | Name wird gespeichert und angezeigt          |
| TC5  | Liste löschen                   | ✅ OK  | Liste entfernt, verschwindet aus Übersicht   |
| TC6  | Artikel manuell hinzufügen      | ✅ OK  | Artikel erscheint in Liste mit Menge         |
| TC7  | Artikel via Barcode hinzufügen  | ✅ OK  | Produkt erkannt, automatisch hinzugefügt     |
| TC8  | Artikel abhaken                 | ✅ OK  | Durchgestrichen, Vibration spürbar           |
| TC9  | Artikel bearbeiten              | ✅ OK  | Inline-Editor funktioniert, speichert        |
| TC10 | Artikel löschen (Swipe)         | ✅ OK  | Swipe-Geste funktioniert, Artikel entfernt   |
| TC11 | Erledigte löschen               | ✅ OK  | Alle abgehakten Artikel werden entfernt      |
| TC12 | Liste teilen                    | ✅ OK  | Code generiert, Dialog zeigt Code an         |
| TC13 | Liste beitreten                 | ✅ OK  | Code funktioniert, Liste erscheint           |
| TC14 | Mitglieder entfernen            | ✅ OK  | Entferntes Mitglied sieht Liste nicht mehr   |
| TC15 | Echtzeit-Sync                   | ✅ OK  | Änderungen erscheinen sofort auf Gerät 2     |

**Zusammenfassung:**
- ✅ **15 von 15 Tests erfolgreich**
- ✅ Keine kritischen Fehler gefunden
- ✅ Alle Anforderungen erfüllt

**Gefundene und behobene Probleme während der Entwicklung:**
1. **Problem:** Barcode-Scanner hat manchmal mehrfach gescannt
   - **Lösung:** `isProcessingScan` Flag eingebaut zur Verhinderung von Doppel-Scans

2. **Problem:** Menu auf iOS hat nicht korrekt geschlossen
   - **Lösung:** Menu mit `key`-Prop versehen, der bei jedem Öffnen neu generiert wird

3. **Problem:** Keyboard hat Eingabefeld überdeckt
   - **Lösung:** `KeyboardAwareScrollView` und `Animated` für automatisches Verschieben

**Fazit:**
Die App funktioniert wie geplant und erfüllt alle Anforderungen aus der Aufgabenstellung. Alle Tests verliefen erfolgreich.
