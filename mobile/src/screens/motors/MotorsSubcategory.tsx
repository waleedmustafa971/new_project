import React, { useEffect, useState, useCallback } from "react";
import {
  View, Text, TouchableOpacity, StyleSheet, TextInput, SafeAreaView,
  FlatList, Image, Modal, ActivityIndicator
} from "react-native";
import Ionicons from "react-native-vector-icons/Ionicons";
import * as base from "../../component/global";
import ShimmerPlaceholder from "react-native-shimmer-placeholder";
import LinearGradient from "react-native-linear-gradient";
import {
  useNavigation,
  useRoute,
  RouteProp,
} from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import api from "../../component/api";
import SearchModal from "./search/SearchModal";
import SubCategoryList from "./SubCategoryList";
import FilterModalDashboard from "./Modal/FilterModalDashboard";

interface PropertyQueryParams {
  page: number;
  limit: number;
  add_post: string;
  Category?: string;
  subCategory?: string;
  makemodel?: string;
  regional_specs?: string | number;
  fueltype?: string;
  minPrice?: string;
  maxPrice?: string;
  transmissiontypes?: string;
  yearFrom?: string;
  yearTo?: string;
  city?: string;
}

const PAGE_LIMIT = 10;

type PropertyItem = {
  _id: string;
  id: string;
  shortTitle: string;
  location: string;
  price: number;
  images: { image: string }[];
};

type RootStackParamList = {
  MotorsSubcategory: {
    category?: string;
    subcategories?: any[];
    makemodel?: string;
    regional_specs?: string;
    transmissiontypes?: string;
    fueltype?: string;
    usage?: string;
    minPrice?: string;
    maxPrice?: string;
    yearTo?: string;
    yearFrom?: string;
    city?: string;
    subCategory?: string;
  };
  MotorsDetails: { item: PropertyItem };
  ViewAgent: { propertyid: string };
};

// 🧭 STEP 2: Define navigation and route prop types
type ClassifiedDetailsNavigationProp = NativeStackNavigationProp<
  RootStackParamList,
  'MotorsSubcategory'
>;

type ClassifiedDetailsRouteProp = RouteProp<
  RootStackParamList,
  'MotorsSubcategory'
>;


