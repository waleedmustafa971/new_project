import React from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
} from "react-native";

import MaterialCommunityIcons from "react-native-vector-icons/MaterialCommunityIcons";
import MaterialIcons from "react-native-vector-icons/MaterialIcons";
import AntDesign from "react-native-vector-icons/AntDesign";

const { width } = Dimensions.get("window");

const ModalFooter = ({ onClose, navigation }) => {

  const tabs = [
    { label: "Post", icon: <MaterialIcons name="post-add" size={18} color="black" /> },
    { label: "Reel", icon: <MaterialCommunityIcons name="comment-outline" size={18} color="gray" /> },
    { label: "Story", icon: <MaterialCommunityIcons name="share-outline" size={18} color="gray" /> },
    { label: "Live", icon: <MaterialCommunityIcons name="video-wireless-outline" size={18} color="gray" /> },
    { label: "AI", icon: <MaterialCommunityIcons name="robot" size={18} color="gray" /> },
  ];

  const checkPost = (type) => {
    onClose();

    if (type === "Reel") {
      navigation.navigate("NewReels");
    } else if (type === "Post") {
      navigation.navigate("CreatePost");
    } else if (type === "Story") {
      navigation.navigate("CreateStory", { itemdata: [] });
    } else if (type === "Live") {
      /*
        This pointed at LiveScrollingstream, a second live list that renders
        LiveItem — a static card with no Agora engine, no joinChannel and no
        RtcSurfaceView, so it could never play a stream. With nobody live it
        also had no empty state, and its container sets no background: a
        white screen with nothing in the log. Social now opens the same
        working list as the LIVE tab rather than a parallel broken copy.
      */
      navigation.navigate("ListofLive");
    }
    else if (type === "AI") {
      navigation.navigate("AIReelsScreen", { itemdata: [] });
    }
    //AIReelsScreen
  };

  return (
    <View style={styles.container}>
      <View style={styles.dropdown}>

        {/* Header */}
      {/*   <View style={styles.header}>
          <Text style={styles.title}>Create</Text>
          <TouchableOpacity onPress={onClose}>
            <AntDesign name="close" size={18} color="black" />
          </TouchableOpacity>
        </View> */}

        {/* Items */}
        {tabs.map((tab) => (
          <TouchableOpacity
            key={tab.label}
            style={styles.item}
            onPress={() => checkPost(tab.label)}
          >
            {tab.icon}
            <Text style={styles.itemText}>{tab.label}</Text>
          </TouchableOpacity>
        ))}

      </View>
    </View>
  );
};

export default ModalFooter;

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    bottom: 60, // 🔥 ABOVE footer
    alignSelf: "center",
  },

  dropdown: {
    backgroundColor: "#fff",
    borderRadius: 14,
    padding: 12,
    width: 180,

    elevation: 8,
    shadowColor: "#000",
    shadowOpacity: 0.2,
    shadowRadius: 6,
  },

  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 10,
  },

  title: {
    fontSize: 14,
    fontWeight: "600",
  },

  item: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 8,
  },

  itemText: {
    marginLeft: 10,
    fontSize: 14,
  },
});