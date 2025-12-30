# Fehlerbehebung: Firebase-Verbindungsfehler durch Caching-Problem

## Problembeschreibung

Manchmal kann es vorkommen, dass die Expo-Entwicklungsumgebung die in der `.env`-Datei definierten Umgebungsvariablen (wie z.B. die Firebase API-Schlüssel) nicht korrekt lädt. Dies führt zu einem kritischen Fehler bei der Initialisierung von Firebase, typischerweise mit der folgenden oder einer ähnlichen Fehlermeldung:

```
FirebaseError: Firebase: Error (auth/invalid-api-key).
```

Die Ursache ist oft ein sehr hartnäckiges Caching-Problem des Expo-Servers (Metro Bundler), bei dem alte Konfigurationen ohne die Umgebungsvariablen wiederverwendet werden. Weder das Löschen des Caches mit `npm start -- --clear` noch das Neustarten des Servers oder des Systems lösen das Problem zuverlässig.

## Lösung

Die zuverlässigste Lösung besteht darin, den Cache des Metro Bundlers bei jedem Start explizit zu deaktivieren. Dies zwingt den Server, die `.env`-Datei und die gesamte Konfiguration jedes Mal neu einzulesen.

### Schritt 1: `metro.config.js` erstellen

Erstellen Sie im Hauptverzeichnis (Root) Ihres Projekts eine neue Datei namens `metro.config.js`.

### Schritt 2: Konfiguration einfügen

Fügen Sie den folgenden Code in die `metro.config.js`-Datei ein:

```javascript
const { getDefaultConfig } = require('@expo/metro-config');

// Hole die Standard-Metro-Konfiguration
const config = getDefaultConfig(__dirname);

// Deaktiviere den Cache, indem ein leeres Array zugewiesen wird.
// Dies ist der entscheidende Schritt, um das Caching-Problem zu umgehen.
config.cacheStores = [];

// Exportiere die modifizierte Konfiguration
module.exports = config;
```

### Schritt 3: Server neu starten

1.  **Beenden Sie alle laufenden Expo-Prozesse.** Suchen Sie nach allen Instanzen von `expo` oder `node` und beenden Sie diese.
2.  **Starten Sie den Entwicklungsserver neu**, zum Beispiel mit `npm start`.

Durch diese Konfiguration wird das Caching-Problem dauerhaft umgangen und die Firebase-Verbindung sollte stabil funktionieren.
