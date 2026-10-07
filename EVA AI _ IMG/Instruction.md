You are helping me build a final-year resume project:

# Project: Vegetable / Commodity Price Rise Predictor

## Goal

Build a complete machine learning and time-series forecasting project that predicts whether prices of apple, amla, tomato, and potato will rise in the next 7 days using historical mandi data, arrivals, location, seasonality.

The project should predict outputs like:

> apple price in Himachal Pradesh  is expected to rise by 12–18% next week with confidence 0.72 because arrival quantity dropped, rainfall changed, and the seasonal trend is rising.

Use Python and build the project in a clean, resume-ready structure.

---

# 1. Data I will provide

I will provide downloaded datasets,CSV file from data.gov.in

Showing 10 out of 35,121 records from real dataset
Columns are Arrival Date ,Commodity(Fruits/vegetable) Commodity Code District Grade Market Max Price Min Price Modal Price State Variety

10/11/2025	Amla(Nelli Kai)	355	Mandi	Medium	SMY Dhanotu	3000	2500	2700	Himachal Pradesh	Amla
29/11/2025	Amla(Nelli Kai)	355	Mandi	Medium	SMY Dhanotu	3000	2000	2500	Himachal Pradesh	Amla
03/12/2025	Amla(Nelli Kai)	355	Mandi	Medium	SMY Dhanotu	3000	2500	2800	Himachal Pradesh	Amla
* state
* district


# 2. Main prediction task

Create two related prediction tasks:

## Task A: Price Rise Classification

Predict whether the commodity price will rise in the next 7 days.

Target variable:

```python
future_price = rolling average modal_price over next 7 days
current_price = rolling average modal_price over current / previous 7 days
future_return_pct = ((future_price - current_price) / current_price) * 100
price_rise_label = 1 if future_return_pct >= 5 else 0
```

The 5% threshold should be configurable.

## Task B: Price Forecasting / Percentage Rise Prediction

Predict the next 7-day expected modal price and expected percentage change.

Required forecasting models:
* XGBoost
<!-- * Prophet -->
* LSTM

The final output should include:

* commodity
* state
* district
* market
* current modal price
* predicted modal price after 7 days
* expected percentage change
* rise / fall / stable label
* confidence score
* top reasons behind prediction

---

# 3. Required ML models

Implement and compare these models:

## 3.1 XGBoost

Use XGBoost for supervised ML using lag, rolling, weather, festival, arrival, fuel, and calendar features.

Use it for:

* classification: price rise or not
* regression: future price / future return percentage

Models:

```python
XGBClassifier
XGBRegressor
```
<!-- 
## 3.2 Prophet

Use Prophet for time-series forecasting.

Build separate Prophet models at a reasonable grouping level, for example:

* commodity + state
* commodity + state + market, if enough data exists

Use Prophet with:

* daily seasonality if useful
* weekly seasonality
* yearly seasonality
* Indian festival regressors if possible
* rainfall / arrival quantity / fuel price as external regressors if available
 -->

## 3.3 LSTM

Use LSTM for sequence-based forecasting.

Create time-window sequences such as:

* past 14 days
* past 30 days

Input features may include:

* modal_price
* arrivals
* rainfall
* temperature
* fuel price
* calendar features
* festival features

Predict:

* next 7-day modal price
* next 7-day return percentage

Use TensorFlow / Keras or PyTorch, whichever is easier and cleaner.

--- -->

# 4. Project folder structure

Create this structure:

```text
commodity-price-rise-predictor/
│
├── data/
│   ├── raw/
│   ├── interim/
│   ├── processed/
│   └── external/
│
├── notebooks/
│   ├── 01_data_understanding.ipynb
│   ├── 02_cleaning_and_eda.ipynb
│   ├── 03_feature_engineering.ipynb
│   ├── 04_model_training.ipynb
│   └── 05_model_evaluation.ipynb
│
├── src/
│   ├── __init__.py
│   ├── config.py
│   ├── data_ingestion.py
│   ├── data_cleaning.py
│   ├── feature_engineering.py
│   ├── train_xgboost.py
│   ├── train_prophet.py
│   ├── train_lstm.py
│   ├── evaluate.py
│   ├── predict.py
│   ├── explain.py
│   └── utils.py
│
├── models/
│   ├── xgboost/
│   └── lstm/
│
├── reports/
│   ├── figures/
│   ├── metrics/
│   └── sample_predictions.csv
│
├── app/
│   └── streamlit_app.py //later 
│
├── requirements.txt
├── README.md
└── run_pipeline.py
```

