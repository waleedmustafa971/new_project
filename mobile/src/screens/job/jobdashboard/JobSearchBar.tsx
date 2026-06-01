import React from "react";
import {
  View,
  TouchableOpacity,
  Text,
  StyleSheet,
  Dimensions,
} from "react-native";
import Icon from "react-native-vector-icons/Feather";

const { width } = Dimensions.get("window");
const isTablet = width > 768;

const JobSearchBar = ({ onOpenModal }) => {
  return (
    <View style={styles.container}>
      <TouchableOpacity style={styles.searchWrapper} onPress={onOpenModal}>
        
        {/* Fake Text Input */}
        <Text style={styles.placeholderText}>
          Search skills, company or title
        </Text>

        {/* Search Icon */}
        <View style={styles.button}>
          <Icon name="search" size={20} color="#000" />
        </View>

      </TouchableOpacity>
    </View>
  );
};

export default JobSearchBar;

const styles = StyleSheet.create({
  container: {
    width: "100%",
    alignItems: "center",
    marginTop: 1,
    marginBottom: 15,
  },
  searchWrapper: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    borderRadius: 30,
    paddingHorizontal: 10,
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
    width: isTablet ? "80%" : "90%",
    paddingVertical: isTablet ? 5 : 2,
  },
  placeholderText: {
    flex: 1,
    color: "#999",
    fontSize: isTablet ? 18 : 15,
  },
  button: {
    paddingHorizontal: 18,
    paddingVertical: 8,
  },
});
