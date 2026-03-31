// Dark mode Alpine.js component
function darkMode() {
  return {
    isDark: false,
    
    init() {
      // Check localStorage first
      const stored = localStorage.getItem('theme')
      if (stored === 'dark') {
        this.isDark = true
        document.documentElement.classList.add('dark')
      } else if (stored === 'light') {
        this.isDark = false
        document.documentElement.classList.remove('dark')
      } else {
        // Respect system preference
        this.isDark = window.matchMedia('(prefers-color-scheme: dark)').matches
        if (this.isDark) document.documentElement.classList.add('dark')
      }
    },
    
    toggle() {
      this.isDark = !this.isDark
      if (this.isDark) {
        document.documentElement.classList.add('dark')
        localStorage.setItem('theme', 'dark')
      } else {
        document.documentElement.classList.remove('dark')
        localStorage.setItem('theme', 'light')
      }
    }
  }
}

// Mobile navigation toggle
document.addEventListener('DOMContentLoaded', function () {
  const menuToggle = document.getElementById('menu-toggle')
  const mainNav = document.getElementById('main-nav')

  if (menuToggle && mainNav) {
    menuToggle.addEventListener('click', function () {
      mainNav.classList.toggle('open')
      // Update icon
      const isOpen = mainNav.classList.contains('open')
      menuToggle.innerHTML = isOpen
        ? '<svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/></svg>'
        : '<svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16"/></svg>'
    })

    // Close menu when clicking outside
    document.addEventListener('click', function (e) {
      if (!menuToggle.contains(e.target) && !mainNav.contains(e.target)) {
        mainNav.classList.remove('open')
        menuToggle.innerHTML = '<svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16"/></svg>'
      }
    })
  }
})