---

# 5. Data ingestion requirements

Create flexible data loading code that can read CSV and Excel files from:

```text
data/raw/
```

The ingestion script should:

1. Detect all files in `data/raw/`.
2. Read CSV, XLSX, or XLS files.
3. Standardize column names to lowercase snake_case.
4. Map different possible column names to standard names.

Example mappings:

```python
"modal price" -> "modal_price"
"modal_price" -> "modal_price"
"modalprice" -> "modal_price"
"min price" -> "min_price"
"max price" -> "max_price"
"arrivals" -> "arrival_quantity"
"arrival qty" -> "arrival_quantity"
"market" -> "market"
"mandi" -> "market"
"apmc" -> "market"
"commodity" -> "commodity"
"state" -> "state"
"district" -> "district"
"date" -> "date"
"arrival_date" -> "date"
```

Save the combined standardized dataset to:

```text
data/interim/mandi_combined.csv
```

---

# 6. Data cleaning requirements

Clean the mandi data carefully.

## 6.1 Date cleaning

* Parse all date columns.
* Convert to `YYYY-MM-DD`.
* Drop rows where date cannot be parsed.
* Sort by commodity, state, district, market, date.

## 6.2 Text cleaning

Standardize text columns:

* commodity
* state
* district
* market
* variety
* grade

Cleaning rules:

* lowercase
* strip spaces
* remove extra spaces
* normalize spelling if needed

Commodity filtering:

Keep only:

```text
onion
tomato
potato
```

Also handle variants like:

```text
onions -> onion
tomatoes -> tomato
potatoes -> potato
```

## 6.3 Price cleaning

For price columns:

* Convert min_price, modal_price, max_price to numeric.
* Remove commas, rupee symbols, and invalid characters.
* Drop rows with missing modal_price.
* Remove impossible values where modal_price <= 0.
* If min_price > modal_price or modal_price > max_price, flag the row.
* Do not blindly delete flagged rows; create a data quality report.

## 6.4 Arrival cleaning

For arrival columns:

* Convert arrival_quantity to numeric.
* Handle missing arrivals using group-wise interpolation where possible.
* If arrival is unavailable, keep the row but create an `arrival_missing_flag`.

## 6.5 Unit handling

Standardize units where possible.

Expected price unit should become:

```text
Rs/quintal
```

Expected arrival unit should become:

```text
quintal or tonnes
```

If the source uses tonnes, convert to quintals:

```python
1 tonne = 10 quintals
```

Create clean fields:

```python
modal_price_rs_per_quintal
arrival_quintal
```

## 6.6 Duplicate handling

Remove duplicate rows based on:

```python
date, commodity, state, district, market
```

If duplicate rows exist, aggregate using:

* modal_price: mean or median
* min_price: min
* max_price: max
* arrival_quantity: sum

Save cleaned data to:

```text
data/processed/mandi_cleaned.csv
```

Also create a cleaning report:

```text
reports/metrics/data_quality_report.json
```

---

# 7. Data aggregation

Create daily time series at these levels:

## Main modeling level

```python
commodity, state, district, market, date
```

## Fallback modeling level

If a market has too few records, aggregate to:

```python
commodity, state, date
```

For each group and date, calculate:

* modal_price_rs_per_quintal
* min_price
* max_price
* arrival_quintal
* number_of_markets_reporting
* average_price
* total_arrivals

Create regular daily date ranges for each group.

Handle missing dates by:

* keeping missing price as NaN initially
* interpolating short gaps only
* adding missing flags
* never using future data to fill past values

---

# 8. Feature engineering

Create features for supervised ML.

## 8.1 Lag features

For each commodity-location group:

```python
price_lag_1
price_lag_2
price_lag_3
price_lag_7
price_lag_14
price_lag_21
price_lag_30

arrival_lag_1
arrival_lag_7
arrival_lag_14
arrival_lag_30
```

## 8.2 Rolling features

```python
price_rolling_mean_3
price_rolling_mean_7
price_rolling_mean_14
price_rolling_mean_30

price_rolling_std_7
price_rolling_std_14
price_rolling_std_30

arrival_rolling_mean_7
arrival_rolling_mean_14
arrival_rolling_mean_30

arrival_rolling_std_7
arrival_rolling_std_30
```

## 8.3 Return and momentum features

```python
price_change_1d
price_change_3d
price_change_7d
price_return_1d
price_return_7d
price_return_14d

arrival_change_7d
arrival_return_7d
```

## 8.4 Calendar features

