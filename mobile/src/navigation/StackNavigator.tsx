import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import HomeScreen from '../screens/HomeScreen';
import DetailsScreen from '../screens/DetailsScreen';
import HomeSocial from '../screens/social/HomeSocial';

import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useNavigation } from '@react-navigation/native';


import {
  View,
  TouchableOpacity, Text,
  StyleSheet,
  Image,
  GestureResponderEvent,
} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import Icon from 'react-native-vector-icons/Ionicons';
import HomeWhatsapp from '../screens/whatsapps/HomeWhatsapp';
import ChatScreen from '../screens/whatsapps/ChatScreen';
import FirstScreen from '../screens/FirstScreen';
import AuthScreen from '../screens/auth/AuthScreen';
import StepOne from '../screens/auth/StepOne';
import ChatDetails from '../screens/whatsapps/ChatDetails';
import ChatDetailsTest from '../screens/whatsapps/ChatDetailsTest';
import StepFive from '../screens/auth/StepFive';
import StepTwo from '../screens/auth/StepTwo';
import StepThree from '../screens/auth/StepThree';
import StepFour from '../screens/auth/StepFour';
import Setting from '../screens/whatsapps/Setting';
import CreateGroup from '../screens/whatsapps/CreateGroup';
import SingleReel from '../screens/social/reel/SingleReel';
import ShowReel from '../screens/social/reel/ShowReel';
import Motors from '../screens/motors/Motors';
import StoryViewer from '../screens/social/story/StoryViewer';
import TestSound from '../screens/motors/TestSound';
import PropertyScreen from '../screens/property/PropertyScreen';
import PropertyFind from '../screens/property/PropertyFind';
import FilterClassified from '../screens/classified/FilterClassified';
import CreatePost from '../screens/social/post/create/CreatePost';
import NewReels from '../screens/social/reel/create/NewReels';
import NewReelcamera from '../screens/social/reel/create/NewReelcamera';
import ListTemplate from '../screens/social/reel/template/ListTemplate';
import ShowReels from '../screens/social/reel/yourcontent/ShowReels';
import SavedReel from '../screens/social/reel/saved/SavedReel';
import CreateStory from '../screens/social/story/create/CreateStory';
import MusicShowPage from '../screens/social/music/MusicShowPage';

