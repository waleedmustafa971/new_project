import React from "react";
import * as base from '../../component/global';
import {
  View,
  Text,
  TouchableOpacity,
  Image,
  StyleSheet,
  Platform,
} from "react-native";
import Icon from "react-native-vector-icons/Ionicons";
// 🚨 FIX 1: Import safe area hooks for reliable positioning below the status bar/notch
import { useSafeAreaInsets } from 'react-native-safe-area-context'; 

// Define Props interface (assuming it's passed from CreateStream.tsx)
interface HosterInfo {
  hoster: {
    image?: string;
    name: string;
    is_following: boolean;
  };
  coins: number;
  viewers_count: number;
}

interface Props {
  hosterinfo: HosterInfo;
  isHost?: boolean;
  activeGift: number;
  viewerCount: number;
  onClose: () => void; // Added onClose prop, which was in your usage
}


/* Stored paths are relative; the header rendered them raw. */
const absoluteImage = (p?: string) =>
  !p ? undefined
  : /^(https?:|file:|data:)/.test(p) ? p
  : `${base.BASE_URL}/${String(p).replace(/^[/]+/, '')}`;

const HosterHeader: React.FC<Props> = ({ hosterinfo, onClose, activeGift, viewerCount, isHost = false }) => {
  // 🚨 FIX 2: Use insets to determine the actual safe top starting point
  const insets = useSafeAreaInsets();
  
  return (
    <View 
      style={[
        styles.header, 
        // 🚨 FIX 3: Apply dynamic top padding based on safe area insets
        { paddingTop: insets.top, top: Platform.OS === 'android' ? 12 : 0 }
      ]}
    >
      <View style={styles.content}> 
        {/* LEFT */}
        <View style={styles.left}>
          {hosterinfo?.hoster?.image ? (
            <Image
              source={{ uri: absoluteImage(hosterinfo.hoster.image) }}
              style={styles.avatar}
            />
          ) : (
            <View style={styles.iconAvatar}>
              <Icon name="person" size={20} color="#fff" />
            </View>
          )}

          <View style={styles.nameWrapper}>
            <Text style={styles.hostName} numberOfLines={1}>
              {hosterinfo.hoster.name}
            </Text>
            {!isHost && (
  
              <TouchableOpacity style={styles.followButton}>
                <Text style={styles.followText}>
                  {hosterinfo.hoster.is_following ? "Following" : "+ Follow"}
                </Text>
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* RIGHT */}
        <View style={styles.right}>
          <View style={styles.statBadge}>
            <Icon name="logo-bitcoin" size={14} color="#FFD700" />
            <Text style={styles.statText}>{activeGift}</Text>
          </View>

          <View style={styles.statBadge}>
            <Icon name="eye" size={14} color="#fff" />
            <Text style={styles.statText}>{viewerCount}</Text>
          </View>

          <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
            <Icon name="close" size={18} color="#fff" />
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
};

export default HosterHeader;

const styles = StyleSheet.create({
  header: {
    position: "absolute",
    // 🚨 FIX 4: Use 0 for 'top' here and let padding handle the notch/status bar
    top: 0, 
    left: 0, // Stretch to the very left edge
    right: 0, // Stretch to the very right edge
    backgroundColor: "rgba(0,0,0,0.45)",
    zIndex: 100, // Ensure it sits above the video
  },
  content: {
    // This inner view holds the actual content and ensures left/right padding
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 12, // Apply horizontal padding here
    paddingVertical: 8, // Apply vertical padding below the status bar
  },

  left: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },

  avatar: {
    width: 42,
    height: 42,
    borderRadius: 21,
    borderWidth: 1,
    borderColor: "#fff",
  },

  iconAvatar: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: "#6B7280",
    justifyContent: "center",
    alignItems: "center",
  },

  nameWrapper: {
    marginLeft: 8,
  },

  hostName: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "600",
    maxWidth: 120,
  },

  followButton: {
    marginTop: 4,
    backgroundColor: "#EF4444",
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 12,
    alignSelf: "flex-start",
  },

  followText: {
    color: "#fff",
    fontSize: 11,
    fontWeight: "600",
  },

  right: {
    flexDirection: "row",
    alignItems: "center",
  },

  statBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.15)",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 14,
    marginRight: 6,
  },

  statText: {
    color: "#fff",
    fontSize: 12,
    marginLeft: 4,
  },

  closeBtn: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: "rgba(255,0,0,0.8)",
    justifyContent: "center",
    alignItems: "center",
  },
});