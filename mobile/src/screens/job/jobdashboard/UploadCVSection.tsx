import { useNavigation } from "@react-navigation/native";
import React from "react";
import { View, Text, TouchableOpacity } from "react-native";
import MaterialIcons from "react-native-vector-icons/MaterialIcons";

const UploadCVSection = () => {

  const navigation = useNavigation()

  const handleUploadCV = () => {
    console.log("Upload CV pressed");
    navigation.navigate("CVDesign")
    // TODO: Add your upload logic here
  };

  return (
    <View style={{ marginBottom: 0 }}>
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          backgroundColor: "#f7f8fa",
          padding: 16,
          borderRadius: 16,
          shadowColor: "#000",
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.1,
          shadowRadius: 2,
          elevation: 1,
        }}
      >
        {/* Left Icon */}
        <View
          style={{
            backgroundColor: "#e3f2fd",
            padding: 10,
            borderRadius: 50,
            marginRight: 12,
          }}
        >
          <MaterialIcons name="upload-file" size={24} color="#1976d2" />
        </View>

        {/* Text Section */}
        <View style={{ flex: 1 }}>
          <Text
            style={{
              fontSize: 13,
              fontWeight: "600",
              color: "#333",
            }}
          >
            Upload your CV
          </Text>
          <Text
            style={{
              fontSize: 11,
              color: "#666",
              marginTop: 2,
            }}
          >
            Boost your chances of getting hired faster!
          </Text>
        </View>

        {/* Upload Button */}
        <TouchableOpacity
          onPress={handleUploadCV}
          style={{
            backgroundColor: "#000",
            paddingVertical: 8,
            paddingHorizontal: 14,
            borderRadius: 10,
          }}
        >
          <Text
            style={{
              color: "#fff",
              fontSize: 12,
              fontWeight: "600",
            }}
          >
            Upload
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

export default UploadCVSection;
