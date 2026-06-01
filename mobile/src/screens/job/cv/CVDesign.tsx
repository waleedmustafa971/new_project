import React, { useEffect, useState } from 'react';
import {
    StyleSheet,
    View,
    Text,
    ScrollView,
    Image,
    TouchableOpacity,
    SafeAreaView,
    Dimensions, Platform
} from 'react-native';
import ResumeCard from './ResumeCard';
import ResumeModal from './ResumeModal';
import QualificationsModal from './QualificationsModal';
import BasicModal from './BasicModal';
import ExperienceAddModal from './ExperienceAddModal';
import api from '../../../component/api';
import AsyncStorage from "@react-native-async-storage/async-storage";
import PortfolioModal from './PortfolioModal';
import CertificatesModalScreen from './CertificatesModalScreen';
import DigitalProfileModalScreen from './DigitalProfileModalScreen';
import Toast from 'react-native-toast-message';
import { launchImageLibrary } from 'react-native-image-picker';
import { BASE_URL } from '../../../component/global';

const { width } = Dimensions.get('window');
const isTablet = width > 768;

const CVDesign = () => {
    const [modalVisible, setModalVisible] = React.useState(false);
    const [showbasicmodal, setShowbasicmodal] = React.useState(false)
    const [certificatesModal, setCertificatesModal] = React.useState(false)
    const [isModalQualificationOpen, setIsModalQualificationOpen] = React.useState(false)
    const [isModalexperienceOpen, setIsModalexperienceOpen] = React.useState(false)
    const [isModalPortfolioOpen, setIsModalPortfolioOpen] = React.useState(false)
    const [resumeName, setResumeName] = React.useState("manirul-islam-resume.pdf");
    const [qualifications, setQualifications] = React.useState([]);
    const [jobcategoriesdata, setJobcategoriesdata] = useState([]);
    const [loading, setLoading] = useState(false)
    const [portfolioshowmodal, setPortfolioshowmodal] = useState(false)
    const [digitalshowmodal, setDigitalshowmodal] = useState(false)
    const [basicdatainfo, setBasicdatainfo] = useState<any>(null);
    const [profileImage, setProfileImage] = useState(null);

    const handleSaveResume = (newData: any) => {
        setResumeName(newData); // Value passed from Child/Modal to Parent
        console.log('....newData..... ', newData)
        setModalVisible(false);
        /* 
        const [form, setForm] = useState({
            emailid: "",
            phoneno: "",
            gender: "",
            dateofbirth: "",
            languages: [],
            nationality: "", //multi
            currentcity: "",
            visastatus: "",
            careerlevel: "",
            desiriedsalary: "",
            skills: [], // multi
          });
        */

    };

    const handleSavebasic = async (data: any) => {
        const jsonValue = await AsyncStorage.getItem("userdata");
        if (jsonValue != null) {
            const userData = JSON.parse(jsonValue);
            try {
                const payload = {
                    userid: userData._id,
                    basicinfo: data
                };
                console.log(payload);
                const response: any = await api.post(
                    "/apis/job/basicinfo",
                    payload
                );
                console.log("response...", response.data.data);
                setShowbasicmodal(false)
                setBasicdatainfo(response.data.data)


            } catch (error: any) {
                console.error("🔥 FULL ERROR:", error);
                console.error("🔥 MESSAGE:", error.message);
                console.log({
                    message: "Error saving basic info",
                    error: error.message
                });
            }
        }
    };

    const addQualification = async (data: any) => {
        //setQualifications([...qualifications, data]);
        console.log("New Qualification received:", data);
        const jsonValue = await AsyncStorage.getItem("userdata");
        if (jsonValue != null) {
            const userData = JSON.parse(jsonValue);
            try {
                const payload = {
                    userid: userData._id,
                    qualification: data
                };
                console.log(payload);
                const response: any = await api.post(
                    "/apis/job/add-qualification",
                    payload
                );
                console.log("response...", response.data.data);
                setShowbasicmodal(false)
                setBasicdatainfo(response.data.data)


            } catch (error: any) {
                console.error("🔥 FULL ERROR:", error);
                console.error("🔥 MESSAGE:", error.message);
                console.log({
                    message: "Error saving qualification info",
                    error: error.message
                });
            }
        }
    };
    useEffect(() => {
        getJobcat()
        getPreviousdata()
    }, [])

    const getPreviousdata = async () => {
        try {
            setLoading(true);

            const jsonValue = await AsyncStorage.getItem("userdata");

            if (!jsonValue) return;

            const userData = JSON.parse(jsonValue);

            const res = await api.get(
                `/apis/job/get-cv-approval?page=1&limit=1&userid=${userData._id}`
            );
            //  console.log("API response:", res.data?.data[0]);
            setBasicdatainfo(res.data?.data[0] || null);

        } catch (error) {
            console.error("Error fetching CV:", error);
        } finally {
            setLoading(false);
        }
    };
    const getJobcat = async () => {
        try {
            const res = await api.get(
                "/apis/job/getlist?page=1&limit=100"
            );
            //  console.log('job category......' + res.data);
            setJobcategoriesdata(res.data || []);
        } catch (error) {
            console.error("Error fetching job categories:", error);
        } finally {
            setLoading(false);
        }
    }

    const addExperience = async (formData: any) => {
        console.log("addExperience received:", formData);
        const jsonValue = await AsyncStorage.getItem("userdata");
        if (jsonValue != null) {
            const userData = JSON.parse(jsonValue);
            try {
                const payload = {
                    userid: userData._id,
                    experience: formData
                };
                console.log(payload);
                const response: any = await api.post(
                    "/apis/job/add-experience",
                    payload
                );
                console.log("response...", response.data.data);
                setShowbasicmodal(false)
                setBasicdatainfo(response.data.data)


            } catch (error: any) {
                console.error("🔥 FULL ERROR:", error);
                console.error("🔥 MESSAGE:", error.message);
                console.log({
                    message: "Error saving add-portfolio info",
                    error: error.message
                });
            }
        }

    };
    //handleSaveportfolio
    const handleSaveportfolio = async (formData: any) => {
        console.log("portfolio received:", formData);
        const jsonValue = await AsyncStorage.getItem("userdata");
        if (jsonValue != null) {
            const userData = JSON.parse(jsonValue);
            try {
                const payload = {
                    userid: userData._id,
                    portfolio: formData
                };
                console.log(payload);
                const response: any = await api.post(
                    "/apis/job/add-portfolio",
                    payload
                );
                console.log("response...", response.data.data);
                setShowbasicmodal(false)
                setBasicdatainfo(response.data.data)


            } catch (error: any) {
                console.error("🔥 FULL ERROR:", error);
                console.error("🔥 MESSAGE:", error.message);
                console.log({
                    message: "Error saving add-portfolio info",
                    error: error.message
                });
            }
        }
    };
    const handleSaveCertificate = async (formData: any) => {
        //  console.log("savecertificate Data:", formData);
        console.log("certificate received:", formData);
        const jsonValue = await AsyncStorage.getItem("userdata");
        if (jsonValue != null) {
            const userData = JSON.parse(jsonValue);
            try {
                const payload = {
                    userid: userData._id,
                    certificate: formData
                };
                console.log(payload);
                const response: any = await api.post(
                    "/apis/job/add-certificates",
                    payload
                );
                console.log("response...", response.data.data);
                setShowbasicmodal(false)
                setBasicdatainfo(response.data.data)


            } catch (error: any) {
                console.error("🔥 FULL ERROR:", error);
                console.error("🔥 MESSAGE:", error.message);
                console.log({
                    message: "Error saving certificate info",
                    error: error.message
                });
            }
        }

    }
    const handleSaveDigital = async (file: any) => {
        console.log("file Data:", file);
        const jsonValue = await AsyncStorage.getItem("userdata");
        const userData = JSON.parse(jsonValue || "{}");
        const formData = new FormData();

        formData.append("userid", userData._id);
        formData.append("file", {
            uri: file.uri,
            type: file.type,
            name: file.name
        });
        try {
            const res = await api.post("/apis/job/add-digital-profile", formData, {
                headers: {
                    "Content-Type": "multipart/form-data"
                }
            });
            console.log("Uploaded:", res.data);
        } catch (err) {
            console.log("Upload error:", err);
        }

    }
    const formatDate = (date: string | Date | undefined) => {
        if (!date) return "";

        const d = new Date(date);

        const day = String(d.getDate()).padStart(2, "0");
        const month = String(d.getMonth() + 1).padStart(2, "0");
        const year = String(d.getFullYear()).slice(-2);

        return `${day}/${month}/${year}`;
    };

    const pickImage = async () => {
        const jsonValue = await AsyncStorage.getItem("userdata");
        const userData = JSON.parse(jsonValue || "{}");
        try {
            // Pick image
            const result: any = await new Promise((resolve, reject) => {
                launchImageLibrary(
                    { mediaType: 'photo', selectionLimit: 1 },
                    response => {
                        if (response.didCancel) reject('User cancelled image picker');
                        else if (response.errorCode) reject(response.errorMessage);
                        else if (response.assets?.length) resolve(response.assets[0]);
                        else reject('No image selected');
                    }
                );
            });

            const imageUri = result.uri;

            setProfileImage(imageUri);
            setLoading(true);
            // Prepare form data
            const formData = new FormData();
            formData.append('userid', userData._id);
            formData.append('images', {
                uri: Platform.OS === 'android' ? imageUri : imageUri.replace('file://', ''),
                type: result.type || 'image/jpeg',
                name: result.fileName || 'profile.jpg',
            } as any);

            // ✅ Use axios.post directly
            const res = await api.post(
                '/apis/auth/cv-picture-update',
                formData,
                {
                    headers: {
                        'Content-Type': 'multipart/form-data'
                    },
                }
            );

            if (res.data?.userdata) {
                Toast.show({
                    type: 'success',
                    text1: 'Image Updated',
                    position: 'bottom',
                });
            } else {
                Toast.show({
                    type: 'error',
                    text1: 'Image Update Failed',
                    position: 'bottom',
                });
            }
        } catch (error: any) {
            console.error('Image upload error:', error);
            Toast.show({
                type: 'error',
                text1: 'Image Upload Error',
                text2: error?.message || 'Something went wrong',
                position: 'bottom',
            });
        } finally {
            setIsloading(false);
        }
    };


    return (
        <SafeAreaView style={styles.container}>
            <ScrollView showsVerticalScrollIndicator={false}>

                {/* Header Section */}
                <View style={styles.header}>
                    <View style={styles.profileInfo}>
                        <TouchableOpacity onPress={pickImage}>
                            {
                                basicdatainfo?.profileimage ?
                                <>
                                <Image
                                source={{ uri: BASE_URL + '/' + basicdatainfo?.profileimage }}
                                style={styles.avatar}
                                />
                                </> : 
                                <Image
                                source={{ uri: 'https://via.placeholder.com/100' }}
                                style={styles.avatar}
                                />
                            }       
                        </TouchableOpacity>
                        <Text style={styles.userName}>{basicdatainfo?.basicinfo?.firstname} {basicdatainfo?.basicinfo?.middlename} {basicdatainfo?.basicinfo?.lastname}</Text>
                        <Text style={styles.userTagline}>{basicdatainfo?.basicinfo?.title}</Text>
                    </View>

                    <View style={styles.progressCard}>
                        <View style={styles.progressHeader}>
                            <Text style={styles.progressText}>2 Sections Remaining</Text>
                            <Text style={styles.percentageText}>80%</Text>
                        </View>
                        <View style={styles.progressBarBg}>
                            <View style={[styles.progressBarFill, { width: '80%' }]} />
                        </View>
                    </View>
                </View>

                {/* Responsive Content Container */}
                <View style={isTablet ? styles.tabletLayout : styles.mobileLayout}>

                    {/* Basic Info Card */}
                    <SectionCard title="Basic Info" onEdit={() => {
                        setShowbasicmodal(true)
                    }}>
                        <InfoItem label="Email" value={basicdatainfo?.basicinfo?.emailid} />
                        <InfoItem label="Phone" value={basicdatainfo?.basicinfo?.phoneno} />
                        <InfoItem label="Male" value={basicdatainfo?.basicinfo?.gender} />
                        <InfoItem label="languages" value={basicdatainfo?.basicinfo?.languages} />
                        <InfoItem label="currentcity" value={basicdatainfo?.basicinfo?.currentcity} />
                        <InfoItem label="careerlevel" value={basicdatainfo?.basicinfo?.careerlevel} />
                        <InfoItem label="desiredSalary" value={basicdatainfo?.basicinfo?.desiredSalary} />
                        <InfoItem label="skills" value={basicdatainfo?.basicinfo?.skills} />
                        <InfoItem label="Visa" value={basicdatainfo?.basicinfo?.visastatus} />
                        <InfoItem label="Nationality" value={basicdatainfo?.basicinfo?.nationality} />
                        <InfoItem label="Date of Birth" value={formatDate(basicdatainfo?.basicinfo?.dateofbirth)} />
                    </SectionCard>
                    <View style={styles.card}>
                        <View style={styles.cardHeader}>
                            <Text style={styles.cardTitle}>Qualification</Text>
                            <View style={styles.actionButtons}>
                                <TouchableOpacity><Text style={styles.actionText} onPress={() => setIsModalQualificationOpen(true)}>
                                    + Add</Text>
                                </TouchableOpacity>

                            </View>
                        </View>

                        <View>
                            {basicdatainfo?.qualification?.length > 0 ? (
                                basicdatainfo.qualification.map((item, index) => (
                                    <View
                                        key={item._id || index}
                                        style={{
                                            padding: 10,
                                            marginBottom: 10,
                                            borderWidth: 1,
                                            borderColor: "#ddd",
                                            borderRadius: 8
                                        }}
                                    >
                                        <Text style={styles.Qualificationtext}>Degree: {item.degree}</Text>
                                        <Text style={styles.Qualificationtext}>Specialization: {item.specialization}</Text>
                                        <Text style={styles.Qualificationtext}>University: {item.university}</Text>
                                        <Text style={styles.Qualificationtext}>Country: {item.country}</Text>
                                        <Text style={styles.Qualificationtext}>Start Year: {item.startYear}</Text>
                                        <Text style={styles.Qualificationtext}>End Year: {item.endYear}</Text>

                                        {/* ACTION BUTTONS */}
                                        <View style={{ flexDirection: "row", marginTop: 10 }}>

                                            {/* EDIT */}
                                            <TouchableOpacity
                                                //  onPress={() => handleEditQualification(item)}
                                                style={{ marginRight: 15 }}
                                            >
                                                {/* <Edit size={20} color="blue" /> */}
                                                <Text>Edit</Text>
                                            </TouchableOpacity>

                                            {/* DELETE */}
                                            <TouchableOpacity
                                            //  onPress={() => handleDeleteQualification(item._id)}
                                            >
                                                <Text>Delete</Text>
                                            </TouchableOpacity>

                                        </View>
                                    </View>
                                ))
                            ) : (
                                <Text>No qualification found</Text>
                            )}
                        </View>
                        <QualificationsModal
                            visible={isModalQualificationOpen}
                            onClose={() => setIsModalQualificationOpen(false)}
                            onSubmit={addQualification}
                        />
                    </View>
                    {/* Experience Section */}
                    <SectionCard title="Experience" onAdd={() => { setIsModalexperienceOpen(true) }}>
                        <View>
                            {basicdatainfo?.experience?.length > 0 ? (
                                basicdatainfo.experience.map((item, index) => (
                                    <View
                                        key={item._id || index}
                                    >
                                        <ExperienceItem
                                            role={item?.jobtitle}
                                            company={item?.companyname}
                                            period={item?.fromDate + " - " + item?.toDate}
                                        />

                                        {/* ACTION BUTTONS */}
                                        <View style={{ flexDirection: "row", marginTop: 10 }}>

                                            {/* EDIT */}
                                            <TouchableOpacity
                                                //  onPress={() => handleEditQualification(item)}
                                                style={{ marginRight: 15 }}
                                            >
                                                {/* <Edit size={20} color="blue" /> */}
                                                <Text>Edit</Text>
                                            </TouchableOpacity>

                                            {/* DELETE */}
                                            <TouchableOpacity
                                            //  onPress={() => handleDeleteQualification(item._id)}
                                            >
                                                <Text>Delete</Text>
                                            </TouchableOpacity>

                                        </View>
                                    </View>
                                ))
                            ) : (
                                <Text>No experience found</Text>
                            )}
                        </View>
                        <ExperienceAddModal
                            visible={isModalexperienceOpen}
                            onClose={() => setIsModalexperienceOpen(false)}
                            onSave={addExperience}
                            jobcategoriesdata={jobcategoriesdata}
                        />
                    </SectionCard>

                    <SectionCard title="Certificates" onEdit={() => { setCertificatesModal(true) }}>
                        {/* Education certificate */}
                        {basicdatainfo?.certificate?.length > 0 ? (
                            basicdatainfo.certificate.map((item, index) => (
                                <View
                                    key={item._id || index}
                                >
                                    <CertificateItem
                                        role={item?.coursename}
                                        company={item?.org}
                                    />

                                    {/* ACTION BUTTONS */}
                                    <View style={{ flexDirection: "row", marginTop: 10 }}>

                                        {/* EDIT */}
                                        <TouchableOpacity
                                            //  onPress={() => handleEditQualification(item)}
                                            style={{ marginRight: 15 }}
                                        >
                                            {/* <Edit size={20} color="blue" /> */}
                                            <Text style={{ fontSize: 12 }}>Edit</Text>
                                        </TouchableOpacity>

                                        {/* DELETE */}
                                        <TouchableOpacity
                                        //  onPress={() => handleDeleteQualification(item._id)}
                                        >
                                            <Text style={{ fontSize: 12 }}>Delete</Text>
                                        </TouchableOpacity>

                                    </View>
                                </View>
                            ))
                        ) : (
                            <Text style={{ fontSize: 10 }}>No Certificates found</Text>
                        )}
                    </SectionCard>
                    {
                        certificatesModal ?
                            <>
                                <CertificatesModalScreen
                                    visible={certificatesModal}
                                    currentFileName={resumeName}
                                    onClose={() => setCertificatesModal(false)}
                                    onSave={handleSaveCertificate} />
                            </> : null
                    }

                    {/*  <SectionCard title="Resume"> */}
                    <ResumeCard
                        fileName={resumeName}
                        onEditPress={() => setModalVisible(true)}
                    />
                    <ResumeModal
                        visible={modalVisible}
                        currentFileName={resumeName}
                        onClose={() => setModalVisible(false)}
                        onSave={handleSaveResume}
                    />
                    {/* </SectionCard> */}
                    {/* Digital Profile */}
                    <View style={styles.card}>
                        <View style={styles.cardHeader}>
                            <Text style={styles.cardTitle}>Digital Profile</Text>
                            <View style={styles.actionButtons}>
                                <TouchableOpacity onPress={() => {
                                    setDigitalshowmodal(true)
                                }}>
                                    <Text style={styles.actionText}>+ Add</Text>
                                </TouchableOpacity>
                            </View>
                        </View>
                        {/* DigitalProfileModalScreen */}
                        {
                            digitalshowmodal ?
                                <>
                                    <DigitalProfileModalScreen
                                        visible={digitalshowmodal}
                                        currentFileName={resumeName}
                                        onClose={() => setDigitalshowmodal(false)}
                                        onSave={handleSaveDigital}
                                    />
                                </> : null
                        }

                    </View>
                    {/* Portfolio */}
                    <View style={styles.card}>
                        <View style={styles.cardHeader}>
                            <Text style={styles.cardTitle}>Portfolio</Text>
                            <View style={styles.actionButtons}>
                                <TouchableOpacity onPress={() => {
                                    setPortfolioshowmodal(true)
                                }}>
                                    <Text style={styles.actionText}>+ Add</Text>
                                </TouchableOpacity>
                            </View>
                        </View>
                        <View>
                            {basicdatainfo?.portfolio?.length > 0 ? (
                                basicdatainfo.portfolio.map((item, index) => (
                                    <View
                                        key={item._id || index}
                                    >
                                        <CertificateItem
                                            role={item?.projectname}
                                            company={item?.projectlink}
                                        />

                                        {/* ACTION BUTTONS */}
                                        <View style={{ flexDirection: "row", marginTop: 10 }}>
                                            {/* EDIT */}
                                            <TouchableOpacity
                                                //  onPress={() => handleEditQualification(item)}
                                                style={{ marginRight: 15 }}
                                            >
                                                {/* <Edit size={20} color="blue" /> */}
                                                <Text style={{ fontSize: 12 }}>Edit</Text>
                                            </TouchableOpacity>

                                            {/* DELETE */}
                                            <TouchableOpacity
                                            //  onPress={() => handleDeleteQualification(item._id)}
                                            >
                                                <Text style={{ fontSize: 12 }}>Delete</Text>
                                            </TouchableOpacity>

                                        </View>
                                    </View>
                                ))
                            ) : (
                                <Text style={{ fontSize: 10 }}>No Certificates found</Text>
                            )}
                        </View>
                        {
                            portfolioshowmodal ?
                                <>
                                    <PortfolioModal
                                        visible={portfolioshowmodal}
                                        currentFileName={resumeName}
                                        onClose={() => setPortfolioshowmodal(false)}
                                        onSave={handleSaveportfolio}
                                    />
                                </> : null
                        }

                    </View>
                    {/* End  Portfolio */}

                </View>

                {/* setShowbasicmodal */}
                {
                    showbasicmodal ?
                        <>
                            <BasicModal
                                visible={showbasicmodal}
                                currentFileName={resumeName}
                                onClose={() => setShowbasicmodal(false)}
                                onSave={handleSavebasic} />
                        </> : null
                }


            </ScrollView>
        </SafeAreaView>
    );
};

