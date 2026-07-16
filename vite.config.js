import { defineConfig } from 'vite'

// Avoid Vite's Windows network-drive lookup, which can be blocked by managed
// desktop environments and otherwise prevents local modules from loading.
export default defineConfig({
  resolve: {
    preserveSymlinks: true,
  },
})
