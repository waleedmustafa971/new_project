import { View, Text, StyleSheet } from 'react-native';
import React from 'react';
import PostCompany from './PostCompany';
import PostPersonal from './PostPersonal';
import { RouteProp, useNavigation } from "@react-navigation/native";
import { StackNavigationProp } from "@react-navigation/stack";
import Ionicons from "react-native-vector-icons/Ionicons";

type RootStackParamList = {
  CompanyJobpost: { type: string };
};

type CompanyJobpostRouteProp = RouteProp<
  RootStackParamList,
  'CompanyJobpost'
>;
type NavigationProp = StackNavigationProp<
  RootStackParamList,
  "CompanyJobpost"
>;
type Props = {
  route: CompanyJobpostRouteProp;
};

const CompanyJobpost: React.FC<Props> = ({ route }) => {
  const { type } = route.params;
  const navigation = useNavigation<NavigationProp>();

  const isCompany = type === "company";

  return (
    <View style={styles.container}>

      {/* Header */}
      <View style={styles.header}>
        <Ionicons
          name="chevron-back"
          size={24}
          color="#000"
          onPress={() => navigation.goBack()}
        />
        <Text style={styles.title}>Job Post</Text>
      </View>

      {/* Content */}
      <View style={styles.content}>
        {isCompany ? (
          <PostCompany route={route} />
        ) : (
          <PostPersonal />
        )}
      </View>

    </View>
  );
};

export default CompanyJobpost;
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f5f5f5",
    padding: 5,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    padding: 10,
  },
  title: {
    fontSize: 14,
    fontWeight: "bold",
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 13,
    color: "gray",
    marginBottom: 12,
  },
  content: {
    flex: 1,
    backgroundColor: "#fff",
    borderRadius: 10,
    padding: 5,
  },
});