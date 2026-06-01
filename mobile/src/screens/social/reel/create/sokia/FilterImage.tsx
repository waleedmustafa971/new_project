import React, { memo } from 'react';
import { FlatList, TouchableOpacity, View, Text, StyleSheet } from 'react-native';
import { Canvas, Image, ColorMatrix } from "@shopify/react-native-skia";

const FilterImage = memo(({ filters, skImage, selectedMatrix, onSelect } : any) => {
    return (
        <View style={styles.filterBar}>
            <FlatList
                data={filters}
                horizontal
                contentContainerStyle={{ paddingHorizontal: 2, alignItems: 'center' }}
                showsHorizontalScrollIndicator={false}
                keyExtractor={(item) => item.id}
                renderItem={({ item }) => {
                    const isSelected = selectedMatrix === item.matrix;
                    return (
                        <TouchableOpacity onPress={() => onSelect(item.matrix)} style={styles.filterOption}>
                            <View style={[styles.previewCircle, { borderColor: isSelected ? '#007AFF' : 'transparent', borderWidth: 2 }]}>
                                <Canvas style={styles.miniCanvas}>
                                    <Image image={skImage} x={0} y={0} width={60} height={60} fit="cover">
                                        <ColorMatrix matrix={item.matrix} />
                                    </Image>
                                </Canvas>
                            </View>
                            <Text style={[styles.filterText, isSelected && { color: '#007AFF', fontWeight: 'bold' }]}>{item.name}</Text>
                        </TouchableOpacity>
                    );
                }}
            />
        </View>
    );
});


const styles = StyleSheet.create({
    container: {
        flex: 1
    },
    fullBlack: {
        flex: 1,
        backgroundColor: 'black',
        justifyContent: 'center',
        alignItems: 'center'
    },
    topOverlay: {
        position: 'absolute',
        top: 40, // Space for status bar
        left: 0,
        right: 0,
        flexDirection: 'row',
        justifyContent: 'space-between',
        paddingHorizontal: 15,
        zIndex: 10,
    },
    topRightActions: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    iconButton: {
        width: 42,
        height: 42,
        borderRadius: 21,
        backgroundColor: 'rgba(0,0,0,0.4)',
        justifyContent: 'center',
        alignItems: 'center',
        marginLeft: 12,
    },
    buttonText: { color: 'white', fontSize: 22, fontWeight: '300' },
    smallIcon: { color: 'white', fontSize: 18, fontWeight: '600' },
    doneButton: {
        backgroundColor: 'white',
        paddingHorizontal: 22,
        paddingVertical: 10,
        borderRadius: 25,
        marginLeft: 15,
    },
    doneText: { color: 'black', fontWeight: 'bold', fontSize: 15 },
    filterBar: {

    },
    filterOption: {
        alignItems: 'center',
        marginHorizontal: 3
    },
    previewCircle: {
        width: 65,
        height: 65,
        borderRadius: 12,
        overflow: 'hidden',
        backgroundColor: '#111'
    },
    miniCanvas: { width: 65, height: 65 },
    filterText: {
        color: '#ccc',
        fontSize: 11,
        marginTop: 6
    },
    retakeBtn: {
        alignSelf: 'center',
        paddingBottom: 30
    },
    retakeText: {
        color: '#666',
        fontSize: 12,
        fontWeight: 'bold',
        letterSpacing: 1
    },
    colorDot: { width: 30, height: 30, borderRadius: 15, borderWidth: 2, borderColor: 'white' },
    editorModal: { flex: 1, backgroundColor: 'rgba(0,0,0,0.85)', justifyContent: 'center', alignItems: 'center' },
    modalDone: { color: 'white', fontSize: 20, fontWeight: 'bold' },
    modalInput: { textAlign: 'center', width: '80%', fontWeight: 'bold' },
    toolBar: { position: 'absolute', bottom: 100, flexDirection: 'row', alignItems: 'center', width: '100%', justifyContent: 'space-evenly' },
    modalHeader: {
        position: 'absolute',
        top: 60,
        left: 20,
        right: 20,
        flexDirection: 'row',
        justifyContent: 'space-between', // Pushes Delete to left and Done to right
        alignItems: 'center',
    },
    deleteBtn: {
        padding: 10,
        backgroundColor: 'rgba(255, 0, 0, 0.1)', // Subtle red background
        borderRadius: 8,
    },
});


export default FilterImage;