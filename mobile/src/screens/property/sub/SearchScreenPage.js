import {
  View, Text, TouchableOpacity,
  FlatList, Image, StyleSheet, Dimensions,
  TextInput, Keyboard, ScrollView
} from 'react-native';
import React, { useState, useEffect } from 'react';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import * as base from '../../../component/global'
import { useNavigation, useRoute } from '@react-navigation/native';
import PropertyTypeModal from './morefilter/PropertyTypeModal';

const PAGE_LIMIT = 10;
const { width } = Dimensions.get("window");

const SearchScreenPage = () => {
  const [favorites, setFavorites] = useState([]);
  const navigation = useNavigation()
  const [categorydata, setCategorydata] = useState([]);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [totalPages, setTotalPages] = useState(1);
  const route = useRoute()
  const search = route.params?.search;
  const Category = route.params?.Category;
  const [query, setQuery] = useState(null);
const [propertyType, setPropertyType] = useState(null)
const [residential, setResidential] = useState(null)
const [pricerang, setPricerang] = useState(null)
const [bedrooms, setBedrooms] = useState(null)
const [bathrooms, setBathrooms] = useState(null)
const [propetytypeVisible, setPropetytypeVisible] = useState(false);
const [residentialVisible, setResidentialVisible] = useState(false);

  const toggleFavorite = (id) => {
    setFavorites((prev) =>
      prev.includes(id) ? prev.filter((a) => a !== id) : [...prev, id]
    );
  };

  const handleSearchPress = () => {
    Keyboard.dismiss();
    onSearch(query);
  };

  const handleBack = () => {
    if (navigation?.canGoBack()) navigation.goBack();
    else navigation.navigate?.('Home'); // fallback if desired
  };


  useEffect(() => {
    setQuery(search)
    fetchCategory();
  }, []);

  const fetchCategory = async () => {
    if (loading || page > totalPages) return;
    setLoading(true);
    try {
      if (search && Category) {
        const res = await fetch(base.BASE_URL + `/apis/property/recommandproperty/live?page=${page}&limit=${PAGE_LIMIT}&add_post=property&search=${search}&Category=${Category}`);
        const json = await res.json();
        setCategorydata((prev) => [...prev, ...json.users]);
        setTotalPages(json.totalPages);

      }
      else {
        const res = await fetch(base.BASE_URL + `/apis/property/recommandproperty/live?page=${page}&limit=${PAGE_LIMIT}&add_post=property&search=${search}`);
        const json = await res.json();
        setCategorydata((prev) => [...prev, ...json.users]);
        setTotalPages(json.totalPages);
      }
    } catch (error) {
      console.error("Error fetching:", error);
    } finally {
      setLoading(false);
    }
  };

  const renderItem = ({ item }) => {
    const isFavorite = favorites.includes(item.id);

    return (
      <TouchableOpacity
        style={styles.card} key={item._id}
        onPress={() => navigation.navigate("PropertyDetails", { itemdetails: item })}
      >
        {/* Property Image */}
        <Image
          source={{ uri: base.BASE_URL + item.images[0]?.image }}
          style={styles.image}
          resizeMode="cover"
        />

        {/* Price Tag */}
        {item.price && (
          <View style={styles.priceBadge}>
            <Text style={styles.priceText}>
              {new Intl.NumberFormat('en-IN', {
                style: 'currency',
                currency: 'AED',
                maximumFractionDigits: 0,
              }).format(Number(item.price))}
            </Text>
          </View>
        )}

        {/* Favorite */}
        <TouchableOpacity
          style={styles.favoriteButton}
          onPress={() => toggleFavorite(item.id)}
        >
          <Icon
            name={isFavorite ? "heart" : "heart-outline"}
            size={22}
            color={isFavorite ? "red" : "#000"}
          />
        </TouchableOpacity>

        {/* Play */}
        {/*   <View style={styles.playButton}>
          <Icon name="play" size={20} color="black" />
        </View> */}

        {/* Bottom Details */}
        <View style={styles.detailsBox}>
          <Text style={styles.title} numberOfLines={1}>{item.shortTitle}</Text>
          <Text style={styles.location}>{item.location}</Text>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.mainContainer}>
      <View style={styles.containerHeader}>
        {/* Left: Back button */}
        <View style={styles.left}>
          <TouchableOpacity
            onPress={handleBack}
            activeOpacity={0.7}
            accessibilityLabel="Go back"
            style={styles.iconButton}
          >
            <Icon name="arrow-left" size={22} color="#111" />
          </TouchableOpacity>
        </View>

        {/* Center: Search input with search button */}
        <View style={styles.center}>
          <View style={styles.searchBox}>
            <Icon name="magnify" size={18} color="#888" style={styles.searchIcon} />
            <TextInput
              style={styles.input}
              placeholder="Search Area"
              placeholderTextColor="#999"
              value={query}
              onChangeText={setQuery}
              returnKeyType="search"
              onSubmitEditing={handleSearchPress}
              underlineColorAndroid="transparent"
              accessibilityLabel="Search input"
            />
            <TouchableOpacity
              onPress={handleSearchPress}
              style={styles.searchBtn}
              activeOpacity={0.8}
              accessibilityLabel="Search"
            >
              <Text>Search</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Right: Filter / More */}
        <View style={styles.right}>
          <TouchableOpacity
            //  onPress={onOpenFilters}
            activeOpacity={0.7}
            style={styles.iconButton}
            accessibilityLabel="Open filters"
          >
            <Icon name="filter-variant" size={20} color="#111" />
          </TouchableOpacity>
        </View>
      </View>
      <ScrollView
  horizontal
  showsHorizontalScrollIndicator={false}
  contentContainerStyle={styles.horizontalcontainer}
>
       <TouchableOpacity style={[styles.chip, { marginLeft: 8 }]}>
            <Text>{propertyType == null ? 'Rent' : propertyType}</Text>
            <Icon name="chevron-down" size={20} 
            color="#666" style={{ marginLeft: 5 }} />
        </TouchableOpacity>
          <TouchableOpacity style={styles.chip}>
            <Text>{residential == null ? 'All Residential' : residential}</Text>
             <Icon name="chevron-down" size={20} 
            color="#666" style={{ marginLeft: 5 }} />
        </TouchableOpacity>
            <TouchableOpacity style={styles.chip}>
            <Text>{pricerang == null ? 'Price Range' : pricerang}</Text>
             <Icon name="chevron-down" size={20} 
            color="#666" style={{ marginLeft: 5 }} />
        </TouchableOpacity>
            <TouchableOpacity style={styles.chip}>
            <Text>{bedrooms == null ? 'Bedrooms' : bedrooms}</Text>
             <Icon name="chevron-down" size={20} 
            color="#666" style={{ marginLeft: 5 }} />
        </TouchableOpacity>
            <TouchableOpacity style={styles.chip}>
            <Text>{bathrooms == null ? 'Bathrooms' : bathrooms}</Text>
             <Icon name="chevron-down" size={20} 
            color="#666" style={{ marginLeft: 5 }} />
        </TouchableOpacity>
            <TouchableOpacity style={styles.chip}>
            <Text>Reset</Text>
        </TouchableOpacity>
      </ScrollView>
        <PropertyTypeModal  visible={PropertyTypeModal}
        onClose={() => setPropetytypeVisible(false)}
      //  data={dataToSend}  // ✅ passing data
        // 
        />
      <FlatList
        data={categorydata}
        keyExtractor={(item) => String(item._id)}
        renderItem={renderItem}
        contentContainerStyle={{ padding: 12 }}
        showsVerticalScrollIndicator={false}
        numColumns={1}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  mainContainer: {
    flex: 1,
    backgroundColor: "#fff",
  },
  card: {
    width: width - 24,
    backgroundColor: "#fff",
    borderRadius: 12,
    marginBottom: 16,
    elevation: 4,
    shadowColor: "#000",
    shadowOpacity: 0.15,
    shadowOffset: { width: 0, height: 3 },
    shadowRadius: 6,
    overflow: "hidden"
  },
  image: {
    height: 220,
    width: "100%",
  },
  priceBadge: {
    position: "absolute",
    top: 12,
    left: 12,
    backgroundColor: "rgba(255,255,255,0.85)",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
  },
  priceText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#000"
  },
 favoriteButton: {
    position: 'absolute',
    top: 14,
    right: 12,
  backgroundColor: 'rgba(255, 255, 255, 0.3)',
    borderRadius: 999, // ensures fully circular
    padding: 2, // adjust padding to match icon size
    alignItems: 'center',
    justifyContent: 'center',
  },

  playButton: {
    position: "absolute",
    bottom: 12,
    left: 12,
    backgroundColor: "#fff",
    width: 35,
    height: 35,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center"
  },
  detailsBox: {
    padding: 10,
  },
  title: {
    fontSize: 15,
    fontWeight: "600",
    color: "#000"
  },
  location: {
    fontSize: 13,
    color: "#555",
    marginTop: 2,
  },
  containerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 8,
    // subtle bottom border
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#e6e6e6',
  },

  left: {
    width: 44, // keeps consistent spacing
    justifyContent: 'center',
    alignItems: 'flex-start',
  },
  right: {
    width: 44,
    justifyContent: 'center',
    alignItems: 'flex-end',
  },

  iconButton: {
    backgroundColor: 'rgba(0,0,0,0.04)',
    padding: 6,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    // elevation / shadow
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.08,
        shadowRadius: 2,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  iconPlaceholder: {
    width: 32,
    height: 32,
  },

  center: {
    flex: 1,
    paddingHorizontal: 8,
  },

  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f7f7f8',
    borderRadius: 30,
    paddingVertical: Platform.OS === 'ios' ? 8 : 6,
    paddingLeft: 10,
    paddingRight: 6,
    // subtle shadow
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.06,
        shadowRadius: 4,
      },
      android: {
        elevation: 1,
      },
    }),
  },

  searchIcon: {
    marginRight: 8,
  },

  input: {
    flex: 1,
    fontSize: 14,
    color: '#111',
    paddingVertical: 0, // keep it vertically centered
  },

  searchBtn: {
    backgroundColor: '#f2f2f2', // primary color — change to your brand color
    width: 60,
    height: 36,
    borderRadius: 5,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 6,
    // shadow for button
    ...Platform.select({
      ios: {
        shadowColor: '#007AFF',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.12,
        shadowRadius: 4,
      },
      android: {
        elevation: 3,
      },
    }),
  },
  horizontalcontainer: {
    paddingVertical: 8,
  },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#ccc",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 7,
    marginRight: 7, height: 40,
    backgroundColor: "#fff",
  },
  chipText: {
    color: "#333",
    marginRight: 5,
    fontSize: 14,
  },
  arrow: {
    fontSize: 10,
    color: "#666",
  },
});

export default SearchScreenPage;
