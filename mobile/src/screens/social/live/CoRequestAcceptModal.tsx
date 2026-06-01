import React, { useEffect, useRef } from "react";
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Animated,
  Pressable,
  ActivityIndicator
} from "react-native";
import Icon from "react-native-vector-icons/Ionicons";

// Define the required structure for a pending request
interface CoHostRequest {
    _id: string;
    name: string;
}

interface Props {
  visible: boolean;
  // The modal will now be used specifically for a request, so title/message become props from parent
  coHostRequest: CoHostRequest | null; // The specific request object being processed
  onClose: () => void;
  onAccept: (requester: CoHostRequest) => void; // Renamed to onAccept for clarity
  onReject: (requester: CoHostRequest) => void;
  loading: boolean; // Renamed from initial 'loading' prop for clarity
}

// Adjusted height for a more compact popup
const SHEET_HEIGHT = 150; 

const CoRequestAcceptModal: React.FC<Props> = ({
  visible,
  coHostRequest,
  onClose,
  onAccept,
  onReject,
  loading,
}) => {
  const slideAnim = useRef(new Animated.Value(SHEET_HEIGHT)).current;
  
  // Use the loading prop passed from the parent for the button state
  const isActionLoading = loading; 

  useEffect(() => {
    if (visible) {
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }).start();
    } else {
      Animated.timing(slideAnim, {
        toValue: SHEET_HEIGHT,
        duration: 200,
        useNativeDriver: true,
      }).start();
    }
  }, [visible]);

  // Ensure request is available before rendering
  if (!coHostRequest) return null;

  const handleAccept = () => {
      onAccept(coHostRequest);
  };
  
  const handleReject = () => {
      onReject(coHostRequest);
      // The parent component should handle removing it from the request list
  };


  return (
    <Modal visible={visible} transparent statusBarTranslucent animationType="none">
      {/* Overlay */}
      <Pressable style={styles.overlay} onPress={onClose} />

      {/* Bottom Sheet */}
      <Animated.View
        style={[
          styles.container,
          { transform: [{ translateY: slideAnim }] },
          { height: SHEET_HEIGHT } // Ensure consistent height
        ]}
      >
        {/* TOP ROW: Icon and Close Button */}
        <View style={styles.headerRow}>
          <View style={styles.iconContainer}>
            <Icon name="videocam" size={20} color="#EF4444" />
          </View>
          <TouchableOpacity style={styles.closeBtn} onPress={onClose} disabled={isActionLoading}>
            <Icon name="close" size={20} color="#6B7280" />
          </TouchableOpacity>
        </View>

        {/* MIDDLE ROW: Message */}
        <View style={styles.messageRow}>
          <Text style={styles.requestMessage}>
            <Text style={styles.requesterName}>{coHostRequest.name}</Text> is waiting to join as a co-host.
          </Text>
        </View>

        {/* BOTTOM ROW: Action Buttons */}
        <View style={styles.buttonRow}>
          <TouchableOpacity 
            style={[styles.actionBtn, styles.rejectBtn]} 
            onPress={handleReject} 
            disabled={isActionLoading}
          >
             {isActionLoading ? <ActivityIndicator color="#111827" /> : <Text style={styles.rejectText}>Reject</Text>}
          </TouchableOpacity>

          <TouchableOpacity 
            style={[styles.actionBtn, styles.acceptBtn]} 
            onPress={handleAccept} 
            disabled={isActionLoading}
          >
            {isActionLoading ? <ActivityIndicator color="#fff" /> : <Text style={styles.acceptText}>Accept</Text>}
          </TouchableOpacity>
        </View>
        
      </Animated.View>
    </Modal>
  );
};

export default CoRequestAcceptModal;

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.6)", // Slightly darker overlay
  },
  
  container: {
    position: "absolute",
    bottom: 40,
    width: "100%",
    backgroundColor: "#fff",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: 20,
    paddingTop: 15,
    paddingBottom: 15,
  },
  
  // --- Header Row ---
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  iconContainer: {
    padding: 6,
    borderRadius: 15,
    backgroundColor: '#FEE2E2', // Light red background for icon
  },
  closeBtn: {
    padding: 6,
  },

  // --- Message Row ---
  messageRow: {
    paddingHorizontal: 5,
    marginBottom: 15,
  },
  requestMessage: {
    fontSize: 14,
    color: '#111827',
  },
  requesterName: {
    fontWeight: 'bold',
    color: '#EF4444', // Highlight the name
  },

  // --- Button Row ---
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 5, marginBottom: 5
  },
  actionBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 12,
    alignItems: 'center',
    marginHorizontal: 5,
    height: 40, // Consistent button height
    justifyContent: 'center',
  },
  rejectBtn: {
    backgroundColor: '#E5E7EB', // Light gray background
    borderColor: '#D1D5DB',
    borderWidth: 1,
  },
  rejectText: {
    color: '#111827',
    fontWeight: '600',
    fontSize: 15,
  },
  acceptBtn: {
    backgroundColor: '#EF4444', // Red background for acceptance
  },
  acceptText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 15,
  },
});