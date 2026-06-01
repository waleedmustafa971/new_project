import React from 'react';
import {
    Modal,
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    Dimensions, TouchableWithoutFeedback
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';

const { height } = Dimensions.get('window');

const GroupModal = ({ visible, onClose, onStart }) => {
    return (
        <Modal
            visible={visible}
            animationType="slide"
            transparent
            onRequestClose={onClose}
        >
            <TouchableWithoutFeedback onPress={onClose}>
                <View style={styles.overlay}>
                    <View style={styles.modalContainer}>
                        {/* Icon Row */}
                        <View style={styles.iconWrapper}>
                            <View style={styles.iconCircle}>
                                <Icon name="people-outline" size={30} color="#fff" />
                            </View>
                        </View>

                        {/* Title */}
                        <Text style={styles.title}>Create a new Group</Text>

                        {/* Description */}
                        <Text style={styles.description}>
                            Bring together a neighborhood, school or more. Create topic-based
                            groups for members, and easily send them admin announcements.
                        </Text>

                        {/* Start Button */}
                        <TouchableOpacity style={styles.button} onPress={onStart}>
                            <Text style={styles.buttonText}>Get Started</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </TouchableWithoutFeedback>
        </Modal>
    );
};

export default GroupModal;

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        justifyContent: 'flex-end',
        backgroundColor: 'rgba(0,0,0,0.3)',
    },
    modalContainer: {
        // height: height * 0.5,
        height: 250,
        backgroundColor: '#fff',
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
        padding: 20,
    },
    iconWrapper: {
        alignItems: 'center',
        marginBottom: 15,
    },
    iconCircle: {
        width: 60,
        height: 60,
        borderRadius: 30,
        backgroundColor: '#25D366',
        justifyContent: 'center',
        alignItems: 'center',
    },
    title: {
        fontSize: 20,
        fontWeight: '600',
        textAlign: 'center',
        marginBottom: 10,
    },
    description: {
        textAlign: 'center',
        fontSize: 14,
        color: '#555',
        marginBottom: 20,
        paddingHorizontal: 10,
    },
    button: {
        backgroundColor: '#25D366',
        paddingVertical: 12,
        borderRadius: 8,
        marginHorizontal: 40,
        alignItems: 'center',
        marginTop: 'auto',
    },
    buttonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '500',
    },
});
