import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import React from 'react';
import Icon from 'react-native-vector-icons/Ionicons'; // or MaterialIcons, FontAwesome, etc.
import { useNavigation, useRoute } from '@react-navigation/native';

const ConfirmAds = () => {

  const navigation = useNavigation()  
  const route = useRoute()
  const item = route.params?.item;


  const handlePage = () => {
      if(item == "Motors")
      {
      navigation.navigate("Motors")
      }
      else {
        navigation.navigate("PropertyDashboard")
      }

  }
   
  return (
    <View style={styles.container}>
      <Icon name="checkmark-circle" size={100} color="#2e7d32" style={styles.icon} />
      <Text style={styles.title}>Ad Posted Successfully!</Text>
      <Text style={styles.subtitle}>
        Thank you for posting your ad. We will get back to you soon after approval.
      </Text>
    <TouchableOpacity
  style={styles.button}
  onPress={() => handlePage()}
>
  <Text style={styles.buttonText}>Go to Dashboard</Text>
</TouchableOpacity>

    </View>
  );
};

export default ConfirmAds;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  icon: {
    marginBottom: 30,
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#2e7d32',
    marginBottom: 10,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: '#555',
    textAlign: 'center',
    lineHeight: 22,
  },
  button: {
  marginTop: 30,
  backgroundColor: '#2e7d32',
  paddingVertical: 12,
  paddingHorizontal: 30,
  borderRadius: 30,
  elevation: 4, // for Android shadow
  shadowColor: '#000',
  shadowOffset: { width: 0, height: 2 },
  shadowOpacity: 0.2,
  shadowRadius: 3,
},
buttonText: {
  color: '#fff',
  fontSize: 16,
  fontWeight: 'bold',
  textAlign: 'center',
},

});
