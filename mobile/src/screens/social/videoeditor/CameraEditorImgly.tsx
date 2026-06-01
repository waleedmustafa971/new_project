import React from 'react';
import {
    View,
    Text,
    Button,
    PermissionsAndroid,
    Platform,
    Alert,
} from 'react-native';

import IMGLYCamera, { CameraSettings } from '@imgly/camera-react-native';
import IMGLYEditor, {
    EditorPreset,
    EditorSettingsModel,
    SourceType,
} from '@imgly/editor-react-native';
import { SDK_APP_ID } from '../../../component/global';

const LICENSE = SDK_APP_ID;

const CameraEditorImgly = () => {

    // ✅ Request permissions (Android)
    const requestPermissions = async () => {
        if (Platform.OS !== 'android') return true;

        try {
            const permissions: string[] = [
                PermissionsAndroid.PERMISSIONS.CAMERA,
                PermissionsAndroid.PERMISSIONS.RECORD_AUDIO,
            ];

            if (Platform.Version >= 33) {
                permissions.push(PermissionsAndroid.PERMISSIONS.READ_MEDIA_IMAGES);
                permissions.push(PermissionsAndroid.PERMISSIONS.READ_MEDIA_VIDEO);
            } else {
                permissions.push(PermissionsAndroid.PERMISSIONS.WRITE_EXTERNAL_STORAGE);
                permissions.push(PermissionsAndroid.PERMISSIONS.READ_EXTERNAL_STORAGE);
            }

            const result = await PermissionsAndroid.requestMultiple(permissions);

            console.log('Permission result:', result);

            const allGranted = Object.values(result).every(
                status => status === PermissionsAndroid.RESULTS.GRANTED
            );

            return allGranted;
        } catch (err) {
            console.warn(err);
            return false;
        }
    };


    const openCamera = async () => {
        await IMGLYCamera.openCamera({
            license: LICENSE,
            userId: '101',
        });
    };

    return (
        <View
            style={{
                flex: 1,
                justifyContent: 'center',
                alignItems: 'center',
            }}
        >
            <Text style={{ marginBottom: 20 }}>
                IMG.LY Camera → Editor Flow
            </Text>

            <Button title="Open Camera" onPress={openCamera} />
        </View>
    );
};

export default CameraEditorImgly;