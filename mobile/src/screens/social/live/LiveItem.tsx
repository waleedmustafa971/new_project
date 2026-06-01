import React, { useState } from "react";
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  Dimensions,
  StyleSheet,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from "react-native";
import Icon from "react-native-vector-icons/Ionicons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as base from '../../../component/global'
import { useVideoController } from "../../../screens/hooks/useVideoController";
import RequestBoxGrid from "./RequestBoxGrid";
import GiftModal from "./GiftModal";

const screenHeight = Dimensions.get("window").height;

/* =======================
   TYPES & INTERFACES
======================= */

interface Host {
  name: string;
  avatar: string;
  is_following: boolean;
}

interface Reel {
  _id: string;
  videoUrl?: string;
  sound?: any;
  videosound?: boolean;
  likes?: number;
  comments?: number;
  shares?: number;
  coins?: number;
  viewers_count?: number;
  hoster: Host;
}

interface Gift {
  name: string;
  emoji: string;
  coins: number;
}

interface LiveItemProps {
  reel: Reel;
  isActive: boolean;
  onClose: () => void;
}

/* =======================
   COMPONENT
======================= */

const LiveItem: React.FC<LiveItemProps> = ({
  reel,
  isActive,
  onClose,
}) => {
  const [likes, setLikes] = useState<number>(reel.likes ?? 0);
  const [liked, setLiked] = useState<boolean>(false);
  const [comments, setComments] = useState<number>(reel.comments ?? 0);
  const [shares, setShares] = useState<number>(reel.shares ?? 0);
  const [modalGiftVisible, setModalGiftVisible] = useState<boolean>(false);

  const hasSound = Boolean(reel.sound);



  const handleSendGift = (gift: Gift) => {
    setModalGiftVisible(false);
    Alert.alert(
      "Gift Sent 🎁",
      `You sent ${gift.name} ${gift.emoji} worth ${gift.coins} coins`
    );
  };

  return (
    <View style={[styles.container, { height: screenHeight }]}>
      {/* ================= HEADER ================= */}
      <View style={styles.header}>
        <View style={styles.hostInfo}>
          <Image source={{ uri: reel?.hoster?.image }} style={styles.avatar} />
          <View>
            <Text style={styles.hostName}>{reel.hoster?.name}</Text>
            <TouchableOpacity style={styles.followButton}>
              <Text style={styles.followText}>
                {reel.hoster.is_following ? "Following" : "+ Follow"}
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.headerRight}>
          <View style={styles.coinsView}>
            <Icon name="logo-bitcoin" size={16} color="#fff" />
            <Text style={styles.coinsText}>{reel.coins ?? 0}</Text>
          </View>

          <View style={styles.coinsView}>
            <Icon name="eye" size={16} color="#fff" />
            <Text style={styles.coinsText}>
              {reel.viewers_count ?? 0}
            </Text>
          </View>

          <TouchableOpacity onPress={onClose}>
            <Icon name="close" size={24} color="#fff" />
          </TouchableOpacity>
        </View>
      </View>

      {/* ================= REQUEST GRID ================= */}
       <View style={styles.requestContainer}>
        <RequestBoxGrid
          requests={[
            { avatar:"KKKKK", name: "User 1" },
            { avatar: "LLLLL", name: "User 2" },
          ]}
        />
      </View> 

      {/* ================= CHAT SAMPLE ================= */}
      <View style={styles.messageRow}>
        <Image
          source={{ uri: "https://your-user-image-url.com" }}
          style={styles.messageUserImage}
        />
        <View style={styles.messageContent}>
          <Text style={styles.messageUserName}>Username</Text>
          <Text style={styles.messageText}>
            This is a live chat message!
          </Text>
        </View>
      </View>

      {/* ================= FOOTER ================= */}
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.bottomSponsored}
      >
        <View style={styles.footer}>
          <Icon name="happy-outline" size={24} color="#999" />

          <TextInput
            placeholder="Type a message..."
            placeholderTextColor="#999"
            style={styles.input}
          />

          <TouchableOpacity>
            <Icon name="send" size={24} color="#fff" />
          </TouchableOpacity>

          <TouchableOpacity onPress={() => setModalGiftVisible(true)}>
            <Icon name="gift" size={24} color="#fff" />
          </TouchableOpacity>

          <TouchableOpacity>
            <Icon name="arrow-redo" size={24} color="#fff" />
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>

      {/* ================= GIFT MODAL ================= */}
       <GiftModal
        visible={modalGiftVisible}
        onClose={() => setModalGiftVisible(false)}
        onSendGift={handleSendGift}
      /> 
    </View>
  );
};

export default LiveItem;

/* =======================
   STYLES
======================= */

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#000",
  },

  header: {
    position: "absolute",
    top: 10,
    left: 0,
    right: 0,
    paddingHorizontal: 16,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    zIndex: 10,
  },

  hostInfo: {
    flexDirection: "row",
    alignItems: "center",
  },

  avatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    marginRight: 10,
    borderWidth: 2,
    borderColor: "#fff",
  },

  hostName: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
  },

  followButton: {
    backgroundColor: "red",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    marginTop: 4,
  },

  followText: {
    color: "#fff",
    fontSize: 12,
  },

  headerRight: {
    flexDirection: "row",
    alignItems: "center",
  },

  coinsView: {
    flexDirection: "row",
    alignItems: "center",
    marginHorizontal: 8,
  },

  coinsText: {
    color: "#fff",
    marginLeft: 4,
  },

  requestContainer: {
    height: "40%",
    marginTop: 100,
    borderWidth: 1,
    borderColor: "#fff",
  },

  messageRow: {
    flexDirection: "row",
    paddingHorizontal: 8,
    marginVertical: 4,
  },

  messageUserImage: {
    width: 32,
    height: 32,
    borderRadius: 16,
    marginRight: 8,
  },

  messageContent: {
    backgroundColor: "rgba(255,255,255,0.2)",
    borderRadius: 12,
    padding: 8,
  },

  messageUserName: {
    color: "#ffcc00",
    fontWeight: "bold",
    fontSize: 13,
  },

  messageText: {
    color: "#fff",
    fontSize: 13,
  },

  bottomSponsored: {
    position: "absolute",
    bottom: 30,
    width: "100%",
    paddingHorizontal: 16,
  },

  footer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.6)",
    padding: 10,
    borderRadius: 20,
  },

  input: {
    flex: 1,
    backgroundColor: "#222",
    color: "#fff",
    borderRadius: 20,
    paddingHorizontal: 16,
    marginHorizontal: 8,
  },
});
