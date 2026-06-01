import { FlatList, TouchableOpacity, Text, View } from "react-native";
import { SafeAreaView, Platform, StatusBar, Dimensions } from "react-native";
import { Ionicons } from "react-native-vector-icons/Ionicons";

export default function FeelingPicker({ onSelect, navigation }) {
  const screenWidth = Dimensions.get("window").width;

  const feelings = [
    // Feelings
    { emoji: "😄", label: "Happy" },
    { emoji: "😢", label: "Sad" },
    { emoji: "😠", label: "Angry" },
    { emoji: "😆", label: "Excited" },
    { emoji: "😰", label: "Nervous" },
    { emoji: "🥱", label: "Tired" },
    { emoji: "😇", label: "Blessed" },
    { emoji: "😍", label: "Loved" },
    { emoji: "😎", label: "Cool" },
    { emoji: "🤒", label: "Sick" },
    { emoji: "😭", label: "Heartbroken" },
    { emoji: "😌", label: "Relieved" },
    { emoji: "🤩", label: "Grateful" },
    { emoji: "🤗", label: "Thankful" },
    { emoji: "🤯", label: "Mind-blown" },

    // Activities
    { emoji: "🍕", label: "Eating" },
    { emoji: "☕", label: "Drinking Coffee" },
    { emoji: "🎮", label: "Gaming" },
    { emoji: "📺", label: "Watching TV" },
    { emoji: "🎵", label: "Listening to Music" },
    { emoji: "🏃‍♂️", label: "Running" },
    { emoji: "🛌", label: "Resting" },
    { emoji: "🚗", label: "Driving" },
    { emoji: "💼", label: "Working" },
    { emoji: "📚", label: "Studying" },
    { emoji: "✈️", label: "Traveling" },
    { emoji: "🏖️", label: "On Vacation" },
    { emoji: "👨‍👩‍👧‍👦", label: "With Family" },
    { emoji: "👫", label: "With Friends" },
    { emoji: "🎂", label: "Celebrating Birthday" },
    { emoji: "🏥", label: "At the Hospital" },
  ];

  return (
    <SafeAreaView
      style={{
        flex: 1,
        backgroundColor: "#ffffff",
        paddingTop: Platform.OS === "android" ? StatusBar.currentHeight : 0,
      }}
    >
      {/* Top Menu */}
      <View className="flex-row items-center justify-between ml-[10px]">
        {/* Left side: Back arrow + Create Post */}
        <TouchableOpacity
          onPress={() => onSelect()}
          className="flex-row items-center"
        >
          <Ionicons name="arrow-back" size={24} color="black" />
          <Text className="text-[14px] ml-2">Feeling Activity</Text>
        </TouchableOpacity>
      </View>
      <FlatList
        data={feelings}
        numColumns={3}
        keyExtractor={(item) => item.label}
        contentContainerStyle={{ padding: 10 }}
        renderItem={({ item }) => (
          <TouchableOpacity
            onPress={() => onSelect(item)}
            className="items-center m-2 p-3 bg-gray-100 rounded-xl w-24"
          >
            <Text className="text-3xl w-full text-center">{item.emoji}</Text>
            <Text className="text-xs mt-1 text-center">{item.label}</Text>
          </TouchableOpacity>
        )}
      />
    </SafeAreaView>
  );
}
