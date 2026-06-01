import React, { useEffect, useState, useCallback } from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Dimensions, TextInput
} from "react-native";
import axios from "axios";
import { useRoute, useNavigation } from "@react-navigation/native";
import Ionicons from "react-native-vector-icons/Ionicons";
import * as base from '../../../component/global'
import { NativeStackScreenProps } from "@react-navigation/native-stack";
const { width } = Dimensions.get("window");
const isTablet = width > 768;
import Icon from "react-native-vector-icons/Feather";


interface JobPopular {
  _id: string;
  companyname: string;
  companycity: string;
  industrytype: string;
  jobtitle: string;
  monthlysalary: string[] | string;
}
type RootStackParamList = {
  JobDetails: { _id: string };
  JobCategoryScreen: { slug: string };
};

interface RouteParams {
  slug: string;
  educationtype: string;
  jobtype: string;
}
type Props = NativeStackScreenProps<RootStackParamList, "JobCategoryScreen">;

const JobCategoryScreen: React.FC<Props> = ({ route, navigation }) => {

  const { slug, educationtype, jobtype } = route.params;
  const [jobs, setJobs] = useState<JobPopular[]>([]);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);

  const screenWidth = Dimensions.get("window").width;
  const itemWidth = screenWidth;

  const fetchJobs = useCallback(async () => {
    if (loading || !hasMore) return;

    setLoading(true);

    try {
      let url = `${base.BASE_URL}/apis/job/getjoblist?page=${page}&limit=10`;

      // Apply filters ONLY if value exists
      if (slug) {
        url += `&category=${slug}`;
      }
      if (educationtype) {
        url += `&minimumeducationlevel=${educationtype}`;
      }
      if (jobtype) {
        url += `&employementtype=${jobtype}`;
      }

      const res = await axios.get(url);

      const newJobs = res.data?.users || [];

      setJobs((prev) => [...prev, ...newJobs]);
      setHasMore(page < (res.data?.totalPages || 1));

    } catch (error) {
      console.error("Error fetching jobs:", error);
    } finally {
      setLoading(false);
    }
  }, [page, slug, educationtype, jobtype, loading, hasMore]);

  useEffect(() => {
    setJobs([]); // clear when category changes
    setPage(1);
    setHasMore(true);
  }, [slug]);

  useEffect(() => {
    fetchJobs();
  }, [page, fetchJobs]);

  const loadMore = () => {
    if (!loading && hasMore) {
      setPage((prev) => prev + 1);
    }
  };

  const renderCard = ({ item }: { item: JobPopular }) => (
    <TouchableOpacity
      style={[styles.card, { width: itemWidth }]}
      activeOpacity={0.85}
      onPress={() => navigation.navigate("JobDetails", { _id: item._id })}
    >
      <View style={styles.cardHeader}>
        <Text style={styles.title} numberOfLines={1}>
          {item.jobtitle}
        </Text>
      </View>

      <Text style={styles.company} numberOfLines={1}>
        {item.companyname}
      </Text>

      <Text style={styles.info} numberOfLines={1}>
        📍 {item.companycity} | 💼 {item.industrytype}
      </Text>

      <Text style={styles.salary} numberOfLines={1}>
        💰{" "}
        {Array.isArray(item.monthlysalary)
          ? item.monthlysalary.join(", ")
          : item.monthlysalary}
      </Text>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <View style={styles.headerContainer}>
        <View style={styles.searchContainer}>
          <TouchableOpacity
            style={{ flexDirection: "row", alignItems: "center" }}
            onPress={() => navigation.goBack()}>
            <Ionicons name="chevron-back" size={18} color="#40189D" />
            <Text style={{ fontSize: 14, marginLeft: 4, color: "#40189D" }}>Back</Text>
          </TouchableOpacity>
        </View>
        <View style={styles.textcontainer}>
          <View style={styles.searchWrapper}>
            <TextInput
              style={styles.input}
              placeholder="Search skills, company or title"
              placeholderTextColor="#999"
            />
            <TouchableOpacity style={styles.button}>
              <Icon name="search" size={16} color="#000" />
            </TouchableOpacity>
          </View>
        </View>
        {/* Filter Icon */}
        <TouchableOpacity style={styles.iconButton}>
          <Ionicons name="options-outline" size={24} color="#000" />
        </TouchableOpacity>
      </View>
      <View style={{ borderWidth: 0, borderColor: 'red', flex: 1, width: '100%' }}>
        <FlatList
          data={jobs}
          keyExtractor={(item) => item._id}
          renderItem={renderCard}
          contentContainerStyle={{ paddingBottom: 20 }}
          onEndReached={loadMore}
          onEndReachedThreshold={0.5}
          ListFooterComponent={
            loading ? (
              <ActivityIndicator size="large" color="#40189D" style={{ margin: 16 }} />
            ) : !hasMore ? (
              <Text style={styles.endText}>No more jobs available</Text>
            ) : null
          }
        />

      </View>
    </View>
  );
};

export default JobCategoryScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F3F4F6",
    alignItems: "center",
  },

  /** 🧭 Header Section **/
  headerContainer: {
    width: "100%",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: "#fff",
    borderBottomWidth: 0.6,
    borderBottomColor: "#e5e7eb",
    elevation: 3,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 2,
    shadowOffset: { width: 0, height: 2 },
  },

  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
  },

  textcontainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },

  searchWrapper: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    borderRadius: 25,
    paddingHorizontal: 12,
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
    width: isTablet ? "80%" : "90%",
  },

  input: {
    flex: 1,
    paddingVertical: isTablet ? 14 : 10,
    paddingHorizontal: 10,
    fontSize: isTablet ? 17 : 14,
    color: "#333",
  },

  button: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 8,
    paddingHorizontal: 2,
    borderRadius: 20,
    marginLeft: 4,
  },

  buttonText: {
    color: "#000",
    fontSize: isTablet ? 16 : 14,
    fontWeight: "600",
    marginLeft: 6,
  },

  iconButton: {
    marginLeft: 8,
    padding: 8,
    borderRadius: 8,
  },

  /** 🧾 Page Header Text **/
  header: {
    fontSize: 18,
    fontWeight: "700",
    color: "#111827",
    marginVertical: 10,
    textTransform: "capitalize",
    alignSelf: "flex-start",
    paddingHorizontal: 16,
  },

  /** 📄 Job Card **/
  card: {
    backgroundColor: "#fff",
    borderRadius: 12,
    alignSelf: "center", marginBottom: 2,
    width: '100%', padding: 10, marginTop: 2
  },

  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },

  title: {
    fontSize: 14,
    fontWeight: "700",
    color: "#111827",
    flexShrink: 1,
  },

  company: {
    fontSize: 13,
    color: "#6B7280",
    marginTop: 4,
  },

  info: {
    fontSize: 12,
    color: "#4B5563",
    marginTop: 2,
  },

  salary: {
    fontSize: 13,
    color: "#2563EB",
    marginTop: 4,
    fontWeight: "600",
  },

  endText: {
    textAlign: "center",
    color: "#9CA3AF",
    paddingVertical: 12,
  },
});