```python
day_of_week
day_of_month
week_of_year
month
quarter
year
is_weekend
is_month_start
is_month_end
```

Use cyclic encoding for seasonality:

```python
month_sin
month_cos
day_of_week_sin
day_of_week_cos
```

## 8.5 Festival and holiday features

From the festival calendar, create:

```python
is_festival
is_public_holiday
days_to_next_festival
days_since_last_festival
festival_window_3d
festival_window_7d
```

Festival effect matters because demand can increase before important festivals.

## 8.6 Weather features

Merge weather data by date and location.

Features:

```python
rainfall
temperature
humidity
rainfall_lag_1
rainfall_lag_3
rainfall_lag_7
rainfall_rolling_7
temperature_rolling_7
extreme_rain_flag
heat_flag
```

If district-level weather is unavailable, merge by state-level weather.

## 8.7 Fuel / logistics proxy features

Merge fuel data by date and state.

Features:

```python
petrol_price
diesel_price
diesel_lag_7
diesel_change_7d
fuel_rolling_mean_7
```

## 8.8 Target features

Create:

```python
future_price_7d
future_return_pct_7d
price_rise_label_7d
```

Important:

* Use only future values for target creation.
* Do not allow future values to enter model features.
* Drop rows where future target is unavailable.

Save final feature dataset to:

```text
data/processed/features.csv
```

---

# 9. Train-test split

Use proper time-series splitting.

Do not use random train-test split.

Recommended split:

```text
Train: oldest 70%
Validation: next 15%
Test: latest 15%
```

Also support rolling time-series cross-validation.

Ensure no leakage between train and test.

---

# 10. Model training

## 10.1 XGBoost classification

Train XGBoost classifier to predict:

```python
price_rise_label_7d
```

Evaluation metrics:

* accuracy
* precision
* recall
* F1-score
* ROC-AUC
* confusion matrix

Because price rise may be imbalanced, handle class imbalance using:

```python
scale_pos_weight
```

or class weights.

Save model to:

```text
models/xgboost/xgb_classifier.pkl
```

## 10.2 XGBoost regression

Train XGBoost regressor to predict:

```python
future_return_pct_7d
```

Evaluation metrics:

* MAE
* RMSE
* MAPE
* R2

Save model to:

```text
models/xgboost/xgb_regressor.pkl
```

<!-- ## 10.3 Prophet forecasting

Train Prophet models for selected groups.

The Prophet dataframe should use:

```python
ds = date
y = modal_price_rs_per_quintal
```

Add regressors where available:

```python
arrival_quintal
rainfall
temperature
diesel_price
is_festival
```

Save Prophet models in:

```text
models/prophet/
```

Create forecasts for the next 7 days. -->

## 10.4 LSTM forecasting

Prepare sequences using scaled numeric features.

Example:

```python
sequence_length = 30
forecast_horizon = 7
```

Train LSTM to predict future 7-day price or return.

Use:

* train/validation/test chronological split
* StandardScaler or MinMaxScaler fitted only on train data
* early stopping
* model checkpointing

Save model to:

```text
models/lstm/lstm_model.h5
```

---

# 11. Model evaluation and comparison

Create one evaluation script:

```text
src/evaluate.py
```

It should generate:

```text
reports/metrics/xgboost_classification_metrics.json
reports/metrics/xgboost_regression_metrics.json
reports/metrics/prophet_metrics.json
reports/metrics/lstm_metrics.json
```

Also generate plots:

```text
reports/figures/actual_vs_predicted_xgboost.png
reports/figures/actual_vs_predicted_prophet.png
reports/figures/actual_vs_predicted_lstm.png
reports/figures/feature_importance_xgboost.png
reports/figures/confusion_matrix_xgboost.png
```

Compare models in a final table:

```text
model_name, task, MAE, RMSE, MAPE, F1, ROC_AUC
```

Save it to:

```text
reports/metrics/model_comparison.csv
```

---

# 12. Explainability

Create an explanation module:

```text
src/explain.py
```

For XGBoost, provide:

* feature importance
* SHAP values if possible
* fallback to XGBoost built-in feature importance if SHAP is not installed

For every prediction, generate a human-readable explanation.

Example:

```text
Tomato price in Karnataka / Bengaluru market is expected to rise by 14.2% in the next 7 days with confidence 0.72.

Main reasons:
1. Arrival quantity dropped by 28% compared with the previous 7-day average.
2. Price momentum is positive because the 7-day price return is 9.4%.
3. Festival window is active within the next 7 days.
4. Rainfall has increased, which may affect supply.
```

