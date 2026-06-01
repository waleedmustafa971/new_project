import React from "react";
import { View, Text, Image, StyleSheet, TouchableOpacity } from "react-native";
import Feather from "react-native-vector-icons/Feather";
import Colors from "../constants/color/color";
import * as base from '../../component/global'

const CartItem = ({ item, onAdd, onRemove, onDelete, url }: any) => {
 //   console.log('...item...' + JSON.stringify(item))
    /* 
{"_id":"69243ea371f07ac1b6f762fb","userId":"69172eddad1f7aac7279c282",
"productId":"69208308c06ca6e7670acdd3",
"price":60,"qty":1,
"status":"not yet submit",
"sizes":[{"size":"30","price":60,"stock":20,"_id":"69208308c06ca6e7670acdd4"},
{"size":"32","price":60,"stock":30,"_id":"69208308c06ca6e7670acdd5"},
{"size":"34","price":60,"stock":20,"_id":"69208308c06ca6e7670acdd6"}],
"createdAt":"2025-11-24T11:16:51.821Z","updatedAt":"2025-11-24T11:16:51.821Z","__v":0}    
    */
  return (
    <View style={styles.container}>
      <Image source={{ uri: url + base.productpath + item?.productId?.images?.[0] }} 
      style={styles.image} />
      <View style={{ flex: 1 }}>
        <Text style={styles.title}>
          {item.productId.productname} 
        </Text>
        <Text style={styles.meta}>
          {item.size}
        </Text>
        <View style={styles.bg}>
          <Text style={styles.price}>{base.currency} {item.price}</Text>
          <View style={styles.quantityRow}>
            <TouchableOpacity onPress={onRemove} style={styles.qtyBtn}>
              <Feather name="minus" size={18} color={Colors.purple} />
            </TouchableOpacity>
            <Text style={styles.qtyText}>{item.qty}</Text>
            <TouchableOpacity onPress={onAdd} style={styles.qtyBtn}>
              <Feather name="plus" size={18} color={Colors.purple} />
            </TouchableOpacity>
          </View>
        </View>
      </View>

      <TouchableOpacity onPress={onDelete} style={styles.deleteBtn}>
        <Feather name="trash-2" size={20} color="#FF5C5C" />
      </TouchableOpacity>
    </View>
  );
};

export default CartItem;

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
    marginTop: 10,
  },
  deleteBtn: {
    position: "absolute",
    top: 90,
    left: 20,
    backgroundColor: "#fff",
    padding: 6,
    borderRadius: 20,
    shadowColor: "#000",
    shadowOpacity: 0.1,
  },
  image: {
    width: 120,
    height: 120,
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
    fontWeight: "400",
  },
  price: {
    fontSize: 14,
    fontWeight: "700",
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
