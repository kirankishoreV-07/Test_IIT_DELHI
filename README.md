# 🚀 REZO - Urban Feedback System

**REZO** is an innovative Urban Feedback System developed for the **CivicStack - Hack for Governance & Public Systems**. It enhances civic engagement by streamlining complaint dashboards, community surveys, and AI-driven ticketing for both municipal authorities and citizens.

---

## 👥 Team

- **Team Name:** REZO  
- **Team Leader:** Vimalharirhar 

---

## 📋 Problem Statement

Urban feedback systems face challenges such as:
- Language barriers
- Fake or irrelevant complaints
- Lack of transparency in redressal mechanisms

**REZO** addresses these by providing an **inclusive, AI-powered platform** for complaint submission, verification, and prioritization.

---

## ✨ Key Features

| Feature | Existing Solutions | REZO |
|--------|--------------------|------|
| AI Image Validation | ❌ | ✅ |
| Emotion Detection | ❌ | ✅ |
| Sensitive Location Scoring | ❌ | ✅ |
| Multilingual Support | Limited | ✅ (22+ Indian languages) |
| Public Heatmap Transparency | ❌ | ✅ (Mapbox-powered) |

- 🗣️ **Multilingual Complaint Submission**  
  - Supports **text, voice, and image-based complaints** in 22+ Indian languages  
  - Integrated with **location data**
  
- 🤖 **AI Verification**  
  - CNN model filters out up to **70%** of fake/irrelevant submissions

- ❤️ **Emotion Keyword Extraction**  
  - Uses **DistilBERT + Bhashini’s STT** to assess urgency

- 🧠 **Location Sensitivity Scoring**  
  - Prioritizes complaints near **sensitive zones** (schools, hospitals) using **Overpass API**

- 🎯 **Priority Scoring Engine**  
  - Ranks complaints using a composite score from **AI confidence + emotion + location**

- 🌐 **Real-Time Heatmaps**  
  - Visualizes complaint density and status using **Mapbox**

- 🛠️ **Admin Dashboard**  
  - Centralized, responsive interface for managing complaints

- 🧑‍💼 **Civic Chatbot**  
  - Answers FAQs, tracks complaint status, and provides civic awareness

---

## 🌍 Social Impact

### 🧑 For Citizens

- **Inclusivity:** Supports **90%+** of India’s population via vernacular input (powered by Bhashini)
- **Reliability:** Reduces fake complaints by **70%**
- **Transparency:** Real-time **Mapbox heatmaps**
- **Notifications:** Tracks complaint status and sends utility/civic alerts
- **Empowerment:** CivicBot answers **100+ FAQs**, tracks **50+ government schemes**

### 🏛️ For Authorities

- Intelligent complaint **prioritization**
- **AI insights** to support informed decision-making
- Builds **public trust** via transparency

---

## 🛠️ Technology Stack

| Layer       | Technology |
|-------------|------------|
| **Frontend** | Mapbox (Heatmaps), Chatbot UI, Admin Dashboard |
| **Backend** | CNN (Image verification), DistilBERT (Emotion detection) |
| **APIs**    | Overpass API (Location Scoring), Bhashini (Multilingual Support) |
| **Core**    | Priority Scoring Engine |

---

## 🚀 Getting Started

### Prerequisites

- Node.js
- API keys for:
  - Mapbox
  - Overpass API
  - Bhashini
