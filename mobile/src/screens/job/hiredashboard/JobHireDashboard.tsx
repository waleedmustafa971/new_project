import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  TextInput
} from 'react-native'
import React, { useEffect, useState } from 'react'
import JobCategoryModal from './JobCategoryModal'
import api from '../../../component/api'
import Ionicons from 'react-native-vector-icons/Ionicons';
import { useNavigation } from '@react-navigation/native';

const JobHireDashboard = () => {
  const navigation = useNavigation()
  const [showcategorymodal, setShowcategorymodal] = useState(true)
  const [jobcategoriesdata, setJobcategoriesdata] = useState([]);
  const [candidatesdata, setCandidatesdata] = useState([]);
  const [loading, setLoading] = useState(false)
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [showFilter, setShowFilter] = useState(false);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1)
  const [totalpage, setTotalpage] = useState(1)

  useEffect(() => {
    getJobcat()
    getCandidates()
  }, [])

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

  const getCandidates = async () => {
    try {
      const res = await api.get(
        "/apis/job/get-cv-approval?page=1&limit=10"
      );
      console.log('getCandidates......' + res.data.data);
      setCandidatesdata(res.data?.data || []);
      setPage(res.data?.page)
      setTotalpage(res.data?.totalPages)
    } catch (error) {
      console.error("Error fetching job categories:", error);
    } finally {
      setLoading(false);
    }
  }



  return (
    <View>
      {/* 🔙 HEADER */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => {
          navigation.goBack()
        }}>
        <Ionicons name="arrow-back" size={22} color="#333" />
        </TouchableOpacity>
      
        <Text style={styles.title}>Candidates</Text>
        <TouchableOpacity
          style={styles.filterBtn}
          onPress={() => setShowFilter(true)}
        >
          <Text style={{ color: "#fff", fontSize: 12 }}>Filter</Text>
        </TouchableOpacity>
      </View>

      {/* 🔍 SEARCH + FILTER */}
      <View style={styles.searchRow}>
        {/*  */}
        <TouchableOpacity
          style={styles.filterBtn}
          onPress={() => setShowFilter(true)}
        >
          <Ionicons name="filter" size={22} color="#fff" />
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.filtertext}
          onPress={() => setShowFilter(true)}
        >
          <Text>City</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.filtertext}
          onPress={() => setShowFilter(true)}
        >
          <Text>Category</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.filtertext}
          onPress={() => setShowFilter(true)}
        >
          <Text>Experience</Text>
        </TouchableOpacity>


        <TouchableOpacity
          style={styles.filtertext}
          onPress={() => setShowFilter(true)}
        >
          <Text>Education</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.filtertext}
          onPress={() => setShowFilter(true)}
        >
          <Text>Reset</Text>
        </TouchableOpacity>
      </View>
      {/* 📋 LIST */}
      <ScrollView showsVerticalScrollIndicator={false}>
        {candidatesdata?.map((item: any) => (
          <View key={item._id} style={styles.card}>
            <Text style={styles.jobTitle}>{item?.basicinfo?.title}</Text>
            <Text style={styles.salary}>AED : {item?.basicinfo?.desiredSalary}</Text>
            {item?.qualification?.length > 0 ? (
              item?.qualification.map((item, index) => (
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
                  <Text style={styles.Qualificationtext}>Start Year: {item.startYear}</Text>
                  <Text style={styles.Qualificationtext}>End Year: {item.endYear}</Text>
                </View>
              ))
            ) : (
              <Text>No qualification found</Text>
            )}

            <Text>{item?.basicinfo?.currentcity}</Text>

            <TouchableOpacity style={styles.viewBtn}>
              <Text style={{ color: "#fff" }}>View Profile</Text>
            </TouchableOpacity>

          </View>
        ))}
      </ScrollView>

      {
        showcategorymodal ?
          <>
            {/*   <JobCategoryModal jobcategoriesdata={jobcategoriesdata}/> */}
            <JobCategoryModal
              jobcategoriesdata={jobcategoriesdata}
              visible={showcategorymodal}
              onClose={() => setShowcategorymodal(false)}
              onSelect={(item: any) => {
                setSelectedCategory(item);
                console.log('....item.....', JSON.stringify(item))
              }}
            />
          </> : null
      }
    </View>
  )
}

export default JobHireDashboard

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: 'space-between', padding: 10
  },
  back: {
    fontSize: 20,
    marginRight: 10
  },
  title: {
    fontSize: 13,
    fontWeight: "bold"
  },

  searchRow: {
    flexDirection: "row",
    marginBottom: 7, backgroundColor: '#ffffff', padding: 7
  },
      Qualificationtext: { fontSize: 12 },

  searchInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 8,
    paddingHorizontal: 10
  },
  filterBtn: {
    backgroundColor: "#000",
    padding: 10,
    marginLeft: 10,
    borderRadius: 8
  },

  card: {
    backgroundColor: "#fff",
    padding: 15,
    borderRadius: 10,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#eee",
    elevation: 2
  },

  jobTitle: {
    fontSize: 16,
    fontWeight: "bold"
  },

  salary: {
    color: "green",
    marginVertical: 5
  },

  viewBtn: {
    backgroundColor: "#000",
    marginTop: 10,
    padding: 10,
    borderRadius: 8,
    alignItems: "center"
  },

  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center"
  },
  modalBox: {
    backgroundColor: "#fff",
    margin: 20,
    borderRadius: 10,
    padding: 15
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: "bold",
    marginBottom: 10
  },
  input: {
    borderWidth: 1,
    borderColor: "#ddd",
    marginBottom: 10,
    padding: 8,
    borderRadius: 8
  },

  modalActions: {
    flexDirection: "row",
    justifyContent: "space-between"
  },

  applyBtn: {
    backgroundColor: "#000",
    padding: 10,
    borderRadius: 8
  },
  filtertext: {
    borderWidth: 1, borderColor: '#f2f2f2', padding: 10, borderRadius: 10,
    marginLeft: 7

  }
});