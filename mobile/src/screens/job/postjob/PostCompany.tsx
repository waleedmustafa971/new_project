import React, { useState, useEffect } from "react";
import {
    View,
    Text,
    TextInput,
    TouchableOpacity,
    ScrollView,
    StyleSheet,ActivityIndicator
} from "react-native";
import { Picker } from "@react-native-picker/picker";
import api from "../../../component/api";
import AsyncStorage from "@react-native-async-storage/async-storage";
import Toast from "react-native-toast-message";
import { useNavigation } from "@react-navigation/native";


const PostCompany = ({ route }: any) => {
    const navigation = useNavigation()
    const { category } = route.params || {};
    const [jobcategoriesdata, setJobcategoriesdata] = useState([]);
    const [loading, setLoading] = useState(false)
    const [userId, setUserId] = useState(null)
    const [industrylistdata, setIndustrylistdata] = useState([])
    const [subcategories, setSubcategories] = useState([]);
    const languagesList = ["English", "Arabic", "Hindi", "Russian", "French", "Italian",
        "Bengali", "Chinese", "German", "Japanese", "Korean", "Portuguese", "Spanish", "Other"];
    const skillslist = ["PHP", "SQL", "mysql", "MSSQL Server", "Mongodb", "Node JS", "No SQL", "Next JS", "React JS", "React Naitve"];



    const [form, setForm] = useState({
        companyname: "",
        jobtitle: "",
        jobrole: "",
        industrytype: "",
        jobdescription: "",
        employementtype: "",
        remotejob: "No",
        minimumworkingexperience: "",
        minimumeducationlevel: "",
        monthlysalary: "",
        gender: "",
        category: "",
        subcategory: "", hidecompany: "No", companysize: "",
        tradelicenseno: "", companycity: "", companyaddress: "",
        phoneno: "", companyemail: "", Writedetailsaboutcompany: "",
        skills: [], // store multiple skrill values
        cvrequired: "",
        questions: [], benefits: "", languages: ""
    });

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

    const handleChange = (name, value) => {
        setForm((prev) => ({
            ...prev,
            [name]: value,
        }));
    };

    const handleCategoryChange = (e) => {
        //  alert(e.target.value)
        const selectedValue = e.target.value;
        setForm({ category: selectedValue, subcategory: "" });

        // Find the selected category in JSON
        const selectedCategory = jobCategories.find(
            (cat) => cat.value === selectedValue
        );
        console.log('selectedCategory.....' + JSON.stringify(selectedCategory))
        // If it has subcategories, set them; otherwise, empty array
        if (selectedCategory?.subcategory) {
            setSubcategories(selectedCategory.subcategory);
        } else {
            setSubcategories([]);
        }
    }

    const handleSubmit = async () => {
        if (!userId || !form.jobtitle) {
            Toast.show({
                type: "error",
                text1: "Error",
                text2: "Please complete all fields",
            });
            return;
        }

        setLoading(true);

        try {
            console.log('....JSON....time......', JSON.stringify(form))
            const res = await api.post('/apis/job/jobpost', {
                ...form,
                userid: userId,
                status: "pending",
                skills: Array.isArray(form.skills)
                    ? form.skills
                    : form.skills?.split(',').map(s => s.trim()) || [],
                Benefits: Array.isArray(form.benefits)
                    ? form.benefits
                    : form.benefits?.split(',').map(s => s.trim()) || [],
                languages: Array.isArray(form.languages)
                    ? form.languages
                    : form.languages?.split(',').map(s => s.trim()) || [],
                questions: Array.isArray(form.questions)
                    ? form.questions
                    : form.questions?.split(',').map(s => s.trim()) || [],
            });

            if (res.status === 200 || res.status === 201) {
                Toast.show({
                    type: "success",
                    text1: "Success",
                    text2: "Job post created successfully",
                });
                navigation.navigate("JobDashboard")
            }

        } catch (err) {
            Toast.show({
                type: "error",
                text1: "Error",
                text2: err.response?.data?.error || err.message,
            });
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        const loadUser = async () => {
            try {
                const user = await AsyncStorage.getItem("userdata");

                if (user) {
                    const parsed = JSON.parse(user);
                    setUserId(parsed._id);
                    getindstrytype();
                    getJobcat();
                } else {
                    setLoading(false);
                }
            } catch (error) {
                console.log("Error loading user:", error);
                setLoading(false);
            }
        };

        loadUser();
    }, []);

    const getindstrytype = async () => {
        try {
            const res = await api.get(`/apis/job/getindstrytype`);
            setIndustrylistdata(res.data || []); // ✅ Axios returns data directly
            //    console.log('...data.industry.data.' + JSON.stringify(res.data.data))
            setIndustrylistdata(res.data.data)
        } catch (err) {
            //   console.error("Error fetching visitor data:", err);
        } finally {
            setLoading(false);
        }
    }

    return (
        <>
            <View style={{ flex: 1 }}>

                {/*  <ScrollView style={styles.container} showsVerticalScrollIndicator={false}> */}
                <ScrollView contentContainerStyle={{ paddingBottom: 100 }}>


                    <View style={styles.card}>
                        <Text style={styles.label}>Category</Text>
                        <View style={styles.pickerBox}>
                            <Picker
                                selectedValue={form.industrytype || ""}
                                onValueChange={(value) => handleChange("industrytype", value)}
                                style={{ color: "#000", fontSize: 12 }}
                            >
                                {jobcategoriesdata?.map((item: any) => (
                                    <Picker.Item label={item.title} value={item.slug} />

                                ))}
                            </Picker>
                        </View>
                        {subcategories?.length > 0 && (
                            <>
                                <Text style={styles.label}>Sub Category</Text>
                                <View style={styles.pickerBox}>
                                    <Picker
                                        selectedValue={form.subcategory || ""}
                                        onValueChange={(value) => handleChange("subcategory", value)}
                                        style={{ color: "#000" }}
                                    >
                                        {jobcategoriesdata?.map((item: any) => (
                                            <Picker.Item label={item.title} value={item.slug} />

                                        ))}
                                    </Picker>
                                </View>
                            </>
                        )}
                        {/* Gender */}
                        <Text style={styles.label}>Looking for Gender</Text>
                        <View style={styles.pickerBox}>
                            <Picker
                                selectedValue={form.gender}
                                onValueChange={(value) => handleChange("gender", value)}
                                style={{ color: "#000" }}
                            >
                                <Picker.Item label="Select gender" value="" />
                                <Picker.Item label="Male" value="Male" />
                                <Picker.Item label="Female" value="Female" />
                            </Picker>
                        </View>

                        {/* Company Name */}
                        <Text style={styles.label}>Company Name</Text>
                        <TextInput
                            style={styles.input}
                            placeholder="Enter company name"
                            value={form.companyname}
                            onChangeText={(text) => handleChange("companyname", text)}
                        />

                        <Text style={styles.label}>Hide Company</Text>
                        <View style={styles.pickerBox}>
                            <Picker
                                selectedValue={form.hidecompany || ""}
                                onValueChange={(value) => handleChange("hidecompany", value)}
                                style={{ color: "#000" }}
                            >
                                <Picker.Item label="No" value="No" />
                                <Picker.Item label="Yes" value="Yes" />

                            </Picker>
                        </View>


                        <Text style={styles.label}>Company Size</Text>
                        <View style={styles.pickerBox}>
                            <Picker
                                selectedValue={form.companysize || ""}
                                onValueChange={(value) => handleChange("companysize", value)}
                                style={{ color: "#000" }}
                            >
                                <Picker.Item label="1-10" value="1-10" />
                                <Picker.Item label="11-50" value="11-50" />
                                <Picker.Item label="51-100" value="51-100" />
                                <Picker.Item label="101-500" value="101-500" />
                                <Picker.Item label="501-1000" value="501-1000" />
                                <Picker.Item label="1000+" value="1000+" />

                            </Picker>
                        </View>
                        {/* tradelicenseno */}
                        <Text style={styles.label}>Trade License no</Text>
                        <TextInput
                            style={styles.input}
                            placeholder="e.g. Software Engineer"
                            value={form.tradelicenseno}
                            onChangeText={(text) => handleChange("tradelicenseno", text)}
                        />

                        {/* companycity */}

                        <Text style={styles.label}>Company City</Text>
                        <TextInput
                            style={styles.input}
                            placeholder="e.g. companycity"
                            value={form.companycity}
                            onChangeText={(text) => handleChange("companycity", text)}
                        />

                        {/* companyaddress */}

                        <Text style={styles.label}>Company Address </Text>
                        <TextInput
                            style={styles.input}
                            placeholder="e.g. companyaddress"
                            value={form.companyaddress}
                            onChangeText={(text) => handleChange("companyaddress", text)}
                        />

                        {/* phoneno */}

                        <Text style={styles.label}>Phone No</Text>
                        <TextInput
                            style={styles.input}
                            placeholder="e.g. phoneno"
                            value={form.phoneno}
                            onChangeText={(text) => handleChange("phoneno", text)}
                        />

                        {/* companyemail */}

                        <Text style={styles.label}>Company email</Text>
                        <TextInput
                            style={styles.input}
                            placeholder="e.g. companyemail"
                            value={form.companyemail}
                            onChangeText={(text) => handleChange("companyemail", text)}
                        />

                        {/* Writedetailsaboutcompany */}

                        <Text style={styles.label}>Write details about company</Text>
                        <TextInput
                            style={styles.input}
                            placeholder="e.g. Write detailsabout company"
                            value={form.Writedetailsaboutcompany}
                            onChangeText={(text) => handleChange("Writedetailsaboutcompany", text)}
                        />


                        {/* Job Title */}
                        <Text style={styles.label}>Job Title</Text>
                        <TextInput
                            style={styles.input}
                            placeholder="e.g. Software Engineer"
                            value={form.jobtitle}
                            onChangeText={(text) => handleChange("jobtitle", text)}
                        />

                        {/* Job Role */}
                        <Text style={styles.label}>Job Role</Text>
                        <TextInput
                            style={styles.input}
                            placeholder="e.g. Backend Developer"
                            value={form.jobrole}
                            onChangeText={(text) => handleChange("jobrole", text)}
                        />

                        {/* Industry */}
                        <Text style={styles.label}>Industry</Text>
                        <View style={styles.pickerBox}>
                            <Picker
                                selectedValue={form.industrytype || ""}
                                onValueChange={(value) => handleChange("industrytype", value)}
                                style={{ color: "#000" }}
                            >
                                {industrylistdata.map((item: any) => (
                                    <Picker.Item label={item.slug} value={item.title} />

                                ))}
                            </Picker>
                        </View>

                        {/* Description */}
                        <Text style={styles.label}>Job Description</Text>
                        <TextInput
                            style={[styles.input, styles.textArea]}
                            placeholder="Describe the job..."
                            multiline
                            value={form.jobdescription}
                            onChangeText={(text) => handleChange("jobdescription", text)}
                        />

                        {/* Employment Type */}
                        <Text style={styles.label}>Employment Type</Text>
                        <View style={styles.pickerBox}>
                            <Picker
                                selectedValue={form.employementtype || ""}
                                onValueChange={(value) => handleChange("employementtype", value)}
                                style={{ color: "#000" }}
                            >
                                <Picker.Item label="Select type" value="" />
                                <Picker.Item label="Full Time" value="Full Time" />
                                <Picker.Item label="Part Time" value="Part Time" />
                            </Picker>
                        </View>

                        {/* Remote */}
                        <Text style={styles.label}>Remote Job</Text>
                        <View style={styles.pickerBox}>
                            <Picker
                                selectedValue={form.remotejob ?? "No"}   // 👈 fallback value
                                onValueChange={(value) => {
                                    console.log("Remote selected:", value); // debug
                                    handleChange("remotejob", value);
                                }}
                                style={{ color: "#000" }} // 👈 important for Android
                            >
                                <Picker.Item label="Select Option" value="" enabled={false} />
                                <Picker.Item label="No" value="No" />
                                <Picker.Item label="Yes" value="Yes" />
                            </Picker>
                        </View>

                        {/* Experience */}
                        <Text style={styles.label}>Experience</Text>
                        <View style={styles.pickerBox}>
                            <Picker
                                selectedValue={form.minimumworkingexperience || "0-1 Years"}
                                onValueChange={(value) => {
                                    console.log("Selected:", value);
                                    handleChange("minimumworkingexperience", value);
                                }}
                                style={{ color: "#000", height: 50 }}
                            >
                                <Picker.Item label="Select experience" value="" />
                                <Picker.Item label="0-1 Years" value="0-1 Years" />
                                <Picker.Item label="1-2 Years" value="1-2 Years" />
                                <Picker.Item label="2-5 Years" value="2-5 Years" />
                                <Picker.Item label="5-10 Years" value="5-10 Years" />
                                <Picker.Item label="10-15 Years" value="10-15 Years" />
                                <Picker.Item label="15+ Years" value="15+ Years" />
                            </Picker>
                        </View>

                        {/* Education */}
                        <Text style={styles.label}>Education</Text>
                        <View style={styles.pickerBox}>
                            <Picker
                                selectedValue={form.minimumeducationlevel ?? ""}
                                onValueChange={(value) => {
                                    console.log("Education selected:", value); // debug
                                    handleChange("minimumeducationlevel", value);
                                }}
                                style={{ color: "#000", height: 50 }}
                                itemStyle={{ fontSize: 12 }}
                            >
                                <Picker.Item label="Select education level" value="" />
                                <Picker.Item label="High School / Secondary" value="High School / Secondary" />
                                <Picker.Item label="Bachelor's Degree" value="Bachelor's Degree" />
                                <Picker.Item label="Master's Degree" value="Master's Degree" />
                                <Picker.Item label="PhD" value="PhD" />
                            </Picker>
                        </View>
                        {/* Salary */}
                        <Text style={styles.label}>Monthly Salary</Text>
                        <View style={styles.pickerBox}>
                            <Picker
                                selectedValue={form.monthlysalary ?? ""}
                                onValueChange={(value) => {
                                    console.log("monthlysalary:", value);
                                    handleChange("monthlysalary", value);
                                }}
                                style={{ color: "#000" }} // fontSize won't really work
                            >
                                <Picker.Item label="Select salary" value="" />
                                <Picker.Item label="Negotiable" value="Negotiable" />
                                <Picker.Item label="2000-3999" value="2000-3999" />
                                <Picker.Item label="4000-5999" value="4000-5999" />
                                <Picker.Item label="6000-7999" value="6000-7999" />
                                <Picker.Item label="8000 - 11999" value="8000-11999" />
                                <Picker.Item label="20000+" value="20000+" />
                            </Picker>
                        </View>

                        <Text style={styles.label}>Languages</Text>
                        <View style={styles.pickerBox}>
                            <Picker
                                selectedValue={form.languages ?? ""}   // 👈 fallback value
                                onValueChange={(value) => {
                                    console.log("Remote selected:", value); // debug
                                    handleChange("languages", value);
                                }}
                                style={{ color: "#000" }} // 👈 important for Android
                            >
                                {languagesList?.map((lang: any) => (
                                    <Picker.Item label={lang} value={lang} />
                                ))}
                            </Picker>
                        </View>
                        {/* skrills */}
                        <Text style={styles.label}>Skills</Text>
                        <View style={styles.pickerBox}>
                            <Picker
                                selectedValue={form.skills || ""}
                                onValueChange={(value) => {
                                    console.log("Skill selected:", value);
                                    handleChange("skills", value);
                                }}
                                style={{ color: "#000" }}
                            >
                                <Picker.Item label="Select skill" value="" />

                                {skillslist.map((skill) => (
                                    <Picker.Item
                                        key={skill}
                                        label={skill}
                                        value={skill}
                                    />
                                ))}
                            </Picker>
                        </View>

                        {/* benefits */}
                        <Text style={styles.label}>benefits</Text>
                        <View style={styles.pickerBox}>
                            <Picker
                                selectedValue={form.benefits ?? ""}   // 👈 fallback value
                                onValueChange={(value) => {
                                    console.log("Remote selected:", value); // debug
                                    handleChange("benefits", value);
                                }}
                                style={{ color: "#000" }} // 👈 important for Android
                            >
                                {languagesList?.map((lang) => (
                                    <Picker.Item label={lang} value={lang} />
                                ))}
                            </Picker>
                        </View>
                        <Text style={styles.label}>CV Required</Text>

                        <View style={styles.pickerBox}>
                            <Picker
                                selectedValue={form.cvrequired || ""}   // ✅ correct fallback
                                onValueChange={(value) => {
                                    console.log("cvrequired selected:", value);
                                    handleChange("cvrequired", value);
                                }}
                                style={{ color: "#000" }}
                            >
                                <Picker.Item label="Select Option" value="" />
                                <Picker.Item label="No" value="No" />
                                <Picker.Item label="Yes" value="Yes" />
                            </Picker>
                        </View>

                    </View>

                    {/* Button */}


                </ScrollView>
                <View style={{
                    position: "absolute",
                    bottom: 20,
                    left: 0,
                    right: 0,
                    alignItems: "center",
                }}>
                    {
                        loading ? (
                            <View style={styles.button}>
                                <ActivityIndicator color="#fff" />
                            </View>
                        ) : (
                            <TouchableOpacity
                                style={styles.button}
                                onPress={handleSubmit}
                            >
                                <Text style={styles.buttonText}>Continue</Text>
                            </TouchableOpacity>
                        )
                    }
                </View>
            </View>

        </>
    );
};

export default PostCompany;

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: "#f2f4f7",
    },
    header: {
        fontSize: 24,
        fontWeight: "bold",
        marginBottom: 15,
    },
    card: {
        backgroundColor: "#fff",
        borderRadius: 12,
        padding: 5,
        marginBottom: 20,
    },
    label: {
        fontSize: 14,
        color: "#555",
        marginBottom: 4,
        marginTop: 10,
    },
    input: {
        backgroundColor: "#f9fafb",
        padding: 12,
        borderRadius: 10,
        borderWidth: 1,
        borderColor: "#e5e7eb",
    },
    textArea: {
        height: 120,
        textAlignVertical: "top",
    },
    pickerBox: {
        backgroundColor: "#f9fafb",
        borderRadius: 10,
        borderWidth: 1,
        borderColor: "#e5e7eb",
    },
    button: {
        backgroundColor: "#000",
        padding: 16,
        borderRadius: 12,
        alignItems: "center",
        left: 16,
        right: 16, width: 300
    },
    buttonText: {
        color: "#fff",
        fontSize: 12,
        fontWeight: "600",
    },
});