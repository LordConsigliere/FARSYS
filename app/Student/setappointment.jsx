import React, { useState, useEffect, useContext } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  TextInput,
  ScrollView,
  Platform,
  Alert,
  ActivityIndicator,
  StyleSheet,
} from "react-native";
import DateTimePicker from "@react-native-community/datetimepicker";
import { router } from "expo-router";
import { SelectCountry } from "react-native-element-dropdown";
import { Colors } from "../../constants/Colors";
import { database } from "../../FirebaseConfig";
import {
  ref,
  get,
  child,
  set,
  push,
  query,
  orderByChild,
  equalTo,
  serverTimestamp,
} from "firebase/database";
import { AuthContext } from "../../AuthContext";
import CustomModal from "../../components/Modal/CustomModal";

const BookAppointment = () => {
  const { userID } = useContext(AuthContext);
  const [date, setDate] = useState(null);
  const [time, setTime] = useState(null);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [appointmentType, setAppointmentType] = useState(null);
  const [reason, setReason] = useState("");
  const [selectedTeacher, setSelectedTeacher] = useState("");
  const [teachers, setTeachers] = useState([]);
  const [dateError, setDateError] = useState(false);
  const [timeError, setTimeError] = useState(false);
  const [teacherError, setTeacherError] = useState(false);
  const [typeError, setTypeError] = useState(false);
  const [reasonError, setReasonError] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [modalConfig, setModalConfig] = useState({
    title: "",
    message: "",
    type: "success",
  });
  const [bookedSlots, setBookedSlots] = useState({});
  const [isLoading, setIsLoading] = useState(false);
  const [performanceMetrics, setPerformanceMetrics] = useState({
    dbWriteTime: null,
    notificationTime: null,
    totalTime: null,
  });

  useEffect(() => {
    const fetchTeachers = async () => {
      try {
        const dbRef = ref(database);
        const teacherSnapshot = await get(child(dbRef, "users/teachers"));

        if (teacherSnapshot.exists()) {
          const teacherData = teacherSnapshot.val();
          const formattedTeachers = Object.entries(teacherData).map(
            ([id, teacher]) => ({
              value: id,
              lable:
                teacher.fullName || `${teacher.firstName} ${teacher.lastName}`,
            })
          );
          setTeachers(formattedTeachers);
        }
      } catch (error) {
        console.error("Error fetching teachers:", error);
        Alert.alert("Error", "Failed to load teachers list");
      }
    };

    fetchTeachers();
  }, []);

  useEffect(() => {
    const fetchBookedAppointments = async () => {
      if (!selectedTeacher) return;

      try {
        const appointmentsRef = ref(database, "appointments");
        const snapshot = await get(appointmentsRef);

        if (snapshot.exists()) {
          const booked = {};
          snapshot.forEach((childSnapshot) => {
            const appointment = childSnapshot.val();
            if (appointment.teacherId === selectedTeacher) {
              const appointmentDate = new Date(appointment.date).toDateString();
              if (!booked[appointmentDate]) {
                booked[appointmentDate] = [];
              }
              booked[appointmentDate].push(appointment.time);
            }
          });
          setBookedSlots(booked);
        }
      } catch (error) {
        console.error("Error fetching appointments:", error);
        Alert.alert("Error", "Failed to load teacher's schedule");
      }
    };

    fetchBookedAppointments();
  }, [selectedTeacher]);

  const measureLatency = async (callback) => {
    const start = performance.now();
    await callback();
    const end = performance.now();
    return end - start;
  };

  const generateTimeSlots = () => {
    const slots = [];
    let startTime = new Date().setHours(8, 0, 0); // 8 AM
    const endTime = new Date().setHours(16, 0, 0); // 4 PM

    while (startTime <= endTime) {
      const currentTime = new Date(startTime);
      const endSlotTime = new Date(startTime + 30 * 60 * 1000);

      const timeString = `${currentTime.toLocaleTimeString("en-US", {
        hour: "2-digit",
        minute: "2-digit",
        hour12: true,
      })} to ${endSlotTime.toLocaleTimeString("en-US", {
        hour: "2-digit",
        minute: "2-digit",
        hour12: true,
      })}`;

      slots.push(timeString);
      startTime += 30 * 60 * 1000;
    }
    return slots;
  };

  const isTimeSlotAvailable = (slot) => {
    if (!date || !selectedTeacher) return true;
    const dateString = date.toDateString();
    return !bookedSlots[dateString] || !bookedSlots[dateString].includes(slot);
  };

  const isDateAvailable = (checkDate) => {
    if (!selectedTeacher) return true;
    const dateString = checkDate.toDateString();
    if (!bookedSlots[dateString]) return true;
    const availableSlots = generateTimeSlots().filter(
      (slot) => !bookedSlots[dateString].includes(slot)
    );
    return availableSlots.length > 0;
  };

  const isWeekday = (date) => {
    const day = date.getDay();
    return day !== 0 && day !== 6;
  };

  const handleTimeSelect = (slot) => {
    if (isTimeSlotAvailable(slot)) {
      setTime(slot);
      setTimeError(false);
    } else {
      Alert.alert("Time Unavailable", "This time slot is already booked.");
    }
  };

  const handleDateChange = (event, selectedDate) => {
    setShowDatePicker(false);
    if (selectedDate) {
      if (!isWeekday(selectedDate)) {
        setDateError(true);
        Alert.alert("Invalid Date", "Please select a weekday.");
        return;
      }

      if (!isDateAvailable(selectedDate)) {
        setDateError(true);
        Alert.alert(
          "Date Unavailable",
          "No available time slots on this date."
        );
        return;
      }

      setDate(selectedDate);
      setDateError(false);
      setTime(null);
    }
  };

  const handleTeacherSelect = (e) => {
    setSelectedTeacher(e.value);
    setTeacherError(false);
  };

  const handleTypeSelect = (type) => {
    setAppointmentType(type);
    setTypeError(false);
  };

  const handleReasonChange = (text) => {
    setReason(text);
    setReasonError(false);
  };

  const handleAppointmentSubmit = async () => {
    setIsSubmitted(true);
    let hasError = false;

    if (!userID) {
      Alert.alert("Error", "Student ID is missing. Please log in again.");
      return;
    }

    if (!date || dateError) {
      setDateError(true);
      hasError = true;
    }

    if (!time) {
      setTimeError(true);
      hasError = true;
    }

    if (!selectedTeacher) {
      setTeacherError(true);
      hasError = true;
    }

    if (!appointmentType) {
      setTypeError(true);
      hasError = true;
    }

    if (!reason.trim()) {
      setReasonError(true);
      hasError = true;
    }

    if (hasError) {
      setModalConfig({
        title: "Booking Failed",
        message: "Please fill in all required fields correctly.",
        type: "error",
      });
      setModalVisible(true);
      return;
    }

    setIsLoading(true);
    const metrics = {};
    const totalStart = performance.now();

    try {
      const selectedTeacherData = teachers.find(
        (teacher) => teacher.value === selectedTeacher
      );
      const teacherName = selectedTeacherData
        ? selectedTeacherData.lable
        : "Selected Teacher";
      const appointmentId = `APT-${push(ref(database)).key}`;
      const appointmentRef = ref(database, `appointments/${appointmentId}`);

      // Measure appointment creation latency
      metrics.dbWriteTime = await measureLatency(async () => {
        await set(appointmentRef, {
          studentId: userID,
          teacherId: selectedTeacher,
          teacherName: teacherName,
          date: date.toISOString(),
          time: time,
          type: appointmentType,
          reason: reason.trim(),
          status: "Pending",
          createdAt: new Date().toISOString(),
          remarks: "",
        });
      });

      // Measure notification creation latency
      metrics.notificationTime = await measureLatency(async () => {
        // Create teacher notification
        const teacherNotificationRef = push(ref(database, "notifications"));
        await set(teacherNotificationRef, {
          recipientId: selectedTeacher,
          title: "New Appointment Request",
          description: `New ${appointmentType} appointment scheduled for ${date.toDateString()} at ${time}`,
          time: serverTimestamp(),
          type: "appointment",
          read: false,
          appointmentId: appointmentId,
        });

        // Create student notification
        const studentNotificationRef = push(ref(database, "notifications"));
        await set(studentNotificationRef, {
          recipientId: userID,
          title: "New Consultation",
          description: `Your ${appointmentType} consulation with Prof.${teacherName} has been scheduled on ${date.toDateString()} at ${time}`,
          time: serverTimestamp(),
          type: "appointment",
          read: false,
          appointmentId: appointmentId,
        });
      });

      metrics.totalTime = performance.now() - totalStart;
      setPerformanceMetrics(metrics);

      // Log performance metrics
      console.log("Set Appointment Performance Metrics:", {
        "Database Write Time (ms)": metrics.dbWriteTime.toFixed(2),
        "Notification Creation Time (ms)": metrics.notificationTime.toFixed(2),
        "Total Operation Time (ms)": metrics.totalTime.toFixed(2),
      });

      setIsLoading(false);
      setModalConfig({
        title: "Consultation Booked",
        message: `Your consultation has been successfully scheduled`,
        type: "success",
      });
      setModalVisible(true);
      handleCancel();
    } catch (error) {
      const errorTime = performance.now() - totalStart;
      console.error(
        "Appointment submission error:",
        error,
        `Time until error: ${errorTime.toFixed(2)}ms`
      );

      setIsLoading(false);
      setModalConfig({
        title: "Booking Failed",
        message: `Failed to book appointment. Please try again.\nTime until error: ${errorTime.toFixed(
          2
        )}ms`,
        type: "error",
      });
      setModalVisible(true);
    }
  };

  const handleCancel = () => {
    setDate(null);
    setTime(null);
    setAppointmentType(null);
    setReason("");
    setSelectedTeacher("");
    setDateError(false);
    setTimeError(false);
    setTeacherError(false);
    setTypeError(false);
    setReasonError(false);
    setIsSubmitted(false);
  };

  const pickerMode = Platform.OS === "ios" ? "dialog" : "dropdown";

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Set Consultation</Text>
      </View>
      <View style={styles.subContainer}>
        {/* Date Selection */}
        <View style={styles.section}>
          <Text style={styles.label}>Select Teacher:</Text>
          <View
            style={[styles.pickerContainer, teacherError && styles.errorBorder]}
          >
            <SelectCountry
              style={styles.dropdown}
              placeholderStyle={styles.placeholderStyle}
              selectedTextStyle={styles.selectedTextStyle}
              maxHeight={300}
              value={selectedTeacher}
              data={teachers}
              valueField="value"
              labelField="lable"
              placeholder="Select Teacher"
              searchPlaceholder="Search..."
              onChange={handleTeacherSelect}
            />
          </View>
          {teacherError && (
            <Text style={styles.errorText}>Please select a teacher</Text>
          )}
        </View>
        <View style={styles.section}>
          <Text style={styles.label}>Select Date:</Text>
          <TouchableOpacity
            style={[styles.dateButton, dateError && styles.dateButtonError]}
            onPress={() => setShowDatePicker(true)}
          >
            <Text
              style={[styles.dateButtonText, !date && styles.placeholderText]}
            >
              {date ? date.toDateString() : "Select Date"}
            </Text>
          </TouchableOpacity>
          {dateError && (
            <Text style={styles.errorText}>
              {date && !isWeekday(date)
                ? "Invalid date. Please select another date."
                : "Please select a date"}
            </Text>
          )}
          {showDatePicker && (
            <DateTimePicker
              value={date || new Date()}
              mode="date"
              display={Platform.OS === "ios" ? "spinner" : "default"}
              onChange={handleDateChange}
              minimumDate={new Date()}
            />
          )}
        </View>

        <View style={styles.section}>
          <Text style={styles.label}>Swipe to Select Time:</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View style={[styles.timeContainer, timeError]}>
              {generateTimeSlots().map((slot) => (
                <TouchableOpacity
                  key={slot}
                  style={[
                    styles.timeSlot,
                    time === slot && styles.selectedTimeSlot,
                    !isTimeSlotAvailable(slot) && styles.unavailableTimeSlot,
                    timeError && styles.errorBorder,
                  ]}
                  onPress={() => handleTimeSelect(slot)}
                  disabled={!isTimeSlotAvailable(slot)}
                >
                  <Text
                    style={[
                      styles.timeText,
                      time === slot && styles.selectedTimeText,
                      !isTimeSlotAvailable(slot) && styles.unavailableTimeText,
                    ]}
                  >
                    {slot}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </ScrollView>
          {timeError && (
            <Text style={styles.errorText}>Please select a time slot</Text>
          )}
        </View>

        {/* Teacher Selection */}

        {/* Appointment Type */}
        <View style={styles.section}>
          <Text style={styles.label}>Consultation Type:</Text>
          <View style={[styles.typeContainer, typeError]}>
            <TouchableOpacity
              style={[
                styles.typeButton,
                appointmentType === "Academic" && styles.selectedTypeButton,
                typeError && styles.errorBorder,
              ]}
              onPress={() => handleTypeSelect("Academic")}
            >
              <Text
                style={[
                  styles.typeText,
                  appointmentType === "Academic" && styles.selectedTypeText,
                ]}
              >
                {"Academic"}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.typeButton,
                appointmentType === "Personal" && styles.selectedTypeButton,
                typeError && styles.errorBorder,
              ]}
              onPress={() => handleTypeSelect("Personal")}
            >
              <Text
                style={[
                  styles.typeText,
                  appointmentType === "Personal" && styles.selectedTypeText,
                ]}
              >
                {"Personnel\n(Report & Concern)"}
              </Text>
            </TouchableOpacity>
          </View>
          {typeError && (
            <Text style={styles.errorText}>
              Please select an consultation type
            </Text>
          )}
        </View>

        {/* Reason Input */}
        <View style={styles.section}>
          <Text style={styles.label}>Reason for Consulation:</Text>
          <TextInput
            style={[styles.input, reasonError && styles.errorBorder]}
            multiline
            numberOfLines={2}
            placeholder="Enter your reason here..."
            value={reason}
            onChangeText={handleReasonChange}
          />
          {reasonError && (
            <Text style={styles.errorText}>
              Please provide a reason for the consultation
            </Text>
          )}
        </View>

        {/* Action Buttons */}
        <View style={styles.buttonContainer}>
          <TouchableOpacity
            style={[styles.actionButton, styles.submitButton]}
            onPress={handleAppointmentSubmit}
          >
            <Text style={styles.submitButtonText}>Set Consultation</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.actionButton, styles.cancelButton]}
            onPress={() => {
              router.push("Student/(tabs)/appointment"); // Update path to navigate outside tabs
            }}
          >
            <Text style={styles.cancelButtonText}>Cancel</Text>
          </TouchableOpacity>
        </View>
      </View>
      {isLoading && (
        <View style={styles.loadingOverlay}>
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={Colors.PRIMARY} />
            <Text style={styles.loadingText}>Booking your consultation...</Text>
          </View>
        </View>
      )}
      <CustomModal
        visible={modalVisible}
        title={modalConfig.title}
        message={modalConfig.message}
        type={modalConfig.type}
        onClose={() => {
          setModalVisible(false);
          if (modalConfig.type === "success") {
            router.push("Student/(tabs)/appointment");
          }
        }}
      />
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f5f5f5",
  },
  subContainer: {
    padding: 20,
  },
  loadingOverlay: {
    position: "absolute",
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    backgroundColor: "rgba(0, 0, 0, 0.7)",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 999, // Ensure it's above other content
  },
  loadingContainer: {
    backgroundColor: "white",
    padding: 20,
    borderRadius: 10,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    fontFamily: "outfit",
    color: "#333",
  },
  header: {
    flexDirection: "row",
    backgroundColor: Colors.PRIMARY,
    padding: 20,
    borderBottomLeftRadius: 15,
    borderBottomRightRadius: 15,
  },
  placeholderText: {
    color: "#999",
  },
  unavailableTimeSlot: {
    backgroundColor: "#f0f0f0",
    borderColor: "#ddd",
    opacity: 0.5,
  },
  unavailableTimeText: {
    color: "#999",
  },
  title: {
    fontSize: 20,
    fontFamily: "outfit-medium",
    color: "#fff",
    backgroundColor: Colors.PRIMARY,
  },
  section: {
    marginBottom: 20,
    fontFamily: "outfit",
  },
  label: {
    fontSize: 14,
    fontFamily: "outfit",
    marginBottom: 10,
    color: "#444",
  },
  dateButton: {
    backgroundColor: "#fff",
    padding: 15,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#ddd",
  },
  dateButtonError: {
    borderColor: "#ff3b30", // Red border for error state
    borderWidth: 1,
  },
  errorBorder: {
    borderColor: "#ff3b30",
    borderWidth: 1,
  },
  errorContainer: {
    borderColor: "#ff3b30",
    borderWidth: 1,
    borderRadius: 8,
    padding: 5,
  },
  errorText: {
    color: "#ff3b30",
    fontSize: 12,
    marginTop: 5,
    fontFamily: "outfit",
  },
  dateButtonText: {
    fontSize: 13,
    color: "#333",
    fontFamily: "outfit",
  },
  timeContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
  },
  timeSlot: {
    backgroundColor: "#fff",
    padding: 10,
    borderRadius: 8,
    marginRight: 10,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: "#ddd",
  },
  selectedTimeSlot: {
    backgroundColor: "#007AFF",
    borderColor: "#007AFF",
  },
  timeText: {
    fontSize: 12,
    color: "#333",
    fontFamily: "outfit",
  },
  selectedTimeText: {
    color: "#fff",
  },
  pickerContainer: {
    backgroundColor: "#fff",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#ddd",
    overflow: "hidden",
    height: 45,
    fontSize: 15,
  },
  picker: {
    height: Platform.OS === "ios" ? 150 : 50,
    width: "100%",
    fontFamily: "outfit",
  },
  typeContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  typeButton: {
    flex: 1,
    backgroundColor: "#fff",
    padding: 15,
    borderRadius: 8,
    marginHorizontal: 5,
    borderWidth: 1,
    borderColor: "#ddd",
    alignItems: "center",
  },
  selectedTypeButton: {
    backgroundColor: "#007AFF",
    borderColor: "#007AFF",
  },
  typeText: {
    fontSize: 14,
    fontFamily: "outfit",
    color: "#333",
    textAlign: "center",
  },
  selectedTypeText: {
    color: "#fff",
  },
  input: {
    backgroundColor: "#fff",
    padding: 15,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#ddd",
    height: 80,
    textAlignVertical: "top",
  },
  buttonContainer: {
    marginTop: -3,
    // remove flexDirection: 'row',
    // remove  justifyContent: 'space-between',
  },
  actionButton: {
    padding: 10,
    borderRadius: 8,
    alignItems: "center",
    marginVertical: 5, //Added a vertical margin
  },
  submitButton: {
    backgroundColor: "#007AFF",
  },
  cancelButton: {
    backgroundColor: "#ff3b30",
  },
  submitButtonText: {
    color: "#fff",
    fontSize: 15,
    fontWeight: "600",
    fontFamily: "outfit-medium",
  },
  cancelButtonText: {
    color: "#fff",
    fontSize: 15,
    fontWeight: "600",
    fontFamily: "outfit-medium",
  },
  dropdown: {
    width: "100%",
    fontFamily: "outfit",
    fontSize: 15,
    paddingHorizontal: 8,
    paddingVertical: 11,
  },
  imageStyle: {
    width: 24,
    height: 24,
    borderRadius: 12,
  },
  placeholderStyle: {
    fontSize: 12,
    fontFamily: "outfit",
  },
  selectedTextStyle: {
    fontSize: 14,
    marginLeft: 8,
    fontFamily: "outfit",
  },
  iconStyle: {
    width: 20,
    height: 20,
  },
});

export default BookAppointment;
