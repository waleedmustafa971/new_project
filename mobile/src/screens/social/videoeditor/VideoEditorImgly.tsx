import React from 'react';
import { View, Text, Button } from 'react-native';
import { launchImageLibrary } from 'react-native-image-picker';

import IMGLYEditor, {
    EditorPreset,
    EditorSettingsModel,
    SourceType,
} from '@imgly/editor-react-native';
import { SDK_APP_ID } from '../../../component/global';

const VideoEditorImgly = () => {
    const imagefile = require('../../../assets/map/map-blur.png')

    const openEditor_off = async () => {
        try {
            const settings = new EditorSettingsModel({
                license: SDK_APP_ID,
                userId: '101',
            });

            const result = await IMGLYEditor.openEditor(
                settings,
                {
                    source: imagefile,
                    type: SourceType.IMAGE,
                },
                EditorPreset.DESIGN
            );

            console.log('Editor result:', result);
        } catch (e) {
            console.error('Editor error:', e);
        }
    };


    const openEditor = async (uri: string, mimeType?: string) => {
        try {
            const settings = new EditorSettingsModel({
                license: 'pzZxif9sqOwwNcOUBptixR13lgdJ4zv7LVmO0qkxSecZo-afJit024lqnulZ2zKj', // or null for watermark mode
                userId: '101',
            });

            const isVideo = mimeType?.startsWith('video');

            const result = await IMGLYEditor.openEditor(
                settings,
                {
                    source: uri,
                    type: isVideo ? SourceType.VIDEO : SourceType.IMAGE,
                },
                isVideo ? EditorPreset.VIDEO : EditorPreset.DESIGN
            );

            console.log('Editor result:', result);
        } catch (e) {
            console.error('Editor error:', e);
        }
    };

    const openPicker = async () => {
        const result = await launchImageLibrary({
            mediaType: 'mixed', // 👈 allows image + video
        });
        const asset = result.assets?.[0];
        if (!asset?.uri) return;
        openEditor(asset.uri, asset.type);
    };

    return (
        <View>
            <Text>VideoEditorImgly</Text>
           {/*  <Button title="Open Editor" onPress={openEditor} /> */}
            <Button title="Pick Image or Video" onPress={openPicker} />

        </View>
    );
};

export default VideoEditorImgly;