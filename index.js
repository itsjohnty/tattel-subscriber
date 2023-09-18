const express = require("express");
const bodyParser = require("body-parser");
const { initializeApp, credential } = require("firebase/app");
const {
  getFirestore,
  collection,
  addDoc,
  getDocs,
} = require("firebase/firestore");
const firebaseConfig = require("./firebaseConfig");
const {
  getAuth,
  createUserWithEmailAndPassword,
  fetchSignInMethodsForEmail,
  signInWithEmailAndPassword,
} = require("firebase/auth");

const app = express();
app.use(bodyParser.json());

const firebaseApp = initializeApp(firebaseConfig);
const db = getFirestore(firebaseApp);

app.post("/login", async (req, res) => {
  const { email, password } = req.body;
  const auth = getAuth(firebaseApp);

  try {
    const userCredential = await signInWithEmailAndPassword(
      auth,
      email,
      password
    );
    const user = userCredential.user;

    const usersRef = collection(db, "subscribers");
    const userQuery = email;
    const userSnapshot = await getDocs(usersRef, userQuery);

    if (!userSnapshot.empty) {
      const userData = userSnapshot.docs[0].data();
      return res
        .status(200)
        .json({ message: "Login successful", user: userData });
    } else {
      return res
        .status(401)
        .json({ error: "User data not found. Please sign up first." });
    }
  } catch (error) {
    console.error("Error logging in:", error);

    if (error.code === "auth/user-not-found") {
      return res
        .status(401)
        .json({ error: "User not found. Please sign up first." });
    } else {
      return res.status(401).json({ error: "Invalid credentials" });
    }
  }
});
app.post("/signup", async (req, res) => {
  const {
    category,
    // Common fields
    firstName,
    lastName,
    email,
    password,
  } = req.body;

  if (!category) {
    return res.status(400).json({ error: "Category is required" });
  }

  try {
    const auth = getAuth(firebaseApp);
    const signInMethods = await fetchSignInMethodsForEmail(auth, email);

    if (signInMethods.length > 0) {
      return res
        .status(400)
        .json({ error: "Email is already in use. Please log in." });
    }

    const userCredential = await createUserWithEmailAndPassword(
      auth,
      email,
      password
    );
    const user = userCredential.user;

    const subscribersRef = collection(db, "subscribers");
    let additionalFields = {
      firstName,
      lastName,
      email,
      category,
      status: "pending", // Default status
    };

    if (category === "Mentee") {
      additionalFields = {
        ...additionalFields,
        careerField: req.body.careerField,
        isEighteenPlus: req.body.isEighteenPlus,
        cvUploaded: req.body.cvUploaded,
        stage: req.body.stage,
        studentIdCard: req.body.studentIdCard,
        careerInterests: req.body.careerInterests,
        previousWorkExperience: req.body.previousWorkExperience,
        expectations: req.body.expectations,
      };
    } else if (category === "Mentor" || category === "Consultant") {
      additionalFields = {
        ...additionalFields,
        industryExpertise: req.body.industryExpertise,
        coachingStyle: req.body.coachingStyle,
      };
      if (category === "Consultant") {
        additionalFields.hasDBSCertificate = req.body.hasDBSCertificate;
      }
    } else if (category === "Organization") {
      additionalFields = {
        ...additionalFields,
        companyName: req.body.companyName,
        companyWebsite: req.body.companyWebsite,
        location: req.body.location,
        purposeOfRegistration: req.body.purposeOfRegistration,
        numberOfEmployees: req.body.numberOfEmployees,
      };
    }

    const docRef = await addDoc(subscribersRef, additionalFields);

    console.log("Document written with ID: ", docRef.id);
    return res.status(201).json({ message: "Signup successful" });
  } catch (error) {
    console.error("Error signing up:", error);
    return res.status(500).json({ error: "Something went wrong" });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
