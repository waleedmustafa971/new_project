import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
} from "react-native";
import MaterialCommunityIcons from "react-native-vector-icons/MaterialCommunityIcons";
import axios from "axios";
import * as base from "../../../component/global";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";

// ✅ Navigation Types
export type RootStackParamList = {
  JobCategoryScreen: {
    slug: string;
    educationtype: string;
    jobtype: string;
  };
};

type NavigationProp = NativeStackNavigationProp<
  RootStackParamList,
  "JobCategoryScreen"
>;

// API Response Type
interface QualificationItem {
  id: string;
  title: string;
  count: number;
  icon: string;
}

const JobbyQualification = () => {
  const navigation = useNavigation<NavigationProp>();

  const [qualificationData, setQualificationData] = useState<
    QualificationItem[]
  >([]);
  const [loading, setLoading] = useState<boolean>(false);

  // Fetch data from API
  const fetchQualificationData = async () => {
    setLoading(true);
    try {
      const response = await axios.get(
        `${base.BASE_URL}/apis/job/categorybyeducation?page=1&limit=100`
      );

      if (Array.isArray(response.data)) {
        setQualificationData(response.data);
      } else {
        console.warn("Unexpected API format:", response.data);
        setQualificationData([]);
      }
    } catch (error) {
      console.error("Error fetching qualification data:", error);
      setQualificationData([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchQualificationData();
  }, []);

  return (
    <View style={styles.section}>
      <Text style={styles.header}>Jobs By Type</Text>

      {loading ? (
        <ActivityIndicator size="large" color="#3B82F6" />
      ) : (
        <FlatList
          numColumns={2}
          data={qualificationData}
          keyExtractor={(item) => item.id}
          columnWrapperStyle={{ justifyContent: "space-between" }}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={styles.card}
              activeOpacity={0.8}
              onPress={() =>
                navigation.navigate("JobCategoryScreen", {
                  slug: "",
                  educationtype: item.title ?? "",
                  jobtype: ""
                })
              }
            >
              <View style={styles.iconBox}>
                <MaterialCommunityIcons
                  name={item.icon || "briefcase-outline"}
                  size={28}
                  color="#3B82F6"
                />
              </View>

              <Text style={styles.title} numberOfLines={1}>
                {item.title}
              </Text>

              <Text style={styles.count}>{item.count} Jobs</Text>
            </TouchableOpacity>
          )}
          contentContainerStyle={{ paddingBottom: 20 }}
        />
      )}
    </View>
  );
};

export default JobbyQualification;

const styles = StyleSheet.create({
  section: {
    padding: 16,
  },

  header: {
    fontSize: 16,
    fontWeight: "700",
    color: "#111827",
    marginBottom: 12,
  },

  card: {
    width: "48%",
    borderRadius: 14,
    paddingVertical: 18,
    paddingHorizontal: 14,
    marginBottom: 14,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#f2f2f2",
  },

  iconBox: {
    width: 55,
    height: 55,
    borderRadius: 12,
    backgroundColor: "#EFF6FF",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 10,
  },

  title: {
    fontSize: 14,
    fontWeight: "600",
    color: "#1F2937",
    marginBottom: 4,
  },

  count: {
    fontSize: 12,
    color: "#6B7280",
  },
});
