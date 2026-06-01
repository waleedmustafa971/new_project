import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput, Dimensions
} from "react-native";
import Feather from "react-native-vector-icons/Feather";
import Colors from "../../../component/constants/color/color";
const { width } = Dimensions.get("window");
const isTablet = width >= 768;

const FoodDeliveryAddress = ({ onContactChange }: any) => {
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

  const handleClose = () => {
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
      <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
        <View>
          <Text style={styles.label}>Delivery Instructions</Text>
          <Text style={styles.labeloptional}>Optional Floor or Apt No or tell us how we can find your address easily</Text>
        </View>
        <View>
          <TouchableOpacity
            onPress={() => setEditing(true)}
            style={styles.editBtn}
          >
            <Feather name="edit" size={20} color="#000" />
          </TouchableOpacity>
        </View>
      </View>
      {editing ? (
        <View>
          <Text style={styles.label1}>Mobile no.:</Text>
          <TextInput
            style={styles.input}
            value={tempmobile}
            placeholderTextColor="#f2f2f2"
            placeholder="Optional Floor or Apt No or tell us how we can find your address easily"
            onChangeText={setTempmobile}
            multiline
          />
          <Text style={styles.label1}>Delivery Instructions :</Text>
          <TextInput
            style={styles.input}
            placeholder=""
            value={tempemail}
            onChangeText={setTempemail}
            multiline
          />
          <View style={{
            flexDirection: 'row', justifyContent: 'space-between',
            width: 133
          }}>
            <TouchableOpacity style={styles.saveBtn} onPress={handleSave}>
              <Text style={styles.saveText}>Save</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.saveBtn} onPress={handleClose}>
              <Text style={styles.saveText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      ) : (
        mobile ? (
          <View style={styles.row}>
            <View style={{ width: '90%', borderWidth: 0, borderColor: '#000' }}>
              <Text style={styles.mobile}>{mobile}</Text>
              <Text style={styles.mobile}>{email}</Text>
            </View>
          </View>
        ) : null
      )}
    </View>
  );
};

export default FoodDeliveryAddress;

const styles = StyleSheet.create({
  container: {
    backgroundColor: "#FFF",
 //   padding: isTablet ? 20 : 14,
  //  marginHorizontal: isTablet ? 30 : 5,
    marginVertical: 3,
    borderRadius: 10,
  //  elevation: 1,
  //  shadowColor: "#000",
  //  shadowOpacity: 0.08,
  //  shadowRadius: 6, 
  marginTop: 9
  },
  editBtn: {
    marginLeft: 10,
    backgroundColor: "#FCE4EC",
    padding: 10,
    borderRadius: 30,
  },
  label: {
    fontSize: isTablet ? 16 : 12,
    fontWeight: "700",
    color: "#333",
    marginBottom: 4,
  },
  labeloptional: {
    fontSize: 12
  },
  label1: {
    fontWeight: "400",
    fontSize: isTablet ? 16 : 12,
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
    marginRight: 10, fontSize: 12
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
