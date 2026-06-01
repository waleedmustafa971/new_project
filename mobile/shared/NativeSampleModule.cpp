#include <android/log.h>
#ifdef LOG_TAG
#undef LOG_TAG
#endif

#define LOG_TAG "NativeSampleModule"

#define LOGI(...) __android_log_print(ANDROID_LOG_INFO, LOG_TAG, __VA_ARGS__)
#define LOGE(...) __android_log_print(ANDROID_LOG_ERROR, LOG_TAG, __VA_ARGS__)

#include "NativeSampleModule.h"
#include <jsi/jsi.h>

/* extern "C" {
#include <libavformat/avformat.h>
#include <libavcodec/avcodec.h>
#include <libavfilter/avfilter.h>
#include <libavfilter/buffersrc.h>
#include <libavfilter/buffersink.h>
#include <libavutil/opt.h>
}
 */
extern "C"
{
#include <libavformat/avformat.h>
#include <libavcodec/avcodec.h>
#include <libavutil/timestamp.h>
#include <libavutil/avutil.h>
#include <libavutil/opt.h>
}
// ----------------------------
// Helper: escape FFmpeg drawtext text
// ----------------------------
static std::string escapeFFmpegText(const std::string &input)
{
    std::string out;
    for (char c : input)
    {
        if (c == ':' || c == '\'' || c == '\\')
            out += '\\';
        out += c;
    }
    return out;
}
// ----------------------------
// Helper function: save frame as JPEG
// ----------------------------
bool saveFrameAsJpeg(AVFrame *frame, int width, int height, const char *path)
{
    // 1. Find the MJPEG encoder
    const AVCodec *jpegCodec = avcodec_find_encoder(AV_CODEC_ID_MJPEG);
    if (!jpegCodec)
        return false;

    AVCodecContext *jpegCtx = avcodec_alloc_context3(jpegCodec);
    if (!jpegCtx)
        return false;

    // MJPEG standard uses YUVJ420P (full range)
    jpegCtx->pix_fmt = AV_PIX_FMT_YUVJ420P;
    jpegCtx->height = height;
    jpegCtx->width = width;
    jpegCtx->time_base = {1, 25};

    if (avcodec_open2(jpegCtx, jpegCodec, nullptr) < 0)
    {
        avcodec_free_context(&jpegCtx);
        return false;
    }

    // 2. Setup Software Scaler (Conversion from Decoder Format -> MJPEG Format)
    // This is the missing piece that ensures compatibility
    SwsContext *sws_ctx = sws_getContext(
        frame->width, frame->height, (AVPixelFormat)frame->format,
        width, height, AV_PIX_FMT_YUVJ420P,
        SWS_BICUBIC, nullptr, nullptr, nullptr);

    if (!sws_ctx)
    {
        avcodec_free_context(&jpegCtx);
        return false;
    }

    // 3. Prepare the Output Frame for the encoder
    AVFrame *swsFrame = av_frame_alloc();
    swsFrame->format = AV_PIX_FMT_YUVJ420P;
    swsFrame->width = width;
    swsFrame->height = height;

    if (av_frame_get_buffer(swsFrame, 0) < 0)
    {
        sws_freeContext(sws_ctx);
        av_frame_free(&swsFrame);
        avcodec_free_context(&jpegCtx);
        return false;
    }

    // Perform the actual conversion
    sws_scale(sws_ctx, frame->data, frame->linesize, 0, frame->height,
              swsFrame->data, swsFrame->linesize);

    // 4. Encode the Frame
    AVPacket *pkt = av_packet_alloc();
    bool success = false;

    if (avcodec_send_frame(jpegCtx, swsFrame) >= 0)
    {
        if (avcodec_receive_packet(jpegCtx, pkt) == 0)
        {
            FILE *f = fopen(path, "wb");
            if (f)
            {
                fwrite(pkt->data, 1, pkt->size, f);
                fclose(f);
                success = true;
            }
        }
    }

    // 5. Cleanup memory to avoid leaks
    av_packet_free(&pkt);
    av_frame_free(&swsFrame);
    sws_freeContext(sws_ctx);
    avcodec_free_context(&jpegCtx);

    return success;
}
// ----------------------------
// Your existing extractFrame and NativeSampleModule implementation
// ----------------------------
bool extractFrame(const char *input, const char *output, int sec)
{
    char cmd[1024];
    sprintf(cmd,
            "ffmpeg -ss %d -i \"%s\" -frames:v 1 \"%s\"",
            sec, input, output);

    int result = system(cmd);
    return result == 0;
}

