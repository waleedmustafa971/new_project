#pragma once

#include <AppSpecsJSI.h>

#include <memory>
#include <string>

namespace facebook::react
{

    class NativeSampleModule : public NativeSampleModuleCxxSpec<NativeSampleModule>
    {
    public:
        NativeSampleModule(std::shared_ptr<CallInvoker> jsInvoker);

        std::string reverseString(jsi::Runtime &rt, std::string input);
        double getVideoDuration(jsi::Runtime &rt, std::string uri);

        jsi::String applyGreenScreen(
            jsi::Runtime &rt,
            jsi::String foregroundPath,
            jsi::String backgroundPath,
            jsi::String outputPath,
            jsi::String chromaColor,
            bool isImageBackground);

        std::string getThumbnail(
            jsi::Runtime &rt,
            std::string input,
            std::string output,
            double second);

        jsi::String processVideo(
            jsi::Runtime &rt,
            jsi::String input,
            jsi::String output,
            double start,
            double duration,
            jsi::String audioUri,
            jsi::String overlayText,
            jsi::String fontPath);

        jsi::String trimVideoMinimal(
            jsi::Runtime &rt,
            jsi::String input,
            jsi::String output,
            double start,
            double duration);

        jsi::String decodeVideoFrames(
            jsi::Runtime &rt,
            jsi::String input);
    };

} // namespace facebook::react
