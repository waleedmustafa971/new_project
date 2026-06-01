import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, TouchableOpacity, Pressable, Animated } from 'react-native';
import Feather from 'react-native-vector-icons/Feather';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import LiveIcon from '../component/icon/LiveIcon';
import LiveBadge from '../component/icon/LiveBadge';

const BottomNav = ({ navigation, activeTab, language }) => {
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const opacityAnim = useRef(new Animated.Value(1)).current;

  // 🔁 Animated live icon
  useEffect(() => {
    Animated.loop(
      Animated.parallel([
        Animated.sequence([
          Animated.timing(scaleAnim, { toValue: 1.25, duration: 800, useNativeDriver: true }),
          Animated.timing(scaleAnim, { toValue: 1, duration: 800, useNativeDriver: true }),
        ]),
        Animated.sequence([
          Animated.timing(opacityAnim, { toValue: 0.4, duration: 800, useNativeDriver: true }),
          Animated.timing(opacityAnim, { toValue: 1, duration: 800, useNativeDriver: true }),
        ]),
      ])
    ).start();
  }, []);

  return (
    <View
      style={[
        styles.navBar,
        { flexDirection: language === 'ar' ? 'row-reverse' : 'row' }, // 🔹 RTL flip
      ]}
    >
      {/* Home */}
      <TouchableOpacity
        style={styles.navItem}
        onPress={() => navigation.navigate('Home')}
      >
        <Feather
          name="home"
          size={24}
          color={activeTab === 'Home' ? '#007AFF' : '#555'}
        />
      </TouchableOpacity>

      {/* Videos */}
      <TouchableOpacity
        style={styles.navItem}
        onPress={() => navigation.navigate('VideoDashboard')}
      >
        <Feather
          name="play-circle"
          size={24}
          color={activeTab === 'Videos' ? '#007AFF' : '#555'}
        />
      </TouchableOpacity>

      {/* Live */}
      <Pressable onPress={() => navigation.navigate('ListofLive')}>
       {/*  <LiveIcon /> */}
       <LiveBadge />
       {/*  <Animated.View
          style={{
            transform: [{ scale: scaleAnim }],
            opacity: opacityAnim,
            marginTop: 1,
          }}
        >
          <MaterialCommunityIcons name="access-point" size={28} color="#000" />
        </Animated.View> */}
      </Pressable>

      {/* Center button */}
      <TouchableOpacity
        style={styles.centerButton}
        onPress={() => navigation.navigate('MarketPlace')}
      >
        <MaterialCommunityIcons
          name="storefront-outline"
          size={24}
          color="#000"
          style={{ marginTop: 5 }}
        />
      </TouchableOpacity>

      {/* Menu/Profile */}
      <TouchableOpacity
        style={styles.navItem}
        onPress={() => navigation.navigate('MyProfile')}
      >
        <Feather
          name="menu"
          size={22}
          color={activeTab === 'Menu' ? '#007AFF' : '#555'}
        />
      </TouchableOpacity>
    </View>
  );
};

export default BottomNav;

const styles = StyleSheet.create({
  navBar: {
    position: 'absolute',
    bottom: 0,
    height: 50, // slightly bigger for better tap
    backgroundColor: '#fff',
    width: '100%',
    justifyContent: 'space-around',
    alignItems: 'center',

    borderTopColor: '#eee',
    borderTopWidth: 1,

    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },

  navItem: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 50,
  },

  centerButton: {
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10, // slight lift
    width: 60,
  },
});
