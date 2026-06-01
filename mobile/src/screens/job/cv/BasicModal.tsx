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
import { Picker } from "@react-native-picker/picker";
import { getNames } from "country-list";

const BasicModal = ({ visible, onClose, onSave }: any) => {
  const countries = getNames();
  const [form, setForm] = useState({
    firstname: "",
    middlename: "",
    lastname: "",
    title: "",
    emailid: "",
    phoneno: "",
    gender: "",
    dateofbirth: "",
    languages: [],
    nationality: "", //multi
    currentcity: "",
    visastatus: "",
    careerlevel: "",
    desiredSalary: "",
    skills: [], // multi
  });
  const visaTypes = [
    "Business",
    "Employment",
    "Visit",
    "Freelance",
    "Residence",
    "Student",
    "Golden",
    "Family"
  ];
  const languagesList = [
    "English",
    "Arabic",
    "Hindi",
    "Russian",
    "French",
    "Italian",
    "Chinese",
    "German",
    "Japanese",
    "Spanish",
  ];

  const skillslist = [
    "PHP",
    "SQL",
    "MongoDB",
    "Node JS",
    "React JS",
    "React Native",
  ];

  const handleChange = (name: string, value: any) => {
    setForm((prev) => ({
      ...prev,
      [name]: value,
    }));
  };
  const toggleLanguage = (lang) => {
    setForm((prev) => {
      const exists = prev.languages.includes(lang);

      return {
        ...prev,
        languages: exists
          ? prev.languages.filter((l) => l !== lang)
          : [...prev.languages, lang],
      };
    });
  };
  const toggleSkill = (skill: any) => {
    setForm((prev) => {
      const exists = prev.skills.includes(skill);

      return {
        ...prev,
        skills: exists
          ? prev.skills.filter((s) => s !== skill)
          : [...prev.skills, skill],
      };
    });
  };

  const inputBox = styles.inputBox;


  const handleDateChange = (text: string) => {
  // allow only numbers and /
  let cleaned = text.replace(/[^0-9/]/g, "");

  // auto add slashes
  if (cleaned.length === 2 || cleaned.length === 5) {
    if (!cleaned.includes("/", cleaned.length - 1)) {
      cleaned += "/";
    }
  }

  // limit length DD/MM/YYYY = 10
  if (cleaned.length > 10) return;

  setForm((prev: any) => ({
    ...prev,
    dateofbirth: cleaned
  }));
};

  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={styles.overlay}>
        <View style={styles.container}>
          <ScrollView showsVerticalScrollIndicator={false}>

            {/* HEADER */}
            <View style={styles.header}>
              <Text style={styles.title}>Basic Info</Text>
              <TouchableOpacity onPress={onClose}>
                <Text style={styles.close}>✕</Text>
              </TouchableOpacity>
            </View>

            {/* BODY */}
            <View style={{ display: 'flex' }}>
              <TextInput
                placeholder="First Name" style={inputBox}
                value={form.firstname} placeholderTextColor="#000"
                onChangeText={(t) => handleChange("firstname", t)}
              />
              <TextInput
                placeholder="Middle Name" placeholderTextColor="#000"
                value={form.middlename} style={inputBox}
                onChangeText={(t) => handleChange("middlename", t)}
              />
              <TextInput
                placeholder="Last Name" placeholderTextColor="#000"
                value={form.lastname} style={inputBox}
                onChangeText={(t) => handleChange("lastname", t)}
              />
            </View>
            <Text style={styles.label}>Title</Text>
            <View style={inputBox}>
              <TextInput
                placeholder="Enter Title"
                value={form.title}
                onChangeText={(t) => handleChange("title", t)}
              />
            </View>
            <Text style={styles.label}>Email ID</Text>
            <View style={inputBox}>
              <TextInput
                placeholder="Enter email"
                value={form.emailid}
                onChangeText={(t) => handleChange("emailid", t)}
              />
            </View>

            <Text style={styles.label}>Phone Number</Text>
            <View style={inputBox}>
              <TextInput
                placeholder="Enter phone"
                value={form.phoneno}
                onChangeText={(t) => handleChange("phoneno", t)}
              />
            </View>

            <Text style={styles.label}>Gender</Text>
            <View style={inputBox}>
              <Picker
                selectedValue={form.gender || ""}
                onValueChange={(value) => {
                  console.log("Selected:", value);
                  handleChange("gender", value);
                }} style={{ color: "#000", fontSize: 12 }}
              >
                <Picker.Item label="Select Gender" style={{ fontSize: 11 }} value="" />
                <Picker.Item label="male" value="Male" style={{ fontSize: 11 }} />
                <Picker.Item label="female" value="Female" style={{ fontSize: 11 }} />
                <Picker.Item label="other" value="other" style={{ fontSize: 11 }} />
              </Picker>
            </View>

            <Text style={styles.label}>Date of Birth</Text>
            <View style={inputBox}>
              <TextInput
                placeholder="DD/MM/YYYY"
                value={form.dateofbirth}
                //onChangeText={(t) => handleChange("dateofbirth", t)}
                onChangeText={handleDateChange}
                keyboardType="numeric"
              />
            </View>

            <Text style={styles.label}>Languages</Text>
            <View style={inputBox}>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ padding: 5 }}>
                <View style={styles.skillsRow}>
                  {languagesList.map((lang) => {
                    const selected = form.languages.includes(lang);

                    return (
                      <TouchableOpacity
                        key={lang}
                        onPress={() => toggleLanguage(lang)}
                        style={[
                          styles.skillChip,
                          selected && styles.skillChipSelected,
                        ]}
                      >
                        <Text
                          style={[
                            styles.skillText,
                            selected && styles.skillTextSelected,
                          ]}
                        >
                          {lang}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </ScrollView>

              {/* <Picker
                selectedValue={form.languages}
                onValueChange={(v) => handleChange("languages", v)}
              >
                <Picker.Item label="Select Language" value="" />
                {languagesList.map((lang) => (
                  <Picker.Item key={lang} label={lang} value={lang} />
                ))}
              </Picker> */}
            </View>

            <Text style={styles.label}>nationality</Text>
            <View style={inputBox}>
              <Picker
                selectedValue={form.nationality || ""}
                onValueChange={(value) => {
                  console.log("Selected:", value);
                  handleChange("nationality", value);
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

            <Text style={styles.label}>Current City</Text>
            <View style={inputBox}>
              <TextInput
                placeholder="Current City"
                value={form.currentcity}
                onChangeText={(t) => handleChange("currentcity", t)}
              />
            </View>

            <Text style={styles.label}>Visa Status</Text>
            <View style={inputBox}>
              <Picker
                selectedValue={form.visastatus || ""}
                onValueChange={(value) => {
                  console.log("visastatus Selected:", value);
                  handleChange("visastatus", value);
                }} style={{ color: "#000", fontSize: 12 }}
              >
                <Picker.Item label="Select Visa Type" style={{ fontSize: 12 }} value="" />
                {visaTypes.map((v) => (
                  <Picker.Item key={v} label={v} value={v} style={{ fontSize: 12 }} />
                ))}
              </Picker>

            </View>

            <Text style={styles.label}>Career Level</Text>
            <View style={inputBox}>
              <Picker
                selectedValue={form.careerlevel || ""}
                onValueChange={(value) => {
                  console.log("careerlevel Selected:", value);
                  handleChange("careerlevel", value);
                }} style={{ color: "#000", fontSize: 12 }}>
                <Picker.Item label="Student/Inter" style={{ fontSize: 12 }} value="Student/Inter" />
                <Picker.Item label="Junior" style={{ fontSize: 12 }} value="Junior" />
                <Picker.Item label="Mid-level" style={{ fontSize: 12 }} value="Mid-level" />
                <Picker.Item label="Senior" style={{ fontSize: 12 }} value="Senior" />
                <Picker.Item label="Manager" style={{ fontSize: 12 }} value="Manager" />
                <Picker.Item label="Executive/Director" style={{ fontSize: 12 }} value="Executive/Director" />

              </Picker>

            </View>

            <Text style={styles.label}>Desired Salary</Text>
            <View style={inputBox}>
              <TextInput
                placeholder="Salary per month"
                value={form.desiredSalary}
                onChangeText={(t) => handleChange("desiredSalary", t)}
              />
            </View>

            <Text style={styles.label}>Skills</Text>
            <View style={inputBox}>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false} style={{ padding: 5 }}
              >
                <View style={styles.skillsRow}>
                  {skillslist.map((skill) => {
                    const selected = form.skills.includes(skill);
                    return (
                      <TouchableOpacity
                        key={skill}
                        onPress={() => toggleSkill(skill)}
                        style={[
                          styles.skillChip,
                          selected && styles.skillChipSelected,
                        ]}
                      >
                        <Text
                          style={[
                            styles.skillText,
                            selected && styles.skillTextSelected,
                          ]}
                        >
                          {skill}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </ScrollView>
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

export default BasicModal;

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
    fontSize: 14,
    fontWeight: "bold",
  },

  close: {
    fontSize: 14,
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
    backgroundColor: "#f9fafb", fontSize: 12
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