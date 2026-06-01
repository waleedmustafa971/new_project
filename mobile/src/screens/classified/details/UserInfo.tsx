import {
  View,
  Text,
  Image,
  TouchableOpacity,
  StyleSheet, Share, Platform
} from 'react-native';
import React, { useEffect, useState } from 'react';
import api from '../../../component/api';
import * as base from '../../../component/global';

const UserInfo = ({ userid, navigation }: any) => {
  const [userdata, setUserdata] = useState<any>(null);
  console.log('.....userinfo... ', userid)
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
      console.log('----userinfo.... ', data?.user);
    } catch (error) {
      console.log('User fetch error:', error);
    }
  };

  const slugify = (text = '') =>
    text
      .toString()
      .toLowerCase()
      .trim()
      .replace(/[\s\W-]+/g, '-')   // spaces & special chars → -
      .replace(/^-+|-+$/g, '');   // trim - from start/end


  if (!userdata) return null;


  const shareData = async () => {
    const producttitle = slugify(userdata?.name);

    try {
      const propertyLink = `${base.BASE_URL}/vendor/${userdata._id}/${producttitle}`;

      let shareOptions;

      if (Platform.OS === "ios") {
        // iOS supports `url` for link previews
        shareOptions = {
          message: "Check out this Vendor Profile !", // Text above preview
          url: propertyLink,
        };
      } else {
        // Android ignores `url` in Share; put link in message
        shareOptions = {
          message: `Check out this Vendor Profile ! ${propertyLink}`,
        };
      }

      const result = await Share.share(shareOptions);

      if (result.action === Share.sharedAction) {
        if (result.activityType) {
          console.log("Shared with activity type:", result.activityType);
        } else {
          console.log("Shared successfully!");
        }
      } else if (result.action === Share.dismissedAction) {
        console.log("Share dismissed");
      }
    } catch (error) {
      console.error("Error sharing:", error.message);
    }
  }


  return (
    <View style={styles.card}>
      {/* Avatar */}
      <Image
        source={{
          uri: userdata?.image
            ? base.BASE_URL + userdata.image
            : base.BASE_URL + '/uploads/property_temp/14722261-17c91o.webp',
        }}
        style={styles.avatar}
      />

      {/* User Info */}
      <View style={styles.info}>
        <Text style={styles.name}>{userdata?.name}</Text>
        <Text style={styles.email}>{userdata?.email}</Text>

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
                propertyid: userdata?._id,
              })
            }
          >
            <Text style={styles.primaryText}>View Profile</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.secondaryBtn}>
            <Text style={styles.secondaryText}>Follow</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.secondaryBtn} onPress={shareData}>
            <Text style={styles.secondaryText}>Share</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
};

export default UserInfo;

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    padding: 15,
    borderRadius: 12,
    marginVertical: 10,
    elevation: 0,
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
    borderWidth: 1,
    borderColor: '#000',
    paddingVertical: 6,
    paddingHorizontal: 14,
    backgroundColor: '#000',
    borderRadius: 6, marginRight: 5
  },
  secondaryText: {
    color: '#ffffff',
    fontSize: 12,
  },
});
