import NetInfo from '@react-native-community/netinfo';
export const isConnected = async (): Promise<boolean> => {
    const state = await NetInfo.fetch();
    return state.isConnected === true && state.isInternetReachable === true;
};