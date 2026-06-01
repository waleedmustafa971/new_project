import { GoogleSignin } from '@react-native-google-signin/google-signin';

export const configureGoogleSignIn = () => {
  GoogleSignin.configure({
    webClientId: 'YOUR_WEB_CLIENT_ID_FROM_FIREBASE.apps.googleusercontent.com',
    offlineAccess: true,
  });
};
