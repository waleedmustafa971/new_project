import { View, Text, StyleSheet, TouchableOpacity } from 'react-native'
import React from 'react'
import Icon from 'react-native-vector-icons/MaterialIcons';
import Ionicons from 'react-native-vector-icons/Ionicons';
import SearchBar from './SearchBar';
import { useNavigation } from '@react-navigation/native';

const HeaderProperty = ({ address }) => {
  const navigation = useNavigation()

  return (
    <>
      <View style={styles.header}>
        <View style={{ backgroundColor: '#fff' }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 4 }}>
            <TouchableOpacity onPress={() => navigation.goBack()}>
              <Icon name="chevron-left" size={30} color="#333" />
            </TouchableOpacity>
            <View>
              <Text style={[styles.headerTitle, { marginLeft: 0 }]}>Property</Text>
              <Text style={[styles.headerTitle, { fontSize: 10, color: '#666' }]}
                numberOfLines={1}
                ellipsizeMode="tail"
              >
                {(address || '').length > 50
                  ? (address || '').substring(0, 50) + '...'
                  : address}

              </Text>
            </View>

          </View>

          {/* Bottom row: Address */}

        </View>

        <View style={styles.headerIcons}>
          {/*    <TouchableOpacity
            onPress={() => {
              navigation.navigate("CreateAds")
            }}
            style={{
              flexDirection: 'row', alignItems: 'center', marginRight: 0,
              borderWidth: 0, borderColor: 'blue', padding: 3, height: 40,
              borderRadius: 10,
            }}
          >
            <Ionicons name="add" size={20} color="#000" style={{ marginRight: 5 }} />

          </TouchableOpacity> */}
          <TouchableOpacity
            onPress={() => {
              navigation.navigate("CreateAds")
            }}
            style={{
              flexDirection: 'row', alignItems: 'center', marginRight: 0,
              borderWidth: 0, borderColor: 'blue', padding: 3, height: 40,
              borderRadius: 10,
            }}
          >
            <Ionicons name="notifications-outline" size={20} color="#000" style={{ marginRight: 5 }} />

          </TouchableOpacity>

        </View>

      </View>
      <SearchBar />
    </>
  )
}

export default HeaderProperty

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 0, borderColor: 'green',
    marginBottom: 1
  },
  headerTitle: {
    fontSize: 14, fontWeight: 'bold',
  },
  headerIcons: { flexDirection: 'row' },
  icon: { marginLeft: 16 },
});