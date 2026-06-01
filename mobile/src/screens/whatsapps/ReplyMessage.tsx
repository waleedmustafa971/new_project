import { View, Text } from 'react-native'
import React, {useState, useEffect} from 'react'
import { singleReplydata } from '../../utils/dbService';

const ReplyMessage = ({ replyTo } : any) => {
  console.log('...replyto......', replyTo)  
  const [messages,setMessages] = useState([])
  useEffect(() => {
        loadInitialMessages();
  },[])  
    const loadInitialMessages = async () => {
        //singleReplydata
      const local = await singleReplydata(replyTo);
      console.log('--get reply data.... ', local)  
      const formatted = local.reverse().map((m: any) => ({
        id: String(m.id),
        _id: String(m.id),
        sender: String(m.sender),
        receiver: String(m.receiver),  
        text: m.text || "",
        imageUrl: m.imageUrl || "",
        audioUrl: m.audioUrl || "",
        videoUrl: m.videoUrl || "",
        status: m.status || "sent", // IMPORTANT
        type: m.type || type,
        createdAt: m.createdAt,
        messagetype: m.messagetype,
        msgByUserId: String(m.msgByUserId || m.sender),
        seen: Boolean(m.seen), 
        replyTo: m.replyTo, 
        forwardedFrom: m.forwardedFrom, 
        isForwarded: m.isForwarded
      }));
      console.log('load data from chathistory', formatted);
      /*  setMessages(formatted); */
      setMessages(prev => {
        const combined = [...formatted, ...prev];
        const unique = Array.from(
          new Map(combined.map(item => [item._id, item])).values()
        );
        return unique.sort(
          (a, b) =>
            new Date(a.createdAt).getTime() -
            new Date(b.createdAt).getTime()
        );
      });
    };
  
  return (
    <View style={{ 
        borderBottomWidth: 1, 
        borderBottomColor: 'red', marginRight: 15
     }}>
        {
            messages?.map((item : any) => {
                return (
                    <>
                    <Text style={{ fontSize: 10 }}>{item.text} </Text> 
                    </>
                )
            })
        }
     
    </View>
  )
}

export default ReplyMessage