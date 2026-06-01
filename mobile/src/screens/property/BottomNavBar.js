import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image } from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons'; // Ionicons, MaterialIcons, etc.
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import Feather from 'react-native-vector-icons/Feather';

const BottomNavBar = ({ navigation, data }) => {
 // console.log('...bottom ', JSON.stringify(data))
  return (
    <View style={styles.navBar}>
      <TouchableOpacity style={styles.navItem} onPress={() => {
        navigation.navigate("HomeScreen")
      }}>
      <Feather name="home" size={24} color="#333" />
    {/*     <Text style={styles.navText}>Home</Text> */}
      </TouchableOpacity>

      <TouchableOpacity style={styles.navItem} onPress={() => {
        navigation.navigate("PropertyFavouites")
      }}>
        <Icon name="heart-outline" size={25} color="#333" />
     {/*    <Text style={styles.navText}>Favourite</Text> */}
      </TouchableOpacity>

      <TouchableOpacity style={styles.postButton} onPress={() => {
        navigation.navigate("CreateAds",{
          location: data
        })
      }}>
        <Icon name="add-circle" size={30} color="#000" />
         {/* <Text style={styles.postText}>Place Ads 
          {JSON.stringify(data)}
          </Text>  */}
      </TouchableOpacity>

      <TouchableOpacity style={styles.navItem} onPress={() => {
        
          navigation.navigate("ChatProductInboxScreen")
      }}>
        <Icon name="chatbubble-ellipses-outline" size={26} color="#000" />     
       {/*   <Text style={styles.navText}>Chat</Text> */}
        </TouchableOpacity>

      <TouchableOpacity style={styles.navItem} onPress={() => {
        navigation.navigate("PropertyProfile")
      }}>
        <Icon name="person-outline" size={24} color="#333" />
      {/*   <Text style={styles.navText}>Profile</Text> */}
      </TouchableOpacity>
    </View>
  );
};

export default BottomNavBar;

const styles = StyleSheet.create({
  navBar: {
    position: 'absolute',
    bottom: 0,
    backgroundColor: '#f2f2f2',
    flex: 1, width: '100%',
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingVertical: 0,
    elevation: 0, // Android shadow
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -1 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    borderTopLeftRadius: 15,
    borderTopRightRadius: 15, padding: 9
  },
  navItem: {
    alignItems: 'center',
    justifyContent: 'center', marginBottom: 12
  },
  navText: {
    fontSize: 12,
    color: '#333',
    marginTop: 0, marginBottom: 7
  },
  postButton: {
 
    alignItems: 'center',
    justifyContent: 'center',marginBottom: 12
  },
   postText: {
    fontSize: 12,
    color: '#333',
    marginTop: 0, marginBottom: 4
  },
});
