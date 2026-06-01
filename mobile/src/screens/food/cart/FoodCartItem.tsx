import React from "react";
import { View, Text, Image, StyleSheet, TouchableOpacity } from "react-native";
import Feather from "react-native-vector-icons/Feather";
import Colors from "../../../constants/colors";
import api from "../../../component/api";
import * as base from '../../../component/global'


const FoodCartItem = ({ item, onAdd, onRemove, onDelete, url }: any) => {
 //   console.log('...item...' + JSON.stringify(item))

  return (
    <View style={styles.container}>
      <Image source={{ uri: url + item?.images }} 
      style={styles.image} />
      <View style={{ flex: 1 }}>
        <Text style={styles.title}>
          {item?.productname}
        </Text>
        <View style={styles.bg}>
          <Text style={styles.price}>{base.currency} {item?.price}</Text>
          <View style={styles.quantityRow}>
            <TouchableOpacity onPress={onRemove} style={styles.qtyBtn}>
              <Feather name="minus" size={15} color={Colors.purple} />
            </TouchableOpacity>
            <Text style={styles.qtyText}>{item.qty}</Text>
            <TouchableOpacity onPress={onAdd} style={styles.qtyBtn}>
              <Feather name="plus" size={15} color={Colors.purple} />
            </TouchableOpacity>
          </View>
        </View>
      </View>

      <TouchableOpacity onPress={onDelete} style={styles.deleteBtn}>
        <Feather name="trash-2" size={17} color="#FF5C5C" />
      </TouchableOpacity>
    </View>
  );
};

export default FoodCartItem;

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 10,
    marginBottom: 5,
    alignItems: "center",
  },
  bg: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 2,
  },
  deleteBtn: {
    position: "absolute",
    top: 40,
    left: 40,
    backgroundColor: "#fff",
    padding: 6,
    borderRadius: 20,
    shadowColor: "#000",
    shadowOpacity: 0.1,
  },
  image: {
    width: 60,
    height: 60,
    borderWidth: 3,
    borderColor: "#fff",
    borderRadius: 10,
    marginRight: 10,
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 6,
    elevation: 4,
  },
  title: {
    fontSize: 12,
  },
  price: {
    fontSize: 12,
    marginVertical: 2,
  },
  meta: {
    marginVertical:10,
    fontSize: 15,
    color: "#222",
  },
  quantityRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 6,
  },
  qtyBtn: {
    borderWidth: 2,
    borderColor: Colors.purple,
    borderRadius: 18,
    alignContent: 'center', alignSelf: 'center'
  },
  qtyText: {
    marginHorizontal: 10,
    backgroundColor: Colors.lightPurple,
    padding:8,
    paddingHorizontal:13,
    borderRadius: 6,
  },
});
