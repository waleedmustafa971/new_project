import React from 'react';
import {
    Modal,
    View,
    Text,
    TouchableOpacity,
    StyleSheet,
} from 'react-native';
import CustomDistanceSlider from './CustomDistanceSlider';

type LocationFilterModalProps = {
    visible: boolean;
    distance: number;
    setDistance: (value: number) => void;
    onApply: () => void;
    onClose: () => void;
};

const LocationFilterModal: React.FC<LocationFilterModalProps> = ({
    visible,
    onApply,
    onClose,
    distance,
    setDistance
}) => {
    return (
        <Modal
            visible={visible}
            transparent
            animationType="slide"
            onRequestClose={onClose}
        >
            <View style={styles.modalOverlay}>
                <View style={styles.modalBox}>
                    <Text style={styles.title}>Select Distance</Text>

                    {/* Distance text */}
                    <Text style={styles.kmText}>{distance} KM</Text>

                 <CustomDistanceSlider
    value={distance}
    min={1}
    max={10}
    onChange={setDistance} // now this works
/>



                    <Text style={styles.rangeText}>1 KM – 10 KM</Text>

                    {/* Buttons */}
                    <View style={styles.buttonRow}>
                        <TouchableOpacity
                            style={styles.cancelBtn}
                            onPress={onClose}
                        >
                            <Text style={styles.cancelText}>Cancel</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={styles.applyBtn}
                            onPress={onApply}
                        >
                            <Text style={styles.applyText}>Apply</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </View>
        </Modal>
    );
};

export default LocationFilterModal;

const styles = StyleSheet.create({
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.4)',
        justifyContent: 'flex-end',
    },
    modalBox: {
        backgroundColor: '#fff',
        padding: 20,
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
    },
    title: {
        fontSize: 18,
        fontWeight: '600',
        textAlign: 'center',
        marginBottom: 16,
    },
    kmText: {
        fontSize: 22,
        fontWeight: '700',
        textAlign: 'center',
        marginBottom: 10,
    },
    slider: {
        width: '100%',
        height: 40,
    },
    rangeText: {
        textAlign: 'center',
        color: '#888',
        fontSize: 12,
        marginTop: 6,
    },
    buttonRow: {
        flexDirection: 'row',
        marginTop: 20,
    },
    cancelBtn: {
        flex: 1,
        paddingVertical: 14,
        borderRadius: 10,
        borderWidth: 1,
        borderColor: '#ccc',
        marginRight: 10,
    },
    cancelText: {
        textAlign: 'center',
        fontSize: 16,
        color: '#555',
        fontWeight: '500',
    },
    applyBtn: {
        flex: 1,
        backgroundColor: '#007AFF',
        paddingVertical: 14,
        borderRadius: 10,
        marginLeft: 10,
    },
    applyText: {
        textAlign: 'center',
        fontSize: 16,
        color: '#fff',
        fontWeight: '600',
    },
});
