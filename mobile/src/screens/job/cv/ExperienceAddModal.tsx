import React, { useState } from 'react';
import {
  Modal, View, Text, TouchableOpacity, StyleSheet,
  Dimensions, TextInput,
  ScrollView
} from 'react-native';
import { Picker } from "@react-native-picker/picker";
import { getNames } from "country-list";
import DateTimePicker from "@react-native-community/datetimepicker";

const ExperienceAddModal = ({ visible, onClose, onSave, currentFileName, jobcategoriesdata }: any) => {
  //  console.log('child', jobcategoriesdata)
  const [showFromPicker, setShowFromPicker] = useState(false);
  const [showToPicker, setShowToPicker] = useState(false);
  const countries = getNames();
  //  console.log('countries', countries)

  const [form, setForm] = useState({
    jobtitle: "",
    category: "",
    subcategory: "", industrytype: "", companyname: "",
    country: "",
    jobdescription: "", fromDate: "", toDate: ""

  });

  const handleChange = (name, value) => {
    setForm((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={styles.modalOverlay}>
        <View style={styles.modalContainer}>
          <ScrollView>
            {/* Header */}
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Experience</Text>
              <TouchableOpacity onPress={onClose}>
                <Text style={styles.close}>✕</Text>
              </TouchableOpacity>
            </View>

            {/* Body */}
            <View style={styles.modalBody}>

              <Text style={styles.uploadText}>Job Title</Text>
              <View style={styles.fileRow}>
                <TextInput
                  style={styles.input}
                  placeholder="Enter Job Title"
                  value={form.jobtitle}
                  onChangeText={(text) => handleChange("jobtitle", text)}
                />
              </View>

              <Text style={styles.uploadText}>Job Category</Text>
              {/*  <View style={styles.fileRow}> */}
              <View style={{
                borderWidth: 1,
                backgroundColor: "#f9fafb", borderColor: "#e5e7eb",
                borderRadius: 10
              }}>
                <Picker
                  mode="dropdown"
                  selectedValue={form.category || ""}
                  onValueChange={(value) => handleChange("category", value)}
                  style={{ color: "#000" }}
                  dropdownIconColor="#000"
                >
                  {jobcategoriesdata?.map((item: any) => (
                    <Picker.Item key={item.slug} label={item.title} value={item.slug} style={{ fontSize: 12 }}/>
                  ))}
                </Picker>
              </View>

              <Text style={styles.uploadText}>Sub Category</Text>
              <View style={{
                borderWidth: 1,
                backgroundColor: "#f9fafb", borderColor: "#e5e7eb",
                borderRadius: 10
              }}>
                <Picker
                  mode="dropdown"
                  selectedValue={form.subcategory || ""}
                  onValueChange={(value) => handleChange("subcategory", value)}
                  style={{ color: "#000" }}
                  dropdownIconColor="#000"
                >
                  {
                    jobcategoriesdata.subcategories?.map((sub: any) => (
                      <>
                        <Picker.Item label={sub.title} value={sub.slug} style={{ fontSize: 12 }}/>
                      </>
                    ))}
                </Picker>
              </View>

              <Text style={styles.uploadText}>Industry</Text>
              <View style={{
                borderWidth: 1,
                backgroundColor: "#f9fafb", borderColor: "#e5e7eb",
                borderRadius: 10
              }}>
                <Picker
                  mode="dropdown"
                  selectedValue={form.industrytype || ""}
                  onValueChange={(value) => handleChange("industrytype", value)}
                  style={{ color: "#000" }}
                  dropdownIconColor="#000"
                >
                  {
                    jobcategoriesdata.subcategories?.map((sub: any) => (
                      <>
                        <Picker.Item label={sub.title} value={sub.slug} style={{ fontSize: 12 }}/>
                      </>
                    ))}
                </Picker>
              </View>
              <Text style={styles.uploadText}>Company Name</Text>
              <View style={styles.fileRow}>
                <TextInput
                  style={styles.input}
                  placeholder="company name"
                  value={form.companyname}
                  onChangeText={(text) => handleChange("companyname", text)}
                />
              </View>

              <Text style={styles.uploadText}>Country</Text>
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
              <Text style={styles.uploadText}>Job Description</Text>
              <View style={styles.fileRow}>
                <TextInput
                  style={[styles.input, styles.textArea]}
                  placeholder="Describe your role, responsibilities, achievements..."
                  value={form.jobdescription}
                  onChangeText={(text) => handleChange("jobdescription", text)}
                  multiline
                  numberOfLines={5}
                  textAlignVertical="top"
                />
              </View>

              {/* from date to date of experience */}
              <View>
                <Text style={styles.uploadText}>From Date</Text>
                <TouchableOpacity
                  style={styles.dateInput}
                  onPress={() => setShowFromPicker(true)}
                >
                  <Text style={styles.dateText}>
                    {form.fromDate || "Select start date"}
                  </Text>
                </TouchableOpacity>

                <Text style={styles.uploadText}>To Date</Text>
                <TouchableOpacity
                  style={styles.dateInput}
                  onPress={() => setShowToPicker(true)}
                >
                  <Text style={styles.dateText}>
                    {form.toDate || "Select end date"}
                  </Text>
                </TouchableOpacity>
              </View>

              {showFromPicker && (
                <DateTimePicker
                  value={new Date()}
                  mode="date"
                  display="default"
                  onChange={(event, selectedDate) => {
                    setShowFromPicker(false);
                    if (selectedDate) {
                      handleChange("fromDate", selectedDate.toDateString());
                    }
                  }}
                />
              )}

              {showToPicker && (
                <DateTimePicker
                  value={new Date()}
                  mode="date"
                  display="default"
                  onChange={(event, selectedDate) => {
                    setShowToPicker(false);
                    if (selectedDate) {
                      handleChange("toDate", selectedDate.toDateString());
                    }
                  }}
                />
              )}



            </View>

            {/* Footer */}
            <View style={styles.modalFooter}>
              <TouchableOpacity style={styles.deleteBtn} onPress={() => onSave(null)}>
                <Text style={styles.deleteBtnText}>Delete</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.saveBtn, !currentFileName && styles.disabledBtn]}
                onPress={() => 
                  {onSave(form)
                  onClose()}
                }   // ✅ send full form
              >
                <Text style={styles.saveBtnText}>Save</Text>
              </TouchableOpacity>
            </View>

          </ScrollView>
        </View>
      </View>
    </Modal>
  );
};

