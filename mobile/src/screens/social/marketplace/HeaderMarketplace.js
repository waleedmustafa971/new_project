import { View, Text, StyleSheet, TouchableOpacity } from 'react-native'
import React from 'react'
import Icon from 'react-native-vector-icons/MaterialIcons';
import Icons from "react-native-vector-icons/Entypo";
import { useNavigation } from '@react-navigation/native';

const HeaderMarketplace = () => {
  const navigation = useNavigation()
  return (
   <View style={styles.header}>
    <TouchableOpacity style={{
      display: 'flex', flexDirection: 'row'
    }} onPress={() => {
      navigation.goBack()
    }}>
        <Icons name="chevron-left" size={26} color="#000" />
        <Text style={styles.headerTitle}>Marketplace</Text>
    </TouchableOpacity>
        <View style={styles.headerIcons}>
        {/*   <Icon name="person" size={24} color="black" style={styles.icon} /> */}
       {/*    <Icon name="add" size={24} color="black" style={styles.icon} /> */}
        {/*   <Icon name="search" size={24} color="black" style={styles.icon}/> */}
        </View>
      </View>
  )
}

export default HeaderMarketplace

const styles = StyleSheet.create({
 header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16 },
  headerTitle: { fontSize: 18, fontWeight: 'bold' },
  headerIcons: { flexDirection: 'row' },
  icon: { marginLeft: 16 },
});