import React from 'react';
import { View, Text, Image, StyleSheet, TouchableOpacity,
    Linking
 } from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import * as base from '../../../../component/global';

const AgentContactCard = ({data} : any) => {
  return (
    <View style={cardStyles.container}>
      {/* Header Section */}
      <View style={cardStyles.header}>

         <Image
                source={{
                  uri: base.BASE_URL + data?.userinfo?.image
                    ? base.BASE_URL + data?.userinfo?.image
                    : 'https://via.placeholder.com/150',
                }}
                style={cardStyles.avatar}
              />
        <View style={cardStyles.headerText}>
          <Text style={cardStyles.name}>{data?.userinfo?.name}</Text>
          {/*  <Text style={cardStyles.company}>
            {data?.userinfo?.image}
            </Text>  */}
        </View>
      </View>

      <View style={cardStyles.divider} />

      {/* Reference Section */}
      <Text style={cardStyles.infoText}>
        Don't forget to mention the property Title
        <Text style={cardStyles.boldRed}>{data?.shortTitle}</Text> when you call.
      </Text>

      {/* Phone Button */}
      <TouchableOpacity style={cardStyles.phoneButton} 
      onPress={() => Linking.openURL(`tel:${data?.phoneNo}`)}>
         <Icon name="call-outline" size={28} color="#34C759" style={{
            marginRight: 10
         }} />
        <Text style={cardStyles.phoneText}>{data?.phoneNo}</Text>
      </TouchableOpacity>
    </View>
  );
};

const cardStyles = StyleSheet.create({
    container: {
        
    },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 5, borderWidth: 0, borderColor: '#000',
    marginTop: 22
  },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 12,
    backgroundColor: '#eee',
  },
  headerText: {
    marginLeft: 15,
  },
  name: {
    fontSize: 14,
    fontWeight: '700',
    color: '#142',
  },
  company: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
  divider: {
    height: 1,
    backgroundColor: '#eee',
    width: '100%',
    marginVertical: 20,
  },
  infoText: {
    textAlign: 'center',
    fontSize: 12,
    lineHeight: 10,
    color: '#444',
    paddingHorizontal: 10,
    marginBottom: 30,
  },
  boldRed: {
    fontWeight: 'bold', marginLeft: 7,
    color: '#E31837', // Specific red from screenshot
  },
  phoneButton: {
    backgroundColor: '#FFF5F6',
    paddingVertical: 15,
    borderRadius: 8,
    alignItems: 'center', marginBottom: 10,
    flexDirection: 'row', justifyContent: 'center'
  },
  phoneText: {
    color: '#E31837',
    fontSize: 20,
    fontWeight: '700',
  },
});

export default AgentContactCard;