import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  ScrollView,
  Alert,
  Dimensions,
} from "react-native";
import Ionicons from "react-native-vector-icons/Ionicons";
import { useNavigation, useRoute, RouteProp } from "@react-navigation/native";

// ====================== TYPES ======================
interface Job {
  _id: string;
  companyname: string;
  hidecompany: string;
  companyaddress: string;
  jobtitle: string;
  employementtype: string;
  minimumworkingexperience: string;
  minimumeducationlevel: string;
  monthlysalary: string[];
  createdAt: string;
  jobdescription: string;
}

type RootStackParamList = {
  JobDetails: { _id: string };
};

type JobDetailsRouteProp = RouteProp<RootStackParamList, "JobDetails">;

// ====================== HELPER FUNCTION ======================
const getTimeAgo = (createdAt: string): string => {
  const diffMs = new Date().getTime() - new Date(createdAt).getTime();
  const diffHrs = diffMs / (1000 * 60 * 60);
  if (diffHrs < 1) return "Just now";
  if (diffHrs < 24) return `${Math.floor(diffHrs)} hrs ago`;
  const diffDays = Math.floor(diffHrs / 24);
  return `${diffDays} day${diffDays > 1 ? "s" : ""} ago`;
};

// ====================== COMPONENT ======================
const JobDetails: React.FC = () => {
  const navigation = useNavigation();
  const route = useRoute<JobDetailsRouteProp>();
  const { _id } = route.params;

  const [job, setJob] = useState<Job | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    const fetchJob = async () => {
      try {
        const res = await fetch(
          `https://api.dokandarapps.com/apis/job/getjoblist?page=1&limit=100&_id=${_id}`
        );
        const data = await res.json();
        if (data?.users?.length) {
          setJob(data.users[0]);
        }
      } catch (error) {
        console.error("Error fetching job:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchJob();
  }, [_id]);

  const handleApply = async () => {
    try {
      const response = await fetch("https://api.dokandarapps.com/apis/job/apply", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jobId: _id, userId: "USER_ID_HERE" }),
      });
      const result = await response.json();
      Alert.alert("Success", result.message || "Applied successfully!");
    } catch (error) {
      Alert.alert("Error", "Failed to apply for job");
    }
  };

  if (loading) {
    return (
      <View style={styles.loaderContainer}>
        <ActivityIndicator size="large" color="#4F46E5" />
      </View>
    );
  }

  if (!job) {
    return (
      <View style={styles.container}>
        <Text style={styles.text}>No job found.</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* ===== HEADER ===== */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back-outline" size={22} color="#000" />
        </TouchableOpacity>

        <Text style={styles.headerTitle}>Job Details</Text>

        <View style={styles.rightIcons}>
          <TouchableOpacity style={styles.iconButton}>
            <Ionicons name="heart-outline" size={22} color="#000" />
          </TouchableOpacity>
          <TouchableOpacity style={styles.iconButton}>
            <Ionicons name="share-social-outline" size={22} color="#000" />
          </TouchableOpacity>
        </View>
      </View>

      {/* ===== SCROLL CONTENT ===== */}
      <ScrollView
        style={styles.content}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 100 }} // so content doesn’t hide under button
      >
        {/* Job Title */}
        <Text style={styles.jobTitle}>{job.jobtitle}</Text>

        {/* Company Name */}
        {job.hidecompany === "No" && (
          <Text style={styles.companyName}>{job.companyname}</Text>
        )}

        {/* Salary + Location */}
        <View style={styles.row}>
          <View style={styles.col}>
            <Ionicons name="cash-outline" size={18} color="#666" />
            <Text style={styles.colText}>
              {job.monthlysalary?.[0] || "N/A"}
            </Text>
          </View>
          <View style={styles.col}>
            <Ionicons name="location-outline" size={18} color="#666" />
            <Text style={styles.colText}>{job.companyaddress}</Text>
          </View>
        </View>

        {/* Employment + Experience + Education */}
        <View style={styles.row}>
          <View style={styles.col}>
            <Ionicons name="briefcase-outline" size={18} color="#666" />
            <Text style={styles.colText}>{job.employementtype}</Text>
          </View>
          <View style={styles.col}>
            <Ionicons name="time-outline" size={18} color="#666" />
            <Text style={styles.colText}>{job.minimumworkingexperience}</Text>
          </View>
        </View>
        <View style={styles.row}>
          <View style={styles.col}>
            <Ionicons name="school-outline" size={18} color="#666" />
            <Text style={styles.colText}>{job.minimumeducationlevel}</Text>
          </View>
        </View>

        {/* Applications Info */}
        <View style={styles.appInfo}>
          <Text style={styles.appCount}>26 Applications</Text>
          <Text style={styles.postedTime}>{getTimeAgo(job.createdAt)}</Text>
        </View>

        {/* Job Details Section */}
        <Text style={styles.sectionTitle}>Job Details</Text>
        <Text style={styles.description}>{job.jobdescription}</Text>
      </ScrollView>

      {/* ===== FIXED APPLY BUTTON ===== */}
      <View style={styles.fixedButtonContainer}>
        <TouchableOpacity style={styles.applyButton} onPress={handleApply}>
          <Ionicons name="send-outline" size={18} color="#fff" />
          <Text style={styles.applyButtonText}>Apply Now</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

export default JobDetails;

// ====================== STYLES ======================
const { width } = Dimensions.get("window");

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F9FAFB",
  },
  header: {
    backgroundColor: "#fff",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 12,
    paddingVertical: 12,
    elevation: 4,
  },
  backButton: {
    flexDirection: "row",
    alignItems: "center",
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#000",
  },
  rightIcons: {
    flexDirection: "row",
    alignItems: "center",
  },
  iconButton: {
    marginLeft: 12,
  },
  loaderContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  content: {
    padding: 16,
  },
  jobTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#111827",
    marginBottom: 4,
  },
  companyName: {
    fontSize: 15,
    color: "#4B5563",
    marginBottom: 10,
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  col: {
    flexDirection: "row",
    alignItems: "center",
    width: "48%",
  },
  colText: {
    fontSize: 14,
    color: "#374151",
    marginLeft: 6,
    flexShrink: 1,
  },
  appInfo: {
    flexDirection: "row",
    justifyContent: "space-between",
    width: "100%",
    marginTop: 16,
  },
  appCount: {
    fontSize: 13,
    color: "#6B7280",
  },
  postedTime: {
    fontSize: 13,
    color: "#6B7280",
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#111827",
    marginVertical: 10,
  },
  description: {
    fontSize: 14,
    color: "#374151",
    lineHeight: 20,
  },
  text: {
    fontSize: 14,
    color: "#000",
  },
  fixedButtonContainer: {
    position: "absolute",
    bottom: 0,
    width: width,
    backgroundColor: "#fff",
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: "#E5E7EB",
    alignItems: "center",
    justifyContent: "center",
  },
  applyButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#4F46E5",
    paddingVertical: 12,
    paddingHorizontal: 50,
    borderRadius: 8,
  },
  applyButtonText: {
    color: "#fff",
    fontWeight: "600",
    fontSize: 15,
    marginLeft: 8,
  },
});
