import React, { useEffect, useState } from 'react';
import { Alert, View, StyleSheet, ActivityIndicator } from 'react-native';
import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  PlatformPay,
  PlatformPayButton,
  usePlatformPay,
} from '@stripe/stripe-react-native';

import * as base from '../../../component/global';
import api from '../../../component/api';
import Toast from 'react-native-toast-message';

interface Props {
  priceAED: number;
  onChangevalue: (value: boolean) => void;
}

const PaymentScreen = ({ priceAED, onChangevalue }: Props) => {
  const { isPlatformPaySupported, confirmPlatformPayPayment } =
    usePlatformPay();
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    (async () => {
      const supported = await isPlatformPaySupported({
        googlePay: { testEnv: true },
      });

      if (!supported) {
        Alert.alert('Google Pay is not supported on this device');
      }
    })();
  }, []);

  const fetchPaymentIntentClientSecret = async (): Promise<string> => {
    if (!priceAED || priceAED <= 0) {
      throw new Error('Invalid amount');
    }

    const amount = Math.round(priceAED * 100); // ✅ Stripe-safe
    const response = await api.post('/apis/live/createPayment', {
      amount,
      currency: 'usd',
    });
    console.log('fetchPaymentIntentClientSecret... pay', response)
    if (!response.data?.clientSecret) {
      throw new Error('Failed to create PaymentIntent');
    }

    return response.data.clientSecret;
  };
  const callBackendToVerify = async (amount: number) => {
    try {
      const jsonValue = await AsyncStorage.getItem('userdata');
      if (!jsonValue) return;

      const userData = JSON.parse(jsonValue);

      const res = await api.post('/apis/live/add-transaction', {
        userId: userData._id,
        paymentType: 'googlepay',
        currency: 'USD',
        amount: Math.round(amount * 100), // smallest unit
        paymentStatus: 'approved',
      });

      if (res.data) {
        console.log('Transaction recorded:', res.data.transaction);
      }
    } catch (err: any) {
      console.error('Failed to save transaction:', err.message);
    }
  };

  const pay = async () => {
    setLoading(true)
    try {
      const clientSecret = await fetchPaymentIntentClientSecret();
      console.log('clientSecret.....', clientSecret)

      const { error, paymentIntent } =
        await confirmPlatformPayPayment(clientSecret, {
          googlePay: {
            testEnv: true,
            merchantName: 'My Merchant Name',
            merchantCountryCode: 'US',
            currencyCode: 'USD',
            billingAddressConfig: {
              format: PlatformPay.BillingAddressFormat.Full,
              isRequired: true,
              isPhoneNumberRequired: true,
            },
          },
        });
      // ❌ Payment failed
      if (error || !paymentIntent) {
         setLoading(false)
        Toast.show({
          type: 'error',
          text1: 'Payment failed',
          text2: error?.message || 'Something went wrong',
        });
        return;
      }

      // ✅ Stripe success
    // if (paymentIntent?.status === 'succeeded') {
     if ((paymentIntent?.status as string) === "Succeeded") {
        // 🔐 Call backend AFTER successful payment
        await callBackendToVerify(priceAED);
        onChangevalue(true)
        Toast.show({
          type: 'success',
          text1: 'Success',
          text2: 'Payment completed successfully',
        });
        setLoading(false)
        console.log('Payment Success:', paymentIntent);
      } else {
        Toast.show({
          type: 'error',
          text1: 'Payment not completed',
          text2: `Status: ${paymentIntent.status}`,
        });
         setLoading(false)
      }
      // Alert.alert('Success', 'Payment completed successfully');
      console.log('payment......', paymentIntent);
    } catch (err: any) {
      setLoading(false)
      Alert.alert('Error here', err.message);
    }
  };

  return (
    <View style={styles.container}>
      {
        loading ?
          <ActivityIndicator />
          :
          <PlatformPayButton
            type={PlatformPay.ButtonType.Pay}
            onPress={pay}  disabled={loading}
            style={styles.payButton}
          />
      }

    </View>
  );
};

export default PaymentScreen;

const styles = StyleSheet.create({
  container: {
    marginTop: 20,
  },
  payButton: {
    width: '100%',
    height: 50,
  },
});
