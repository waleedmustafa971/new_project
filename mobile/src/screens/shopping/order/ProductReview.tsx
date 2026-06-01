import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert
} from "react-native";
import { useRoute, useNavigation } from "@react-navigation/native";
import api from "../../../component/api";
import AsyncStorage from '@react-native-async-storage/async-storage';

interface RouteParams {
  productId: string;
  orderId?: string;
  productname?: string;
}

const ProductReview: React.FC = () => {
  const route = useRoute();
  const navigation = useNavigation();
  const { productId, productname, orderId } = route.params as RouteParams;

  const [rating, setRating] = useState<number>(5);
  const [comment, setComment] = useState<string>("");
  const [loading, setLoading] = useState(false);

  const submitReview = async () => {
    if (!rating) {
      Alert.alert("Error", "Please select rating");
      return;
    }
    const jsonValue = await AsyncStorage.getItem("userdata");
    if (!jsonValue) return console.log("No user data found");
    const user = JSON.parse(jsonValue);
    try {
      setLoading(true);
     const response = await api.post("/api/order/review", {
        userId: user._id, orderId: orderId,
        productId,
        rating,
        comment
      });

      Alert.alert(response.data.message);
      navigation.goBack();
    } catch (err) {
      console.log(err)
      Alert.alert("Error", "Failed to submit review");
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Leave a Review</Text>
      <Text style={styles.title}>{productname}</Text>
      
      {/* ⭐ Rating */}
      <View style={styles.ratingRow}>
        {[1,2,3,4,5].map(num => (
          <TouchableOpacity key={num} onPress={() => setRating(num)}>
            <Text style={[
              styles.star,
              rating >= num && styles.activeStar
            ]}>
              ★
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* 💬 Comment */}
      <TextInput
        placeholder="Write your review..."
        value={comment}
        onChangeText={setComment}
        style={styles.input}
        multiline
      />

      {/* 🚀 Submit */}
      <TouchableOpacity
        style={styles.submitBtn}
        onPress={submitReview}
        disabled={loading}
      >
        <Text style={styles.submitText}>
          {loading ? "Submitting..." : "Submit Review"}
        </Text>
      </TouchableOpacity>
    </View>
  );
};

export default ProductReview;
const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: "#fff"
  },
  title: {
    fontSize: 13,
    fontWeight: "700"
  },
  ratingRow: {
    flexDirection: "row",
    marginBottom: 12
  },
  star: {
    fontSize: 34,
    color: "#ccc",
    marginRight: 5
  },
  activeStar: {
    color: "#FFD700"
  },
  input: {
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 8,
    padding: 10,
    minHeight: 80,
    marginBottom: 20
  },
  submitBtn: {
    backgroundColor: "#000",
    padding: 14,
    borderRadius: 10
  },
  submitText: {
    color: "#fff",
    textAlign: "center",
    fontWeight: "600"
  }
});
