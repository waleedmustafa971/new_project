import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import Feather from 'react-native-vector-icons/Feather';
import Colors from '../../../component/constants/color/color';
import { useNavigation } from '@react-navigation/native';

const PaymentHeader = ({ title = 'Payment' }) => {
  const navigation = useNavigation();

  const handleBack = () => {
    navigation.goBack();
  };

  return (
    <View style={styles.headerContainer}>
      <TouchableOpacity style={styles.backButton} onPress={handleBack}>
        <Feather name="arrow-left" size={24} color={Colors.purple} />
      </TouchableOpacity>

      <Text style={styles.headerTitle}>{title}</Text>

      {/* Empty view to balance flex spacing */}
      <View style={styles.rightSpacer} />
    </View>
  );
};

export default PaymentHeader;

const styles = StyleSheet.create({
  headerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: '#fff',
    elevation: 3, // Android shadow
    shadowColor: '#000', // iOS shadow
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  backButton: {
    padding: 8,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.purple,
    textAlign: 'center',
    flex: 1,
  },
  rightSpacer: {
    width: 32, // Same as backButton to balance
  },
});
