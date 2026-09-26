Place the six source-of-truth Northwind CSV files in this directory:

- `northwind_complaints.csv`
- `northwind_systems.csv`
- `northwind_monthly_kpis.csv`
- `northwind_meter_reads.csv`
- `northwind_ai_pilot_2025.csv`
- `northwind_unit_costs.csv`

No challenge CSVs were present when the initial analysis service was implemented.
The API reports missing files and leaves unavailable metric values null rather than
presenting missing data as measured zeroes. `NORTHWIND_DATA_DIR` can override this
location at runtime.
