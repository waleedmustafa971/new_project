module.exports = {
  assets: ['./src/assets/font/'],
  dependencies: {
    /*
      @react-native-camera-roll/camera-roll is autolinked on Android.

      It used to be listed here with `android: null`, which is the explicit
      "do not autolink this on Android" switch -- and the package was not
      installed at all, so GalleryShow's import threw at runtime and the photo
      picker in both composers rendered its tab bar over an empty grid. Leaving
      the entry in place would have made installing the package achieve
      nothing: the JS would resolve and the native module still would not be
      there.
    */
    '@react-native-community/slider': {
      platforms: {
        android: null, // or leave this out if needed
      },
    },
  },
};

