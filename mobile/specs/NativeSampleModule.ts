import {TurboModule, TurboModuleRegistry} from 'react-native';

export interface Spec extends TurboModule {
  readonly reverseString: (input: string) => string;
  // Get video duration in seconds
  readonly getVideoDuration: (uri: string) => number;
  // Main processing: trim, add audio, and add text
  
  readonly processVideo: (
    input: string,
    output: string,
    start: number,
    duration: number,
    audioUri: string,
    overlayText: string,
    fontPath: string
  ) => string; // Removed Promise

   // ✅ New: extract a single frame thumbnail at a specific second
  readonly getThumbnail: (
    input: string,
    output: string,
    second: number
  ) => string;

 /*  readonly applyGreenScreen: (
  foreground: string,
  background: string,
  output: string,
  chromaColor: string
) => string; */
 readonly applyGreenScreen: (
  foreground: string,
  background: string,
  output: string,
  chromaColor: string,
  isImageBackground: boolean
) => Promise<string>;



   // ✅ Add this new method
  readonly trimVideoMinimal: (
    input: string,
    output: string,
    start: number,
    duration: number
  ) => string; // returns output path or error string

   // ✅ ADD THIS
  readonly decodeVideoFrames: (input: string) => string;


}

export default TurboModuleRegistry.getEnforcing<Spec>('NativeSampleModule');