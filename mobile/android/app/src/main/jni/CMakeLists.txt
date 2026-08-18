cmake_minimum_required(VERSION 3.22.1)

project(appmodules)

include(${REACT_ANDROID_DIR}/cmake-utils/ReactNative-application.cmake)

target_sources(${CMAKE_PROJECT_NAME} PRIVATE ../../../../../shared/NativeSampleModule.cpp)

target_link_libraries(${CMAKE_PROJECT_NAME}
    log
    android
)

target_include_directories(${CMAKE_PROJECT_NAME} PUBLIC ../../../../../shared)
