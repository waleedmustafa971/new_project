import { View, Text, TouchableOpacity, FlatList, Image, StyleSheet } from 'react-native';
import React, { useState } from 'react';
import * as base from '../../component/global'
import Icon from 'react-native-vector-icons/Feather';
import FAIcon from 'react-native-vector-icons/FontAwesome';

const MotorsDashboardcars = ({ title, categorydata, navigation }) => {
    const [favorites, setFavorites] = useState([]);

    const toggleFavorite = (id) => {
        if (favorites.includes(id)) {
            setFavorites(favorites.filter((item) => item !== id));
        } else {
            setFavorites([...favorites, id]);
        }
    };

    const renderItem = ({ item }) => {
        const isFavorite = favorites.includes(item.id);

        return (
            <TouchableOpacity style={styles.card} onPress={() => {
                navigation.navigate("MotorsDetails", {
                    item: item
                })
            }}>
                {/* Background Image */}
                <Image source={{ uri: base.BASE_URL + item.images[0].image }} style={styles.image} />

                {/* Top Left Views */}
                {
                    item.price ?
                        <View style={styles.viewLabel}>
                            <Text style={styles.viewLabelText}>
                                {new Intl.NumberFormat('en-IN', {
                                    style: 'currency',
                                    currency: 'AED',
                                    maximumFractionDigits: 0, // optional: removes decimal if not needed
                                }).format(Number(item.price))}</Text>
                        </View> : null
                }


                {/* Top Right Favorite Icon */}
                <TouchableOpacity
                    style={styles.favoriteButton}
                    onPress={() => toggleFavorite(item.id)}
                >
                    <Icon
                        name="heart"
                        size={17} style={{ marginTop: 1 }}
                        color={isFavorite ? 'red' : 'black'} // red = favorite, black = not
                    />
                </TouchableOpacity>

                {/* Bottom Left Play Icon */}
                <TouchableOpacity style={styles.playButton}>
                    <FAIcon name="share-alt" size={18} color="black" />
                </TouchableOpacity>

                {/* Product Details */}
                <View style={styles.productDetails}>
                    <Text style={styles.productTitle} numberOfLines={1}
                        ellipsizeMode="tail">{item.shortTitle}</Text>
                    <View style={{ flexDirection: 'row' }}>
                        <Text style={styles.productPrice}>Year : {item.year} </Text>
                        <Text style={styles.productPrice}>Mileage : {item.kilometers} KM</Text>
                    </View>
                    <View style={{ flexDirection: 'row', marginTop: 3 }}>
                        <Icon name="map-pin" size={15} color="#555" style={styles.locationIcon} />
                        <Text
                            numberOfLines={1}
                            ellipsizeMode="tail"
                            style={{ flexShrink: 1 }}
                        >
                            {item.location}
                        </Text>
                    </View>
                </View>
            </TouchableOpacity>
        );
    };

    return (
        <FlatList
            data={categorydata}
            keyExtractor={(item) => item._id}
            renderItem={renderItem}
            numColumns={2}
            contentContainerStyle={{ padding: 10 }}
            columnWrapperStyle={{ justifyContent: 'space-between' }}
        />
    );
};

const styles = StyleSheet.create({
    card: {
        flex: 0.5, // This divides the row equally into 2
        margin: 5,
        borderWidth: 0,
        borderColor: 'red',
    },
    locationIcon: {
        marginRight: 5, marginTop: 3
    },
    image: {
        height: 231,
        width: '100%',
        borderTopLeftRadius: 10,
        borderTopRightRadius: 10
    },
    viewLabel: {
        position: 'absolute',
        top: 10,
        left: 10,
        backgroundColor: 'rgba(255, 255, 255, 0.8)',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 10,
    },
    viewLabelText: {
        fontSize: 14, fontWeight: 'bold',
        color: '#000',
    },
    favoriteButton: {
        position: 'absolute',
        top: 10,
        right: 10,
        backgroundColor: '#fff',
        padding: 6,
        borderRadius: 20,
    },
    playButton: {
        position: 'absolute',
        bottom: 70,
        left: 10,
        backgroundColor: '#fff',
        padding: 6,
        borderRadius: 20, width: 30, height: 30
    },
    productDetails: {
        marginTop: 0, flexDirection: 'column',
        justifyContent: 'space-between'
    },
    productTitle: {
        fontSize: 12,
        fontWeight: 'bold',
        color: '#000'
    },
    productPrice: {
        fontSize: 13,
        color: '#000',
        marginTop: 2,
    },
    productModel: {
        fontSize: 12,
        color: '#777',
        marginTop: 2,
    },
});

export default MotorsDashboardcars;
