import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
} from "react-native";
import Feather from "react-native-vector-icons/Feather";
import Colors from "../../../component/constants/color/color";

const ContactInfo = ({ onContactChange } : any) => {
  const [mobile, setmobile] = useState("");
  const [email, setemail] = useState("");
  const [editing, setEditing] = useState(false);
  const [tempmobile, setTempmobile] = useState(mobile);
  const [tempemail, setTempemail] = useState(email);

 const handleSave = () => {
  setmobile(tempmobile);
  setemail(tempemail);
  setEditing(false);

  // 🔥 Send data to parent
  onContactChange({
    mobile: tempmobile,
    email: tempemail,
  });
};

  return (
    <View style={styles.container}>
      <Text style={styles.label}>Contact Information</Text>
      {editing ? (
        <View>
           <Text style={styles.label1}>Mobile no.:</Text> 
          <TextInput
            style={styles.input}
            value={tempmobile}
            onChangeText={setTempmobile}
            multiline
          />
          <Text style={styles.label1}>Email:</Text>
          <TextInput
            style={styles.input}
            value={tempemail}
            onChangeText={setTempemail}
            multiline
          />
          <TouchableOpacity style={styles.saveBtn} onPress={handleSave}>
            <Text style={styles.saveText}>Save</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <View style={styles.row}>
          <View>
            <Text style={styles.mobile}>{mobile}</Text>
            <Text style={styles.mobile}>{email}</Text>
          </View>
          <TouchableOpacity
            onPress={() => setEditing(true)}
            style={styles.editBtn}
          >
          <Feather name="edit" size={16} color="#fff" />
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
};

export default ContactInfo;

const styles = StyleSheet.create({
  container: {
    borderRadius: 12,
    padding: 12,
    marginTop: -10,
    backgroundColor: Colors.lightPurple,
    margin: 15,
  },
  editBtn: {
    padding: 8,
    backgroundColor: Colors.purple,
    borderRadius: 18,
  },
  label: {
    fontWeight: "700",
    fontSize: 14,
    marginBottom: 8,
  },
   label1: {
    fontWeight: "400",
    fontSize: 13,
    marginBottom: 5,
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
  },
  mobile: {
    flex: 1,
    color: "#444",
    marginRight: 10,
  },
  input: {
    backgroundColor: "#F2F2F2",
    borderRadius: 8,
    padding: 8,
    marginBottom: 8,
  },
  saveBtn: {
    alignSelf: "flex-end",
    backgroundColor: Colors.purple,
    borderRadius: 8,
    paddingVertical: 6,
    paddingHorizontal: 15,
  },
  saveText: {
    color: "#fff",
    fontWeight: "600",
  },
});