export default ExperienceAddModal

const styles = StyleSheet.create({
  // Modal Styles
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
  modalContainer: {
    width: '100%',
    backgroundColor: 'white',
    borderRadius: 8,
    overflow: 'hidden'
  },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', padding: 15, borderBottomWidth: 1, borderColor: '#eee' },
  modalTitle: { fontSize: 12, fontWeight: 'bold' },
  modalBody: { padding: 20 },
  fileRow: {
    flexDirection: 'row',
    marginTop: 7, marginBottom: 7,
    borderColor: "#e5e7eb",
    backgroundColor: "#f9fafb"
  },
  modalFooter: { flexDirection: 'row', justifyContent: 'flex-end', padding: 15, borderTopWidth: 1, borderColor: '#eee' },
  deleteBtn: { paddingHorizontal: 20, paddingVertical: 10, borderRadius: 5, borderWidth: 1, borderColor: '#ccc', marginRight: 10 },
  saveBtn: { paddingHorizontal: 25, paddingVertical: 10, borderRadius: 5, backgroundColor: '#0066FF' },
  saveBtnText: { color: 'white', fontWeight: 'bold' },
  // Card Styles
  cardContainer: { backgroundColor: 'white', padding: 15, borderRadius: 10, marginBottom: 20 },
  resumePreviewBox: { borderWidth: 1, borderColor: '#e0e0e0', borderRadius: 8, overflow: 'hidden', width: 220 },
  previewTop: { height: 60, backgroundColor: '#e8eaff', justifyContent: 'center', alignItems: 'center' },
  previewBottom: { padding: 10 },
  previewActionRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 5 },
  viewBtn: { borderWidth: 1, borderColor: '#333', paddingHorizontal: 12, paddingVertical: 4, borderRadius: 4 },
  viewText: { fontSize: 12, fontWeight: '600' },
  uploadText: { fontSize: 12 },
  fileIconBox: {},
  fileIconText: {},
  fileNameText: {},
  deleteBtnText: {},
  disabledBtn: {},
  close: {},
  input: {
    flex: 1,
    backgroundColor: "#f9fafb", borderColor: "#e5e7eb",
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,

  },
  textArea: {
    height: 120,
    paddingTop: 12
  },
  dateInput: {
    backgroundColor: "#f9fafb",
    padding: 14,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#e5e7eb",
    marginTop: 10
  },
  dateText: {
    color: "#111",
    fontSize: 12
  }

});