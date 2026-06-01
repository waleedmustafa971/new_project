import React, { useRef, useState, useEffect } from "react";
import { Animated, PanResponder, Text, TouchableOpacity } from "react-native";

const Drag = ({
  id,
  text,
  fontSize,
  fontColor,
  fontFamily,
  initialX,
  initialY,
  zIndex,
  onPositionChange,
  onDoubleTap,
  onDelete
}) => {
  const pan = useRef(new Animated.ValueXY({ x: initialX, y: initialY })).current;
  const lastTap = useRef(null);
  const [selected, setSelected] = useState(false); // 👈 Track selected state

  console.log('' + id + '...Font Size ' + fontSize + '...fontFamily ' + fontFamily + '...text....' + text)

  useEffect(() => {
    pan.setValue({ x: initialX, y: initialY });
  }, [initialX, initialY]);

 /*  const handleDoubleTap = () => {
    const now = Date.now();
    if (lastTap.current && now - lastTap.current < 300) {
      onDoubleTap && onDoubleTap();
    }
    lastTap.current = now;
  }; */

  const handleDoubleTap = () => {
    const now = Date.now();
    if (lastTap.current && now - lastTap.current < 300) {
      setSelected(prev => !prev); // 👈 TOGGLE selected true/false
      onDoubleTap && onDoubleTap();
    }
    lastTap.current = now;
  };


  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onPanResponderGrant: () => {
        pan.extractOffset(); // 🔥 fix jump issue
        handleDoubleTap();
      },
      onPanResponderMove: Animated.event(
        [null, { dx: pan.x, dy: pan.y }],
        { useNativeDriver: false }
      ),
      onPanResponderRelease: () => {
        pan.flattenOffset();
        onPositionChange(pan.x._value, pan.y._value);
      }
    })
  ).current;

  return (
    <Animated.View
      {...panResponder.panHandlers}
      style={[
        pan.getLayout(),
        {
          position: "absolute",
          zIndex: zIndex,
        },
      ]}
    >
      <Text style={{ fontSize, color: fontColor, fontFamily }}>{text}</Text>

       {/* Only show delete if selected */}
       {selected && (
        <TouchableOpacity
          onPress={() => onDelete(id)}
          className="bg-black/20 items-center p-[4px]"
          style={{
            position: "absolute",
            width: 30, height: 30,
            borderRadius: 25,
            top: -20,
            right: -10,
          }}
        >
          <Text style={{ color: "white", fontSize: 16 }}>X</Text>
        </TouchableOpacity>
          )}
    </Animated.View>
  );
};

export default Drag;
