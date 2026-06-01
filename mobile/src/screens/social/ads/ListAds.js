import React, { useState } from 'react';
import { View, Text, TouchableOpacity, FlatList, StyleSheet } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useRoute } from '@react-navigation/native';
import SimpleAds from './template/SimpleAds';

const ListAds = () => {
    const [activeTab, setActiveTab] = useState('Create');
    const route = useRoute();
    const { userId } = route.params;
    const navigation = useNavigation();
    const logo = require('../../../assets/user.png');
    const [adsForm,setAdsForm] = useState(false)

    const templates = [
        { id: '1', title: 'Simple' },
        { id: '2', title: 'Standard' }
    ];
    const handleFrom = (item) => {
        if(item.title == "Simple")
        {
            setAdsForm(true)
        }
    }

    return (
        <View style={styles.container}>

            {/* Top Tabs */}
            <View style={styles.tabContainer}>
                <TouchableOpacity
                    style={[styles.tabButton, activeTab === 'Create' && styles.activeTab]}
                    onPress={() => setActiveTab('Create')}
                >
                    <Text style={[styles.tabText, activeTab === 'Create' && styles.activeTabText]}>Create</Text>
                </TouchableOpacity>

                <TouchableOpacity
                    style={[styles.tabButton, activeTab === 'Manage' && styles.activeTab]}
                    onPress={() => setActiveTab('Manage')}
                >
                    <Text style={[styles.tabText, activeTab === 'Manage' && styles.activeTabText]}>Manage</Text>
                </TouchableOpacity>
            </View>

            {/* Tab Content */}
            {activeTab === 'Create' ? (
                <View style={{ marginTop: 20 }}>
                    <FlatList
                        data={templates}
                        keyExtractor={(item) => item.id}
                        numColumns={1}
                        renderItem={({ item }) => (
                            <>
                            <TouchableOpacity style={styles.templateBox} onPress={() => {
                                handleFrom(item)
                            }}>
                                <Text style={styles.templateText}>{item.title}</Text>
                            </TouchableOpacity>
                           
                           
                            </>
                          
                        )}
                        contentContainerStyle={{ paddingBottom: 20 }} // Optional padding at the bottom
                    />
                    {
                        adsForm ?
                        <SimpleAds />
                        : null
                    }

                </View>
            ) : (
                <View style={styles.manageContainer}>
                    <Text style={{ fontSize: 16 }}>Manage your Ads here</Text>
                </View>
            )}
        </View>
    );
};

export default ListAds;

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#fff' },

    tabContainer: { flexDirection: 'row', justifyContent: 'space-around', paddingVertical: 10, backgroundColor: '#f5f5f5' },

    tabButton: { paddingVertical: 10, paddingHorizontal: 20, borderRadius: 20 },

    activeTab: { backgroundColor: '#007bff' },

    tabText: { fontSize: 16, color: '#000' },

    activeTabText: { color: '#fff', fontWeight: 'bold' },

    templateBox: {
        backgroundColor: '#e0e0e0',
        padding: 20,
        margin: 10,
        borderRadius: 10,
        alignItems: 'center',
        width: 150
    },

    templateText: { fontSize: 14, fontWeight: '600' },

    manageContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' }
});