---

# 13. Prediction script

Create:

```text
src/predict.py
```

It should allow prediction for:

```python
commodity
state
district
market
prediction_date
```

Example command:

```bash
python src/predict.py --commodity tomato --state karnataka --district bengaluru --market bengaluru --date 2025-07-01
```

Output should include:

```json
{
  "commodity": "tomato",
  "state": "karnataka",
  "district": "bengaluru",
  "market": "bengaluru",
  "prediction_date": "2025-07-01",
  "current_modal_price": 2200,
  "predicted_price_next_7d": 2550,
  "expected_change_pct": 15.9,
  "rise_label": "Rise",
  "confidence": 0.72,
  "model_used": "XGBoost + Prophet ensemble",
  "reasons": [
    "Arrival quantity dropped compared with 7-day average",
    "Seasonal trend is rising",
    "Rainfall feature indicates possible supply disruption"
  ]
}
```

---

# 14. Ensemble logic

Create a simple ensemble prediction using:

* XGBoost regression output
* Prophet 7-day forecast output
* LSTM 7-day forecast output

Suggested approach:

```python
final_prediction = weighted_average([
    xgboost_prediction,
    prophet_prediction,
    lstm_prediction
])
```

Initial weights:

```python
XGBoost: 0.45
Prophet: 0.30
LSTM: 0.25
```

Allow weights to be changed from config.

Confidence score should be based on:

* XGBoost classifier probability
* agreement between models
* recent volatility

Example logic:

```python
confidence = classifier_probability * model_agreement_score * volatility_adjustment
```

Keep confidence between 0 and 1.

---

# 15. Streamlit app

Create a simple Streamlit dashboard:

```text
app/streamlit_app.py
```

The app should allow user input:

* commodity
* state
* district
* market
* prediction date

Display:

* current price trend chart
* arrival trend chart
* predicted next 7-day price
* expected rise percentage
* confidence score
* rise/fall/stable result
* explanation reasons
* model comparison metrics

Run command:

```bash
streamlit run app/streamlit_app.py
```

---

# 16. README requirements

Create a strong README.md for resume/GitHub.

Include:

1. Project title
2. Problem statement
3. Data sources
4. Features used
5. Models used
6. Project architecture
7. How to run
8. Model evaluation
9. Sample prediction
10. Future improvements

Mention models:

* XGBoost
* Prophet
* LSTM

Mention data features:

* mandi modal price
* min/max price
* arrivals
* commodity
* state
* district
* market
* weather
* festivals
* fuel/logistics proxy
* seasonality

---

# 17. Requirements file

Create `requirements.txt` with required packages:

```text
pandas
numpy
scikit-learn
xgboost
prophet
tensorflow
matplotlib
seaborn
plotly
streamlit
joblib
shap
holidays
openpyxl
python-dateutil
```

If TensorFlow or Prophet causes installation issues, make the code modular so XGBoost can still run independently.

---

# 18. Main pipeline

Create:

```text
run_pipeline.py
```

It should run the full project:

```bash
python run_pipeline.py
```

Pipeline steps:

1. Ingest raw files
2. Clean data
3. Merge external weather/festival/fuel data
4. Create features
5. Train XGBoost
6. Train Prophet
7. Train LSTM
8. Evaluate models
9. Save reports and sample predictions

---

# 19. Coding standards

Please write clean, modular, production-style Python code.

Requirements:

* Use functions, not only notebook code.
* Add comments where needed.
* Add error handling for missing files and columns.
* Use logging.
* Use config variables in `src/config.py`.
* Do not hard-code file names except default folders.
* Do not use random train-test split for time series.
* Avoid data leakage.
* Save all intermediate outputs.
* Make the project runnable even if some optional external datasets are missing.
* Create dummy-safe fallbacks for weather, festival, or fuel data if unavailable.

---

# 20. Final deliverables

Generate all project files and code.

The final project should be able to:

1. Load my downloaded mandi data.
2. Clean and standardize it.
3. Engineer time-series, seasonality, weather, festival, and logistics features.
4. Train XGBoost, Prophet, and LSTM models.
5. Evaluate the models.
6. Predict whether onion/tomato/potato prices will rise in the next 7 days.
7. Show percentage rise and confidence score.
8. Explain the reason behind the prediction.
9. Provide a Streamlit dashboard.
10. Be suitable for GitHub and final-year resume submission.

Start by creating the project folder structure and all required Python files. Then implement the pipeline step by step.
