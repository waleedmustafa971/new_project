import React, { useEffect, useState } from "react";
import { View, Text, Image, TouchableOpacity } from "react-native";
import Icondot from "react-native-vector-icons/MaterialIcons"; // your icon library
import { useSocket } from '../../screens/context/SocketContext';
import { useNavigation } from "@react-navigation/native";

interface ChatHeaderProps {
    type: string;
    userinfo: any; // or type your user info
    typing: boolean;
    partnerOnline?: boolean;
    partnerLastSeen?: string | null;
    onBackPress: () => void;
    onMorePress: () => void;
    // onlineUserIds: object;
}

const ChatHeaders: React.FC<ChatHeaderProps> = ({
    type,
    userinfo,
    typing,
    partnerOnline,
    partnerLastSeen,
    onBackPress,
    onMorePress
}) => {
    const navigation = useNavigation();
    const [onlineUserIds, setOnlineUserIds] = useState<string[]>([]);
    const { socket } = useSocket(); //global socket for apps
    //console.log('onlineUserIds ChatHeaders......', onlineUserIds)
    console.log("onlineUserIds:", onlineUserIds);
    console.log("partnerId:", userinfo?.partner?._id);
    console.log(
        "isOnline:",
        onlineUserIds.includes(String(userinfo?.partner?._id))
    );

    const formatLastSeen = (timestamp: string) => {
        if (!timestamp) return "";
        const lastSeenDate = new Date(timestamp);
        const now = new Date();
        const diffMs = now.getTime() - lastSeenDate.getTime();
        const diffMins = Math.floor(diffMs / 60000);
        const diffHours = Math.floor(diffMs / 3600000);

        if (diffMins < 1) return "just now";
        if (diffMins < 60) return `${diffMins} min ago`;
        if (diffHours < 24) return `${diffHours} h ago`;
        return lastSeenDate.toLocaleDateString();
    };

    /*  const getStatusText = () => {
         if (typing) return "Typing...";
 
         const isOnline = onlineUserIds.includes(userinfo?.partner?._id);
 
         if (isOnline) return "Online";
 
         if (partnerLastSeen) return `Last seen ${formatLastSeen(partnerLastSeen)}`;
 
         return "Offline";
     }; */

    const getStatusText = () => {
        if (typing) return "Typing...";

        //  const isOnline = onlineUserIds?.includes(userinfo?.partner?._id);
        const isOnline = onlineUserIds?.includes(
            String(userinfo?.partner?._id)
        );
        if (isOnline) return "Online";

        if (partnerLastSeen) {
            return `Last seen ${formatLastSeen(partnerLastSeen)}`;
        }

        return "Offline";
    };

    useEffect(() => {
        if (!socket) return;

        const handleOnlineUsers = (users: string[]) => {
            console.log("...Header.Socket..users......", users);
            // store online users
            setOnlineUserIds(users);
        };

        socket.on("onlineUsers", handleOnlineUsers);

        return () => {
            socket.off("onlineUsers", handleOnlineUsers);
        };
    }, [socket]);

    return (
        <View style={{ flexDirection: "row", alignItems: "center", padding: 10 }}>
            <TouchableOpacity onPress={onBackPress}>
                <Image source={require("../../assets/Back.png")}
                    style={{ marginRight: 10, marginTop: 0 }} />
            </TouchableOpacity>

            {type === "group" ? (
                <Image
                    source={{ uri: userinfo?.group?.groupimage || "" }}
                    style={{ width: 30, height: 30, borderRadius: 20, marginRight: 10 }}
                />
            ) : (
                <Image
                    source={
                        userinfo?.partner?.image
                            ? { uri: userinfo.partner.image }
                            : require("../../assets/user.png") // Path to your local asset
                    }
                    style={{ width: 30, height: 30, borderRadius: 20, marginRight: 10 }}
                />
            )}

            <TouchableOpacity style={{ flexDirection: "column", flex: 1 }} 
            onPress={() => {
                navigation.navigate("ViewChatProfile",{"partnerid": userinfo?.partner?._id,"partnername": userinfo?.partner?.name
                });
            }}>
                <Text style={{ fontWeight: "bold" }}>
                    {type === "group" ? userinfo?.group?.groupName : userinfo?.partner?.name}
                </Text>
                <Text style={{ fontSize: 12, color: "#666" }}>
                    {getStatusText()}
                </Text>
            </TouchableOpacity>

            <TouchableOpacity onPress={onMorePress}>
                <Icondot name="more-vert" size={24} color="#007AFF" />
            </TouchableOpacity>
        </View>
    );
};

export default ChatHeaders;