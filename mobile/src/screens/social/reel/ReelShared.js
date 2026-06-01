import React, { useState, useEffect } from 'react';
import { Modal, View, Text, TextInput, TouchableOpacity, 
  FlatList, Image, StyleSheet, Pressable, Share, Alert } from 'react-native';
import { getAccordionColors } from 'react-native-paper/lib/typescript/components/List/utils';
import * as base from '../../../component/global'
import Icon from 'react-native-vector-icons/FontAwesome';
import Feather from 'react-native-vector-icons/Feather';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
//import Clipboard from '@react-native-clipboard/clipboard';

const ReelShared = ({ visible, onClose, recentContacts, data, userid }) => {
  const [message, setMessage] = useState('');
  const [messangerData, setMessangerData] = useState([]);

  const handleShare = () => {
    // Handle your share action here
    console.log('Sharing:', message);
    setMessage('');
    onClose();
  };

  useEffect(() => {
    getLastconversion();
  }, []);


  const getLastconversion = async () => {
    // Example frontend usage:
    console.log(base.BASE_URL + `/apis/conversations/${userid}`)
    fetch(base.BASE_URL + `/apis/conversations/${userid}`)
      .then(res => res.json())
      .then(data => {
        const partners = data.messages
          .filter((msg) => msg.type === 'private')
          .map((msg) => msg.partner);

        console.log('Extracted partners:', partners);
        setMessangerData(partners);
      })
      .catch(err => console.error(err));

  }
  const shareAppLink = async () => {
    const id = data._id;
    const title = data.videoTitle;
  try {
    const result = await Share.share({
      message: base.BASE_URL + '/share/post/' + id,
    });

    if (result.action === Share.sharedAction) {
      if (result.activityType) {
        console.log('Shared with activity type: ', result.activityType);
      } else {
        console.log('Link shared successfully!');
      }
    } else if (result.action === Share.dismissedAction) {
      console.log('Share dismissed');
    }
  } catch (error) {
    console.error('Error sharing: ', error.message);
  }
};
 const copyLink = async() => {
  /*   const link = base.BASE_URL + '/share/post/' + id;
    Clipboard.setString(link);
    Alert.alert('Link Copied', 'The link has been copied to your clipboard.'); */

  /*   Clipboard.setString(base.BASE_URL + '/share/post/' + id);
    Alert.alert('Link Copied', 'The link has been copied to your clipboard.'); */
     try {
    await Share.share({
      message: base.BASE_URL + '/share/post/' + id
    });
  } catch (error) {
    console.log(error.message);
  }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <Pressable style={styles.modalOverlay}  onPress={onClose}>
        <View style={styles.modalContainer}>
          {/* Row 1: Avatar and Name */}
          <View style={styles.userRow}>
            <Image source={{ uri: data?.userInfo?.image }} style={styles.avatar} />
            <Text style={styles.userName}>{data?.userInfo?.name}</Text>
          </View>

          {/* Row 2: TextInput and Share Button */}
          <View style={styles.inputRow}>
            <TextInput
              style={styles.input}
              placeholder="Say something..."
              value={message}
              onChangeText={setMessage}
            />
            <TouchableOpacity style={styles.shareButton} onPress={handleShare}>
              <Text style={styles.shareButtonText}>Share</Text>
            </TouchableOpacity>
          </View>

          {/* Row 3: Caption */}
          <Text style={styles.caption}>Send in Messenger</Text>

          {/* Row 4: Recent Contacts FlatList */}
          <FlatList
            data={messangerData}
            horizontal
            keyExtractor={(item) => item?._id}
            renderItem={({ item }) => (
              <View style={styles.contactItem}>
                <Image
                  source={item?.image ? { uri: item.image } : require('../../../assets/user.png')}
                  style={styles.contactAvatar}
                />

                <Text style={styles.contactName}>{item?.name}</Text>
              </View>
            )}
            showsHorizontalScrollIndicator={false}
          />


          {/* Row 5: Share Options */}
          <View style={styles.shareOptionsRow}>
            <TouchableOpacity style={styles.shareOption} onPress={() => console.log('Share to WhatsApp')}>
              <Icon name="whatsapp" size={24} color="#25D366" />
              <Text style={styles.shareOptionText}>WhatsApp</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.shareOption} onPress={() => copyLink()}>
              <Feather name="copy" size={24} color="#000" />
              <Text style={styles.shareOptionText}>Copy Link</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.shareOption} onPress={() => shareAppLink()}>
              <MaterialIcons name="more-horiz" size={24} color="#000" />
              <Text style={styles.shareOptionText}>More</Text>
            </TouchableOpacity>
          </View>
          {/* Close Button */}
          {/*   <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Text style={{ color: 'red' }}>Close</Text>
          </TouchableOpacity> */}
        </View>
      </Pressable>
    </Modal>
  );
};
const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    justifyContent: "flex-end", // Align content to the bottom
    backgroundColor: "rgba(0, 0, 0, 0.3)", // Optional dim background
  },
  modalContainer: {
    height: 300, // Take 30% of the screen height
    backgroundColor: 'white',
    padding: 16,
    borderTopLeftRadius: 12, // Optional: Rounded corners for better appearance
    borderTopRightRadius: 12,
  },

  userRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  avatar: {
    width: 30,
    height: 30,
    borderRadius: 25,
    marginRight: 10,
  },
  userName: {
    fontSize: 14
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  input: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 5,
    padding: 8,
    marginRight: 10,
  },
  shareButton: {
    backgroundColor: '#2196F3',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 5,
  },
  shareButtonText: {
    color: 'white',
    fontWeight: 'bold',
  },
  caption: {
    marginBottom: 5,
    fontWeight: 'bold',
    fontSize: 12, marginTop: 5
  },
  contactItem: {
    alignItems: 'center',
    marginRight: 15,
    height: 80, borderWidth: 0, borderColor: '#000'
  },
  contactAvatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    marginBottom: 5,
  },
  contactName: {
    fontSize: 12,
  },
   shareOptionsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginVertical: 15,
  },
  shareOption: {
    alignItems: 'center',
  },
  shareOptionText: {
    marginTop: 5,
    fontSize: 12,
  },
  closeButton: {
    alignSelf: 'center',
    marginTop: 10,
  },
});

export default ReelShared;