const MotorsSubcategory: React.FC = () => {
  const [text, setText] = useState('');
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [totalPages, setTotalPages] = useState(1);
  const [isGrid, setIsGrid] = useState(true);
  const [propertyList, setPropertyList] = useState<PropertyItem[]>([]); //setsubcategoriesList
  const [subcategoriesList, setSubcategoriesList] = useState<PropertyItem[]>([]); //
  const navigation = useNavigation<ClassifiedDetailsNavigationProp>();
  const route = useRoute<ClassifiedDetailsRouteProp>();
  //const Category = route.params?.category;  //category categoryId 
  const Category = route.params?.category;  //category categoryId 
  const subCategory = route.params?.subCategory;  //category categoryId 
  const minPrice = route.params?.minPrice;
  const maxPrice = route.params?.maxPrice;
  const yearFrom = route.params?.yearFrom;
  const yearTo = route.params?.yearTo;
  const makemodel = route.params?.makemodel;
  const regional_specs = route.params?.regional_specs;
  const transmissiontypes = route.params?.transmissiontypes;
  const fueltype = route.params?.fueltype;
  const city = route.params?.city;
  const [selectedSubcategory, setSelectedSubcategory] = useState("")
  const [showsearchmodal, setShowsearchmodal] = useState(false)
  const [modalcity, setModalcity] = useState(false)
  const subcategories = route.params?.subcategories;  //category
  //console.log('subcategories print ..... ' + JSON.stringify(subcategories))

  const fetchPropertyRent = useCallback(
    async (subcategoryId: string = "") => {
      if (loading || page > totalPages) return;
      setLoading(true);
      try {
        const params: PropertyQueryParams = {
          page,
          limit: PAGE_LIMIT,
          add_post: "Motors",
        };
        console.log('...filter .... ', JSON.stringify(params))
        if (Category) params.Category = Category;
        if (subcategoryId) params.subCategory = subcategoryId;
        if (makemodel) params.makemodel = makemodel;
        if (fueltype) params.fueltype = fueltype;
        if (regional_specs) params.regional_specs = regional_specs;
        if (transmissiontypes) params.transmissiontypes = transmissiontypes;
        if (minPrice) params.minPrice = minPrice;
        if (maxPrice) params.maxPrice = maxPrice;
        if (yearFrom) params.yearFrom = yearFrom;
        if (yearTo) params.yearTo = yearTo;
        if (city) params.city = city;
        console.log('...filterxxxxx .... ', JSON.stringify(params))
        console.log(
          "/apis/motors/motorsdetails/live",
          { params }
        )
        const { data } = await api.get(
          "/apis/motors/motorsdetails/live",
          { params }
        );
        console.log('.....users.....', JSON.stringify(data))
        setPropertyList(page === 1 ? data.users : prev => [...prev, ...data.users]);
        setSubcategoriesList(data.subcategories || []);
        setTotalPages(data.totalPages || 1);
      } catch (error) {
        console.error("Error fetching properties:", error);
      } finally {
        setLoading(false);
      }
    },
    [
      page,
      loading,
      totalPages,
      Category,
      makemodel,
      fueltype,
      regional_specs,
      transmissiontypes,
      minPrice,
      maxPrice,
      yearFrom,
      yearTo,
      city,
    ]
  );

  useEffect(() => {
    fetchPropertyRent();
  }, [page, selectedSubcategory]);

  // Infinite scroll
  const handleLoadMore = () => {
    if (!loading && page < totalPages) {
      setPage((prev) => prev + 1);
    }
  };
  const ShimmerCard = ({ isGrid }: { isGrid: boolean }) => {
    return (
      <View
        style={[
          styles.card,
          isGrid ? styles.gridCard : styles.listCard,
          { backgroundColor: "#f0f0f0" },
        ]}
      >
        <ShimmerPlaceholder
          LinearGradient={LinearGradient}
          style={isGrid ? styles.gridImage : styles.listImage}
        />
        <View style={styles.productDetails}>
          <ShimmerPlaceholder LinearGradient={LinearGradient} style={{ width: "70%", height: 14, borderRadius: 5, marginBottom: 6 }} />
          <ShimmerPlaceholder LinearGradient={LinearGradient} style={{ width: "40%", height: 12, borderRadius: 5, marginBottom: 4 }} />
          <ShimmerPlaceholder LinearGradient={LinearGradient} style={{ width: "60%", height: 12, borderRadius: 5 }} />
        </View>
      </View>
    );
  };


  const renderItem = ({ item, index }: { item: PropertyItem, index: number }) => (
    <TouchableOpacity
      style={[styles.card, isGrid ? styles.gridCard : styles.listCard]}
      onPress={() => {
        navigation.navigate("MotorsDetails", { item: item })
      }
      }
      key={`${item._id}_${index}`} // combine _id and index as string
    >
      <Image
        source={{ uri: base.BASE_URL + item.images[0]?.image }}
        style={isGrid ? styles.gridImage : styles.listImage}
      />

      <View style={styles.productDetails}>
        <Text style={styles.productTitle} numberOfLines={1}>
          {item.shortTitle}
        </Text>
        <Text style={styles.productPrice}>
          {new Intl.NumberFormat("en-IN", {
            style: "currency",
            currency: "AED",
            maximumFractionDigits: 0,
          }).format(Number(item.price))}
        </Text>
        <Text style={styles.productLocation} numberOfLines={1}>
          {item.location}
        </Text>
      </View>
    </TouchableOpacity>
  );
  const handleValue = (subcategory: any) => {
    setPropertyList([]); // reset list
    setSelectedSubcategory(subcategory._id); // store selected

    console.log("Selected subcategory ID:", subcategory._id);

    fetchPropertyRent(subcategory._id); // ✅ pass directly
  };


  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View
        style={{
          height: 50,
          backgroundColor: "#F2F0F0",
          borderBottomLeftRadius: 30,
          borderBottomRightRadius: 30,
        }}
      >
        <View style={styles.headerContainer}>
          {/* Back */}
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Ionicons
              name="chevron-back"
              size={25}
              color="#888"
              style={{ marginLeft: 5, marginRight: 5 }}
            />
          </TouchableOpacity>

          {/* Search */}
          <View style={styles.searchContainer}>
            <Ionicons name="search" size={20} color="#888" />
            <TouchableOpacity
              style={styles.searchInput}
              onPress={() => setShowsearchmodal(true)}
            ><Text style={{ padding: 9 }}>Search</Text>
            </TouchableOpacity>
            {/*  <TextInput
                            style={styles.searchInput}
                            placeholder="Search"
                            placeholderTextColor="#888"
                            
                        /> */}
          </View>

          {/* Filter */}
          <TouchableOpacity style={styles.iconButton} onPress={() => { setModalcity(true) }}>
            <Ionicons name="options-outline" size={24} color="#000" />
          </TouchableOpacity>
        </View>
      </View>
      {/* Horizantal Scroll left to right subcategories */}
      <SubCategoryList subcategories={subCategory} onChangevalue={handleValue} />

      {/* Title and View Toggle */}
      <View style={styles.toggleRow}>
        <View style={{ width: '83%' }}>{selectedSubcategory}</View>

        <View style={styles.toggleIcons}>
          <TouchableOpacity
            onPress={() => setIsGrid(false)}
            style={[styles.toggleButton, !isGrid && styles.activeToggle]}
          >
            <Ionicons
              name="list-outline"
              size={22}
              color={!isGrid ? "#007AFF" : "#999"}
            />
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => setIsGrid(true)}
            style={[styles.toggleButton, isGrid && styles.activeToggle]}
          >
            <Ionicons
              name="grid-outline"
              size={22}
              color={isGrid ? "#007AFF" : "#999"}
            />
          </TouchableOpacity>
        </View>
      </View>

      {/* Product List */}
      {propertyList.length === 0 && loading ? (
        <View style={{ flexDirection: "row", flexWrap: "wrap", justifyContent: "center" }}>
          {[...Array(6)].map((_, index) => (
            <ShimmerCard key={index} isGrid={isGrid} />
          ))}
        </View>
      ) : (
        <FlatList
          data={propertyList}
          key={isGrid ? "grid" : "list"}
          keyExtractor={(item) => item._id}
          renderItem={renderItem}
          numColumns={isGrid ? 2 : 1}
          contentContainerStyle={{ padding: 8 }}
          onEndReached={handleLoadMore}
          onEndReachedThreshold={0.5}
          ListFooterComponent={
            loading ? (
              <View style={{ flexDirection: isGrid ? "row" : "column", flexWrap: "wrap", justifyContent: "center" }}>
                {[...Array(isGrid ? 4 : 2)].map((_, index) => (
                  <ShimmerCard key={index} isGrid={isGrid} />
                ))}
              </View>
            ) : null
          }
        />
      )}

      <Modal
        visible={showsearchmodal}
        animationType="slide"
        onRequestClose={() => setShowsearchmodal(false)}
      >
        <SearchModal
          query={text}
          onClose={() => {
            setShowsearchmodal(false);
            setText('');
          }}
        />
      </Modal>

      {
        modalcity && (
          <>
            <Modal
              transparent
              animationType="fade"
              visible={modalcity}
              onRequestClose={() => setModalcity(false)}
            >
              <FilterModalDashboard onClose={() => setModalcity(false)} cities="" />
            </Modal>
          </>
        )
      }


    </SafeAreaView>
  );
};

