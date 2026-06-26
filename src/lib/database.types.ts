export type Json = string | number | boolean | null | { [key: string]: Json } | Json[]

export interface Database {
  public: {
    Tables: {
      sessions: {
        Row: {
          id: string
          code: string
          name: string
          description: string | null
          end_time: string | null
          closed: boolean
          created_at: string
        }
        Insert: {
          id?: string
          code: string
          name: string
          description?: string | null
          end_time?: string | null
          closed?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          code?: string
          name?: string
          description?: string | null
          end_time?: string | null
          closed?: boolean
          created_at?: string
        }
      }
      notes: {
        Row: {
          id: string
          session_id: string
          content: string
          created_at: string
        }
        Insert: {
          id?: string
          session_id: string
          content: string
          created_at?: string
        }
        Update: {
          id?: string
          session_id?: string
          content?: string
          created_at?: string
        }
      }
      votes: {
        Row: {
          id: string
          note_id: string
          voter_id: string
          created_at: string
        }
        Insert: {
          id?: string
          note_id: string
          voter_id: string
          created_at?: string
        }
        Update: {
          id?: string
          note_id?: string
          voter_id?: string
          created_at?: string
        }
      }
    }
    Views: Record<string, never>
    Functions: Record<string, never>
    Enums: Record<string, never>
  }
}

export type Session = Database['public']['Tables']['sessions']['Row']
export type Note = Database['public']['Tables']['notes']['Row']
export type Vote = Database['public']['Tables']['votes']['Row']

export type NoteWithVotes = Note & {
  vote_count: number
  user_voted: boolean
}
