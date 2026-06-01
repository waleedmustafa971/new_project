import { StyleSheet, Text, View, TouchableOpacity } from 'react-native'
import React from 'react'
import Feather from 'react-native-vector-icons/Feather';
import Ionicons from 'react-native-vector-icons/Ionicons';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import Colors from '../../component/constants/color/color';
import * as base from '../../component/global'

const TopMenu = ({ navigation, userid, userinfo }) => {
    return (
        <View
            style={{
                flexDirection: 'row',
                justifyContent: 'space-between',
                alignItems: 'center',
                paddingHorizontal: 16, // px-4 = 4 * 4
                paddingVertical: 12,   // py-3 = 3 * 4
                backgroundColor: 'white',
                borderBottomWidth: 1,
                borderBottomColor: '#e5e7eb', // Tailwind gray-200
            }}
        >
            {/* 👈 Left: Title */}
            <Text
                style={{
                    fontSize: 24, // text-lg
                    fontWeight: 'bold',
                    color: Colors.black
                }}
            >
                {base.Product_name}
            </Text>

            {/* 👉 Right: Icons */}
            <View
                style={{
                    flexDirection: 'row',
                    gap: 16, // space-x-4 = 4 * 4
                }}
            >
                <TouchableOpacity onPress={() => {
                    navigation.navigate("SearchReels")
                }}>
                    <Feather name="search" size={24} color={Colors.black} />
                </TouchableOpacity>
                <TouchableOpacity onPress={() => {
                    navigation.navigate("NotificationPage")
                }}> 
                    <Ionicons name="notifications-outline" size={24} color={Colors.black} />
                </TouchableOpacity>
                <TouchableOpacity onPress={() => {
                    navigation.navigate('ChatScreen',{ userid : userid, userinfo: userinfo });
                }}> 
                    <MaterialIcons name="message" size={24} color={Colors.black} />
                </TouchableOpacity>
            </View>
        </View>
    )
}

export default TopMenu

