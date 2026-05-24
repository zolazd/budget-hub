# Zola Budget Hub

Offline local budget dashboard built from the 2026 budget tracker workbook.

## How to use

Open `index.html` in a browser. No internet, server, login, or app install is required.

## Included features

- Pay-cycle dashboard starting on the 24th
- Deposits/Credit Union balance tracking
- Cash envelopes and sinking funds
- CIBC and Undeposited Funds tracking
- Transfer support between accounts/envelopes
- Transaction add, edit, delete
- Category and subcategory filters
- Wallet Cash tab
- Loan balance tracking
- JSON import/export backup
- Theme selector

## Files

- `index.html` - App shell
- `styles.css` - App styling and themes
- `app.js` - Budget logic and local storage behavior
- `budget-data.js` - Imported seed data
- `tools/` - Workbook seed extraction scripts

## Notes

Data entered in the app is saved in the browser's local storage. Use **Export JSON** regularly if you want a backup file.
