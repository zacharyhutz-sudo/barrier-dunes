/** @type {import('tailwindcss').Config} */
export default {
	content: ['./src/**/*.{astro,html,js,jsx,md,mdx,svelte,ts,tsx,vue}'],
	theme: {
		extend: {
			colors: {
				'beach-ivory': '#F8F4EC',
				'beach-sky': 'rgb(var(--beach-sky, 216 235 245) / <alpha-value>)',
				'beach-sea': 'rgb(var(--beach-sea, 154 217 217) / <alpha-value>)',
				'beach-teal': 'rgb(var(--beach-teal, 47 126 128) / <alpha-value>)',
				'beach-sand': 'rgb(var(--beach-sand, 150 136 99) / <alpha-value>)',
				'beach-sand-dark': 'rgb(var(--beach-sand-dark, 117 104 70) / <alpha-value>)',
				'beach-slate': 'rgb(var(--beach-slate, 69 90 100) / <alpha-value>)',
			},
			fontFamily: {
				serif: ['"Playfair Display"', 'serif'],
				sans: ['Montserrat', 'sans-serif'],
			},
		},
	},
	plugins: [],
};
