import React, { useEffect, useState } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import StackNavigator from './src/navigation/StackNavigator';
import Toast from 'react-native-toast-message';
import { StripeProvider } from '@stripe/stripe-react-native';
import { navigationRef } from './src/navigation/RootNavigation';
import IncomingCallListener from './src/screens/calls/IncomingCallListener';
import AsyncStorage from '@react-native-async-storage/async-storage';
//import { requestAllPermissions, getLiveLocation } from '../../screens/permission/PermissionManager';
import { requestAllPermissions, getLiveLocation } from './src/screens/permission/PermissionManager';
import NetInfo from "@react-native-community/netinfo";
import { Alert, PermissionsAndroid, Platform } from 'react-native';
import Geolocation from '@react-native-community/geolocation';
import { StatusBar } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
/*
  Modular Firebase API.

  Every messaging() call used the v22-deprecated namespaced form, and
  react-native-firebase logs a full stack trace for each one — seven call sites
  in this file, which buried real errors under screens of warnings on every app
  start. Same calls, same behaviour, in the form the library now expects.
*/
import { getApp } from '@react-native-firebase/app';
import {
  getMessaging, getToken, requestPermission,
  onMessage, onTokenRefresh,
} from '@react-native-firebase/messaging';
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
    const authStatus = await requestPermission(getMessaging(getApp()));
    console.log('Permission status:', authStatus);
  }

  async function getFCMToken() {
    const token = await getToken(getMessaging(getApp()));
    console.log('FCM Token:', token);
     await AsyncStorage.setItem("fcmtoken", token);
    // Send token to backend
   // sendTokenToServer(token); how to manage only after new install it will update token
  }


useEffect(() => {
  const unsubscribe = onMessage(getMessaging(getApp()), async remoteMessage => {
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
      const authStatus = await requestPermission(getMessaging(getApp()));
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
      const currentToken = await getToken(getMessaging(getApp()));

      console.log('FCM Token:', currentToken);

      if (storedToken !== currentToken) {
        await AsyncStorage.setItem('fcmtoken', currentToken);
      }

      /*
        Register every time, not only when the token is new.

        The old shape only told the server about a token that had just changed,
        which quietly skipped the commonest case there is: a device that already
        had a token cached, signing in as a different account. FCM had nothing
        new to say, so nothing was sent, and that account ended up with an empty
        fcm_tokens array and no way to receive anything.

        registerPushToken keys its marker on userId + token, so calling it on
        every start costs one AsyncStorage read once it has already run.
      */
      registerPushToken(currentToken);
    } catch (error) {
      console.log('FCM token error:', error);
    }
  };

  // ----------------------------
  // TOKEN REFRESH LISTENER
  // ----------------------------
  useEffect(() => {
    const unsubscribe = onTokenRefresh(getMessaging(getApp()), async token => {
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
    const unsubscribe = onMessage(getMessaging(getApp()), async remoteMessage => {
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
          <StripeProvider publishableKey="pk_test_51U6RZqEInLcNzXu3abPcT4NuqcNLIQsLEc7n3LwrzbuE29dJkvyhMvOU6DLAOoeJYxEJIFN7aT30ShIwMrUnTY1r00KcFlsGeM">
            <StackNavigator />
            {/* Inside the navigator so it can push the call screen, and above
                every route so a call arrives wherever you are. */}
            <IncomingCallListener />
          </StripeProvider>
        </NavigationContainer>
      </SafeAreaView>
      <Toast />
    </>
  );
}
