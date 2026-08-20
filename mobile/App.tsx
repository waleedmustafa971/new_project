import React, { useEffect, useState } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import StackNavigator from './src/navigation/StackNavigator';
import Toast from 'react-native-toast-message';
import { StripeProvider } from '@stripe/stripe-react-native';
import { navigationRef } from './src/navigation/RootNavigation';
import AsyncStorage from '@react-native-async-storage/async-storage';
//import { requestAllPermissions, getLiveLocation } from '../../screens/permission/PermissionManager';
import { requestAllPermissions, getLiveLocation } from './src/screens/permission/PermissionManager';
import NetInfo from "@react-native-community/netinfo";
import { Alert, PermissionsAndroid, Platform } from 'react-native';
import Geolocation from '@react-native-community/geolocation';
import { StatusBar } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import messaging from '@react-native-firebase/messaging';
import notifee from '@notifee/react-native';
import { registerPushToken } from './src/services/pushToken';


export default function App() {
  const [loading, setLoading] = useState(false)

/*   useEffect(() => {
    requestAllPermissions();
    requestPermission();
    getFCMToken();
  }, [])

useEffect(() => {
  async function setup() {
    await notifee.createChannel({
      id: 'default',
      name: 'Default Channel',
    });
  }
  setup();
}, []);
  
 async function requestPermission() {
    const authStatus = await messaging().requestPermission();
    console.log('Permission status:', authStatus);
  }

  async function getFCMToken() {
    const token = await messaging().getToken();
    console.log('FCM Token:', token);
     await AsyncStorage.setItem("fcmtoken", token);
    // Send token to backend
   // sendTokenToServer(token); how to manage only after new install it will update token
  }


useEffect(() => {
  const unsubscribe = messaging().onMessage(async remoteMessage => {
    console.log('Foreground message:', remoteMessage);
    Alert.alert(
      remoteMessage.notification?.title || 'Notification',
      remoteMessage.notification?.body || ''
    );
  });
  return unsubscribe;
}, []);
 */

  // ----------------------------
  // INIT (permissions + token)
  // ----------------------------
  useEffect(() => {
    initApp();
  }, []);

  const initApp = async () => {
    await requestAllPermissions();
    await requestNotificationPermission();
    await createNotificationChannel();
    await getFCMToken();
  };

  // ----------------------------
  // NOTIFICATION PERMISSION
  // ----------------------------
  const requestNotificationPermission = async () => {
    try {
      const authStatus = await messaging().requestPermission();
      console.log('Notification permission:', authStatus);
    } catch (error) {
      console.log('Permission error:', error);
    }
  };

  // ----------------------------
  // NOTIFEE CHANNEL
  // ----------------------------
  const createNotificationChannel = async () => {
    await notifee.createChannel({
      id: 'default',
      name: 'Default Channel',
    });
  };

  // ----------------------------
  // FCM TOKEN MANAGEMENT
  // ----------------------------
  const getFCMToken = async () => {
    try {
      const storedToken = await AsyncStorage.getItem('fcmtoken');
      const currentToken = await messaging().getToken();

      console.log('FCM Token:', currentToken);

      // First install
      if (!storedToken) {
        await AsyncStorage.setItem('fcmtoken', currentToken);
        sendTokenToServer(currentToken);
        return;
      }

      // Token changed
      if (storedToken !== currentToken) {
        await AsyncStorage.setItem('fcmtoken', currentToken);
        sendTokenToServer(currentToken);
      }
    } catch (error) {
      console.log('FCM token error:', error);
    }
  };

  // ----------------------------
  // TOKEN REFRESH LISTENER
  // ----------------------------
  useEffect(() => {
    const unsubscribe = messaging().onTokenRefresh(async token => {
      console.log('FCM Token refreshed:', token);

      await AsyncStorage.setItem('fcmtoken', token);
      sendTokenToServer(token);
    });

    return unsubscribe;
  }, []);

  // ----------------------------
  // FOREGROUND NOTIFICATIONS
  // ----------------------------
  useEffect(() => {
    const unsubscribe = messaging().onMessage(async remoteMessage => {
      console.log('Foreground message:', remoteMessage);
      Alert.alert(
        remoteMessage.notification?.title || 'Notification',
        remoteMessage.notification?.body || ''
      );
    });
    return unsubscribe;
  }, []);

  // ----------------------------
  // BACKEND API
  // ----------------------------
  /*
    Hand the device token to the server.

    This was a console.log, so no token ever reached the backend and push could
    not be addressed to anybody. It delegates to the push service because the
    interesting part is the ordering, not the request: initApp() runs at mount,
    before sign-in, so there is usually no account to attach the token to yet.
    registerPushToken() returns false in that case and the sign-in path calls it
    again once there is a user.
  */
  const sendTokenToServer = (token: string) => {
    registerPushToken(token);
  };
  return (
    <>
      <StatusBar
        barStyle="light-content"   // or "dark-content"
        backgroundColor="#000"     // Android only
      />
      {/* targetSdk 35 (Android 15) forces edge-to-edge, so StatusBar's
          backgroundColor is ignored and screens draw under the status bar.
          Every screen is headerShown:false, so React Navigation adds no inset
          either — this reserves the status bar height once for the whole app.
          Screens with their own SafeAreaView are unaffected: the native view
          measures its own on-screen position, so a nested one resolves to 0. */}
      <SafeAreaView style={{ flex: 1, backgroundColor: '#000' }} edges={['top']}>
        <NavigationContainer ref={navigationRef}>
          <StripeProvider publishableKey="pk_test_dXSih2GWiQmhH7myqOlpeWos">
            <StackNavigator />
          </StripeProvider>
        </NavigationContainer>
      </SafeAreaView>
      <Toast />
    </>
  );
}
