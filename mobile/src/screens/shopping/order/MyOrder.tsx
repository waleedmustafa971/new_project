import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  Image, ScrollView,
  ActivityIndicator,
} from "react-native";
import React, { useEffect, useState } from "react";
import api from "../../../component/api";
import * as base from "../../../component/global";
import Colors from "../../../component/constants/color/color";
import AsyncStorage from '@react-native-async-storage/async-storage';
import Feather from "react-native-vector-icons/Feather";
import { useNavigation } from "@react-navigation/native";
import { StackNavigationProp } from "@react-navigation/stack";
/* ================= TYPES ================= */

interface Size {
  size: string;
  price: number;
  stock: number;
}

interface Product {
  _id: string;
  productname: string;
  images?: string[];
}

interface OrderProduct {
  _id: string;
  productId: Product;
  qty: number;
  price: number;
  sizes?: Size[];
  orderstatus: string;
  review: object;
}

interface OrderItem {
  _id: string;
  orderid: string;
  products: OrderProduct[];
  payment: {
    amount: number;
    method: string;
  };
  orderstatus: string;
  createdAt: string;
  review: { rating: number, comment: string };
}

/* ================= NAVIGATION TYPE ================= */

type RootStackParamList = {
  MyOrder: undefined;
  ProductReview: {
    productId: string;
    orderId: string;
    productname: string;
  };
};

type MyOrderNavProp = StackNavigationProp<
  RootStackParamList,
  "MyOrder"
>;

/* ================= COMPONENT ================= */

const MyOrder: React.FC = () => {
  const [userid, setUserid] = useState<string>(""); // ✅ FIX: was null
  const navigation = useNavigation<MyOrderNavProp>(); // ✅ FIX: typed navigation
  const [orders, setOrders] = useState<OrderItem[]>([]);
  const [tabdata, setTabdata] = useState<OrderItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const ORDER_TABS = [
    "Order Placed",
    "Processing",
    "Packed",
    "Shipped",
    "Out for Delivery",
    "Delivered",
  ];
  const [activeTab, setActiveTab] = useState<string>("Order Placed");

  const filteredOrders = orders.filter(
    order => order.orderstatus === activeTab

  );

  /* ================= FETCH ORDERS ================= */
  const fetchOrders = async () => {
    const jsonValue = await AsyncStorage.getItem("userdata");
    if (!jsonValue) return console.log("No user data found");
    const user = JSON.parse(jsonValue);
    setUserid(user._id);
    const status = "Delivered";
    try {
      const res = await api.get(
        `/api/order/list?page=1&limit=100&userid=${user._id}&orderstatus=${status}`
      );
      setOrders(res.data.data || []); // ✅ set API data
    } catch (err) {
      console.log("❌ Order Fetch Error:", err);
    } finally {
      setLoading(false);
    }
  };

  const fetchTab = async (activeTab: string) => {
    const jsonValue = await AsyncStorage.getItem("userdata");
    if (!jsonValue) return console.log("No user data found");
    const user = JSON.parse(jsonValue);
    setUserid(user._id);
    const status = "Delivered";
    try {
      const res = await api.get(
        `/api/order/list?page=1&limit=100&userid=${user._id}&orderstatus=${activeTab}`
      );
      setTabdata(res.data.data || []); // ✅ set API data
    } catch (err) {
      console.log("❌ Order Fetch Error:", err);
    } finally {
      setLoading(false);
    }
  };


  useEffect(() => {
    fetchOrders(); // ✅ call on mount
    fetchTab("Order Placed");
  }, []);

  /* ================= RENDER PRODUCT ================= */
  const renderProduct = (item: OrderProduct, orderId: string, orderstatus: string) => (

    <View key={item._id} style={styles.productRow}>

      {/* IMAGE */}
      {item.productId?.images?.[0] && (
        <Image
          source={{ uri: base.BASE_URL + base.productpath + item.productId.images[0] }}
          style={styles.productImage}
        />
      )}

      {/* DETAILS */}
      <View style={{ flex: 1 }}>
        <Text style={styles.productName}>
          {item.productId.productname}
        </Text>

        <Text style={styles.productMeta}>
          Qty: {item.qty} | AED {item.price}
        </Text>

        {/* ✅ PRODUCT-WISE REVIEW BUTTON */}
        <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
          {
            orderstatus === "Delivered" ?
              <>
                {item.review ? (
                  <>
                    {item.review?.rating && (
                      <View style={styles.ratingRow}>
                        {[1, 2, 3, 4, 5].map(num => (
                          <Text
                            key={num}
                            style={[
                              styles.star,
                              item.review.rating >= num && styles.activeStar
                            ]}
                          >
                            ★
                          </Text>
                        ))}
                      </View>
                    )}
                  </>
                ) :
                  <>
                    <TouchableOpacity
                      style={styles.reviewBtn}
                      onPress={() =>
                        navigation.navigate("ProductReview", {
                          productId: item.productId._id, // ✅ product-specific
                          orderId: orderId,               // ✅ optional but recommended
                          productname: item.productId.productname
                        })
                      }
                    >
                      <Text style={styles.reviewText}>Leave a Review</Text>
                    </TouchableOpacity>

                  </>
                }

              </>
              :
              <Text>LLLLL</Text>
          }
          <TouchableOpacity
            style={styles.reviewBtn}
            onPress={() =>
              navigation.navigate("ProductReview", {
                productId: item.productId._id, // ✅ product-specific
                orderId: orderId,               // ✅ optional but recommended
                productname: item.productId.productname
              })
            }
          >
            <Text style={styles.reviewText}>Buy Again</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.reviewBtn}
            onPress={() =>
              navigation.navigate("ProductReview", {
                productId: item.productId._id, // ✅ product-specific
                orderId: orderId,               // ✅ optional but recommended
                productname: item.productId.productname
              })
            }
          >
            <Text style={styles.reviewText}>Return / Refund</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );

  /* ================= RENDER ORDER ================= */
  const renderOrder = ({ item }: { item: OrderItem }) => (
    <View style={styles.orderCard}>
      {/* ORDER HEADER */}
      <View style={styles.orderHeader}>
        <Text style={styles.orderId}>Order ID: {item.orderid}</Text>
        <Text style={styles.orderAmount}>
          AED {item.payment.amount}
        </Text>
      </View>

      {/* PRODUCTS */}
      {/*  {item.products.map(renderProduct)} */}
      {item.products.map((product) =>
        renderProduct(product, item._id, item.orderstatus) // ✅ explicitly pass orderId
      )}


    </View>
  );

  /* ================= UI ================= */
  if (loading) {
    return <ActivityIndicator style={{ marginTop: 50 }} />;
  }

  return (
    <View style={styles.container}>
      {/* ===== HEADER ===== */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Feather name="arrow-left" size={24} color="#000" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>My Orders</Text>
      </View>
      {/* here i want to use Tab */}
      {/* Order Placed", "Processing", "Packed", "Shipped", "Out for Delivery", "Delivered" */}
      {/* ===== STATUS TABS ===== */}
      <View style={{ height: 47 }}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.tabContainer}
        >
          {ORDER_TABS.map(status => (
            <TouchableOpacity
              key={status}
              onPress={() => {
                setActiveTab(status)
                fetchTab(status)
              }}
              style={[
                styles.tab,
                activeTab === status && styles.activeTab
              ]}
            >
              <Text
                style={[
                  styles.tabText,
                  activeTab === status && styles.activeTabText
                ]}
              >
                {status}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>
      {
        tabdata.length > 0  ?
      <FlatList
        data={tabdata} // only orderstatus -  Order Placed 
        keyExtractor={(item) => item._id}
        renderItem={renderOrder}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 5 }}
        ListEmptyComponent={
          <Text style={styles.emptyText}>
            No orders in "{activeTab}"
          </Text>
        }
      />
        : null

      }
      <View style={{ height: 40 }}>
        <Text>Completed order</Text>
      </View>

      <FlatList
        data={orders} // i want here will show only orderstatus - Delivered data
        keyExtractor={(item) => item._id}
        renderItem={renderOrder}
        showsVerticalScrollIndicator={false}
      />
    </View>
  );
};

