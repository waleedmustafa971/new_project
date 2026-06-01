import React, { useState } from "react";
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  TextInput,
  ScrollView, 
} from "react-native";

//import DocumentPicker from "react-native-document-picker";

const DigitalProfileModalScreen = ({ visible, onClose, onSave }: any) => {
  const [file, setFile] = useState<any>(null);

  // 📂 PICK FILE
  const pickFile = async (type: "audio" | "video") => {
   /*  try {
      const res = await DocumentPicker.pickSingle({
        type:
          type === "audio"
            ? DocumentPicker.types.audio
            : DocumentPicker.types.video,
      });

      console.log("Selected file:", res);
      setFile(res);

    } catch (err) {
      if (!DocumentPicker.isCancel(err)) {
        console.log("Picker error:", err);
      }
    } */
  };

  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={styles.overlay}>
        <View style={styles.container}>

          {/* HEADER */}
          <View style={styles.header}>
            <Text style={styles.title}>Digital Profile</Text>
            <TouchableOpacity onPress={onClose}>
              <Text style={styles.close}>✕</Text>
            </TouchableOpacity>
          </View>

          {/* PICK AUDIO */}
          <TouchableOpacity
            style={styles.fileBtn}
            onPress={() => pickFile("audio")}
          >
            <Text>Select Audio</Text>
          </TouchableOpacity>

          {/* PICK VIDEO */}
          <TouchableOpacity
            style={styles.fileBtn}
            onPress={() => pickFile("video")}
          >
            <Text>Select Video</Text>
          </TouchableOpacity>

          {/* SHOW SELECTED FILE */}
          {file && (
            <Text style={{ marginTop: 10 }}>
              Selected: {file.name}
            </Text>
          )}

          {/* SAVE BUTTON */}
          <View style={styles.footer}>
            <TouchableOpacity
              style={styles.saveBtn}
              onPress={() => {
                if (!file) {
                  alert("Please select a file");
                  return;
                }
                onSave(file); // 👈 send file to parent
                onClose();
              }}
            >
              <Text style={styles.saveText}>Upload</Text>
            </TouchableOpacity>
          </View>

        </View>
      </View>
    </Modal>
  );
};
export default DigitalProfileModalScreen

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  skillsContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginTop: 10,
  },
  fileBtn: {
  borderWidth: 1,
  borderColor: "#ddd",
  padding: 12,
  borderRadius: 8,
  marginTop: 10,
  alignItems: "center"
},
  skillsRow: {
    flexDirection: "row",
    alignItems: "center",
  },

  skillChip: {
    borderWidth: 1,
    borderColor: "#ccc",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    marginRight: 10, // 👈 spacing in row
    backgroundColor: "#fff",
  },

  skillChipSelected: {
    backgroundColor: "#000",
    borderColor: "#000",
  },

  skillText: {
    color: "#333", fontSize: 11
  },

  skillTextSelected: {
    color: "#fff",
  },
  container: {
    width: "95%",
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 15,
    maxHeight: "90%",
  },

  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 10,
  },

  title: {
    fontSize: 18,
    fontWeight: "bold",
  },

  close: {
    fontSize: 18,
  },

  label: {
    marginTop: 12,
    fontSize: 11
  },

  inputBox: {
    borderWidth: 1,
    borderColor: "#e5e7eb",
    borderRadius: 10,
    marginTop: 6,
    paddingHorizontal: 10,
    backgroundColor: "#f9fafb",
  },

  footer: {
    marginTop: 20,
  },

  saveBtn: {
    backgroundColor: "#000",
    padding: 14,
    borderRadius: 10,
    alignItems: "center",
  },

  saveText: {
    color: "#fff",
    fontWeight: "bold",
  },
});