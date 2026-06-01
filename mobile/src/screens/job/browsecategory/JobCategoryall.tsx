import React from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
} from "react-native";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import Ionicons from "react-native-vector-icons/Ionicons";

type RootStackParamList = {
  JobCategoryall: { data: JobCategory[] };
  JobCategoryScreen: { slug: string };
};

type Props = NativeStackScreenProps<RootStackParamList, "JobCategoryall">;

interface JobCategory {
  _id: string;
  title: string;
  slug: string;
  parentId: string | null;
  createdAt: string;
  updatedAt: string;
  __v: number;
  subcategories: any[];
}

const JobCategoryall: React.FC<Props> = ({ route, navigation }) => {
  const { data } = route.params;

  const renderItem = ({ item }: { item: JobCategory }) => (
    <TouchableOpacity
      style={styles.itemContainer}
      onPress={() => navigation.navigate("JobCategoryScreen", { slug: item.slug })}>
      <Text style={styles.itemText}>{item.title}</Text>
      <Text style={styles.itemArrow}></Text>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <View style={{
        padding: 8, flexDirection: 'row',
        justifyContent: 'space-between', marginBottom: 10,
        
      }}>
        <TouchableOpacity
          style={{ flexDirection: "row", alignItems: "center" }}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="chevron-back" size={18} color="#40189D" />
          <Text style={{ fontSize: 14, marginLeft: 4, color: "#40189D" }}>Back</Text>
        </TouchableOpacity>
      </View>
      <FlatList
        data={data}
        keyExtractor={(item) => item._id}
        renderItem={renderItem}
        ItemSeparatorComponent={() => <View style={{ height: 1, backgroundColor: "#ccc" }} />}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F3F4F6"
  },
  itemContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    backgroundColor: "#fff", width: '100%',
    padding: 8
  },
  itemText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#111827",
    flexShrink: 1, // ensures long text wraps properly
  },
  itemArrow: {
    fontSize: 16,
    color: "#6B7280",
  },
});

export default JobCategoryall;
