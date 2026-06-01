import React from "react";
import { View, Text, TouchableOpacity, Image, Alert } from "react-native";
import Icon from "react-native-vector-icons/FontAwesome";
import { useNavigation } from '@react-navigation/native';
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Product_name } from "../../component/global";

const AuthScreen = () => {
  const navigation = useNavigation();


  const clearLocaldata = async() => {
        await AsyncStorage.clear();
        Alert.alert("Clear")
  }

    return (
        <View style={{
            flex: 1,
            backgroundColor: '#FFFFFF',
            justifyContent: 'center',
            alignItems: 'center',
            padding: 24, // p-6 = 6 × 4px = 24px
        }}>

            <Text style={{
                fontSize: 24,           // text-2xl
                fontWeight: 'bold',     // font-bold
                color: '#1F2937',       // text-gray-800
                marginBottom: 16        // mb-4 (4 * 4px)
            }}>
                Welcome
            </Text>
            <Text style={{
                color: '#4B5563',        // Tailwind's gray-600
                textAlign: 'center',
                marginBottom: 24, fontSize: 16       // mb-6 = 6 × 4px = 24px
            }}>
                Sign up to continue using {Product_name}
            </Text>

            <TouchableOpacity
                style={{
                    width: '100%',
                    backgroundColor: '#22C55E',   // Tailwind green-500
                    paddingVertical: 12,          // py-3 → 3 × 4px = 12px
                    borderRadius: 12,             // rounded-xl → 12px
                    flexDirection: 'row',
                    justifyContent: 'center',
                    alignItems: 'center',
                    marginBottom: 12,             // mb-3 → 3 × 4px = 12px
                    columnGap: 8,                 // gap-x-2 → 2 × 4px = 8px (RN 0.71+)
                }}
                onPress={() => navigation.navigate("Signupwithmobile")}
            >
                <Icon name="mobile" size={24} color="white" className="mr-2"  style={{ marginRight: 6 }}/>
                <Text style={{
                    color: '#FFFFFF',        // text-white
                    fontWeight: '600',       // font-semibold
                    fontSize: 14             // text-lg (18px typically)
                }}>
                    Sign up with Mobile No
                </Text>
            </TouchableOpacity>
            <TouchableOpacity
                style={{
                    width: '100%',              // w-full
                    backgroundColor: '#1F2937', // bg-gray-800
                    paddingVertical: 12,        // py-3 (3 * 4px)
                    borderRadius: 12,           // rounded-xl (approx. 12px)
                    flexDirection: 'row',       // flex-row
                    justifyContent: 'center',   // justify-center
                    alignItems: 'center',       // items-center
                    marginBottom: 12,           // mb-3 (3 * 4px)
                    gap: 8                      // gap-x-2 (2 * 4px), use only in RN 0.71+
                }}
                onPress={() => navigation.navigate("StepOne")}
            >
                <Icon name="envelope" size={20} color="white" className="mr-2" style={{ marginRight: 6 }}/>
                <Text style={{
                    color: '#FFFFFF',        // text-white
                    fontWeight: '600',       // font-semibold
                    fontSize: 14             // text-lg (18px typically)
                }}>
                    Sign up with Email
                </Text>
            </TouchableOpacity>

            <TouchableOpacity style={{
                width: '100%',
                backgroundColor: '#DC2626',   // Tailwind red-600
                paddingVertical: 12,          // py-3 → 3 × 4px = 12px
                borderRadius: 12,             // rounded-xl
                flexDirection: 'row',
                justifyContent: 'center',
                alignItems: 'center',
                marginBottom: 12,             // mb-3
                columnGap: 8,                 // gap-x-2 (React Native 0.71+)
            }}
            onPress={() => navigation.navigate("StepOne")}>
                <Text style={{
                    color: 'white',
                    fontWeight: '600', // 'semibold'
                    fontSize: 14,
                }}>
                    Already have account ? Login
                </Text>
            </TouchableOpacity>



            <View className="absolute bottom-5 flex items-center justify-center p-6">
                <Text style={{
                    fontSize: 12, padding: 10
                }}>By continuing with an account located in United Arab Emirates, You
                    agree to our <Text className="font-bold"
                        style={{
                            fontSize: 12
                        }}>Terms of Service</Text> and acknowledge that you have read our
                    <Text className="font-bold" style={{
                        fontSize: 12
                    }}> Privacy Policy</Text>.
                </Text>

            </View>
        </View>
    );
};

export default AuthScreen;
