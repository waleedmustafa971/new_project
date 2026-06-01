import React from 'react';
import {
  Modal,
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { LANGUAGES } from './languages';
import { useTranslation } from './TranslationContext';

export default function LanguageModal({ visible, onClose }) {
  const { setLanguage, language } = useTranslation();

  const selectLanguage = (code) => {
    if (code !== language) {
      setLanguage(code);
    }
    onClose();
  };

  return (
    <Modal visible={visible} animationType="slide" transparent={false}>
      <View style={styles.container}>
        <Text style={styles.title}>Select Language</Text>

        <FlatList
          data={LANGUAGES}
          keyExtractor={(item) => item.code}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={[
                styles.item,
                item.code === language && styles.activeItem,
              ]}
              onPress={() => selectLanguage(item.code)}
            >
              <Text
                style={[
                  styles.itemText,
                  item.code === language && styles.activeText,
                ]}
              >
                {item.name}
              </Text>
            </TouchableOpacity>
          )}
        />

        <TouchableOpacity onPress={onClose}>
          <Text style={styles.close}>Close</Text>
        </TouchableOpacity>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: '#fff',
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 10,
  },
  item: {
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  itemText: {
    fontSize: 14,
    color: '#333',
  },
  activeItem: {
    backgroundColor: '#f2f2f2',
  },
  activeText: {
    fontWeight: '700',
    color: '#000',
  },
  close: {
    textAlign: 'center',
    padding: 15,
    fontSize: 14,
    color: '#000',
  },
});
