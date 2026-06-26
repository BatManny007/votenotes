export function generateCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  let code = ''
  for (let i = 0; i < 8; i++) {
    code += chars[Math.floor(Math.random() * chars.length)]
  }
  return code
}

export function getVoterId(): string {
  if (typeof window === 'undefined') return ''
  let id = localStorage.getItem('votenotes_voter_id')
  if (!id) {
    id = crypto.randomUUID()
    localStorage.setItem('votenotes_voter_id', id)
  }
  return id
}

export function getHostKey(sessionCode: string): string | null {
  if (typeof window === 'undefined') return null
  return localStorage.getItem(`votenotes_host_${sessionCode}`)
}

export function setHostKey(sessionCode: string, key: string) {
  if (typeof window === 'undefined') return
  localStorage.setItem(`votenotes_host_${sessionCode}`, key)
}

export function cn(...classes: (string | undefined | false | null)[]): string {
  return classes.filter(Boolean).join(' ')
}
