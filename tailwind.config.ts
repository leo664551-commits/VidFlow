import type { Config } from "tailwindcss";
import tailwindcssAnimate from "tailwindcss-animate";

const config: Config = {
    darkMode: "class",
    content: [
    "./src/**/*.{js,ts,jsx,tsx,mdx}",
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
  	extend: {
  		colors: {
  			background: 'var(--background)',
  			foreground: 'var(--foreground)',
  			card: {
  				DEFAULT: 'var(--card)',
  				foreground: 'var(--card-foreground)'
  			},
  			popover: {
  				DEFAULT: 'var(--popover)',
  				foreground: 'var(--popover-foreground)'
  			},
  			primary: {
  				DEFAULT: 'var(--primary)',
  				foreground: 'var(--primary-foreground)'
  			},
  			secondary: {
  				DEFAULT: 'var(--secondary)',
  				foreground: 'var(--secondary-foreground)'
  			},
  			muted: {
  				DEFAULT: 'var(--muted)',
  				foreground: 'var(--muted-foreground)'
  			},
  			accent: {
  				DEFAULT: 'var(--accent)',
  				foreground: 'var(--accent-foreground)'
  			},
  			destructive: {
  				DEFAULT: 'var(--destructive)',
  				foreground: 'var(--destructive-foreground)'
  			},
  			border: 'var(--border)',
  			input: 'var(--input)',
  			ring: 'var(--ring)',
  			chart: {
  				'1': 'var(--chart-1)',
  				'2': 'var(--chart-2)',
  				'3': 'var(--chart-3)',
  				'4': 'var(--chart-4)',
  				'5': 'var(--chart-5)'
  			},
  			brand: {
  				primary: '#5E70FF',
  				'primary-hover': '#4D5FE8',
  				'primary-light': '#F0F2FF',
  				'primary-tint': '#F5F4FF',
  				teal: '#24BBA9',
  				'teal-hover': '#1FA696',
  				'teal-light': '#EBF9F7',
  				border: '#DADADA',
  				bg: '#F3F3F3',
  				surface: '#FFFFFF',
  				'text-darkest': '#1A1A1A',
  				'text-dark': '#282828',
  				'text-medium': '#3C3C3C',
  				'text-secondary': '#404040',
  				'text-muted': '#757575',
  				success: '#48B321',
  				'success-light': '#EEF8EB',
  				danger: '#DF4D50',
  				'danger-light': '#FCEFEF',
  				like: '#DF4D50',
  				'like-light': '#FCEFEF',
  				warning: '#FF8D28',
  				'warning-light': '#FDF8F2',
  			}
  		},
  		borderRadius: {
  			lg: 'var(--radius)',
  			md: 'calc(var(--radius) - 2px)',
  			sm: 'calc(var(--radius) - 4px)'
  		}
  	}
  },
  plugins: [tailwindcssAnimate],
};
export default config;
