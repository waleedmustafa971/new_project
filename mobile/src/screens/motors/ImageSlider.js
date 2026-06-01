import React, { useState } from 'react';
import {
  View,
  FlatList,
  TouchableOpacity,
  Image,
  StyleSheet,
  Dimensions,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons'; // Or any icon set you prefer
import ImageViewing from 'react-native-image-viewing';
import * as base from '../../component/global'

const { width } = Dimensions.get('window');

const ImageGallery = ({ images, navigation }) => {
  const [visible, setVisible] = useState(false);
  const [imageIndex, setImageIndex] = useState(0);
  const [liked, setLiked] = useState(false);
const [currentIndex, setCurrentIndex] = useState(0);
  // Convert image list to full URLs for image viewer
  const imageUrls = images.map((img) => ({
    uri: base.BASE_URL + img.image, // Replace with base URL
  }));

  const openImage = (index) => {
    setImageIndex(index);
    setVisible(true);
  };

  const renderItem = ({ item, index }) => (
    <TouchableOpacity onPress={() => openImage(index)}>
      <Image
        source={{ uri: base.BASE_URL +  item.image }}
        style={styles.image}
      />
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      {/* Image Slider */}
     <FlatList
  horizontal
  pagingEnabled
  data={images}
  renderItem={renderItem}
  keyExtractor={(item) => item._id}
  showsHorizontalScrollIndicator={false}
  onScroll={(e) => {
    const index = Math.round(
      e.nativeEvent.contentOffset.x / Dimensions.get('window').width
    );
    setCurrentIndex(index);
  }}
  scrollEventThrottle={16}
/>


      {/* Top Icons Overlaid */}
      <View style={styles.topIcons}>
        <TouchableOpacity
          style={styles.iconButton}
          onPress={() => navigation.navigate("Motors")}
        >
          <Icon name="chevron-back" size={18} color="#fff" />
        </TouchableOpacity>

      {/*   <View style={styles.rightIcons}>
          <TouchableOpacity
            style={styles.iconButton}
            onPress={() => console.log('Loved')}
          >
            <Icon name="heart-outline" size={18} color="#fff" />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.iconButton}
            onPress={() => console.log('Shared')}
          >
            <Icon
              name={liked ? 'share-social' : 'share-social-outline'}
              size={18}
              color={liked ? '#3498db' : '#ffffff'}
            />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.iconButton}
            onPress={() => setLiked(!liked)}
          >
            <Icon
              name={liked ? 'bookmark' : 'bookmark-outline'}
              size={18}
              color={liked ? '#3498db' : '#ffffff'}
            />
          </TouchableOpacity>
        </View> */}
      </View>
<View style={styles.dotContainer}>
  {images.map((_, index) => (
    <View
      key={index}
      style={[
        styles.dot,
        currentIndex === index && styles.activeDot
      ]}
    />
  ))}
</View>

      {/* Fullscreen Popup Viewer */}
      <ImageViewing
        images={imageUrls}
        imageIndex={imageIndex}
        visible={visible}
        onRequestClose={() => setVisible(false)}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'relative',
    backgroundColor: '#000',
  },
  image: {
    width: width,
    height: 300,
    resizeMode: 'cover',
  },
  topIcons: {
    position: 'absolute',
    top: 20,
    left: 15,
    right: 15,
    flexDirection: 'row',
    justifyContent: 'space-between',
    zIndex: 10,
  },
  rightIcons: {
    flexDirection: 'row',
    gap: 10,
  },
  iconButton: {
    backgroundColor: 'rgba(0,0,0,0.5)',
    padding: 6,
    borderRadius: 20,
    marginLeft: 8, width: 30, height: 30
  },
  dotContainer: {
  position: 'absolute',
  bottom: 15,
  width: '100%',
  flexDirection: 'row',
  justifyContent: 'center',
  alignItems: 'center',
},
dot: {
  width: 8,
  height: 8,
  borderRadius: 4,
  backgroundColor: '#ccc',
  marginHorizontal: 4,
},
activeDot: {
  backgroundColor: '#fff',
  width: 10,
  height: 10,
},

});

export default ImageGallery;
