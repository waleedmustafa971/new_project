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

const PortfolioModal = ({ visible, onClose, onSave }: any) => {
  const [form, setForm] = useState({
     projectname: "",
     projectlink: ""
  });

  const handleChange = (name: string, value: any) => {
    setForm((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const inputBox = styles.inputBox;

  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={styles.overlay}>
        <View style={styles.container}>
          <ScrollView showsVerticalScrollIndicator={false}>

            {/* HEADER */}
            <View style={styles.header}>
              <Text style={styles.title}>Portfolio</Text>
              <TouchableOpacity onPress={onClose}>
                <Text style={styles.close}>✕</Text>
              </TouchableOpacity>
            </View>

            {/* BODY */}
            <Text style={styles.label}>Project Name</Text>
            <View style={inputBox}>
              <TextInput
                placeholder=""
                value={form.projectname}
                onChangeText={(t) => handleChange("projectname", t)}
              />
            </View>

            <Text style={styles.label}>Project Link</Text>
            <View style={inputBox}>
              <TextInput
                placeholder=""
                value={form.projectlink}
                onChangeText={(t) => handleChange("projectlink", t)}
              />
            </View>
            {/* FOOTER */}
            <View style={styles.footer}>
              <TouchableOpacity
                style={styles.saveBtn}
                onPress={() => {
                  onSave(form)
                  onClose()
                }
                }
              >
                <Text style={styles.saveText}>Save</Text>
              </TouchableOpacity>
            </View>

          </ScrollView>
        </View>
      </View>
    </Modal>
  );
};

export default PortfolioModal;

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