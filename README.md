## 🚀 Setup & Start Guide  

Follow these steps to set up and run the project:

### 1️⃣ Install Prerequisites  
Ensure you have **Anaconda** and **Git** installed on your system.

### 2️⃣ Clone the Repository  
Open a terminal and run:  
```bash
git clone https://github.com/SereMark/Blackjack-GestureAI.git
cd Blackjack-GestureAI
```

### 3️⃣ Create and Activate the Virtual Environment  
Set up the Conda environment with all dependencies:  
```bash
conda env create -f environment.yml
conda activate Blackjack-GestureAI
```

---

## ▶️ Running the Project  

### **1️⃣ Start the Backend (FastAPI)**  
Run the FastAPI server:  
```bash
cd backend
uvicorn main:app --reload
```
The API will be available at: [http://127.0.0.1:8000/docs](http://127.0.0.1:8000/docs)

### **2️⃣ Start the Frontend (React)**  
Open a new terminal and run:  
```bash
cd frontend
npm install  # Install dependencies (only needed the first time)
npm start
```
The frontend will be available at: [http://localhost:3000](http://localhost:3000)