namespace facebook::react
{

    // for decode video process
    // ---------------------------------------------
    // Decode video frames (TEST FUNCTION)
    // ---------------------------------------------
    static bool decodeVideoFramesInternal(const char *inputPath)
    {
        AVFormatContext *fmtCtx = nullptr;
        AVCodecContext *codecCtx = nullptr;
        AVPacket *packet = nullptr;
        AVFrame *frame = nullptr;

        LOGI("Opening input: %s", inputPath);

        if (avformat_open_input(&fmtCtx, inputPath, nullptr, nullptr) < 0)
        {
            LOGE("Failed to open input");
            return false;
        }

        if (avformat_find_stream_info(fmtCtx, nullptr) < 0)
        {
            LOGE("Failed to find stream info");
            avformat_close_input(&fmtCtx);
            return false;
        }

        int videoIndex = av_find_best_stream(
            fmtCtx, AVMEDIA_TYPE_VIDEO, -1, -1, nullptr, 0);

        if (videoIndex < 0)
        {
            LOGE("No video stream found");
            avformat_close_input(&fmtCtx);
            return false;
        }

        AVStream *videoStream = fmtCtx->streams[videoIndex];

        const AVCodec *decoder =
            avcodec_find_decoder(videoStream->codecpar->codec_id);
        if (!decoder)
        {
            LOGE("Decoder not found");
            avformat_close_input(&fmtCtx);
            return false;
        }

        codecCtx = avcodec_alloc_context3(decoder);
        avcodec_parameters_to_context(codecCtx, videoStream->codecpar);

        if (avcodec_open2(codecCtx, decoder, nullptr) < 0)
        {
            LOGE("Failed to open decoder");
            avcodec_free_context(&codecCtx);
            avformat_close_input(&fmtCtx);
            return false;
        }

        packet = av_packet_alloc();
        frame = av_frame_alloc();

        LOGI("Start decoding frames...");

        while (av_read_frame(fmtCtx, packet) >= 0)
        {
            if (packet->stream_index != videoIndex)
            {
                av_packet_unref(packet);
                continue;
            }

            if (avcodec_send_packet(codecCtx, packet) < 0)
            {
                av_packet_unref(packet);
                continue;
            }

            while (avcodec_receive_frame(codecCtx, frame) == 0)
            {
                double pts =
                    frame->pts * av_q2d(videoStream->time_base);

                LOGI(
                    "Decoded frame | PTS=%.3f | %dx%d | format=%d",
                    pts,
                    frame->width,
                    frame->height,
                    frame->format);

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

    // 1. PLACE IT HERE (Internal Helper)
    // Green Screen We don't put this in the .h file because JS doesn't need to see it.
/*     static std::string getChromaKeyFilter(bool isImageBackground, const std::string &hexColor)
    {
        std::string filter =
            "[0:v]chromakey=" + hexColor + ":0.2:0.05,format=rgba[fg];";

        if (isImageBackground)
        {
            filter += "[1:v]scale=iw:ih[bg];[bg][fg]overlay=shortest=1";
        }
        else
        {
            filter += "[1:v][fg]overlay=shortest=1";
        }

        return filter;
    }

 */




    NativeSampleModule::NativeSampleModule(std::shared_ptr<CallInvoker> jsInvoker)
        : NativeSampleModuleCxxSpec(std::move(jsInvoker)) {}

    std::string NativeSampleModule::reverseString(jsi::Runtime &rt, std::string input)
    {
        return std::string(input.rbegin(), input.rend());
    }
    // ffmpeg
    double NativeSampleModule::getVideoDuration(jsi::Runtime &rt, std::string uri)
    {
        AVFormatContext *pFormatCtx = avformat_alloc_context();
        if (avformat_open_input(&pFormatCtx, uri.c_str(), NULL, NULL) != 0)
        {
            return -1.0;
        }
        if (avformat_find_stream_info(pFormatCtx, NULL) < 0)
        {
            avformat_close_input(&pFormatCtx);
            return -1.0;
        }
        double duration = (double)pFormatCtx->duration / AV_TIME_BASE;
        avformat_close_input(&pFormatCtx);
        return duration;
    }
    // ffmpeg apply greenScreen


jsi::String NativeSampleModule::applyGreenScreen(
    jsi::Runtime &rt,
    jsi::String foregroundPathJS,
    jsi::String backgroundPathJS,
    jsi::String outputPathJS,
    jsi::String chromaColorJS,
    bool isImageBackground
) {
    std::string foregroundPath = foregroundPathJS.utf8(rt);
    std::string backgroundPath = backgroundPathJS.utf8(rt);
    std::string outputPath = outputPathJS.utf8(rt);
    std::string chromaColor = chromaColorJS.utf8(rt);

    // 1. Open foreground video
    AVFormatContext *fmtCtx = avformat_alloc_context();
    int openResult = avformat_open_input(&fmtCtx, foregroundPath.c_str(), nullptr, nullptr);
    if (openResult != 0) {
        char errbuf[128];
        av_strerror(openResult, errbuf, sizeof(errbuf));
        return jsi::String::createFromUtf8(rt, std::string("Error: Open Input (Foreground): ") + errbuf);
    }

    if (avformat_find_stream_info(fmtCtx, nullptr) < 0) {
        avformat_close_input(&fmtCtx);
        return jsi::String::createFromUtf8(rt, "Error: Stream Info (Foreground)");
    }
    avformat_close_input(&fmtCtx); // Close immediately, we just check input exists

    // 2. Open background if it's a video
    if (!isImageBackground) {
        AVFormatContext *bgCtx = avformat_alloc_context();
        int bgOpen = avformat_open_input(&bgCtx, backgroundPath.c_str(), nullptr, nullptr);
        if (bgOpen != 0) {
            char errbuf[128];
            av_strerror(bgOpen, errbuf, sizeof(errbuf));
            return jsi::String::createFromUtf8(rt, std::string("Error: Open Input (Background): ") + errbuf);
        }
        if (avformat_find_stream_info(bgCtx, nullptr) < 0) {
            avformat_close_input(&bgCtx);
            return jsi::String::createFromUtf8(rt, "Error: Stream Info (Background)");
        }
        avformat_close_input(&bgCtx);
    }

    // 3. Build FFmpeg filter string
    std::string filter = "[0:v]chromakey=" + chromaColor + ":0.1:0.2[fg];";
    if (isImageBackground) {
        filter += "[1:v]scale=iw:ih[bg];[bg][fg]overlay=shortest=1";
    } else {
        filter += "[1:v][fg]overlay=shortest=1";
    }

    // 4. Build FFmpeg command
    std::string cmd = "ffmpeg -y "
                      "-i \"" + foregroundPath + "\" "
                      "-i \"" + backgroundPath + "\" "
                      "-filter_complex \"" + filter + "\" "
                      "-c:v libx264 -preset ultrafast -c:a copy \"" + outputPath + "\"";

   /*  int result = system(cmd.c_str());

    if (result == 0) {
        return jsi::String::createFromUtf8(rt, outputPath);
    } else {
        return jsi::String::createFromUtf8(rt, "Error: Chroma Key Failed");
    } */
    int result = system(cmd.c_str());
    if (result != 0) {
        // Return FFmpeg command for debugging
        std::string errMsg = "Error: Chroma Key Failed. Command: " + cmd;
        return jsi::String::createFromUtf8(rt, errMsg);
    }
    // SUCCESS: return the output path
    return jsi::String::createFromUtf8(rt, outputPath);
}

    std::string NativeSampleModule::getThumbnail(
        jsi::Runtime &rt,
        std::string input,
        std::string output,
        double second)
    {
        avformat_network_init(); // Ensure protocols are initialized

        AVFormatContext *fmt = nullptr;
        if (avformat_open_input(&fmt, input.c_str(), nullptr, nullptr) < 0)
            return "Error: Open Input";
        if (avformat_find_stream_info(fmt, nullptr) < 0)
            return "Error: Stream Info";

        int videoStream = -1;
        for (unsigned i = 0; i < fmt->nb_streams; i++)
        {
            if (fmt->streams[i]->codecpar->codec_type == AVMEDIA_TYPE_VIDEO)
            {
                videoStream = i;
                break;
            }
        }
        if (videoStream == -1)
            return "Error: No Video Stream";

        const AVCodec *codec = avcodec_find_decoder(fmt->streams[videoStream]->codecpar->codec_id);
        AVCodecContext *decCtx = avcodec_alloc_context3(codec);
        avcodec_parameters_to_context(decCtx, fmt->streams[videoStream]->codecpar);
        if (avcodec_open2(decCtx, codec, nullptr) < 0)
            return "Error: Open Decoder";

        // ✅ SEEKING: More accurate seek
        int64_t seekTarget = static_cast<int64_t>(second / av_q2d(fmt->streams[videoStream]->time_base));
        av_seek_frame(fmt, videoStream, seekTarget, AVSEEK_FLAG_BACKWARD);

        AVFrame *frame = av_frame_alloc();
        AVPacket pkt;
        bool frameSaved = false;

        while (av_read_frame(fmt, &pkt) >= 0)
        {
            if (pkt.stream_index == videoStream)
            {
                if (avcodec_send_packet(decCtx, &pkt) == 0)
                {
                    if (avcodec_receive_frame(decCtx, frame) == 0)
                    {
                        // ✅ FIXED: Using saveFrameAsJpeg with SwsContext inside is better
                        frameSaved = saveFrameAsJpeg(frame, decCtx->width, decCtx->height, output.c_str());
                        if (frameSaved)
                        {
                            av_packet_unref(&pkt);
                            break;
                        }
                    }
                }
            }
            av_packet_unref(&pkt);
        }

        av_frame_free(&frame);
        avcodec_free_context(&decCtx);
        avformat_close_input(&fmt);

        return frameSaved ? output : "Error: Frame Capture Failed";
    }

    // Inside NativeSampleModule.cpp

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
        std::string inStr = input.utf8(rt);
        std::string outStr = output.utf8(rt);
        std::string audioStr = audioUri.utf8(rt);
        std::string textStr = overlayText.utf8(rt);
        std::string fPath = fontPath.utf8(rt);

        // ✅ FILTER-ONLY trimming (CORRECT)
        std::string filter =
            "[0:v]trim=start=" + std::to_string(start) +
            ":duration=" + std::to_string(duration) +
            ",setpts=PTS-STARTPTS,"
            "drawtext=fontfile='" +
            fPath +
            "':text='" + escapeFFmpegText(textStr) +
            "':fontcolor=white:fontsize=24:x=10:y=10[v];"
            "[1:a]atrim=0:" +
            std::to_string(duration) +
            ",asetpts=PTS-STARTPTS[a]";

        // ❌ REMOVED -ss (THIS WAS THE BUG)
        std::string cmd =
            "ffmpeg -y "
            "-i \"" +
            inStr + "\" "
                    "-i \"" +
            audioStr + "\" "
                       "-filter_complex \"" +
            filter + "\" "
                     "-map \"[v]\" -map \"[a]\" "
                     "-c:v libx264 -preset ultrafast "
                     "-c:a aac -shortest "
                     "\"" +
            outStr + "\"";

        int result = system(cmd.c_str());

        if (result == 0)
        {
            return jsi::String::createFromUtf8(rt, outStr);
        }

        // ---------- Diagnostics ----------
        std::string diagnostic = "FFmpeg failed. Code: " + std::to_string(result);

        FILE *f = fopen(fPath.c_str(), "r");
        if (f)
        {
            diagnostic += " | Font OK";
            fclose(f);
        }
        else
        {
            diagnostic += " | Font NOT FOUND: " + fPath;
        }

        return jsi::String::createFromUtf8(rt, diagnostic);
    }

    // -----------------------------
    // JS-exposed wrapper
    // --------------------------------------------------
    // trimVideoMinimal (VIDEO ONLY, MP4 OUTPUT)
    // --------------------------------------------------
    //trim video is only working for just only cut crop only video with voice
    jsi::String NativeSampleModule::trimVideoMinimal(
        jsi::Runtime &rt,
        jsi::String input,
        jsi::String output,
        double start,
        double duration)
    {
        std::string inPath = input.utf8(rt);
        std::string outPath = output.utf8(rt);

        AVFormatContext *inFmt = nullptr;
        AVFormatContext *outFmt = nullptr;

        if (avformat_open_input(&inFmt, inPath.c_str(), nullptr, nullptr) < 0)
            return jsi::String::createFromUtf8(rt, "Error: open input");

        if (avformat_find_stream_info(inFmt, nullptr) < 0)
        {
            avformat_close_input(&inFmt);
            return jsi::String::createFromUtf8(rt, "Error: stream info");
        }

        int videoIndex = av_find_best_stream(
            inFmt, AVMEDIA_TYPE_VIDEO, -1, -1, nullptr, 0);
        if (videoIndex < 0)
        {
            avformat_close_input(&inFmt);
            return jsi::String::createFromUtf8(rt, "Error: no video stream");
        }

        AVStream *videoStream = inFmt->streams[videoIndex];

        avformat_alloc_output_context2(&outFmt, nullptr, "mp4", outPath.c_str());
        if (!outFmt)
        {
            avformat_close_input(&inFmt);
            return jsi::String::createFromUtf8(rt, "Error: output context");
        }

        // ✅ COPY ALL STREAMS (video + audio)
        for (unsigned i = 0; i < inFmt->nb_streams; i++)
        {
            AVStream *inStream = inFmt->streams[i];
            AVStream *outStream = avformat_new_stream(outFmt, nullptr);
            avcodec_parameters_copy(outStream->codecpar, inStream->codecpar);
            outStream->time_base = inStream->time_base;
        }

        if (!(outFmt->oformat->flags & AVFMT_NOFILE))
        {
            if (avio_open(&outFmt->pb, outPath.c_str(), AVIO_FLAG_WRITE) < 0)
            {
                avformat_close_input(&inFmt);
                avformat_free_context(outFmt);
                return jsi::String::createFromUtf8(rt, "Error: open output file");
            }
        }

        if (avformat_write_header(outFmt, nullptr) < 0)
        {
            avformat_close_input(&inFmt);
            avio_closep(&outFmt->pb);
            avformat_free_context(outFmt);
            return jsi::String::createFromUtf8(rt, "Error: write header");
        }

        int64_t startPts =
            static_cast<int64_t>(start / av_q2d(videoStream->time_base));
        int64_t videoStartPts = startPts; // ✅ FIX

        av_seek_frame(inFmt, videoIndex, startPts, AVSEEK_FLAG_BACKWARD);

        AVPacket *pkt = av_packet_alloc();

        while (av_read_frame(inFmt, pkt) >= 0)
        {
            AVStream *inStream = inFmt->streams[pkt->stream_index];
            AVStream *outStream = outFmt->streams[pkt->stream_index];

            if (pkt->pts < videoStartPts)
            {
                av_packet_unref(pkt);
                continue;
            }

            double timeSec =
                pkt->pts * av_q2d(inStream->time_base);

            if (timeSec > start + duration)
            {
                av_packet_unref(pkt);
                break;
            }

            pkt->pts = av_rescale_q(pkt->pts - videoStartPts,
                                    inStream->time_base,
                                    outStream->time_base);
            pkt->dts = av_rescale_q(pkt->dts - videoStartPts,
                                    inStream->time_base,
                                    outStream->time_base);
            pkt->duration = av_rescale_q(pkt->duration,
                                         inStream->time_base,
                                         outStream->time_base);
            pkt->pos = -1;

            av_interleaved_write_frame(outFmt, pkt);
            av_packet_unref(pkt);
        }

        av_write_trailer(outFmt);

        av_packet_free(&pkt);
        avformat_close_input(&inFmt);
        avio_closep(&outFmt->pb);
        avformat_free_context(outFmt);

        return jsi::String::createFromUtf8(rt, outPath);
    }

    // ---------------------------------------------
    // JSI Decorded Exposed Method
    // ---------------------------------------------
    jsi::String NativeSampleModule::decodeVideoFrames(
        jsi::Runtime &rt,
        jsi::String input)
    {

        std::string inputPath = input.utf8(rt);

        bool ok = decodeVideoFramesInternal(inputPath.c_str());

        if (!ok)
        {
            return jsi::String::createFromUtf8(rt, "Decode failed");
        }

        return jsi::String::createFromUtf8(rt, "Decode success");
    }



} // namespace facebook::react