export default MyOrder;

/* ================= STYLES ================= */

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f5f5f5",
    padding: 10,
  },
  tabContainer: {
    backgroundColor: "#fff", height: 5
  },
  tab: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    backgroundColor: "#eee",
    marginRight: 8, height: 40
  },
  activeTab: {
    backgroundColor: "#0A84FF"
  },
  tabText: {
    fontSize: 14,
    color: "#333",
    fontWeight: "500"
  },
  activeTabText: {
    color: "#fff",
    fontWeight: "700"
  },
  emptyText: {
    textAlign: "center",
    marginTop: 40,
    color: "#888",
    fontSize: 16
  },
  orderCard: {
    backgroundColor: "#fff",
    borderRadius: 10,
    padding: 12,
    marginBottom: 15,
  },

  orderHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 10,
  },

  orderId: {
    fontWeight: "700",
    fontSize: 14,
  },

  orderAmount: {
    fontWeight: "700",
    color: Colors.primary,
  },

  productRow: {
    flexDirection: "row",
    marginVertical: 8,
  },

  productImage: {
    width: 60,
    height: 60,
    borderRadius: 6,
    marginRight: 10,
  },

  productName: {
    fontWeight: "600",
    fontSize: 14,
  },

  productMeta: {
    fontSize: 12,
    color: "#666",
  },

  actionRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginTop: 10,
    justifyContent: "space-between",
  },

  outlineBtn: {
    borderWidth: 1,
    borderColor: Colors.primary,
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 6,
    marginBottom: 6,
  },

  outlineText: {
    color: Colors.primary,
    fontSize: 12,
    fontWeight: "600",
  },

  dangerBtn: {
    backgroundColor: "#ffecec",
    width: 100,
    justifyContent: 'center', alignContent: 'center',
    alignItems: 'center',
    borderRadius: 6,
  },

  dangerText: {
    color: "#d9534f",
    fontSize: 12,
    fontWeight: "600",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    padding: 15,
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderColor: "#eee",
  },

  headerTitle: {
    fontSize: 13,
    fontWeight: "700",
    marginLeft: 12,
  },
  reviewBtn: {
    borderWidth: 1,
    borderColor: Colors.primary,
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 6,
    marginTop: 6,
    alignSelf: "flex-start",
  },

  reviewText: {
    fontSize: 12,
    color: Colors.primary,
    fontWeight: "600",
  },
 ratingRow: {
    flexDirection: "row",
    marginBottom: 12
  },
  star: {
    fontSize: 14,
    color: "#ccc",
    marginRight: 5
  },
  activeStar: {
    color: "#FFD700"
  },

});
