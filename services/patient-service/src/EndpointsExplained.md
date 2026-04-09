# Patient Service API Documentation

The Patient Service is a core microservice that manages patient onboarding (the Booking Wall), medical histories, and secure data access. It acts as the central source of truth for patient data and interacts closely with the **Appointment Service**, the **Doctor Service**, and an **AI Microservice**.

---

## 🤝 Integrations: Doctor & Appointment Services

The Patient Service shares data with the Doctor and Appointment services using **RESTful HTTP calls**. 

Depending on who is asking for the data, the connection method is different:
1. **Internal Service-to-Service:** The Appointment Service fetches basic patient info directly over the internal Docker network. It bypasses the API Gateway and authenticates using standard JWTs sharing the same secret.
2. **Doctor UI via API Gateway:** When a doctor wants to view medical data, the request comes from the frontend through the API Gateway, authenticated using a **Doctor JWT**.

### Relevant Endpoints

* **`GET /api/patients/:userId`**
  * **Used by:** Appointment Service (Internal).
  * **Purpose:** When a patient books an appointment, the Appointment Service calls this endpoint to grab basic details like the patient's full name and contact number to attach to the booking. 
* **`GET /api/patients/snapshot/:snapshotId`**
  * **Used by:** Doctor Service / Doctor UI.
  * **Purpose:** Allows a doctor to see the exact medical state of the patient at the exact moment they booked the appointment (frozen in time).
* **`GET /api/patients/history/doctor/:patientId`**
  * **Used by:** Doctor Service / Doctor UI.
  * **Purpose:** Grants the doctor full access to the patient's medical history timeline. 
  * **Security:** The first time a doctor hits this endpoint, a 24-hour access timer starts silently. After 24 hours, access is automatically revoked unless renewed.

### Real-World Scenario: Sarah Books Dr. Smith

1. **The Booking:** Sarah finishes her "Booking Wall" profile and clicks "Book Appointment" with Dr. Smith.
2. **The Snapshot:** Just before the booking finalizes, the frontend creates a **Medical Snapshot** to freeze her current medical details (like her `A+` blood type). 
3. **Internal Fetch:** The Appointment Service receives the booking request. It internally calls `GET /api/patients/:userId` to get Sarah's phone number so it can send her a confirmation SMS.
4. **Doctor Views Appointment:** Dr. Smith opens his dashboard and clicks on Sarah's upcoming appointment. The frontend calls `GET /api/patients/snapshot/:snapshotId` so Dr. Smith can see her frozen `A+` blood type without seeing any changes she might have made *after* booking.
5. **Doctor Needs More Context:** Dr. Smith wants to see her past medical history. He clicks "View History". The frontend calls `GET /api/patients/history/doctor/:patientId`. The Patient Service logs this and gives Dr. Smith a **24-hour access window** to view her longitudinal timeline.

---

## Core Patient Endpoints

These endpoints are used directly by the patient via the mobile app or website. They are protected by the **Patient JWT**.

* **`GET /api/patients/me`**
  * **Purpose:** Fetches the patient's current profile. It returns a `bookingProfileComplete` flag so the frontend knows whether to show the dashboard or force the user to complete the Booking Wall.
* **`POST /api/patients/profile`**
  * **Purpose:** The "Booking Wall". Saves mandatory information (Date of Birth, Gender, Contact Number, Blood Type, Emergency Contact) before the patient is allowed to book anything.
* **`PUT /api/patients/me`**
  * **Purpose:** The "Settings Page". Allows the patient to update optional medical data like height, weight, allergies, and current medications.
* **`POST /api/patients/snapshot`**
  * **Purpose:** Takes all the current data from the profile and saves an immutable copy of it, returning a `snapshotId` to be attached to new appointments.

---

## AI Integration Endpoints

These endpoints power the secure AI medical assistant. They use a highly restricted, short-lived token system to protect patient privacy.

* **`POST /api/patients/history-token`**
  * **Purpose:** Called by the patient's frontend when they open the AI chat. It generates a temporary JWT that expires in exactly 1 hour.
* **`GET /api/patients/history/ai`**
  * **Purpose:** Called by the backend AI microservice using the 1-hour token. It returns a fully anonymized timeline of the patient's medical history (stripping out names, phone numbers, etc.) so the AI can answer health questions safely with context.