export default MotorsSubcategory;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
  },
  headerContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f2f2f2",
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  searchContainer: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    borderRadius: 8,
    marginRight: 10,
    height: 40,
    paddingHorizontal: 5,
  },
  searchInput: {
    flex: 1,
    height: "100%",
    paddingHorizontal: 5,
    color: "#000",
  },
  iconButton: {
    padding: 6,
    borderRadius: 8,
  },
  toggleRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f9f9f9",
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  categoryTitle: {
    flex: 1,
    fontSize: 15,
    fontWeight: "600",
    color: "#000",
  },
  toggleIcons: {
    width: 100,
    flexDirection: "row",
    justifyContent: "flex-end",
  },
  toggleButton: {
    marginHorizontal: 5,
    backgroundColor: "#fff",
    borderRadius: 8,
    padding: 5,
    elevation: 2,
  },
  activeToggle: {
    borderWidth: 1,
    borderColor: "#007AFF",
  },
  card: {
    backgroundColor: "#fff",
    borderRadius: 10,
    margin: 6,
    overflow: "hidden",
    borderColor: "#eee",
    borderWidth: 1,
  },
  gridCard: {
    flex: 0.5,
  },
  listCard: {
    flex: 1,
    flexDirection: "row",
  },
  gridImage: {
    width: "100%",
    height: 140,
    borderTopLeftRadius: 10,
    borderTopRightRadius: 10,
  },
  listImage: {
    width: 120,
    height: 120,
    borderTopLeftRadius: 10,
    borderBottomLeftRadius: 10,
  },
  productDetails: {
    padding: 10,
    flex: 1,
    justifyContent: "space-between",
  },
  productTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: "#000",
  },
  productPrice: {
    fontSize: 13,
    color: "#007AFF",
    marginTop: 4,
  },
  productLocation: {
    fontSize: 12,
    color: "#555",
    marginTop: 2,
  },
});
