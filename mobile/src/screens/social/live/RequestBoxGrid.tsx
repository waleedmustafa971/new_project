import React from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
} from "react-native";

/* ================= TYPES ================= */

interface RequestUser {
  avatar: string;
  name: string;
}

interface RequestBoxGridProps {
  requests?: RequestUser[];
}

/* ================= COMPONENT ================= */

const RequestBoxGrid: React.FC<RequestBoxGridProps> = ({
  requests = [],
}) => {
  const filledRequests: (RequestUser | null)[] = [...requests];

  while (filledRequests.length < 6) {
    filledRequests.push(null);
  }

  return (
    <View style={styles.container}>
      {filledRequests.map((item, index) => (
        <TouchableOpacity key={index} style={styles.box}>
          {item ? (
            <>
              <Image
                source={{ uri: item.avatar }}
                style={styles.avatar}
              />
              <Text style={styles.name} numberOfLines={1}>
                {item.name}
              </Text>
            </>
          ) : (
            <Text style={styles.plus}>+</Text>
          )}
        </TouchableOpacity>
      ))}
    </View>
  );
};

export default RequestBoxGrid;

/* ================= STYLES ================= */

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    padding: 10,
  },
  box: {
    width: "30%",
    aspectRatio: 1,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#ccc",
    marginBottom: 10,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#f9f9f9",
  },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    marginBottom: 5,
  },
  name: {
    fontSize: 12,
    textAlign: "center",
  },
  plus: {
    fontSize: 30,
    color: "#999",
  },
});
