import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import PaymentScreen from './PaymentScreen';

interface Gift {
  _id: string;
  coins: number;
  priceAED: number;
  xtime: string;
}

interface Props {
  //selectedPackage: Gift;
  selectedPackage: Gift | null;
  onChangevalue: (value: boolean) => void;
}

const paymentMethods = [
  { id: 'googlepay', label: 'Google Pay', icon: 'logo-google' },
   { id: 'visa', label: 'Visa', icon: 'card-outline' },
];

const PaymentMethodSelector = ({ selectedPackage, onChangevalue }: Props) => {
  const [selectedMethod, setSelectedMethod] = useState<string | null>(null);
  const [paymentDone, setPaymentDone] = useState(false);

  return (
    <View style={styles.paymentContainer}>
      <Text style={styles.paymentText}>Payment Method</Text>
      <View style={styles.methodsWrapper}>
        {paymentMethods.map(method => (
          <TouchableOpacity
            key={method.id}
            style={[
              styles.methodItem,
              selectedMethod === method.id && styles.selectedMethod,
            ]}
            onPress={() => setSelectedMethod(method.id)}
          >
            <Icon
              name={method.icon}
              size={14}
              color={selectedMethod === method.id ? '#fff' : '#000'}
            />
            <Text
              style={[
                styles.methodLabel,
                selectedMethod === method.id && { color: '#fff' },
              ]}
            >
              {method.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
      {/* {selectedMethod === 'googlepay' && <PaymentScreen priceAED={selectedPackage.priceAED} 
      onChangevalue={(value) => {
      setPaymentDone(value);
      onChangevalue(true);
      console.log('Payment status changed:', value);
      }} />} */}
      {selectedMethod === 'googlepay' && selectedPackage && (
        <PaymentScreen
          priceAED={selectedPackage?.priceAED}
          onChangevalue={(value) => {
            setPaymentDone(value);
            onChangevalue(true);
            console.log('Payment status changed:', value);
          }}
        />
      )}
    </View>
  );
};

export default PaymentMethodSelector;

const styles = StyleSheet.create({
  paymentContainer: { marginTop: 5 },
  paymentText: { fontSize: 12, marginBottom: 12 },
  methodsWrapper: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  methodItem: {
    width: '48%',
    flexDirection: 'row',
    justifyContent: 'center',
    paddingVertical: 12,
    backgroundColor: '#f0f0f0',
    borderRadius: 8,
    marginBottom: 12,
  },
  selectedMethod: { backgroundColor: '#000' },
  methodLabel: { marginLeft: 8, fontSize: 12 },
});
