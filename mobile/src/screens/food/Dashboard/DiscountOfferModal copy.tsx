import { View, Text, Modal, TouchableOpacity,
    StyleSheet
 } from 'react-native'
import React, {useState, useEffect, useRef} from 'react'

const DiscountOfferModal = ({ visible, onClose, latitude, longitude, address: initialAddress } : any) => {
  
  useEffect(() => {

  },[])
  
  return (
    <Modal visible={visible} animationType="slide">
      <View style={styles.container}>
        {/* Close button */}
        <TouchableOpacity style={styles.closeButton} onPress={onClose}>
          <Text style={styles.closeText}>✕</Text>
        </TouchableOpacity>

        <Text>DiscountOfferModal</Text>
      </View>
    </Modal>
  );
};
export default DiscountOfferModal

const styles = StyleSheet.create({
  container: { flex: 1 },
  map: { flex: 1 },
  loader: { position: "absolute", top: "50%", left: "50%", marginLeft: -25, marginTop: -25 },
  addressContainer: {
    position: "absolute",
    bottom: 60,
    left: 10,
    right: 10,
    backgroundColor: "white",
    padding: 10,
    borderRadius: 8,
    zIndex: 10,
  },
  addressText: { fontSize: 12 },
  buttons: {
    flexDirection: "column",
    justifyContent: "space-around",
    padding: 10,
    position: 'absolute', bottom: 0, width: '100%',
    alignItems: 'center', 
  },
  button: { padding: 10, backgroundColor: "#ddd", 
    borderRadius: 8, alignItems: "center",
  width: 300 },
  closeButton: {
    position: "absolute",
    top: 20,
    left: 20,
    backgroundColor: "white",
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
    zIndex: 10,
    elevation: 5
  },
  closeText: { fontSize: 22, fontWeight: "bold" },
});