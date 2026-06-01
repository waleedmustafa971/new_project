import React from 'react';
import { View, Text, FlatList, Image, StyleSheet, TouchableOpacity } from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { useNavigation } from '@react-navigation/native';

const notifications = [
    { id: '1', type: 'like', user: 'John Doe', time: '2 min ago', avatar: require('../../../assets/user.png'), description: 'liked your post.' },
    { id: '2', type: 'follow', user: 'Jane Smith', time: '10 min ago', avatar: require('../../../assets/user.png'), description: 'started following you.' },
    { id: '3', type: 'comment', user: 'Alex Johnson', time: '1 hour ago', avatar: require('../../../assets/user.png'), description: 'commented: "Awesome work!"' },
    { id: '4', type: 'like', user: 'Emily Brown', time: 'Today', avatar: require('../../../assets/user.png'), description: 'liked your video.' },
    { id: '5', type: 'follow', user: 'Chris Evans', time: 'Yesterday', avatar: require('../../../assets/user.png'), description: 'started following you.' },
];

const NotificationPage = () => {
    const navigation = useNavigation()
   
    const renderItem = ({ item }) => (
        <View style={styles.notificationItem}>
            <Image source={item.avatar} style={styles.avatar} />
            <View style={styles.textContainer}>
                <Text style={styles.notificationText}>
                    <Text style={styles.username}>{item.user}</Text> {item.description}
                </Text>
                <Text style={styles.timeText}>{item.time}</Text>
            </View>
            <TouchableOpacity style={styles.moreButton}>
                <Ionicons name="ellipsis-horizontal" size={20} color="#555" />
            </TouchableOpacity>
        </View>
    );

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()}>
                    <Ionicons name="arrow-back" size={20} color="black" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Notifications</Text>
            </View>

            <FlatList
                data={notifications}
                keyExtractor={(item) => item.id}
                renderItem={renderItem}
                contentContainerStyle={{ padding: 15 }}
                ItemSeparatorComponent={() => <View style={styles.separator} />}
            />
        </View>
    );
};

export default NotificationPage;

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#fff' },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 15,
        borderBottomWidth: 1,
        borderBottomColor: '#eee',
    },
    headerTitle: { fontSize: 12, fontWeight: 'bold', marginLeft: 15 },
    notificationItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 10,
    },
    avatar: {
        width: 50,
        height: 50,
        borderRadius: 25,
        marginRight: 15,
    },
    textContainer: { flex: 1 },
    notificationText: { fontSize: 12, color: '#333' },
    username: { fontWeight: 'bold', color: '#000' },
    timeText: { color: '#999', fontSize: 12, marginTop: 5 },
    moreButton: { padding: 5 },
    separator: { height: 1, backgroundColor: '#f0f0f0', marginVertical: 5 },
});
