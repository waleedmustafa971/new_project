import React from "react";
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
    onCall?: (kind: "audio" | "video") => void;
    // onlineUserIds: object;
}

const ChatHeaders: React.FC<ChatHeaderProps> = ({
    type,
    userinfo,
    typing,
    partnerOnline,
    partnerLastSeen,
    onBackPress,
    onMorePress,
    onCall
}) => {
    const navigation = useNavigation();
    /* The roster comes from SocketContext, which holds one subscription for the
       whole session and asks the server for it on every connect. This screen
       used to subscribe on mount and wait for a broadcast that only fires when
       somebody's connection changes — so it usually never arrived. */
    const { isUserOnline } = useSocket();

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

    const getStatusText = () => {
        if (typing) return "Typing...";

        if (isUserOnline(userinfo?.partner?._id)) return "Online";

        if (partnerLastSeen) {
            return `Last seen ${formatLastSeen(partnerLastSeen)}`;
        }

        return "Offline";
    };

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

            {/* Voice and video sit next to the name, where every messenger
                puts them, and only on a one-to-one chat: the call backend
                takes a group id too, but nothing in the app picks members
                yet, so offering it on a group would open a call that cannot
                be filled. */}
            {onCall && type !== "group" && (
                <>
                    <TouchableOpacity
                        onPress={() => onCall("audio")}
                        hitSlop={8}
                        accessibilityLabel="Voice call"
                    >
                        <Icondot name="call" size={22} color="#007AFF" />
                    </TouchableOpacity>
                    <TouchableOpacity
                        onPress={() => onCall("video")}
                        hitSlop={8}
                        style={{ marginLeft: 16 }}
                        accessibilityLabel="Video call"
                    >
                        <Icondot name="videocam" size={24} color="#007AFF" />
                    </TouchableOpacity>
                </>
            )}

            <TouchableOpacity onPress={onMorePress} style={{ marginLeft: 16 }}>
                <Icondot name="more-vert" size={24} color="#007AFF" />
            </TouchableOpacity>
        </View>
    );
};

export default ChatHeaders;