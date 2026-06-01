// PermissionManager.js
import {Platform, PermissionsAndroid, Alert} from 'react-native';
import {Camera} from 'react-native-vision-camera'; // Make sure this matches your camera lib
import {check, request, PERMISSIONS, RESULTS, openSettings} from 'react-native-permissions';
import Geolocation from '@react-native-community/geolocation';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as base from '../../component/global'
//import OpenSettings from "react-native-open-settings";
/**
 * Request Android camera permission using native PermissionsAndroid
 */
export const requestAndroidCameraPermission = async () => {
  try {
    const granted = await PermissionsAndroid.request(
      PermissionsAndroid.PERMISSIONS.CAMERA,
      {
        title: 'Camera Permission',
        message: 'This app needs access to your camera',
        buttonNeutral: 'Ask Me Later',
        buttonNegative: 'Cancel',
        buttonPositive: 'OK',
      }
    );
    return granted === PermissionsAndroid.RESULTS.GRANTED;
  } catch (err) {
    console.warn('Android camera permission error:', err);
    return false;
  }
};

/* =========================================================
   📍 LOCATION PERMISSION
========================================================= */

export const requestLocationPermission = async () => {
  try {
    if (Platform.OS === 'android') {
      const granted = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
        {
          title: 'Location Permission',
          message: 'This app needs access to your location',
          buttonNeutral: 'Ask Me Later',
          buttonNegative: 'Cancel',
          buttonPositive: 'OK',
        }
      );
      return granted === PermissionsAndroid.RESULTS.GRANTED;
    }

    const status = await request(PERMISSIONS.IOS.LOCATION_WHEN_IN_USE);
    return status === RESULTS.GRANTED;
  } catch (error) {
    console.warn('Location permission error:', error);
    return false;
  }
};

/* =========================================================
   📍 LIVE LOCATION
========================================================= */
export const getLiveLocation_off = async ({
  onSuccess,
  onError,
}) => {
  const hasPermission = await requestLocationPermission();
  if (!hasPermission) return;

  Geolocation.getCurrentPosition(
    async (position) => {
      try {
        const { latitude, longitude } = position.coords;
        console.log('latitude.....', latitude , 'longitude......', longitude)
        const region = {
          latitude,
          longitude,
          latitudeDelta: 0.01,
          longitudeDelta: 0.01,
        };

        console.log('📍 Location:', region);
        // 🌍 Reverse Geocoding
        const response = await fetch(
          `https://maps.googleapis.com/maps/api/geocode/json?latlng=${latitude},${longitude}&key=${base.googlemapapi}`
        );
        const data = await response.json();

        let address = '';
        let city = '';
        let country = '';

        if (data?.results?.length > 0) {
          address =
            data.results[1]?.formatted_address ||
            data.results[0]?.formatted_address ||
            '';

          const components = data.results[2].address_components;

          components.forEach((item) => {
            if (item.types.includes('locality')) {
              city = item.long_name;
            }
            if (item.types.includes('country')) {
              country = item.long_name;
            }
          });
        }

        // 💾 STORE IN ASYNC STORAGE
        const locationData = {
          latitude,
          longitude,
          address,
          city,
          country,
        };

        await AsyncStorage.setItem(
          'USER_LOCATION',
          JSON.stringify(locationData)
        );

        console.log('✅ Location saved to AsyncStorage:', locationData);

        // 📤 CALLBACK
        onSuccess?.({
          region,
          marker: { latitude, longitude },
          address,
          city,
          country,
        });
      } catch (err) {
        console.log('Geocoding / Storage error:', err);
        onError?.(err);
      }
    },
    (error) => {
      console.log('Location error:', error);
      if (error.code === 2) {
      Alert.alert(
        "Location Disabled",
        "Please enable location services to continue",
        [
          {
            text: "Cancel",
            style: "cancel"
          },
          {
            text: "Open Settings",
            //onPress: () => openSettings(),
             onPress: () => Linking.openSettings()
          }
        ]
      );
    }
      onError?.(error);
    },
    {
      accuracy: { android: 'balanced' },
      enableHighAccuracy: false,
      timeout: 20000,
      maximumAge: 10000,
      forceRequestLocation: true,
      showLocationDialog: true,
    }
  );
};

