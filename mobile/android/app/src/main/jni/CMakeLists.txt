cmake_minimum_required(VERSION 3.30.3)

# Define the library name here.
project(appmodules)

# This file includes all the necessary to let you build your React Native application
include(${REACT_ANDROID_DIR}/cmake-utils/ReactNative-application.cmake)

# Path to ffmpeg

# Path to your ffmpeg-android-maker output (Change this to your actual path)
#set(FFMPEG_DIR ${CMAKE_CURRENT_SOURCE_DIR}/../ffmpeg-android-maker/output)
# --- CORRECTED PATH ---
# Since CMakeLists.txt is in android/app/src/main/jni/
# We go up 1 level to reach android/app/src/main/
set(FFMPEG_DIR "${CMAKE_CURRENT_SOURCE_DIR}/../ffmpeg-android-maker/output")
set(FFMPEG_LIBS_DIR ${FFMPEG_DIR}/lib/${ANDROID_ABI})

# Add FFmpeg headers to search path
#target_include_directories(${CMAKE_PROJECT_NAME} PUBLIC 
#    ../../../../../shared
#    ${FFMPEG_DIR}/include
#)

# Make sure this points to the 'include' folder specifically
target_include_directories(${CMAKE_PROJECT_NAME} PUBLIC 
    "${FFMPEG_DIR}/include/${ANDROID_ABI}" 
)

# Define where the additional source code lives. We need to crawl back the jni, main, src, app, android folders
target_sources(${CMAKE_PROJECT_NAME} PRIVATE ../../../../../shared/NativeSampleModule.cpp)

# Link FFmpeg libraries
target_link_libraries(${CMAKE_PROJECT_NAME}
    ${FFMPEG_LIBS_DIR}/libavformat.so
    ${FFMPEG_LIBS_DIR}/libavcodec.so
    ${FFMPEG_LIBS_DIR}/libavutil.so
    ${FFMPEG_LIBS_DIR}/libswscale.so
    ${FFMPEG_LIBS_DIR}/libswresample.so
     ${FFMPEG_LIBS_DIR}/libavfilter.so   # <-- ADD THIS
    log
    android
)

# Define where CMake can find the additional header files. We need to crawl back the jni, main, src, app, android folders
target_include_directories(${CMAKE_PROJECT_NAME} PUBLIC ../../../../../shared)