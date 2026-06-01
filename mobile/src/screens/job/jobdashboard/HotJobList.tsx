import React, { useMemo } from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import Ionicons from "react-native-vector-icons/Ionicons";

type RootStackParamList = {
  JobCategoryScreen: { slug: string };
  JobDetails: { _id: string };
};

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

interface JobPopular {
  _id: string;
  jobtitle: string;
  companyname: string;
  companycity: string;
  industrytype: string;
  monthlysalary: string;
}

interface HotJobListProps {
  jobpopularlist: JobPopular[];
  setJobpopularlist: React.Dispatch<React.SetStateAction<JobPopular[]>>;
}

const HotJobList: React.FC<HotJobListProps> = ({ jobpopularlist }) => {
  const navigation = useNavigation<NavigationProp>();

  const screenWidth = Dimensions.get("window").width;
  const itemWidth = screenWidth * 0.7; // allow partial next-card view
  const numRows = 2;

  // Divide jobs into 2 rows
  const rowData = useMemo(() => {
    const rows: JobPopular[][] = Array.from({ length: numRows }, () => []);
    jobpopularlist.forEach((item, i) => {
      rows[i % numRows].push(item);
    });
    return rows;
  }, [jobpopularlist]);

  const renderCard = ({ item }: { item: JobPopular }) => (
    <TouchableOpacity
      style={[styles.card, { width: itemWidth }]}
      activeOpacity={0.8}
      onPress={() => navigation.navigate("JobDetails", { _id: item._id })}
    >
      <View style={styles.cardHeader}>
        <Text style={styles.title} numberOfLines={1}>
          {item.jobtitle}
        </Text>
        <Ionicons name="chevron-forward-outline" size={16} color="#555" />
      </View>
      <Text style={styles.company} numberOfLines={1}>
        {item.companyname}
      </Text>
      <Text style={styles.info}>
        📍 {item.companycity} | 💼 {item.industrytype}
      </Text>
      <Text style={styles.salary}>💰 {item.monthlysalary}</Text>
    </TouchableOpacity>
  );

  const renderRow = ({ item }: { item: JobPopular[] }) => (
    <FlatList
      data={item}
      horizontal
      showsHorizontalScrollIndicator={false}
      renderItem={renderCard}
      keyExtractor={(job) => job._id}
      ItemSeparatorComponent={() => <View style={{ width: 12 }} />}
      contentContainerStyle={{ paddingHorizontal: 10 }}
    />
  );

  return (
    <View style={styles.section}>
      <Text style={styles.header}>🔥 Popular Jobs</Text>
      <Text style={styles.subHeader}>
        Explore trending job openings from top companies
      </Text>

      {jobpopularlist.length > 0 ? (
        <FlatList
          data={rowData}
          renderItem={renderRow}
          keyExtractor={(_, i) => `row-${i}`}
          scrollEnabled={false}
          ItemSeparatorComponent={() => <View style={{ height: 14 }} />}
        />
      ) : (
        <Text style={styles.emptyText}>No popular jobs found</Text>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  section: {
    flex: 1,
    backgroundColor: "#F3F4F6",
    paddingVertical: 16,
  },
  header: {
    fontSize: 18,
    fontWeight: "bold",
    textAlign: "center",
    color: "#111827",
  },
  subHeader: {
    textAlign: "center",
    fontSize: 12,
    color: "#6B7280",
    marginBottom: 16,
    marginTop: 4,
  },
  card: {
    backgroundColor: "#ffffff",
    borderRadius: 12,
    padding: 12

  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  title: {
    fontSize: 13,
    fontWeight: "700",
    color: "#1F2937",
    flexShrink: 1,
  },
  company: {
    fontSize: 12,
    fontWeight: "600",
    color: "#3B82F6",
    marginTop: 4,
  },
  info: {
    fontSize: 11,
    color: "#6B7280",
    marginTop: 4,
  },
  salary: {
    fontSize: 12,
    fontWeight: "600",
    color: "#059669",
    marginTop: 6,
  },
  emptyText: {
    textAlign: "center",
    color: "#9CA3AF",
    fontSize: 12,
    marginTop: 20,
  },
});

export default HotJobList;
