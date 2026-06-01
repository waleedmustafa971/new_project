import React, { useState, useEffect } from 'react';
import {
    View, Text, TouchableOpacity, FlatList, Image,
    StyleSheet, ActivityIndicator, Alert,
    Modal
} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { useNavigation } from '@react-navigation/native';
import axios from 'axios';
import * as ImagePicker from 'react-native-image-picker';
import * as base from '../../../component/global'
import Toast from 'react-native-toast-message';
import ImageViewer from 'react-native-image-zoom-viewer';
import { useRoute } from '@react-navigation/native';

const GalleryScreen = () => {
     const route = useRoute();
    const { userId } = route.params;
    const navigation = useNavigation();
    const [gallery, setGallery] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
  //  const userId = '67f772ab25b7e3f3b5f04783'; // Replace with your logic (Redux/AsyncStorage)
    const [uploadProgress, setUploadProgress] = useState(0);
    const [uploading, setUploading] = useState(false);
    const [isVisible, setIsVisible] = useState(false);
    const [currentIndex, setCurrentIndex] = useState(0);
    //const [userId,setUserId] = useState(null)

    useEffect(() => {
       // checkUser();
        fetchGallery(page);
    }, [page]);

    const checkUser = async() => {
        
    
      }


    const openImageViewer = (index) => {
        setCurrentIndex(index);
        setIsVisible(true);
    };

    const closeImageViewer = () => {
        //Alert.alert('dddd')
        setIsVisible(false);
    };

    // Convert gallery to imageViewer format
    const imageViewerData = gallery.map(img => ({
        url: img,
    }));

    const fetchGallery = async (currentPage) => {
        try {
            setIsLoading(true);
            const response = await axios.get(base.BASE_URL + `/apis/gallery/get-gallery`, {
                params: { page: currentPage, limit: 24, userid: userId }
            });

            const { gallery: newImages, totalPages } = response.data;

            // Prepend full URL to each image
            const fullImageUrls = newImages.map(img => `${base.BASE_URL}/uploads/gallery/${img}`);

            console.log('...gallery...', fullImageUrls);

            setGallery(prev => currentPage === 1 ? fullImageUrls : [...prev, ...fullImageUrls]);
            setTotalPages(totalPages);

        } catch (error) {
            console.error('Error fetching gallery:', error.message);
        } finally {
            setIsLoading(false);
        }
    };


    const handleLoadMore = () => {
        if (!isLoading && page < totalPages) {
            setPage(prev => prev + 1);
        }
    };

    const addImage = async () => {
        ImagePicker.launchImageLibrary({ mediaType: 'photo' }, async (response) => {
            if (response.didCancel || response.errorCode) return;

            const asset = response.assets[0];

            // Remove file:// prefix if present
            let imageUri = asset.uri;
            if (imageUri.startsWith('file://')) {
                imageUri = imageUri.replace('file://', '');
            }

            console.log('Uploading image:', imageUri);

            const formData = new FormData();
            formData.append('gallery', {
                uri: asset.uri, // Use the original URI here (file:// is acceptable for RN FS)
                type: asset.type || 'image/jpeg', // Fallback if type is undefined
                name: asset.fileName || `gallery_${Date.now()}.jpg`, // Fallback if fileName is undefined
            });
            formData.append('userid', userId);

            try {
                setUploadProgress(0);
                setUploading(true);
                await axios.post(`${base.BASE_URL}/apis/gallery/add-gallery`, formData, {
                    headers: { 'Content-Type': 'multipart/form-data' },
                    onUploadProgress: (progressEvent) => {
                        const progress = Math.round((progressEvent.loaded / progressEvent.total) * 100);
                        setUploadProgress(progress);
                    }
                });
                Toast.show({
                    type: 'success',
                    text1: 'Image uploaded successfully',
                    position: 'bottom',
                });
                // Force reload gallery
                fetchGallery(1);
                setPage(1);
            } catch (error) {
                console.log('Upload error: ', error);
                Alert.alert('Error', 'Failed to upload image');
            }
            finally {
                setUploading(false);
            }
        });
    };


    const deleteImage = async (imageUrl) => {
        // Extract only the filename from the URL
        const imageId = imageUrl.replace(`${base.BASE_URL}/uploads/gallery/`, '');
        //    Alert.alert(imageId)
        //    return
        Alert.alert(
            'Confirm Delete',
            'Are you sure you want to delete this image?',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Delete',
                    onPress: async () => {
                        try {
                            await axios.delete(`${base.BASE_URL}/apis/gallery/delete-gallery?userid=${userId}&imageid=${imageId}`);
                            Alert.alert('Deleted', 'Image has been removed');
                              fetchGallery(1);
                              setPage(1);
                            //setGallery(prev => prev.filter(img => img !== imageId)); // You should compare with imageId
                        } catch (error) {
                            Alert.alert('Error', 'Failed to delete image: ' + error.message);
                        }

                    },
                    style: 'destructive'
                }
            ]
        );
    };


    const renderItem = ({ item, index }) => (
        <View style={styles.imageContainer} key={index}>
            <TouchableOpacity onPress={() => openImageViewer(index)}>
                <Image source={{ uri: item }} style={styles.image} />
            </TouchableOpacity>
            <View style={styles.overlay}>
                <Text style={styles.viewCount}>{item.views || 0} Views </Text>
                <TouchableOpacity onPress={() => deleteImage(item)}>
                    <Ionicons name="trash-outline" size={20} color="white" />
                </TouchableOpacity>
            </View>
        </View>
    );



    return (
        <View style={styles.container}>
            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.leftIcon}>
                    <Ionicons name="arrow-back" size={24} color="#000" />
                </TouchableOpacity>
                <Text style={styles.title}>My Gallery</Text>
                <TouchableOpacity onPress={addImage} style={styles.rightIcon}>
                    <Ionicons name="add" size={30} color="#000" />
                </TouchableOpacity>
            </View>

            {/* Gallery Grid */}
            {uploading && (
                <View style={{ padding: 10 }}>
                    <Text style={{ marginBottom: 5 }}>Uploading: {uploadProgress}%</Text>
                    <View style={{
                        height: 10,
                        width: '100%',
                        backgroundColor: '#ddd',
                        borderRadius: 5,
                        overflow: 'hidden'
                    }}>
                        <View style={{
                            height: 10,
                            width: `${uploadProgress}%`,
                            backgroundColor: '#4caf50',
                        }} />
                    </View>
                </View>
            )}

            <FlatList
                data={gallery}
                keyExtractor={(item, index) => index}
                renderItem={renderItem}
                numColumns={4}
                onEndReached={handleLoadMore}
                onEndReachedThreshold={0.5}
                ListFooterComponent={isLoading ? <ActivityIndicator size="large" color="#0000ff" /> : null}
                contentContainerStyle={{ paddingBottom: 20 }}
                ListEmptyComponent={
                    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 }}>
                        <Text style={{ fontSize: 16, color: '#555', textAlign: 'center', marginBottom: 20 }}>
                            You don't have any images.{"\n"}If you want to add an image, click the plus icon.
                        </Text>
                        <TouchableOpacity
                            onPress={addImage}
                            style={{
                                backgroundColor: '#2196F3',
                                padding: 15,
                                borderRadius: 50,
                            }}
                        >
                            <Ionicons name="add" size={30} color="white" />
                        </TouchableOpacity>
                    </View>
                }
            />
            <Toast />

            <Modal visible={isVisible} transparent={true} onRequestClose={closeImageViewer}>
                <View style={{ flex: 1, backgroundColor: 'black' }}>
                    {/* Top Bar: Index on the left, Close on the right */}
                    <View style={{
                        position: 'absolute',
                        top: 40,
                        left: 0,
                        right: 0,
                        flexDirection: 'row',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        paddingHorizontal: 20,
                        zIndex: 10
                    }}>
                        {/* Index Number */}
                        {/*   <Text style={{ color: 'white', fontSize: 18 }}>
                            {currentIndex + 1} / {imageViewerData.length}
                        </Text> */}

                        {/* Close Button */}
                        <TouchableOpacity onPress={closeImageViewer}>
                            <Ionicons name="close-circle" size={40} color="white" />
                        </TouchableOpacity>
                    </View>

                    {/* Image Viewer */}
                    <ImageViewer
                        imageUrls={imageViewerData}
                        index={currentIndex}
                        onSwipeDown={closeImageViewer}
                        enableSwipeDown={true}
                        onCancel={closeImageViewer}
                        saveToLocalByLongPress={false}
                        onChange={index => setCurrentIndex(index)} // Track current image index
                    />
                </View>
            </Modal>

        </View>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#fff' },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: 15,
        borderBottomWidth: 1,
        borderColor: '#ddd',
    },
    leftIcon: { flex: 1 },
    title: { flex: 3, textAlign: 'center', fontSize: 16, fontWeight: 'bold' },
    rightIcon: { flex: 1, alignItems: 'flex-end' },

    imageContainer: {
        flex: 1 / 4,
        aspectRatio: 1,
        margin: 2,
        position: 'relative',
    },
    image: { width: '100%', height: '100%', borderRadius: 5 },
    overlay: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        backgroundColor: 'rgba(0,0,0,0.5)',
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 5,
        paddingVertical: 2,
        borderBottomLeftRadius: 5,
        borderBottomRightRadius: 5,
    },
    viewCount: { color: '#fff', fontSize: 12 },
});

export default GalleryScreen;
