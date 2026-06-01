import React, { useState, useRef } from "react";
import {
  Modal,
  TextInput,
  View,
  Text,
  TouchableOpacity,
  FlatList,
  ScrollView,
  Keyboard,
  Dimensions,
  KeyboardAvoidingView,
  SafeAreaView,
  Platform,
  Pressable,
} from "react-native";
import AntDesign from "react-native-vector-icons/AntDesign";
// Assuming VolumeBar is your custom slider component
import VolumeBar from "../../post/create/VolumeBar"; 

const { height } = Dimensions.get("window");

const fonts = [
  "Arial",
  "Marimpa",
  "Editor",
  "Classic",
  "Typewriter",
  "Memu",
  "Directional",
  "Literature",
  "Decorya",
  "Ramsoneth",
];

const colors = [
  "#000000", "#ffffff", "#ff0000", "#00ff00", "#0000ff",
  "#facc15", "#ff7f50", "#ffa500", "#800080", "#4b0082",
  "#00ffff", "#008080", "#ff69b4", "#a52a2a", "#808080",
  "#d2691e", "#1e90ff", "#32cd32", "#ff1493", "#7fffd4",
];

// ... (fonts and colors arrays remain the same)

const TextEditor = ({ visible, onClose, onDone }) => {
  const inputRef = useRef(null); // Fixed type for JS

  const [text, setText] = useState("");
  const [fontSize, setFontSize] = useState(20);
  const [fontFamily, setFontFamily] = useState("Arial");
  const [fontColor, setFontColor] = useState("#ffffff");

  const handleFocus = () => {
    // Small delay helps Android reliably pop the keyboard
    setTimeout(() => {
      inputRef.current?.focus();
    }, 100);
  };

  return (
    <Modal 
      visible={visible} 
      animationType="fade" 
      transparent={false}
      statusBarTranslucent
      onShow={handleFocus} // 🔥 Best place to trigger focus
    >
      <SafeAreaView style={{ flex: 1, backgroundColor: "#000" }}>
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === "ios" ? "padding" : "height"}
        >
          <Pressable style={{ flex: 1 }} onPress={Keyboard.dismiss}>
            {/* HEADER */}
            <View style={styles.header}>
              <TouchableOpacity onPress={onClose}>
                <AntDesign name="close" size={24} color="white" />
              </TouchableOpacity>
              <VolumeBar onChange={setFontSize} />
              <TouchableOpacity
                onPress={() => {
                  onDone({ text, fontSize, fontFamily, fontColor });
                  setText("");
                }}
                style={styles.doneButton}
              >
                <Text style={{ color: "#fff", fontWeight: 'bold' }}>Done</Text>
              </TouchableOpacity>
            </View>

            {/* MAIN CONTENT AREA */}
            <View style={{ flex: 1, flexDirection: 'row' }}>

              {/* Input Area */}
              <TextInput
                ref={inputRef}
                value={text}
                onChangeText={setText}
                multiline
                textAlignVertical="top"
                placeholder="Type your text here..."
                placeholderTextColor="#888"
                style={{
                  flex: 1,
                  color: fontColor,
                  fontSize: fontSize,
                  fontFamily: fontFamily,
                  padding: 20,
                }}
              />
            </View>

            {/* BOTTOM TOOLS - Stays above keyboard due to KeyboardAvoidingView */}
            <View style={{ backgroundColor: '#000', paddingBottom: 10 }}>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={{ paddingHorizontal: 16, marginBottom: 15 }}
              >
                {colors.map((color) => (
                  <TouchableOpacity
                    key={color}
                    onPress={() => setFontColor(color)}
                    style={[
                      styles.colorCircle,
                      { backgroundColor: color, borderColor: fontColor === color ? '#fff' : 'transparent' }
                    ]}
                  />
                ))}
              </ScrollView>

              <FlatList
                horizontal
                data={fonts}
                keyExtractor={(item) => item}
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={{ paddingHorizontal: 16 }}
                renderItem={({ item }) => (
                  <TouchableOpacity
                    onPress={() => setFontFamily(item)}
                    style={[
                      styles.fontBadge,
                      { backgroundColor: fontFamily === item ? "#1EB1FC" : "#333" }
                    ]}
                  >
                    <Text style={{ fontFamily: item, color: "#fff" }}>{item}</Text>
                  </TouchableOpacity>
                )}
              />
            </View>
          </Pressable>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </Modal>
  );
};

const styles = {
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16, marginTop: 20,
    height: 60,
  },
  doneButton: {
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: "#1EB1FC",
  },
  sliderContainer: {
    width: 40, 
    justifyContent: 'center', 
    alignItems: 'center',
    marginLeft: 10
  },
  colorCircle: {
    width: 30,
    height: 30,
    borderRadius: 15,
    marginRight: 12,
    borderWidth: 2,
  },
  fontBadge: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginRight: 12,
    borderRadius: 20,
  }
};

export default TextEditor;