#pragma once

#include <AppSpecsJSI.h>

#include <memory>
#include <string>

// FFmpeg headers (Must be inside extern "C" for C++)
extern "C"
{
#include <libavformat/avformat.h>
#include <libavutil/timestamp.h>
#include <libavcodec/avcodec.h>
#include <libswscale/swscale.h>

// ✅ REQUIRED for trim + drawtext + audio filters
#include <libavfilter/avfilter.h>
#include <libavfilter/buffersink.h>
#include <libavfilter/buffersrc.h>
#include <libavutil/opt.h>
}
// end FFmpeg

namespace facebook::react
{

    class NativeSampleModule : public NativeSampleModuleCxxSpec<NativeSampleModule>
    {
    public:
        NativeSampleModule(std::shared_ptr<CallInvoker> jsInvoker);

        std::string reverseString(jsi::Runtime &rt, std::string input);
        double getVideoDuration(jsi::Runtime &rt, std::string uri); // ffmpeg
                                                                    /* ApplyGreenScreen */
                                                                    // Inside NativeSampleModule.h
        jsi::String applyGreenScreen(
            jsi::Runtime &rt,
            jsi::String foregroundPath,
            jsi::String backgroundPath,
            jsi::String outputPath,
            jsi::String chromaColor,
            bool isImageBackground);

        // ✅ ADD THIS
        std::string getThumbnail(
            jsi::Runtime &rt,
            std::string input,
            std::string output,
            double second);
        // ffmpeg
        jsi::String processVideo(
            jsi::Runtime &rt,
            jsi::String input,
            jsi::String output,
            double start,
            double duration,
            jsi::String audioUri,
            jsi::String overlayText,
            jsi::String fontPath);

        // -----------------------------
        // NEW: Minimal libavfilter trim (video-only)
        // -----------------------------
        jsi::String trimVideoMinimal(
            jsi::Runtime &rt,
            jsi::String input,
            jsi::String output,
            double start,
            double duration);

        // ✅ ADD THIS
        jsi::String decodeVideoFrames(
            jsi::Runtime &rt,
            jsi::String input);

    private:
        // Internal helper: actual trimming logic
        static bool trimVideoMinimalHelper(
            const char *inputPath,
            const char *outputPath,
            double start,
            double duration);
    };

} // namespace facebook::react
