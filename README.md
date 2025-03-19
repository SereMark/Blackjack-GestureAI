# Blackjack-GestureAI

An interactive Blackjack game powered by gesture recognition using AI. This project utilizes PyTorch for CNN-based gesture detection, OpenCV for real-time video processing, FastAPI for backend communication, and React for a dynamic frontend. SQLite is used for data management, ensuring a seamless and engaging user experience.

## 🚀 Setup & Start Guide

Follow these steps to set up and run the project:

### 1️⃣ Install Prerequisites
Ensure you have **Anaconda**, **Git**, and **Node.js** installed on your system.

### 2️⃣ Clone the Repository
Open a terminal and run:
```bash
git clone https://github.com/SereMark/Blackjack-GestureAI.git
cd Blackjack-GestureAI
```

### 3️⃣ Create and Activate the Environment & Install Node Dependencies
Set up the Conda environment with all Python dependencies and install the Node packages:
```bash
cd backend
conda env create -f environment.yml
conda activate Blackjack-GestureAI
cd ../frontend
npm install
cd ..
```

---

## ▶️ Running the Project

### **1️⃣ Start the Backend (FastAPI)**
Run the FastAPI server:
```bash
cd backend
uvicorn main:app --reload
```
The API documentation will be available at: [http://127.0.0.1:8000/docs](http://127.0.0.1:8000/docs)

### **2️⃣ Start the Frontend (React)**
Open a new terminal and run:
```bash
cd frontend
npm run dev
```
The frontend will be available at: [http://localhost:5173](http://localhost:5173)