import React from "react";
import { View, Text, FlatList, Image, StyleSheet, TouchableOpacity, Alert } from "react-native";
import * as base from "../../component/global";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useNavigation } from "@react-navigation/native";
interface Category {
  _id: string;
  category_name: string;
  category_image: string;
}
type RootStackParamList = {
  Home: undefined;
  CategoryWiseRestaurant: { category_id: string };
};

type NavigationProp = NativeStackNavigationProp<
  RootStackParamList,
  "CategoryWiseRestaurant"
>;
const CategoryList = ({
  categories,
  address,
  latitude,
  longitude
}: {
  categories: Category[];
  address: string;
  latitude: number;
  longitude: number;
}) => {  
  const navigation = useNavigation<NavigationProp>();
 
  const getCategorydata = (category: any) => {
    console.log('Category pressed:', category);
    navigation.navigate("CategoryWiseRestaurant", {
      category_id: category._id,
      address,
      latitude: latitude,
      longitude: longitude
    })
  };

  return (
    <View style={styles.container}>
      <FlatList
        horizontal
        data={categories}
        keyExtractor={(item) => item._id}
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.listPadding}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.card}
            onPress={() => getCategorydata(item)}
          >
            <View style={styles.imageContainer}>
              <Image
                source={{ uri: base.BASE_URL + item.category_image }}
                style={styles.image}
              />
            </View>
            <Text style={styles.name} numberOfLines={1}>
              {item.category_name}
            </Text>
          </TouchableOpacity>
        )}
      />
    </View>
  );
};

export default CategoryList;
const styles = StyleSheet.create({
  container: {
    marginVertical: 15,
    backgroundColor: '#fff',
  },
  listPadding: {
    paddingHorizontal: 8, // Gives space at the start and end of scroll
  },
  card: {
    width: 75,
    marginHorizontal: 6,
    alignItems: 'center',
  },
  imageContainer: {
    width: 70,
    height: 70,
    backgroundColor: '#F2F2F2', // The light gray background from your image
    borderRadius: 18, // Large rounded corners
    overflow: 'hidden', // Ensures image doesn't bleed past corners
    justifyContent: 'center',
    alignItems: 'center',
  },
  image: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover', // Or 'contain' depending on your original asset padding
  },
  name: {
    fontSize: 13,
    marginTop: 8,
    textAlign: 'center',
    color: '#444',
    fontWeight: '500', // Medium weight for readability
  },
});
