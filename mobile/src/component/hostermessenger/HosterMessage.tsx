import React, { useEffect, useRef } from "react";
import { ScrollView, Text, StyleSheet } from "react-native";

interface ChatMessage {
  text: string;
  system?: boolean;
  sender?: {
    name?: string;
  };
}

interface Props {
  messages: ChatMessage[];
}

const HosterMessage: React.FC<Props> = ({ messages }) => {
  const scrollViewRef = useRef<ScrollView | null>(null);
  console.log('.....Hoster Message.... ', JSON.stringify(messages))

  // Auto-scroll on new message
  useEffect(() => {
    scrollViewRef.current?.scrollToEnd({ animated: true });
  }, [messages]);

  return (
    <ScrollView
      ref={scrollViewRef}
      style={styles.container}
      showsVerticalScrollIndicator={false}
    >
      {messages.map((msg, idx) => (
        <Text
          key={idx}
          style={[
            styles.messageText,
            msg.system && styles.systemMessage,
          ]}
        >
          {!msg.system && msg.sender?.name
            ? `${msg.sender.name}: `
            : ""}
          {msg.text}
        </Text>
      ))}
    </ScrollView>
  );
};

export default HosterMessage;

/* ===================== STYLES ===================== */

const styles = StyleSheet.create({
  container: {
    marginTop: 8,
  },
  messageText: {
    color: "#fff",
    fontSize: 13,
    marginVertical: 2,
  },
  systemMessage: {
    color: "#FFD700",
    fontStyle: "italic",
  },
});