import MyProfile from '../screens/social/profile/MyProfile';
import CameraReel from '../screens/social/reel/create/CameraReels';
import CreateTemplate from '../screens/social/reel/template/CreateTemplate'
import { RootStackParamList } from '../navigation/navigation';
import LiveScreen from '../screens/social/live/LiveScreen';
import CreateLive from '../screens/social/live/CreateLive';
import FindFriends from '../screens/social/friends/FindFriends';
import AddNewgroupscreen from '../screens/whatsapps/AddNewgroupscreen';
import ScanNumber from '../screens/whatsapps/settings/ScanNumber';
import LinkedDevices from '../screens/whatsapps/settings/LinkedDevices';
import Account from '../screens/whatsapps/settings/Account';
import Privacy from '../screens/whatsapps/settings/Privacy';
import Chats from '../screens/whatsapps/settings/Chats';
import StorageData from '../screens/whatsapps/settings/StorageData';
import Help from '../screens/whatsapps/settings/Help';
import InviteFriends from '../screens/whatsapps/settings/InviteFriends';
import Profile from '../screens/whatsapps/settings/Profile';
import EditProfile from '../screens/social/profile/EditProfile';
import CurrentUserFollowers from '../screens/social/profile/CurrentUserFollowers';
import CurrentUserFollowering from '../screens/social/profile/CurrentUserFollowering';
import GalleryScreen from '../screens/social/gallery/GalleryScreen';
// Social Media module: developer end-to-end tester (not linked from user navigation)
import SocialLab from '../screens/social/devtools/SocialLab';
import ListAds from '../screens/social/ads/ListAds';
import DashboardSearch from '../screens/social/search/DashboardSearch';
import NotificationPage from '../screens/social/notification/NotificationPage';
import UserProfile from '../screens/social/profile/UserProfile';
import MarketPlace from '../screens/social/marketplace/MarketPlace';
import CreateStream from '../screens/social/live/CreateStream';
import LiveScrollingstream from '../screens/social/live/LiveScrollingstream';
import GetCoins from '../screens/social/coins/GetCoins';
import CreateAds from '../screens/property/ads/CreateAds';
import CreateAdsdetails from '../screens/property/ads/CreateAdsdetails';
import ShoppingDashboard from '../screens/shopping/ShoppingDashboard';
import VideoDashboard from '../screens/social/video/VideoDashboard';
import VideoDetails from '../screens/social/video/VideoDetails';
import CreateStorytext from '../screens/social/reel/create/CreateStorytext';
import CreateStorymusic from '../screens/social/reel/story/CreateStorymusic';
import Signupwithmobile from '../screens/auth/Signupwithmobile';
import OtpScreen from '../screens/auth/OtpScreen';
import ForgotPasswordScreen from '../screens/auth/ForgotPasswordScreen';
import PropertyDashboard from '../screens/property/PropertyDashboard';
import MoreFilter from '../screens/property/morefilter/MoreFilter';
import PropertyDetails from '../screens/property/PropertyDetails';
import YourInterestScreen from '../screens/auth/YourInterestScreen';
import ViewAgent from '../screens/property/agent/ViewAgent';
import SingleProduct from '../screens/shopping/product/SingleProduct';
import GroupShopmore from '../screens/shopping/grouptype/GroupShopmore'
import ConfirmAds from '../screens/property/ads/ConfirmAds';
import PropertyProfile from '../screens/property/profile/PropertyProfile';
import MainProfile from '../screens/MainProfile';
import MyAds from '../screens/property/profile/MyAds';
import PropertyUserhistory from '../screens/property/profile/PropertyUserhistory';
import MotorsAds from '../screens/motors/ads/MotorsAds';
import MotorsAdsdetails from '../screens/motors/ads/MotorsAdsdetails';
import MotorsDetails from '../screens/motors/MotorsDetails';
import MotorsSubcategory from '../screens/motors/MotorsSubcategory';
import PropertyFavouites from '../screens/property/PropertyFavouites';
import RecommandPropertyMore from '../screens/property/sub/RecommandPropertyMore';
import KeeplookingPropertyMore from '../screens/property/sub/KeeplookingPropertyMore';
import PropertyforRent from '../screens/property/category/PropertyforRent'
import SearchScreenPage from '../screens/property/sub/SearchScreenPage';
import ClassifiedDetails from '../screens/classified/details/ClassifiedDetails';
import SeeAllProduct from '../screens/classified/seeall/SeeAllProduct';
import JobDashboard from '../screens/job/jobdashboard/JobDashboard';
import JobCategoryall from '../screens/job/browsecategory/JobCategoryall';
import JobCategoryScreen from '../screens/job/browsecategory/JobCategoryScreen';
import JobDetails from '../screens/job/jobdetails/JobDetails';
import CategoryShowmore from '../screens/shopping/categories/CategoryShowmore';
import SingleCategoryProduct from '../screens/shopping/categories/SingleCategoryProduct';
import ViewCart from '../screens/shopping/cart/ViewCart';
import PaymentScreen from '../screens/shopping/payment/PaymentScreen';
import ShoppingProfile from '../screens/shopping/profile/ShoppingProfile';
import ShoppingSearchscreen from '../screens/shopping/search/ShoppingSearchscreen';
import GetPaymentScreen from '../screens/shopping/payment/GetPaymentScreen';
import ViewOrder from '../screens/shopping/payment/ViewOrder';
import DeliveryAddress from '../screens/shopping/profile/DeliveryAddress';
import PaymentDetails from '../screens/shopping/paymentdetails/PaymentDetails';
import ViewCategories from '../screens/shopping/categories/ViewCategories';
import MyOrder from '../screens/shopping/order/MyOrder';
import ProductReview from '../screens/shopping/order/ProductReview';
import FoodDashboard from '../screens/food/Dashboard/FoodDashboard';
import RestaurantScreen from '../screens/food/resturant/ResturantScreen';
import ListofLive from '../screens/social/live/ListofLive';
import InteractiveRoom from '../screens/social/live/InteractiveRoom';
import PaymentScreenClassified from '../screens/payment/PaymentScreenClassified';
import SuccessScreen from '../screens/payment/SuccessScreen';
import PaymentScreenMotors from '../screens/motors/ads/PaymentScreenMotors';
import PaymentScreenProperty from '../screens/property/ads/PaymentScreenProperty';
import ChatProductInboxScreen from '../screens/productchat/ChatProductInboxScreen';
import ProductChatScreen from '../screens/productchat/ProductChatScreen';
import TestSokia from '../screens/social/reel/create/sokia/TestSokia';
import SearchReels from '../screens/social/search/SearchReels';
import FilterFurniture from '../screens/furniture/FilterFurniture';
import ViewChatProfile from '../screens/whatsapps/ViewChatProfile';
import CategoryWiseRestaurant from '../screens/food/category/CategoryWiseRestaurant';
import ShowAAllresturant from '../screens/food/resturant/ShowAAllresturant';
import FoodViewcart from '../screens/food/cart/FoodViewcart';
import CuisineProductView from '../screens/food/cuisine/CuisineProductView';
import PaymentScreenFood from '../screens/shopping/payment/PaymentScreenFood';
import GetPaymentFoodScreen from '../screens/shopping/payment/GetPaymentFoodScreen';
import FoodProfile from '../screens/food/profile/FoodProfile';
import MyOrderfood from '../screens/food/order/MyOrderfood';
import HelpCenter from '../screens/helpcenter/HelpCenter';
import OpenBussiness from '../screens/helpcenter/OpenBussiness';
import MyReviews from '../screens/helpcenter/MyReviews';
import DiscountOfferModal from '../screens/food/Dashboard/DiscountOfferModal';
import Popularbrandsall from '../screens/food/Dashboard/Popularbrandsall';
import SettingSocial from '../screens/social/profile/SettingSocial';
import SavedReelsScreen from '../screens/social/post/SavedReelsScreen';
import JobHireDashboard from '../screens/job/hiredashboard/JobHireDashboard';
import VideoEditorImgly from '../screens/social/videoeditor/VideoEditorImgly';
import CameraEditorImgly from '../screens/social/videoeditor/CameraEditorImgly'
import CVDesign from '../screens/job/cv/CVDesign';
import CompanyJobpost from '../screens/job/postjob/CompanyJobpost';
import AIReelsScreen from '../screens/AI/AIReelsScreen';
/*import CardPayment from '../screens/payment/CardPayment';
 */
