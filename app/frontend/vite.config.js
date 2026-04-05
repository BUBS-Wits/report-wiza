import { defineConfig } from 'vite';
import path from 'path';

export default defineConfig({
	build: {
		rollupOptions: {
			input: {
				main: path.resolve(__dirname, 'index.html'),
				service_request: path.resolve(__dirname, 'src/pages/service_request.html'),
			}
		}
	},
	resolve: {
		alias: {
			'@bubs-wits/shared': path.resolve(__dirname, '../../packages/shared')
		}
	},
	server: {
		port: 3000,
		strictPort: true
	}
})