export const getLiveLocation = async () => {
  return new Promise(async (resolve, reject) => {
    const hasPermission = await requestLocationPermission();

    if (!hasPermission) {
      return reject("Location permission denied");
    }

    Geolocation.getCurrentPosition(
      async (position) => {
        try {
          const { latitude, longitude } = position.coords;

          console.log('📍 lat:', latitude, 'lng:', longitude);

          // 🌍 Reverse Geocoding
          const response = await fetch(
            `https://maps.googleapis.com/maps/api/geocode/json?latlng=${latitude},${longitude}&key=${base.googlemapapi}`
          );

          const data = await response.json();

          let address = '';
          let city = '';
          let country = '';

          if (data?.results?.length > 0) {
            address =
              data.results[1]?.formatted_address ||
              data.results[0]?.formatted_address ||
              '';

            const components = data.results[0]?.address_components || [];

            components.forEach((item) => {
              if (item.types.includes('locality')) {
                city = item.long_name;
              }
              if (item.types.includes('country')) {
                country = item.long_name;
              }
            });
          }

          const locationData = {
            latitude,
            longitude,
            address,
            city,
            country,
          };

          // 💾 Save
          await AsyncStorage.setItem(
            'USER_LOCATION',
            JSON.stringify(locationData)
          );

          console.log('✅ Final Location:', locationData);

          resolve(locationData); // ✅ IMPORTANT
        } catch (err) {
          reject(err);
        }
      },
      (error) => {
        console.log('❌ Location error:', error);
        reject(error);
      },
      {
        enableHighAccuracy: false,
        timeout: 20000,
      }
    );
  });
};

/**
 * Request and check all required app permissions centrally
 */
export const requestAllPermissions = async () => {
  console.log('🔐 Requesting all necessary permissions...');
  // 📷 CAMERA PERMISSION
  let cameraGranted = false;
  if (Platform.OS === 'android') {
    cameraGranted = await requestAndroidCameraPermission();
  } else {
    const status = await Camera.requestCameraPermission(); // Vision camera
    cameraGranted = status === 'authorized';
  }

  if (!cameraGranted) {
    console.log('❌ Camera permission denied');
    Alert.alert('Camera Permission Required', 'Please enable camera access in settings.');
  } else {
    console.log('✅ Camera permission granted');
  }

  // 🎤 MICROPHONE PERMISSION
  const micPermission = Platform.select({
    ios: PERMISSIONS.IOS.MICROPHONE,
    android: PERMISSIONS.ANDROID.RECORD_AUDIO,
  });

  const micStatus = await request(micPermission);
  if (micStatus !== RESULTS.GRANTED) {
    console.log('❌ Microphone permission denied');
    Alert.alert('Microphone Permission Required', 'Please enable microphone access.');
  } else {
    console.log('✅ Microphone permission granted');
  }

  // 👥 CONTACTS PERMISSION
  const contactsPermission = Platform.select({
    ios: PERMISSIONS.IOS.CONTACTS,
    android: PERMISSIONS.ANDROID.READ_CONTACTS,
  });

  const contactsStatus = await request(contactsPermission);
  if (contactsStatus !== RESULTS.GRANTED) {
    console.log('❌ Contacts permission denied');
    Alert.alert('Contacts Permission Required', 'Please allow contact access.');
  } else {
    console.log('✅ Contacts permission granted');
  }

   // 📍 Location
  const locationGranted = await requestLocationPermission();
  if (!locationGranted) {
    Alert.alert('Location Permission Required', 'Please enable location access.');
  }

  //vision camera 

 // const requestPermissions = async () => {
console.log('Requesting camera permission...');

if (Platform.OS === 'android') {
    const granted = await requestAndroidCameraPermission();
    if (granted) {
        console.log('Android camera permission granted .. vision camera');
       // setTimeout(() => setShowCamera(true), 3000);
    } else {
        console.log('Android permission denied vision camera');
        setPermissionDenied(true);
    }
} else {
    const status = await Camera.requestCameraPermission();
    if (status === 'authorized') {
        console.log('iOS camera permission granted');
       // setTimeout(() => setShowCamera(true), 3000);
    } else {
        console.log('iOS permission denied');
        setPermissionDenied(true);
    }
}
  //      };

  // 📦 Extend here for video recording, storage, etc.
};
