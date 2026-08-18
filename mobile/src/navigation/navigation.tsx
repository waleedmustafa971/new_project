// src/types/navigation.ts RootStackParamList
export type RootStackParamList = {
    HomeScreen: undefined;
    AuthScreen: undefined;
    Details: undefined;
    HomeSocial: undefined;
    /** Social Media module: backend end-to-end tester (developer screen) */
    SocialLab: undefined;
    AIReelsScreen: undefined;
    SavedReelsScreen: undefined;
    SettingSocial: undefined;
    MainProfile: undefined;
    YourInterestScreen: undefined;
    EditProfile: { userdata : object};
    CurrentUserFollowers: {username: string};
    CurrentUserFollowering:  {username: string};
    HomeWhatsapp: undefined;
    FirstScreen: undefined;
    DeliveryAddress: undefined;
    PaymentDetails: undefined;
    StepOne: undefined;
    ChatScreen: { userid: string, userinfo: object };
    ChatDetails: { me: string, partner: string, userinfo: object, type: string };
    ViewChatProfile : {partnerid : string, partnername: string},
    ChatDetailsTest: { me: string, partner: string, userinfo: object, type: string },
    AddNewgroupscreen: undefined;
    StepFive: undefined;
    OtpScreen: { mobileno: string, isitreg: string };
    ForgotPasswordScreen: undefined;
    StepTwo: undefined;
    StepThree: undefined;
    StepFour: undefined;
    Signupwithmobile: undefined;
    Setting: { userid: string, userinfo: object };
    ScanNumber: { userid: string, userinfo: object };
    CreateGroup: { userid: string, userinfo: object };
    SingleReel: undefined;
    ShowReel: undefined;
    Motors: undefined;
    MotorsAds: {item : String};
    MotorsAdsdetails: {id: string, itemdetails: object, userid: string},
    PaymentScreenMotors: {id: string, type: string, userid: string},
    PaymentScreenProperty: {id: string, type: string, userid: string},
    MotorsDetails: {item: string},
    MotorsSubcategory: {categories: string, subcategories: object},
    StoryViewer: undefined;
    TestSound: undefined;
    PropertyDashboard: undefined;
    PropertyDetails:  {itemdetails: object},
    PropertyFavouites: undefined;
    MoreFilter: { type: string};
    PropertyScreen: undefined;
    PropertyFind: {filters: object},
    MyAds: undefined;
    PropertyUserhistory: undefined;
    ViewAgent: { propertyid: object },
    FilterClassified: undefined;
    CreatePost: undefined;
    NewReels: undefined;
    NewReelcamera: { typescreen: string, picture: string, 
    imagetype: string, musictype: string, posttype: string };
    CreateStorytext: undefined;
    CreateStorymusic: undefined;
    ListTemplate: undefined;
    ShowReels: undefined;
    SavedReel: {userId: string};
    MarketPlace: undefined;
    CreateStream: undefined;
    CreateStory: undefined;
    MusicShowPage: undefined;
    MyProfile: undefined;
    CameraReel: undefined;
    CreateTemplate: {id: number, videoUrl: string, clip: string, durations : string};
    LiveScreen: undefined;
    CreateLive: undefined;
    LiveScrollingstream: undefined;
    GetCoins: undefined;
    CreateAdsdetails: {id: string, itemdetails: object, userid: string};
    CreateAds: { item: String, location: object };
    ChatProductInboxScreen: undefined;
    ProductChatScreen: {   chatId: string,
            productId: string,
            otherUserId: string,
            userid: string },
    ConfirmAds: {item: String};
    PropertyProfile: undefined;
    FindFriends: undefined;
    LinkedDevices: undefined;
    Account: undefined;
    Privacy: undefined;
    Chats: undefined;
    StorageData: undefined;
    Help: undefined;
    InviteFriends: undefined;
    profile: { userid: string, userinfo: object };
    GalleryScreen: {userId: string};
    ListAds: {userId: string};
    DashboardSearch: undefined;
    SearchReels: undefined;
    ViewCart: undefined;
    NotificationPage: undefined;
    UserProfile: {userid: string, name: string, image: string, email: string},
    ShoppingDashboard: undefined;
    ViewCategories: undefined;
    MyOrder: undefined;
    ProductReview: {productId: string, productname: string, orderId: string};
    GetPaymentScreen: {total: number, email: string, mobile: string, 
      selectedAddress: string, voucherlist: object};
    ViewOrder: {orderid: string};
    ShoppingSearchscreen: undefined;
    PaymentScreen: {cartItems: object, total: number, selectedaddress: string, promocode: string};
    ShoppingProfile: undefined;
    GroupShopmore: {title: string, products: object};
    CategoryShowmore: {data: object};
    SingleCategoryProduct: {categoryid: string, categoryname: string};
    SingleProduct: {productData: object};
    VideoDashboard: undefined;
    VideoDetails: {video : object};
    RecommandPropertyMore: { type: string };
    KeeplookingPropertyMore: undefined;
    PropertyforRent: { type: string };
    SearchScreenPage: { search: string, Category: string };
    ClassifiedDetails: { type : object};
    SeeAllProduct: {category : string, subcategories: object,
       age: string,
                            condition: string,
                            usage: string,
                            minPrice: number,
                            maxPrice: number,
                            title: string,
                            city: string
    };
    JobDashboard: undefined;
    CompanyJobpost: {type: string},
    CVDesign: undefined;
    JobHireDashboard: undefined;
    VideoEditorImgly: undefined;
    CameraEditorImgly: undefined;
    JobCategoryall: { data: object },
    JobCategoryScreen: {slug: string};
    JobDetails: {_id: string};
    FoodDashboard: undefined;
    MyOrderfood: undefined;
    HelpCenter: undefined;
    OpenBussiness: undefined;
    MyReviews: undefined;
    FoodProfile: undefined;
    GetPaymentFoodScreen: {total: number, email: string, mobile: string, 
    selectedAddress: string, voucherlist: object};
    PaymentScreenFood: {cartItems: object, total: number, selectedaddress: string, promocode: string};
    CuisineProductView: undefined;
    FoodViewcart: undefined;
    RestaurantScreen: undefined;
    ShowAAllresturant: {lat: string, long: string, type: string};
    Popularbrandsall: {lat: string, long: string, type: string};
    CategoryWiseRestaurant: {category_id: string, address: string,  latitude: number,
    longitude: number},
    DiscountOfferModal: {latitude: number, longitude: number};
    ListofLive: undefined;
    InteractiveRoom: {channelName: string, hosterinfo: object, userid: string};
   PaymentScreenClassified: undefined;
   SuccessScreen: undefined;
   TestSokia: undefined;
   /* CardPayment:  { id: string, type: string }; */

  // add other screens here
  FilterFurniture: undefined;
};
