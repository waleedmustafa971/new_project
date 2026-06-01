import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from "react-native";
import React from "react";
import Feather from "react-native-vector-icons/Feather";
import { useNavigation } from "@react-navigation/native";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { StackNavigationProp } from "@react-navigation/stack";

interface Payment {
  method: string;
  amount: number;
}

interface OrderData {
  orderid: string;
  payment: Payment;
}

interface Props {
  route: {
    params: {
      orderid: string;
      orderdata: OrderData;
      modulename: string;
    };
  };
}
type RootStackParamList = {
    HomeScreen: undefined;
    FoodDashboard: undefined;
    ShoppingProfile: undefined;
    FoodViewcart: undefined;
    AuthScreen: undefined;
    GetPaymentFoodScreen: undefined;
    RestaurantScreen: { restaurant_id: string }; // Define that this screen needs a string ID
    // Add other screens here...
};
type ViewCartScreenProp = StackNavigationProp<RootStackParamList, "GetPaymentFoodScreen">;


const ViewOrder: React.FC<Props> = ({ route }) => {
  const { orderid, orderdata, modulename } = route.params;
  const navigation = useNavigation<ViewCartScreenProp>();
  

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.iconContainer}>
        <Feather name="check-circle" size={50} color="#22BB33" />
      </View>

      <Text style={styles.title}>Order Placed Successfully 🎉</Text>
      <Text style={styles.subtitle}>Thank you for your purchase!</Text>

      {/* Order Card */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Order Details</Text>

        <View style={styles.row}>
          <Text style={styles.label}>Order ID:</Text>
          <Text style={styles.value}>{orderid}</Text>
        </View>
{
  modulename === "food" ?
  <></> : <>
        <View style={styles.row}>
          <Text style={styles.label}>Delivery:</Text>
          <Text style={styles.value}>Expected within 2–5 days</Text>
        </View> </>

}
      </View>
{
  modulename === "food" ?
  <>
   <TouchableOpacity
        style={styles.button}
        onPress={() => navigation.navigate("FoodDashboard" as never)}
      >
        <Text style={styles.buttonText}>Continue</Text>
      </TouchableOpacity>
  </> :
 <TouchableOpacity
        style={styles.button}
        onPress={() => navigation.navigate("ShoppingDashboard" as never)}
      >
        <Text style={styles.buttonText}>Continue Shopping</Text>
      </TouchableOpacity>
}
     

      <TouchableOpacity
        style={styles.secondaryBtn}
        onPress={() => navigation.navigate("MyOrder" as never)}
      >
        <Text style={styles.secondaryBtnText}>View My Orders</Text>
      </TouchableOpacity>
    </ScrollView>
  );
};

export default ViewOrder;


const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    padding: 20,
    backgroundColor: "#f8f9fa",
  },
  iconContainer: {
    marginTop: 30,
    marginBottom: 10,
  },
  title: {
    fontSize: 14,
    fontWeight: "700",
    color: "#111",
  },
  subtitle: {
    fontSize: 12,
    color: "#555",
    marginBottom: 20,
  },
  card: {
    width: "100%",
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 18,
    elevation: 3,
    marginTop: 15,
  },
  cardTitle: {
    fontSize: 12,
    fontWeight: "700",
    marginBottom: 10,
    color: "#333",
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 6,
  },
  label: {
    fontSize: 12,
    color: "#444",
  },
  value: {
    fontSize: 12,
    fontWeight: "600",
    color: "#111",
  },
  button: {
    backgroundColor: "#0A84FF",
    paddingVertical: 12,
    width: "100%",
    borderRadius: 10,
    marginTop: 25,
  },
  buttonText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "600",
    textAlign: "center",
  },
  secondaryBtn: {
    marginTop: 12,
    paddingVertical: 12,
  },
  secondaryBtnText: {
    color: "#0A84FF",
    fontSize: 12,
    textAlign: "center",
    fontWeight: "600",
  },
});
