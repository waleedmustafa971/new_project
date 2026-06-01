import React, { useState } from 'react';
import {
    View,
    Image,
    Text,
    TouchableOpacity, StyleSheet,
    Modal,
    Dimensions,
} from 'react-native';
import { Video } from 'react-native-video';
import * as base from '../../../component/global'
const { width, height } = Dimensions.get('window');

const isVideo = (uri) => uri.toLowerCase().endsWith('.mp4');

const MediaRenderer = ({ uri, style }) => {
   // console.log('URL...... ', uri)
    return isVideo(uri) ? (
        <Video
            source={{ uri }}
            rate={1.0}
            volume={1.0}
            isMuted={false}
            resizeMode="cover"
            shouldPlay={false}
            useNativeControls
            style={style}
        />
    ) : (
        <Image
             source={{ uri: base.BASE_URL + uri }}
            style={style}
            resizeMode="cover"
        />
    );
};

const FullscreenViewer = ({ uri, onClose, onNext, onPrev }) => {
    return (
        <View style={{
            flex: 1,
            backgroundColor: 'black',
            justifyContent: 'center',
            alignItems: 'center'
        }}>
            {isVideo(uri) ? (
                <Video
                    source={{ uri }}
                    shouldPlay
                    resizeMode="contain"
                    useNativeControls
                    isLooping
                    style={{ width, height: height * 0.7 }}
                />
            ) : (
                <Image
                    source={{ uri: base.BASE_URL + uri }}
                    style={{ width, height: height * 0.7, resizeMode: 'contain' }}
                />
            )}

            <View style={{
                position: 'absolute',
                top: 40,
                left: 16,
                right: 16,
                flexDirection: 'row',
                justifyContent: 'space-between',
                alignItems: 'center',
            }}>
                <TouchableOpacity onPress={onPrev}>
                    <Text style={{ color: 'white', fontSize: 40 }}>{'‹'}</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={onClose}>
                    <Text style={{ color: 'white', fontSize: 20 }}>✕</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={onNext}>
                    <Text style={{ color: 'white', fontSize: 40 }}>{'›'}</Text>
                </TouchableOpacity>
            </View>
        </View>
    );
};

const ImageGallery = ({ videoUrls = [] }) => {
    console.log('video url.... here image gallery' + JSON.stringify(videoUrls))
    const [modalVisible, setModalVisible] = useState(false);
    const [activeIndex, setActiveIndex] = useState(0);

    if (!videoUrls.length) return null;

    const visibleItems = videoUrls.slice(0, 3);
    const extraCount = videoUrls.length - 3;

    const openModal = (index) => {
        setActiveIndex(index);
        setModalVisible(true);
    };

    const closeModal = () => setModalVisible(false);

    const nextMedia = () => {
        setActiveIndex((prev) => (prev + 1) % videoUrls.length);
    };

    const prevMedia = () => {
        setActiveIndex((prev) => (prev - 1 + videoUrls.length) % videoUrls.length);
    };

    return (
        <>
            {videoUrls.length === 1 ? (
                <TouchableOpacity
                    style={styles.singleVideoContainer}
                    onPress={() => openModal(0)}
                >
                    <MediaRenderer uri={videoUrls[0]} style={styles.media} />
                </TouchableOpacity>
            ) : (
                <View style={styles.multipleVideosContainer}>
                    {/* Left large media */}
                    {visibleItems[0] && (
                        <TouchableOpacity style={[styles.flex1, styles.rightMargin]} onPress={() => openModal(0)}>
                            <MediaRenderer uri={visibleItems[0]} style={[styles.media, styles.borderRadius]} />
                        </TouchableOpacity>
                    )}

                    {/* Right stacked media */}
                    <View style={[styles.flex1, styles.justifyBetween, styles.leftMargin]}>
                        {visibleItems[1] && (
                            <TouchableOpacity style={[styles.flex1, styles.bottomMargin]} onPress={() => openModal(1)}>
                                <MediaRenderer uri={visibleItems[1]} style={[styles.media, styles.borderRadius]} />
                            </TouchableOpacity>
                        )}
                        {visibleItems[2] && (
                            <TouchableOpacity style={[styles.flex1, styles.relative]} onPress={() => openModal(2)}>
                                <MediaRenderer uri={visibleItems[2]} style={[styles.media, styles.borderRadius]} />
                                {extraCount > 0 && (
                                    <View style={styles.overlay}>
                                        <Text style={styles.overlayText}>+{extraCount}</Text>
                                    </View>
                                )}
                            </TouchableOpacity>
                        )}
                    </View>
                </View>
            )}

            {/* Fullscreen Modal */}
            {modalVisible && (
                <Modal visible={modalVisible} transparent animationType="fade">
                    <FullscreenViewer
                        uri={videoUrls[activeIndex]}
                        onClose={closeModal}
                        onNext={nextMedia}
                        onPrev={prevMedia}
                    />
                </Modal>
            )}
        </>
    );
};
const styles = StyleSheet.create({
    singleVideoContainer: {
        width: '100%',
        height: 200,
        borderRadius: 8,
        overflow: 'hidden',
    },
    multipleVideosContainer: {
        height: 200,
        flexDirection: 'row',
        overflow: 'hidden',
        borderRadius: 8,
    },
    media: {
        width: '100%',
        height: '100%',
    },
    borderRadius: {
        borderRadius: 8,
    },
    flex1: {
        flex: 1,
    },
    rightMargin: {
        marginRight: 8, // approx mr-1
    },
    leftMargin: {
        marginLeft: 8, // approx ml-1
    },
    bottomMargin: {
        marginBottom: 8, // approx mb-1
    },
    justifyBetween: {
        justifyContent: 'space-between',
    },
    relative: {
        position: 'relative',
    },
    overlay: {
        position: 'absolute',
        top: 0, left: 0, right: 0, bottom: 0,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'center',
        alignItems: 'center',
        borderRadius: 8,
    },
    overlayText: {
        color: 'white',
        fontSize: 18,
        fontWeight: 'bold',
    },
});
export default ImageGallery;
