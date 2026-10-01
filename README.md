# Lloyds Adult Income Fairness & Bias Mitigation Pipeline

An enterprise-grade, deployment-ready automated AI fairness audit and bias mitigation system built for **Lloyds Banking Group**, evaluated on the **Adult Census Income Dataset**.

---

## 🚀 Key Highlights & Workflow

1. **Adult Census Income Dataset Baseline**:
   - Evaluates machine learning models on **48,842 Census Income records** to predict income level (`>50K` vs `<=50K`).
   - **XGBoost Baseline Model (Unaware)**: High overall accuracy (`86.8%`) and ROC-AUC (`92.3%`), but exhibits severe demographic bias (`22.0%` Fairness Score, `HIGH BIAS`).
   - **Fairlearn Mitigated Model**: Uses `ExponentiatedGradient` reduction with Demographic Parity constraints (`79.6%` Accuracy, `92.8%` Fairness Score, `+70.8%` fairness gain).

2. **Intersectional Demographic Auditing (7 Combinations)**:
   - Audits fairness across **single, pairwise, and 3-way intersectional attributes**:
     1. `sex` (Female vs. Male)
     2. `race` (White, Black, Asian-Pac-Islander, Amer-Indian-Eskimo, Other)
     3. `age_group` (18-24, 25-34, 35-44, 45-54, 55-64, 65+)
     4. `sex_race` (e.g. Female | Black, Female | White)
     5. `age_sex` (e.g. 25-34 | Female, 45-54 | Male)
     6. `age_race` (e.g. 35-44 | White, 18-24 | Black)
     7. `age_sex_race` (Full 3-way intersectional disaggregation)

3. **Baseline vs. Bias Mitigated Model Switcher**:
   - Dynamic toggle in the header bar allowing governance teams to instantly switch between **Baseline Model** and **Bias Mitigated** models across all dashboard views.

---

## 📌 Features & Navigation

- **Dashboard**: Auto-loads Adult Income Dataset model analysis on startup. Displays overall performance metrics (Accuracy, Precision, Recall, F1, ROC-AUC, Specificity) and a 4-cell Confusion Matrix breakdown.
- **Fairness Metrics**: Multi-metric **Fair-Compass Radar Chart** and protected variable bias analysis with Disparate Impact Ratio (80% rule), Demographic Parity Difference, Equalized Odds, Equal Opportunity, and compliance status indicators (**PASS**, **FLAG**, **HIGH BIAS**).
- **Subgroup Analysis**: Disaggregated subgroup level fairness metrics across single and combined intersectional attributes, detailing population percentage, selection rates, disparity ratios, and status badges.
- **Setup & Upload**: Allows custom dataset uploads (CSV/Excel), custom column mapping (`y_true`, `y_pred`, `y_prob`), protected attribute selection, and risk-tier threshold configurations (*Strict*, *Moderate*, *Lenient*).
- **Report**: Download executive governance audit reports in **PDF** and **HTML** formats.

---

## 🛠️ Execution & Deployment

### Option A: Local Execution (Single Script)

```bash
# 1. Install required Python packages
python requirements.py

# 2. Launch FastAPI Backend and React Frontend
python run_app.py
```
- **React Frontend**: [http://localhost:3000](http://localhost:3000)
- **FastAPI Backend API**: [http://localhost:8000](http://localhost:8000) (Docs: [http://localhost:8000/docs](http://localhost:8000/docs))

### Option B: Docker Compose

```bash
docker-compose up --build
```
- **Web Application**: [http://localhost:3000](http://localhost:3000)

---

## 📂 Project Structure

```text
c:\Users\mahes\Desktop\Lloyds\FAIRNESS PIPELINE\
│
├── 📁 backend/             # Python FastAPI backend service
├── 📁 frontend/            # React Vite UI frontend application
├── 📁 data/                # Dataset directory (adult_income.csv)
├── 📁 notebooks/           # Notebooks directory (app.ipynb)
├── docker-compose.yml      # Docker compose configuration
├── README.md               # Project documentation
├── requirements.py         # Dependencies installer
└── run_app.py              # Application launcher
```