// --- Sub-Components ---

const SectionCard = ({ title, children, onEdit, onAdd }: any) => (
    <View style={styles.card}>
        <View style={styles.cardHeader}>
            <Text style={styles.cardTitle}>{title}</Text>
            <View style={styles.actionButtons}>
                {onAdd && <TouchableOpacity onPress={onAdd}><Text style={styles.actionText}>+ Add</Text></TouchableOpacity>}
                {onEdit && <TouchableOpacity onPress={onEdit}><Text style={styles.actionText}>Edit</Text></TouchableOpacity>}
            </View>
        </View>
        {children}
    </View>
);

const InfoItem = ({ label, value }: any) => (
    <View style={styles.infoRow}>
        <Text style={styles.infoLabel}>{label}:</Text>
        <Text style={styles.infoValue}>{value}</Text>
    </View>
);

const ExperienceItem = ({ role, company, period }: any) => (
    <View style={styles.expItem}>
        <View style={styles.expBullet} />
        <View>
            <Text style={styles.expRole}>{role}</Text>
            <Text style={styles.expCompany}>{company}</Text>
            <Text style={styles.expPeriod}>{period}</Text>
        </View>
    </View>
);

const CertificateItem = ({ role, company }: any) => (
    <View style={styles.expItem}>
        <View style={styles.expBullet} />
        <View>
            <Text style={styles.expRole}>{role}</Text>
            <Text style={styles.expCompany}>{company}</Text>
        </View>
    </View>
);


