import React, { useState } from "react";
import {
    View,
    Text,
    FlatList,
    Image,
    TextInput,
    TouchableOpacity,
    useWindowDimensions,
    StyleSheet,
    ListRenderItem
} from "react-native";
import Icon from "react-native-vector-icons/Ionicons";
import * as base from '../../../component/global'
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
// Type of each category item
interface CategoryItem {
    id?: string | number;
    name: string;
    image: string;
}
type RootStackParamList = {
  CategoryShowmore: { data: any[] };
  SingleCategoryProduct: { categoryid: string; categoryname: string };
};

// Type of route params
interface CategoryShowmoreProps {
    route: {
        params: {
            data: CategoryItem[];
        };
    };
}

const CategoryShowmore: React.FC<CategoryShowmoreProps> = ({ route }) => {
    const { data } = route.params;
    const { width } = useWindowDimensions();
   // const navigation = useNavigation();
    const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
    const isTablet = width >= 720;
    const numColumns = isTablet ? 3 : 5;

    const ITEMS_PER_PAGE = 10;
    const [page, setPage] = useState(1);

    const paginatedData = data.slice(0, page * ITEMS_PER_PAGE);

    const renderItem: ListRenderItem<CategoryItem> = ({ item }) => (
        <TouchableOpacity style={styles.card} onPress={() => {
      navigation.navigate("SingleCategoryProduct", {
        categoryid: item._id,
        categoryname : item.name
      })
    }}>
            <Image source={{ uri: base.BASE_URL + item.image }} style={styles.cardImg} />
            <Text style={styles.cardText}>{item.name}</Text>
        </TouchableOpacity>
    );

    return (
        <View style={styles.container}>

            {/* 🔍 Header Row */}
            <View style={styles.headerRow}>

                {/* Back Button */}
                <TouchableOpacity style={styles.backBtn} 
                onPress={() => 
                    navigation.goBack()
                }>
                    <Icon name="arrow-back" size={24} color="#000" />
                </TouchableOpacity>

                {/* Search Box */}
                <View style={styles.searchBox}>
                    <Icon name="search" size={18} color="#777" style={{ marginRight: 6 }} />
                    <TextInput
                        placeholder="Search categories..."
                        placeholderTextColor="#999"
                        style={styles.searchInput}
                    />
                </View>
            </View>

            {/* Category Grid */}
            <FlatList
                data={paginatedData}
                numColumns={numColumns}
                key={numColumns}
                renderItem={renderItem}
                showsVerticalScrollIndicator={false}
                keyExtractor={(item, index) => item.id?.toString() || index.toString()}
                onEndReached={() => {
                    if (page * ITEMS_PER_PAGE < data.length) setPage(prev => prev + 1);
                }}
                onEndReachedThreshold={0.5}
                contentContainerStyle={styles.listContent}
            />

        </View>

    );
};

export default CategoryShowmore;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FAFAFA",
    paddingHorizontal: 12,
    paddingTop: 10,
  },

  /* HEADER */
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },

  backBtn: {
    padding: 5,
    marginRight: 8,
  },

  searchBox: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    paddingHorizontal: 10,
    height: 42,
    borderWidth: 1,
    borderColor: "#E6E6E6",
    elevation: 2,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 5,
  },

  searchInput: {
    flex: 1,
    fontSize: 15,
    color: "#222",
  },

  /* LIST CONTENT */
  listContent: {
    paddingBottom: 120,
    paddingTop: 5,
  },

  /* CARD */
  card: {
    flex: 1,
    backgroundColor: "#FFF",
    borderRadius: 12,
    margin: 6,
    overflow: "hidden",
    elevation: 3,
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
  },

  cardImg: {
    width: "100%",
    height: 80,
    resizeMode: "contain",
  },

  cardText: {
    textAlign: "center",
    fontSize: 13,
    fontWeight: "600",
    paddingVertical: 5,
    color: "#333",
  },
});
