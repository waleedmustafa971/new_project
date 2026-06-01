import React, { useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  TextInput,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
} from "react-native";
import Icon from "react-native-vector-icons/Ionicons";

interface Props {
  messageInput: string;
  setMessageInput: (text: string) => void;
  sendMessage: () => void;
  showEmojis: boolean;
  setShowEmojis: (val: boolean) => void;
  commonEmojis: string[];
  onEmojiSelect: (emoji: string) => void;
  onModalGift:  () => void;
}

const LiveChatFooter: React.FC<Props> = ({
  messageInput,
  setMessageInput,
  sendMessage,
  showEmojis,
  setShowEmojis,
  commonEmojis,
  onEmojiSelect,
  onModalGift
}) => {

  
  return (
    <>
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      style={styles.footerWrapper}
    >
      {/* Emoji Popup */}
      {showEmojis && (
        <View style={styles.emojiPopup}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {commonEmojis.map((emoji, index) => (
              <TouchableOpacity
                key={index}
                onPress={() => onEmojiSelect(emoji)}
              >
                <Text style={styles.emojiText}>{emoji}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      )}

      {/* Footer Bar */}
      <View style={styles.footer}>
        {/* Emoji Toggle */}
        <TouchableOpacity
          style={styles.iconBtn}
          onPress={() => setShowEmojis(!showEmojis)}
        >
          <Icon
            name={showEmojis ? "keypad" : "happy-outline"}
            size={24}
            color={showEmojis ? "red" : "#fff"}
          />
        </TouchableOpacity>

        {/* Input */}
        <View style={styles.inputWrapper}>
          <TextInput
            placeholder="Say something..."
            placeholderTextColor="#ccc"
            style={styles.inputField}
            value={messageInput}
            onChangeText={setMessageInput}
          />
          <TouchableOpacity
            style={[
              styles.sendInsideBtn,
              { opacity: messageInput.length > 0 ? 1 : 0.5 },
            ]}
            disabled={messageInput.length === 0}
            onPress={sendMessage}
          >
            <Icon name="send" size={18} color="#fff" />
          </TouchableOpacity>
        </View>

        {/* Extra Buttons */}
        <TouchableOpacity style={styles.iconBtn} onPress={onModalGift}>
          <Icon name="gift-outline" size={24} color="#fff" />
        </TouchableOpacity>

        <TouchableOpacity style={styles.iconBtn}>
          <Icon name="share-social-outline" size={24} color="#fff" />
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
    </>
  );
};

export default LiveChatFooter;

/* ===================== STYLES ===================== */

const styles = StyleSheet.create({
  footerWrapper: {
    position: "absolute",
    bottom: 20,
    width: "100%",
  },
  footer: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
  },
  emojiPopup: {
    backgroundColor: "rgba(0,0,0,0.8)",
    flexDirection: "row",
    paddingVertical: 10,
    paddingHorizontal: 15,
    borderRadius: 25,
    marginHorizontal: 15,
    marginBottom: 10,
  },
  emojiText: {
    fontSize: 24,
    marginHorizontal: 8,
  },
  inputWrapper: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.15)",
    borderRadius: 25,
    paddingHorizontal: 5,
    height: 46,
    marginHorizontal: 5,
  },
  inputField: {
    flex: 1,
    color: "#fff",
    paddingHorizontal: 12,
    fontSize: 14,
  },
  sendInsideBtn: {
    backgroundColor: "red",
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: "center",
    alignItems: "center",
  },
  iconBtn: {
    width: 42,
    height: 42,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.5)",
    borderRadius: 21,
  },
});
