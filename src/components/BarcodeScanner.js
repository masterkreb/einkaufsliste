import React, { useState, useEffect } from 'react';
import { Text, View, StyleSheet } from 'react-native';
import { Button } from 'react-native-paper';
import { CameraView, useCameraPermissions } from 'expo-camera';
import axios from 'axios';

export default function BarcodeScannerComponent({ onScan }) {
  const [permission, requestPermission] = useCameraPermissions();
  const [scanned, setScanned] = useState(false);

  useEffect(() => {
    if (!permission) {
      requestPermission();
    }
  }, [permission, requestPermission]);

  const handleBarCodeScanned = async ({ data }) => {
    setScanned(true);
    try {
      const response = await axios.get(`https://world.openfoodfacts.org/api/v0/product/${data}.json`);
      console.log('API Response:', response.data);
      const product = response.data.product;
      const productName = product.product_name || 'Unbekanntes Produkt';
      const brands = product.brands || '';
      const quantity = (product.quantity || product.net_weight || product.volume || '').replace(/(\d)([a-zA-Z])/g, '$1 $2'); // Add space between number and unit
      const imageUrl = product.image_url || product.image_front_url || '';
      
      console.log('Extracted:', { productName, brands, quantity, imageUrl });
      
      // Combine info
      const fullName = brands ? `${brands} ${productName}` : productName;
      
      onScan({ name: fullName, quantity, imageUrl });
    } catch (error) {
      console.log('API Error:', error);
      onScan({ name: 'Unbekanntes Produkt', quantity: '', imageUrl: '' });
    }
  };

  if (!permission) {
    return <Text>Requesting for camera permission</Text>;
  }
  if (!permission.granted) {
    return <Text>No access to camera</Text>;
  }

  return (
    <View style={styles.container}>
      <CameraView
        style={StyleSheet.absoluteFillObject}
        facing="back"
        onBarcodeScanned={scanned ? undefined : handleBarCodeScanned}
      />
      {scanned && <Button onPress={() => setScanned(false)}>Tap to Scan Again</Button>}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    flexDirection: 'column',
    justifyContent: 'center',
  },
});