// --- Styles ---

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#F4F7FA' },
    header: {
        backgroundColor: '#003366',
        padding: 20,
        borderBottomLeftRadius: 30,
        borderBottomRightRadius: 30,
        alignItems: 'center',
    },
    progressText: {},
    percentageText: {},
    profileInfo: {
        alignItems: 'center',        // Centers content for mobile
        justifyContent: 'center',
        paddingVertical: 15,
        width: '100%',
        // For Tablet: you could change alignItems to 'flex-start' 
        // if you want a side-by-side layout
        flexDirection: width > 768 ? 'row' : 'column',
    },
    actionButtons: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'flex-end',
        // Ensures a minimum tap area for mobile users
        minHeight: 40,
    },

    // Complementary style for the text inside actionButtons
    actionText: {
        color: '#000',           // Professional blue
        fontSize: 12,
        fontWeight: '600',
        marginLeft: 15,             // Space between 'Add' and 'Edit'
        paddingVertical: 5,         // Increases the touchable area
        paddingHorizontal: 8,
    },

    avatar: { width: 90, height: 90, borderRadius: 45, borderWidth: 3, borderColor: '#fff' },
    userName: { color: '#fff', fontSize: 22, fontWeight: 'bold', marginTop: 10 },
    userTagline: { color: '#D1D1D1', fontSize: 14 },

    progressCard: {
        backgroundColor: '#fff',
        width: '90%',
        borderRadius: 15,
        padding: 15,
        marginTop: 20,
        elevation: 5,
    },
    progressBarBg: { height: 8, backgroundColor: '#E0E0E0', borderRadius: 4, marginTop: 8 },
    progressBarFill: { height: 8, backgroundColor: '#00C853', borderRadius: 4 },
    progressHeader: { flexDirection: 'row', justifyContent: 'space-between' },

    mobileLayout: { padding: 15 },
    tabletLayout: { padding: 30, flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },

    card: {
        backgroundColor: '#fff',
        borderRadius: 12,
        padding: 10,
        marginBottom: 7,
        width: isTablet ? '48%' : '100%',
        shadowColor: '#000',
        shadowOpacity: 0.05,
        shadowRadius: 10,
        elevation: 1,
    },
    cardHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 15 },
    cardTitle: { fontSize: 13, fontWeight: '700', color: '#333' },

    infoRow: { flexDirection: 'row', marginBottom: 8 },
    infoLabel: { color: '#777', width: 100 },
    infoValue: { color: '#333', fontWeight: '500', flex: 1, fontSize: 12 },

    skillsContainer: { flexDirection: 'row', flexWrap: 'wrap' },
    skillBadge: {
        backgroundColor: '#E3F2FD',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 20,
        marginRight: 8,
        marginBottom: 8,
    },
    skillText: { color: '#000', fontSize: 12, fontWeight: '600' },

    expItem: { flexDirection: 'row', marginBottom: 15 },
    expBullet: { width: 7, height: 7, borderRadius: 5, backgroundColor: '#000', marginTop: 6, marginRight: 15 },
    expRole: { fontSize: 12, fontWeight: 'bold', color: '#333' },
    expCompany: { color: '#666', fontSize: 12 },
    expPeriod: { fontSize: 12, color: '#999' },
    Qualificationtext: { fontSize: 12 }
});

export default CVDesign;