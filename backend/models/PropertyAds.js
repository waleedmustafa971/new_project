import mongoose from "mongoose";


const ImageSchema = new mongoose.Schema({
  slNo: { type: Number, required: true },
  image: { type: String, required: true },
}); // _id is automatically generated

const SimilarSchema = new mongoose.Schema({
  date: { type: String },
  price: { type: String },
  sqft: { type: String }
}); // _id is automatically generated


// Define sub-schema for comments
const packageSchema = new mongoose.Schema({
  userid: {
   type: mongoose.Schema.Types.ObjectId,
   ref: "users",
   }, // User who posted the comment
  packageid: { type: String, required: true },  // The comment text
  details: { type: Object },  // The comment text
  timestamp: { type: Date, default: Date.now }, // When the comment was posted
});

// Define sub-schema for comments
const paymentSchema = new mongoose.Schema({
  userid: { type: String, required: true }, // User who posted the comment
  packageid: { type: String, required: true },  // The comment text
  details: { type: Object },  // The comment text
  timestamp: { type: Date, default: Date.now }, // When the comment was posted
});

// Main Property Advertisement schema
const categorySchema = new mongoose.Schema({
   userid: {
   type: mongoose.Schema.Types.ObjectId,
   ref: "users",
   }, 
  country: { type: String, required: true },
  package: { type: [packageSchema], default: [] },
  payment: { type: [paymentSchema], default: [] },
  city: { type: String, required: true },
  propertyType: { type: String },
  shortTitle: { type: String, required: true, maxlength: 100 },
  mainCategory: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Category"
  },
  subCategory: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Category"
  },
  dealername: { type: String },
  landlordAgent: { type: String },
  images: [ImageSchema],
  similartransaction: [SimilarSchema],
  youtubeURL: { type: String },
  phoneNo: { type: String },
  whatsapp: { type: String },
  price: { type: Number, min: 0 },
  currency: { type: String },
  description: { type: String, maxlength: 5000 },
  size: { type: Number, min: 0 },
  rentispaid: { type: String },
  totalClosingFee: { type: String },
  bedrooms: { type: Number, min: 0 },
  bathrooms: { type: Number, min: 0 },
  readyByDate: { type: Date },
  annualCommunityFee: { type: String },
  isFurnished: { type: String },
  propertyReference: { type: String },
  buyerTransferFee: { type: String },
  developer: { type: String },
  sellerTransferFee: { type: String },
  maintenanceFee: { type: String },
  occupancyStatus: { type: String }, //, enum: ['Vacant', 'Occupied'] 
  amenities: {
    type: [String],
    default: [],
  },
  maplocation: {
    type: { type: String, enum: ['Point'], default: 'Point' },
    coordinates: { type: [Number], index: '2dsphere' } // [longitude, latitude]
  },
  location: { type: String },
  agency: { type: Object },
  lat: { type: String },
  long: { type: String },
  statename: { type: String },
  RERAlandlordname: { type: String },
  RERApreregistrationnumber: { type: String },
  RERAtitledeednumber: { type: String },
  RERA_property_status: { type: String },
  status: {
    type: String,
    enum: ['draft', 'active', 'inactive', 'live', 'reject'],
    default: 'draft'
  },
  created_draft_time: { type: String },
  created_approve_time: { type: String },
  motorsType: { type: String },
  makemodel: { type: String },
  trim: { type: String },
  regional_specs: { type: String },
  year: { type: String },
  kilometers: { type: String },
  bodytype: { type: String },
  carinsurance: { type: String },
  fueltype: { type: String },
  externalcolor: { type: String },
  interiorcolor: { type: String },
  warranty: { type: String },
  doors: { type: String },
  transmissiontypes: { type: String },
  seatingcapacity: { type: String },
  horosepower: { type: String },
  steeringside: { type: String },
  horsepower: { type: String },
  add_post: { type: String },
  technical_features: [String],
  extras: [String],
  viewsCount: { type: Number, default: 0 },
  favouritesCount: { type: Number, default: 0 },
  favouritshistory: [{
   userid: {
   type: mongoose.Schema.Types.ObjectId,
   ref: "users",
   },
    viewedAt: { type: Date, default: Date.now }
  }],
  viewHistory: [{
    userid: {
   type: mongoose.Schema.Types.ObjectId,
   ref: "users",
   },
    viewedAt: { type: Date, default: Date.now }
  }],
  minimumcontractperiodinmonth: { type: String },
  noticeperiodinmonths: { type: String },
  securitydeposit: { type: String },
  numberoftenants: { type: String },
  typeoftenants: { type: String },
  bathroomstype: { type: String },
  preferrednationalityoftenants: { type: String },
  balcony: { type: String },
  roomtype: { type: String },
  optiontypes: { type: String },
  contactoptions: {
    type: String,
    enum: ['Messages calls whatsapp', 'whatsapp', 'calls', 'message only'],
    default: 'Messages calls whatsapp'
  },
  age: { type: String },
  usage: { type: String },
  condition: { type: String },
  log: {type : Object}
}, { timestamps: true });


export default mongoose.model("Propertyads", categorySchema);
