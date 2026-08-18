#include <android/log.h>
#ifdef LOG_TAG
#undef LOG_TAG
#endif

#define LOG_TAG "NativeSampleModule"
#define LOGI(...) __android_log_print(ANDROID_LOG_INFO, LOG_TAG, __VA_ARGS__)
#define LOGE(...) __android_log_print(ANDROID_LOG_ERROR, LOG_TAG, __VA_ARGS__)

#include "NativeSampleModule.h"
#include <jsi/jsi.h>

// FFmpeg stubbed out — pre-built .so files not available on Windows build machine

namespace facebook::react
{

    NativeSampleModule::NativeSampleModule(std::shared_ptr<CallInvoker> jsInvoker)
        : NativeSampleModuleCxxSpec(std::move(jsInvoker)) {}

    std::string NativeSampleModule::reverseString(jsi::Runtime &rt, std::string input)
    {
        return std::string(input.rbegin(), input.rend());
    }

    double NativeSampleModule::getVideoDuration(jsi::Runtime &rt, std::string uri)
    {
        return -1.0;
    }

    jsi::String NativeSampleModule::applyGreenScreen(
        jsi::Runtime &rt,
        jsi::String foregroundPathJS,
        jsi::String backgroundPathJS,
        jsi::String outputPathJS,
        jsi::String chromaColorJS,
        bool isImageBackground)
    {
        return jsi::String::createFromUtf8(rt, "Error: FFmpeg not available in this build");
    }

    std::string NativeSampleModule::getThumbnail(
        jsi::Runtime &rt,
        std::string input,
        std::string output,
        double second)
    {
        return "Error: FFmpeg not available in this build";
    }

    jsi::String NativeSampleModule::processVideo(
        jsi::Runtime &rt,
        jsi::String input,
        jsi::String output,
        double start,
        double duration,
        jsi::String audioUri,
        jsi::String overlayText,
        jsi::String fontPath)
    {
        return jsi::String::createFromUtf8(rt, "Error: FFmpeg not available in this build");
    }

    jsi::String NativeSampleModule::trimVideoMinimal(
        jsi::Runtime &rt,
        jsi::String input,
        jsi::String output,
        double start,
        double duration)
    {
        return jsi::String::createFromUtf8(rt, "Error: FFmpeg not available in this build");
    }

    jsi::String NativeSampleModule::decodeVideoFrames(
        jsi::Runtime &rt,
        jsi::String input)
    {
        return jsi::String::createFromUtf8(rt, "Error: FFmpeg not available in this build");
    }

} // namespace facebook::react
