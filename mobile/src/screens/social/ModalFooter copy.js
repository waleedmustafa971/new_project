import React, { useState, useEffect } from "react";
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Pressable,
} from "react-native";
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import AntDesign from 'react-native-vector-icons/AntDesign';

const ModalFooter = ({ visible, onClose, navigation }) => {
  //const dispatch = useDispatch();
  //const { userdata, loading, error } = useSelector((state) => state.auth);


  const tabs = [
    { label: "Post", icon: <MaterialIcons name="post-add" size={18} color="black" /> },
    { label: "Reel", icon: <MaterialCommunityIcons name="comment-outline" size={18} color="gray" /> },
    { label: "Story", icon: <MaterialCommunityIcons name="share-outline" size={18} color="gray" /> },
    { label: "Live", icon: <MaterialCommunityIcons name="video-wireless-outline" size={18} color="gray" /> },
    { label: "AI", icon: <MaterialCommunityIcons name="video-wireless-outline" size={18} color="gray" /> },
  ];

  const checkPost = (type) => {
    if (type === "Reel") {
      onClose()
      navigation.navigate("NewReels")
    }
    else if (type === "Post") {
      onClose()
      navigation.navigate("CreatePost")
    }
    else if (type === "Story") {
      onClose()
      navigation.navigate("CreateStory", {
        itemdata: []
      })
    }
    else if (type === "Live") {
      onClose() //CreateLive LiveScreen CreateLive
      navigation.navigate("LiveScrollingstream", {
        itemdata: []
      })
    }
    else { }

  }
  //

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.overlay} onPress={onClose}>
        <View style={styles.modal}>
          <View style={styles.header}>
            <Text style={styles.title}>Create</Text>
            <View style={{
              width: 80, borderBottomWidth: 3,
              borderBottomColor: '#f2f2f2'
            }} />
            <TouchableOpacity onPress={onClose}>
              <AntDesign name="close" size={18} color="black" />
            </TouchableOpacity>
          </View>
          <View style={{
            flexDirection: 'row', flexWrap: 'nowrap',
            justifyContent: 'space-between'
          }}>
            {tabs.map((tab) => (
              <TouchableOpacity key={tab.label} style={styles.button}
                onPress={() => {
                  checkPost(tab.label)
                }}>
                {tab.icon}
                <Text style={styles.buttonText}>{tab.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </Pressable>
    </Modal>
  );
};

export default ModalFooter;

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end",
  },
  modal: {
    backgroundColor: "#fff",
    padding: 20,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  title: {
    fontSize: 14,
    fontWeight: "600",
    color: "#333", marginLeft: 8
  },
  button: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 5,
    paddingHorizontal: 5,
    backgroundColor: "#f5f5f5",
    borderRadius: 16,
    marginBottom: 10,
  },
  buttonText: {
    marginLeft: 5,
    fontSize: 13,
    fontWeight: "500",
    color: "#333",
  },
});
