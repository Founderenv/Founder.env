export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.15"
  }
  public: {
    Tables: {
      appearance_settings: {
        Row: {
          accent_color: string
          animation_intensity: string
          background_color: string
          body_font: string
          border_color: string
          elevated_surface_color: string
          glow_intensity: number
          heading_font: string
          id: string
          logo_animation_enabled: boolean
          mono_font: string
          muted_text_color: string
          orbital_animation_enabled: boolean
          page_transition_enabled: boolean
          parallax_enabled: boolean
          pointer_effect_enabled: boolean
          primary_text_color: string
          secondary_accent_color: string
          secondary_background_color: string
          secondary_text_color: string
          smooth_scroll_enabled: boolean
          surface_color: string
          updated_at: string
        }
        Insert: {
          accent_color?: string
          animation_intensity?: string
          background_color?: string
          body_font?: string
          border_color?: string
          elevated_surface_color?: string
          glow_intensity?: number
          heading_font?: string
          id?: string
          logo_animation_enabled?: boolean
          mono_font?: string
          muted_text_color?: string
          orbital_animation_enabled?: boolean
          page_transition_enabled?: boolean
          parallax_enabled?: boolean
          pointer_effect_enabled?: boolean
          primary_text_color?: string
          secondary_accent_color?: string
          secondary_background_color?: string
          secondary_text_color?: string
          smooth_scroll_enabled?: boolean
          surface_color?: string
          updated_at?: string
        }
        Update: {
          accent_color?: string
          animation_intensity?: string
          background_color?: string
          body_font?: string
          border_color?: string
          elevated_surface_color?: string
          glow_intensity?: number
          heading_font?: string
          id?: string
          logo_animation_enabled?: boolean
          mono_font?: string
          muted_text_color?: string
          orbital_animation_enabled?: boolean
          page_transition_enabled?: boolean
          parallax_enabled?: boolean
          pointer_effect_enabled?: boolean
          primary_text_color?: string
          secondary_accent_color?: string
          secondary_background_color?: string
          secondary_text_color?: string
          smooth_scroll_enabled?: boolean
          surface_color?: string
          updated_at?: string
        }
        Relationships: []
      }
      brand_settings: {
        Row: {
          brand_text: string
          favicon_media_id: string | null
          header_logo_height: number
          header_logo_media_id: string | null
          header_logo_scale: number
          hero_logo_media_id: string | null
          hero_logo_scale: number
          id: string
          logo_animation_enabled: boolean
          main_logo_media_id: string | null
          show_brand_text: boolean
          updated_at: string
        }
        Insert: {
          brand_text?: string
          favicon_media_id?: string | null
          header_logo_height?: number
          header_logo_media_id?: string | null
          header_logo_scale?: number
          hero_logo_media_id?: string | null
          hero_logo_scale?: number
          id?: string
          logo_animation_enabled?: boolean
          main_logo_media_id?: string | null
          show_brand_text?: boolean
          updated_at?: string
        }
        Update: {
          brand_text?: string
          favicon_media_id?: string | null
          header_logo_height?: number
          header_logo_media_id?: string | null
          header_logo_scale?: number
          hero_logo_media_id?: string | null
          hero_logo_scale?: number
          id?: string
          logo_animation_enabled?: boolean
          main_logo_media_id?: string | null
          show_brand_text?: boolean
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "brand_settings_favicon_media_id_fkey"
            columns: ["favicon_media_id"]
            isOneToOne: false
            referencedRelation: "media"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "brand_settings_header_logo_media_id_fkey"
            columns: ["header_logo_media_id"]
            isOneToOne: false
            referencedRelation: "media"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "brand_settings_hero_logo_media_id_fkey"
            columns: ["hero_logo_media_id"]
            isOneToOne: false
            referencedRelation: "media"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "brand_settings_main_logo_media_id_fkey"
            columns: ["main_logo_media_id"]
            isOneToOne: false
            referencedRelation: "media"
            referencedColumns: ["id"]
          },
        ]
      }
      build_logs: {
        Row: {
          created_at: string
          description: string | null
          display_order: number
          id: string
          log_date: string
          log_number: number | null
          media_id: string | null
          published: boolean
          related_business_id: string | null
          related_project_id: string | null
          status: string
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          display_order?: number
          id?: string
          log_date?: string
          log_number?: number | null
          media_id?: string | null
          published?: boolean
          related_business_id?: string | null
          related_project_id?: string | null
          status?: string
          title: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          display_order?: number
          id?: string
          log_date?: string
          log_number?: number | null
          media_id?: string | null
          published?: boolean
          related_business_id?: string | null
          related_project_id?: string | null
          status?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "build_logs_media_id_fkey"
            columns: ["media_id"]
            isOneToOne: false
            referencedRelation: "media"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "build_logs_related_business_id_fkey"
            columns: ["related_business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "build_logs_related_project_id_fkey"
            columns: ["related_project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      business_categories: {
        Row: {
          business_id: string
          cover_media_id: string | null
          created_at: string
          description: string | null
          display_order: number
          id: string
          name: string
          published: boolean
          slug: string
          status: string
          updated_at: string
        }
        Insert: {
          business_id: string
          cover_media_id?: string | null
          created_at?: string
          description?: string | null
          display_order?: number
          id?: string
          name: string
          published?: boolean
          slug: string
          status?: string
          updated_at?: string
        }
        Update: {
          business_id?: string
          cover_media_id?: string | null
          created_at?: string
          description?: string | null
          display_order?: number
          id?: string
          name?: string
          published?: boolean
          slug?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "business_categories_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "business_categories_cover_media_id_fkey"
            columns: ["cover_media_id"]
            isOneToOne: false
            referencedRelation: "media"
            referencedColumns: ["id"]
          },
        ]
      }
      businesses: {
        Row: {
          cover_media_id: string | null
          created_at: string
          display_order: number
          featured: boolean
          id: string
          logo_media_id: string | null
          long_description: string | null
          name: string
          published: boolean
          short_description: string | null
          slug: string
          status: string
          tagline: string | null
          theme_media_id: string | null
          updated_at: string
          website_url: string | null
        }
        Insert: {
          cover_media_id?: string | null
          created_at?: string
          display_order?: number
          featured?: boolean
          id?: string
          logo_media_id?: string | null
          long_description?: string | null
          name: string
          published?: boolean
          short_description?: string | null
          slug: string
          status?: string
          tagline?: string | null
          theme_media_id?: string | null
          updated_at?: string
          website_url?: string | null
        }
        Update: {
          cover_media_id?: string | null
          created_at?: string
          display_order?: number
          featured?: boolean
          id?: string
          logo_media_id?: string | null
          long_description?: string | null
          name?: string
          published?: boolean
          short_description?: string | null
          slug?: string
          status?: string
          tagline?: string | null
          theme_media_id?: string | null
          updated_at?: string
          website_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "businesses_cover_media_id_fkey"
            columns: ["cover_media_id"]
            isOneToOne: false
            referencedRelation: "media"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "businesses_logo_media_id_fkey"
            columns: ["logo_media_id"]
            isOneToOne: false
            referencedRelation: "media"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "businesses_theme_media_id_fkey"
            columns: ["theme_media_id"]
            isOneToOne: false
            referencedRelation: "media"
            referencedColumns: ["id"]
          },
        ]
      }
      concept_builds: {
        Row: {
          business_id: string | null
          category_id: string | null
          concept_type: Database["public"]["Enums"]["concept_type"]
          cover_media_id: string | null
          created_at: string
          display_order: number
          featured: boolean
          id: string
          live_url: string | null
          logo_media_id: string | null
          long_description: string | null
          name: string
          published: boolean
          short_description: string | null
          slug: string
          status: string
          technology: string | null
          updated_at: string
        }
        Insert: {
          business_id?: string | null
          category_id?: string | null
          concept_type?: Database["public"]["Enums"]["concept_type"]
          cover_media_id?: string | null
          created_at?: string
          display_order?: number
          featured?: boolean
          id?: string
          live_url?: string | null
          logo_media_id?: string | null
          long_description?: string | null
          name: string
          published?: boolean
          short_description?: string | null
          slug: string
          status?: string
          technology?: string | null
          updated_at?: string
        }
        Update: {
          business_id?: string | null
          category_id?: string | null
          concept_type?: Database["public"]["Enums"]["concept_type"]
          cover_media_id?: string | null
          created_at?: string
          display_order?: number
          featured?: boolean
          id?: string
          live_url?: string | null
          logo_media_id?: string | null
          long_description?: string | null
          name?: string
          published?: boolean
          short_description?: string | null
          slug?: string
          status?: string
          technology?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "concept_builds_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "concept_builds_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "business_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "concept_builds_cover_media_id_fkey"
            columns: ["cover_media_id"]
            isOneToOne: false
            referencedRelation: "media"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "concept_builds_logo_media_id_fkey"
            columns: ["logo_media_id"]
            isOneToOne: false
            referencedRelation: "media"
            referencedColumns: ["id"]
          },
        ]
      }
      design_screenshots: {
        Row: {
          caption: string | null
          created_at: string
          design_id: string
          device_type: Database["public"]["Enums"]["device_type"]
          display_order: number
          id: string
          media_id: string | null
          updated_at: string
        }
        Insert: {
          caption?: string | null
          created_at?: string
          design_id: string
          device_type?: Database["public"]["Enums"]["device_type"]
          display_order?: number
          id?: string
          media_id?: string | null
          updated_at?: string
        }
        Update: {
          caption?: string | null
          created_at?: string
          design_id?: string
          device_type?: Database["public"]["Enums"]["device_type"]
          display_order?: number
          id?: string
          media_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "design_screenshots_design_id_fkey"
            columns: ["design_id"]
            isOneToOne: false
            referencedRelation: "website_designs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "design_screenshots_media_id_fkey"
            columns: ["media_id"]
            isOneToOne: false
            referencedRelation: "media"
            referencedColumns: ["id"]
          },
        ]
      }
      media: {
        Row: {
          alt_text: string | null
          created_at: string
          file_size: number | null
          height: number | null
          id: string
          media_type: string
          mime_type: string | null
          original_filename: string | null
          public_url: string
          storage_bucket: string
          storage_path: string
          updated_at: string
          width: number | null
        }
        Insert: {
          alt_text?: string | null
          created_at?: string
          file_size?: number | null
          height?: number | null
          id?: string
          media_type?: string
          mime_type?: string | null
          original_filename?: string | null
          public_url: string
          storage_bucket?: string
          storage_path: string
          updated_at?: string
          width?: number | null
        }
        Update: {
          alt_text?: string | null
          created_at?: string
          file_size?: number | null
          height?: number | null
          id?: string
          media_type?: string
          mime_type?: string | null
          original_filename?: string | null
          public_url?: string
          storage_bucket?: string
          storage_path?: string
          updated_at?: string
          width?: number | null
        }
        Relationships: []
      }
      navigation_settings: {
        Row: {
          display_order: number
          external: boolean
          href: string
          id: string
          label: string
          updated_at: string
          visible: boolean
        }
        Insert: {
          display_order?: number
          external?: boolean
          href: string
          id?: string
          label: string
          updated_at?: string
          visible?: boolean
        }
        Update: {
          display_order?: number
          external?: boolean
          href?: string
          id?: string
          label?: string
          updated_at?: string
          visible?: boolean
        }
        Relationships: []
      }
      profiles: {
        Row: {
          about_content: string | null
          bio: string | null
          brand_name: string
          created_at: string
          current_build: string | null
          display_name: string | null
          focus: string | null
          founder_status: string | null
          hero_description: string | null
          hero_heading_line_1: string | null
          hero_heading_line_2: string | null
          hero_highlight_text: string | null
          id: string
          profile_picture_media_id: string | null
          secondary_hero_text: string | null
          updated_at: string
        }
        Insert: {
          about_content?: string | null
          bio?: string | null
          brand_name?: string
          created_at?: string
          current_build?: string | null
          display_name?: string | null
          focus?: string | null
          founder_status?: string | null
          hero_description?: string | null
          hero_heading_line_1?: string | null
          hero_heading_line_2?: string | null
          hero_highlight_text?: string | null
          id?: string
          profile_picture_media_id?: string | null
          secondary_hero_text?: string | null
          updated_at?: string
        }
        Update: {
          about_content?: string | null
          bio?: string | null
          brand_name?: string
          created_at?: string
          current_build?: string | null
          display_name?: string | null
          focus?: string | null
          founder_status?: string | null
          hero_description?: string | null
          hero_heading_line_1?: string | null
          hero_heading_line_2?: string | null
          hero_highlight_text?: string | null
          id?: string
          profile_picture_media_id?: string | null
          secondary_hero_text?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_profile_picture_media_id_fkey"
            columns: ["profile_picture_media_id"]
            isOneToOne: false
            referencedRelation: "media"
            referencedColumns: ["id"]
          },
        ]
      }
      projects: {
        Row: {
          cover_media_id: string | null
          created_at: string
          display_order: number
          featured: boolean
          github_url: string | null
          id: string
          live_demo_url: string | null
          long_description: string | null
          name: string
          project_type: string | null
          published: boolean
          short_description: string | null
          slug: string
          status: Database["public"]["Enums"]["project_status"]
          tech_stack: string[]
          updated_at: string
        }
        Insert: {
          cover_media_id?: string | null
          created_at?: string
          display_order?: number
          featured?: boolean
          github_url?: string | null
          id?: string
          live_demo_url?: string | null
          long_description?: string | null
          name: string
          project_type?: string | null
          published?: boolean
          short_description?: string | null
          slug: string
          status?: Database["public"]["Enums"]["project_status"]
          tech_stack?: string[]
          updated_at?: string
        }
        Update: {
          cover_media_id?: string | null
          created_at?: string
          display_order?: number
          featured?: boolean
          github_url?: string | null
          id?: string
          live_demo_url?: string | null
          long_description?: string | null
          name?: string
          project_type?: string | null
          published?: boolean
          short_description?: string | null
          slug?: string
          status?: Database["public"]["Enums"]["project_status"]
          tech_stack?: string[]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "projects_cover_media_id_fkey"
            columns: ["cover_media_id"]
            isOneToOne: false
            referencedRelation: "media"
            referencedColumns: ["id"]
          },
        ]
      }
      seo_settings: {
        Row: {
          canonical_url: string | null
          id: string
          og_image_media_id: string | null
          site_description: string
          site_title: string
          twitter_handle: string | null
          updated_at: string
        }
        Insert: {
          canonical_url?: string | null
          id?: string
          og_image_media_id?: string | null
          site_description?: string
          site_title?: string
          twitter_handle?: string | null
          updated_at?: string
        }
        Update: {
          canonical_url?: string | null
          id?: string
          og_image_media_id?: string | null
          site_description?: string
          site_title?: string
          twitter_handle?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "seo_settings_og_image_media_id_fkey"
            columns: ["og_image_media_id"]
            isOneToOne: false
            referencedRelation: "media"
            referencedColumns: ["id"]
          },
        ]
      }
      social_links: {
        Row: {
          cta_label: string | null
          display_name: string | null
          display_order: number
          email: string | null
          icon: string | null
          id: string
          platform: Database["public"]["Enums"]["social_platform"]
          updated_at: string
          url: string | null
          username: string | null
          visible: boolean
        }
        Insert: {
          cta_label?: string | null
          display_name?: string | null
          display_order?: number
          email?: string | null
          icon?: string | null
          id?: string
          platform: Database["public"]["Enums"]["social_platform"]
          updated_at?: string
          url?: string | null
          username?: string | null
          visible?: boolean
        }
        Update: {
          cta_label?: string | null
          display_name?: string | null
          display_order?: number
          email?: string | null
          icon?: string | null
          id?: string
          platform?: Database["public"]["Enums"]["social_platform"]
          updated_at?: string
          url?: string | null
          username?: string | null
          visible?: boolean
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      website_designs: {
        Row: {
          availability: string
          business_id: string | null
          category_id: string | null
          contact_url: string | null
          cover_media_id: string | null
          created_at: string
          design_code: string | null
          design_name: string
          display_order: number
          featured: boolean
          features: string[]
          id: string
          live_preview_url: string | null
          long_description: string | null
          pages_count: number | null
          price: number | null
          published_at: string | null
          seo_description: string | null
          seo_title: string | null
          short_description: string | null
          slug: string
          status: Database["public"]["Enums"]["design_status"]
          style: string | null
          tags: string[]
          tech_stack: string[]
          technology: string | null
          thumbnail_media_id: string | null
          updated_at: string
          vercel_deployment_url: string | null
        }
        Insert: {
          availability?: string
          business_id?: string | null
          category_id?: string | null
          contact_url?: string | null
          cover_media_id?: string | null
          created_at?: string
          design_code?: string | null
          design_name: string
          display_order?: number
          featured?: boolean
          features?: string[]
          id?: string
          live_preview_url?: string | null
          long_description?: string | null
          pages_count?: number | null
          price?: number | null
          published_at?: string | null
          seo_description?: string | null
          seo_title?: string | null
          short_description?: string | null
          slug: string
          status?: Database["public"]["Enums"]["design_status"]
          style?: string | null
          tags?: string[]
          tech_stack?: string[]
          technology?: string | null
          thumbnail_media_id?: string | null
          updated_at?: string
          vercel_deployment_url?: string | null
        }
        Update: {
          availability?: string
          business_id?: string | null
          category_id?: string | null
          contact_url?: string | null
          cover_media_id?: string | null
          created_at?: string
          design_code?: string | null
          design_name?: string
          display_order?: number
          featured?: boolean
          features?: string[]
          id?: string
          live_preview_url?: string | null
          long_description?: string | null
          pages_count?: number | null
          price?: number | null
          published_at?: string | null
          seo_description?: string | null
          seo_title?: string | null
          short_description?: string | null
          slug?: string
          status?: Database["public"]["Enums"]["design_status"]
          style?: string | null
          tags?: string[]
          tech_stack?: string[]
          technology?: string | null
          thumbnail_media_id?: string | null
          updated_at?: string
          vercel_deployment_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "website_designs_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "website_designs_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "business_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "website_designs_cover_media_id_fkey"
            columns: ["cover_media_id"]
            isOneToOne: false
            referencedRelation: "media"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "website_designs_thumbnail_media_id_fkey"
            columns: ["thumbnail_media_id"]
            isOneToOne: false
            referencedRelation: "media"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_admin: { Args: never; Returns: boolean }
    }
    Enums: {
      app_role: "admin" | "editor" | "user"
      concept_type: "CONCEPT_PROJECT" | "REAL_CLIENT"
      design_status: "DRAFT" | "AVAILABLE" | "SOLD" | "COMING_SOON" | "HIDDEN"
      device_type: "DESKTOP" | "MOBILE" | "TABLET"
      project_status: "BUILDING" | "COMPLETED" | "EXPERIMENTAL" | "PAUSED"
      social_platform: "INSTAGRAM" | "GITHUB" | "EMAIL"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["admin", "editor", "user"],
      concept_type: ["CONCEPT_PROJECT", "REAL_CLIENT"],
      design_status: ["DRAFT", "AVAILABLE", "SOLD", "COMING_SOON", "HIDDEN"],
      device_type: ["DESKTOP", "MOBILE", "TABLET"],
      project_status: ["BUILDING", "COMPLETED", "EXPERIMENTAL", "PAUSED"],
      social_platform: ["INSTAGRAM", "GITHUB", "EMAIL"],
    },
  },
} as const
