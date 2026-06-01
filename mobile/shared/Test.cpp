#include "NativeSampleModule.h"

#include <jsi/jsi.h>
#include <memory>
#include <string>
#include <android/log.h>

#define LOG_TAG "NativeSampleModule"
#define LOGI(...) __android_log_print(ANDROID_LOG_INFO, LOG_TAG, __VA_ARGS__)
#define LOGE(...) __android_log_print(ANDROID_LOG_ERROR, LOG_TAG, __VA_ARGS__)

extern "C" {
#include <libavformat/avformat.h>
#include <libavcodec/avcodec.h>
#include <libavutil/avutil.h>
}

using namespace facebook::react;

// ---------------------------------------------
// Constructor
// ---------------------------------------------
NativeSampleModule::NativeSampleModule(
    std::shared_ptr<CallInvoker> jsInvoker)
    : NativeSampleModuleCxxSpec(std::move(jsInvoker)) {}


// ---------------------------------------------
// Decode video frames (TEST FUNCTION)
// ---------------------------------------------
static bool decodeVideoFramesInternal(const char* inputPath) {
    AVFormatContext* fmtCtx = nullptr;
    AVCodecContext* codecCtx = nullptr;
    AVPacket* packet = nullptr;
    AVFrame* frame = nullptr;

    LOGI("Opening input: %s", inputPath);

    if (avformat_open_input(&fmtCtx, inputPath, nullptr, nullptr) < 0) {
        LOGE("Failed to open input");
        return false;
    }

    if (avformat_find_stream_info(fmtCtx, nullptr) < 0) {
        LOGE("Failed to find stream info");
        avformat_close_input(&fmtCtx);
        return false;
    }

    int videoIndex = av_find_best_stream(
        fmtCtx, AVMEDIA_TYPE_VIDEO, -1, -1, nullptr, 0);

    if (videoIndex < 0) {
        LOGE("No video stream found");
        avformat_close_input(&fmtCtx);
        return false;
    }

    AVStream* videoStream = fmtCtx->streams[videoIndex];

    const AVCodec* decoder =
        avcodec_find_decoder(videoStream->codecpar->codec_id);
    if (!decoder) {
        LOGE("Decoder not found");
        avformat_close_input(&fmtCtx);
        return false;
    }

    codecCtx = avcodec_alloc_context3(decoder);
    avcodec_parameters_to_context(codecCtx, videoStream->codecpar);

    if (avcodec_open2(codecCtx, decoder, nullptr) < 0) {
        LOGE("Failed to open decoder");
        avcodec_free_context(&codecCtx);
        avformat_close_input(&fmtCtx);
        return false;
    }

    packet = av_packet_alloc();
    frame  = av_frame_alloc();

    LOGI("Start decoding frames...");

    while (av_read_frame(fmtCtx, packet) >= 0) {
        if (packet->stream_index != videoIndex) {
            av_packet_unref(packet);
            continue;
        }

        if (avcodec_send_packet(codecCtx, packet) < 0) {
            av_packet_unref(packet);
            continue;
        }

        while (avcodec_receive_frame(codecCtx, frame) == 0) {
            double pts =
                frame->pts * av_q2d(videoStream->time_base);

            LOGI(
                "Decoded frame | PTS=%.3f | %dx%d | format=%d",
                pts,
                frame->width,
                frame->height,
                frame->format
            );

            av_frame_unref(frame);
        }

        av_packet_unref(packet);
    }

    LOGI("Decode finished");

    av_frame_free(&frame);
    av_packet_free(&packet);
    avcodec_free_context(&codecCtx);
    avformat_close_input(&fmtCtx);

    return true;
}


// ---------------------------------------------
// JSI Exposed Method
// ---------------------------------------------
jsi::String NativeSampleModule::decodeVideoFrames(
    jsi::Runtime& rt,
    jsi::String input) {

    std::string inputPath = input.utf8(rt);

    bool ok = decodeVideoFramesInternal(inputPath.c_str());

    if (!ok) {
        return jsi::String::createFromUtf8(rt, "Decode failed");
    }

    return jsi::String::createFromUtf8(rt, "Decode success");
}
