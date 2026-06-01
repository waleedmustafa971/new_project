const cartItems = [
  {
    id: 1,
    image: "https://i.pravatar.cc/150?img=32",
    name: "Lorem ipsum dolor sit amet consectetur.",
    price: 17,
    color: "Pink",
    size: "M",
    quantity: 1,
  },
  {
    id: 2,
    image: "https://i.pravatar.cc/150?img=14",
    name: "Lorem ipsum dolor sit amet consectetur.",
    price: 17,
    color: "Pink",
    size: "M",
    quantity: 1,
  },
  {
    id: 3,
    image: "https://i.pravatar.cc/150?img=33",
    name: "Lorem ipsum dolor sit amet consectetur.",
    price: 17,
    color: "Pink",
    size: "M",
    quantity: 1,
  },
  {
    id: 4,
    image: "https://i.pravatar.cc/150?img=24",
    name: "Lorem ipsum dolor sit amet consectetur.",
    price: 17,
    color: "Pink",
    size: "M",
    quantity: 1,
  },
];

const wishlistItems = [
  {
    id: 5,
    image: "https://i.pravatar.cc/150?img=56",
    name: "Lorem ",
    price: 18,
    color: "Pink",
    size: "M",
  },
  {
    id: 6,
    image: "https://i.pravatar.cc/150?img=47",
    name: "Lorem ipsum dolor sit amet consectetur.",
    price: 19,
    color: "green",
    size: "M",
  },
   {
    id: 7,
    image: "https://i.pravatar.cc/150?img=47",
    name: "Lorem ipsum dolor sit amet consectetur.",
    price: 20,
    color: "blue",
    size: "M",
  },
   {
    id: 8,
    image: "https://i.pravatar.cc/150?img=47",
    name: "Lorem ipsum dolor sit amet consectetur.",
    price: 21,
    color: "Purple",
    size: "M",
  },
];

const shippingOptions = [
  { id: 1, type: "Standard", cost: 5, duration: "3-5 days" },
  { id: 2, type: "Express", cost: 15, duration: "1-2 days" },
];

const foodshippingOptions = [
  { id: 0, type: "free delivery", cost: 0, duration: "25-40 mins" },
  { id: 1, type: "Standard", cost: 7, duration: "25-40 mins" },
  { id: 2, type: "Priority", cost: 10, duration: "20-30 mins" },
];

const vouchers = [
  {
    id: 1,
    title: "First Purchase",
    icon:"shopping-bag",
    description: "5% off your next order",
    discount: 5,
    validUntil: "5/06/25",
  },
  {
    id: 2,
    title: "Gift From Customer Care",
    icon:"gift",
    description: "15% off for your next purchase",
    discount: 15,
    validUntil: "6/20/25",
  },
];


export { cartItems, wishlistItems, shippingOptions, vouchers, foodshippingOptions };
