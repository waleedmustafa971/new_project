
import { AppRegistry, Image } from 'react-native';
import * as React from 'react';
import { PaperProvider } from 'react-native-paper';
import BackgroundFetch from "react-native-background-fetch";
import App from './App';
import { name as appName } from './app.json';
import { Provider } from "react-redux";
import store from "./src/store/store";
import { CartProvider } from "./src/screens/shopping/context/CartContext";
import { CartProviderFood } from "./src/screens/shopping/context/CartContextFood";
import { UserProvider } from './src/screens/context/UserContext';
import { TranslationProvider } from './src/screens/lang/TranslationContext';
import backgroundSync from "./src/component/backgroundtask/backgroundTask";
import { SocketProvider } from './src/screens/context/SocketContext';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { getApp } from '@react-native-firebase/app';
import { getMessaging, setBackgroundMessageHandler } from '@react-native-firebase/messaging';
import notifee, { EventType } from '@notifee/react-native';

function Main() {
  return (
    <SafeAreaProvider>
    <Provider store={store}>
      <TranslationProvider>
        {/* how to take userid from here */}
        <UserProvider>
          {/* <SocketProvider userId={"123"}> */}
          <SocketProvider>
            <CartProvider>
              <CartProviderFood>
              <PaperProvider>
                <App />
              </PaperProvider>
              </CartProviderFood>
            </CartProvider>
          </SocketProvider>
        </UserProvider>
      </TranslationProvider>
    </Provider>
    </SafeAreaProvider>
  );
}

// FCM background handler
// Modular form; the namespaced call is deprecated in v22 and logs a stack
// trace at startup.
setBackgroundMessageHandler(getMessaging(getApp()), async remoteMessage => {
  await notifee.displayNotification({
    title: remoteMessage.notification?.title,
    body: remoteMessage.notification?.body,
    android: {
      channelId: 'default',
      smallIcon: 'ic_launcher',
    },
  });
});

// Notifee background events
notifee.onBackgroundEvent(async ({ type, detail }) => {
  const { notification } = detail;

  if (type === 1) {
    console.log('Notification pressed', notification?.id);
  }

  if (type === 2) {
    console.log('Notification dismissed', notification?.id);
  }
});

AppRegistry.registerComponent(appName, () => Main);
BackgroundFetch.registerHeadlessTask(backgroundSync);
