import React from 'react';
import { View, Dimensions, Image, StyleSheet } from 'react-native';
import Carousel from 'react-native-reanimated-carousel';

const PADDING = 10;
const { width } = Dimensions.get('window');
const adjustedWidth = width - PADDING * 2;


export default function Slider({ sliderdata, url }) {
    console.log('...category...' + sliderdata)
    return (
        <View style={styles.container}>
            <Carousel
                loop
                width={adjustedWidth}
                height={200}
                autoPlay={true}
                data={sliderdata}
                scrollAnimationDuration={1000}
                renderItem={({ item }) => {
                    
                    // Extract first image
                    const imageUrl = item?.image?.[0]
                        ? `${url}/uploads/slider/optimized/${item.image[0]}`
                        : null;

                    return (
                        <Image
                            source={{ uri: imageUrl }}
                            style={[styles.image, { width: adjustedWidth }]}
                            resizeMode="stretch"
                        />
                    );
                }}
            />
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        marginTop: 0
    },
    image: {
        width: width,
        height: 200,
        borderRadius: 10,
        backgroundColor: '#ccc',
    },
});
