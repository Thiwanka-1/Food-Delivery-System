
# Rest Countries React App

A React frontend application that consumes the [REST Countries API](https://restcountries.com/) to display country data, with live search, region & language filtering, detail views, and user session management (login & favorites).

[![Vercel](https://img.shields.io/badge/deployed%20on-vercel-000?logo=vercel)](https://country-api-jade.vercel.app/)

## 🌐 Live Demo

https://country-api-jade.vercel.app/

## 🛠 Technology Stack

- **React** (functional components & hooks)  
- **Vite** for bundling & hot reload  
- **Tailwind CSS** for utility-first styling  
- **React Router** for client-side routing  
- **LocalStorage** for session (login) & favorites persistence  
- **Jest** + **React Testing Library** for unit & integration tests

## 📁 Project Structure

```text
project-root/
├── babel.config.cjs              # Babel config for Jest
├── jest.setup.js                 # Jest-DOM setup
├── package.json                  # NPM scripts & dependencies
├── tailwind.config.js            # Tailwind CSS config
├── postcss.config.js             # PostCSS config
├── README.md                     # Project overview & usage
├── DOCUMENTATION.md              # Detailed report & API docs
└── src/
    ├── App.jsx                   # Main router + layout
    ├── main.jsx                  # Vite entry point
    ├── index.css                 # Tailwind base imports
    ├── services/
    │   └── api.js                # REST Countries API functions
    ├── contexts/
    │   ├── AuthContext.jsx       # Fake-login session context
    │   ├── FavoritesContext.jsx  # Favorites management context
    │   └── FavoritesContext.test.jsx
    ├── components/
    │   ├── CountryCard.jsx       # Country card UI
    │   ├── FavoriteButton.jsx    # Heart toggle button
    │   ├── Navbar.jsx            # Top navigation bar
    │   ├── Loading.jsx           # Spinner component
    │   ├── CountryCard.test.jsx
    │   └── Navbar.test.jsx
    ├── pages/
    │   ├── Home.jsx              # Search, filter & list countries
    │   ├── Detail.jsx            # Country detail view
    │   ├── Favorites.jsx         # Protected favorites page
    │   ├── Login.jsx             # Login form
    │   └── Login.test.jsx
```

## 🚀 Getting Started

1. **Install dependencies**  
   - npm install
2. Run in development mode
   - npm run dev (Open http://localhost:5173 in your browser.)
4. Build for production
   - npm run build 
6. Preview the production build
   - npm run preview

   
🔍 Features

- Live Search: Type in the search box and the country list updates instantly (300 ms debounce).
- Region & Language Filters: Two dropdowns let you narrow down results.
- Detail View: Click a country card to see native name, population, region, subregion, capital, domain, currencies, languages, and border-country links.
- Login: Enter any username/password to “sign in” (session stored in localStorage).
- Favorites: Star ❤️ your favorite countries and view them on a protected Favorites page.

🖥 API Endpoints Used

- GET /all — list of all countries
- GET /name/{name} — search by country name
- GET /region/{region} — filter by region
- GET /alpha/{code} — country details by code

✅ Testing

- For testing run - npm test

Test Covers:

- CountryCard rendering & navigation
- Navbar login/logout UI
- Login form validation & redirect
- FavoritesContext toggle & persistence

📦 Deployment

- Push your repo to GitHub.
- In Vercel: Import Project → select your repo → use default settings → Deploy.
