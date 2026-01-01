
import React, { useState, useEffect } from 'react';
import { Text, View, StyleSheet, ActivityIndicator, Dimensions, SafeAreaView } from 'react-native';
import { Button, Snackbar } from 'react-native-paper';
import { CameraView, useCameraPermissions } from 'expo-camera';
import axios from 'axios';

const { width, height } = Dimensions.get('window');

export default function BarcodeScannerComponent({ onScan, onClose }) {
  const [permission, requestPermission] = useCameraPermissions();
  const [scanned, setScanned] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [viewDimensions, setViewDimensions] = useState({ width, height });

  useEffect(() => {
    if (!permission) {
      requestPermission();
    }
  }, [permission, requestPermission]);

  const handleLayout = (event) => {
    const { width, height } = event.nativeEvent.layout;
    setViewDimensions({ width, height });
  };

  const handleBarCodeScanned = async ({ bounds, data }) => {
    console.log('Barcode scanned:', data);
    if (scanned || loading) return;

    // NOTE: Der frühere "Linien-/Toleranz"-Check hat sehr oft alle Scans blockiert
    // (je nach Gerät liefern bounds andere Werte oder gar keine). Deshalb hier entfernt.

    setScanned(true);
    setLoading(true);
    setError(null);
    try {
      const response = await axios.get(`https://world.openfoodfacts.org/api/v0/product/${data}.json`);
      
      if (response.data.status === 0 || !response.data.product) {
        throw new Error(`Produkt für Barcode ${data} nicht gefunden.`);
      }
      
      const product = response.data.product;
      
      const productName = product.product_name || 'Unbekanntes Produkt';
      const brands = product.brands || '';
      const quantity = (product.quantity || '').replace(/(\d)([a-zA-Z])/g, '$1 $2');
      
      let fullProductName = brands ? `${brands} ${productName}` : productName;
      if (quantity && !fullProductName.includes(quantity)) {
          fullProductName = `${fullProductName} ${quantity}`;
      }

      onScan({
        name: fullProductName,
        quantity: '1',
      });

      setLoading(false);
      // Scanner wird i.d.R. vom Parent geschlossen; falls nicht, blocken wir Mehrfach-Scans
      // bis zum Schließen/erneuten Öffnen.
      setTimeout(() => {
        onClose?.();
      }, 0);

    } catch (err) {
      console.log('API Error:', err);
      setError(err.message || 'Fehler beim Abrufen der Produktdaten.');
      setTimeout(() => {
        setScanned(false);
        setLoading(false);
      }, 3000);
    }
  };

  if (!permission) {
    return <Text>Kamerazugriff wird angefordert...</Text>;
  }
  if (!permission.granted) {
    return (
        <View style={styles.container}>
            <Text>Kein Zugriff auf die Kamera.</Text>
            <Button onPress={requestPermission}>Zugriff erlauben</Button>
        </View>
    );
  }

  return (
    <View style={styles.container} onLayout={handleLayout}>
      <CameraView
        style={StyleSheet.absoluteFillObject}
        facing="back"
        onBarcodeScanned={handleBarCodeScanned}
        barcodeScannerSettings={{
            barcodeTypes: ["ean13", "ean8", "upc_a", "upc_e", "code128", "code39", "qr"],
        }}
      />

      <View style={styles.overlay}>
          <View style={styles.targetLine} />
          <Text style={styles.instructionText}>Barcode an der Linie ausrichten</Text>
      </View>

      {loading && <ActivityIndicator size="large" color="#fff" />}
      
      <SafeAreaView style={styles.bottomContainer}>
        <Button 
            mode="contained" 
            onPress={() => {
              setScanned(false);
              setLoading(false);
              setError(null);
              onClose?.();
            }} 
            style={styles.cancelButton}
            labelStyle={styles.cancelButtonLabel}
        >
            Abbrechen
        </Button>
      </SafeAreaView>

      <Snackbar
        visible={!!error}
        onDismiss={() => setError(null)}
        duration={2500}
        style={{ bottom: 100 }}
      >
        {error}
      </Snackbar>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'black',
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
  },
  targetLine: {
    height: 2,
    width: '80%',
    backgroundColor: 'red',
  },
  instructionText: {
      color: 'white',
      marginTop: 20,
      fontSize: 16,
      fontWeight: 'bold',
      backgroundColor: 'rgba(0,0,0,0.5)',
      paddingHorizontal: 10,
      paddingVertical: 5,
      borderRadius: 5,
  },
  bottomContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 20,
    backgroundColor: 'transparent',
    alignItems: 'center',
  },
  cancelButton: {
      width: '90%',
      paddingVertical: 8,
      borderRadius: 8,
  },
  cancelButtonLabel: {
      fontSize: 18,
  }
});
