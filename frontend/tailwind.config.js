/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
    ],
    theme: {
        extend: {
            colors: {
                'desktop-gray': '#f0f0f0',
                'desktop-border': '#999999',
                'desktop-input': '#ffffff',
                'header-bg': '#e0e0e0', // Slightly darker for header-like sections
            },
            fontSize: {
                'tiny': '0.7rem', // Smaller than xs for dense grids
            },
            boxShadow: {
                'inset-input': 'inset 1px 1px 2px rgba(0,0,0,0.1)',
            }
        },
    },
    plugins: [],
}
