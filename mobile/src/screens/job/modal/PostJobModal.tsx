import React from "react";
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  GestureResponderEvent,
} from "react-native";
import { useNavigation, NavigationProp } from "@react-navigation/native";
import MaterialCommunityIcons from "react-native-vector-icons/MaterialCommunityIcons";

type RootStackParamList = {
  JobDashboard: undefined;
  JobHireDashboard: undefined;
};

interface ModalJobPopupProps {
  visible: boolean;
  setVisible: (val: boolean) => void;
}

const PostJobModal: React.FC<ModalJobPopupProps> = ({
  visible,
  setVisible, setJobType 
}) => {
  const navigation = useNavigation<NavigationProp<RootStackParamList>>();

  const closeModal = () => setVisible(false);

  return (
    <Modal
      transparent
      visible={visible}
      animationType="slide"
      onRequestClose={closeModal}
    >
      {/* Background overlay */}
      <TouchableOpacity
        style={styles.backdrop}
        activeOpacity={1}
        onPress={closeModal}
      />

      {/* Bottom Sheet */}
      <View style={styles.modalContainer}>
        {/* Find Job */}
        <TouchableOpacity
          style={styles.row}
         /*  onPress={() => {
            navigation.navigate("CompanyJobpost",{
              "type" : "personal"
            });
            closeModal();
          }} */

        onPress={() => {
        setJobType("personal"); // 👈 send value to parent
        closeModal();
      }}
        >
          <View style={styles.iconBox}>
            <MaterialCommunityIcons
              name="briefcase-outline"
              size={24}
              color="#2563EB"
            />
          </View>
          <View>
          <Text style={styles.title}>Personal</Text>
          <Text style={styles.subtitle}>
            Source candidates for individual services. Eg: Drivers, Tutors, House help etc.
          </Text>
          </View>
        </TouchableOpacity>

        <View style={styles.separator} />

        {/* Hire Talent */}
        <TouchableOpacity
          style={styles.row}
      /*   onPress={() => {
            navigation.navigate("CompanyJobpost",{
              "type" : "company"
            });
            closeModal();
          }} */
           onPress={() => {
        setJobType("company"); // 👈 send value to parent
        closeModal();
      }}
        >
          <View style={styles.iconBox}>
            <MaterialCommunityIcons
              name="account-group-outline"
              size={24}
              color="#10B981"
            />
          </View>
          <View>
          <Text style={styles.title}>Company</Text>
          <Text style={styles.subtitle}>
            Source candidates for corporate jobs. Eg: Engineers, Accountants, Front desk etc.
          </Text>
          </View>
        </TouchableOpacity>
      </View>
    </Modal>
  );
};

export default PostJobModal;

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.45)",
  },

  modalContainer: {
    position: "absolute",
    bottom: 0,
    width: "100%",
    height: "22%",
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    paddingHorizontal: 25,
    paddingVertical: 20,
  },

  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 14,
  },

  iconBox: {
    width: 42,
    height: 42,
    borderRadius: 12,
    backgroundColor: "#F3F4F6",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 14,
  },

  title: {
    fontSize: 17,
    fontWeight: "600",
    color: "#1F2937",
  },

  separator: {
    height: 1,
    backgroundColor: "#E5E7EB",
    marginVertical: 5,
  },
  subtitle: {
    fontSize: 11
  }
});
