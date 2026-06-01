import { View, Text, TouchableOpacity } from 'react-native'
import React from 'react'
import AntIcon from 'react-native-vector-icons/AntDesign';

const HeaderReels = ({ navigation, onBack, handleExport }: any) => {
  return (
    <View
      style={{
        position: 'absolute',
        top: 7,
        left: 0,
        right: 0, // 👈 important
        paddingHorizontal: 15,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        zIndex: 10,
        elevation: 10,
      }}
    >
      {/* Back Button */}
      <TouchableOpacity
        style={{
          backgroundColor: 'rgba(0,0,0,0.3)',
          padding: 10,
          borderRadius: 25,
          justifyContent: 'center',
          alignItems: 'center',
        }}
        onPress={onBack}
      >
        <AntIcon name="arrowleft" size={20} color="white" />
      </TouchableOpacity>

      {/* Next Button */}
      <TouchableOpacity
        style={{
          backgroundColor: 'rgba(0,0,0,0.3)',
          paddingHorizontal: 18,
          paddingVertical: 10,
          borderRadius: 25,
          justifyContent: 'center',
          alignItems: 'center',
        }}
        onPress={handleExport}
      > 
        <Text style={{ color: 'white', fontWeight: '600' }}>Next</Text>
      </TouchableOpacity>
    </View>
  )
}

export default HeaderReels;
