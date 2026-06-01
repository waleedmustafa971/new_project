import * as base from '../../../component/global'
export const sponsorAds = [
  {
    id: "ad1",
    type: "carousel",
    advertiser: "Temu",
    advertiser_logo: "Temu",
    cta: "Buy",
    link: "https://www.temu.com",
    location: "Dubai",
    "fromage": "20",
    "toage": "35",
    paymenttype: "cash/Visa/paypal/MasterCard/Cripto",
    currency : "AED/USD",
    price : "10",
    period: "10 Days",
    from_date_range: "",
    to_date_range: "",
    products: [
      { id: "1", title: "Smartwatch", price: "AED 24.40", image: base.BASE_URL + "/uploads/sponsorads/carousel/watch.webp" },
      { id: "2", title: "Handmade Shoes Soft Sole", price: "AED 58.23", image: base.BASE_URL + "/uploads/sponsorads/carousel/shoe.webp" },
      { id: "3", title: "Wireless Lavalier Microphone", price: "AED 28.97", image: base.BASE_URL + "/uploads/sponsorads/carousel/mic.webp" },
      { id: "4", title: "Leather Belt with Golden", price: "AED 10.97", image: base.BASE_URL + "/uploads/sponsorads/carousel/belt.webp" },
      { id: "5", title: "Teeth Whitening Powder", price: "AED 28.97", image: base.BASE_URL + "/uploads/sponsorads/carousel/tooth.webp" },
    ]
  },
  {
    id: "ad2",
    type: "single",
    advertiser: "Fashion House",
     advertiser: "Temu",
    cta: "Buy Now",
     location: "Dubai",
    "fromage": "20",
    "toage": "35",
    paymenttype: "cash/Visa/paypal/MasterCard/Cripto",
    currency : "AED/USD",
    price : "10",
    period: "10 Days",
    from_date_range: "",
    to_date_range: "",
    link: "https://www.temu.com/ae/mens--fit-casual--light-gray-two-button-suit-jacket-with-flap-pockets-long-sleeve--business-or-semi-formal-wear-g-601100250659160.html?top_gallery_url=https%3A%2F%2Fimg.kwcdn.com%2Fproduct%2Fopen%2F187c9a5661da4ff68bedc1dca5048376-goods.jpeg&spec_id=16085&spec_gallery_id=68360&refer_page_sn=10009&refer_source=0&freesia_scene=2&_oak_freesia_scene=2&_oak_rec_ext_1=NzA5OA&_oak_gallery_order=631693168%2C365777754%2C1009796063%2C156835714%2C1444292126&_oak_mp_inf=ENjyqPeo1ogBGiA5YTVlNTdjMTg4ZjA0ZjI3YmFhZmUyYTYyZTY4YzFhNyCFov%2BI%2FzI%3D&spec_ids=16085%2C95614&search_key=jacket%20for%20men&refer_page_el_sn=200049&_x_channel_src=1&_x_channel_scene=spike&_x_sessn_id=2s75qy9ia4&refer_page_name=search_result&refer_page_id=10009_1752097085535_i71kvzlw41",
    product: {
      title: "Men's Slim Fit Casual Blazer - Light Gray Two Button Suit Jacket with Flap Pockets, Long Sleeve, Spring/Fall Business or Semi-Formal Wear",
      price: "AED 70",
      image: base.BASE_URL + "/uploads/sponsorads/single/jacket.webp"
    }
  },
  {
    id: "ad3",
    type: "grid",
    advertiser: "dubizzle",
     advertiser: "Temu",
    cta: "Explore",
     location: "Dubai",
    "fromage": "20",
    "toage": "35",
    paymenttype: "cash/Visa/paypal/MasterCard/Cripto",
    currency : "AED/USD",
    price : "10",
    period: "10 Days",
    from_date_range: "",
    to_date_range: "",
    link: "https://dubai.dubizzle.com/property-for-rent/residential/apartmentflat/2025/6/8/fully-furnished-studio-white-spacious-u-2-146977/",
    products: [
      { id: "1", title: "1 Bed 2 Bath", 
        price: "AED 43000", 
        image: base.BASE_URL + "/uploads/sponsorads/grid/property1.webp" },
      { id: "2", title: "Studio - 1 Bath ", price: "AED 55000", image: base.BASE_URL + "/uploads/sponsorads/grid/studio1bath.webp" },
      { id: "3", title: "Studio - 2 Bath", price: "AED 70000", image: base.BASE_URL + "/uploads/sponsorads/grid/1bed.webp" },
      { id: "4", title: "Lexus ES-Series 350", price: "AED 18,000", image: base.BASE_URL + "/uploads/sponsorads/grid/car1.webp" }
    ]
  }
];
