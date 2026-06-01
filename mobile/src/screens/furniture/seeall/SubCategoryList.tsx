import React, { useState } from "react";
import { View, FlatList, StyleSheet } from "react-native";
import SubCategories from "./SubCategories";

const SubCategoryList = ({subcategories, onChangevalue} : any) => {
 // const [selectedIndex, setSelectedIndex] = useState(0); first one select with 0
  const [selectedIndex, setSelectedIndex] = useState("");
  //console.log('...selected subcategories ..... ', selectedIndex)
  return (
    <View style={styles.container}>
      <FlatList
        data={subcategories}
        horizontal
        showsHorizontalScrollIndicator={false}
        keyExtractor={(item, index) => item._id}
        renderItem={({ item, index } : any) => (
          <SubCategories
            item={item}
            isSelected={index === selectedIndex}
            onPress={() => {
              console.log("Pressed item:", item); // vall is print here 
              setSelectedIndex(index);
              if (onChangevalue) onChangevalue(item); // 🔹 call parent callback
            }}
          />
        )}
      />
    </View>
  );
};

export default SubCategoryList;

const styles = StyleSheet.create({
  container: {
    paddingVertical: 10,
  },
});
