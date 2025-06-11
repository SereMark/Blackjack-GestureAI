### Prerequisites
**Anaconda**, **Git**, and **Node.js**.

### Clone the Repository
```bash
git clone https://github.com/SereMark/Blackjack-GestureAI.git
cd Blackjack-GestureAI
```

### Create and Activate the Environment & Install Node Dependencies
```bash
cd backend
conda env create -f environment.yml
conda activate Blackjack-GestureAI
cd ../frontend
npm install
cd ..
```

### **Start the Backend**
```bash
cd backend
uvicorn main:app --reload
```

### **Start the Frontend**
```bash
cd frontend
npm run dev
```