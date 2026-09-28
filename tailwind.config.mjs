/** @type {import('tailwindcss').Config} */
export default {
	content: ['./src/**/*.{astro,html,js,jsx,md,mdx,svelte,ts,tsx,vue}'],
	theme: {
		extend: {
			colors: {
				'beach-sky': '#D8EBF5',
				'beach-sea': '#9AD9D9',
				'beach-teal': '#2F7E80',
				'beach-sand': '#968863',
				'beach-sand-dark': '#756846',
				'beach-slate': '#455A64',
			},
			fontFamily: {
				serif: ['"Playfair Display"', 'serif'],
				sans: ['Montserrat', 'sans-serif'],
			},
		},
	},
	plugins: [],
};
