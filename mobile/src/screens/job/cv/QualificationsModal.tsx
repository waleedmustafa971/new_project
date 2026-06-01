import React, { useState } from 'react';
import {
  Modal, View, Text, TextInput, TouchableOpacity,
  StyleSheet, ScrollView, KeyboardAvoidingView, Platform,
  Alert
} from 'react-native';
import { Picker } from "@react-native-picker/picker";
import { getNames } from "country-list";

const QualificationsModal = ({ visible, onClose, onSubmit }: any) => {
  const [form, setForm] = useState({
    degree: '',
    specialization: '',
    university: '',
    country: '',
    startYear: '',
    endYear: ''
  });
  const countries = getNames();
  //  console.log('countries', countries)

  const handleSave = () => {
    // Basic validation
    if (!form.degree || !form.university) {
      Alert.alert("Please fill in required fields");
      return;
    }
    onSubmit(form); // Send data to parent
    onClose();      // Close modal
  };

  const handleClear = () => {
    setForm({ degree: '', specialization: '', university: '', country: '', startYear: '', endYear: '' });
  };

  const handleChange = (name, value) => {
    setForm((prev) => ({
      ...prev,
      [name]: value,
    }));
  };


  return (
    <Modal visible={visible} animationType="slide" transparent={true}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.modalOverlay}
      >
        <View style={styles.modalContainer}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.headerTitle}>Qualifications</Text>
            <TouchableOpacity onPress={onClose}>
              <Text style={styles.closeIcon}>✕</Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.formContent} showsVerticalScrollIndicator={false}>
            <Text style={styles.subTitle}>
              Add your academic qualification details such as School, Undergrad and Post graduation degree.
            </Text>

            {/* Degree Input */}
            <View style={styles.inputWrapper}>
              <Text style={styles.label}>Degree *</Text>
              <Picker
                selectedValue={form.degree ?? ""}
                onValueChange={(value) => {
                  console.log("Education selected:", value); // debug
                  handleChange("degree", value);
                }}
                style={{ color: "#000", height: 50 }}
                itemStyle={{ fontSize: 12 }}
              >
                <Picker.Item label="Select education level" style={{ fontSize: 12 }} value="" />
                <Picker.Item label="High School / Secondary" style={{ fontSize: 12 }} value="High School / Secondary" />
                <Picker.Item label="Bachelor's Degree" style={{ fontSize: 12 }} value="Bachelor's Degree" />
                <Picker.Item label="Master's Degree" style={{ fontSize: 12 }} value="Master's Degree" />
                <Picker.Item label="PhD" value="PhD" style={{ fontSize: 12 }} />
              </Picker>
            </View>

            {/* Specialization */}
            <View style={styles.inputWrapper}>
              <Text style={styles.label}>Specialization</Text>
              <TextInput
                style={styles.input}
                placeholder="Specialization"
                value={form.specialization}
                onChangeText={(val) => setForm({ ...form, specialization: val })}
              />
            </View>

            {/* University */}
            <View style={styles.inputWrapper}>
              <Text style={styles.label}>University Name *</Text>
              <TextInput
                style={styles.input}
                placeholder="University Name"
                value={form.university}
                onChangeText={(val) => setForm({ ...form, university: val })}
              />
            </View>

            <View style={styles.inputWrapper}>
              <Text style={styles.label}>Country *</Text>
              <View style={{
                borderWidth: 1,
                backgroundColor: "#f9fafb", borderColor: "#e5e7eb",
                borderRadius: 10
              }}>
                <Picker
                  selectedValue={form.country || ""}
                  onValueChange={(value) => {
                    console.log("Selected:", value);
                    handleChange("country", value);
                  }} style={{ color: "#000", fontSize: 12 }}

                >
                  {countries?.map((item) => {
                    const cleanName = item.replace(/\s*\(.*?\)/g, "");
                    return (
                      <Picker.Item
                        key={item} style={{ fontSize: 12 }}
                        label={cleanName}
                        value={cleanName} // ✅ use same cleaned value
                      />
                    );
                  })}
                </Picker>
              </View>
            </View>


            {/* Date Row */}
            <View style={styles.row}>
              <View style={[styles.inputWrapper, { flex: 1, marginRight: 10 }]}>
                <Text style={styles.label}>Yr. of Graduation *</Text>
                <TextInput
                  style={styles.input}
                  placeholder="From"
                  keyboardType="numeric"
                  onChangeText={(val) => setForm({ ...form, startYear: val })}
                />
              </View>
              <View style={[styles.inputWrapper, { flex: 1 }]}>
                <Text style={styles.label}>Yr. of Graduation *</Text>
                <TextInput
                  style={styles.input}
                  placeholder="To"
                  keyboardType="numeric"
                  onChangeText={(val) => setForm({ ...form, endYear: val })}
                />
              </View>
            </View>
          </ScrollView>

          {/* Footer Buttons */}
          <View style={styles.footer}>
            <TouchableOpacity style={styles.clearBtn} onPress={handleClear}>
              <Text style={styles.clearBtnText}>Clear All</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.saveBtn} onPress={handleSave}>
              <Text style={styles.saveBtnText}>Save</Text>
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};
export default QualificationsModal;

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContainer: {
    width: '95%',
    maxHeight: '80%',
    backgroundColor: 'white',
    borderRadius: 12,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 20,
    borderBottomWidth: 1,
    borderColor: '#f0f0f0',
  },
  headerTitle: { fontSize: 14, color: '#333' },
  closeIcon: { fontSize: 14, color: '#666' },
  formContent: { padding: 20 },
  subTitle: { fontSize: 12, color: '#666', marginBottom: 25, lineHeight: 20 },
  inputWrapper: {
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#D1D1D1',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  label: {
    position: 'absolute',
    top: -10,
    left: 10,
    backgroundColor: 'white',
    paddingHorizontal: 5,
    fontSize: 12,
    color: '#666',
  },
  input: {
    fontSize: 12,
    color: '#333',
    height: 40,
  },
  row: { flexDirection: 'row' },
  footer: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    padding: 20,
    borderTopWidth: 1,
    borderColor: '#f0f0f0',
    backgroundColor: '#fff',
  },
  clearBtn: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    marginRight: 10,
    borderWidth: 1,
    borderColor: '#333',
    borderRadius: 8,
  },
  clearBtnText: { fontWeight: 'bold', color: '#333' },
  saveBtn: {
    paddingHorizontal: 30,
    paddingVertical: 12,
    backgroundColor: '#000', // Set to primary color when form is valid
    borderRadius: 8,
  },
  saveBtnText: { fontWeight: 'bold', color: '#999' },
});