const Stack = createNativeStackNavigator<RootStackParamList>();
type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

export default function StackNavigator() {
  const navigation = useNavigation<NavigationProp>();

  return (
    <Stack.Navigator initialRouteName="FirstScreen">
      <Stack.Screen name="FirstScreen" component={FirstScreen}
        options={{ headerShown: false }} />
      {/* AuthScreen */}
      <Stack.Screen name="AuthScreen" component={AuthScreen}
        options={{ headerShown: false }} />
      {/* Signupwithmobile */}
      <Stack.Screen name="MainProfile" component={MainProfile}
        options={{ headerShown: false }} />
      <Stack.Screen name="Signupwithmobile" component={Signupwithmobile}
        options={{ headerShown: false }} />
      <Stack.Screen name="OtpScreen" component={OtpScreen}
        options={{ headerShown: false }} />
      <Stack.Screen name="ForgotPasswordScreen" component={ForgotPasswordScreen}
        options={{ headerShown: false }} />
      <Stack.Screen name="YourInterestScreen" component={YourInterestScreen}
        options={{ headerShown: false }} />

      <Stack.Screen name="StepOne" component={StepOne}
        options={{ headerShown: false }} />
      {/* StepFive */}
      <Stack.Screen name="StepFive" component={StepFive}
        options={{ headerShown: false }} />
      {/* StepTwo */}
      <Stack.Screen name="StepTwo" component={StepTwo}
        options={{ headerShown: false }} />
      {/* StepThree */}
      <Stack.Screen name="StepThree" component={StepThree}
        options={{ headerShown: false }} />
      {/* StepFour */}
      <Stack.Screen
        name="StepFour"
        component={StepFour}
        options={{
          headerShown: false
        }}
      />

      <Stack.Screen
        name="HomeScreen"
        component={HomeScreen}
        options={{
          headerShown: false,
          headerLeft: () => null, // Hide back icon
          gestureEnabled: false, // Optional: disable swipe back gesture
          headerTitle: () => (
            <Image
              source={require('../assets/logo.png')}
              style={{ width: 80, height: 30, resizeMode: 'contain' }}
            />
          ),
          headerRight: () => (
            <View style={styles.iconContainer}>
              <TouchableOpacity onPress={() => console.log('Search')}>
                <Icon name="search-outline" size={22} color="#000" style={styles.icon} />
              </TouchableOpacity>
              <TouchableOpacity onPress={() => console.log('Notifications')}>
                <Icon name="notifications-outline" size={22} color="#000" style={styles.icon} />
              </TouchableOpacity>
            </View>
          ),
        }}
      />


      <Stack.Screen name="Details" component={DetailsScreen} />
      <Stack.Screen name="HomeSocial" component={HomeSocial} options={{ headerShown: false }} />
      <Stack.Screen name="AIReelsScreen" component={AIReelsScreen} options={{ headerShown: false }} />
      {/* VideoEditorImgly AIReelsScreen*/}
      <Stack.Screen name="VideoEditorImgly" component={VideoEditorImgly} options={{ headerShown: false }} />
      <Stack.Screen name="CameraEditorImgly" component={CameraEditorImgly} options={{ headerShown: false }} />

      <Stack.Screen name="SavedReelsScreen" component={SavedReelsScreen} options={{ headerShown: false }} />
      <Stack.Screen name="SettingSocial" component={SettingSocial} options={{ headerShown: false }} />
 
      <Stack.Screen name="HomeWhatsapp" component={HomeWhatsapp}
        options={{ headerShown: false }} />

      <Stack.Screen name="ChatScreen" component={ChatScreen}
        options={{ headerShown: false }} />
      <Stack.Screen name="ChatDetails" component={ChatDetails}
        options={{ headerShown: false }} />

      <Stack.Screen name="ChatDetailsTest" component={ChatDetailsTest}
        options={{ headerShown: false }} />

      <Stack.Screen name="ViewChatProfile" component={ViewChatProfile}
        options={{ headerShown: false }} />
      <Stack.Screen name="Setting" component={Setting}
        options={{ headerShown: false }} />
      <Stack.Screen name="CreateGroup" component={CreateGroup}
        options={{ headerShown: false }} />
      <Stack.Screen name="AddNewgroupscreen" component={AddNewgroupscreen}
        options={{ headerShown: false }} />
      <Stack.Screen name="ScanNumber" component={ScanNumber}
        options={{ headerShown: false }} />
      <Stack.Screen name="LinkedDevices" component={LinkedDevices}
        options={{ headerShown: true, headerTitle: 'Connect Devices' }} />

      <Stack.Screen name="Account" component={Account}
        options={{ headerShown: true, headerTitle: 'Account' }} />

      <Stack.Screen name="Privacy" component={Privacy}
        options={{ headerShown: true, headerTitle: 'Privacy' }} />
      <Stack.Screen name="Chats" component={Chats}
        options={{ headerShown: true, headerTitle: 'Chats' }} />

      <Stack.Screen name="Profile" component={Profile}
        options={{ headerShown: true, headerTitle: 'Edit Profile' }} />

      <Stack.Screen name="StorageData" component={StorageData}
        options={{ headerShown: true, headerTitle: 'Storage Data' }} />
      <Stack.Screen name="Help" component={Help}
        options={{ headerShown: true, headerTitle: 'Help' }} />

      <Stack.Screen name="InviteFriends" component={InviteFriends}
        options={{ headerShown: false }} />


      {/* Social */}

      <Stack.Screen name="VideoDashboard" component={VideoDashboard}
        options={{ headerShown: false }} />
      <Stack.Screen name="VideoDetails" component={VideoDetails}
        options={{ headerShown: false }} />



      <Stack.Screen name="EditProfile" component={EditProfile}
        options={({ navigation }) => ({
          headerShown: true,
          headerTitle: () => (
            <Text style={{ fontSize: 12, fontWeight: 'bold' }}>Edit Profile</Text>
          ),
        })}

        />
      {/* CurrentUserFollowers */}
      <Stack.Screen name="CurrentUserFollowers" component={CurrentUserFollowers}
        options={{ headerShown: false, headerTitle: "Follower" }} />
      {/* CurrentUserFollowering */}
      <Stack.Screen name="CurrentUserFollowering" component={CurrentUserFollowering}
        options={{ headerShown: false, headerTitle: "Follower" }} />
      <Stack.Screen name="GalleryScreen" component={GalleryScreen}
        options={{ headerShown: false, headerTitle: "Gallery" }} />
      <Stack.Screen name="ListAds" component={ListAds}
        options={{ headerShown: true, headerTitle: "Ads Manager" }} />
      <Stack.Screen name="DashboardSearch" component={DashboardSearch}
        options={{ headerShown: false, headerTitle: "Ads Manager" }} />
      <Stack.Screen name="SearchReels" component={SearchReels}
        options={{ headerShown: false }} />
      {/* SearchReels */}
      <Stack.Screen name="NotificationPage" component={NotificationPage}
        options={{ headerShown: false, headerTitle: "Ads Manager" }} />
      {/* UserProfile */}
      <Stack.Screen name="UserProfile" component={UserProfile}
        options={{ headerShown: false, headerTitle: '' }} />

      <Stack.Screen name="SingleReel" component={SingleReel}
        options={{ headerShown: false }} />
      <Stack.Screen name="ShowReel" component={ShowReel}
        options={{ headerShown: false }} />
      <Stack.Screen name="StoryViewer" component={StoryViewer}
        options={{ headerShown: false }} />
      <Stack.Screen name="CreatePost" component={CreatePost}
        options={{ headerShown: false }} />
      <Stack.Screen name="NewReels" component={NewReels}
        options={{ headerShown: false }} />
      <Stack.Screen name="CreateStorymusic" component={CreateStorymusic}
        options={{ headerShown: false }} />


      <Stack.Screen name="NewReelcamera"
        component={NewReelcamera} options={{ headerShown: false }} />
      <Stack.Screen name="CreateStorytext"
        component={CreateStorytext} options={{ headerShown: false }} />

      <Stack.Screen name="ListTemplate"
        component={ListTemplate} options={{
          headerShown: true,
          headerTitle: "Template"
        }} />

      <Stack.Screen name="ShowReels"
        component={ShowReels} options={{
          headerShown: true,
          headerTitle: "Your Content"
        }} />

      <Stack.Screen name="SavedReel"
        component={SavedReel} options={{
          headerShown: true,
          headerTitle: "Saved"
        }} />

      <Stack.Screen name="CreateStory"
        component={CreateStory} options={{
          headerShown: false
        }} />
      <Stack.Screen name="MusicShowPage"
        component={MusicShowPage} options={{
          headerShown: false
        }} />

      <Stack.Screen name="MyProfile"
        component={MyProfile} options={{
          headerShown: false
        }} 
        
        />
      <Stack.Screen name="CameraReel"
        component={CameraReel} options={{
          headerShown: false
        }} />
      <Stack.Screen name="CreateTemplate" component={CreateTemplate} options={{
        headerShown: false
      }} />
      {/* start Live */}
      <Stack.Screen name="LiveScreen" component={LiveScreen} options={{
        headerShown: false
      }} />

      <Stack.Screen name="CreateLive" component={CreateLive} options={{
        headerShown: false
      }} />

      <Stack.Screen name="LiveScrollingstream" component={LiveScrollingstream} options={{
        headerShown: false
      }} />
      <Stack.Screen name="GetCoins" component={GetCoins} options={{
        headerShown: false
      }} />


      {/* FindFriends */}
      <Stack.Screen name="FindFriends" component={FindFriends} options={{
        headerShown: false
      }} />
      <Stack.Screen name="MarketPlace" component={MarketPlace} options={{
        headerShown: false
      }} />


      {/* End create Live */}
      {/* MyProfile */}

      {/* End Social */}

      {/* Motors */}
      <Stack.Screen name="Motors" component={Motors}
        options={{ headerShown: false }} />

      <Stack.Screen name="TestSound" component={TestSound}
        options={{ headerShown: true }} />

      <Stack.Screen name="MotorsAds" component={MotorsAds}
        options={{ headerShown: false }} />

      <Stack.Screen name="MotorsAdsdetails" component={MotorsAdsdetails}
        options={{ headerShown: false }} />
      <Stack.Screen name="MotorsDetails" component={MotorsDetails}
        options={{ headerShown: false }} />

      <Stack.Screen name="MotorsSubcategory" component={MotorsSubcategory}
        options={{ headerShown: false }} />


      {/* End Motors */}


      {/* Property */}

      <Stack.Screen
        name="PropertyScreen"
        component={PropertyScreen}
        options={({ navigation }) => ({
          headerShown: false,
          headerTitle: () => (
            <Text style={{ fontSize: 15, fontWeight: 'bold' }}>Property</Text>
          ),
          headerRight: () => (
            <TouchableOpacity
              onPress={() => {
                navigation.navigate("CreateAds")
              }}
              style={{
                flexDirection: 'row', alignItems: 'center', marginRight: 0,
                borderWidth: 0, borderColor: 'blue', padding: 3, height: 40,
                width: 110, borderRadius: 10, backgroundColor: '#007AFF'
              }}
            >
              <Ionicons name="add" size={20} color="#ffffff" style={{ marginRight: 5 }} />
              <Text style={{ fontSize: 15, color: '#ffffff' }}>Place Ads</Text>
            </TouchableOpacity>
          ),
        })}
      />
      {/* 
      JOb Module
      */}
      <Stack.Screen
        name="JobDashboard"
        component={JobDashboard}
        options={({ navigation }) => ({
          headerShown: false
        })}
      />
      {/* CVDesign */}
       <Stack.Screen
        name="CVDesign"
        component={CVDesign}
        options={({ navigation }) => ({
          headerShown: false
        })}
      />
      {/* CompanyJobpost */}
        <Stack.Screen
        name="CompanyJobpost"
        component={CompanyJobpost}
        options={({ navigation }) => ({
          headerShown: false
        })}
      />
      {/* JobHireDashboard */}

       <Stack.Screen
        name="JobHireDashboard"
        component={JobHireDashboard}
        options={({ navigation }) => ({
          headerShown: false
        })}
      />
      <Stack.Screen
        name="JobDetails"
        component={JobDetails}
        options={({ navigation }) => ({
          headerShown: false
        })}
      />
      <Stack.Screen
        name="JobCategoryall"
        component={JobCategoryall}
        options={({ navigation }) => ({
          headerShown: false
        })}
      />

      <Stack.Screen
        name="JobCategoryScreen"
        component={JobCategoryScreen}
        options={({ navigation }) => ({
          headerShown: false
        })}
      />

      {/* classified  */}
      <Stack.Screen
        name="ClassifiedDetails"
        component={ClassifiedDetails}
        options={({ navigation }) => ({
          headerShown: false
        })}
      />
      {/* SeeAllProduct */}
      <Stack.Screen
        name="SeeAllProduct"
        component={SeeAllProduct}
        options={({ navigation }) => ({
          headerShown: false
        })}
      />
      <Stack.Screen
        name="PropertyDashboard"
        component={PropertyDashboard}
        options={({ navigation }) => ({
          headerShown: false
        })}
      />
      {/* RecommandPropertyMore */}
      <Stack.Screen
        name="RecommandPropertyMore"
        component={RecommandPropertyMore}
        options={({ navigation }) => ({
          headerShown: false,
          headerTitle: 'Recommand Items'
        })}
      />
      <Stack.Screen
        name="SearchScreenPage"
        component={SearchScreenPage}
        options={({ navigation }) => ({
          headerShown: false
        })}
      />

      <Stack.Screen
        name="PropertyforRent"
        component={PropertyforRent}
        options={({ navigation }) => ({
          headerShown: false,
          headerTitle: 'Property for Rent'
        })}
      />


      {/* KeeplookingPropertyMore */}

      <Stack.Screen
        name="KeeplookingPropertyMore"
        component={KeeplookingPropertyMore}
        options={({ navigation }) => ({
          headerShown: true,
          headerTitle: 'Keep Looking for'
        })}
      />

      <Stack.Screen
        name="ChatProductInboxScreen"
        component={ChatProductInboxScreen}
        options={({ navigation }) => ({
          headerShown: true,
          headerTitle: 'Chat'
        })}
      />

      <Stack.Screen
        name="ProductChatScreen"
        component={ProductChatScreen}
        options={({ navigation }) => ({
          headerShown: false
        })}
      />
      <Stack.Screen
        name="TestSokia"
        component={TestSokia}
        options={({ navigation }) => ({
          headerShown: false
        })}
      />


      <Stack.Screen name="ViewAgent"
        component={ViewAgent}
        options={() => ({
          headerShown: false
        })}
      />
      <Stack.Screen
        name="MoreFilter"
        component={MoreFilter}
        options={({ navigation }) => ({
          headerShown: false
        })}
      />

      <Stack.Screen
        name="PropertyDetails"
        component={PropertyDetails}
        options={({ navigation }) => ({
          headerShown: false
        })}
      />
      <Stack.Screen
        name="PropertyFavouites"
        component={PropertyFavouites}
        options={({ navigation }) => ({
          headerShown: true, headerTitle: 'Favourite'
        })}
      />




      {/* CreateAds */}

      <Stack.Screen
        name="CreateAds"
        component={CreateAds}
        options={({ navigation }) => ({
          headerShown: false
        })}
      />

      <Stack.Screen
        name="ConfirmAds"
        component={ConfirmAds}
        options={({ navigation }) => ({
          headerShown: false
        })}
      />
      {/* MyAds */}
      <Stack.Screen
        name="MyAds"
        component={MyAds}
        options={{
          headerShown: true,
          headerTitle: 'My Ads',
          headerTitleStyle: {
            fontSize: 14,   // change this to your desired size
            fontWeight: 'bold', // optional
          },
        }}
      />

      <Stack.Screen name="PropertyUserhistory" component={PropertyUserhistory} options={({ navigation }) => ({
        headerShown: true,
        headerTitle: 'My History'
      })}
      />

      <Stack.Screen
        name="CreateAdsdetails"
        component={CreateAdsdetails}
        options={({ navigation }) => ({
          headerShown: false
        })}
      />

      <Stack.Screen
        name="PropertyProfile"
        component={PropertyProfile}
        options={({ navigation }) => ({
          headerShown: false
        })}
      />

      <Stack.Screen name="CreateStream" component={CreateStream}
        options={{ headerShown: false, headerTitle: 'Find' }} />

      <Stack.Screen name="PropertyFind" component={PropertyFind}
        options={{ headerShown: false, headerTitle: 'Find' }} />
      {/* End Property */}

      {/* FilterClassified */}
      <Stack.Screen name="FilterClassified" component={FilterClassified}
        options={{ headerShown: false }} />

      <Stack.Screen name="FilterFurniture" component={FilterFurniture}
        options={{ headerShown: false }} />
      {/* end FilterClassified */}

      {/* Ecommerce */}
      <Stack.Screen name="ShoppingDashboard" component={ShoppingDashboard}
        options={{ headerShown: false }} />
      <Stack.Screen name="ViewCategories" component={ViewCategories}
        options={{ headerShown: false }} />
      <Stack.Screen name="GetPaymentScreen" component={GetPaymentScreen}
        options={{ headerShown: false }} />
      {/* FoodProfile */}
      <Stack.Screen name="FoodProfile" component={FoodProfile}
        options={{ headerShown: false }} />

      <Stack.Screen name="GetPaymentFoodScreen" component={GetPaymentFoodScreen}
        options={{ headerShown: false }} />
      {/* GetPaymentFoodScreen */}
      <Stack.Screen name="ViewOrder" component={ViewOrder}
        options={{ headerShown: false }} />
      <Stack.Screen name="MyOrder" component={MyOrder}
        options={{ headerShown: false }} />
      <Stack.Screen name="ProductReview" component={ProductReview}
        options={{ headerShown: true, title: 'Product Review' }} />
      <Stack.Screen name="DeliveryAddress" component={DeliveryAddress}
        options={{ headerShown: false }} />

      <Stack.Screen name="PaymentDetails" component={PaymentDetails}
        options={{ headerShown: false }} />




      {/*  */}
      <Stack.Screen name="ShoppingSearchscreen" component={ShoppingSearchscreen}
        options={{ headerShown: false }} />
      {/* CategoryShowmore */}
      <Stack.Screen name="CategoryShowmore" component={CategoryShowmore}
        options={{ headerShown: false }} />
      {/*  GroupShopmore */}
      {/* ShoppingProfile */}
      <Stack.Screen name="ShoppingProfile" component={ShoppingProfile}
        options={{ headerShown: false }} />

      <Stack.Screen name="PaymentScreen" component={PaymentScreen}
        options={{ headerShown: false }} />
      <Stack.Screen name="GroupShopmore" component={GroupShopmore}
        options={{ headerShown: false }} />

      <Stack.Screen name="ViewCart" component={ViewCart}
        options={{ headerShown: false }} />

      <Stack.Screen name="SingleCategoryProduct" component={SingleCategoryProduct}
        options={{ headerShown: false }} />

      <Stack.Screen name="SingleProduct" component={SingleProduct}
        options={{ headerShown: false }} />
      {/* Food Module */}

      <Stack.Screen name="FoodDashboard" component={FoodDashboard}
        options={{ headerShown: false }} />
      {/* Popularbrandsall */}
      <Stack.Screen name="Popularbrandsall" component={Popularbrandsall}
        options={{ headerShown: false }} />

      <Stack.Screen name="MyOrderfood" component={MyOrderfood}
        options={{ headerShown: false }} />
      <Stack.Screen name="CuisineProductView" component={CuisineProductView}
        options={{ headerShown: false }} />
      <Stack.Screen name="HelpCenter" component={HelpCenter}
        options={{ headerShown: false }} />
      <Stack.Screen name="OpenBussiness" component={OpenBussiness}
        options={{ headerShown: false }} />

      <Stack.Screen name="MyReviews" component={MyReviews}
        options={{ headerShown: false }} />

      <Stack.Screen name="DiscountOfferModal" component={DiscountOfferModal}
        options={{ headerShown: false }} />

      {/* OpenBussiness MyReviews */}
      {/*  */}
      {/* CategoryWiseRestaurant */}
      <Stack.Screen name="CategoryWiseRestaurant"
        component={CategoryWiseRestaurant}
        options={{ headerShown: false }} />

      <Stack.Screen name="FoodViewcart"
        component={FoodViewcart}
        options={{ headerShown: false }} />

      <Stack.Screen name="PaymentScreenFood"
        component={PaymentScreenFood}
        options={{ headerShown: false }} />


      <Stack.Screen name="ShowAAllresturant"
        component={ShowAAllresturant}
        options={{ headerShown: false }} />

      <Stack.Screen name="RestaurantScreen" component={RestaurantScreen}
        options={{ headerShown: false }} />
      <Stack.Screen name="ListofLive" component={ListofLive}
        options={{ headerShown: false }} />
      {/* InteractiveRoom */}
      <Stack.Screen name="InteractiveRoom" component={InteractiveRoom}
        options={{ headerShown: false }} />

      <Stack.Screen name="PaymentScreenClassified"
        component={PaymentScreenClassified}
        options={{ headerShown: false }} />
      <Stack.Screen name="SuccessScreen"
        component={SuccessScreen}
        options={{ headerShown: false }} />
      {/* PaymentScreenMotors */}
      <Stack.Screen name="PaymentScreenMotors"
        component={PaymentScreenMotors}
        options={{ headerShown: false }} />
      {/* PaymentScreenProperty */}
      <Stack.Screen name="PaymentScreenProperty"
        component={PaymentScreenProperty}
        options={{ headerShown: false }} />

      {/*  */}
      {/*   <Stack.Screen name="CardPayment" component={CardPayment}
      options={{ headerShown: false }} /> */}


      {/* End Food Module */}

      {/* Social Media module — backend end-to-end tester.
          Reach it with navigation.navigate('SocialLab') */}
      <Stack.Screen name="SocialLab" component={SocialLab}
        options={{ headerShown: false }} />
    </Stack.Navigator>
  );
}

const styles = StyleSheet.create({
  iconContainer: {
    flexDirection: 'row',
  },
  icon: {
    padding: 5,
  },
});
