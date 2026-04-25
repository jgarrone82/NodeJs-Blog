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

// Admin Dashboard Alpine.js component
function adminDashboard() {
  return {
    search: '',
    status: 'all',

    matches(titulo, votos) {
      const searchMatch = this.search === '' || titulo.toLowerCase().includes(this.search.toLowerCase())
      if (this.status === 'all') return searchMatch
      if (this.status === 'with_votes') return searchMatch && votos > 0
      if (this.status === 'no_votes') return searchMatch && votos === 0
      return searchMatch
    }
  }
}

// AJAX Vote Alpine.js component
function votePost(postId) {
  return {
    votos: 0,
    loading: false,
    error: null,

    init() {
      // Read initial vote count from DOM if available
      const badge = document.getElementById('vote-count')
      if (badge) {
        this.votos = parseInt(badge.textContent, 10) || 0
      }
    },

    async vote() {
      if (this.loading) return
      this.loading = true
      this.error = null

      try {
        const response = await fetch(`/api/v1/vote/${postId}`, {
          method: 'POST',
          headers: { 'Accept': 'application/json' }
        })

        if (!response.ok) {
          const data = await response.json().catch(() => ({}))
          throw new Error(data.error?.message || 'Error al votar')
        }

        const data = await response.json()
        this.votos = data.data.votos

        // Update badge in DOM for non-reactive consumers
        const badge = document.getElementById('vote-count')
        if (badge) badge.textContent = this.votos
      } catch (err) {
        this.error = err.message || 'Error al votar'
      } finally {
        this.loading = false
      }
    }
  }
}

