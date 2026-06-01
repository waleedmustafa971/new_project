import React, { useState, useMemo } from "react";
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
import LinearGradient from "react-native-linear-gradient";

type RootStackParamList = {
  JobCategoryScreen: { slug: string };
  JobCategoryall: { data: object }
};

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

interface JobCategory {
  _id: string;
  title: string;
  slug: string;
  parentId: string | null;
  createdAt: string;
  updatedAt: string;
  __v: number;
  subcategories: any[];
  jobCount: Number;
  educationtype: string;
  jobtype: string;
}

interface JobCategoriesProps {
  jobcategoriesdata: JobCategory[];
  setJobcategoriesdata: React.Dispatch<React.SetStateAction<JobCategory[]>>;
}

const BrowseCategories: React.FC<JobCategoriesProps> = ({
  jobcategoriesdata,
}) => {
  const navigation = useNavigation<NavigationProp>();
  const [showAll, setShowAll] = useState(false);
  const initialCount = 8;

  const visibleCategories = showAll
    ? jobcategoriesdata
    : jobcategoriesdata.slice(0, initialCount);

  const screenWidth = Dimensions.get("window").width;
  const itemWidth = screenWidth * 0.45; // about 2 items visible per row width
  const numRows = 2;

  // Split data into 2 rows for horizontal scrolling
  const rowData = useMemo(() => {
    const rows: JobCategory[][] = Array.from({ length: numRows }, () => []);
    visibleCategories.forEach((item, i) => {
      rows[i % numRows].push(item);
    });
    return rows;
  }, [visibleCategories]);

  const renderItem = ({ item }: { item: JobCategory }) => (
    <TouchableOpacity
      style={[styles.card, { width: itemWidth }]}
      activeOpacity={0.85}
      onPress={() =>
        navigation.navigate("JobCategoryScreen", 
          { 
            slug: item.slug,
            educationtype: "",
            jobtype:  "" 
          }
        )
      }
    >
      <View style={styles.cardInner}>
        <Text
          style={styles.cardTitle}
          numberOfLines={1}
          ellipsizeMode="tail"
        >
          {item.title} ({item.jobCount})
        </Text>
      </View>
    </TouchableOpacity>
  );

  const renderRow = ({ item }: { item: JobCategory[] }) => (
    <FlatList
      data={item}
      horizontal
      showsHorizontalScrollIndicator={false}
      renderItem={renderItem}
      keyExtractor={(cat) => cat._id}
      ItemSeparatorComponent={() => <View style={{ width: 10 }} />}
      contentContainerStyle={styles.rowList}
    />
  );

  return (
    <View style={styles.section}>
      <View style={styles.headerRow}>
        <Text style={styles.headerTitle}>Categories</Text>
        <TouchableOpacity activeOpacity={0.7} onPress={() => {
          navigation.navigate("JobCategoryall", {
            "data": jobcategoriesdata
          })
        }}>
          <Text style={styles.seeAllText}>See All</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={rowData}
        renderItem={renderRow}
        keyExtractor={(_, i) => `row-${i}`}
        scrollEnabled={false}
        ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
        contentContainerStyle={styles.container}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  section: {
    flex: 1,
    paddingVertical: 12
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginHorizontal: 12,
    marginBottom: 8,
    marginTop: 5,
  },

  headerTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#111827",
  },

  seeAllText: {
    fontSize: 14,
    color: "#3B82F6",
    fontWeight: "600",
  },

  header: {
    fontSize: 16,
    fontWeight: "bold",
    textAlign: "center",
    color: "#111827"
  },
  subHeader: {
    textAlign: "center",
    fontSize: 12,
    color: "#6B7280",
    marginBottom: 16,
    marginTop: 4,
  },
  container: {
    paddingHorizontal: 10,
  },
  rowList: {
    paddingHorizontal: 6,
  },
  button: {
    flexDirection: "row",
    alignSelf: "center",
    alignItems: "center",
    backgroundColor: "#3B82F6",
    paddingHorizontal: 24,
    paddingVertical: 10,
    borderRadius: 24,
    marginTop: 2,
    elevation: 3,
  },
  buttonText: {
    color: "#fff",
    fontWeight: "600",
    fontSize: 10,
    marginLeft: 6,
  },
  buttonContainer: {
    borderRadius: 15,
    backgroundColor: '#ffffff',
    padding: 10,
    overflow: "hidden", // ensures gradient respects border radius
    alignSelf: "center", marginTop: 5
  },
  gradient: {
    paddingVertical: 10,
    paddingHorizontal: 30,
    borderRadius: 25,
    alignItems: "center",
    justifyContent: "center",
  },
  text: {
    color: "#000",
    fontWeight: "bold",
    fontSize: 12,
  },
  card: {
    backgroundColor: "#fff",
    marginTop: 2
  },

  cardInner: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },

  cardTitle: {
    fontSize: 13,
    color: "#1F2937",
    fontWeight: "600",
    flexShrink: 1,
    maxWidth: "95%",
  },

  arrowBox: {
    width: 30,
    height: 30,
    borderRadius: 8,
    backgroundColor: "#F3F4F6",
    justifyContent: "center",
    alignItems: "center",
  },

});

export default BrowseCategories;
