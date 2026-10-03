---
id: KN-929935
type: knowledge
source_type: screenshot
raw_id: RAW-929935
storage: telegram
raw_url: "telegram://file/AgACAgUAAxkBAAMQasEFsx77pYEdUypOg7GXNFSoGeQAAn4TaxuOwwlWt-xVs8_jb7IBAAMCAAN5AAM9BA"
importance: 7
confidence: 0.99
topics:
  - HR Analytics
  - Data Visualization
  - Dashboard Design
  - Synthetic Data
  - Business Intelligence
source_id: SRC-929935
created: 2026-10-03
---

# HR Analytics Dashboard UI and Mock Data Analysis

## Core Idea

An HR Analytics Dashboard displaying key metrics (attrition rate, department stats, demographics) using highly uniform synthetic mock data, highlighting dashboard layout design but demonstrating unrealistic statistical distributions.

## Key Information

- Total Employees: 50,000 with an overall attrition rate of 50.2% (total attrition count of 25,105).
- Average working years across all departments (Hardware, R&D, Support, Software, HR, Sales) is extremely uniform, hovering around 20.3 to 20.6 years.
- Attrition by gender is almost perfectly split: 50.03% vs 49.97%.
- Attrition rates across monthly income brackets (from $5k to $45k) remain flat at approximately 50%.
- Marital status distribution among attrited employees is nearly equal: Divorced (8,418), Married (8,447), Single (8,240).

## Atomic Knowledge

### Real-world HR analytics data rarely exhibits uniform distribution across all demographic and organizational dimensions; uniform distributions typically indicate synthetic or randomly generated mock data

Real-world HR analytics data rarely exhibits uniform distribution across all demographic and organizational dimensions; uniform distributions typically indicate synthetic or randomly generated mock data.

**Type:** `INSIGHT` | **Confidence:** 99%

### The dashboard tracks key HR metrics including Attrition Rate, Average Hourly Rate, Job Role distribution, Working Years, Education Field, Gender, Department, Business Travel, Monthly Income, and Marital Status

The dashboard tracks key HR metrics including Attrition Rate, Average Hourly Rate, Job Role distribution, Working Years, Education Field, Gender, Department, Business Travel, Monthly Income, and Marital Status.

**Type:** `CONCEPT` | **Confidence:** 95%

### An overall attrition rate of 50

An overall attrition rate of 50.2% is unsustainably high for typical organizations, indicating either a severe organizational crisis or synthetic data.

**Type:** `CLAIM` | **Confidence:** 90%

## Insights

- The dashboard's data is highly likely generated using a uniform random distribution, as evidenced by nearly identical metrics across all categories (e.g., ~16% attrition rate across all departments, ~33% split for business travel, ~50% attrition across all income brackets).
- While the visual layout is clean and covers comprehensive HR metrics, the lack of variance in the data makes it impossible to derive actionable business intelligence (e.g., identifying high-risk groups or departments).

## Actions

- [ ] When building portfolio dashboards, use realistic datasets (like the IBM HR Analytics Employee Attrition dataset) instead of purely uniform synthetic data to demonstrate true analytical capability.

## Product & SaaS Opportunities

- 💡 A mock data generator specifically designed for HR dashboards that injects realistic correlations (e.g., higher attrition in lower income brackets, specific department variances) rather than flat uniform distributions.

## Related Knowledge

- [[HR Analytics]]
- [[Data Visualization]]
- [[Dashboard Design]]
- [[Synthetic Data]]
- [[Business Intelligence]]

## Why I Saved This

To analyze dashboard UI/UX layout patterns for HR analytics and to study the visual indicators of synthetic/mock datasets.

## What Changed

Reinforces the importance of realistic data variance in dashboard design; a beautiful UI is undermined if the underlying data distributions are statistically impossible in real-world scenarios.

## Original

telegram://file/AgACAgUAAxkBAAMQasEFsx77pYEdUypOg7GXNFSoGeQAAn4TaxuOwwlWt-xVs8_jb7IBAAMCAAN5AAM9BA
