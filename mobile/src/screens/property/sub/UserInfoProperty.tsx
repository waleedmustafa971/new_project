import {
  View,
  Text,
  Image,
  TouchableOpacity,
  StyleSheet,
  Share,
  Platform,
  Modal,
} from 'react-native';
import React, { useEffect, useState } from 'react';
import api from '../../../component/api';
import * as base from '../../../component/global';
import QRCode from 'react-native-qrcode-svg';
import Ionicons from 'react-native-vector-icons/Ionicons';

const UserInfoProperty = ({ userid, navigation } : any) => {
  const [userdata, setUserdata] = useState(null);
  const [showQR, setShowQR] = useState(false);

  useEffect(() => {
    if (userid) {
      profile();
    }
  }, [userid]);

  const profile = async () => {
    try {
      const { data } = await api.get(
        `/apis/auth/get-userinfo-id?userid=${userid}`
      );
      setUserdata(data?.user);
    } catch (error) {
      console.log('User fetch error:', error);
    }
  };

  const slugify = (text = '') =>
    text
      .toString()
      .toLowerCase()
      .trim()
      .replace(/[\s\W-]+/g, '-')
      .replace(/^-+|-+$/g, '');
  if (!userdata) return null;
  
  // 🔥 Profile link (used for Share + QR)
  const producttitle = slugify(userdata?.name);
  const profileLink = `${base.SHARE_URL}/profile/${userdata._id}/${producttitle}`;

  // 🔥 Share function
  const shareData = async () => {
    try {
      let shareOptions;

      if (Platform.OS === 'ios') {
        shareOptions = {
          message: 'Check this profile',
          url: profileLink,
        };
      } else {
        shareOptions = {
          message: `Check out this Vendor Profile! ${profileLink}`,
        };
      }

      await Share.share(shareOptions);
    } catch (error : any) {
      console.error('Error sharing:', error.message);
    }
  };

  return (
    <>
      {/* 🔥 MAIN CARD */}
      <View style={styles.card}>
        
        {/* Avatar */}
        <Image
          source={{
            uri: userdata?.image
              ? base.BASE_URL + '/' + userdata.image
              : base.BASE_URL + '/uploads/property_temp/14722261-17c91o.webp',
          }}
          style={styles.avatar}
        />

        {/* Info */}
        <View style={styles.info}>
          <Text style={styles.name}>{userdata?.name}</Text>
        {/*   <Text style={styles.email}>{userdata?.email}</Text> */}

          <View style={styles.stats}>
            <Text style={styles.statText}>
              {userdata?.followersCount} Followers
            </Text>
            <Text style={styles.statText}>
              {userdata?.followingCount} Following
            </Text>
          </View>

          {/* Buttons */}
          <View style={styles.actions}>
            <TouchableOpacity
              style={styles.primaryBtn}
              onPress={() =>
                navigation.navigate('ViewAgent', {
                  propertyid: userdata,
                })
              }
            >
              <Text style={styles.primaryText}>View Profile</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.secondaryBtn}
              onPress={shareData}
            >
              <Text style={styles.secondaryText}>Share</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* 🔥 QR BUTTON */}
        <TouchableOpacity
          style={styles.qrButton}
          onPress={() => setShowQR(true)}
        >
          <Ionicons name="qr-code-outline" size={50} color="#000" />
        </TouchableOpacity>
      </View>

      {/* 🔥 QR MODAL */}
      <Modal visible={showQR} transparent animationType="fade">
        <View style={styles.qrOverlay}>
          <View style={styles.qrContainer}>

            <Text style={styles.qrTitle}>Scan Profile</Text>

            <QRCode
              value={profileLink}
              size={180}
            />

            <Text style={styles.qrLink} numberOfLines={1}>
              {profileLink}
            </Text>

            <TouchableOpacity
              style={styles.closeBtn}
              onPress={() => setShowQR(false)}
            >
              <Text style={{ color: "#fff" }}>Close</Text>
            </TouchableOpacity>

          </View>
        </View>
      </Modal>
    </>
  );
};

export default UserInfoProperty;

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    padding: 15,
    borderRadius: 12,
    marginVertical: 10,
    alignItems: 'center',
  },

  avatar: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: '#eee',
  },

  info: {
    flex: 1,
    marginLeft: 12,
  },

  name: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
  },

  email: {
    fontSize: 13,
    color: '#666',
    marginVertical: 2,
  },

  stats: {
    flexDirection: 'row',
    marginVertical: 6,
  },

  statText: {
    fontSize: 12,
    color: '#444',
    marginRight: 15,
  },

  actions: {
    flexDirection: 'row',
    marginTop: 8,
  },

  primaryBtn: {
    backgroundColor: '#000',
    paddingVertical: 6,
    paddingHorizontal: 14,
    borderRadius: 6,
    marginRight: 10,
  },

  primaryText: {
    color: '#fff',
    fontSize: 13,
  },

  secondaryBtn: {
    backgroundColor: '#000',
    paddingVertical: 6,
    paddingHorizontal: 14,
    borderRadius: 6,
  },

  secondaryText: {
    color: '#fff',
    fontSize: 12,
  },

  qrButton: {
    padding: 5,
    justifyContent: "center",
    alignItems: "center",
  },

  qrOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.6)",
    justifyContent: "center",
    alignItems: "center",
  },

  qrContainer: {
    backgroundColor: "#fff",
    padding: 20,
    borderRadius: 16,
    alignItems: "center",
    width: 260,
  },

  qrTitle: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 15,
  },

  qrLink: {
    fontSize: 10,
    marginTop: 10,
    color: "#666",
    textAlign: "center",
  },

  closeBtn: {
    marginTop: 15,
    backgroundColor: "#000",
    paddingVertical: 8,
    paddingHorizontal: 20,
    borderRadius: 8,
  },
});