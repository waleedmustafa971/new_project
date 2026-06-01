// MediaController.js
import Sound from 'react-native-sound';

class MediaController {
  audioPlayer = null;
  videoPlayerRef = null;

  // --- AUDIO CONTROL ---
  async playAudio(uri, onFinishCallback = null) {
    await this.stopAllMedia();

    return new Promise((resolve, reject) => {
      this.audioPlayer = new Sound(uri, Sound.MAIN_BUNDLE, (error) => {
        if (error) {
          console.error('Failed to load audio:', error);
          reject(error);
          return;
        }

        this.audioPlayer.play((success) => {
          if (success) {
            console.log('Audio finished successfully');
            if (onFinishCallback) onFinishCallback();
          } else {
            console.warn('Audio playback failed');
          }

          this.audioPlayer.release();
          this.audioPlayer = null;
          resolve();
        });
      });
    });
  }

  stopAudio() {
    return new Promise((resolve) => {
      if (this.audioPlayer) {
        this.audioPlayer.stop(() => {
          this.audioPlayer.release();
          this.audioPlayer = null;
          resolve();
        });
      } else {
        resolve();
      }
    });
  }

  // --- VIDEO CONTROL ---

  setVideoPlayerRef(ref) {
    this.videoPlayerRef = ref;
  }

  stopVideo() {
    // No imperative stop; use state to control `paused` prop from parent component
    // Just clear the ref for consistency
    this.videoPlayerRef = null;
    return Promise.resolve();
  }

  // --- STOP EVERYTHING ---
  async stopAllMedia() {
    await this.stopAudio();
    await this.stopVideo();
    console.log("🔴 Stopping all media...");
  }
}

export default new MediaController();
