 <View style={isMine ? styles.ownContainer : styles.otherContainer}>
        <TouchableOpacity
          style={isMine ? styles.own : styles.other}
          onLongPress={() => onLongPress(item)}
          activeOpacity={0.7}
        >
 

          {/* AUDIO SECTION */}
          {item?.messagetype === "audio" ?
            <VoicePlayer url={item.audioUrl} xpartner={item.msgByUserId} /> : null
          }

          {/* STATUS SECTION */}
          <View style={styles.statusContainer}>
            <Text style={[styles.timeText, { color: isMine ? "#fff" : "#000" }]}>
              {item.createdAt ? new Date(item.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : "..."}
            </Text>
            {isMine && (
              <Text style={styles.tickText}>
                {item.status === "pending" ? "🕒" : item.seen ? "✓✓" : "✓"}
              </Text>
            )}
          </View>
        </TouchableOpacity>
      </View>