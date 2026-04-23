export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          username: string
          full_name: string
          avatar_url: string | null
          bio: string | null
          location_label: string | null
          location_region: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          username: string
          full_name: string
          avatar_url?: string | null
          bio?: string | null
          location_label?: string | null
          location_region?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          username?: string
          full_name?: string
          avatar_url?: string | null
          bio?: string | null
          location_label?: string | null
          location_region?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      sports: {
        Row: {
          id: string
          slug: string
          name: string
          created_at: string
        }
        Insert: {
          id?: string
          slug: string
          name: string
          created_at?: string
        }
        Update: {
          id?: string
          slug?: string
          name?: string
          created_at?: string
        }
        Relationships: []
      }
      user_sports: {
        Row: {
          user_id: string
          sport_id: string
          created_at: string
        }
        Insert: {
          user_id: string
          sport_id: string
          created_at?: string
        }
        Update: {
          user_id?: string
          sport_id?: string
          created_at?: string
        }
        Relationships: []
      }
      products: {
        Row: {
          id: string
          seller_id: string
          sport_id: string
          title: string
          slug: string
          description: string
          category: string
          condition: string
          price_cents: number
          currency: string
          location_label: string
          status: 'draft' | 'active' | 'sold' | 'archived'
          is_featured: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          seller_id: string
          sport_id: string
          title: string
          slug: string
          description: string
          category: string
          condition: string
          price_cents: number
          currency?: string
          location_label: string
          status?: 'draft' | 'active' | 'sold' | 'archived'
          is_featured?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          seller_id?: string
          sport_id?: string
          title?: string
          slug?: string
          description?: string
          category?: string
          condition?: string
          price_cents?: number
          currency?: string
          location_label?: string
          status?: 'draft' | 'active' | 'sold' | 'archived'
          is_featured?: boolean
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      product_images: {
        Row: {
          id: string
          product_id: string
          storage_path: string
          public_url: string
          sort_order: number
          created_at: string
        }
        Insert: {
          id?: string
          product_id: string
          storage_path: string
          public_url: string
          sort_order?: number
          created_at?: string
        }
        Update: {
          id?: string
          product_id?: string
          storage_path?: string
          public_url?: string
          sort_order?: number
          created_at?: string
        }
        Relationships: []
      }
      spots: {
        Row: {
          id: string
          owner_id: string
          sport_id: string
          title: string
          slug: string
          description: string
          visibility: 'public' | 'sensitive' | 'private'
          difficulty: string
          best_time: string | null
          safety_notes: string | null
          location_label: string
          latitude: number
          longitude: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          owner_id: string
          sport_id: string
          title: string
          slug: string
          description: string
          visibility?: 'public' | 'sensitive' | 'private'
          difficulty: string
          best_time?: string | null
          safety_notes?: string | null
          location_label: string
          latitude: number
          longitude: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          owner_id?: string
          sport_id?: string
          title?: string
          slug?: string
          description?: string
          visibility?: 'public' | 'sensitive' | 'private'
          difficulty?: string
          best_time?: string | null
          safety_notes?: string | null
          location_label?: string
          latitude?: number
          longitude?: number
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      spot_images: {
        Row: {
          id: string
          spot_id: string
          storage_path: string
          public_url: string
          sort_order: number
          created_at: string
        }
        Insert: {
          id?: string
          spot_id: string
          storage_path: string
          public_url: string
          sort_order?: number
          created_at?: string
        }
        Update: {
          id?: string
          spot_id?: string
          storage_path?: string
          public_url?: string
          sort_order?: number
          created_at?: string
        }
        Relationships: []
      }
      favorites: {
        Row: {
          id: string
          user_id: string
          target_type: 'product' | 'spot'
          product_id: string | null
          spot_id: string | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          target_type: 'product' | 'spot'
          product_id?: string | null
          spot_id?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          target_type?: 'product' | 'spot'
          product_id?: string | null
          spot_id?: string | null
          created_at?: string
        }
        Relationships: []
      }
      messages: {
        Row: {
          id: string
          product_id: string
          buyer_id: string
          seller_id: string
          sender_id: string
          recipient_id: string
          body: string
          read_at: string | null
          created_at: string
        }
        Insert: {
          id?: string
          product_id: string
          buyer_id: string
          seller_id: string
          sender_id: string
          recipient_id: string
          body: string
          read_at?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          product_id?: string
          buyer_id?: string
          seller_id?: string
          sender_id?: string
          recipient_id?: string
          body?: string
          read_at?: string | null
          created_at?: string
        }
        Relationships: []
      }
      reports: {
        Row: {
          id: string
          reporter_id: string
          target_type: 'product' | 'spot'
          product_id: string | null
          spot_id: string | null
          reason: string
          details: string | null
          status: 'open' | 'reviewing' | 'closed'
          created_at: string
        }
        Insert: {
          id?: string
          reporter_id: string
          target_type: 'product' | 'spot'
          product_id?: string | null
          spot_id?: string | null
          reason: string
          details?: string | null
          status?: 'open' | 'reviewing' | 'closed'
          created_at?: string
        }
        Update: {
          id?: string
          reporter_id?: string
          target_type?: 'product' | 'spot'
          product_id?: string | null
          spot_id?: string | null
          reason?: string
          details?: string | null
          status?: 'open' | 'reviewing' | 'closed'
          created_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      spot_map_points: {
        Row: {
          id: string
          slug: string
          title: string
          description: string
          visibility: 'public' | 'sensitive' | 'private'
          difficulty: string
          best_time: string | null
          location_label: string
          latitude: number
          longitude: number
          sport_slug: string
          sport_name: string
          owner_username: string
          owner_name: string
          cover_image_url: string | null
        }
        Relationships: []
      }
      spot_public_details: {
        Row: {
          id: string
          slug: string
          title: string
          description: string
          visibility: 'public' | 'sensitive' | 'private'
          difficulty: string
          best_time: string | null
          safety_notes: string | null
          location_label: string
          latitude: number
          longitude: number
          sport_slug: string
          sport_name: string
          owner_username: string
          owner_name: string
        }
        Relationships: []
      }
    }
    Functions: Record<string, never>
    Enums: {
      product_status: 'draft' | 'active' | 'sold' | 'archived'
      spot_visibility: 'public' | 'sensitive' | 'private'
      favorite_target_type: 'product' | 'spot'
      report_target_type: 'product' | 'spot'
      report_status: 'open' | 'reviewing' | 'closed'
    }
    CompositeTypes: Record<string, never>
  }
}
