import React from 'react';
import {
  View,
  Modal,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
} from 'react-native';
import Feather from 'react-native-vector-icons/Feather';

type CustomModalProps = {
  visible: boolean;
  onClose: () => void;
  children: React.ReactNode;
};

const { height: screenHeight } = Dimensions.get('window');

const CallModal: React.FC<CustomModalProps> = ({ visible, onClose, children }) => {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
    >
      <TouchableOpacity
        style={styles.overlay}
        activeOpacity={1}
        onPress={onClose} // close when tapping outside
      />
      <View style={styles.modalContainer}>
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
            <Feather name="x" size={20} color="#333" />
          </TouchableOpacity>
        </View>
        <View style={styles.content}>
          {children}
        </View>
      </View>
    </Modal>
  );
};

export default CallModal;

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.3)',
  },
  modalContainer: {
    position: 'absolute',
    bottom: 0,
    width: '100%',
    height: 250, // fixed height
    backgroundColor: '#fff',
    borderTopLeftRadius: 15,
    borderTopRightRadius: 15,
    overflow: 'hidden',
  },
  header: {
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'flex-end',
    padding: 8,
    borderBottomWidth: 0.5,
    borderBottomColor: '#ccc',
  },
  closeBtn: {
    padding: 4,
  },
  content: {
    flex: 1,
    paddingHorizontal: 12,
    justifyContent: 'center',
  },
});
